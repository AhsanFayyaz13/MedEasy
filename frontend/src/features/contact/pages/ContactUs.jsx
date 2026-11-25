import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiMail, FiMapPin, FiPhone, FiSend } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { submitContactMessage } from '../../../services/api/contactService';
import { Avatar, Button, Card, Input, PageHeader, Select, Textarea } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { BUSINESS } from '../../../lib/business';
import './ContactUs.css';

const SUBJECTS = [
  'Order & delivery',
  'Prescription',
  'Appointment',
  'Payment & refund',
  'Feedback & suggestions',
  'Partnership',
  'Something else',
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, subject, message }) {
  const e = {};
  if (!email.trim()) e.email = 'We need an email address to reply to you.';
  else if (!EMAIL_RE.test(email.trim())) e.email = 'Please enter a valid email address.';
  if (!subject) e.subject = 'Please choose a topic.';
  if (message.trim().length < 5) e.message = 'Please tell us a little more (at least 5 characters).';
  return e;
}

/** Support form for signed-in users (name/phone come from the account). */
export default function ContactUs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const accountEmail = user?.email || '';

  const [fields, setFields] = useState({ email: accountEmail, subject: '', message: '' });
  const [touched, setTouched] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const errors = validate(fields);
  const shown = (k) => (touched[k] ? errors[k] : undefined);
  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, subject: true, message: true });
    if (Object.keys(errors).length) {
      document.querySelector('.contact-form [aria-invalid="true"]')?.focus();
      return;
    }
    setSending(true);
    try {
      await submitContactMessage({
        name: user?.name || 'MedEasy user',
        email: fields.email.trim(),
        phone: user?.phone || undefined,
        subject: fields.subject,
        message: fields.message.trim(),
      });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Your message couldn’t be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setFields({ email: accountEmail, subject: '', message: '' });
    setTouched({});
    setSent(false);
  };

  return (
    <div className="contact-page">
      <PageMeta title="Contact us" noindex />
      <div className="container">
        <PageHeader eyebrow="Support" title="Contact us" subtitle="Questions about an order, a prescription or an appointment? We usually reply within one working day." />

        <div className="contact-layout">
          <Card>
            {sent ? (
              <div className="contact-sent" role="status">
                <FiCheckCircle aria-hidden="true" />
                <h2>Message sent</h2>
                <p>Thanks, {user?.name?.split(' ')[0] || 'there'} — we’ll reply to <strong>{fields.email}</strong>.</p>
                <Button variant="secondary" onClick={reset}>Send another message</Button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={submit} noValidate>
                <div className="contact-from">
                  <Avatar name={user?.name || ''} size={40} />
                  <div>
                    <span>Sending as</span>
                    <strong>{user?.name}</strong>
                    {user?.phone && <span>{user.phone}</span>}
                  </div>
                </div>

                <Input
                  name="email"
                  type="email"
                  label="Reply-to email"
                  required
                  value={fields.email}
                  onChange={set('email')}
                  onBlur={blur('email')}
                  readOnly={Boolean(accountEmail)}
                  hint={accountEmail ? 'From your account.' : 'Your account has no email, so add one for our reply.'}
                  error={shown('email')}
                  autoComplete="email"
                />
                <Select
                  name="subject"
                  label="Topic"
                  required
                  placeholder="Choose a topic"
                  options={SUBJECTS}
                  value={fields.subject}
                  onChange={set('subject')}
                  onBlur={blur('subject')}
                  error={shown('subject')}
                />
                <Textarea
                  name="message"
                  label="Message"
                  required
                  rows={6}
                  maxLength={5000}
                  placeholder="Include your order or prescription number if you have one."
                  value={fields.message}
                  onChange={set('message')}
                  onBlur={blur('message')}
                  error={shown('message')}
                />
                <Button type="submit" size="lg" loading={sending} leftIcon={<FiSend aria-hidden="true" />}>
                  Send message
                </Button>
              </form>
            )}
          </Card>

          <aside className="contact-aside">
            <Card>
              <h2>Other ways to reach us</h2>
              <ul className="contact-aside__list">
                <li><FiPhone aria-hidden="true" /><div><span>Phone</span><a href={`tel:${BUSINESS.phoneHref}`}>{BUSINESS.phone}</a></div></li>
                <li><FiMail aria-hidden="true" /><div><span>Email</span><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></div></li>
                <li><FiMapPin aria-hidden="true" /><div><span>Address</span>{BUSINESS.address}</div></li>
              </ul>
            </Card>
            <Card>
              <h2>Quick answers</h2>
              <ul className="contact-aside__links">
                <li><Link to="/orders">Track or cancel an order</Link></li>
                <li><Link to="/prescriptions/upload">Check a prescription’s status</Link></li>
                <li><Link to="/refund-policy">Refunds and returns</Link></li>
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
