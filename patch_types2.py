import re
with open('src/types.ts', 'r') as f:
    content = f.read()

old_1to1 = """export interface OneToOneMeeting {
  id: string;
  title: string;
  organizer_id: string;
  member_id: string;
  chapter_id: string;
  scheduled_date: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  created_at?: string;
  updated_at?: string;
  // Legacy / optional fields for compatibility if needed
  type?: string;
  date?: string;
  time?: string;
  duration?: number;
  description?: string;
  notes?: string;
}"""

new_1to1 = """export interface OneToOneMeeting {
  id: string;
  title: string;
  organizer_id: string;
  member_id: string;
  chapter_id: string;
  scheduled_date: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'UPCOMING' | 'NOT_COMPLETED';
  created_at?: string;
  updated_at?: string;
  // Legacy / optional fields for compatibility if needed
  creatorId?: string;
  participantIds?: string[];
  type?: string;
  date?: string;
  time?: string;
  duration?: number;
  description?: string;
  notes?: string;
  attendance?: Record<string, 'PRESENT' | 'ABSENT'>;
}"""

content = content.replace(old_1to1, new_1to1)
with open('src/types.ts', 'w') as f:
    f.write(content)
