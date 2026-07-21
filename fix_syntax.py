import re

with open('src/pages/ManageSubscriptions.tsx', 'r') as f:
    content = f.read()

content = content.replace("""    // Listen to changes
        
    // Listen to changes
    let constraints = [];
    if (profile.role !== 'MASTER_ADMIN') {
      constraints = [{ type: 'where', field: 'chapter_id', operator: '==', value: profile.chapter_id }];
    }
];
    }""", """    // Listen to changes
    let constraints = [];
    if (profile.role !== 'MASTER_ADMIN') {
      constraints = [{ type: 'where', field: 'chapter_id', operator: '==', value: profile.chapter_id }];
    }""")

with open('src/pages/ManageSubscriptions.tsx', 'w') as f:
    f.write(content)
