import { auth } from './state/auth.svelte';
import { appearance } from './state/appearance.svelte';
import { ui } from './state/ui.svelte';
import { unread } from './state/unread.svelte';
import { conversations } from './state/conversations.svelte';
import { findNotifySound } from './notifySounds';
import type { Message } from './types';

let notified = false;
let audio: HTMLAudioElement | null = null;
let lastSound = 0;

export function resetNotified() {
  notified = false;
}

/** Plays the notification sound if the user enabled it. Throttled so a burst of
 *  messages doesn't stack up. The audio file is intentionally a placeholder. */
function playSound() {
  const sound = findNotifySound(appearance.notificationSound);
  if (!sound) return;
  const now = Date.now();
  if (now - lastSound < 1200) return;
  lastSound = now;
  try {
    if (!audio || audio.getAttribute('src') !== sound.file) audio = new Audio(sound.file);
    audio.volume = Math.min(1, Math.max(0, appearance.notificationVolume));
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    /* audio unavailable */
  }
}

export function handleIncoming(msg: Message) {
  const isDm = msg.channel.startsWith('dm:');
  const mine = msg.author === auth.user;
  if (isDm) conversations.load();

  const viewing = msg.channel === ui.activeChannel && ui.focused;
  if (viewing) unread.clear(msg.channel);
  else if (!mine) unread.inc(msg.channel);

  if (!mine && !viewing) playSound();

  if (
    isDm &&
    !mine &&
    !ui.focused &&
    appearance.desktopNotifications &&
    !notified &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  ) {
    new Notification(`DM from ${msg.author}`, { body: msg.text || 'sent an image', tag: 'chat-alert' });
    notified = true;
  }
}
