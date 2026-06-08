const fs = require('fs');
const path = require('path');

const ldbDir = 'C:\\Users\\admin\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Local Storage\\leveldb';

if (!fs.existsSync(ldbDir)) {
    console.error("Local storage leveldb directory not found.");
    process.exit(1);
}

const files = fs.readdirSync(ldbDir);

let found = false;
for (const file of files) {
    if (file.endsWith('.ldb') || file.endsWith('.log')) {
        const filePath = path.join(ldbDir, file);
        try {
            const content = fs.readFileSync(filePath);
            const str = content.toString('binary');
            
            const idx133 = str.indexOf('133000');
            const idx134 = str.indexOf('134000');
            
            if (idx133 !== -1 || idx134 !== -1) {
                console.log(`Found account codes in file ${file}:`);
                if (idx133 !== -1) console.log(`- 133000 at index ${idx133}`);
                if (idx134 !== -1) console.log(`- 134000 at index ${idx134}`);
                found = true;
            }
        } catch (e) {
            // Ignore
        }
    }
}

if (!found) {
    console.log("Did not find 133000 or 134000 anywhere in Chrome's local storage.");
}
