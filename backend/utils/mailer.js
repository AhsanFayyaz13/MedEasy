/**
 * MedEasy Transactional Mailer Utility
 * ─────────────────────────────────────────────────────────────
 * Sends verification OTP and recovery emails via Resend's HTTP API (Port 443).
 * This completely avoids outbound SMTP port blocking on hosting plans like Render Free.
 */

/**
 * Dispatch verification OTP code directly to user's email via Resend.
 * @param {string} recipientEmail Recipient email address
 * @param {string} otpCode 6-digit numeric OTP code
 */
exports.sendVerificationEmail = async (recipientEmail, otpCode) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

  if (!resendApiKey) {
    console.log(`[Diagnostic Fallback] Resend API Key not set. Code for ${recipientEmail}: ${otpCode}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `MedEasy Support <${senderEmail}>`,
      to: [recipientEmail],
      subject: 'MedEasy — Account Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0284c7; margin: 0; font-size: 28px; font-weight: bold; font-family: sans-serif;">MedEasy</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Your trusted digital healthcare portal</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 25px;" />
          <h3 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-bottom: 10px; font-family: sans-serif;">Verify Your Identity</h3>
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
      `
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API returned status ${response.status}: ${errorText}`);
  }

  return response.json();
};

/**
 * Dispatch password recovery reset code to user's email via Resend.
 * @param {string} recipientEmail Recipient email address
 * @param {string} resetCode 6-digit password reset code
 */
exports.sendResetPasswordEmail = async (recipientEmail, resetCode) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

  if (!resendApiKey) {
    console.log(`[Diagnostic Fallback] Resend API Key not set. Reset code for ${recipientEmail}: ${resetCode}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `MedEasy Support <${senderEmail}>`,
      to: [recipientEmail],
      subject: 'MedEasy — Account Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ef4444; margin: 0; font-size: 28px; font-weight: bold; font-family: sans-serif;">MedEasy</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Your trusted digital healthcare portal</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 25px;" />
          <h3 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-bottom: 10px; font-family: sans-serif;">Password Recovery Request</h3>
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
      `
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API returned status ${response.status}: ${errorText}`);
  }

  return response.json();
};

/**
 * Dispatch contact query email to medeasy@medeasy.systems via Resend.
 * @param {string} fromName Submitter's full name
 * @param {string} fromEmail Submitter's email address
 * @param {string} phone Submitter's phone number
 * @param {string} subject Subject of the query
 * @param {string} message Message body
 */
exports.sendContactEmail = async (fromName, fromEmail, phone, subject, message) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  const recipientEmail = 'medeasy@medeasy.systems';

  if (!resendApiKey) {
    console.log(`[Diagnostic Fallback] Resend API Key not set. Contact Form Message:
Name: ${fromName}
Email: ${fromEmail}
Phone: ${phone}
Subject: ${subject}
Message: ${message}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `MedEasy Contact <${senderEmail}>`,
      to: [recipientEmail],
      subject: `MedEasy Contact Us — ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #10b981; margin: 0; font-size: 28px; font-weight: bold; font-family: sans-serif;">MedEasy</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 5px;">New Contact Us Submission</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 25px;" />
          <h3 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-bottom: 10px; font-family: sans-serif;">Submission Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 120px;">Full Name:</td>
              <td style="padding: 8px 0; color: #0f172a;">${fromName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #475569;">Email Address:</td>
              <td style="padding: 8px 0; color: #0f172a;">${fromEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #475569;">Phone Number:</td>
              <td style="padding: 8px 0; color: #0f172a;">${phone || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
              <td style="padding: 8px 0; color: #0f172a;">${subject}</td>
            </tr>
          </table>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
          <h4 style="color: #0f172a; margin-bottom: 10px;">Message:</h4>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
            ${message}
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
            This submission was sent via the MedEasy Contact Us form.
          </p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API returned status ${response.status}: ${errorText}`);
  }

  return response.json();
};

