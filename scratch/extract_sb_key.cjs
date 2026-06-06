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
            
            // Search for medicore_sb_key
            const keyIdx = str.indexOf('medicore_sb_key');
            if (keyIdx !== -1) {
                console.log(`Found medicore_sb_key in file ${file} at index ${keyIdx}`);
                const slice = str.slice(keyIdx, keyIdx + 1000);
                console.log("Key slice:", slice.replace(/[^ -~]+/g, '_'));
            }

            // Search for medicore_sb_url
            const urlIdx = str.indexOf('medicore_sb_url');
            if (urlIdx !== -1) {
                console.log(`Found medicore_sb_url in file ${file} at index ${urlIdx}`);
                const slice = str.slice(urlIdx, urlIdx + 200);
                console.log("Url slice:", slice.replace(/[^ -~]+/g, '_'));
            }
        } catch (e) {
            // Ignore
        }
    }
}
