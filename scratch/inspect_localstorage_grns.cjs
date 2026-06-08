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
            const str = content.toString('utf-8');
            
            const idx = str.indexOf('medicore_grns');
            if (idx !== -1) {
                console.log(`Found medicore_grns in ${file}`);
                // Extract clean JSON array
                const jsonStart = str.indexOf('[', idx);
                if (jsonStart !== -1 && jsonStart < idx + 300) {
                    let bracketCount = 0;
                    let jsonStr = '';
                    for (let i = jsonStart; i < str.length; i++) {
                        const char = str[i];
                        if (char === '[') bracketCount++;
                        else if (char === ']') bracketCount--;
                        
                        jsonStr += char;
                        if (bracketCount === 0) break;
                    }
                    
                    // Sanitize JSON string - remove non-printable characters
                    const cleanJsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
                    try {
                        const parsed = JSON.parse(cleanJsonStr);
                        console.log(`Parsed successfully! Array size: ${parsed.length}`);
                        parsed.forEach((g, idx) => {
                            console.log(`[${idx}] ID: ${g.id}, GRN No: ${g.grnNo}, Invoice No: ${g.invoiceNo}, Net: ${g.netAmount}`);
                        });
                    } catch (pe) {
                        console.log(`JSON Parse Error: ${pe.message}`);
                    }
                }
            }
        } catch (e) {
            // Ignore
        }
    }
}
