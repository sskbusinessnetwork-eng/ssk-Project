sed -i 's/const tempDate = new Date(parsedEnd);/const tempDate = (parsedEnd \&\& !isNaN(new Date(parsedEnd).getTime())) ? new Date(parsedEnd) : new Date();/g' src/pages/Reports.tsx
