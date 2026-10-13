import { api } from './client';
import type { AppearanceSettings } from '../themes/types';

export async function fetchSettings(): Promise<AppearanceSettings | null> {
  const res = await api<{ settings: AppearanceSettings }>('/settings');
  return res.settings || null;
}

export async function updateSettings(settings: AppearanceSettings): Promise<void> {
  await api('/settings', {
    method: 'PUT',
    body: { settings }
  });
}