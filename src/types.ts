export type UserRole = 'MASTER_ADMIN' | 'CHAPTER_ADMIN' | 'MEMBER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type ReferralStatus = 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'CLOSED' | 'NOT_CONVERTED' | 'COMPLETED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'VISITOR';

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  businessName?: string;
  chapterName?: string;
  category?: string;
  state?: string;
  city?: string;
  area?: string;
  address?: string;
  role: UserRole;
  membershipStatus: UserStatus;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  createdAt: string;
  photoURL?: string;
  displayName?: string;
  website?: string;
  bio?: string;
  adminId?: string;
  associatedChapterAdminId?: string;
}

export interface Meeting {
  id: string;
  adminId?: string;
  date: string;
  time?: string;
  location?: string;
  attendance: Record<string, AttendanceStatus>;
  amountCollected?: Record<string, number>;
  memberNotes?: Record<string, string>;
  notes?: string;
  isCompleted?: boolean;
}

export interface Referral {
  id: string;
  fromUserId: string;
  fromUserName?: string;
  fromUserRole?: UserRole;
  toUserId: string;
  contactName: string;
  contactPhone: string;
  requirement: string;
  notes: string;
  status: ReferralStatus;
  notConvertedReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ThankYouSlip {
  id: string;
  referralId: string;
  fromUserId: string;
  toUserId: string;
  customerName: string;
  businessValue: number;
  notes: string;
  createdAt: string;
}

export interface GuestInvitation {
  id: string;
  memberId: string;
  createdBy: string;
  createdByRole: UserRole;
  associatedChapterAdminId?: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestBusiness: string;
  address?: string;
  state?: string;
  city?: string;
  fullAddress?: string;
  createdAt: string;
  status?: 'Invited' | 'Attended' | 'Not Attended';
  notes?: string;
  meetingDate?: string;
  isWhatsAppShared?: boolean;
  isCalled?: boolean;
}

export interface OneToOneMeeting {
  id: string;
  creatorId: string;
  participantIds: string[];
  date: string;
  time: string;
  venue?: string;
  notes?: string;
  status: 'UPCOMING' | 'COMPLETED' | 'NOT_COMPLETED';
  attendance?: Record<string, AttendanceStatus>;
  createdAt: string;
  updatedAt?: string;
}

export interface Position {
  id?: string;
  chapterAdminId: string;
  userId: string;
  userName?: string;
  position: 'President' | 'Vice President' | 'Treasurer';
}

export interface Notification {
  id: string;
  userId: string;
  role: UserRole;
  type: 'REFERRAL' | 'THANKYOU' | 'MEMBER_ADD' | 'SUBSCRIPTION' | 'UPGRADE' | 'UPGRADE_REQUEST' | 'GUEST_REGISTRATION' | 'ASSOCIATE_MEMBER_INVITE';
  message: string;
  read?: boolean;
  relatedUserId?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface GuestRegistration {
  id: string;
  fullName: string;
  phone: string;
  businessName: string;
  businessCategory: string;
  city: string;
  adminId: string;
  status: 'PENDING' | 'CONTACTED' | 'CONVERTED';
  createdAt: string;
  isWhatsAppShared?: boolean;
  isCalled?: boolean;
}
