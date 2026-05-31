const nodemailer = require('nodemailer');

// Define connection transporter using environment credentials
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: smtpPort,
  secure: smtpPort === 465, // true for port 465 SSL, false for TLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  family: 4, // Force IPv4 to prevent ENETUNREACH errors on Render
});

/**
 * Dispatch verification OTP code directly to user's email.
 * @param {string} recipientEmail Recipient email address
 * @param {string} otpCode 6-digit numeric OTP code
 */
exports.sendVerificationEmail = async (recipientEmail, otpCode) => {
  // If credentials are not configured, print verification code in terminal and skip sending mail
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[Diagnostic Fallback] SMTP credentials not set. Code for ${recipientEmail}: ${otpCode}`);
    return;
  }

  const mailOptions = {
    from: `"MedEasy Support" <${process.env.SMTP_USER}>`,
    to: recipientEmail,
    subject: 'MedEasy — Account Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0284c7; margin: 0; font-size: 28px; font-weight: bold; font-family: 'Inter', sans-serif;">MedEasy</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Your trusted digital healthcare portal</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 25px;" />
        <h3 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-bottom: 10px;">Verify Your Identity</h3>
        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
          Thank you for registering an account on MedEasy. To finalize your registration and secure your profile, please verify your email address by entering the 6-digit OTP code below:
        </p>
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; padding: 20px; text-align: center; margin: 25px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0369a1; font-family: monospace;">${otpCode}</span>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          This code is strictly confidential and will expire in <strong>15 minutes</strong>. If you did not request this verification, please secure your credentials immediately.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
          This email was sent dynamically by the MedEasy platform automated messaging engine. Please do not reply directly to this mail. For help, contact support@medeasy.systems.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

/**
 * Dispatch password recovery reset code to user's email.
 * @param {string} recipientEmail Recipient email address
 * @param {string} resetCode 6-digit password reset code
 */
exports.sendResetPasswordEmail = async (recipientEmail, resetCode) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[Diagnostic Fallback] SMTP credentials not set. Reset code for ${recipientEmail}: ${resetCode}`);
    return;
  }

  const mailOptions = {
    from: `"MedEasy Support" <${process.env.SMTP_USER}>`,
    to: recipientEmail,
    subject: 'MedEasy — Account Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ef4444; margin: 0; font-size: 28px; font-weight: bold; font-family: 'Inter', sans-serif;">MedEasy</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Your trusted digital healthcare portal</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 25px;" />
        <h3 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-bottom: 10px;">Password Recovery Request</h3>
        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
          We received a request to reset the password for your MedEasy profile. To perform the reset, please enter the security recovery code below:
        </p>
        <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fca5a5; padding: 20px; text-align: center; margin: 25px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #b91c1c; font-family: monospace;">${resetCode}</span>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          This code is confidential and will expire in <strong>15 minutes</strong>. If you did not trigger this request, your account is safe, but we recommend checking your password strength.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
          This email was sent dynamically by the MedEasy platform automated messaging engine. Please do not reply directly to this mail.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
