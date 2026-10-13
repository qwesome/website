import { fetchServers } from '../api/servers';
import { appearance } from './appearance.svelte';
import { auth } from './auth.svelte';
import { messages } from './messages.svelte';
import type { Server, ServerChannel } from '../types';

const cacheKey = (user: string) => `chat_servers_cache_${user}`;

class Servers {
  list = $state<Server[]>([]);
  /** true once the first load has finished (success or failure) */
  loaded = $state(false);
  /** bumped whenever a server's membership changes, so member lists refetch */
  memberVersion = $state(0);

  bumpMembers() {
    this.memberVersion++;
  }

  /** Pulls the last-known servers out of localStorage so the rail is populated
   *  instantly and survives a relaunch even if the API is briefly unreachable. */
  restoreLocal() {
    if (typeof window === 'undefined') return;
    const user = auth.user;
    if (!user) return;
    try {
      const raw = localStorage.getItem(cacheKey(user));
      const parsed = raw ? (JSON.parse(raw) as Server[]) : [];
      this.list = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.list = [];
    }
  }

  /** Stores the current server list for the signed-in user. */
  persistLocal() {
    if (typeof window === 'undefined') return;
    const user = auth.user;
    if (!user) return;
    try {
      localStorage.setItem(cacheKey(user), JSON.stringify($state.snapshot(this.list)));
    } catch {
      /* quota exceeded — ignore */
    }
  }

  /** Servers the user should actually see (global server hidden when disabled). */
  get visible(): Server[] {
    if (appearance.showGlobalServer) return this.list;
    return this.list.filter((s) => s.is_default !== 1);
  }

  get global(): Server | undefined {
    return this.list.find((s) => s.is_default === 1);
  }

  serverOf(serverId: number): Server | undefined {
    return this.list.find((s) => s.id === serverId);
  }

  channelOf(channelId: number): { server: Server; channel: ServerChannel } | undefined {
    for (const server of this.list) {
      const channel = server.channels.find((c) => c.id === channelId);
      if (channel) return { server, channel };
    }
    return undefined;
  }

  /** Fallback landing channel: the global server's #general, else the first channel available. */
  defaultChannel(): { server: Server; channel: ServerChannel } | undefined {
    for (const server of this.visible) {
      if (server.channels.length > 0) return { server, channel: server.channels[0] };
    }
    return undefined;
  }

  /** Adds a newly created/joined server, or refreshes its details in place. */
  upsert(server: Server) {
    const existing = this.serverOf(server.id);
    if (existing) {
      existing.name = server.name;
      existing.avatar = server.avatar;
      for (const ch of server.channels) {
        if (!existing.channels.some((c) => c.id === ch.id)) existing.channels.push(ch);
      }
      return;
    }
    this.list.push(server);
    this.list.sort(
      (a, b) => (b.is_default ?? 0) - (a.is_default ?? 0) || a.id - b.id
    );
    this.persistLocal();
  }

  async load() {
    this.restoreLocal();
    try {
      const servers = await fetchServers();
      // Global (default) server first, then by id, so the landing channel is stable.
      this.list = [...servers].sort((a, b) => (b.is_default ?? 0) - (a.is_default ?? 0) || a.id - b.id);
      this.persistLocal();
    } catch (e) {
      console.error(e);
    } finally {
      this.loaded = true;
    }
  }

  applyChannelCreated(serverId: number, channel: ServerChannel) {
    const server = this.serverOf(serverId);
    if (server && !server.channels.some((c) => c.id === channel.id)) {
      server.channels.push(channel);
    }
  }

  applyChannelRenamed(serverId: number, channel: ServerChannel) {
    const server = this.serverOf(serverId);
    const found = server?.channels.find((c) => c.id === channel.id);
    if (found) found.name = channel.name;
  }

  applyChannelDeleted(serverId: number, channelId: number) {
    const server = this.serverOf(serverId);
    if (server) server.channels = server.channels.filter((c) => c.id !== channelId);
  }

  /** Applies owner edits broadcast via `server_updated` (icon, visibility). */
  applyUpdated(server: Server) {
    const existing = this.serverOf(server.id);
    if (!existing) {
      this.upsert(server);
      return;
    }
    existing.name = server.name;
    existing.avatar = server.avatar;
    existing.is_public = server.is_public;
    for (const ch of server.channels) {
      if (!existing.channels.some((c) => c.id === ch.id)) existing.channels.push(ch);
    }
    this.persistLocal();
  }

  /**
   * Removes a server the user was kicked from (clearing cached messages for
   * its channels). Returns the channel ids that were dropped.
   */
  removeServer(serverId: number): string[] {
    const srv = this.serverOf(serverId);
    if (!srv) return [];
    const channels = srv.channels.map((c) => String(c.id));
    channels.forEach((id) => messages.clearChannel(id));
    this.list = this.list.filter((s) => s.id !== serverId);
    this.persistLocal();
    return channels;
  }
}

export const servers = new Servers();