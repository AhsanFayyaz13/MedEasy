const urls = [
  { name: 'API root', url: 'http://localhost:5000/api' },
  { name: 'Medicines', url: 'http://localhost:5000/api/medicines' },
  { name: 'Frontend /medicines', url: 'http://localhost:5173/medicines' },
];

async function check(u) {
  try {
    const res = await fetch(u.url, { method: 'GET' });
    const status = res.status;
    let info = '';
    if (u.name === 'Medicines' && status === 200) {
      try {
        const json = await res.json();
        info = ` - items=${Array.isArray(json) ? json.length : 'unknown'}`;
      } catch (e) {
        info = ' - (invalid json)';
      }
    }
    console.log(`${u.name} => ${status}${info}`);
    return status >= 200 && status < 400;
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
