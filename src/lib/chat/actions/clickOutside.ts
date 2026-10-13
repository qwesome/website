interface Options {
  onoutside: () => void;
  /** CSS selector of elements that should not count as "outside" */
  ignore?: string;
}

export function clickOutside(node: HTMLElement, options: Options) {
  let opts = options;
  const handler = (e: PointerEvent) => {
    const target = e.target as Element;
    if (node.contains(target)) return;
    if (opts.ignore && target.closest(opts.ignore)) return;
    opts.onoutside();
  };
  document.addEventListener('pointerdown', handler, true);
  return {
    update(next: Options) {
      opts = next;
    },
    destroy() {
      document.removeEventListener('pointerdown', handler, true);
    }
  };
}
