const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

content = content.replace(
  "import DashboardUI from '@/app/components/DashboardUI';",
  "import DashboardClientWrapper from '@/app/components/DashboardClientWrapper';"
);

content = content.replace(
  "<DashboardUI",
  "<DashboardClientWrapper"
);

fs.writeFileSync('src/app/dashboard/page.tsx', content);
console.log('Patched page.tsx');
