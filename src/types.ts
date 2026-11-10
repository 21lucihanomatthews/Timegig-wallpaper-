export interface UserProfile {
  uid: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  totalProfit: number;
  tenantSubProfit: number;
  userSubProfit: number;
  referralCode: string;
  hasCompletedOnboarding: boolean;
}

export interface LocationPoint {
  id: string;
  name: string;
  country?: string;
  lat: number;
  lng: number;
  description?: string;
  category?: 'city' | 'landmark' | 'nature' | 'custom' | 'user';
  temperature?: number;
  weatherDescription?: string;
  timezone?: string;
  elevation?: number;
  savedAt?: string;
}

export type MapTileStyle = 'osm' | 'positron' | 'darkmatter' | 'topo' | 'satellite';

export interface WeatherData {
  temperature: number;
  windSpeed: number;
  weatherCode: number;
  isDay: number;
  timezone: string;
}

export interface TenantReferralDocument {
  id: string;
  name: string;
  type: 'lease' | 'id' | 'income' | 'utility' | 'contract';
  size: string;
  date: string;
  content: string;
}

export interface TenantReferral {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  joinedDate: string;
  referralCode: string;
  status: 'pending' | 'approved' | 'rejected' | 'frozen';
  previousStatus?: 'pending' | 'approved' | 'rejected';
  subscriptionTier?: 'none' | 'basic' | 'pro';
  subscriptionActivated?: boolean;
  selfieUrl: string;
  documents: TenantReferralDocument[];
}

export interface SeekerReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ServiceHiringSeeker {
  id: string;
  name: string;
  service: string;
  category: string;
  ratePerHour: number;
  rating: number;
  reviewsCount: number;
  distance: string;
  selfieUrl: string;
  bio: string;
  reviews: SeekerReview[];
}

export interface ActiveGig {
  id: string;
  seekerId: string;
  seekerName: string;
  seekerService: string;
  seekerRate: number;
  seekerSelfieUrl: string;
  seekerLocation: [number, number];
  destinationLocation: [number, number];
  destinationName: string;
  routePoints: [number, number][];
  status: 'waiting_acceptance' | 'in_progress' | 'completed' | 'cancelled';
  etaMinutes: number;
  distanceKm: number;
  totalCost: number;
  hours: number;
  cancelledBy?: 'user' | 'seeker';
  cancellationReason?: string;
  ratingGiven?: number;
  reviewGiven?: string;
  createdAt: string;
  updatedAt: string;
}
