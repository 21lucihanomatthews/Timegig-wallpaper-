import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Registers a newly created user account as a referral under the tenant's collection
 * if they joined via a tenant referral link (or entered a referral code).
 */
export async function registerReferralToTenant(
  newUserId: string,
  email: string,
  providedRefCode?: string,
  name?: string,
  surname?: string,
  phone?: string
) {
  const code = (providedRefCode || localStorage.getItem('timegig_tenant_ref') || '').trim().toUpperCase();
  if (!code) return;

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', code));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const tenantDoc = snap.docs[0];
      const tenantUid = tenantDoc.id;

      // Prevent a tenant from referring themselves
      if (tenantUid === newUserId) return;

      const refDocRef = doc(db, 'users', tenantUid, 'referrals', newUserId);
      const existingRef = await getDoc(refDocRef);

      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const fullName = name && name.trim() ? `${name} ${surname || ''}`.trim() : email.split('@')[0] || 'Tenant Applicant';

      if (!existingRef.exists()) {
        await setDoc(refDocRef, {
          id: newUserId,
          name: fullName,
          email: email,
          phone: phone || '',
          unit: `Unit ${Math.floor(100 + Math.random() * 800)}`,
          joinedDate: dateStr,
          referralCode: code,
          status: 'pending',
          selfieUrl: `https://images.unsplash.com/photo-${1534528741775 + (Math.floor(Math.random() * 1000))}?w=150&auto=format&fit=crop&q=80`,
          documents: [
            {
              id: `doc-lease-${Date.now()}`,
              name: 'Tenant_Lease_Agreement.pdf',
              type: 'lease',
              size: '2.1 MB',
              date: dateStr,
              content: `TENANT LEASE AGREEMENT & APPLICATION\n\nApplicant Name: ${fullName}\nEmail Address: ${email}\nTenant Referral Link Code: ${code}\nJoined Date: ${dateStr}\nStatus: PENDING TENANT VERIFICATION & APPROVAL`
            },
            {
              id: `doc-id-${Date.now()}`,
              name: 'Government_Identity_Doc.pdf',
              type: 'id',
              size: '1.3 MB',
              date: dateStr,
              content: `GOVERNMENT IDENTITY VERIFICATION RECORD\n\nFull Name: ${fullName}\nEmail: ${email}\nStatus: Certified Identity Document Attached.`
            }
          ]
        });
        console.log(`Referral ${newUserId} successfully linked to tenant ${tenantUid}`);
      } else {
        // If referral record exists, update profile info if changed
        const data = existingRef.data();
        if (fullName && data.name !== fullName) {
          await setDoc(refDocRef, { name: fullName, phone: phone || data.phone || '' }, { merge: true });
        }
      }
    }
  } catch (err) {
    console.error('Error linking referral to tenant:', err);
  }
}
