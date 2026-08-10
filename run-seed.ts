import { seedBDWorkflowTemplates } from './src/app/actions/bd';

async function main() {
  const result = await seedBDWorkflowTemplates();
  console.log(result);
}

main();
