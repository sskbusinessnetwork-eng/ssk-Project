import React, { useState, useEffect } from 'react';
import {  collection, query, onSnapshot, getDocs, doc, getDoc  } from '../lib/database';
import { db } from '../lib/database';
import { Testimonial, UserProfile } from '../types';
import { format as originalFormat, isValid } from 'date-fns';
import { Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const format = (date: any, formatStr: string, options?: any) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return isValid(d) ? originalFormat(d, formatStr, options) : 'N/A';
};

export function TestimonialReports() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Record<string, UserProfile>>({});
  const { profile } = useAuth();

  useEffect(() => {
    // Fetch members for lookup
    const fetchMembers = async () => {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const membersMap: Record<string, UserProfile> = {};
      snapshot.forEach(doc => {
        membersMap[doc.id] = doc.data() as UserProfile;
      });
      setMembers(membersMap);
    };

    fetchMembers();

    const q = query(collection(db, 'testimonials'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ts = (snapshot?.docs || []).map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Testimonial));
      setTestimonials(ts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[24px] shadow-sm border border-neutral-200">
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Testimonials Report</h2>
        <p className="text-sm text-neutral-500 mb-6">Read-only view of all testimonials across chapters.</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Testimonial ID</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Given By</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Received By</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Chapter</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Rating</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Testimonial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {testimonials.map(t => {
                const author = members[t.authorMemberId]?.name || 'Unknown';
                const receiver = members[t.receiverMemberId]?.name || 'Unknown';
                const chapter = members[t.receiverMemberId]?.chapterName || 'N/A';
                
                return (
                  <tr key={t.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4 text-xs font-mono text-neutral-500 truncate max-w-[100px]">{t.id}</td>
                    <td className="p-4 text-sm text-neutral-900 whitespace-nowrap">
                      {format(new Date(t.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td className="p-4 text-sm font-medium text-neutral-900">{author}</td>
                    <td className="p-4 text-sm font-medium text-neutral-900">{receiver}</td>
                    <td className="p-4 text-sm text-neutral-600">{chapter}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star size={14} className="fill-current" />
                        <span className="text-sm font-bold text-neutral-900 ml-1">{t.rating}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                        t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        t.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {t.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-neutral-600 max-w-xs truncate" title={t.testimonial}>
                      {t.testimonial}
                    </td>
                  </tr>
                );
              })}
              {testimonials.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-500">
                    No testimonials found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
