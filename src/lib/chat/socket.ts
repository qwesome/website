import { io, type Socket } from 'socket.io-client';
import { SERVER_URL } from './config';
import { auth } from './state/auth.svelte';
import { messages } from './state/messages.svelte';
import { presence } from './state/presence.svelte';
import { avatars } from './state/avatars.svelte';
import { handleIncoming } from './notify';
import type { Message, MessageId, OutgoingMessage, Status } from './types';

let socket: Socket | null = null;

export function connect() {
  if (socket) return;
  socket = io(SERVER_URL, { auth: { token: auth.token } });

  // Re-announce on every (re)connect so the server re-adds us to our DM room.
  socket.on('connect', () => socket?.emit('user_joined', auth.user));

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
  socket.on('avatar_update', ({ username, avatar }: { username: string; avatar: string | null }) =>
    avatars.set(username, avatar)
  );
}

export function disconnect() {
  socket?.disconnect();
  socket = null;
}

// NOTE: `author` and `isAdmin` are sent ONLY because the current server trusts
// them. Once the server derives both from the authenticated socket, delete them
// from the three emitters below.
export function sendMessage(msg: OutgoingMessage) {
  socket?.emit('chat_message', { ...msg, author: auth.user, isAdmin: auth.adminMode });
}

export function editMessage(p: { id: MessageId; channel: string; newText: string }) {
  socket?.emit('edit_message', { ...p, author: auth.user, isAdmin: auth.adminMode });
}

export function deleteMessage(p: { id: MessageId; channel: string }) {
  socket?.emit('delete_message', { ...p, author: auth.user, isAdmin: auth.adminMode });
}

export function setStatus(status: 'online' | 'away') {
  socket?.emit('update_status', status);
}
