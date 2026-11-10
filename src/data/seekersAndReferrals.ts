import { ServiceHiringSeeker, TenantReferral } from '../types';

export interface SeekerStory {
  id: string;
  name: string;
  role: string;
  distance: string;
  selfieUrl: string;
  isSelf?: boolean;
}

export const SEEKERS_STORIES: SeekerStory[] = [];

export const INITIAL_HIRING_SEEKERS: ServiceHiringSeeker[] = [];

export const INITIAL_TENANT_REFERRALS: TenantReferral[] = [];

