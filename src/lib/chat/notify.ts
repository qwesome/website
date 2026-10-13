import { auth } from './state/auth.svelte';
import { ui } from './state/ui.svelte';
import { unread } from './state/unread.svelte';
import { conversations } from './state/conversations.svelte';
import type { Message } from './types';

let notified = false;

export function resetNotified() {
  notified = false;
}

export function handleIncoming(msg: Message) {
  const isDm = msg.channel.startsWith('dm:');
  const mine = msg.author === auth.user;
  if (isDm) conversations.load();

  const viewing = msg.channel === ui.activeChannel && ui.focused;
  if (viewing) unread.set(msg.channel, false);
  else if (!mine) unread.set(msg.channel, true);

  if (
    isDm &&
    !mine &&
    !ui.focused &&
    !notified &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  ) {
    new Notification(`DM from ${msg.author}`, { body: msg.text || 'sent an image', tag: 'chat-alert' });
    notified = true;
  }
}
