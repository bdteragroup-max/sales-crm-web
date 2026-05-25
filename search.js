const fs = require('fs');
const path = require('path');
function search(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      search(p);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.includes('SERVICE_ISSUE')) {
        console.log('Found in:', p);
      }
    }
  });
}
search('src/app');
