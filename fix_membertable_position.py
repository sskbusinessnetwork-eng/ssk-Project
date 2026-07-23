import re

with open("src/components/members/MemberTable.tsx", "r") as f:
    content = f.read()

# Fix 1: Desktop Position
old_desktop_pos = """                            <div>
                              <span className="text-neutral-500 font-semibold text-[9px] uppercase tracking-wider mr-1">Position:</span> 
                              <span className="text-primary font-bold">
                                {getDisplayPosition(member.position, member.role)}
                              </span>
                            </div>"""

new_desktop_pos = """                            {isMasterAdmin && (
                              <div>
                                <span className="text-neutral-500 font-semibold text-[9px] uppercase tracking-wider mr-1">Position:</span> 
                                <span className="text-primary font-bold">
                                  {getDisplayPosition(member.position, member.role)}
                                </span>
                              </div>
                            )}"""
content = content.replace(old_desktop_pos, new_desktop_pos)

# Fix 2: Desktop Chapter Admin
old_desktop_admin = """                        <span className="text-xs font-semibold text-neutral-300 truncate max-w-[150px]">
                          {member.chapter_id ? (adminMap[member.chapter_id] || 'Unknown Admin') : (member.adminId ? (adminMap[member.adminId] || 'Unknown Admin') : 'Not Assigned')}
                        </span>"""

new_desktop_admin = """                        <span className="text-xs font-semibold text-neutral-300 truncate max-w-[150px]">
                          {(member.created_by || member.adminId) ? (adminMap[member.created_by || member.adminId || ''] || member.createdByName || 'Master Admin') : 'Master Admin'}
                        </span>"""
content = content.replace(old_desktop_admin, new_desktop_admin)

# Fix 3: Mobile Position
old_mobile_pos = """                      <div>
                        <span className="text-neutral-500 font-semibold text-[9px] uppercase tracking-wider mr-1">Position:</span> 
                        <span className="text-primary font-bold">
                          {getDisplayPosition(member.position, member.role)}
                        </span>
                      </div>"""

new_mobile_pos = """                      {isMasterAdmin && (
                        <div>
                          <span className="text-neutral-500 font-semibold text-[9px] uppercase tracking-wider mr-1">Position:</span> 
                          <span className="text-primary font-bold">
                            {getDisplayPosition(member.position, member.role)}
                          </span>
                        </div>
                      )}"""
content = content.replace(old_mobile_pos, new_mobile_pos)

# Fix 4: Mobile Chapter Admin
old_mobile_admin = """                  <p className="text-xs font-bold text-neutral-200 truncate max-w-[140px]">
                    {member.chapter_id ? (adminMap[member.chapter_id] || 'Unknown Admin') : (member.adminId ? (adminMap[member.adminId] || 'Unknown Admin') : 'Not Assigned')}
                  </p>"""

new_mobile_admin = """                  <p className="text-xs font-bold text-neutral-200 truncate max-w-[140px]">
                    {(member.created_by || member.adminId) ? (adminMap[member.created_by || member.adminId || ''] || member.createdByName || 'Master Admin') : 'Master Admin'}
                  </p>"""
content = content.replace(old_mobile_admin, new_mobile_admin)


with open("src/components/members/MemberTable.tsx", "w") as f:
    f.write(content)
