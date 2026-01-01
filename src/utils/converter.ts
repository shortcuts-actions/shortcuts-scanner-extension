/**
 * Converts a JavaScript object to XML plist format
 */
export function convertToXML(obj: any): string {
  const header =
    '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n';
  const footer = '</plist>';

  const body = convertValue(obj, 1);
  return header + body + footer;
}

/**
 * Converts a single value to XML format with proper indentation
 */
function convertValue(value: any, depth: number): string {
  const indent = '  '.repeat(depth);

  if (value === null || value === undefined) {
    return `${indent}<string></string>\n`;
  }

  if (typeof value === 'boolean') {
    return `${indent}<${value.toString()}/>\n`;
  }

  // Handle BigInt as integer (defensive check in case sanitization is missed)
  if (typeof value === 'bigint') {
    return `${indent}<integer>${value}</integer>\n`;
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return `${indent}<integer>${value}</integer>\n`;
    } else {
      return `${indent}<real>${value}</real>\n`;
    }
  }

  if (typeof value === 'string') {
    return `${indent}<string>${escapeXML(value)}</string>\n`;
  }

  if (value instanceof Date) {
    return `${indent}<date>${value.toISOString()}</date>\n`;
  }

  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    const base64 = arrayBufferToBase64(value);
    return `${indent}<data>\n${indent}  ${base64}\n${indent}</data>\n`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${indent}<array/>\n`;
    }
    let result = `${indent}<array>\n`;
    for (const item of value) {
      result += convertValue(item, depth + 1);
    }
    result += `${indent}</array>\n`;
    return result;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return `${indent}<dict/>\n`;
    }
    let result = `${indent}<dict>\n`;
    for (const key of keys) {
      result += `${indent}  <key>${escapeXML(key)}</key>\n`;
      result += convertValue(value[key], depth + 1);
    }
    result += `${indent}</dict>\n`;
    return result;
  }

  return `${indent}<string>${escapeXML(String(value))}</string>\n`;
}

/**
 * Escapes special XML characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts ArrayBuffer or Uint8Array to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a JavaScript object to pretty-printed JSON
 * Includes a replacer function to handle BigInt values defensively
 */
export function convertToJSON(obj: any): string {
  return JSON.stringify(
    obj,
    (_key, value) => {
      // Convert BigInt to Number (defensive check in case sanitization is missed)
      if (typeof value === 'bigint') {
        if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
          console.warn(`BigInt value ${value} exceeds safe integer range and may lose precision`);
        }
        return Number(value);
      }
      return value;
    },
    2,
  );
}

/**
 * Downloads content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Sanitizes a filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9_\-.]/gi, '_');
}
