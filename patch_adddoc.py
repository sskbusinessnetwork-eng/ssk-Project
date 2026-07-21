import re
with open('src/lib/database.ts', 'r') as f:
    content = f.read()

# Replace the swallow pattern in addDoc
old_swallow = """  if (error) {
    console.error("addDoc error:", error);
    return { id: Math.random().toString(36).substring(2, 15) };
  }"""

new_throw = """  if (error) {
    console.error("addDoc error:", error);
    throw new Error(error.message || 'Database insert failed');
  }"""

content = content.replace(old_swallow, new_throw)

with open('src/lib/database.ts', 'w') as f:
    f.write(content)

