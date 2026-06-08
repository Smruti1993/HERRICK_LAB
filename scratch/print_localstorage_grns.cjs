const fs = require('fs');
const path = require('path');

const ldbDir = 'C:\\Users\\admin\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Local Storage\\leveldb';

if (!fs.existsSync(ldbDir)) {
    console.error("Local storage leveldb directory not found.");
    process.exit(1);
}

const files = fs.readdirSync(ldbDir);

for (const file of files) {
    if (file.endsWith('.ldb') || file.endsWith('.log')) {
        const filePath = path.join(ldbDir, file);
        try {
            const content = fs.readFileSync(filePath);
            const str = content.toString('binary');
            
            const idx = str.indexOf('medicore_grns');
            if (idx !== -1) {
                console.log(`Found medicore_grns in ${file}`);
                // Print a slice of the value
                const slice = str.slice(idx, idx + 2000);
                console.log("Value slice:", slice.replace(/[^ -~]+/g, '_'));
            }
        } catch (e) {
            // Ignore
        }
    }
}
