import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const importFromExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // defval: '' ensures empty cells aren't skipped in key enumeration if needed, 
        // but default behavior is usually fine.
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const validateImportStructure = (data: any[], requiredFields: string[]): { isValid: boolean; missingKeys: string[]; error?: string } => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { isValid: false, missingKeys: [], error: 'File appears to be empty or invalid.' };
  }

  const firstRow = data[0];
  const headers = Object.keys(firstRow);
  
  // Check for required keys. We use strict matching to ensure mapping works later.
  const missingKeys = requiredFields.filter(key => !headers.includes(key));

  if (missingKeys.length > 0) {
    return { isValid: false, missingKeys, error: `Missing required columns: ${missingKeys.join(', ')}` };
  }

  return { isValid: true, missingKeys: [] };
};