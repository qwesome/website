export function focusOnMount(node: HTMLInputElement | HTMLTextAreaElement, enabled = true) {
  if (!enabled) return;
  node.focus();
  const len = node.value.length;
  node.setSelectionRange(len, len);
}
