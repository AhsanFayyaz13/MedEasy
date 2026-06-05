import api from './api';

/**
 * contactService.js
 * Wrapper for sending contact form submissions to the backend.
 */
export async function submitContactMessage({ name, email, phone, subject, message }) {
  const { data } = await api.post('/contacts', {
    name,
    email,
    phone,
    subject,
    message
  });
  return data;
}

export default { submitContactMessage };
