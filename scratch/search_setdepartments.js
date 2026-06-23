const fs = require('fs');

const content = fs.readFileSync('d:\\New folder\\GIT HUB\\HIS-WEB5\\src\\context\\DataContext.tsx', 'utf8');

const regex = /setDepartments/g;
let match;
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('setDepartments')) {
    console.log(`Line ${i + 1}: ${lines[i]}`);
  }
}
