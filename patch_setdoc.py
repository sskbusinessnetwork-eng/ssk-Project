import re
with open('src/lib/database.ts', 'r') as f:
    content = f.read()

old_setdoc_err = """  const { error } = await supabase.from(path).upsert({ id, ...snakeData }, { onConflict: 'id' });
  if (error) console.error("setDoc error:", error);"""

new_setdoc_err = """  const { error } = await supabase.from(path).upsert({ id, ...snakeData }, { onConflict: 'id' });
  if (error) {
    console.error("setDoc error:", error);
    throw new Error(error.message || 'Database upsert failed');
  }"""

content = content.replace(old_setdoc_err, new_setdoc_err)

old_setdoc_err2 = """    const { error } = await supabase.from('users').upsert({ id, ...preparedSnake }, { onConflict: 'id' });
    if (error) console.error("setDoc error:", error);"""

new_setdoc_err2 = """    const { error } = await supabase.from('users').upsert({ id, ...preparedSnake }, { onConflict: 'id' });
    if (error) {
      console.error("setDoc error:", error);
      throw new Error(error.message || 'Database upsert failed');
    }"""
    
content = content.replace(old_setdoc_err2, new_setdoc_err2)

with open('src/lib/database.ts', 'w') as f:
    f.write(content)

