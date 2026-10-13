import { auth } from '../state/auth.svelte';
import { ui } from '../state/ui.svelte';

/** Drag the mobile sidebar open/closed with a horizontal swipe. */
export function swipeSidebar(node: HTMLElement) {
  let startX = 0;
  let startY = 0;
  let horizontal: boolean | null = null;
  let active = false;

  const start = (e: TouchEvent) => {
    if (!ui.isMobile || !auth.user) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    horizontal = null;
    active = true;
  };

  const move = (e: TouchEvent) => {
    if (!active) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    if (horizontal === null) {
      const dx = Math.abs(x - startX);
      const dy = Math.abs(y - startY);
      if (dx > 5 || dy > 5) horizontal = dx > dy;
    }
    if (horizontal) ui.dragDx = x - startX;
  };

  const end = () => {
    if (!active) return;
    active = false;
    const dx = ui.dragDx ?? 0;
    ui.dragDx = null;
    const third = ui.windowWidth / 3;
    if (!ui.sidebarOpen && dx > third) ui.sidebarOpen = true;
    else if (ui.sidebarOpen && dx < -third) ui.sidebarOpen = false;
  };

  node.addEventListener('touchstart', start, { passive: true });
  node.addEventListener('touchmove', move, { passive: true });
  node.addEventListener('touchend', end);
  node.addEventListener('touchcancel', end);
  return {
    destroy() {
      node.removeEventListener('touchstart', start);
      node.removeEventListener('touchmove', move);
      node.removeEventListener('touchend', end);
      node.removeEventListener('touchcancel', end);
    }
  };
}
