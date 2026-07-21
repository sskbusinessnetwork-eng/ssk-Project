import re
with open('src/services/databaseService.ts', 'r') as f:
    content = f.read()

old_catch = """    } catch (error) {
      console.error('Database create error:', error);
      return '';
    }"""

new_catch = """    } catch (error) {
      console.error('Database create error:', error);
      throw error;
    }"""

content = content.replace(old_catch, new_catch)

with open('src/services/databaseService.ts', 'w') as f:
    f.write(content)

