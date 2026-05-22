function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function logVerificationCode({ method, identifier, code }) {
  const address = method === 'email' ? `email ${identifier}` : `phone ${identifier}`;
  console.log(`Verification code sent to ${address}: ${code}`);
  console.log('NOTE: This is a temporary terminal-only delivery for testing. Replace with email/SMS integration later.');
}

module.exports = { generateVerificationCode, logVerificationCode };
