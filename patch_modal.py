import re

def remove_master_admin_filters(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # The master admin chapter/member filter starts with "{profile?.role === 'MASTER_ADMIN' && ("
    # and ends right before '<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">' for dates.
    
    # regex match from {profile?.role === 'MASTER_ADMIN' && ( ... )} up to <div className="grid ... Start Date
    pattern = r"\{profile\?.role === 'MASTER_ADMIN' && \([\s\S]*?\}\)\}\s*(<div className=\"grid grid-cols-1 sm:grid-cols-2 gap-4\">\s*<div className=\"flex flex-col gap-1\.5\">\s*<label[^>]*>\s*Start Date)"
    
    content = re.sub(pattern, r"\1", content)
    
    with open(filename, 'w') as f:
        f.write(content)

remove_master_admin_filters('src/pages/Dashboard.tsx')

# For MyReport.tsx, it might not use profile?.role, maybe just hardcoded or similar.
# Let's check MyReport.tsx for <select>
with open('src/pages/MyReport.tsx', 'r') as f:
    content = f.read()
    
# Wait, MyReport.tsx filter is shown in earlier grep:
#         <div className="space-y-6">
#           <p className="text-sm text-neutral-400">
#             Select a date range to filter the entire My Chapter Report, including Growth Score and Analytics.
#           </p>
#           <div className="space-y-4">
#             <div className="grid grid-cols-2 gap-4">
#               <div>
#                 <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
#                   Start Date
# It doesn't seem to have Chapter/Member selects. Let's make sure.

