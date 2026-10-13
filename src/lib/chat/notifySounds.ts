// Notification sounds available in Settings > Chat.
// Add an entry here (and drop the matching file in /static) to offer a new one.
// `id` is stored in settings; `name` is shown in the dropdown; `file` is played.
export const NOTIFY_SOUNDS: { id: string; name: string; file: string }[] = [
  { id: 'miraclei', name: 'Miraclei', file: '/notification-sounds/miraclei.mp3' },
  { id: 'iphone', name: 'iPhone', file: '/notification-sounds/iphone.mp3' },
  { id: 'fears-to-fathom', name: 'Fears to Fathom', file: '/notification-sounds/fears-to-fathom.mp3' },
  { id: 'fart', name: 'Fart', file: '/notification-sounds/fart.mp3' },
  { id: 'discord', name: 'Discord', file: '/notification-sounds/discord.mp3' },
  { id: 'apple-ding', name: 'Apple Ding', file: '/notification-sounds/apple-ding.mp3' },
  { id: 'android-legacy', name: 'Android Legacy', file: '/notification-sounds/android-legacy.mp3' },
  { id: 'steam', name: 'Steam', file: '/notification-sounds/steam.mp3' },
  { id: 'snapchat', name: 'Snapchat', file: '/notification-sounds/snapchat.mp3' },
  { id: 'samsung-spaceline', name: 'Samsung Spaceline', file: '/notification-sounds/samsung-spaceline.mp3' },
  { id: 'samsung-goofy', name: 'Samsung Goofy', file: '/notification-sounds/samsung-goofy.mp3' },
  { id: 'motarola', name: 'Motarola', file: '/notification-sounds/motarola.mp3' },
  { id: 'twitter', name: 'Twitter', file: '/notification-sounds/twitter.mp3' },
  { id: 'telegram', name: 'Telegram', file: '/notification-sounds/telegram.mp3' },
  { id: 'whatsapp-whistle', name: 'WhatsApp Whistle', file: '/notification-sounds/whatsapp-whistle.mp3' },
  { id: 'xbox', name: 'Xbox', file: '/notification-sounds/xbox.mp3' }
];

export const NOTIFY_OFF = 'off';

export function findNotifySound(id: string) {
  return NOTIFY_SOUNDS.find((s) => s.id === id);
}
