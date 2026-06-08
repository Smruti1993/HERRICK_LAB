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
            
            const idx = str.indexOf('medicore_chart_of_accounts');
            if (idx !== -1) {
                console.log(`\nFound medicore_chart_of_accounts in ${file} at offset ${idx}`);
                
                const jsonStart = str.indexOf('[', idx);
                if (jsonStart !== -1 && jsonStart < idx + 300) {
                    let bracketCount = 0;
                    let jsonEnd = -1;
                    for (let i = jsonStart; i < str.length; i++) {
                        if (str[i] === '[') bracketCount++;
                        else if (str[i] === ']') {
                            bracketCount--;
                            if (bracketCount === 0) {
                                jsonEnd = i;
                                break;
                            }
                        }
                    }
                    if (jsonEnd !== -1) {
                        const jsonStr = str.substring(jsonStart, jsonEnd + 1);
                        console.log("Extracted JSON length:", jsonStr.length);
                        try {
                            const parsed = JSON.parse(jsonStr);
                            console.log(`Parsed successfully. Array size: ${parsed.length}`);
                            parsed.forEach((a, idx) => {
                                console.log(`[${idx+1}] Code: ${a.code}, Name: ${a.name}, ParentID: ${a.parentId}`);
                            });
                        } catch (pe) {
                            console.log("JSON Parse Error:", pe.message);
                            console.log("Raw slice:", jsonStr.substring(0, 500));
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore
        }
    }
}
