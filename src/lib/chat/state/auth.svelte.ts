import { SERVER_URL, STORAGE } from '../config';

class AuthState {
  user = $state<string | null>(null);
  token = $state<string | null>(null);
  isAdmin = $state(false);
  adminMode = $state(false);
  /** false until localStorage has been read, so we don't flash the login form */
  ready = $state(false);
  /** true once the stored session has been validated/refreshed on load */
  validated = $state(false);

  restore() {
    try {
      this.user = localStorage.getItem(STORAGE.user);
      this.token = localStorage.getItem(STORAGE.token);
      this.isAdmin = localStorage.getItem(STORAGE.admin) === 'true';
    } catch {
      /* storage unavailable */
    }
    this.ready = true;
  }

  setSession(user: string, isAdmin: boolean, token: string | null) {
    this.user = user;
    this.isAdmin = isAdmin;
    this.token = token;
    this.adminMode = false;
    this.validated = true;
    try {
      localStorage.setItem(STORAGE.user, user);
      localStorage.setItem(STORAGE.admin, String(isAdmin));
      if (token) localStorage.setItem(STORAGE.token, token);
      else localStorage.removeItem(STORAGE.token);
    } catch {
      /* storage unavailable */
    }
  }

  /**
   * Exchanges the stored session token for a fresh one (each page load mints a
   * new token, launcher-style) and drops the session entirely if it's stale.
   */
  async refresh() {
    if (!this.token) {
      this.validated = true;
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) this.clear();
        return;
      }
      const data = await res.json();
      if (data && data.token) {
        this.setSession(data.username ?? this.user ?? '', Boolean(data.isAdmin), data.token);
      }
    } catch {
      /* server unreachable — keep the stored session, the app will retry socket.io */
    } finally {
      this.validated = true;
    }
  }

  clear() {
    this.user = null;
    this.token = null;
    this.isAdmin = false;
    this.adminMode = false;
    this.validated = false;
    try {
      localStorage.removeItem(STORAGE.user);
      localStorage.removeItem(STORAGE.token);
      localStorage.removeItem(STORAGE.admin);
    } catch {
      /* storage unavailable */
    }
  }
}

export const auth = new AuthState();