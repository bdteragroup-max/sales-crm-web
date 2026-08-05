async function main() {
  const res = await fetch('http://localhost:3000/api/satisfaction/active-companies?round=1&year=2569');
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text.substring(0, 500));
}

main();
