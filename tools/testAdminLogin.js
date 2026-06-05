async function main() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@medeasy.local', password: 'AdminPass123' }),
    });
    const data = await res.json();
    console.log('status', res.status);
    console.log('body', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
main();
