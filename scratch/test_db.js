import fs from 'fs';

const content = fs.readFileSync('src/context/DataContext.tsx', 'utf8');
const lines = content.split('\n');

console.log("Lines 1600 to 1645 of DataContext.tsx:");
for (let i = 1600; i <= 1645; i++) {
  console.log(`${i}: ${lines[i - 1]}`);
}
