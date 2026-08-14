const fs = require('fs');
const path = require('path');

const serverFile = fs.readFileSync('server.ts', 'utf-8');

// I will extract the remaining endpoints. 
// Or I can just write them.
