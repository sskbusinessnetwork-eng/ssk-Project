const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');
if (!code.includes('chunkSizeWarningLimit')) {
  code = code.replace(
    "plugins: [react(), tailwindcss()],",
    "plugins: [react(), tailwindcss()],\n    build: {\n      chunkSizeWarningLimit: 10000\n    },"
  );
  fs.writeFileSync('vite.config.ts', code);
}
