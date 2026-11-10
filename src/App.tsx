import React, { useState, useEffect, useRef } from 'react';
import { LocationPoint, ActiveGig, ServiceHiringSeeker } from './types';
import { MapComponent } from './components/MapComponent';
import { BottomMenuBar } from './components/BottomMenuBar';
import { FeatureModal } from './components/FeatureModal';
import { PRESET_CITIES } from './data/presetCities';
import { INITIAL_HIRING_SEEKERS } from './data/seekersAndReferrals';
import { fetchRoadRoute } from './utils/navigationRoute';
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
} from 'lucide-react';

export default function App() {
  const [center, setCenter] = useState<[number, number]>([-33.9249, 18.4241]); // Default hub Cape Town
  const [zoom, setZoom] = useState<number>(13);
  const [userLocation, setUserLocation] = useState<LocationPoint | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationPoint | null>(null);

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

  // Active GiG State & Road Navigation
  const [activeGig, setActiveGig] = useState<ActiveGig | null>(null);
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

  // Saved locations in localStorage
  const [savedLocations] = useState<LocationPoint[]>(() => {
    try {
      const stored = localStorage.getItem('geopulse_saved_locations');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  });

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

  // START GIG & ROAD NAVIGATION: Called when seeker accepts booking
  const handleStartGig = async (seeker: ServiceHiringSeeker, hours: number) => {
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

    const newGig: ActiveGig = {
      id: `gig-${Date.now()}`,
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
    };

    setActiveGig(newGig);
    setActiveTab('gigs');
    setGigNotice(`Gig initiated! ${seeker.name} accepted. Road navigation active on map.`);
    setTimeout(() => setGigNotice(null), 4500);
  };

  // CANCEL GIG: Both Seeker and User can cancel, but must give reason to each other
  const handleConfirmCancelGig = () => {
    const finalReason = cancelDetailText.trim()
      ? `${cancelReason}: ${cancelDetailText.trim()}`
      : cancelReason;

    setGigNotice(
      `GiG Cancelled by ${cancelRole === 'user' ? 'User (Client)' : 'Seeker (Provider)'}. Mutual Reason: "${finalReason}"`
    );
    setIsCancellingGig(false);
    setActiveGig(null);
    setCancelDetailText('');
    setTimeout(() => setGigNotice(null), 6000);
  };

  // COMPLETE GIG: Only User can click on gig completed and submit star rating for seeker profile
  const handleConfirmCompleteGig = () => {
    if (!activeGig) return;

    const currentSeeker = seekersList.find((s) => s.id === activeGig.seekerId);
    if (currentSeeker) {
      const newReviewsCount = currentSeeker.reviewsCount + 1;
      const newRating = +(
        (currentSeeker.rating * currentSeeker.reviewsCount + ratingStars) /
        newReviewsCount
      ).toFixed(1);

      const newReview = {
        id: `rev-${Date.now()}`,
        author: 'Luciana Matthews (You)',
        rating: ratingStars,
        comment: reviewComment.trim() || 'Gig completed successfully with outstanding satisfaction.',
        date: 'Just now',
      };

      setSeekersList((prev) =>
        prev.map((s) =>
          s.id === activeGig.seekerId
            ? {
                ...s,
                rating: newRating,
                reviewsCount: newReviewsCount,
                reviews: [newReview, ...(s.reviews || [])],
              }
            : s
        )
      );
    }

    setGigNotice(
      `GiG Completed! You awarded ${ratingStars} ★ to ${activeGig.seekerName}. Rating is now updated on their profile.`
    );
    setIsCompletingGig(false);
    setActiveGig(null);
    setTimeout(() => setGigNotice(null), 6000);
  };

  const showTopSearchBar =
    (activeTab === 'gigs' || activeTab === 'referrals' || activeTab === 'seekers') &&
    !(activeGig && activeGig.status === 'in_progress' && activeTab === 'gigs');

  const getSearchPlaceholder = () => {
    if (activeTab === 'seekers') return 'Search seekers by skill, specialty...';
    if (activeTab === 'referrals') return 'Search referral applications, unit, status...';
    return 'Search any place worldwide...';
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
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
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-blue-200 space-y-3 text-slate-900 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <img src={activeGig.seekerSelfieUrl} className="w-10 h-10 rounded-full border-2 border-blue-500 object-cover" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 leading-none">{activeGig.seekerName}</h4>
                    <p className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">{activeGig.seekerService}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-black text-blue-600">ETA {activeGig.etaMinutes}m</div>
                    <div className="text-[9px] font-bold text-slate-400">{activeGig.distanceKm}km</div>
                  </div>
                  <button
                    onClick={() => setIsGigBarMinimized(true)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors cursor-pointer"
                    title="Minimize Navigation Bar"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsCancellingGig(true)}
                  className="flex-1 py-2 px-2 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-[10px] font-bold transition-all border border-slate-100 flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCompletingGig(true)}
                  className="flex-1 py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3 h-3" />
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
      />

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
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl"
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
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 text-slate-900 animate-in zoom-in-95 duration-150"
          >
            {/* Header without × */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Complete GiG & Rate Seeker</h3>
                  <p className="text-[11px] text-slate-500">Only user confirms gig completion & star rating</p>
                </div>
              </div>
              <button
                onClick={() => setIsCompletingGig(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
            </div>

            {/* Seeker Card */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                <img
                  src={activeGig.seekerSelfieUrl}
                  alt={activeGig.seekerName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{activeGig.seekerName}</h4>
                <p className="text-xs text-blue-600 font-semibold">{activeGig.seekerService}</p>
                <p className="text-[11px] text-slate-500">
                  Total Paid: R{activeGig.totalCost}.00 ({activeGig.hours} hrs)
                </p>
              </div>
            </div>

            {/* Interactive 5-Star Rating Selector */}
            <div className="space-y-2 text-center py-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                How would you rate {activeGig.seekerName}'s service?
              </label>

              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isGold = (ratingHover !== null ? ratingHover : ratingStars) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setRatingHover(star)}
                      onMouseLeave={() => setRatingHover(null)}
                      onClick={() => setRatingStars(star)}
                      className="p-1 transition-transform hover:scale-125 cursor-pointer text-slate-200"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          isGold ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-xs font-bold text-amber-600">
                {ratingStars} Star{ratingStars > 1 ? 's' : ''} ({ratingStars === 5 ? 'Exceptional' : ratingStars === 4 ? 'Very Good' : ratingStars === 3 ? 'Good' : 'Needs Improvement'})
              </div>
            </div>

            {/* Review Comment Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Write a Review for {activeGig.seekerName}'s Profile:
              </label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience working with this seeker..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 outline-none focus:border-blue-600 bg-white resize-none"
              />
            </div>

            {/* Submit Rating & Complete GiG */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleConfirmCompleteGig}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Rating & Complete GiG</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Menu Bar */}
      <BottomMenuBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
