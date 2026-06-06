const fs = require('fs');
const path = require('path');

const ldbDir = 'C:\\Users\\admin\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Local Storage\\leveldb';

if (!fs.existsSync(ldbDir)) {
    console.error("Local storage leveldb directory not found.");
    process.exit(1);
}

const files = fs.readdirSync(ldbDir);

let supabaseUrl = '';
let supabaseKey = '';

for (const file of files) {
    if (file.endsWith('.ldb') || file.endsWith('.log')) {
        const filePath = path.join(ldbDir, file);
        try {
            const content = fs.readFileSync(filePath);
            
            // Search for Supabase URL: https://*.supabase.co
            const urlRegex = /https:\/\/[a-z0-9\-]+\.supabase\.co/gi;
            let match;
            while ((match = urlRegex.exec(content.toString('binary'))) !== null) {
                supabaseUrl = match[0];
            }

            // Search for Supabase Key (JWT token structure: eyJhbGciOi...)
            const keyRegex = /eyJhbGciOi[A-Za-z0-9\-_\.\+]+/g;
            while ((match = keyRegex.exec(content.toString('binary'))) !== null) {
                // Supabase anon keys are usually long JWTs
                if (match[0].length > 100) {
                    supabaseKey = match[0];
                }
            }
        } catch (e) {
            // Ignore read errors
        }
    }
}

if (supabaseUrl && supabaseKey) {
    console.log("FOUND_URL=" + supabaseUrl);
    console.log("FOUND_KEY=" + supabaseKey);
} else {
    console.log("Credentials not found in LevelDB.");
}
