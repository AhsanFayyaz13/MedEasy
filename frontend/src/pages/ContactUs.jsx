import { useState } from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaPhoneAlt, FaTag, FaComment, FaPaperPlane } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { submitContactMessage } from '../services/contactService';
import './ContactUs.css';

export default function ContactUs() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Pre-populate fields from logged-in user credentials
  const [name] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone] = useState(user?.phone || '');

  // Editable fields
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subject) {
      toast.error('Please select a subject.');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter your message.');
      return;
    }

    setLoading(true);
    try {
      const response = await submitContactMessage({
        name,
        email,
        phone,
        subject,
        message,
      });

      toast.success(response.message || 'Your message has been sent successfully!');
      // Reset editable fields
      setSubject('');
      setMessage('');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page-wrapper py-5">
      <Container>
        {/* Header Section */}
        <div className="contact-header text-center mb-5">
          <span className="contact-subheading">
            <FaPaperPlane className="sub-icon me-2" /> GET IN TOUCH
          </span>
          <h1 className="contact-title mt-2">
            Contact <span className="text-highlight">Us</span>
          </h1>
          <p className="contact-subtitle mx-auto">
            Have a question or want to partner with us? We'd love to hear from you.
          </p>
        </div>

        {/* Form Container */}
        <Row className="justify-content-center">
          <Col lg={8} md={10}>
            <Card className="contact-card border-0 shadow-sm">
              <Card.Body className="p-4 p-md-5">
                <Form onSubmit={handleSubmit}>
                  <Row className="mb-4">
                    {/* Read-Only: Full Name */}
                    <Form.Group as={Col} sm={6} className="mb-3 mb-sm-0">
                      <Form.Label className="form-label-with-icon">
                        <FaUser className="label-icon me-2" /> Full Name
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={name}
                        disabled
                        readOnly
                        placeholder="Your full name"
                        className="contact-input-readonly"
                      />
                    </Form.Group>

                    {/* Read-Only: Email */}
                    <Form.Group as={Col} sm={6}>
                      <Form.Label className="form-label-with-icon">
                        <FaEnvelope className="label-icon me-2" /> Email
                      </Form.Label>
                      <Form.Control
                        type="email"
                        value={email}
                        disabled
                        readOnly
                        placeholder="your@email.com"
                        className="contact-input-readonly"
                      />
                    </Form.Group>
                  </Row>

                  {/* Read-Only: Phone Number */}
                  <Form.Group className="mb-4">
                    <Form.Label className="form-label-with-icon">
                      <FaPhoneAlt className="label-icon me-2" /> Phone Number
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={phone || 'Not provided'}
                      disabled
                      readOnly
                      placeholder="+92 300 0000000"
                      className="contact-input-readonly"
                    />
                  </Form.Group>

                  {/* Editable: Subject */}
                  <Form.Group className="mb-4">
                    <Form.Label className="form-label-with-icon">
                      <FaTag className="label-icon me-2" /> Subject
                    </Form.Label>
                    <Form.Select
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="contact-select"
                    >
                      <option value="" disabled>Select a subject</option>
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Appointment Support">Appointment Support</option>
                      <option value="Order & Delivery Inquiry">Order & Delivery Inquiry</option>
                      <option value="Prescription Issues">Prescription Issues</option>
                      <option value="Feedback & Suggestions">Feedback & Suggestions</option>
                      <option value="Other">Other</option>
                    </Form.Select>
                  </Form.Group>

                  {/* Editable: Message */}
                  <Form.Group className="mb-4">
                    <Form.Label className="form-label-with-icon">
                      <FaComment className="label-icon me-2" /> Message
                    </Form.Label>
                    <Form.Control
                      required
                      as="textarea"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your message here..."
                      className="contact-textarea"
                    />
                  </Form.Group>

                  {/* Submit Button */}
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={loading}
                    className="contact-btn-submit w-100 py-3 d-flex align-items-center justify-content-center gap-2"
                  >
                    <FaPaperPlane /> {loading ? 'Sending...' : 'Send Message'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
