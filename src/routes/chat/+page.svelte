<script>
  import { onMount, tick } from 'svelte';
  import { io } from 'socket.io-client';

  let currentUser = null;
  let activeChat = { type: 'channel', id: 'global' };
  let username = '', password = '', authError = '', isRegistering = false;
  let socket, messageContainer;
  let userState = {}, messageStore = { global: [] }, msgInput = '';
  let isFocused = true, hasNotified = false, unreadChats = {};
  let textareaElement;

  // Avatar state
  let avatarCache = {};      // username -> base64 string or null
  let avatarFileInput;
  let avatarError = '';

  const SERVER_URL = 'https://api.studiobean.com';

  const handleFocus = () => { isFocused = true; hasNotified = false; };
  const handleBlur = () => { isFocused = false; };

  const handleGlobalKeyDown = (e) => {
    if (!currentUser || !textareaElement) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1) textareaElement.focus();
  };

  onMount(() => {
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleGlobalKeyDown);
    const saved = localStorage.getItem('chat_user');
    if (saved) { currentUser = saved; fetchAvatar(saved); connectWebSocket(); }
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  });

  async function fetchAvatar(user) {
    if (user in avatarCache) return;
    avatarCache[user] = null; // mark as in-flight to avoid duplicate requests
    try {
      const res = await fetch(`${SERVER_URL}/api/avatar/${encodeURIComponent(user)}`);
      if (res.ok) {
        const data = await res.json();
        avatarCache = { ...avatarCache, [user]: data.avatar || null };
      }
    } catch {}
  }

  async function scrollToBottom() {
    await tick();
    if (messageContainer) messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  async function authenticate() {
    authError = '';
    username = username.toLowerCase().replace(/\s/g, '').slice(0, 20);
    if (!username || !password) { authError = 'all fields required'; return; }
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(`${SERVER_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) { authError = data.message || 'Auth failed'; return; }
      currentUser = username;
      localStorage.setItem('chat_user', currentUser);
      username = ''; password = ''; isRegistering = false;
      if ("Notification" in window && Notification.permission !== "granted") Notification.requestPermission();
      fetchAvatar(currentUser);
      connectWebSocket();
    } catch (err) { authError = 'Server connection error.'; }
  }

  function logout() {
    currentUser = null;
    localStorage.removeItem('chat_user');
    unreadChats = {};
    avatarCache = {};
    Object.values(userState).forEach(s => { if (s.timeoutId) clearTimeout(s.timeoutId); });
    userState = {};
    if (socket) { socket.off(); socket.disconnect(); socket = null; }
  }

  function connectWebSocket() {
    if (socket?.connected) return;
    socket = io(SERVER_URL);
    socket.emit('user_joined', currentUser);

    socket.on('chat_message', (msg) => {
      const channelId = msg.channel;
      messageStore = { ...messageStore, [channelId]: [...(messageStore[channelId] ?? []), msg] };
      if (
        channelId.startsWith('dm:') && !isFocused && !hasNotified &&
        msg.author !== currentUser && "Notification" in window && Notification.permission === "granted"
      ) {
        new Notification(`DM from ${msg.author}`, { body: msg.text, tag: 'chat-alert' });
        hasNotified = true;
      }
      if (channelId !== activeChat.id) { unreadChats = { ...unreadChats, [channelId]: true }; }
      if (channelId === activeChat.id) scrollToBottom();
    });

    socket.on('active_users', (serverUsers) => {
      serverUsers.forEach(u => {
        if (userState[u]?.timeoutId) clearTimeout(userState[u].timeoutId);
        userState[u] = { status: 'online', timeoutId: null };
        fetchAvatar(u);
      });
      Object.keys(userState).forEach(u => {
        if (!serverUsers.includes(u) && userState[u].status === 'online') {
          const tid = setTimeout(() => { delete userState[u]; userState = { ...userState }; }, 60000);
          userState[u] = { status: 'offline', timeoutId: tid };
        }
      });
      userState = { ...userState };
    });

    // Live avatar updates broadcast by the server
    socket.on('avatar_update', ({ username: u, avatar }) => {
      avatarCache = { ...avatarCache, [u]: avatar };
    });
  }

  function openChannel(id) { activeChat = { type: 'channel', id }; unreadChats = { ...unreadChats, [id]: false }; scrollToBottom(); }
  function openDM(user) { const id = dmId(user); activeChat = { type: 'dm', id, name: user }; unreadChats = { ...unreadChats, [id]: false }; scrollToBottom(); }
  function dmId(user) { return ['dm', currentUser, user].sort().join(':'); }

  $: visibleUsers = Object.keys(userState).filter(u => u !== currentUser);
  $: messages = messageStore[activeChat.id] ?? [];
  $: chatLabel = activeChat.type === 'channel' ? '#' + activeChat.id : activeChat.name;
  $: inputPlaceholder = activeChat.type === 'dm' ? `message @${activeChat.name}` : `message #${activeChat.id}`;
  $: charCount = msgInput.length;
  $: nearLimit = charCount >= 3500;
  $: overWarning = charCount >= 3800;
  $: myAvatar = currentUser ? avatarCache[currentUser] : null;

  function autoResize(e) {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
    if (el.scrollHeight > 150) el.style.overflowY = 'auto';
    else el.style.overflowY = 'hidden';
  }

  function send() {
    const text = msgInput.trim();
    if (!text || !currentUser) return;
    const msg = { channel: activeChat.id, author: currentUser, text, ts: Date.now() };
    messageStore = { ...messageStore, [activeChat.id]: [...(messageStore[activeChat.id] ?? []), msg] };
    if (socket) socket.emit('chat_message', msg);
    msgInput = '';
    if (textareaElement) {
      textareaElement.style.height = 'auto';
      textareaElement.style.overflowY = 'hidden';
    }
    scrollToBottom();
  }

  function onKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
  function formatTime(ts) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  function parseMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/gs, '<em>$1</em>')
      .replace(/~~(.+?)~~/gs, '<s>$1</s>')
      .replace(/`(.+?)`/gs, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  // Message image upload
  let fileInput;
  let imageError = '';

  function triggerFileInput() { fileInput.click(); }

  function onFileChange(e) {
    imageError = '';
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { imageError = 'only image files allowed'; fileInput.value = ''; return; }
    if (file.size > 1024 * 1024) { imageError = 'image must be under 1mb'; fileInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const msg = { channel: activeChat.id, author: currentUser, image: reader.result, ts: Date.now() };
      messageStore = { ...messageStore, [activeChat.id]: [...(messageStore[activeChat.id] ?? []), msg] };
      if (socket) socket.emit('chat_message', msg);
      scrollToBottom();
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }

  // Avatar upload
  function triggerAvatarUpload() {
    avatarError = '';
    avatarFileInput.click();
  }

  function onAvatarFileChange(e) {
    avatarError = '';
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { avatarError = 'only images allowed'; avatarFileInput.value = ''; return; }
    if (file.size > 1024 * 1024) { avatarError = 'must be under 1mb'; avatarFileInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      try {
        const res = await fetch(`${SERVER_URL}/api/avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUser, avatar: base64 })
        });
        if (res.ok) {
          avatarCache = { ...avatarCache, [currentUser]: base64 };
        } else {
          const data = await res.json();
          avatarError = data.message || 'upload failed';
        }
      } catch { avatarError = 'upload failed'; }
    };
    reader.readAsDataURL(file);
    avatarFileInput.value = '';
  }

  async function clearAvatar() {
    avatarError = '';
    try {
      const res = await fetch(`${SERVER_URL}/api/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, avatar: null })
      });
      if (res.ok) {
        avatarCache = { ...avatarCache, [currentUser]: null };
      } else {
        const data = await res.json();
        avatarError = data.message || 'remove failed';
      }
    } catch { avatarError = 'remove failed'; }
  }

  let lightboxSrc = null;
</script>

<svelte:head>
  <title>𝚞𝚗𝚋𝚕𝚘𝚌𝚔𝚎𝚍 𝚌𝚑𝚊𝚝</title>
  <link rel="icon" type="image/png" href="/chat-favicon.png" />
</svelte:head>

{#if !currentUser}
<div class="auth">
  <div class="auth-box">
    <h2>unblocked chat</h2>
    <label for="u">username</label>
    <input id="u" type="text" placeholder="your_handle" bind:value={username} oninput={() => username = username.toLowerCase().replace(/\s/g, '')} onkeydown={(e) => e.key === 'Enter' && authenticate()} />
    <label for="p">password</label>
    <input id="p" type="password" placeholder="••••••••" bind:value={password} onkeydown={(e) => e.key === 'Enter' && authenticate()} />
    <button onclick={authenticate}>{isRegistering ? 'register' : 'sign in'}</button>
    <div class="auth-toggle">
      {isRegistering ? 'already have an account?' : 'need an account?'}
      <span class="auth-link" role="button" tabindex="0" onclick={() => { isRegistering = !isRegistering; authError = ''; }}>{isRegistering ? 'sign in' : 'register'}</span>
    </div>
    <p class="auth-error">{authError}</p>
  </div>
</div>
{:else}
<div class="app">
  <div class="sidebar">
    <div class="sidebar-header">unblocked chat</div>
    <div class="section-label">channels</div>
    <div class="nav-item" class:active={activeChat.id === 'global'} onclick={() => openChannel('global')}>
      <span class="hash">#</span> global {#if unreadChats['global']}<span class="unread-dot"></span>{/if}
    </div>
    <div class="section-label">direct messages</div>
    {#each visibleUsers as u}
      <div class="nav-item" class:active={activeChat.id === dmId(u)} onclick={() => openDM(u)}>
        <span class="dot {userState[u].status}"></span>{u} {#if unreadChats[dmId(u)]}<span class="unread-dot"></span>{/if}
      </div>
    {/each}
    <div class="sidebar-footer">
      <div class="avatar-wrap">
        <button class="footer-avatar" onclick={triggerAvatarUpload} title="Change Profile Picture">
          {#if myAvatar}
            <img src={myAvatar} alt="your avatar" />
          {:else}
            <span>{currentUser[0].toUpperCase()}</span>
          {/if}
          <div class="avatar-overlay">+</div>
        </button>
        {#if myAvatar}
          <button class="avatar-clear" onclick={clearAvatar} title="Remove Profile Picture">x</button>
        {/if}
      </div>
      <input type="file" accept="image/*" bind:this={avatarFileInput} onchange={onAvatarFileChange} style="display:none" />
      <div class="footer-info">
        <span class="footer-name">{currentUser}</span>
        {#if avatarError}<span class="avatar-error">{avatarError}</span>{/if}
      </div>
      <button class="logout-btn" onclick={logout}>↩</button>
    </div>
  </div>
  <div class="chat">
    <div class="chat-header">{chatLabel}</div>
    <div class="messages" bind:this={messageContainer}>
      {#if messages.length === 0}<div class="empty">no messages yet</div>{/if}
      {#each messages as m (m.ts + m.author)}
        <div class="msg" class:self={m.author === currentUser}>
          <div class="msg-avatar">
            {#if avatarCache[m.author]}
              <img src={avatarCache[m.author]} alt={m.author} />
            {:else}
              {m.author[0].toUpperCase()}
            {/if}
          </div>
          <div class="msg-body">
            <div class="msg-meta"><span class="msg-author" data-author={m.author}>{m.author}</span><span class="msg-time">{formatTime(m.ts)}</span></div>
            {#if m.image}
              <img class="msg-image" src={m.image} alt="uploaded" onclick={() => lightboxSrc = m.image} />
            {:else}
              <div class="msg-bubble">{@html parseMarkdown(m.text)}</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
    <div class="input-bar">
      <div class="input-wrap">
        <textarea
          bind:this={textareaElement}
          rows="1"
          maxlength="4000"
          placeholder={inputPlaceholder}
          bind:value={msgInput}
          onkeydown={onKey}
          oninput={autoResize}>
        </textarea>
        <input type="file" accept="image/*" bind:this={fileInput} onchange={onFileChange} style="display:none" />
        <button class="upload-btn" onclick={triggerFileInput} title="upload image">+</button>
        <button class="send-btn" onclick={send}>↩</button>
      </div>
      {#if imageError}<div class="char-count" style="color:var(--red)">{imageError}</div>{/if}
      {#if nearLimit}<div class="char-count" class:warn={overWarning}>{charCount}/4000</div>{/if}
    </div>
  </div>
</div>
{/if}

{#if lightboxSrc}
<div class="lightbox" onclick={() => lightboxSrc = null}>
  <img src={lightboxSrc} alt="full size" />
</div>
{/if}

<style>
  :root { --crust: #181926; --mantle: #1e2030; --base: #24273a; --surface0: #363a4f; --surface1: #494d64; --surface2: #5b6078; --overlay0: #6e738d; --overlay1: #8087a2; --subtext0: #a5adcb; --text: #cad3f5; --lavender: #b7bdf8; --blue: #8aadf4; --mauve: #c6a0f6; --green: #a6da95; --teal: #8bd5ca; --red: #ed8796; --peach: #f5a97f; --yellow: #eed49f; }
  :global(html), :global(body) { margin: 0; padding: 0; width: 100vw; height: 100vh; background: var(--base); color: var(--subtext0); overflow: hidden; font-family: monospace; font-size: 15px; }
  * { box-sizing: border-box; margin: 0; padding: 0; outline: none !important; font-family: monospace !important; }
  .auth { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--base); }
  .auth-box { width: 360px; background: var(--mantle); border: 1px solid var(--surface0); padding: 40px; }
  .auth-box h2 { color: var(--mauve); font-size: 14px; letter-spacing: .15em; margin-bottom: 28px; }
  .auth-box label { display: block; font-size: 11px; color: var(--overlay0); margin-bottom: 7px; text-transform: uppercase; }
  .auth-box input { all: unset; box-sizing: border-box; display: block; width: 100%; background: var(--crust); border: 1px solid var(--surface0); color: var(--text); font-size: 15px; padding: 12px 14px; margin-bottom: 18px; }
  .auth-box button { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 14px; background: var(--mauve); color: var(--crust); font-size: 14px; font-weight: bold; cursor: pointer; text-align: center; }
  .auth-box button:hover { background: var(--lavender); }
  .auth-toggle { margin-top: 20px; text-align: center; font-size: 11px; color: var(--overlay0); }
  .auth-link { all: unset; color: var(--mauve); cursor: pointer; text-decoration: underline; margin-left: 4px; }
  .auth-error { color: var(--red); font-size: 12px; margin-top: 12px; text-align: center; min-height: 18px; }
  .app { display: flex; width: 100vw; height: 100vh; background: var(--base); }
  .sidebar { width: 240px; flex-shrink: 0; background: var(--mantle); border-right: 1px solid var(--surface0); display: flex; flex-direction: column; }
  .sidebar-header { padding: 18px 20px; border-bottom: 1px solid var(--surface0); color: var(--mauve); font-size: 13px; font-weight: bold; }
  .section-label { font-size: 10px; text-transform: uppercase; color: var(--surface2); padding: 16px 20px 8px; letter-spacing: 0.1em; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; cursor: pointer; color: var(--overlay0); font-size: 14px; }
  .nav-item:hover { background: var(--surface0); color: var(--text); }
  .nav-item.active { background: var(--surface0); color: var(--mauve); border-left: 3px solid var(--mauve); padding-left: 17px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--surface2); }
  .dot.online { background: var(--green); }
  .dot.offline { background: var(--red); }
  .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); margin-left: auto; }
  .sidebar-footer { margin-top: auto; border-top: 1px solid var(--surface0); padding: 12px 16px; display: flex; align-items: center; gap: 10px; }
  .footer-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .footer-name { color: var(--text); font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .avatar-error { color: var(--red); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .logout-btn { all: unset; cursor: pointer; font-size: 20px; color: var(--overlay0); flex-shrink: 0; }
  .logout-btn:hover { color: var(--red); }
  .avatar-wrap { position: relative; flex-shrink: 0; width: 36px; height: 36px; }
  .footer-avatar { all: unset; position: relative; width: 36px; height: 36px; border-radius: 6px; background: var(--surface0); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: var(--mauve); cursor: pointer; overflow: hidden; border: 1px solid transparent; box-sizing: border-box; }
  .footer-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .footer-avatar span { pointer-events: none; }
  .avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); color: var(--text); font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
  .footer-avatar:hover .avatar-overlay { opacity: 1; }
  .footer-avatar:hover { border-color: var(--mauve); }
.avatar-clear,
.avatar-clear:hover,
.avatar-clear:active,
.avatar-clear:focus,
.avatar-clear:focus-visible {
  all: unset !important;

  position: absolute !important;
  top: -8px !important;
  right: -10px !important;

  color: var(--mauve) !important;
  font-size: 11px !important;
  line-height: 1 !important;

  cursor: pointer !important;
  z-index: 1 !important;

  background: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  appearance: none !important;
}

/* 🔥 THIS is probably what you're missing */
.avatar-clear::before,
.avatar-clear::after,
.avatar-clear:hover::before,
.avatar-clear:hover::after {
  content: none !important;
  display: none !important;
}

/* Force hover color only */
.avatar-clear:hover {
  color: var(--red) !important;
}  .chat { flex: 1; display: flex; flex-direction: column; background: var(--base); min-width: 0; }
  .chat-header { padding: 16px 24px; border-bottom: 1px solid var(--surface0); color: var(--text); font-size: 15px; font-weight: bold; }
  .messages { flex: 1; overflow-y: auto; padding: 20px 0; display: flex; flex-direction: column; scroll-behavior: smooth; }
  .empty { margin: auto; color: var(--surface2); font-size: 14px; opacity: 0.7; }
  .msg { padding: 8px 24px; display: flex; gap: 14px; }
  .msg:hover { background: rgba(255, 255, 255, 0.02); }
  .msg-avatar { width: 36px; height: 36px; border-radius: 6px; background: var(--surface0); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: var(--mauve); flex-shrink: 0; overflow: hidden; }
  .msg-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .msg-body { flex: 1; min-width: 0; }
  .msg-meta { margin-bottom: 4px; display: flex; align-items: baseline; gap: 8px; }
  .msg-author { font-size: 13px; font-weight: bold; color: var(--blue); }
  .msg-author[data-author="orson"] { color: var(--teal); }
  .msg-time { font-size: 11px; color: var(--surface2); }
  .msg-bubble { display: inline-block; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 6px; padding: 10px 14px; font-size: 15px; color: var(--subtext0); line-height: 1.4; max-width: 100%; width: fit-content; word-break: break-word; overflow-wrap: anywhere; }
  .msg-bubble code { background: var(--crust); color: var(--peach); padding: 1px 5px; border-radius: 3px; font-size: 13px; }
  .msg-bubble strong { color: var(--text); font-weight: bold; }
  .msg-bubble em { color: var(--subtext0); font-style: italic; }
  .msg-bubble s { color: var(--surface2); }
  .msg.self .msg-bubble { background: var(--surface0); color: var(--text); }
  .input-bar { padding: 15px 24px 20px; }
  .input-wrap { display: flex; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 8px; align-items: center; }
  .input-wrap:focus-within { border-color: var(--mauve); }
  textarea { all: unset; flex: 1; color: var(--text); font-size: 15px; padding: 12px 18px; resize: none; overflow-y: hidden; overflow-wrap: break-word; word-break: break-word; white-space: pre-wrap; max-height: 150px; box-sizing: border-box; line-height: 1.5; }
  .send-btn { all: unset; border: 2px solid var(--surface0) !important; color: var(--overlay0); padding: 0 20px; cursor: pointer; font-size: 20px; height: 50px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 0 8px 8px 0; align-self: stretch; }
  .send-btn:hover { color: var(--mauve); background: var(--surface0); border-color: var(--mauve) !important; }
  .upload-btn { all: unset; border: 2px solid var(--surface0) !important; color: var(--overlay0); padding: 0 16px; cursor: pointer; font-size: 22px; height: 50px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; align-self: stretch; }
  .upload-btn:hover { color: var(--mauve); background: var(--surface0); border-color: var(--mauve) !important; }
  .char-count { font-size: 11px; color: var(--overlay0); text-align: right; padding: 4px 4px 0; }
  .char-count.warn { color: var(--peach); }
  .msg-image { max-width: 320px; max-height: 240px; border-radius: 6px; cursor: pointer; display: block; border: 1px solid var(--surface0); }
  .msg-image:hover { border-color: var(--mauve); }
  .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100; cursor: pointer; }
  .lightbox img { max-width: 90vw; max-height: 90vh; border-radius: 6px; }
</style>