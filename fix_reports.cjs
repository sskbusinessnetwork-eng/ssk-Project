const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf8');

code = code.replace(/import {\ndeclare var jsPDF: any;\ndeclare var autoTable: any;\ndeclare var XLSX: any;\n  ResponsiveContainer,/g, 'import {\n  ResponsiveContainer,');

// Insert it at the top instead
code = `declare var jsPDF: any;\ndeclare var autoTable: any;\ndeclare var XLSX: any;\n` + code;

fs.writeFileSync('src/pages/Reports.tsx', code);
