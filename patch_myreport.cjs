const fs = require('fs');
let code = fs.readFileSync('src/pages/MyReport.tsx', 'utf8');

// handleDownloadPDF
code = code.replace(/const handleDownloadPDF = \(\) => {/, 'const handleDownloadPDF = async () => {');
code = code.replace(/const doc = new jsPDF\(\);/, 'const { default: jsPDF } = await import("jspdf");\n    const { default: autoTable } = await import("jspdf-autotable");\n    const doc = new jsPDF();');

// handleDownloadExcel
code = code.replace(/const handleDownloadExcel = \(\) => {/, 'const handleDownloadExcel = async () => {');
code = code.replace(/const wb = XLSX\.utils\.book_new\(\);/, 'const XLSX = await import("xlsx");\n    const wb = XLSX.utils.book_new();');

// handleDownloadWord
code = code.replace(/const handleDownloadWord = \(\) => {/, 'const handleDownloadWord = async () => {');
code = code.replace(/const doc = new Document\({/, 'const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = await import("docx");\n    const doc = new Document({');

fs.writeFileSync('src/pages/MyReport.tsx', code);
