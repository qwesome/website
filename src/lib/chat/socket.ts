import { io, type Socket } from 'socket.io-client';
import { goto } from '$app/navigation';
import { SERVER_URL } from './config';
import { auth } from './state/auth.svelte';
import { messages } from './state/messages.svelte';
import { presence } from './state/presence.svelte';
import { avatars } from './state/avatars.svelte';
import { servers } from './state/servers.svelte';
import { friends } from './state/friends.svelte';
import { ui } from './state/ui.svelte';
import { profiles } from './state/profiles.svelte';
import { fetchStatuses } from './api/status';
import { handleIncoming } from './notify';
import { channelHref, homeHref } from './utils/route';
import type { Message, MessageId, OutgoingMessage, Server, ServerChannel, Status } from './types';

let socket: Socket | null = null;

type ChannelCreatedPayload = { serverId: number; channel: ServerChannel };
type ChannelRenamedPayload = { serverId: number; channel: ServerChannel };
type ChannelDeletedPayload = { serverId: number; channelId: number };

export function connect() {
  if (socket) return;
  socket = io(SERVER_URL, { auth: { token: auth.token } });

  // Re-announce on every (re)connect so the server re-adds us to our DM room.
  socket.on('connect', () => {
    socket?.emit('user_joined', auth.user);
    socket?.emit('refresh_servers');
    void fetchStatuses().then((s) => presence.setCustomMap(s));
  });

  socket.on('chat_message', (msg: Message) => {
    messages.receive(msg);
    handleIncoming(msg);
  });
  socket.on('message_deleted', ({ id, channel }: { id: MessageId; channel: string }) =>
    messages.remove(channel, id)
  );
  socket.on('message_edited', ({ id, channel, newText }: { id: MessageId; channel: string; newText: string }) =>
    messages.edit(channel, id, newText)
  );
  socket.on('active_users', (map: Record<string, Status>) => presence.set(map));
  socket.on('presence_status', (p: { username: string; emoji: string; text: string; expires: number | null }) =>
    presence.setCustom(p.username, { emoji: p.emoji, text: p.text, expires: p.expires })
  );
  socket.on('profile_update', (p: { username: string } & Record<string, unknown>) =>
    profiles.patch(p.username, p)
  );
  socket.on('avatar_update', ({ username, avatar }: { username: string; avatar: string | null }) =>
    avatars.set(username, avatar)
  );
  socket.on('channel_created', ({ serverId, channel }: ChannelCreatedPayload) =>
    servers.applyChannelCreated(serverId, channel)
  );
  socket.on('channel_renamed', ({ serverId, channel }: ChannelRenamedPayload) =>
    servers.applyChannelRenamed(serverId, channel)
  );
  socket.on('channel_deleted', ({ serverId, channelId }: ChannelDeletedPayload) => {
    servers.applyChannelDeleted(serverId, channelId);
    messages.clearChannel(String(channelId));
  });
  socket.on('friend_update', () => friends.load());
  socket.on('server_updated', ({ server }: { server: Server }) => servers.applyUpdated(server));
  socket.on('server_member_added', () => servers.bumpMembers());
  socket.on('server_member_removed', () => servers.bumpMembers());
  socket.on('messages_purged', ({ author }: { author: string }) => messages.purgeAuthor(author));

  // A server we were in got deleted by its owner: drop it and, if we were
  // looking at one of its channels, land somewhere safe.
  function dropServer(serverId: number) {
    const channels = servers.removeServer(serverId);
    if (channels.includes(ui.activeChannel ?? '')) {
      const def = servers.defaultChannel();
      goto(def ? channelHref(def.server.id, def.channel.id) : homeHref());
    }
  }

  socket.on('server_kicked', ({ serverId }: { serverId: number }) => dropServer(serverId));
  socket.on('server_left', ({ serverId }: { serverId: number }) => dropServer(serverId));
  socket.on('server_deleted', ({ serverId }: { serverId: number }) => dropServer(serverId));
  // Admin wiped every non-default server: reload the list and land home if the
  // channel we were viewing disappeared.
  socket.on('servers_cleared', () => {
    const viewing = ui.activeChannel;
    void servers.load().then(() => {
      if (viewing && !servers.list.some((s) => s.channels.some((c) => String(c.id) === viewing))) {
        goto(homeHref());
      }
    });
  });
}

export function disconnect() {
  socket?.disconnect();
  socket = null;
}

/** Asks the server to re-add this socket to any server rooms it just joined. */
export function refreshServers() {
  socket?.emit('refresh_servers');
}

// The server derives `author` and `isAdmin` from the socket's session token,
// so the payloads below carry no client-supplied identity.
export function sendMessage(msg: OutgoingMessage) {
  socket?.emit('chat_message', msg);
}

export function editMessage(p: { id: MessageId; channel: string; newText: string }) {
  socket?.emit('edit_message', p);
}

export function deleteMessage(p: { id: MessageId; channel: string }) {
  socket?.emit('delete_message', p);
}

export function setStatus(status: 'online' | 'away') {
  socket?.emit('update_status', status);
}
