import { MOBILE_BREAKPOINT } from '../config';
import type { Message, MessageId } from '../types';
import type { IconName } from '../components/ui/icons';

/** A single row in a custom context menu. `separator` draws a divider. */
export type MenuItem = {
  separator?: boolean;
  label?: string;
  icon?: IconName;
  danger?: boolean;
  disabled?: boolean;
  action?: () => void;
};

/** A request to open the shared image picker (upload a file or search Giphy). */
export type ImagePickRequest = {
  title: string;
  /** Fallback glyph shown when there's no image yet (e.g. a username). */
  name: string;
  value?: string | null;
  shape?: 'circle' | 'square';
  /** Longest edge (px) uploaded images are downscaled to before sending. */
  maxDim?: number;
  /** Crop aspect ratio (width / height). Defaults to 1 (square). */
  aspect?: number;
  onpick: (value: string) => void;
};

class UiState {
  sidebarOpen = $state(false);
  lightboxSrc = $state<string | null>(null);
  replyingTo = $state<Message | null>(null);
  windowWidth = $state(1024);
  /** live horizontal drag distance while swiping the mobile sidebar */
  dragDx = $state<number | null>(null);
  focused = $state(true);
  activeChannel = $state<string | null>(null);
  /** Generic right-click menu: { x, y, items } or null while closed. */
  menu = $state<{ x: number; y: number; items: MenuItem[] } | null>(null);
  /** Message id a right-click "Edit" asked to open for editing. */
  editingId = $state<MessageId | null>(null);
  /** User whose full profile popup is open. */
  profileUser = $state<string | null>(null);
  /** Screen position the profile popup should appear near (null = centered). */
  profilePos = $state<{ x: number; y: number } | null>(null);
  /** Open image picker request (avatar / server icon), or null while closed. */
  imagePicker = $state<ImagePickRequest | null>(null);

  /** Open the shared image picker; `onpick` receives the chosen data/remote URL. */
  pickImage(req: ImagePickRequest) {
    this.menu = null;
    this.imagePicker = req;
  }

  closeImagePicker() {
    this.imagePicker = null;
  }

  openMenu(x: number, y: number, items: MenuItem[]) {
    this.menu = { x, y, items };
  }

  closeMenu() {
    this.menu = null;
  }

  /** Ask a message to enter edit mode (handled by MessageItem's effect). */
  requestEdit(id: MessageId) {
    this.editingId = id;
  }

  showProfile(user: string, x?: number, y?: number) {
    this.menu = null;
    this.profileUser = user;
    this.profilePos = x != null && y != null ? { x, y } : null;
  }

  get isMobile() {
    return this.windowWidth <= MOBILE_BREAKPOINT;
  }
}

export const ui = new UiState();
