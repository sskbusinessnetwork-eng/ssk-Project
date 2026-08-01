import { UserProfile } from '../types';

export const REQUIRED_PROFILE_FIELDS = [
  { key: 'photoURL', label: 'Profile Photo' },
  { key: 'name', label: 'Full Name' },
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
    let val: any = null;
    switch (field.key) {
      case 'photoURL':
        val = profile.photoURL || profile.photo_url || profile.profile_photo || profile.avatar_url;
        break;
      case 'name':
        val = profile.name || profile.full_name;
        break;
      case 'phone':
        val = profile.phone || profile.mobile || profile.phone_number;
        break;
      case 'email':
        val = profile.email;
        break;
      case 'businessName':
        val = profile.businessName || profile.business_name;
        break;
      case 'category':
        val = profile.category || profile.business_category;
        break;
      case 'bio':
        val = profile.bio || profile.description || profile.business_description;
        break;
      case 'address':
        val = profile.address;
        break;
      case 'city':
        val = profile.city;
        break;
      case 'state':
        val = profile.state;
        break;
      case 'pincode':
        val = profile.pincode || profile.pin_code || profile.zip;
        break;
      default:
        val = profile[field.key];
    }

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
