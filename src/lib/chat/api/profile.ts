import { api } from './client';
import type { Profile } from '../types';

export const fetchProfile = (username: string) =>
  api<Profile>(`/api/profile/${encodeURIComponent(username)}`);

export const updateProfile = (patch: {
  display_name?: string;
  bio?: string;
  pronouns?: string;
  profile_color?: string | null;
}) => api<{ message: string }>('/api/profile', { method: 'POST', json: patch });

export const setBanner = (banner: string | null) =>
  api<{ banner: string | null }>('/api/profile/banner', { method: 'POST', json: { banner } });
