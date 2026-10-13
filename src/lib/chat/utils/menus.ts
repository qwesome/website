import { goto } from '$app/navigation';
import { requestFriend, respondFriend, removeFriend } from '../api/friends';
import { kickMember } from '../api/servers';
import { deleteMessage } from '../socket';
import { auth } from '../state/auth.svelte';
import { friends } from '../state/friends.svelte';
import { servers } from '../state/servers.svelte';
import { ui, type MenuItem } from '../state/ui.svelte';
import { toast } from '../state/toasts.svelte';
import { dmHref } from './route';
import type { Message } from '../types';

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast('Copied to clipboard', 'success'),
    () => toast('Copy failed', 'error')
  );
}

/** Runs a friend action, shows a toast, then refreshes the friends lists (so the
 *  UI updates even if the `friend_update` socket event never arrives). */
async function withFriends(fn: () => Promise<unknown>, success: string) {
  try {
    await fn();
    toast(success, 'success');
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Something went wrong', 'error');
  }
  await friends.load();
}

/** Menu shown when right-clicking a user in a sidebar list, member list, or a
 *  message's author. */
export function userMenu(username: string): MenuItem[] {
  const me = auth.user ?? '';
  const isMe = username === me;
  const items: MenuItem[] = [
    { label: 'View profile', icon: 'user', action: () => ui.showProfile(username) }
  ];

  if (!isMe) {
    items.push({ label: 'Send message', icon: 'send', action: () => goto(dmHref(username)) });
  }
  items.push({ label: 'Copy username', icon: 'copy', action: () => copy(username) });

  if (!isMe) {
    items.push({ separator: true });
    if (friends.isFriend(username)) {
      items.push({
        label: 'Remove friend',
        icon: 'user-x',
        danger: true,
        action: () => withFriends(() => removeFriend(username), `Removed ${username}`)
      });
    } else if (friends.hasOutgoingTo(username)) {
      items.push({
        label: 'Cancel friend request',
        icon: 'x',
        action: () => withFriends(() => removeFriend(username), 'Friend request cancelled')
      });
    } else if (friends.hasRequestFrom(username)) {
      items.push({
        label: 'Accept friend request',
        icon: 'check',
        action: () => withFriends(() => respondFriend(username, true), `You are now friends with ${username}`)
      });
      items.push({
        label: 'Decline friend request',
        icon: 'x',
        danger: true,
        action: () => withFriends(() => respondFriend(username, false), 'Friend request declined')
      });
    } else {
      items.push({
        label: 'Add friend',
        icon: 'user-plus',
        action: () => withFriends(() => requestFriend(username), `Friend request sent to ${username}`)
      });
    }

    // Kick — only while viewing a server we own.
    const id = Number(ui.activeChannel);
    const cur = Number.isInteger(id) && id > 0 ? servers.channelOf(id) : undefined;
    if (cur && cur.server.owner === me && username !== cur.server.owner) {
      items.push({ separator: true });
      items.push({
        label: `Kick from ${cur.server.name}`,
        icon: 'trash',
        danger: true,
        action: async () => {
          try {
            await kickMember(cur.server.id, username);
            servers.bumpMembers();
            toast(`Kicked ${username}`, 'success');
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Failed to kick member', 'error');
          }
        }
      });
    }
  }

  return items;
}

/** Menu shown when right-clicking a message: message actions first, then the
 *  author's user actions. */
export function messageMenu(m: Message, canModify: boolean, canEdit: boolean): MenuItem[] {
  const items: MenuItem[] = [];

  if (!m.sending) {
    items.push({ label: 'Reply', icon: 'reply', action: () => (ui.replyingTo = m) });
    if (m.text) {
      items.push({ label: 'Copy text', icon: 'copy', action: () => copy(m.text) });
    }
    if (canModify && canEdit && m.text) {
      items.push({ label: 'Edit message', icon: 'edit', action: () => ui.requestEdit(m.id) });
    }
    if (canModify) {
      items.push({
        label: 'Delete message',
        icon: 'trash',
        danger: true,
        action: () => deleteMessage({ id: m.id, channel: m.channel })
      });
    }
    items.push({ separator: true });
  }

  items.push(...userMenu(m.author));
  return items;
}
