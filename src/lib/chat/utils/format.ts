export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max) + '...' : s);
