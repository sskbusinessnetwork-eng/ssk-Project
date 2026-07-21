import re
with open('src/services/databaseService.ts', 'r') as f:
    content = f.read()

content = content.replace(
"""    } catch (error) {
      console.error('Database update error:', error);
    }""",
"""    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }"""
)

with open('src/services/databaseService.ts', 'w') as f:
    f.write(content)
