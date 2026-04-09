import { firestoreService } from './firestoreService';
import { UserRole } from '../types';
import { where } from 'firebase/firestore';

export type NotificationType = 'REFERRAL' | 'THANKYOU' | 'MEMBER_ADD' | 'SUBSCRIPTION' | 'UPGRADE' | 'UPGRADE_REQUEST';

export const notificationService = {
  async createNotification(userId: string, role: UserRole, type: NotificationType, message: string, relatedUserId?: string) {
    return firestoreService.create('notifications', {
      userId,
      role,
      type,
      message,
      read: false,
      relatedUserId: relatedUserId || null,
      createdAt: new Date().toISOString()
    });
  },

  async notifyMasterAdmins(type: NotificationType, message: string, relatedUserId?: string) {
    const masterAdmins = await firestoreService.list<any>('users', [
      where('role', '==', 'MASTER_ADMIN')
    ]);
    
    const promises = masterAdmins.map(admin => 
      this.createNotification(admin.uid, 'MASTER_ADMIN', type, message, relatedUserId)
    );
    return Promise.all(promises);
  }
};
