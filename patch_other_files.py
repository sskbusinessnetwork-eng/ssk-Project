import re

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Dashboard.tsx & MyReport.tsx logic
    content = content.replace("m.creatorId", "(m.organizer_id || m.creatorId)")
    content = content.replace("m.participantIds?.includes", "([m.member_id, ...(m.participantIds || [])]).includes")

    # For where('creatorId' -> where('organizer_id'
    content = content.replace("where('creatorId'", "where('organizer_id'")
    content = content.replace("where('participantIds'", "where('member_id'")
    # Note: where('member_id', 'array-contains') will fail if it's a string, so let's change 'array-contains' to '=='
    content = content.replace("where('member_id', 'array-contains'", "where('member_id', '=='")

    with open(filepath, 'w') as f:
        f.write(content)

patch_file('src/pages/Dashboard.tsx')
patch_file('src/pages/Reports.tsx')
patch_file('src/pages/MyReport.tsx')
