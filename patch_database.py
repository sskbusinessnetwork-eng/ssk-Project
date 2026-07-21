import re
with open('src/lib/database.ts', 'r') as f:
    content = f.read()

update_logic_old = """  const snakeData = keysToSnake(cleanData);
  const { error } = await supabase.from(path).update(snakeData).eq('id', id);
  if (error) console.error("updateDoc error:", error);"""

update_logic_new = """  const snakeData = keysToSnake(cleanData);
  if (path === 'users') {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid: id, updates: snakeData })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("updateDoc users error:", data.error);
        throw new Error(data.error || 'Failed to update user');
      }
    } else {
      const { error } = await supabase.from(path).update(snakeData).eq('id', id);
      if (error) console.error("updateDoc error:", error);
    }
  } else {
    const { error } = await supabase.from(path).update(snakeData).eq('id', id);
    if (error) console.error("updateDoc error:", error);
  }"""

content = content.replace(update_logic_old, update_logic_new)

with open('src/lib/database.ts', 'w') as f:
    f.write(content)
