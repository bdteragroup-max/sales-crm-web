const fs = require('fs');

const schemaPath = 'prisma/schema.prisma';
const lines = fs.readFileSync(schemaPath, 'utf8').split('\n');

// Find where the HR models begin (admin_login_attempts)
const splitIndex = lines.findIndex(line => line.includes('model admin_login_attempts'));

if (splitIndex !== -1) {
    // Keep only the CRM lines (before the split index)
    // We also remove any trailing empty lines right before the split
    let crmLines = lines.slice(0, splitIndex);
    while (crmLines[crmLines.length - 1].trim() === '') {
        crmLines.pop();
    }
    
    fs.writeFileSync(schemaPath, crmLines.join('\n'));
    console.log("Successfully removed HR tables from schema.prisma!");
    console.log("Your CRM schema is now completely decoupled from your HR schema.");
} else {
    console.log("Could not find the HR models in schema.prisma. They might have already been removed.");
}
