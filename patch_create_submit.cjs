const fs = require('fs');
let code = fs.readFileSync('src/components/CreateChapter.tsx', 'utf8');

// Replace chapterId generation with editChapterId logic
code = code.replace(/const chapterId \= generateId\(\);/,
`const chapterId = editChapterId || generateId();`);

// Only check existing if not editing
code = code.replace(/\/\/ 0\. Check for existing chapter name\s+const \{ data\: existingChapter/g,
`// 0. Check for existing chapter name
      let existingChapter = [];
      if (!editChapterId) {
        const { data } = await supabase`);
        
code = code.replace(/\.limit\(1\);\s+if \(chapterCheckError\) \{[\s\S]*?throw new Error\("A chapter with this name already exists\. Please choose a different chapter name\."\);\s+\}/g,
`.limit(1);
        existingChapter = data || [];
      }
      
      if (existingChapter && existingChapter.length > 0) {
        newErrors.chapter_name = "A chapter with this name already exists. Please choose a different chapter name.";
        setErrors(newErrors);
        throw new Error("A chapter with this name already exists. Please choose a different chapter name.");
      }`);

fs.writeFileSync('src/components/CreateChapter.tsx', code);
