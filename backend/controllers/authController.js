const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const jwt = require('jsonwebtoken');
const https = require('https');
const { normalizePhone } = require('../utils/phone');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const {
  generateVerificationCode,
  hashCode,
  codeMatches,
  logVerificationCode,
  MAX_OTP_ATTEMPTS,
  OTP_TTL_MS,
} = require('../utils/verification');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../utils/mailer');
const { uploadToCloudinary } = require('../utils/cloudinary');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const verifyFirebaseToken = (idToken, apiKey) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ idToken });
    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      port: 443,
      path: `/v1/accounts:lookup?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode === 200) {
            resolve(parsed);
          } else {
            const msg = parsed.error?.message || 'Token verification failed';
            reject(new Error(msg));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

exports.register = async (req, res) => {
  const { 
    name, email, password, role, phone, address,
    pharmacyName, pharmacyLocation, pharmacyOutsidePicture, pharmacistName,
    degreeName, degreePlace, licenseNumber, ownerName,
    specialty, pmcRegistration, degree, experience, clinicAddress, availableDays, consultationFee
  } = req.body;

  // Accounts are verified by email; the phone number is kept as a contact number.
  if (!name || !password || !phone || !email) {
    return res.status(400).json({ message: 'Name, email, phone number and password are required.' });
  }
  const verificationChannel = 'email';

  if (role === 'pharmacy') {
    if (!pharmacyName || !pharmacyLocation || !pharmacyOutsidePicture) {
      return res.status(400).json({ message: 'Missing pharmacy registration details: name, location, or outside picture.' });
    }
  }

  if (role === 'doctor') {
    if (!specialty || !pmcRegistration || !degree || experience === undefined || !clinicAddress || !availableDays || availableDays.length === 0 || consultationFee === undefined) {
      return res.status(400).json({ message: 'Missing professional doctor registration details.' });
    }
  }

  // Normalize phone number
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: 'Please enter a valid phone number' });
  }

  // Check if phone already registered in verified User collection
  const phoneExists = await User.findOne({ phone: normalizedPhone });
  if (phoneExists) {
    return res.status(400).json({ message: 'User with this phone number already exists' });
  }

  // Check if email already registered in verified User collection
  const emailExists = await User.findOne({ email: email.toLowerCase() });
  if (emailExists) {
    return res.status(400).json({ message: 'User with this email already exists' });
  }

  // Delete any existing pending registrations for this phone number to avoid duplication/bloat
  await PendingUser.deleteMany({ phone: normalizedPhone });

  // Generate verification code & expiration (15 minutes from now)
  const verificationCode = generateVerificationCode();
  const verificationCodeExpires = new Date(Date.now() + OTP_TTL_MS);
  // Never store the raw password or OTP, even temporarily.
  const passwordHash = await bcrypt.hash(password, 12);

  // Save registration details to PendingUser
  await PendingUser.create({
    name,
    email: email.toLowerCase(),
    phone: normalizedPhone,
    password: passwordHash,
    role: ['patient', 'doctor', 'pharmacy'].includes(role) ? role : 'patient',
    address,
    verificationCode: hashCode(verificationCode),
    verificationAttempts: 0,
    verificationCodeExpires,
    verificationChannel,
    pharmacyName,
    pharmacyLocation,
    pharmacyOutsidePicture,
    ownerName,
    pharmacistName,
    degreeName,
    degreePlace,
    licenseNumber,
    specialty,
    pmcRegistration,
    degree,
    experience,
    clinicAddress,
    availableDays,
    consultationFee,
    termsAcceptedAt: new Date() // the validator only lets acceptTerms: true through
  });

  // Log the verification code for temporary local testing in terminal
  logVerificationCode({ method: 'email', identifier: email, code: verificationCode });

  // Send the verification email in the background to avoid blocking the HTTP response
  sendVerificationEmail(email.toLowerCase(), verificationCode)
    .catch((err) => console.error('Failed to send verification email via SMTP in background:', err.message));

  res.status(200).json({
    message: 'Verification code sent successfully',
    phone: normalizedPhone,
    email: email.toLowerCase(),
    channel: verificationChannel
  });
};

exports.verifyRegistration = async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ message: 'Phone number and verification code are required' });
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: 'Invalid phone number' });
  }

  // Retrieve the latest pending registration record
  const pending = await PendingUser.findOne({ phone: normalizedPhone }).sort({ createdAt: -1 });
  if (!pending) {
    return res.status(400).json({ message: 'Verification session expired or not found. Please register again.' });
  }

  let isCodeValid;

  // Detect if this is a Firebase ID Token (usually long dot-separated JWT strings) or standard 6-digit code
  if (code.length > 6) {
    const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
    if (!firebaseApiKey) {
      return res.status(400).json({ message: 'Firebase verification is not configured on the server.' });
    }

    try {
      const googleResult = await verifyFirebaseToken(code, firebaseApiKey);
      const firebaseUser = googleResult.users?.[0];
      if (!firebaseUser) {
        return res.status(400).json({ message: 'Firebase ID Token is invalid or expired.' });
      }
      
      if (pending.verificationChannel === 'phone') {
        const verifiedPhone = firebaseUser.phoneNumber;
        if (!verifiedPhone) {
          return res.status(400).json({ message: 'Firebase ID Token does not contain a verified phone number.' });
        }
        // Normalize both to compare them properly
        const normVerified = normalizePhone(verifiedPhone);
        if (normVerified !== normalizedPhone) {
          return res.status(400).json({ message: 'Verified phone number does not match your registered phone number.' });
        }
        isCodeValid = true;
      } else if (pending.verificationChannel === 'email') {
        const verifiedEmail = firebaseUser.email;
        if (!verifiedEmail) {
          return res.status(400).json({ message: 'Firebase ID Token does not contain a verified email address.' });
        }
        if (verifiedEmail.toLowerCase() !== pending.email.toLowerCase()) {
          return res.status(400).json({ message: 'Verified email address does not match your registered email.' });
        }
        if (!firebaseUser.emailVerified) {
          return res.status(400).json({ message: 'Your email address is registered in Firebase but not yet verified. Please click the verification link in your inbox.' });
        }
        isCodeValid = true;
      } else {
        return res.status(400).json({ message: 'Unsupported verification channel.' });
      }
    } catch (err) {
      return res.status(400).json({ message: `Firebase token verification failed: ${err.message}` });
    }
  } else {
    // Standard 6-digit code check (hashed, constant-time, attempt-limited)
    if ((pending.verificationAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      await PendingUser.deleteOne({ _id: pending._id });
      return res.status(429).json({ message: 'Too many incorrect attempts. Please register again to get a new code.' });
    }
    isCodeValid = codeMatches(code, pending.verificationCode);
    if (!isCodeValid) {
      pending.verificationAttempts = (pending.verificationAttempts || 0) + 1;
      await pending.save();
    }
  }

  if (!isCodeValid) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }

  // Verify code expiration
  if (Date.now() > pending.verificationCodeExpires) {
    await PendingUser.deleteOne({ _id: pending._id });
    return res.status(400).json({ message: 'Verification code has expired. Please register again.' });
  }

  // Safeguard check - ensure no user was created with this phone/email in the meantime
  const phoneExists = await User.findOne({ phone: normalizedPhone });
  if (phoneExists) {
    return res.status(400).json({ message: 'User with this phone number was already verified and registered.' });
  }
  if (pending.email) {
    const emailExists = await User.findOne({ email: pending.email });
    if (emailExists) {
      return res.status(400).json({ message: 'User with this email was already verified and registered.' });
    }
  }

  // Create the permanent User document
  const userFields = {
    name: pending.name,
    password: pending.password, // already a bcrypt hash (User pre-save skips re-hashing)
    role: ['patient', 'doctor', 'pharmacy'].includes(pending.role) ? pending.role : 'patient',
    phone: pending.phone,
    address: pending.address,
    pharmacyName: pending.pharmacyName,
    pharmacyLocation: pending.pharmacyLocation,
    pharmacyOutsidePicture: pending.pharmacyOutsidePicture,
    ownerName: pending.ownerName,
    isVerifiedProfile: pending.role === 'pharmacy' ? true : false,
    pharmacistDetails: {
      status: 'none'
    },
    specialty: pending.specialty,
    pmcRegistration: pending.pmcRegistration,
    degree: pending.degree,
    experience: pending.experience,
    clinicAddress: pending.clinicAddress,
    availableDays: pending.availableDays,
    consultationFee: pending.consultationFee,
    termsAcceptedAt: pending.termsAcceptedAt
  };
  if (pending.email) {
    userFields.email = pending.email;
  }

  const user = await User.create(userFields);

  // Clean up all pending registers for this phone number
  await PendingUser.deleteMany({ phone: normalizedPhone });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    pharmacyName: user.pharmacyName,
    ownerName: user.ownerName,
    pharmacistDetails: user.pharmacistDetails,
    isVerifiedProfile: user.isVerifiedProfile,
    token: generateToken(user._id, user.role)
  });
};

exports.resendVerificationCode = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: 'Invalid phone number' });
  }

  const pending = await PendingUser.findOne({ phone: normalizedPhone }).sort({ createdAt: -1 });
  if (!pending) {
    return res.status(400).json({ message: 'No pending registration session found. Please register again.' });
  }

  // Generate a new code and extend expiration by 15 minutes
  const newCode = generateVerificationCode();
  pending.verificationCode = hashCode(newCode);
  pending.verificationAttempts = 0;
  pending.verificationCodeExpires = new Date(Date.now() + OTP_TTL_MS);
  await pending.save();

  // Log the code again for testing
  if (!pending.email) {
    return res.status(400).json({ message: 'This sign-up has no email address. Please register again with an email.' });
  }
  logVerificationCode({ method: 'email', identifier: pending.email, code: newCode });

  // Send the verification email in the background to avoid blocking the HTTP response
  sendVerificationEmail(pending.email.toLowerCase(), newCode)
    .catch((err) => console.error('Failed to send verification email via SMTP in background:', err.message));

  res.status(200).json({
    message: 'Verification code resent successfully',
    phone: pending.phone,
    email: pending.email,
    channel: 'email'
  });
};

exports.login = async (req, res) => {
  const { email, identifier, password } = req.body;
  const inputIdentifier = identifier || email;

  if (!inputIdentifier || !password) {
    return res.status(400).json({ message: 'Email/Phone and password are required' });
  }

  let query;
  if (inputIdentifier.includes('@')) {
    query = { email: inputIdentifier.toLowerCase() };
  } else {
    const normalizedPhone = normalizePhone(inputIdentifier);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Please enter a valid phone number or email address' });
    }
    query = { phone: normalizedPhone };
  }

  let user = await User.findOne(query);
  let isSubAccount = false;

  if (!user && inputIdentifier.includes('@')) {
    // Look up pharmacist sub-account
    user = await User.findOne({
      role: 'pharmacy',
      'pharmacistDetails.email': inputIdentifier.toLowerCase()
    });
    if (user) {
      isSubAccount = true;
    }
  }

  if (!user) {
    return res.status(404).json({ message: 'This email or phone number is not registered. Please create an account.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ message: 'Your account has been suspended by the administrator.' });
  }

  if (user) {
    if (isSubAccount) {
      const isMatch = await bcrypt.compare(password, user.pharmacistDetails.password || '');
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect password. If you forgot your password, please reset it.' });
      }

      // Hired pharmacist representatives can only log in after being verified/approved by Admin
      if (user.pharmacistDetails.status !== 'approved') {
        return res.status(401).json({ 
          message: 'Your pharmacist representative account is currently pending administrator verification. You will be able to log in once approved.' 
        });
      }

      return res.json({
        _id: user._id,
        name: user.pharmacistDetails.name,
        email: user.pharmacistDetails.email,
        role: 'pharmacist',
        pharmacyName: user.pharmacyName,
        ownerName: user.ownerName,
        pharmacistDetails: user.pharmacistDetails,
        isVerifiedProfile: true,
        token: generateToken(user._id, 'pharmacist')
      });
    }

    // Normal user flow
    if (await user.comparePassword(password)) {
      // Block unapproved professional accounts (doctor) from logging in
      if (user.role === 'doctor' && !user.isVerifiedProfile) {
        return res.status(401).json({ message: 'Your professional profile is currently pending administrator credentials audit. You will be able to log in once approved.' });
      }

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        pharmacyName: user.pharmacyName,
        ownerName: user.ownerName,
        pharmacistDetails: user.pharmacistDetails,
        isVerifiedProfile: user.isVerifiedProfile,
        token: generateToken(user._id, user.role)
      });
    } else {
      return res.status(401).json({ message: 'Incorrect password. If you forgot your password, please reset it.' });
    }
  }

  return res.status(401).json({ message: 'Invalid credentials. Please verify your email/phone and password.' });
};

exports.getProfile = async (req, res) => {
  // If the middleware overrode the role (pharmacist sub-account), use req.user directly
  if (req.user && req.user.role === 'pharmacist' && req.user._id) {
    const userObj = typeof req.user.toObject === 'function' ? req.user.toObject() : { ...req.user };
    if (userObj.pharmacistDetails) delete userObj.pharmacistDetails.password;
    return res.json(userObj);
  }

  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    const userObj = user.toObject();
    if (userObj.pharmacistDetails) delete userObj.pharmacistDetails.password;
    res.json(userObj);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

exports.updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { 
    name, email, phone, address,
    // Pharmacist details
    pharmacyName,
    // Doctor details
    specialty, pmcRegistration, degree, experience, clinicAddress, availableDays, consultationFee
  } = req.body;

  // Update generic fields
  if (name !== undefined) user.name = name;
  if (address !== undefined) user.address = address;

  // Validate and update email
  if (email !== undefined && email.trim() !== '') {
    const emailLower = email.toLowerCase().trim();
    if (emailLower !== user.email) {
      const emailExists = await User.findOne({ email: emailLower, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email address is already in use by another account' });
      }
      user.email = emailLower;
    }
  } else if (email === '') {
    user.email = undefined;
  }

  // Validate and update phone
  if (phone !== undefined && phone.trim() !== '') {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Please enter a valid phone number' });
    }
    if (normalizedPhone !== user.phone) {
      const phoneExists = await User.findOne({ phone: normalizedPhone, _id: { $ne: user._id } });
      if (phoneExists) {
        return res.status(400).json({ message: 'Phone number is already in use by another account' });
      }
      user.phone = normalizedPhone;
    }
  }

  // Update role-specific fields
  if (user.role === 'pharmacist') {
    // ── Hired pharmacist representatives must NOT be able to change their own
    // professional credentials. Those are managed exclusively by the sponsoring
    // pharmacy owner. Block any attempt to modify them silently (or with an error).
    // Only name, address, and other generic personal fields are allowed.
    // We explicitly do NOT update: pharmacyName, degreeName, degreePlace, licenseNumber.
  } else if (user.role === 'pharmacy') {
    // Pharmacy owner profile fields (general identity, not sub-account management)
    if (pharmacyName !== undefined) user.pharmacyName = pharmacyName;
  } else if (user.role === 'doctor') {
    if (specialty !== undefined) user.specialty = specialty;
    // Changing the PMC registration number requires a fresh admin credential audit.
    if (pmcRegistration !== undefined && pmcRegistration !== user.pmcRegistration) {
      user.pmcRegistration = pmcRegistration;
      user.isVerifiedProfile = false;
    }
    if (degree !== undefined) user.degree = degree;
    
    if (experience !== undefined) {
      const expNum = Number(experience);
      user.experience = isNaN(expNum) ? 0 : expNum;
    }

    if (clinicAddress !== undefined) user.clinicAddress = clinicAddress;
    
    if (availableDays !== undefined) {
      user.availableDays = Array.isArray(availableDays) ? availableDays : [];
    }

    if (consultationFee !== undefined) {
      const feeNum = Number(consultationFee);
      user.consultationFee = isNaN(feeNum) ? 0 : feeNum;
    }

    // NOTE: verification is granted only by an administrator (adminController.approveProfessional).
  }

  await user.save();

  // Return updated user profile omitting the password
  const updatedUser = await User.findById(user._id).select('-password');
  res.json(updatedUser);
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded or invalid file format.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch { /* already removed */ }
      return res.status(404).json({ message: 'User not found' });
    }

    // Upload to Cloudinary
    const secureUrl = await uploadToCloudinary(req.file.path, {
      folder: `${process.env.CLOUDINARY_FOLDER || 'Medeasy Uploads'}/profile_photos`
    });

    user.profileImage = secureUrl;
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    if (req.file && req.file.path) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch { /* already removed */ }
    }
    throw error;
  }
};

exports.updatePharmacistDetails = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.role !== 'pharmacy') {
    return res.status(403).json({ message: 'Only pharmacy accounts can manage pharmacist representative details.' });
  }

  const { name, photo, licenseNumber, age, degreeName, degreePlace, email, password } = req.body;

  // Validate required sub-account credentials
  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'A valid pharmacist representative email address is required.' });
  }

  // Password is required only for new entries; optional when updating existing (to keep old password)
  const isNew = !user.pharmacistDetails || user.pharmacistDetails.status === 'none';
  if (isNew && (!password || password.length < 6)) {
    return res.status(400).json({ message: 'A representative access password of at least 6 characters is required.' });
  }
  if (password && password.length > 0 && password.length < 6) {
    return res.status(400).json({ message: 'The new password must be at least 6 characters long.' });
  }

  // Check if email is already used by another user or sub-account (but not ourselves)
  const emailConflict = await User.findOne({
    _id: { $ne: user._id },
    $or: [
      { email: email.toLowerCase() },
      { 'pharmacistDetails.email': email.toLowerCase() }
    ]
  });
  if (emailConflict) {
    return res.status(400).json({ message: 'This email address is already registered to another account. Please use a different one.' });
  }

  // Only hash and update password if a new one was provided
  const existingPassword = user.pharmacistDetails?.password;
  const hashedPassword = (password && password.length >= 6)
    ? await bcrypt.hash(password, 12)
    : existingPassword;

  user.pharmacistDetails = {
    name,
    photo,
    licenseNumber,
    age: age ? Number(age) : undefined,
    degreeName,
    degreePlace,
    email: email.toLowerCase(),
    password: hashedPassword,
    status: 'pending',
    declineReason: undefined
  };

  await user.save();
  
  // Return updated user profile, hiding the nested pharmacistDetails password
  const updatedUser = await User.findById(user._id).select('-password');
  const userObj = updatedUser.toObject();
  if (userObj.pharmacistDetails) delete userObj.pharmacistDetails.password;
  res.json(userObj);
};

exports.removePharmacistDetails = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.role !== 'pharmacy') {
    return res.status(403).json({ message: 'Only pharmacy accounts can manage pharmacist representative details.' });
  }

  user.pharmacistDetails = {
    status: 'none'
  };

  await user.save();

  const updatedUser = await User.findById(user._id).select('-password');
  res.json(updatedUser);
};

exports.uploadPharmacistPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo file uploaded or invalid format.' });
    }

    // Upload to Cloudinary
    const secureUrl = await uploadToCloudinary(req.file.path, {
      folder: `${process.env.CLOUDINARY_FOLDER || 'Medeasy Uploads'}/pharmacist_photos`
    });

    res.status(200).json({ filePath: secureUrl });
  } catch (error) {
    if (req.file && req.file.path) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch { /* already removed */ }
    }
    throw error;
  }
};

/** j***@gmail.com — shows where the code went without revealing the address. */
const maskEmail = (email) => email.replace(/^(.)[^@]*(@.*)$/, '$1***$2');

exports.forgotPassword = async (req, res) => {
  const { identifier } = req.body;

  if (!identifier) {
    return res.status(400).json({ message: 'Email or phone number is required.' });
  }

  let query;
  if (identifier.includes('@')) {
    query = { email: identifier.toLowerCase().trim() };
  } else {
    const normalizedPhone = normalizePhone(identifier);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Please enter a valid phone number or email address.' });
    }
    query = { phone: normalizedPhone };
  }

  const user = await User.findOne(query);
  if (!user) {
    return res.status(404).json({ message: 'This email or phone number is not registered. Please create an account.' });
  }

  // Codes are only sent by email; phone-only (older) accounts need support to add an email.
  if (!user.email) {
    return res.status(400).json({ message: 'This account has no email address, so we can’t send a code. Please contact support to recover it.' });
  }

  // Generate 6-digit OTP reset code and set 15-minute expiration
  const resetCode = generateVerificationCode();
  user.resetPasswordCode = hashCode(resetCode);
  user.resetPasswordAttempts = 0;
  user.resetPasswordExpires = new Date(Date.now() + OTP_TTL_MS);
  await user.save();

  // Log the code for local dev testing
  logVerificationCode({ method: 'email', identifier: user.email, code: resetCode });

  // Send the recovery email in the background to avoid blocking the HTTP response
  sendResetPasswordEmail(user.email.toLowerCase(), resetCode)
    .catch((err) => console.error('Failed to send password reset email via SMTP in background:', err.message));

  res.status(200).json({
    message: `We’ve emailed a reset code to ${maskEmail(user.email)}.`,
    sentTo: maskEmail(user.email),
    channel: 'email'
  });
};

exports.resetPassword = async (req, res) => {
  const { identifier, code, password } = req.body;

  if (!identifier || !code || !password) {
    return res.status(400).json({ message: 'All fields (identifier, code, and new password) are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  let query;
  if (identifier.includes('@')) {
    query = { email: identifier.toLowerCase().trim() };
  } else {
    const normalizedPhone = normalizePhone(identifier);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Invalid phone number or email.' });
    }
    query = { phone: normalizedPhone };
  }

  const user = await User.findOne(query);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  // Verify recovery code (hashed, constant-time, max attempts)
  if (!user.resetPasswordCode) {
    return res.status(400).json({ message: 'No active password reset request. Please request a new code.' });
  }
  if ((user.resetPasswordAttempts || 0) >= MAX_OTP_ATTEMPTS) {
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new recovery code.' });
  }
  if (!codeMatches(code, user.resetPasswordCode)) {
    user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
    await user.save();
    return res.status(400).json({ message: 'Invalid password recovery code.' });
  }

  // Verify code expiration
  if (Date.now() > user.resetPasswordExpires) {
    return res.status(400).json({ message: 'Password recovery code has expired. Please request a new one.' });
  }

  // Update password (pre-save hook hashes it)
  user.password = password;
  user.resetPasswordCode = undefined;
  user.resetPasswordExpires = undefined;
  user.resetPasswordAttempts = 0;
  await user.save();

  res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
};


// @desc    Upload pharmacy storefront photo during registration (public, rate-limited, images only)
// @route   POST /api/auth/upload-pharmacy-image
exports.uploadPharmacyImage = async (req, res) => {
  if (!req.file) {
    throw new AppError(400, 'No file uploaded or invalid format. Images only.');
  }
  try {
    const secureUrl = await uploadToCloudinary(req.file.path, {
      folder: `${process.env.CLOUDINARY_FOLDER || 'Medeasy Uploads'}/pharmacy_images`,
    });
    res.status(200).json({ filePath: secureUrl });
  } catch (error) {
    require('fs').rm(req.file.path, { force: true }, () => {});
    throw error;
  }
};
