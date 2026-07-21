with open('src/types.ts', 'r') as f:
    content = f.read()

if 'SubscriptionRequest' not in content:
    content += """
export interface SubscriptionRequest {
  id: string;
  member_id: string;
  chapter_id: string;
  chapter_admin_id?: string;
  request_date: string;
  current_subscription_end_date?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  processed_date?: string;
  processed_by?: string;
}
"""
    with open('src/types.ts', 'w') as f:
        f.write(content)
