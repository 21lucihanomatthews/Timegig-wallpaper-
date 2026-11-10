import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  TenantReferral, 
  ActiveGig, 
  LocationPoint 
} from '../types';

interface UserProfile {
  uid: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  totalProfit: number;
  tenantSubProfit: number;
  userSubProfit: number;
  referralCode: string;
}

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  userProfile: UserProfile | null;
  referrals: TenantReferral[];
  gigs: ActiveGig[];
  savedLocations: LocationPoint[];
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [referrals, setReferrals] = useState<TenantReferral[]>([]);
  const [gigs, setGigs] = useState<ActiveGig[]>([]);
  const [savedLocations, setSavedLocations] = useState<LocationPoint[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Ensure user document exists
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            name: currentUser.displayName?.split(' ')[0] || '',
            surname: currentUser.displayName?.split(' ').slice(1).join(' ') || '',
            email: currentUser.email || '',
            phone: '',
            totalProfit: 0,
            tenantSubProfit: 0,
            userSubProfit: 0,
            referralCode: `GEO-${currentUser.uid.slice(0, 6).toUpperCase()}`
          };
          try {
            await setDoc(userDocRef, newProfile);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}`);
          }
        }

        // Listen to User Profile
        const unsubProfile = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserProfile(doc.data() as UserProfile);
          }
        }, (error) => handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`));

        // Listen to Referrals
        const referralsRef = collection(db, 'users', currentUser.uid, 'referrals');
        const unsubReferrals = onSnapshot(query(referralsRef), (snapshot) => {
          const refs: TenantReferral[] = [];
          snapshot.forEach((doc) => {
            refs.push({ id: doc.id, ...doc.data() } as TenantReferral);
          });
          setReferrals(refs);
        }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/referrals`));

        // Listen to Gigs
        const gigsRef = collection(db, 'users', currentUser.uid, 'gigs');
        const unsubGigs = onSnapshot(query(gigsRef), (snapshot) => {
          const gList: ActiveGig[] = [];
          snapshot.forEach((doc) => {
            gList.push({ id: doc.id, ...doc.data() } as ActiveGig);
          });
          setGigs(gList);
        }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/gigs`));

        // Listen to Saved Locations
        const locationsRef = collection(db, 'users', currentUser.uid, 'locations');
        const unsubLocations = onSnapshot(query(locationsRef), (snapshot) => {
          const locs: LocationPoint[] = [];
          snapshot.forEach((doc) => {
            locs.push({ id: doc.id, ...doc.data() } as LocationPoint);
          });
          setSavedLocations(locs);
        }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/locations`));

        setLoading(false);

        return () => {
          unsubProfile();
          unsubReferrals();
          unsubGigs();
          unsubLocations();
        };
      } else {
        setUserProfile(null);
        setReferrals([]);
        setGigs([]);
        setSavedLocations([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, loading, userProfile, referrals, gigs, savedLocations }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
