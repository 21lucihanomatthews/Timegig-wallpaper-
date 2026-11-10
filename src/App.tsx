import React, { useState, useEffect, useRef } from 'react';
import { LocationPoint, ActiveGig, ServiceHiringSeeker } from './types';
import { MapComponent } from './components/MapComponent';
import { BottomMenuBar } from './components/BottomMenuBar';
import { FeatureModal } from './components/FeatureModal';
import { LocationSidebar } from './components/LocationSidebar';
import { SavedLocationsModal } from './components/SavedLocationsModal';
import { PRESET_CITIES } from './data/presetCities';
import { INITIAL_HIRING_SEEKERS } from './data/seekersAndReferrals';
import { fetchRoadRoute } from './utils/navigationRoute';
import { useFirebase } from './contexts/FirebaseContext';
import { 
  signInWithGoogle, 
  logout, 
  db, 
  handleFirestoreError, 
  OperationType,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  auth
} from './firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import {
  Search,
  X,
  MapPin,
  Loader2,
  Navigation,
  Star,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  ChevronUp,
  LogIn,
  LogOut,
  Map as MapIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Zap,
  Check,
  ArrowRight,
  PartyPopper,
  CreditCard,
  Crown,
  Trophy,
  FileText,
  Link2,
} from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { 
  registerReferralToTenant, 
  updateReferralSubscriptionStatus, 
  updateReferralVerificationInTenant 
} from './utils/referral';

