export interface ParsedGS1 {
  gtin?: string;
  batch?: string;
  expiry?: string; // Format: YYYY-MM-DD
  rawExpiry?: string; // Format: YYMMDD
  serial?: string;
}

/**
 * Parses a GS1 barcode string (GS1-128 or GS1 DataMatrix) and extracts standard Application Identifiers (AIs).
 * Supports parentheses format e.g. (01)00888643031024(17)261231(10)LOT1234
 * Supports raw stream format e.g. 01008886430310241726123110LOT1234
 */
export function parseGS1(barcode: string): ParsedGS1 {
  const result: ParsedGS1 = {};
  if (!barcode) return result;

  let cleanBarcode = barcode.trim();
  
  // Strip AIM identifiers if present (e.g., ]C1 for GS1-128, ]d2 for GS1 DataMatrix)
  if (cleanBarcode.startsWith(']C1') || cleanBarcode.startsWith(']d2')) {
    cleanBarcode = cleanBarcode.substring(3);
  }

  // 1. Try parsing parentheses format: (01)00888643031024(17)261231(10)LOT123
  if (cleanBarcode.includes('(') && cleanBarcode.includes(')')) {
    const regex = /\((\d{2,4})\)([^()]+)/g;
    const matches = Array.from(cleanBarcode.matchAll(regex));
    
    for (const match of matches) {
      const ai = match[1];
      const val = match[2].trim();
      
      if (ai === '01' || ai === '02') {
        result.gtin = val;
      } else if (ai === '10') {
        result.batch = val;
      } else if (ai === '17') {
        result.rawExpiry = val;
        result.expiry = parseGS1Date(val);
      } else if (ai === '21') {
        result.serial = val;
      }
    }

    if (result.gtin || result.batch || result.expiry) {
      return result;
    }
  }

  // 2. Try parsing raw stream sequential format
  // Strict parser: if any part of the stream cannot be mapped to a valid AI, abort.
  let i = 0;
  let parsedAny = false;
  const tempResult: ParsedGS1 = {};
  
  while (i < cleanBarcode.length) {
    // Skip Group Separator if encountered between AIs
    if (cleanBarcode.charCodeAt(i) === 29) {
      i++;
      continue;
    }

    const ai2 = cleanBarcode.substring(i, i + 2);
    if (ai2 === '01' || ai2 === '02') {
      // GTIN: 14 digits
      const val = cleanBarcode.substring(i + 2, i + 16);
      if (/^\d{14}$/.test(val)) {
        tempResult.gtin = val;
        i += 16;
        parsedAny = true;
      } else {
        return {}; // Invalid GTIN format, abort
      }
    } else if (ai2 === '17') {
      // Expiry Date: 6 digits (YYMMDD)
      const val = cleanBarcode.substring(i + 2, i + 8);
      if (/^\d{6}$/.test(val)) {
        tempResult.rawExpiry = val;
        tempResult.expiry = parseGS1Date(val);
        i += 8;
        parsedAny = true;
      } else {
        return {}; // Invalid Expiry format, abort
      }
    } else if (ai2 === '11' || ai2 === '13' || ai2 === '15') {
      // Production Date / Packaging Date: 6 digits
      const val = cleanBarcode.substring(i + 2, i + 8);
      if (/^\d{6}$/.test(val)) {
        i += 8;
        parsedAny = true;
      } else {
        return {}; // Invalid Date format, abort
      }
    } else if (ai2 === '10') {
      // Batch/Lot: variable length
      const rest = cleanBarcode.substring(i + 2);
      if (rest.length === 0) return {}; // Empty batch, abort
      const gsIndex = findGSIndex(rest);
      if (gsIndex !== -1) {
        tempResult.batch = rest.substring(0, gsIndex).trim();
        i += 2 + gsIndex + 1;
      } else {
        tempResult.batch = rest.trim();
        i = cleanBarcode.length;
      }
      parsedAny = true;
    } else if (ai2 === '21') {
      // Serial Number: variable length
      const rest = cleanBarcode.substring(i + 2);
      if (rest.length === 0) return {}; // Empty serial, abort
      const gsIndex = findGSIndex(rest);
      if (gsIndex !== -1) {
        tempResult.serial = rest.substring(0, gsIndex).trim();
        i += 2 + gsIndex + 1;
      } else {
        tempResult.serial = rest.trim();
        i = cleanBarcode.length;
      }
      parsedAny = true;
    } else if (ai2 === '30' || ai2 === '37') {
      // Count/Qty: variable length
      const rest = cleanBarcode.substring(i + 2);
      if (rest.length === 0) return {}; // Empty qty, abort
      const gsIndex = findGSIndex(rest);
      if (gsIndex !== -1) {
        i += 2 + gsIndex + 1;
      } else {
        i = cleanBarcode.length;
      }
      parsedAny = true;
    } else {
      // If we encounter an unrecognized AI, abort to prevent EAN-13/UPC false matches
      return {};
    }
  }

  return parsedAny ? tempResult : {};
}

/**
 * Parses YYMMDD string into YYYY-MM-DD
 */
export function parseGS1Date(dateStr?: string): string | undefined {
  if (!dateStr || dateStr.length !== 6 || !/^\d{6}$/.test(dateStr)) return undefined;

  const yy = parseInt(dateStr.substring(0, 2), 10);
  const mm = parseInt(dateStr.substring(2, 4), 10);
  const dd = parseInt(dateStr.substring(4, 6), 10);

  // Month validation (1 to 12)
  if (mm < 1 || mm > 12) return undefined;
  // Day validation (1 to 31, simple check)
  if (dd < 1 || dd > 31) return undefined;

  // Determine century: 
  // Let's assume years 00-49 are 2000-2049, and 50-99 are 1950-1999 (standard date parsing rule)
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  let year = currentCentury + yy;
  if (year - currentYear > 50) {
    year -= 100;
  } else if (currentYear - year > 50) {
    year += 100;
  }

  // Format month and day with leading zeros
  const formattedMonth = String(mm).padStart(2, '0');
  const formattedDay = String(dd).padStart(2, '0');

  return `${year}-${formattedMonth}-${formattedDay}`;
}

/**
 * Finds index of Group Separator (ASCII 29) or virtual group separators commonly injected by scanners (e.g. <GS>, ^)
 */
function findGSIndex(str: string): number {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // ASCII 29 is standard GS
    if (code === 29) return i;
    
    // Check for some common virtual separators that scanner keyboard emulators might map, like Ctrl+], or a literal '^'
    if (str[i] === '^') return i;
  }
  
  // Check for literal "<GS>" string if the keyboard wedge writes it
  const gsStringIndex = str.indexOf('<GS>');
  if (gsStringIndex !== -1) return gsStringIndex;

  return -1;
}
