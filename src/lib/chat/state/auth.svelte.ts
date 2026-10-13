import { STORAGE } from '../config';

class AuthState {
  user = $state<string | null>(null);
  token = $state<string | null>(null);
  isAdmin = $state(false);
  adminMode = $state(false);
  /** false until localStorage has been read, so we don't flash the login form */
  ready = $state(false);

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
    try {
      localStorage.setItem(STORAGE.user, user);
      localStorage.setItem(STORAGE.admin, String(isAdmin));
      if (token) localStorage.setItem(STORAGE.token, token);
      else localStorage.removeItem(STORAGE.token);
    } catch {
      /* storage unavailable */
    }
  }

  clear() {
    this.user = null;
    this.token = null;
    this.isAdmin = false;
    this.adminMode = false;
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
