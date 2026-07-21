export type UserRole = 'MASTER_ADMIN' | 'CHAPTER_ADMIN' | 'MEMBER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type ReferralStatus = 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'CLOSED' | 'NOT_CONVERTED' | 'COMPLETED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'VISITOR' | 'Yes' | 'No' | 'Substitute' | 'YES' | 'NO' | 'SUBSTITUTE';

export type ChapterPosition = 'member' | 'chapter_admin' | 'president' | 'vice_president' | 'treasurer';

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
  pincode?: string;
  role: UserRole;
  position?: ChapterPosition;
  membershipStatus: UserStatus;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionStatus?: string;
  subscriptionType?: string;
  renewalRequested?: boolean;
  renewedBy?: string;
  renewedAt?: string;
  createdAt: string;
  photoURL?: string;
  displayName?: string;
  website?: string;
  bio?: string;
  adminId?: string;
  chapter_id?: string;
  must_change_password?: boolean;
  memberId?: string;
  whatsappNumber?: string;
  status?: string;
}

export interface Chapter {
  id: string;
  chapter_name: string;
  meeting_venue: string;
  chapter_admin_id: string;
  president_id: string;
  vice_president_id: string;
  treasurer_id: string;
  created_at: string;
  updated_at?: string;
}

export interface Meeting {
  id: string;
  adminId?: string;
  chapter_id?: string;
  date: string;
  time?: string;
  location?: string;
  attendance: Record<string, AttendanceStatus>;
  amountCollected?: Record<string, number>;
  memberNotes?: Record<string, string>;
  notes?: string;
  isCompleted?: boolean;
  isRecurring?: boolean;
  isCancelled?: boolean;
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
  chapter_id?: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestBusiness: string;
  address?: string;
  pincode?: string;
  state?: string;
  city?: string;
  fullAddress?: string;
  createdAt: string;
  status?: 'Invited' | 'Attended' | 'Not Attended';
  notes?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingVenue?: string;
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
  type: 'REFERRAL' | 'THANKYOU' | 'MEMBER_ADD' | 'SUBSCRIPTION' | 'UPGRADE' | 'UPGRADE_REQUEST' | 'GUEST_REGISTRATION' | 'ASSOCIATE_MEMBER_INVITE' | 'TESTIMONIAL';
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
  meetingDate?: string;
  meetingTime?: string;
  meetingVenue?: string;
  status: 'PENDING' | 'CONTACTED' | 'CONVERTED';
  createdAt: string;
  isWhatsAppShared?: boolean;
  isCalled?: boolean;
}

export interface Testimonial {
  id: string;
  receiverMemberId: string;
  authorMemberId: string;
  chapterId: string;
  rating: number; // 1-5
  title?: string;
  testimonial: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface PositionHistory {
  id: string;
  date: string;
  changedById: string;
  changedByName: string;
  memberId: string;
  memberName: string;
  oldPosition: ChapterPosition;
  newPosition: ChapterPosition;
  chapterAdminId: string;
}

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
