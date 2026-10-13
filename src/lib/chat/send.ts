import { sendMessage } from './socket';
import { messages } from './state/messages.svelte';
import { auth } from './state/auth.svelte';
import { ui } from './state/ui.svelte';

/** Optimistically adds the message locally, then sends it. */
export function sendChatMessage(channel: string, content: { text?: string; image?: string }) {
  if (!auth.user) return;
  const tempId = `temp_${Date.now()}_${Math.random()}`;
  const msg = {
    channel,
    text: content.text ?? '',
    image: content.image ?? null,
    ts: Date.now(),
    reply_to: ui.replyingTo?.id ?? null,
    tempId
  };
  // Admin commands get a SYSTEM reply from the server, so no optimistic copy.
  if (channel !== 'admin-panel') {
    messages.addOptimistic({ ...msg, id: tempId, author: auth.user, sending: true });
  }
  sendMessage(msg);
  ui.replyingTo = null;
}
