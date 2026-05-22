const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const jwt = require('jsonwebtoken');
const { normalizePhone } = require('../utils/phone');
const { generateVerificationCode, logVerificationCode } = require('../utils/verification');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, address, verificationChannel } = req.body;

    // Validate input - name, password, phone, and verificationChannel are required
    if (!name || !password || !phone || !verificationChannel) {
      return res.status(400).json({ message: 'Missing required fields: name, password, phone, or verificationChannel' });
    }

    if (!['email', 'phone'].includes(verificationChannel)) {
      return res.status(400).json({ message: 'Verification channel must be email or phone' });
    }

    if (verificationChannel === 'email' && !email) {
      return res.status(400).json({ message: 'Email address is required to receive verification code on email' });
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
    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
    }

    // Delete any existing pending registrations for this phone number to avoid duplication/bloat
    await PendingUser.deleteMany({ phone: normalizedPhone });

    // Generate verification code & expiration (15 minutes from now)
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Save registration details to PendingUser
    await PendingUser.create({
      name,
      email: email ? email.toLowerCase() : undefined,
      phone: normalizedPhone,
      password, // will be hashed when creating permanent User
      role: role || 'patient',
      address,
      verificationCode,
      verificationCodeExpires,
      verificationChannel
    });

    // Log the verification code for temporary local testing in terminal
    logVerificationCode({
      method: verificationChannel,
      identifier: verificationChannel === 'email' ? email : normalizedPhone,
      code: verificationCode
    });

    res.status(200).json({
      message: 'Verification code sent successfully',
      phone: normalizedPhone,
      email: email ? email.toLowerCase() : null,
      channel: verificationChannel
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyRegistration = async (req, res) => {
  try {
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

    // Verify code match
    if (pending.verificationCode !== code) {
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
      password: pending.password, // hashed automatically by User's pre-save hook
      role: pending.role,
      phone: pending.phone,
      address: pending.address
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
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resendVerificationCode = async (req, res) => {
  try {
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
    pending.verificationCode = newCode;
    pending.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    await pending.save();

    // Log the code again for testing
    logVerificationCode({
      method: pending.verificationChannel,
      identifier: pending.verificationChannel === 'email' ? pending.email : pending.phone,
      code: newCode
    });

    res.status(200).json({
      message: 'Verification code resent successfully',
      phone: pending.phone,
      email: pending.email,
      channel: pending.verificationChannel
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const inputIdentifier = identifier || email;

    if (!inputIdentifier || !password) {
      return res.status(400).json({ message: 'Email/Phone and password are required' });
    }

    let query = {};
    if (inputIdentifier.includes('@')) {
      query = { email: inputIdentifier.toLowerCase() };
    } else {
      const normalizedPhone = normalizePhone(inputIdentifier);
      if (!normalizedPhone) {
        return res.status(400).json({ message: 'Please enter a valid phone number or email address' });
      }
      query = { phone: normalizedPhone };
    }

    const user = await User.findOne(query);

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials. Please verify your email/phone and password.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { 
      name, email, phone, address,
      // Pharmacist details
      pharmacyName, degreeName, degreePlace, licenseNumber,
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
      if (pharmacyName !== undefined) user.pharmacyName = pharmacyName;
      if (degreeName !== undefined) user.degreeName = degreeName;
      if (degreePlace !== undefined) user.degreePlace = degreePlace;
      if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;

      // Auto verify if key fields are provided
      if (user.pharmacyName?.trim() && user.degreePlace?.trim() && user.licenseNumber?.trim()) {
        user.isVerifiedProfile = true;
      } else {
        user.isVerifiedProfile = false;
      }
    } else if (user.role === 'doctor') {
      if (specialty !== undefined) user.specialty = specialty;
      if (pmcRegistration !== undefined) user.pmcRegistration = pmcRegistration;
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

      // Auto verify if key fields are provided
      if (user.specialty?.trim() && user.pmcRegistration?.trim() && user.clinicAddress?.trim()) {
        user.isVerifiedProfile = true;
      } else {
        user.isVerifiedProfile = false;
      }
    }

    await user.save();

    // Return updated user profile omitting the password
    const updatedUser = await User.findById(user._id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded or invalid file format.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Save the relative URL of the uploaded image
    user.profileImage = `/uploads/${req.file.filename}`;
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
