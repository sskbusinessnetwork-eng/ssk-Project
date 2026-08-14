sed -i 's/const { default: jsPDF } = await import("jspdf");/const { jsPDF } = await import("jspdf");/g' src/pages/Reports.tsx
