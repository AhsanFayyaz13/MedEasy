const Contact = require('../models/Contact');
const { sendContactEmail } = require('../utils/mailer');

// @desc    Submit a contact query
// @route   POST /api/contacts
// @access  Private
exports.submitContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate request body
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Please provide Name, Email, Subject and Message.' });
    }

    // Role check: Admin is not allowed to submit contact messages
    if (req.user.role === 'admin') {
      return res.status(403).json({ message: 'Administrators are not allowed to submit contact requests.' });
    }

    // Save submission to MongoDB
    const contact = new Contact({
      userId: req.user._id,
      name,
      email,
      phone,
      subject,
      message,
      role: req.user.role
    });

    const savedContact = await contact.save();

    // Trigger email notification to medeasy@medeasy.systems in the background
    // Catch errors internally to prevent blocking the successful response
    sendContactEmail(name, email, phone, subject, message)
      .then(() => console.log(`Contact Us email notification dispatched successfully for: ${email}`))
      .catch((err) => console.error(`Failed to send Contact Us email for ${email} in background:`, err.message));

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon!',
      data: savedContact
    });
  } catch (error) {
    console.error('Error in submitContactMessage controller:', error.message);
    res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};
