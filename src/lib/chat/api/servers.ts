import { api } from './client';
import type { Server, ServerChannel, PublicServer } from '../types';

export const fetchServers = async () =>
  (await api<{ servers: Server[] }>('/api/servers')).servers;

export const fetchPublicServers = async () =>
  (await api<{ servers: PublicServer[] }>('/api/servers/public')).servers;

export const createServer = async (name: string, avatar: string | null) => {
  const res = await api<{ server: Server }>('/api/servers', { method: 'POST', json: { name, avatar } });
  return res.server;
};

export const joinServer = async (key: string | number) => {
  const res = await api<{ server: Server }>(`/api/servers/${encodeURIComponent(key)}/join`, { method: 'POST' });
  return res.server;
};

export const updateServer = async (serverId: number, patch: { name?: string; avatar?: string | null; is_public?: boolean }) => {
  const res = await api<{ server: Server }>(`/api/servers/${serverId}`, { method: 'PATCH', json: patch });
  return res.server;
};

export const fetchServerMembers = async (serverId: number) =>
  (await api<{ members: string[] }>(`/api/servers/${serverId}/members`)).members;

export const kickMember = async (serverId: number, username: string) => {
  await api(`/api/servers/${serverId}/kick`, { method: 'POST', json: { username } });
};

export const createChannel = async (serverId: number, name: string) => {
  const res = await api<{ channel: ServerChannel }>(`/api/servers/${serverId}/channels`, {
    method: 'POST',
    json: { name }
  });
  return res.channel;
};

export const renameChannel = async (serverId: number, channelId: number, name: string) => {
  const res = await api<{ channel: ServerChannel }>(`/api/servers/${serverId}/channels/${channelId}`, {
    method: 'PATCH',
    json: { name }
  });
  return res.channel;
};

export const deleteChannel = async (serverId: number, channelId: number) => {
  await api<{ message: string }>(`/api/servers/${serverId}/channels/${channelId}`, {
    method: 'DELETE'
  });
};