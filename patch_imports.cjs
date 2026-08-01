const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import { motion } from 'motion/react';",
  "import { motion, AnimatePresence } from 'motion/react';"
);

fs.writeFileSync(file, code);
