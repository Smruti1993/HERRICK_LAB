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
            
            let idx = 0;
            while (true) {
                idx = str.indexOf('medicore_', idx);
                if (idx === -1) break;
                
                const keySlice = str.slice(idx, idx + 150).split('\x00')[0].split('\x01')[0];
                const cleanKey = keySlice.replace(/[^ -~]+/g, '_');
                
                if (cleanKey.includes('settled') || cleanKey.includes('grn') || cleanKey.includes('invoice')) {
                    console.log(`File: ${file} | Key: ${cleanKey}`);
                    // Print value slice
                    const valSlice = str.slice(idx, idx + 600);
                    console.log(`Value: ${valSlice.replace(/[^ -~]+/g, '_')}\n`);
                }
                idx += 10;
            }
        } catch (e) {
            // Ignore
        }
    }
}
