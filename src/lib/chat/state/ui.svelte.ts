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

  get isMobile() {
    return this.windowWidth <= MOBILE_BREAKPOINT;
  }
}

export const ui = new UiState();
