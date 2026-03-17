export type UserRole = 'admin' | 'chapter_admin' | 'member' | 'guest';
export type UserStatus = 'active' | 'suspended' | 'pending';
export type ChapterStatus = 'active' | 'pending' | 'suspended';
export type ReferralStatus = 'pending' | 'contacted' | 'converted' | 'closed';
export type AttendanceStatus = 'present' | 'absent' | 'visitor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  chapterId?: string;
  businessName?: string;
  category?: string;
  phone?: string;
  website?: string;
  bio?: string;
  status: UserStatus;
  subscriptionExpiry?: string;
  createdAt: string;
}

export interface Chapter {
  id: string;
  name: string;
  location: string;
  meetingDay: string;
  meetingTime: string;
  meetingVenue: string;
  adminIds: string[];
  status: ChapterStatus;
  createdAt: string;
}

export interface Meeting {
  id: string;
  chapterId: string;
  date: string;
  attendance: Record<string, AttendanceStatus>;
}

export interface Referral {
  id: string;
  fromUserId: string;
  toUserId: string;
  chapterId: string;
  contactName: string;
  contactPhone: string;
  requirement: string;
  notes: string;
  status: ReferralStatus;
  createdAt: string;
}

export interface ThankYouSlip {
  id: string;
  referralId: string;
  fromUserId: string;
  toUserId: string;
  chapterId: string;
  customerName: string;
  businessValue: number;
  notes: string;
  createdAt: string;
}

export interface GuestInvitation {
  id: string;
  memberId: string;
  chapterId: string;
  guestName: string;
  guestPhone: string;
  guestBusiness: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}
