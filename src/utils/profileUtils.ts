import { UserProfile } from '../types';

export const REQUIRED_PROFILE_FIELDS = [
  { key: 'photoURL', label: 'Profile Photo' },
  { key: 'name', label: 'Full Name' },
  { key: 'whatsappNumber', label: 'WhatsApp Number' },
  { key: 'phone', label: 'Mobile Number' },
  { key: 'email', label: 'Email Address' },
  { key: 'businessName', label: 'Business Name' },
  { key: 'category', label: 'Business Category' },
  { key: 'bio', label: 'Business Description' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'Pincode' }
];

export function calculateProfileCompletion(profile: any): {
  isComplete: boolean;
  completedCount: number;
  totalRequired: number;
} {
  if (!profile) return { isComplete: false, completedCount: 0, totalRequired: REQUIRED_PROFILE_FIELDS.length };

  let completedCount = 0;
  for (const field of REQUIRED_PROFILE_FIELDS) {
    const val = profile[field.key];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      completedCount++;
    }
  }

  return {
    isComplete: completedCount === REQUIRED_PROFILE_FIELDS.length,
    completedCount,
    totalRequired: REQUIRED_PROFILE_FIELDS.length
  };
}
