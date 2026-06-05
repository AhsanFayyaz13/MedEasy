async function main(){
  try{
    const res = await fetch('http://localhost:5000/api/medicines');
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  }catch(e){
    console.error('ERROR:', e.message);
    process.exit(2);
  }
}
main();
