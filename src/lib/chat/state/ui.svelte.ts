import { MOBILE_BREAKPOINT } from '../config';
import type { Message } from '../types';

class UiState {
  sidebarOpen = $state(false);
  lightboxSrc = $state<string | null>(null);
  replyingTo = $state<Message | null>(null);
  windowWidth = $state(1024);
  /** live horizontal drag distance while swiping the mobile sidebar */
  dragDx = $state<number | null>(null);
  focused = $state(true);
  activeChannel = $state<string | null>(null);
  /** Right-click profile menu target: { x, y, user } or null while closed. */
  contextMenu = $state<{ x: number; y: number; user: string } | null>(null);
  /** User whose full profile popup is open. */
  profileUser = $state<string | null>(null);

  openContextMenu(x: number, y: number, user: string) {
    this.contextMenu = { x, y, user };
  }

  closeContextMenu() {
    this.contextMenu = null;
  }

  showProfile(user: string) {
    this.contextMenu = null;
    this.profileUser = user;
  }

  get isMobile() {
    return this.windowWidth <= MOBILE_BREAKPOINT;
  }
}

export const ui = new UiState();
