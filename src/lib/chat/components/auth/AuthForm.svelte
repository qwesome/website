<script lang="ts">
  import { login, register } from '../../api/auth';
  import { ApiError } from '../../api/client';
  import { auth } from '../../state/auth.svelte';

  let username = $state('');
  let password = $state('');
  let error = $state('');
  let registering = $state(false);
  let busy = $state(false);

  async function submit() {
    error = '';
    const name = username.toLowerCase().replace(/\s/g, '').slice(0, 20);
    if (!name || !password) {
      error = 'all fields required';
      return;
    }
    busy = true;
    try {
      const res = registering ? await register(name, password) : await login(name, password);
      auth.setSession(name, registering ? false : !!res.isAdmin, res.token ?? null);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Server connection error.';
    } finally {
      busy = false;
    }
  }
</script>

<div class="auth">
  <form
    class="auth-box"
    onsubmit={(e) => {
      e.preventDefault();
      submit();
    }}
  >
    <h2>unblocked chat</h2>

    <label for="chat-u">username</label>
    <input
      id="chat-u"
      type="text"
      placeholder="your_handle"
      autocomplete="username"
      bind:value={username}
      oninput={() => (username = username.toLowerCase().replace(/\s/g, ''))}
    />

    <label for="chat-p">password</label>
    <input
      id="chat-p"
      type="password"
      placeholder="••••••••"
      autocomplete={registering ? 'new-password' : 'current-password'}
      bind:value={password}
    />

    <button type="submit" class="submit" disabled={busy}>{registering ? 'register' : 'sign in'}</button>

    <div class="toggle">
      {registering ? 'already have an account?' : 'need an account?'}
      <button
        type="button"
        class="link"
        onclick={() => {
          registering = !registering;
          error = '';
        }}>{registering ? 'sign in' : 'register'}</button
      >
    </div>
    <p class="error">{error}</p>
  </form>
</div>

<style>
  .auth { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--base); }
  .auth-box { width: min(360px, 92vw); background: var(--mantle); border: 1px solid var(--surface0); padding: 40px; }
  h2 { color: var(--accent); font-size: 14px; letter-spacing: 0.15em; margin-bottom: 28px; }
  label { display: block; font-size: 11px; color: var(--overlay0); margin-bottom: 7px; text-transform: uppercase; }
  input { all: unset; box-sizing: border-box; display: block; width: 100%; background: var(--crust); border: 1px solid var(--surface0); color: var(--text); font-size: 15px; padding: 12px 14px; margin-bottom: 18px; user-select: text; cursor: text; }
  .submit { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 14px; background: var(--accent); color: var(--crust); font-size: 14px; font-weight: bold; cursor: pointer; text-align: center; }
  .submit:hover { background: var(--lavender); }
  .submit:disabled { opacity: 0.6; cursor: default; }
  .toggle { margin-top: 20px; text-align: center; font-size: 11px; color: var(--overlay0); }
  .link { all: unset; color: var(--accent); cursor: pointer; text-decoration: underline; margin-left: 4px; }
  .error { color: var(--red); font-size: 12px; margin-top: 12px; text-align: center; min-height: 18px; }
</style>
