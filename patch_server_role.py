import re
with open('server.ts', 'r') as f:
    content = f.read()

old_if = """        if (hasPersonalFields) {
          return res.status(403).json({ error: "You can only edit your own profile." });
        }
      }

      const { error: updateError }"""

new_if = """        if (hasPersonalFields) {
          return res.status(403).json({ error: "You can only edit your own profile." });
        }
        
        const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (!caller || (caller.role !== 'MASTER_ADMIN' && caller.role !== 'CHAPTER_ADMIN')) {
          return res.status(403).json({ error: "Unauthorized to edit other users." });
        }
      }

      const { error: updateError }"""

content = content.replace(old_if, new_if)

with open('server.ts', 'w') as f:
    f.write(content)
