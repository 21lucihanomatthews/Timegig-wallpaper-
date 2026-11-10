import { ServiceHiringSeeker, TenantReferral } from '../types';

export interface SeekerStory {
  id: string;
  name: string;
  role: string;
  distance: string;
  selfieUrl: string;
  isSelf?: boolean;
}

export const SEEKERS_STORIES: SeekerStory[] = [
  {
    id: 'seeker-self',
    name: 'You',
    role: 'Map Owner',
    distance: '0 km',
    selfieUrl: '/src/assets/images/seeker_selfie_female_one_1794311544343.jpg',
    isSelf: true,
  },
];

export const INITIAL_HIRING_SEEKERS: ServiceHiringSeeker[] = [];

export const INITIAL_TENANT_REFERRALS: TenantReferral[] = [];

