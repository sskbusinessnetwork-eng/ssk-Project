import { firestoreService } from '../services/firestoreService';
import { UserProfile, Category } from '../types';

export const seedDemoData = async () => {
  try {
    // 1. Seed Categories
    const categories = [
      'Real Estate',
      'IT Services',
      'Legal Services',
      'Marketing & Advertising',
      'Financial Services',
      'Healthcare',
      'Construction',
      'Education',
      'Interior Design',
      'Event Management',
      'Automobile',
      'Hospitality',
      'E-commerce',
      'Manufacturing',
      'Consulting',
      'Logistics',
      'Printing',
      'Yoga & Wellness',
      'Hardware',
      'Fashion Design'
    ];

    const existingCategories = await firestoreService.list<Category>('categories');
    for (const catName of categories) {
      if (!existingCategories.find(c => c.name === catName)) {
        await firestoreService.create('categories', { name: catName });
      }
    }

    // 2. Seed Members
    const demoMembers = [
      { uid: 'demo-member-1', name: 'Arjun Mehta', phone: '9000000001', businessName: 'Mehta Real Estate', category: 'Real Estate', city: 'Bangalore', area: 'Indiranagar' },
      { uid: 'demo-member-2', name: 'Priya Sharma', phone: '9000000002', businessName: 'Sharma Tech Solutions', category: 'IT Services', city: 'Bangalore', area: 'Whitefield' },
      { uid: 'demo-member-3', name: 'Rohan Gupta', phone: '9000000003', businessName: 'Gupta Legal Associates', category: 'Legal Services', city: 'Mumbai', area: 'Bandra' },
      { uid: 'demo-member-4', name: 'Ananya Iyer', phone: '9000000004', businessName: 'Iyer Marketing Group', category: 'Marketing & Advertising', city: 'Mumbai', area: 'Andheri' },
      { uid: 'demo-member-5', name: 'Vikram Singh', phone: '9000000005', businessName: 'Singh Financials', category: 'Financial Services', city: 'Bangalore', area: 'Koramangala' },
      { uid: 'demo-member-6', name: 'Sanya Malhotra', phone: '9000000006', businessName: 'Malhotra Wellness', category: 'Healthcare', city: 'Mumbai', area: 'Colaba' },
      { uid: 'demo-member-7', name: 'Rahul Deshmukh', phone: '9000000007', businessName: 'Deshmukh Construction', category: 'Construction', city: 'Mumbai', area: 'Thane' },
      { uid: 'demo-member-8', name: 'Kavita Reddy', phone: '9000000008', businessName: 'Reddy Academy', category: 'Education', city: 'Bangalore', area: 'Jayanagar' },
      { uid: 'demo-member-9', name: 'Siddharth Varma', phone: '9000000009', businessName: 'Varma Interiors', category: 'Interior Design', city: 'Delhi', area: 'Saket' },
      { uid: 'demo-member-10', name: 'Meera Kapoor', phone: '9000000010', businessName: 'Kapoor Events', category: 'Event Management', city: 'Delhi', area: 'GK-1' },
      { uid: 'demo-member-11', name: 'Aditya Kulkarni', phone: '9000000011', businessName: 'Kulkarni Motors', category: 'Automobile', city: 'Mumbai', area: 'Borivali' },
      { uid: 'demo-member-12', name: 'Ishani Bose', phone: '9000000012', businessName: 'Bose Hospitality', category: 'Hospitality', city: 'Kolkata', area: 'Salt Lake' },
      { uid: 'demo-member-13', name: 'Zaid Khan', phone: '9000000013', businessName: 'Khan E-com', category: 'E-commerce', city: 'Delhi', area: 'Rohini' },
      { uid: 'demo-member-14', name: 'Tanvi Joshi', phone: '9000000014', businessName: 'Joshi Manufacturing', category: 'Manufacturing', city: 'Pune', area: 'Hinjewadi' },
      { uid: 'demo-member-15', name: 'Rishi Oberoi', phone: '9000000015', businessName: 'Oberoi Consulting', category: 'Consulting', city: 'Bangalore', area: 'HSR Layout' },
      { uid: 'demo-member-16', name: 'Nisha Verma', phone: '9000000016', businessName: 'Verma Logistics', category: 'Logistics', city: 'Mumbai', area: 'Navi Mumbai' },
      { uid: 'demo-member-17', name: 'Kabir Das', phone: '9000000017', businessName: 'Das Printing', category: 'Printing', city: 'Delhi', area: 'Okhla' },
      { uid: 'demo-member-18', name: 'Pooja Hegde', phone: '9000000018', businessName: 'Hegde Wellness', category: 'Yoga & Wellness', city: 'Bangalore', area: 'Whitefield' },
      { uid: 'demo-member-19', name: 'Aryan Goel', phone: '9000000019', businessName: 'Goel Hardware', category: 'Hardware', city: 'Mumbai', area: 'Malad' },
      { uid: 'demo-member-20', name: 'Simran Kaur', phone: '9000000020', businessName: 'Kaur Fashion', category: 'Fashion Design', city: 'Delhi', area: 'Lajpat Nagar' },
    ];

    for (let i = 0; i < demoMembers.length; i++) {
      const member = demoMembers[i];
      
      const profile: UserProfile = {
        ...member,
        role: 'MEMBER',
        membershipStatus: 'ACTIVE',
        adminId: 'master-admin-uid',
        createdAt: new Date().toISOString(),
        subscriptionStart: new Date().toISOString(),
        subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        photoURL: `https://i.pravatar.cc/150?u=${member.uid}`
      };

      await firestoreService.create('users', profile, member.uid);
    }

    console.log('Demo data seeded successfully');
    return true;
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return false;
  }
};
