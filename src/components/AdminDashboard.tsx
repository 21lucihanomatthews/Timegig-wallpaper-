import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2 } from 'lucide-react';

export const AdminDashboard = () => {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('verificationStatus', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setPendingUsers(users);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const approveUser = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), {
      verificationStatus: 'approved'
    });
  };

  if (loading) return <div className="p-4"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="p-4 bg-slate-50 min-h-screen">
      <h2 className="text-xl font-bold mb-4">Pending Verifications</h2>
      {pendingUsers.length === 0 && <p className="text-slate-500">No pending verifications.</p>}
      {pendingUsers.map(user => (
        <div key={user.id} className="bg-white p-4 rounded-xl shadow mb-2 flex justify-between items-center">
          <div>
            <p className="font-bold">{user.name} {user.surname}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <button 
            onClick={() => approveUser(user.id)}
            className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg text-sm font-bold transition-colors"
          >
            Approve
          </button>
        </div>
      ))}
    </div>
  );
};
