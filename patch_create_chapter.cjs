const fs = require('fs');
let code = fs.readFileSync('src/components/CreateChapter.tsx', 'utf8');

code = code.replace(/export function CreateChapter\(\{ onSuccess \}\: \{ onSuccess\?\: \(\) \=\> void \}\) \{/,
`export function CreateChapter({ onSuccess, editChapterId }: { onSuccess?: () => void, editChapterId?: string }) {`);

fs.writeFileSync('src/components/CreateChapter.tsx', code);
