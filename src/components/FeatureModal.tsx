import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Copy,
  Check,
  Share2,
  TrendingUp,
  Users,
  Building,
  Link2,
  Sparkles,
  Star,
  CheckCircle2,
  Briefcase,
  Download,
  FileText,
  Snowflake,
  ShieldAlert,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
  ArrowLeft,
  LogOut,
  Crown,
} from 'lucide-react';
import { 
  LocationPoint, 
  TenantReferral, 
  TenantReferralDocument, 
  ServiceHiringSeeker, 
  UserProfile 
} from '../types';
import { SEEKERS_STORIES } from '../data/seekersAndReferrals';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { registerReferralToTenant } from '../utils/referral';

interface FeatureModalProps {
  activeTab: string | null;
  onClose: () => void;
  savedLocations?: LocationPoint[];
  searchQuery?: string;
  seekersList: ServiceHiringSeeker[];
  onStartGig: (seeker: ServiceHiringSeeker, hours: number) => void;
  referrals: TenantReferral[];
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export const FeatureModal: React.FC<FeatureModalProps> = ({
  activeTab,
  onClose,
  searchQuery = '',
  seekersList,
  onStartGig,
  referrals,
  userProfile,
  onLogout,
}) => {
  if (!activeTab || activeTab === 'gigs') return null;

  // Profile Form State
  const [name, setName] = useState(userProfile?.name || '');
  const [surname, setSurname] = useState(userProfile?.surname || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [contact, setContact] = useState(userProfile?.phone || '');
  const [savedProfile, setSavedProfile] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name);
      setSurname(userProfile.surname);
      setEmail(userProfile.email);
      setContact(userProfile.phone);
    }
  }, [userProfile]);

  // Tenant Link State
  const [copiedLink, setCopiedLink] = useState(false);
  const tenantReferralLink = `https://geopulse.app/tenant/join?ref=${userProfile?.referralCode || 'GEO-XXXXXX'}`;

  // Referrals State (Now passed from props, synced with Firestore)
  const [selectedDocPreview, setSelectedDocPreview] = useState<{
    doc: TenantReferralDocument;
    referralName: string;
  } | null>(null);
  const [selectedSelfiePreview, setSelectedSelfiePreview] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [referralActionNotice, setReferralActionNotice] = useState<string | null>(null);

  // Seekers Stories & Hiring State
  const [selectedStory, setSelectedStory] = useState<{ id: string; name: string } | null>(null);
  const [hiringSeeker, setHiringSeeker] = useState<ServiceHiringSeeker | null>(null);
  const [hireHours, setHireHours] = useState(2);
  const [expandedReviewsSeekerId, setExpandedReviewsSeekerId] = useState<string | null>(null);

  // Circle Loading Waiting for Seeker to Accept State
  const [waitingSeekerAcceptance, setWaitingSeekerAcceptance] = useState<{
    seeker: ServiceHiringSeeker;
    hours: number;
    step: number;
  } | null>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(tenantReferralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join my Tenant Network on TimeGiG',
        text: 'Join my Tenant Network on TimeGiG and start earning sub-profit dividends:',
        url: tenantReferralLink,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!name || !surname || !email || !contact) {
      alert('Please fill in all required fields.');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        name,
        surname,
        email,
        phone: contact,
      });
      // Register or update referral record if user joined via a tenant link
      await registerReferralToTenant(userProfile.uid, email, undefined, name, surname, contact);
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    }
  };

  // Referrals Actions: Approve, Reject, Freeze / Unfreeze
  const handleApproveReferral = async (id: string, refName: string) => {
    if (!userProfile) return;
    try {
      await updateDoc(doc(db, 'users', userProfile.uid, 'referrals', id), {
        status: 'approved',
      });

      // Credit R250.00 sub-profit override dividend to tenant upon approval
      const newTenantSubProfit = (userProfile.tenantSubProfit || 0) + 250;
      const newTotalProfit = (userProfile.totalProfit || 0) + 250;
      await updateDoc(doc(db, 'users', userProfile.uid), {
        tenantSubProfit: newTenantSubProfit,
        totalProfit: newTotalProfit,
      });

      setReferralActionNotice(`Approved referral application for ${refName}. R250.00 sub-profit dividend credited!`);
      setTimeout(() => setReferralActionNotice(null), 3500);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}/referrals/${id}`);
    }
  };

  const handleRejectReferral = async (id: string, refName: string) => {
    if (!userProfile) return;
    try {
      await updateDoc(doc(db, 'users', userProfile.uid, 'referrals', id), {
        status: 'rejected',
      });
      setReferralActionNotice(`Rejected referral application for ${refName}.`);
      setTimeout(() => setReferralActionNotice(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}/referrals/${id}`);
    }
  };

  const handleToggleFreezeReferral = async (referral: TenantReferral) => {
    if (!userProfile) return;
    try {
      const isCurrentlyFrozen = referral.status === 'frozen';
      const newStatus = isCurrentlyFrozen ? referral.previousStatus || 'approved' : 'frozen';
      const prevStatus = !isCurrentlyFrozen && referral.status !== 'frozen' ? referral.status : referral.previousStatus;
      
      await updateDoc(doc(db, 'users', userProfile.uid, 'referrals', referral.id), {
        status: newStatus,
        previousStatus: prevStatus,
      });

      setReferralActionNotice(
        isCurrentlyFrozen
          ? `Unfroze account for ${referral.name}. Status restored.`
          : `Account for ${referral.name} is now FROZEN. Commissions suspended.`
      );
      setTimeout(() => setReferralActionNotice(null), 3500);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}/referrals/${referral.id}`);
    }
  };

  // Document Download Trigger
  const handleDownloadDoc = (doc: TenantReferralDocument, refName: string) => {
    const blob = new Blob([doc.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${refName.replace(/\s+/g, '_')}_${doc.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setReferralActionNotice(`Downloaded: ${doc.name}`);
    setTimeout(() => setReferralActionNotice(null), 2500);
  };

  // Seeker Hiring Confirmation -> Trigger Circular Loading
  const handleInitiateHire = (seeker: ServiceHiringSeeker, hours: number) => {
    setHiringSeeker(null);
    setWaitingSeekerAcceptance({ seeker, hours, step: 1 });

    // Step progression simulation
    setTimeout(() => {
      setWaitingSeekerAcceptance((prev) => (prev ? { ...prev, step: 2 } : null));
    }, 1200);

    // Auto-acceptance after 2.8s
    setTimeout(() => {
      setWaitingSeekerAcceptance((prev) => {
        if (prev) {
          onStartGig(prev.seeker, prev.hours);
          return null;
        }
        return null;
      });
    }, 2800);
  };

  // 1. TENANT FEATURE VIEW (With Blurry Wallpaper Background)
  if (activeTab === 'tenant') {
    return (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xl animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
      >
        <div className="flex flex-col items-center pt-14 sm:pt-16 px-4 pb-24 min-h-full">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/70 shadow-2xl space-y-6 cursor-default text-slate-900"
          >
            {/* Header without × */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-600" />
                  <span>Tenant Revenue & Network Hub</span>
                </h3>
                <p className="text-xs text-slate-500">Track profit performance and expand your tenant network</p>
              </div>
            </div>

            {/* Big Total Profit Balance (R0.00) */}
            <div className="p-7 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden">
              <div className="text-xs uppercase tracking-wider text-blue-300 font-semibold mb-1">
                Total Profit Balance
              </div>
              <div className="text-5xl sm:text-6xl font-extrabold tracking-tight font-mono tabular-nums text-white my-3">
                R{userProfile?.totalProfit.toFixed(2) || '0.00'}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span>Starting balance · Earnings accumulate from active network</span>
              </div>
            </div>

            {/* Sub-Profits Breakdown Grid (R0.00) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant Sub Profit</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Tier 1</span>
                </div>
                <div className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                  R{userProfile?.tenantSubProfit.toFixed(2) || '0.00'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  From active leases & unit dividends
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Sub Profit</span>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Network</span>
                </div>
                <div className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                  R{userProfile?.userSubProfit.toFixed(2) || '0.00'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  From referral network overrides
                </div>
              </div>
            </div>

            {/* Tenant Referral Link to Share & Build Network */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border border-blue-200 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-xs">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Tenant Referral Link</h4>
                    <p className="text-xs text-slate-600">Share your link with partners to build and monetize your network</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                  Active Link
                </span>
              </div>

              {/* Referral Link Box */}
              <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="font-mono text-xs text-slate-700 truncate select-all flex-1 px-1">
                  {tenantReferralLink}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                  title="Copy Link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Invite tenants & sub-users to start earning profit overrides</span>
                </div>
                <button
                  onClick={handleShareLink}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Network Link</span>
                </button>
              </div>
            </div>

            {/* Footer with return button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all shadow-md cursor-pointer"
              >
                Done & Return to Map
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PROFILE FEATURE VIEW (With Blurry Wallpaper Background)
  if (activeTab === 'profile') {
    return (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xl animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
      >
        <div className="flex flex-col items-center pt-14 sm:pt-16 px-4 pb-24 min-h-full">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/70 shadow-2xl space-y-6 cursor-default text-slate-900"
          >
            {/* Header without × */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">User Profile & Account Dashboard</h3>
                <p className="text-xs text-slate-500">Manage your required credentials and contact info</p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>

            {/* Big Profile Logo & Identity Card */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-6 rounded-3xl bg-slate-900 text-white shadow-xl">
              <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold shadow-2xl border-4 border-white/20 shrink-0">
                {name && surname ? `${name[0]}${surname[0]}`.toUpperCase() : <User className="w-12 h-12" />}
              </div>
              <div className="space-y-1 text-center sm:text-left overflow-hidden w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h4 className="text-xl font-bold break-words">{name} {surname}</h4>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-semibold inline-block mx-auto sm:mx-0">
                    Verified Pro
                  </span>
                </div>
                <div className="text-xs text-slate-300 break-all">{email}</div>
                <div className="text-xs text-slate-300 break-all">{contact}</div>
              </div>
            </div>

            {savedProfile && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-semibold flex items-center gap-2 justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Profile information saved successfully!</span>
              </div>
            )}

            {/* Referral Link Section */}
            <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100 space-y-3">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Your Referral Link</h4>
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-blue-200">
                <span className="font-mono text-xs text-slate-700 truncate flex-1 px-1">
                  {tenantReferralLink}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-xs cursor-pointer"
                  title="Copy Link"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Required Fields Form */}
            <form onSubmit={handleProfileSubmit} className="space-y-5 bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required Personal Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:border-blue-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Surname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Enter surname"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:border-blue-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:border-blue-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Information <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:border-blue-600 bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all text-xs cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>

            {/* Footer with return button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all shadow-md cursor-pointer"
              >
                Done & Return to Map
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. REFERRALS VIEW: Show ONLY Referrals who joined through Tenant Link
  const filteredReferrals = referrals.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.unit.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  });

  if (activeTab === 'referrals') {
    return (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xl animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
      >
        <div className="flex flex-col items-center pt-20 px-4 pb-24 min-h-full">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl space-y-4 cursor-default"
          >
            {/* Action Notice */}
            {referralActionNotice && (
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="flex-1">{referralActionNotice}</span>
              </div>
            )}

            {/* Referrals Header Card */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-white/70 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                      <Link2 className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Tenant Referral Applications</h3>
                      <p className="text-[10px] text-slate-500">
                        Joined via link: <span className="font-mono font-semibold text-blue-600">{userProfile?.referralCode || 'GEO-XXXXXX'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {filteredReferrals.length} Joined Referrals
                  </span>
                </div>
              </div>
            </div>

            {/* Referrals List: Separate Bubbles */}
            <div className="space-y-4">
              {filteredReferrals.length === 0 ? (
                <div className="p-8 text-center bg-white/95 backdrop-blur-md rounded-3xl border border-white/80 shadow-xl space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Users className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900">No Referral Applications Yet</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Share your unique tenant referral link with partners and prospective tenants. Anyone who signs up using your link will automatically appear here for you to view, approve, or reject.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                    <button
                      onClick={handleCopyLink}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? 'Link Copied!' : 'Copy Tenant Link'}</span>
                    </button>
                    <button
                      onClick={handleShareLink}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Link</span>
                    </button>
                  </div>
                </div>
              ) : (
                filteredReferrals.map((referral) => {
                  const isFrozen = referral.status === 'frozen';
                  const isPending = referral.status === 'pending';
                  const isApproved = referral.status === 'approved';
                  const isRejected = referral.status === 'rejected';

                  return (
                    <div
                      key={referral.id}
                      className={`bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 border shadow-xl transition-all duration-200 space-y-4 ${
                        isFrozen
                          ? 'border-cyan-300 ring-2 ring-cyan-200/50 bg-cyan-50/20'
                          : 'border-white/80 hover:border-blue-300'
                      }`}
                    >
                      {/* Top: Referral Info & Status */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setSelectedSelfiePreview({ url: referral.selfieUrl, name: referral.name })}
                              className="w-13 h-13 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                            >
                              <img
                                src={referral.selfieUrl}
                                alt={referral.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </button>
                            {isFrozen && (
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-cyan-500 text-white rounded-full flex items-center justify-center shadow-xs">
                                <Snowflake className="w-3 h-3" />
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900">{referral.name}</h4>
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                                {referral.unit}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {referral.email} · {referral.phone}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Joined via link {referral.joinedDate}</span>
                            </div>

                            {/* Subscription Status Tag */}
                            <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                              {referral.subscriptionActivated || (referral.subscriptionTier && referral.subscriptionTier !== 'none') ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                                  <Crown className="w-3 h-3 text-emerald-600" />
                                  <span>
                                    {referral.subscriptionTier === 'pro'
                                      ? 'Pro Plan Active (R399/mo)'
                                      : 'Basic Plan Active (R149/mo)'}
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                                  <Crown className="w-3 h-3 text-amber-600" />
                                  <span>Subscription Pending Activation</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 self-start sm:self-auto">
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending Review</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {isFrozen && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                              <Snowflake className="w-3.5 h-3.5" />
                              <span>Account Frozen</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Attached Documents Section (Clickable full screen and downloadable) */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Verification Documents ({referral.documents?.length || 0})</span>
                          <span className="text-[10px] text-slate-400 font-normal">Tap item to view full screen & download</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {referral.documents?.map((doc) => (
                            <div
                              key={doc.id}
                              onClick={() => setSelectedDocPreview({ doc, referralName: referral.name })}
                              className="p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/90 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                <div className="truncate">
                                  <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600">
                                    {doc.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{doc.size} · {doc.date}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadDoc(doc, referral.name);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 bg-white rounded-lg border border-slate-200 shadow-2xs cursor-pointer"
                                  title="Download Document"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <span className="p-1.5 text-slate-400 group-hover:text-blue-600">
                                  <Eye className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tenant Action Bar: Approve, Reject, Freeze Account */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleFreezeReferral(referral)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                              isFrozen
                                ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Snowflake className="w-3.5 h-3.5" />
                            <span>{isFrozen ? 'Unfreeze Account' : 'Freeze Account'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            disabled={isRejected}
                            onClick={() => handleRejectReferral(referral.id, referral.name)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                              isRejected
                                ? 'bg-rose-50 text-rose-400 cursor-not-allowed'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            }`}
                          >
                            Reject
                          </button>
                          <button
                            disabled={isApproved}
                            onClick={() => handleApproveReferral(referral.id, referral.name)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                              isApproved
                                ? 'bg-emerald-50 text-emerald-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                            }`}
                          >
                            {isApproved ? 'Approved ✓' : 'Approve Referral'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div
              onClick={onClose}
              className="mt-6 text-center text-white/80 text-sm font-medium"
            >
              Tenant referral management over blurred map wallpaper.
              <div className="text-xs text-white/60 mt-1">Tap background to return to map</div>
            </div>
          </div>
        </div>

        {/* Full-Screen Document Viewer (Seperate page feel with back arrow) */}
        {selectedDocPreview && (
          <div className="fixed inset-0 z-60 bg-white animate-in slide-in-from-right duration-200 flex flex-col overflow-hidden">
            {/* Full Screen Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedDocPreview(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-700 cursor-pointer"
                  title="Back to Referrals"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 truncate max-w-[150px] sm:max-w-md">
                      {selectedDocPreview.doc.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      {selectedDocPreview.doc.type} Document
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadDoc(selectedDocPreview.doc, selectedDocPreview.referralName)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={() => setSelectedDocPreview(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Document Content Scroll Area - Fills screen */}
            <div className="flex-1 overflow-y-auto bg-white">
              {/* Meta Details Card - Sticky or floating at top if needed, but here just at start */}
              <div className="bg-slate-50 p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Owner / Referral</span>
                  <div className="text-sm font-bold text-slate-900">{selectedDocPreview.referralName}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Upload Date</span>
                  <div className="text-sm font-bold text-slate-900">{selectedDocPreview.doc.date}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">File Size</span>
                  <div className="text-sm font-bold text-slate-900">{selectedDocPreview.doc.size}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Verification Status</span>
                  <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Certified Authentic</span>
                  </div>
                </div>
              </div>

              {/* Primary Content Area - Edge to Edge */}
              <div className="w-full flex flex-col">
                 <div className="bg-slate-100/50 px-6 py-2 border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase flex items-center justify-between">
                   <span>Official Record Content</span>
                   <span>End-to-End Encryption</span>
                 </div>
                 <div className="p-0 sm:p-0">
                   <pre className="whitespace-pre-wrap font-mono text-sm sm:text-base text-slate-800 leading-relaxed p-8 sm:p-12 w-full min-h-screen">
                     {selectedDocPreview.doc.content}
                   </pre>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* Full-Screen Selfie Viewer (Seperate page feel with back arrow) */}
        {selectedSelfiePreview && (
          <div className="fixed inset-0 z-60 bg-white animate-in slide-in-from-right duration-200 flex flex-col overflow-hidden text-slate-900">
            {/* Full Screen Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSelfiePreview(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-700 cursor-pointer"
                  title="Back to Referrals"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shadow-sm">
                    <img src={selectedSelfiePreview.url} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedSelfiePreview.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Face Selfie Verification
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedSelfiePreview(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* Image Content Area - Fills screen */}
            <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
               <div className="relative w-full h-full flex items-center justify-center p-0">
                 <img
                   src={selectedSelfiePreview.url}
                   alt="Full screen selfie"
                   className="w-full h-full object-contain"
                 />
               </div>
            </div>
            
            {/* Bottom Info Bar - Fills bottom */}
            <div className="bg-white border-t border-slate-200 px-6 py-5 flex items-center justify-center">
               <p className="text-xs text-slate-600 flex items-center gap-2 font-bold">
                 <ShieldCheck className="w-5 h-5 text-emerald-600" />
                 <span>Identity Verified: {selectedSelfiePreview.name}</span>
               </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. SEEKERS VIEW (Top Search Bar is pinned in App.tsx above this view; content scrolls underneath)
  const filteredHiringList = seekersList.filter(
    (s) =>
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xl animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
    >
      {/* Main Seekers Scrollable Container (pt-20 offsets the fixed top search bar) */}
      <div className="flex flex-col items-center pt-20 px-4 pb-24 min-h-full">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl space-y-4 cursor-default"
        >
          {/* Section 1: Active Seekers Near You (Circle Avatars Row) */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Active Seekers Near You</span>
              </span>
              <span className="text-[11px] font-semibold text-blue-600">
                {SEEKERS_STORIES.length} active
              </span>
            </div>

            {/* Circular Profile Selfie Avatars Row */}
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-around">
              {SEEKERS_STORIES.map((seeker) => {
                const isSelected = selectedStory?.id === seeker.id;
                return (
                  <button
                    key={seeker.id}
                    onClick={() => setSelectedStory(isSelected ? null : seeker)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group transition-all cursor-pointer"
                  >
                    <div
                      className={`relative p-0.5 rounded-full transition-transform group-hover:scale-105 ${
                        isSelected
                          ? 'ring-3 ring-blue-600 ring-offset-2'
                          : 'ring-2 ring-slate-200 group-hover:ring-blue-400'
                      }`}
                    >
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden bg-slate-200 shadow-md">
                        <img
                          src={seeker.selfieUrl}
                          alt={`${seeker.name} selfie`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      {seeker.isSelf && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                          ★
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${isSelected ? 'text-blue-600 font-bold' : 'text-slate-800'}`}>
                      {seeker.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono -mt-1">
                      {seeker.distance}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Seekers Hiring Their Services in Separate Bubbles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 drop-shadow-sm">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>Seekers Hiring Their Services</span>
              </span>
              <span className="text-[11px] font-semibold text-white/90 bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30 backdrop-blur-md">
                {filteredHiringList.length} available to hire
              </span>
            </div>

            {/* Separate Bubbles for Each Seeker */}
            <div className="space-y-3">
              {filteredHiringList.map((seeker) => {
                const areReviewsExpanded = expandedReviewsSeekerId === seeker.id;

                return (
                  <div
                    key={seeker.id}
                    className="bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-white/70 shadow-xl hover:shadow-2xl transition-all duration-200 flex flex-col gap-4 group hover:border-blue-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Small Circle with Selfie & Info */}
                      <div className="flex items-start gap-3.5 flex-1">
                        <div className="relative shrink-0 mt-0.5">
                          <div className="w-13 h-13 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-200 shadow-sm group-hover:border-blue-500 transition-colors">
                            <img
                              src={seeker.selfieUrl}
                              alt={seeker.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-200"
                            />
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
                        </div>

                        {/* Details */}
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {seeker.name}
                            </h4>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                              {seeker.category}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-700 leading-snug">
                            {seeker.service}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5 flex-wrap">
                            {/* Clickable Star Rating & Reviews Count */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedReviewsSeekerId((prev) => (prev === seeker.id ? null : seeker.id))
                              }
                              className="flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                            >
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{seeker.rating}</span>
                              <span className="text-slate-400 font-normal">({seeker.reviewsCount} reviews)</span>
                              {areReviewsExpanded ? (
                                <ChevronUp className="w-3 h-3 text-slate-400 ml-0.5" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                              )}
                            </button>
                            <span>·</span>
                            <span>{seeker.distance}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Rate & Hire Button in Bubble */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pl-16 sm:pl-0 shrink-0">
                        <div className="text-left sm:text-right">
                          <div className="text-base font-bold font-mono text-slate-900">
                            R{seeker.ratePerHour}
                            <span className="text-xs font-normal text-slate-500">/hr</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setHiringSeeker(seeker)}
                          className="px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95"
                        >
                          <span>Hire Seeker</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Seeker Profile Reviews List */}
                    {areReviewsExpanded && seeker.reviews && (
                      <div className="pt-3 border-t border-slate-100 space-y-2 bg-slate-50/70 p-3.5 rounded-2xl animate-in fade-in duration-150">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-blue-600" />
                          <span>Seeker Profile Reviews & Ratings</span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {seeker.reviews.length === 0 ? (
                            <div className="text-slate-400 text-[11px]">No reviews recorded yet.</div>
                          ) : (
                            seeker.reviews.map((rev) => (
                              <div key={rev.id} className="p-2.5 bg-white rounded-xl border border-slate-200/80 space-y-1">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                                  <span>{rev.author}</span>
                                  <div className="flex items-center gap-1 text-amber-500 text-[11px]">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <span>{rev.rating}.0</span>
                                    <span className="text-slate-400 text-[10px] font-normal ml-1">({rev.date})</span>
                                  </div>
                                </div>
                                <p className="text-[11px] text-slate-600 italic">"{rev.comment}"</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hire Seeker Booking Details Modal */}
        {hiringSeeker && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setHiringSeeker(null);
            }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-150"
            >
              {/* Modal Header without × */}
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Hire Seeker Service</h3>
                  <p className="text-[11px] text-slate-500">Confirm booking details & service hours</p>
                </div>
                <button
                  onClick={() => setHiringSeeker(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl shadow-2xs cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Seeker Profile Card */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                    <img
                      src={hiringSeeker.selfieUrl}
                      alt={hiringSeeker.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{hiringSeeker.name}</h4>
                    <p className="text-xs text-blue-600 font-semibold">{hiringSeeker.service}</p>
                    <p className="text-[11px] text-slate-500">{hiringSeeker.distance} · Rate: R{hiringSeeker.ratePerHour}/hr</p>
                  </div>
                </div>

                {/* Service Hours Counter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Service Duration (Hours)
                  </label>
                  <div className="flex items-center justify-between p-2 bg-slate-100 rounded-2xl">
                    <button
                      onClick={() => setHireHours((prev) => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-xl bg-white shadow-xs font-bold text-base text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <div className="text-center font-bold text-sm text-slate-900">
                      <span>{hireHours} {hireHours === 1 ? 'Hour' : 'Hours'}</span>
                    </div>
                    <button
                      onClick={() => setHireHours((prev) => Math.min(12, prev + 1))}
                      className="w-10 h-10 rounded-xl bg-white shadow-xs font-bold text-base text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total Calculation */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Standard Rate</span>
                    <span>R{hiringSeeker.ratePerHour} × {hireHours} hrs</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-blue-200/60">
                    <span>Total Estimated Cost</span>
                    <span className="text-base text-blue-700 font-mono">
                      R{hiringSeeker.ratePerHour * hireHours}.00
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setHiringSeeker(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleInitiateHire(hiringSeeker, hireHours)}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                  >
                    Confirm & Hire
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CIRCLE LOADING: Waiting for Seeker to Accept Gig Modal */}
        {waitingSeekerAcceptance && (
          <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-2xl border border-slate-200 text-center space-y-6 animate-in zoom-in-95 duration-200"
            >
              {/* Animated Circle Loading with Seeker Selfie */}
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                {/* Outer Spinning Ring */}
                <div className="absolute inset-0 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                <div className="absolute inset-1.5 rounded-full border-4 border-dashed border-blue-300/60 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '4s' }} />

                {/* Inner Seeker Selfie Avatar */}
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-xl relative z-10 bg-slate-100">
                  <img
                    src={waitingSeekerAcceptance.seeker.selfieUrl}
                    alt={waitingSeekerAcceptance.seeker.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Pulsing Green Signal Dot */}
                <div className="absolute -bottom-1 -right-1 z-20 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-md animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
              </div>

              {/* Status Text & Progress */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  Waiting for {waitingSeekerAcceptance.seeker.name} to accept...
                </h3>
                <p className="text-xs text-slate-500">
                  Request dispatched for {waitingSeekerAcceptance.hours} hrs ({waitingSeekerAcceptance.seeker.service})
                </p>
                <div className="text-xs font-mono font-bold text-blue-600 pt-1">
                  Total: R{waitingSeekerAcceptance.seeker.ratePerHour * waitingSeekerAcceptance.hours}.00
                </div>
              </div>

              {/* Step Indicators */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl text-left border border-slate-200/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Gig booking transmission sent</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Seeker alerted via notification</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 animate-pulse">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                  <span>Awaiting seeker acceptance response...</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const s = waitingSeekerAcceptance.seeker;
                    const h = waitingSeekerAcceptance.hours;
                    setWaitingSeekerAcceptance(null);
                    onStartGig(s, h);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Accept Immediately as Seeker
                </button>
                <button
                  type="button"
                  onClick={() => setWaitingSeekerAcceptance(null)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel Request
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          onClick={onClose}
          className="mt-6 text-center text-white/80 text-sm font-medium"
        >
          Hire local seekers directly on the map network.
          <div className="text-xs text-white/60 mt-1">Tap background to return to map</div>
        </div>
      </div>
    </div>
  );
};
