const urls = [
  { name: 'API /health', url: 'http://localhost:5000/api/health' },
  { name: 'API /test', url: 'http://localhost:5000/api/test' },
  { name: 'Medicines', url: 'http://localhost:5000/api/medicines' },
  { name: 'Prescriptions', url: 'http://localhost:5000/api/prescriptions' },
  { name: 'Reviews', url: 'http://localhost:5000/api/reviews' },
];

async function check(u) {
  try {
    const res = await fetch(u.url, { method: 'GET' });
    const status = res.status;
    let info = '';
    if (status === 200) {
      try { const text = await res.text(); info = ` - len=${text.length}` } catch(e){}
    }
    console.log(`${u.name} => ${status}${info}`);
    return status >=200 && status < 400;
  } catch (err) {
    console.log(`${u.name} => ERROR: ${err.message}`);
    return false;
  }
}

(async function main(){
  let ok = true;
  for (const u of urls) {
    const res = await check(u);
    if (!res) ok = false;
  }
  process.exit(ok ? 0 : 2);
})();
