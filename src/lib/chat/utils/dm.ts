/**
 * Stable DM channel id: "dm:<a>:<b>" with the two names sorted.
 * (Sorting only the names keeps the "dm:" prefix first. Sorting 'dm' together
 * with the names could produce ids like "alice:dm:bob" that the server
 * wouldn't recognise as DMs.)
 */
export function dmId(me: string, other: string): string {
  return ['dm', ...[me, other].sort()].join(':');
}
