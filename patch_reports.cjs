const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf8');

// Remove static imports
code = code.replace(/import { jsPDF } from 'jspdf';\n/g, '');
code = code.replace(/import autoTable from 'jspdf-autotable';\n/g, '');
code = code.replace(/import \* as XLSX from 'xlsx';\n/g, '');

// Convert exportToExcel to async and use dynamic import
code = code.replace(/const exportToExcel = \(\) => {/g, 'const exportToExcel = async () => {\n    const XLSX = await import("xlsx");');

// Convert exportToPDF to async and use dynamic import
code = code.replace(/const exportToPDF = \(\) => {/g, 'const exportToPDF = async () => {\n    const { default: jsPDF } = await import("jspdf");\n    const { default: autoTable } = await import("jspdf-autotable");');

fs.writeFileSync('src/pages/Reports.tsx', code);
