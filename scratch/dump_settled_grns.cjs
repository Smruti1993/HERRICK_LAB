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
            
            const idx = str.indexOf('medicore_settled_grn_ids');
            if (idx !== -1) {
                console.log(`Found medicore_settled_grn_ids in ${file}`);
                // Print the raw string slice around it to inspect
                const slice = str.slice(idx, idx + 200);
                console.log("Slice:", slice.replace(/[^ -~]+/g, '_'));
            }
        } catch (e) {
            // Ignore
        }
    }
}
