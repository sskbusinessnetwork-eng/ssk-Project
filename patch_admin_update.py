import re
with open('server.ts', 'r') as f:
    content = f.read()

old_block = """      if (displayName) {
        updates.name = displayName;
      }"""

new_block = """      // Profile permissions: Admins cannot change another user's personal info
      // if (displayName) {
      //   updates.name = displayName;
      // }"""

content = content.replace(old_block, new_block)

with open('server.ts', 'w') as f:
    f.write(content)