export default function App() {
  const { user, loading, userProfile, referrals, gigs, savedLocations } = useFirebase();
  const [isCapturingSelfie, setIsCapturingSelfie] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(true);
  const [selfieStream, setSelfieStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [center, setCenter] = useState<[number, number]>([-33.9249, 18.4241]); // Default hub Cape Town
  const [zoom, setZoom] = useState<number>(13);
  const [userLocation, setUserLocation] = useState<LocationPoint | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationPoint | null>(null);

  // Splash screen state
  const [showSplash, setShowSplash] = useState(true);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Tenant Referral Code State
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [detectedTenantRef, setDetectedTenantRef] = useState<string | null>(null);

  useEffect(() => {
    // Parse referral code from URL search params or path
    const urlParams = new URLSearchParams(window.location.search);
    let ref = urlParams.get('ref') || urlParams.get('referral') || urlParams.get('refCode');
    if (!ref) {
      const match = window.location.href.match(/[?&]ref=([A-Za-z0-9_-]+)/i);
      if (match) ref = match[1];
    }
    if (ref) {
      const cleanRef = ref.trim().toUpperCase();
      localStorage.setItem('timegig_tenant_ref', cleanRef);
      setReferralCodeInput(cleanRef);
      setDetectedTenantRef(cleanRef);
    } else {
      const savedRef = localStorage.getItem('timegig_tenant_ref');
      if (savedRef) {
        setReferralCodeInput(savedRef);
        setDetectedTenantRef(savedRef);
      }
    }
  }, []);

  // Onboarding & Subscription states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  // Navigation tab state ('seekers' initially active as requested)
  const [activeTab, setActiveTab] = useState('seekers');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationPoint[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isTypeBarOpen, setIsTypeBarOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seekers State (Live ratings and reviews updated upon gig completion)
  const [seekersList, setSeekersList] = useState<ServiceHiringSeeker[]>(INITIAL_HIRING_SEEKERS);

  // Active GiG State (Derived from Firestore)
  const activeGig = gigs.find(g => g.status === 'in_progress' || g.status === 'waiting_acceptance') || null;
  const [isGigBarMinimized, setIsGigBarMinimized] = useState(false);

  // GiG Cancellation Modal State
  const [isCancellingGig, setIsCancellingGig] = useState(false);
  const [cancelRole, setCancelRole] = useState<'user' | 'seeker'>('user');
  const [cancelReason, setCancelReason] = useState('Emergency schedule conflict');
  const [cancelDetailText, setCancelDetailText] = useState('');
  const [gigNotice, setGigNotice] = useState<string | null>(null);

  // GiG Completion & Star Rating Modal State (User Only)
  const [isCompletingGig, setIsCompletingGig] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingHover, setRatingHover] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

  const handleToggleSave = async (loc: LocationPoint) => {
    if (!user) return;
    const isSaved = savedLocations.some((s) => s.id === loc.id);
    const locDocRef = doc(db, 'users', user.uid, 'locations', loc.id);
    try {
      if (isSaved) {
        await deleteDoc(locDocRef);
      } else {
        await setDoc(locDocRef, { ...loc, savedAt: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, isSaved ? OperationType.DELETE : OperationType.WRITE, `users/${user.uid}/locations/${loc.id}`);
    }
  };

  // Splash timer (Absolute 5 seconds from mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Handle onboarding and subscription flow
  useEffect(() => {
    if (userProfile && !loading && !showSplash) {
      // 1. Subscription check first (Mandatory to use the app)
      if (!userProfile.subscriptionTier || userProfile.subscriptionTier === 'none') {
        setShowSubscription(true);
        setShowOnboarding(false);
      } 
      // 2. Onboarding check next
      else if (!userProfile.hasCompletedOnboarding) {
        setShowSubscription(false);
        setShowOnboarding(true);
      } 
      // 3. Normal returning user flow
      else {
        setShowSubscription(false);
        setShowOnboarding(false);
        if (!gigNotice) {
          setGigNotice(`Welcome back, ${userProfile.name}! Resuming your GiGs dashboard.`);
          setActiveTab('gigs');
          setTimeout(() => setGigNotice(null), 4000);
        }
      }
    }
  }, [userProfile, loading, showSplash]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        if (!searchQuery.trim()) {
          setIsTypeBarOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  // Debounced Nominatim search
  useEffect(() => {
    if (!searchQuery.trim() || activeTab !== 'gigs') {
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=6`, {
        headers: { 'Accept-Language': 'en' },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const mapped: LocationPoint[] = data.map((item: any, idx: number) => ({
              id: `search-${item.place_id || idx}`,
              name: item.display_name.split(',')[0],
              country: item.display_name.split(',').slice(-1)[0]?.trim() || '',
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              description: item.display_name,
              category: 'landmark',
            }));
            setSearchResults(mapped);
            setShowDropdown(true);
          } else {
            setSearchResults([]);
          }
        })
        .catch(() => {
          setSearchResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Attempt automatic geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const userPoint: LocationPoint = {
            id: 'user-current',
            name: 'Your Current Location',
            country: 'Detected via GPS',
            lat,
            lng,
            description: 'Your live browser GPS coordinates.',
            category: 'user',
          };
          setUserLocation(userPoint);
          setCenter([lat, lng]);
          setZoom(13);
        },
        () => {},
        { timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  // Handle Recenter back to user location or default
  const handleRecenter = () => {
    if (userLocation) {
      setCenter([userLocation.lat, userLocation.lng]);
      setZoom(14);
    } else {
      setCenter([-33.9249, 18.4241]);
      setZoom(13);
    }
  };

  // Handle selecting location
  const handleSelectLocation = (loc: LocationPoint) => {
    setCenter([loc.lat, loc.lng]);
    setZoom(13);
    setSelectedLocation(loc);
    setShowDropdown(false);
    setSearchQuery('');
    setIsTypeBarOpen(false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery('');
    setIsTypeBarOpen(false);
    setShowDropdown(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      if (authMode === 'signup') {
        if (!acceptTerms) {
          throw new Error('You must accept the terms and conditions.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const refToUse = referralCodeInput.trim() || detectedTenantRef || '';
        if (refToUse && userCred.user) {
          localStorage.setItem('timegig_tenant_ref', refToUse.toUpperCase());
          await registerReferralToTenant(
            userCred.user.uid,
            email,
            refToUse,
            userProfile?.name,
            userProfile?.surname,
            userProfile?.phone
          );
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
      if (err.code === 'auth/wrong-password') msg = 'Incorrect password.';
      if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
      setAuthError(msg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const refToUse = referralCodeInput.trim() || detectedTenantRef || localStorage.getItem('timegig_tenant_ref') || '';
      if (refToUse) {
        localStorage.setItem('timegig_tenant_ref', refToUse.toUpperCase());
      }
      const res = await signInWithGoogle();
      if (res?.user && refToUse) {
        await registerReferralToTenant(
          res.user.uid,
          res.user.email || '',
          refToUse,
          res.user.displayName?.split(' ')[0],
          res.user.displayName?.split(' ').slice(1).join(' '),
          '',
          'none'
        );
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        hasCompletedOnboarding: true,
      });
      // Register referral link if code is present
      const refToUse = referralCodeInput.trim() || detectedTenantRef || '';
      if (refToUse) {
        await registerReferralToTenant(
          user.uid,
          user.email || email,
          refToUse,
          userProfile?.name,
          userProfile?.surname,
          userProfile?.phone,
          userProfile?.subscriptionTier || 'none'
        );
      }
      setShowOnboarding(false);
      setActiveTab('gigs');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleSelectSubscription = async (tier: 'basic' | 'pro') => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        subscriptionTier: tier,
      });

      // Update tenant referral record with activated subscription tier
      await updateReferralSubscriptionStatus(user.uid, tier);

      setShowSubscription(false);
      // After sub, show onboarding if not done
      if (!userProfile?.hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const showTopSearchBar =
    (activeTab === 'gigs' || activeTab === 'referrals' || activeTab === 'seekers') &&
    !(activeGig && activeGig.status === 'in_progress' && activeTab === 'gigs');

  const getSearchPlaceholder = () => {
    if (activeTab === 'seekers') return 'Search seekers by skill, specialty...';
    if (activeTab === 'referrals') return 'Search referral applications, unit, status...';
    return 'Search any place worldwide...';
  };

  // START GIG & ROAD NAVIGATION: Called when seeker accepts booking
  const handleStartGig = async (seeker: ServiceHiringSeeker, hours: number) => {
    if (!user) return;

    const destination: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : [-33.9249, 18.4241];

    // Seeker starting location offset by ~2.3 km
    const seekerStart: [number, number] = [
      destination[0] + 0.0165,
      destination[1] + 0.0185,
    ];

    // Calculate real driving road navigation
    const { routePoints, distanceKm, etaMinutes } = await fetchRoadRoute(seekerStart, destination);

    const gigId = `gig-${Date.now()}`;
    const newGigData = {
      id: gigId,
      seekerId: seeker.id,
      seekerName: seeker.name,
      seekerService: seeker.service,
      seekerRate: seeker.ratePerHour,
      seekerSelfieUrl: seeker.selfieUrl,
      seekerLocation: seekerStart,
      destinationLocation: destination,
      destinationName: userLocation ? userLocation.name : 'Your Live Location',
      routePoints,
      status: 'in_progress',
      etaMinutes,
      distanceKm,
      totalCost: seeker.ratePerHour * hours,
      hours,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'gigs', gigId), newGigData);
      setActiveTab('gigs');
      setGigNotice(`Gig initiated! ${seeker.name} accepted. Road navigation active on map.`);
      setTimeout(() => setGigNotice(null), 4500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/gigs/${gigId}`);
    }
  };

  // CANCEL GIG: Both Seeker and User can cancel, but must give reason to each other
  const handleConfirmCancelGig = async () => {
    if (!user || !activeGig) return;

    const finalReason = cancelDetailText.trim()
      ? `${cancelReason}: ${cancelDetailText.trim()}`
      : cancelReason;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'gigs', activeGig.id), {
        status: 'cancelled',
        cancelledBy: cancelRole,
        cancellationReason: finalReason,
        updatedAt: new Date().toISOString(),
      });

      setGigNotice(
        `GiG Cancelled by ${cancelRole === 'user' ? 'User (Client)' : 'Seeker (Provider)'}. Mutual Reason: "${finalReason}"`
      );
      setIsCancellingGig(false);
      setCancelDetailText('');
      setTimeout(() => setGigNotice(null), 6000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/gigs/${activeGig.id}`);
    }
  };

  // COMPLETE GIG: Only User can click on gig completed and submit star rating for seeker profile
  const handleConfirmCompleteGig = async () => {
    if (!user || !activeGig) return;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'gigs', activeGig.id), {
        status: 'completed',
        ratingGiven: ratingStars,
        reviewGiven: reviewComment.trim() || 'Gig completed successfully.',
        updatedAt: new Date().toISOString(),
      });

      setGigNotice(
        `GiG Completed! You awarded ${ratingStars} ★ to ${activeGig.seekerName}. Rating is now updated on their profile.`
      );
      setIsCompletingGig(false);
      setTimeout(() => setGigNotice(null), 6000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/gigs/${activeGig.id}`);
    }
  };

  if (loading && showSplash) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center">
        <div className="absolute inset-0 z-0 opacity-20 blur-3xl grayscale">
          <div className="w-full h-full bg-slate-900" />
        </div>
        <h1 className="relative z-10 text-6xl sm:text-8xl font-black text-white tracking-tighter animate-pulse">
          TimeGiG
        </h1>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <div className="text-white/60 text-sm font-medium animate-pulse">Syncing Cloud Data...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Splash Overlay (5s Alone in Black with blurred map) */}
      {showSplash && (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center animate-in fade-in duration-500">
           {/* Blurred map background just for the splash screen feel */}
           <div className="absolute inset-0 z-0 opacity-30 blur-2xl grayscale">
             <MapComponent
              center={center}
              zoom={zoom}
              userLocation={null}
              selectedLocation={null}
              savedLocations={[]}
              onMarkerClick={() => {}}
              onRecenter={() => {}}
            />
          </div>
          <h1 className="relative z-10 text-6xl sm:text-8xl font-black text-white tracking-tighter animate-in zoom-in-95 duration-700">
            TimeGiG
          </h1>
        </div>
      )}

      {!user ? (
        <div className="w-full h-full relative bg-slate-950 overflow-hidden flex items-center justify-center p-4 sm:p-6">
          {/* Map Wallpaper Background */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <MapComponent
              center={center}
              zoom={zoom}
              userLocation={userLocation}
              selectedLocation={null}
              savedLocations={[]}
              onMarkerClick={() => {}}
              onRecenter={() => {}}
              hideControls={true}
            />
            {/* Elegant wallpaper tint & vignette for contrast and readability */}
            <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1.5px] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-slate-950/60 pointer-events-none" />
          </div>

          <div className={`relative z-10 w-full max-w-md space-y-6 transition-all duration-700 ${showSplash ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <div className="text-center space-y-2 mb-4">
              <div className="inline-flex p-3 bg-blue-600/20 rounded-2xl border border-blue-500/20 mb-2">
                <Zap className="w-8 h-8 text-blue-500 fill-blue-500" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">TimeGiG</h1>
              <p className="text-slate-400 text-xs">The ultimate hub for tenant management & gig services</p>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <div className="flex p-1 bg-slate-950/50 rounded-2xl border border-slate-800">
                <button 
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${authMode === 'login' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Login
                </button>
                <button 
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${authMode === 'signup' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{authError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="email"
                      required
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 text-white px-11 py-3.5 rounded-2xl text-xs outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 text-white px-11 py-3.5 rounded-2xl text-xs outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authMode === 'signup' && (
                  <>
                    <div className="space-y-1">
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-slate-950/50 border border-slate-800 text-white px-11 py-3.5 rounded-2xl text-xs outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="relative group">
                        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                          type="text"
                          placeholder="Tenant Referral Code (Optional)"
                          value={referralCodeInput}
                          onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                          className="w-full bg-slate-950/50 border border-slate-800 text-white px-11 py-3.5 rounded-2xl text-xs outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600 uppercase font-mono tracking-wider"
                        />
                      </div>
                      {detectedTenantRef && (
                        <p className="text-[10px] text-blue-400 font-bold px-1.5 flex items-center gap-1">
                          <Check className="w-3 h-3 text-blue-400 shrink-0" />
                          <span>Joined via Tenant Link: {detectedTenantRef}</span>
                        </p>
                      )}
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5">
                        <input 
                          type="checkbox"
                          checked={acceptTerms}
                          onChange={(e) => setAcceptTerms(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center ${acceptTerms ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-slate-950/50 border-slate-800 group-hover:border-slate-700'}`}>
                          {acceptTerms && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        I accept the <span className="text-blue-500 font-bold underline">Terms of Service</span> and <span className="text-blue-500 font-bold underline">Privacy Policy</span>.
                      </span>
                    </label>
                  </>
                )}

                <button 
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-4 bg-white hover:bg-slate-100 disabled:bg-slate-200 text-slate-950 font-black rounded-[1.25rem] shadow-xl shadow-white/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAuthLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{authMode === 'login' ? 'Login to Dashboard' : 'Create My Account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="px-4 bg-slate-900/80 text-slate-600">Or continue with</span></div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthLoading}
                className="w-full flex items-center justify-center gap-3 bg-slate-950/50 hover:bg-slate-950 border border-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" />
                <span className="text-xs">Google Login</span>
              </button>
            </div>

            <div className="text-center pt-2">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Secure access powered by Firebase</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Fullscreen Map Layer */}
          <div className="absolute inset-0 pb-16 z-0">
            <MapComponent
              center={center}
              zoom={zoom}
              userLocation={userLocation}
              selectedLocation={selectedLocation}
              savedLocations={savedLocations}
              onMarkerClick={handleSelectLocation}
              onRecenter={handleRecenter}
              activeGig={activeGig}
            />
          </div>

          {/* Live GiG Global Notice Toast */}
          {gigNotice && (
            <div className="fixed top-18 left-1/2 -translate-x-1/2 z-60 w-[calc(100%-2rem)] max-w-lg bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold flex-1 leading-snug">{gigNotice}</span>
            </div>
          )}

          {/* ACTIVE GIG FLOATING ROAD NAVIGATION BAR (On Map in GiGs Feature) */}
          {activeGig && activeGig.status === 'in_progress' && activeTab === 'gigs' && (
            <div className={`fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-in fade-in duration-300 ${isGigBarMinimized ? 'w-14' : 'w-[calc(100%-2rem)] max-w-lg'}`}>
              {!isGigBarMinimized ? (
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-2.5 shadow-2xl border border-blue-100 space-y-2 text-slate-900 overflow-hidden">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="relative shrink-0">
                        <img src={activeGig.seekerSelfieUrl} className="w-8 h-8 rounded-full border border-blue-500 object-cover" />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-extrabold text-slate-900 leading-none truncate max-w-[80px]">{activeGig.seekerName}</h4>
                        <p className="text-[8px] text-slate-500 font-medium truncate max-w-[80px]">{activeGig.seekerService}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[10px] font-black text-blue-600 leading-none">ETA {activeGig.etaMinutes}m</div>
                        <div className="text-[8px] font-bold text-slate-400">{activeGig.distanceKm}km</div>
                      </div>
                      <button
                        onClick={() => setIsGigBarMinimized(true)}
                        className="p-1 hover:bg-slate-100 rounded-md text-slate-400 transition-colors cursor-pointer"
                        title="Minimize"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCancelRole('user');
                        setIsCancellingGig(true);
                      }}
                      className="flex-1 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg text-[9px] font-bold transition-all border border-slate-100 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCompletingGig(true)}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Complete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsGigBarMinimized(false)}
                  className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex flex-col items-center justify-center border-2 border-white hover:bg-blue-700 transition-all cursor-pointer group"
                  title="Expand Navigation Info"
                >
                  <Navigation className="w-5 h-5 group-hover:animate-bounce" />
                  <span className="text-[8px] font-black uppercase tracking-tighter">{activeGig.etaMinutes}m</span>
                </button>
              )}
            </div>
          )}

          {/* Pinned Stationary Top Search Bar across Gigs, Referrals, and Seekers */}
          {showTopSearchBar && (
            <div
              ref={searchRef}
              className="fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 pointer-events-auto"
            >
              <div
                onClick={() => {
                  if (!isTypeBarOpen) {
                    setIsTypeBarOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }
                }}
                className={`w-full h-12 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 flex items-center px-4 transition-colors ${
                  !isTypeBarOpen ? 'cursor-pointer hover:bg-white' : ''
                }`}
              >
                <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                {!isTypeBarOpen && !searchQuery ? (
                  <span className="text-sm text-slate-400 truncate select-none">
                    {getSearchPlaceholder()}
                  </span>
                ) : (
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (activeTab === 'gigs' && searchResults.length > 0) setShowDropdown(true);
                    }}
                    placeholder={getSearchPlaceholder()}
                    className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                  />
                )}
                {isSearching && <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0 ml-2" />}
                {/* Never show × in features (Referrals and Seekers) */}
                {activeTab === 'gigs' && searchQuery && !isSearching && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      setShowDropdown(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown (for map geocoding in gigs) */}
              {activeTab === 'gigs' && showDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-14 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 space-y-1 z-60 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Search Results
                  </div>
                  {searchResults.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors flex items-start gap-2.5 group cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">{loc.name}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{loc.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feature Modal with Blurry Map Wallpaper Background */}
          <FeatureModal
            activeTab={activeTab}
            onClose={() => handleTabChange('gigs')}
            savedLocations={savedLocations}
            searchQuery={searchQuery}
            seekersList={seekersList}
            onStartGig={handleStartGig}
            referrals={referrals}
            userProfile={userProfile}
            onLogout={logout}
          />

          {/* Location Detail Sidebar */}
          {selectedLocation && (
            <LocationSidebar
              location={selectedLocation}
              userLocation={userLocation}
              isSaved={savedLocations.some((s) => s.id === selectedLocation.id)}
              onToggleSave={handleToggleSave}
              onClose={() => setSelectedLocation(null)}
            />
          )}

          {/* Saved Locations Bookmarks Modal */}
          <SavedLocationsModal
            isOpen={isBookmarksOpen}
            onClose={() => setIsBookmarksOpen(false)}
            savedLocations={savedLocations}
            onSelectLocation={handleSelectLocation}
            onRemoveLocation={async (id) => {
              if (!user) return;
              try {
                await deleteDoc(doc(db, 'users', user.uid, 'locations', id));
              } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/locations/${id}`);
              }
            }}
          />

          {/* SUBSCRIPTION SELECTION MODAL (Mandatory after Signup) */}
          {showSubscription && (
            <div className="fixed inset-0 z-[10000] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-500 overflow-y-auto">
              <div className="w-full max-w-2xl space-y-6 animate-in slide-in-from-bottom-10 duration-700 py-8">
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 bg-blue-600/20 rounded-2xl text-blue-400 border border-blue-500/20">
                    <Crown className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tighter">Choose Your Tier</h2>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                    Select a plan to unlock access to TimeGiG features.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
                  {/* Basic Tier Card */}
                  <button 
                    onClick={() => handleSelectSubscription('basic')}
                    className="group relative w-full bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl p-6 text-left border border-slate-700 shadow-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer overflow-hidden hover:ring-2 hover:ring-slate-500"
                  >
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <h3 className="text-lg font-black text-white tracking-tight uppercase">Basic</h3>
                          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px]">
                            <CreditCard className="w-3 h-3" />
                            <span>STANDARD</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">R149</span>
                          <span className="text-slate-500 text-[10px] font-bold">/ MONTH</span>
                        </div>
                        <ul className="space-y-1">
                          <li className="text-[9px] font-bold text-slate-300 flex items-center gap-1.5">
                            <Check className="w-2.5 h-2.5" />
                            UNLIMITED GIG BROWSING
                          </li>
                          <li className="text-[9px] font-bold text-slate-300 flex items-center gap-1.5">
                            <Check className="w-2.5 h-2.5" />
                            TENANT HUB ACCESS
                          </li>
                        </ul>
                      </div>
                    </div>
                  </button>

                  {/* Pro Tier Card */}
                  <button 
                    onClick={() => handleSelectSubscription('pro')}
                    className="group relative w-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 rounded-2xl p-6 text-left border border-amber-300/50 shadow-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer overflow-hidden hover:ring-2 hover:ring-amber-500"
                  >
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <h3 className="text-lg font-black text-slate-950 tracking-tight uppercase">Pro</h3>
                          <div className="flex items-center gap-1.5 text-amber-950/60 font-bold text-[10px]">
                            <Trophy className="w-3 h-3" />
                            <span>PREMIUM</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-950">R499</span>
                          <span className="text-amber-950/60 text-[10px] font-bold">/ MONTH</span>
                        </div>
                        <ul className="space-y-1 text-amber-950/80">
                          <li className="text-[9px] font-bold flex items-center gap-1.5">
                            <Check className="w-2.5 h-2.5" />
                            ALL BASIC FEATURES
                          </li>
                          <li className="text-[9px] font-bold flex items-center gap-1.5">
                            <Check className="w-2.5 h-2.5" />
                            MAX PROFIT OVERRIDES
                          </li>
                          <li className="text-[9px] font-bold flex items-center gap-1.5">
                            <Check className="w-2.5 h-2.5" />
                            PRIORITY LISTING
                          </li>
                        </ul>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button 
                    onClick={logout}
                    className="text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mx-auto transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Back to login</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ONBOARDING WELCOME MODAL (Show just once after sub) */}
          {showOnboarding && userProfile && (
            <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 text-center space-y-6 shadow-2xl border border-blue-100 animate-in zoom-in-95 duration-500">
                <div className="inline-flex p-5 bg-emerald-100 rounded-3xl text-emerald-600 mb-2">
                  <PartyPopper className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Congratulations!</h2>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Welcome to the **TimeGiG** community, <span className="font-bold text-slate-900">{userProfile.name || 'Pioneer'}</span>! Your account is active and ready for exploration.
                  </p>
                </div>

                <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-3">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <span className="text-[11px] font-bold text-slate-700">Track tenant network profits in real-time</span>
                  </div>
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                    <span className="text-[11px] font-bold text-slate-700">Hire local seekers for on-demand services</span>
                  </div>
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                    <span className="text-[11px] font-bold text-slate-700">Earn sub-profit overrides from referrals</span>
                  </div>
                </div>

                <button 
                  onClick={handleCompleteOnboarding}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 cursor-pointer"
                >
                  Enter Dashboard
                </button>
              </div>
            </div>
          )}

          {/* GIG CANCELLATION MODAL: Seeker or User must give reason to each other */}
          {isCancellingGig && activeGig && (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsCancellingGig(false);
              }}
              className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 text-slate-900 animate-in zoom-in-95 duration-150"
              >
                {/* Header without × */}
                <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                      <AlertTriangle className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Cancel Active GiG</h3>
                      <p className="text-[11px] text-slate-500">Mutual explanation required between parties</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCancellingGig(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Back
                  </button>
                </div>

                {/* Who is cancelling selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Cancelling as:
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setCancelRole('user')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        cancelRole === 'user' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      User (Client)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelRole('seeker')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        cancelRole === 'seeker' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Seeker (Provider)
                    </button>
                  </div>
                </div>

                {/* Reason Presets */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Select Primary Reason <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="Emergency schedule conflict">Emergency schedule conflict</option>
                    <option value="Vehicle / transport breakdown">Vehicle / transport breakdown</option>
                    <option value="Location out of reach or inaccessible">Location out of reach or inaccessible</option>
                    <option value="Equipment or tool malfunction">Equipment or tool malfunction</option>
                    <option value="Mutual agreement to reschedule">Mutual agreement to reschedule</option>
                    <option value="Other personal reason">Other personal reason</option>
                  </select>
                </div>

                {/* Detailed Reason Explanation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Explanation for {cancelRole === 'user' ? activeGig.seekerName : 'User'}:
                  </label>
                  <textarea
                    rows={3}
                    value={cancelDetailText}
                    onChange={(e) => setCancelDetailText(e.target.value)}
                    placeholder="Explain the reason clearly to notify the other party..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 outline-none focus:border-blue-600 bg-white resize-none"
                  />
                </div>

                {/* Submit Cancellation */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCancellingGig(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Keep GiG Active
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCancelGig}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/20 active:scale-95 cursor-pointer"
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GIG COMPLETION & STAR RATING MODAL (ONLY USER CAN CLICK) */}
          {isCompletingGig && activeGig && (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsCompletingGig(false);
              }}
              className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-8 space-y-6 text-slate-900 animate-in zoom-in-95 duration-150"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 bg-emerald-100 text-emerald-600 rounded-3xl mb-1">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">GiG Completed!</h3>
                  <p className="text-sm text-slate-500">Rate your experience with **{activeGig.seekerName}**</p>
                </div>

                {/* Star Rating Selector */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingStars(star)}
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(null)}
                        className="p-1 transition-transform active:scale-90 cursor-pointer"
                      >
                        <Star
                          className={`w-10 h-10 transition-colors ${
                            star <= (ratingHover || ratingStars)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200 fill-slate-50'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {ratingStars === 5 ? 'Exceptional' : ratingStars === 4 ? 'Very Good' : ratingStars === 3 ? 'Good' : ratingStars === 2 ? 'Fair' : 'Poor'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Public Review (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Tell others about the service provided..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-900 outline-none focus:border-emerald-500 bg-slate-50 resize-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCompletingGig(false)}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                  >
                    Not Now
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCompleteGig}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                  >
                    Submit Rating
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VERIFICATION FLOW MODAL (Mandatory after Subscription) */}
          {userProfile && userProfile.subscriptionTier !== 'none' && userProfile.verificationStatus !== 'approved' && showReviewModal && (
            <div className="fixed inset-0 z-[10000] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-500 overflow-y-auto">
              {userProfile.verificationStatus === 'pending' ? (
                <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-2xl border border-blue-100 animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Under Review</h3>
                  <p className="text-slate-500 text-sm mt-2">
                    Your verification documents are being processed. This typically takes 15 to 25 minutes. You can continue to view the map, but features will be inactive until approved.
                  </p>
                  <button 
                    onClick={() => setShowReviewModal(false)}
                    className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-500">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight text-center mb-1">Complete Verification</h3>
                  <p className="text-xs text-slate-500 text-center mb-6">
                    Step 3 of 3: Verification steps for account approval by tenant
                  </p>

                  <div className="space-y-4">
                    {isCapturingSelfie ? (
                      <div className="relative w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
                          <button 
                            type="button"
                            className="w-14 h-14 bg-white rounded-full border-4 border-blue-600 hover:scale-105 transition-transform flex items-center justify-center shadow-lg cursor-pointer"
                            onClick={() => {
                              if (videoRef.current) {
                                const canvas = document.createElement('canvas');
                                canvas.width = videoRef.current.videoWidth || 300;
                                canvas.height = videoRef.current.videoHeight || 300;
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                  ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                                  setSelfieStream(null);
                                }
                              }
                              setIsCapturingSelfie(false);
                              if (selfieStream) {
                                selfieStream.getTracks().forEach(track => track.stop());
                              }
                            }}
                            title="Capture Photo"
                          >
                            <div className="w-10 h-10 rounded-full bg-blue-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCapturingSelfie(false);
                              if (selfieStream) {
                                selfieStream.getTracks().forEach(track => track.stop());
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-800/80 text-white rounded-xl text-xs font-bold backdrop-blur-sm cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        <div 
                          className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors relative"
                          onClick={async () => {
                            setIsCapturingSelfie(true);
                            try {
                              const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                              setSelfieStream(stream);
                              if (videoRef.current) {
                                videoRef.current.srcObject = stream;
                              }
                            } catch (err) {
                              console.error("Error accessing webcam:", err);
                              setIsCapturingSelfie(false);
                            }
                          }}
                        >
                          <div className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full">
                            <UserCheck className="w-5 h-5" />
                          </div>
                          <span className="text-[9px] font-bold text-slate-600 text-center uppercase tracking-wider">Face Selfie</span>
                          <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-extrabold">Ready ✓</span>
                        </div>

                        <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <div className="w-10 h-10 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-[9px] font-bold text-slate-600 text-center uppercase tracking-wider">ID Doc</span>
                          <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-extrabold">Attached ✓</span>
                        </div>

                        <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <div className="w-10 h-10 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <span className="text-[9px] font-bold text-slate-600 text-center uppercase tracking-wider">Payment</span>
                          <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-extrabold">Confirmed ✓</span>
                        </div>
                      </div>
                    )}
                    
                    {!isCapturingSelfie && (
                      <button 
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'users', userProfile.uid), {
                              verificationStatus: 'pending',
                              verificationRequestedAt: serverTimestamp()
                            });

                            // Update referral record under referring tenant's subcollection
                            await updateReferralVerificationInTenant(userProfile.uid);
                          } catch (err) {
                            console.error("Error submitting verification:", err);
                          }
                        }}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all text-xs cursor-pointer active:scale-95"
                      >
                        Submit Verification
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Navigation Menu */}
          {userProfile?.uid === 'OikuRWSHysVsqrOSAaUggIduAJH2' && (
             <AdminDashboard />
          )}
          <BottomMenuBar activeTab={activeTab} onTabChange={handleTabChange} />
        </>
      )}
    </div>
  );
}
