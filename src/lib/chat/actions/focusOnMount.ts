export function focusOnMount(node: HTMLInputElement | HTMLTextAreaElement) {
  node.focus();
  const len = node.value.length;
  node.setSelectionRange(len, len);
}
