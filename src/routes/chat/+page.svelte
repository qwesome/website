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
  let idleTimer;

  // Avatar state
  let avatarCache = {};      // username -> base64 string or null
  let avatarFileInput;
  let avatarError = '';

  // Mobile & Touch State
  let windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  $: isMobile = windowWidth <= 768;
  
  let sidebarOpen = false;
  let viewportInitialized = false;

  function updateViewportHeight() {
    if (typeof window === 'undefined') return;
    const viewport = window.visualViewport;
    const height = viewport?.height ?? window.innerHeight;
    const vh = height * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.height = `${height}px`;
    document.body.style.height = `${height}px`;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    viewportInitialized = true;
  }
  let touchStartX = 0;
  let touchStartY = 0;
  let touchCurrentX = 0;
  let isSwiping = false;
  let isHorizontalSwipe = null;

  const SERVER_URL = 'https://api.studiobean.com';

  const handleFocus = () => { 
    isFocused = true; 
    hasNotified = false; 
    clearTimeout(idleTimer);
    if (socket && currentUser) {
      socket.emit('update_status', 'online');
    }
  };

  const handleBlur = () => { 
    isFocused = false; 
    clearTimeout(idleTimer);
    if (currentUser) {
      idleTimer = setTimeout(() => {
        if (socket) socket.emit('update_status', 'away');
      }, 5000);
    }
  };

  const handleGlobalKeyDown = (e) => {
    if (!currentUser || !textareaElement) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1) textareaElement.focus();
  };

  // Touch Handlers for Mobile Swiping
  function handleTouchStart(e) {
    if (!isMobile || !currentUser) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchCurrentX = touchStartX;
    isHorizontalSwipe = null;
    isSwiping = true;
  }

  function handleTouchMove(e) {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    if (isHorizontalSwipe === null) {
      const dx = Math.abs(currentX - touchStartX);
      const dy = Math.abs(currentY - touchStartY);
      if (dx > 5 || dy > 5) {
        isHorizontalSwipe = dx > dy;
        if (!isHorizontalSwipe) {
          isSwiping = false; // Vertical scroll, cancel swipe tracking
          return;
        }
      } else {
        return; // Wait for intentional movement
      }
    }

    if (isHorizontalSwipe) {
      touchCurrentX = currentX;
    }
  }

  function handleTouchEnd(e) {
    if (!isSwiping) return;
    isSwiping = false;
    const deltaX = touchCurrentX - touchStartX;
    const threshold = windowWidth / 3;

    if (!sidebarOpen) {
      if (deltaX > threshold) sidebarOpen = true;
    } else {
      if (deltaX < -threshold) sidebarOpen = false;
    }
  }

  onMount(() => {
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('scroll', handleScrollBlur, { passive: true });
    window.addEventListener('resize', updateViewportHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
      window.visualViewport.addEventListener('scroll', updateViewportHeight);
    }
    updateViewportHeight();
    const saved = localStorage.getItem('chat_user');
    if (saved) { currentUser = saved; fetchAvatar(saved); connectWebSocket(); }
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('scroll', handleScrollBlur);
      window.removeEventListener('resize', updateViewportHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight);
        window.visualViewport.removeEventListener('scroll', updateViewportHeight);
      }
      clearTimeout(idleTimer);
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
    sidebarOpen = false;
    Object.values(userState).forEach(s => { if (s.timeoutId) clearTimeout(s.timeoutId); });
    userState = {};
    clearTimeout(idleTimer);
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

    socket.on('active_users', (serverUsersMap) => {
      Object.entries(serverUsersMap).forEach(([u, status]) => {
        if (userState[u]?.timeoutId) clearTimeout(userState[u].timeoutId);
        userState[u] = { status: status, timeoutId: null };
        fetchAvatar(u);
      });

      Object.keys(userState).forEach(u => {
        if (!serverUsersMap[u] && userState[u].status !== 'offline') {
          const tid = setTimeout(() => { 
            delete userState[u]; 
            userState = { ...userState }; 
          }, 60000);
          userState[u] = { status: 'offline', timeoutId: tid };
        }
      });
      userState = { ...userState };
    });

    socket.on('avatar_update', ({ username: u, avatar }) => {
      avatarCache = { ...avatarCache, [u]: avatar };
    });
  }

  function openChannel(id) { 
    activeChat = { type: 'channel', id }; 
    unreadChats = { ...unreadChats, [id]: false }; 
    sidebarOpen = false;
    scrollToBottom(); 
  }
  
  function openDM(user) { 
    const id = dmId(user); 
    activeChat = { type: 'dm', id, name: user }; 
    unreadChats = { ...unreadChats, [id]: false }; 
    sidebarOpen = false;
    scrollToBottom(); 
  }
  
  function dmId(user) { return ['dm', currentUser, user].sort().join(':'); }

  $: visibleUsers = Object.keys(userState).filter(u => u !== currentUser);
  $: messages = messageStore[activeChat.id] ?? [];
  $: chatLabel = activeChat.type === 'channel' ? '#' + activeChat.id : activeChat.name;
  function truncatePlaceholder(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1) + '…';
  }

  $: inputPlaceholder = (() => {
    const base = activeChat.type === 'dm' ? `message @${activeChat.name}` : `message #${activeChat.id}`;
    const maxLength = windowWidth < 360 ? 14 : windowWidth < 430 ? 18 : 24;
    return truncatePlaceholder(base, maxLength);
  })();
  $: charCount = msgInput.length;
  $: nearLimit = charCount >= 3500;
  $: overWarning = charCount >= 3800;
  $: myAvatar = currentUser ? avatarCache[currentUser] : null;

  // Reactively calculate sidebar styles for swiping vs resting states
  let sidebarStyle = '';
  $: {
    if (isMobile) {
      if (isSwiping && isHorizontalSwipe) {
        let offset = 0;
        if (!sidebarOpen) {
          offset = -windowWidth + (touchCurrentX - touchStartX);
        } else {
          offset = (touchCurrentX - touchStartX);
        }
        offset = Math.min(0, Math.max(-windowWidth, offset));
        sidebarStyle = `transform: translateX(${offset}px); transition: none;`;
      } else {
        sidebarStyle = sidebarOpen 
          ? `transform: translateX(0); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);` 
          : `transform: translateX(-100%); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);`;
      }
    } else {
      sidebarStyle = ''; // Allow regular CSS on desktop
    }
  }

  function autoResize(e) {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
    if (el.scrollHeight > 150) el.style.overflowY = 'auto';
    else el.style.overflowY = 'hidden';
  }

  function handleButtonPress(event) {
    if (textareaElement) {
      event.preventDefault();
    }
    flashButtonState(event.currentTarget);
  }

  function flashButtonState(button) {
    if (!button) return;
    button.classList.add('selected');
    setTimeout(() => button.classList.remove('selected'), 0);
  }

  function handleUploadClick(event) {
    triggerFileInput();
  }

  function toggleSpoiler(event) {
    const spoiler = event.target.closest('.spoiler');
    if (!spoiler) return;
    spoiler.classList.toggle('revealed');
  }

  function handleScrollBlur() {
    if (textareaElement && document.activeElement === textareaElement) {
      textareaElement.blur();
    }
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
      textareaElement.focus();
    }
    scrollToBottom();
  }

  function onKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
  function formatTime(ts) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

function parseMarkdown(text) {
  const codeBlocks = [];
  const ESC = '\uE000';

  // Extract fenced code blocks first
  text = text.replace(/```([\s\S]+?)```/g, (_, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    codeBlocks.push(
      `<div class="code-block"><pre><code>${escaped}</code></pre></div>`
    );

    return `CODEBLOCK_${codeBlocks.length - 1}_END`;
  });

  // Extract inline code
  text = text.replace(/`([^`]+)`/gs, (_, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    codeBlocks.push(`<code>${escaped}</code>`);
    return `CODEBLOCK_${codeBlocks.length - 1}_END`;
  });

  // HTML escape
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Escape ANY escaped character
  text = text.replace(/\\(.)/g, ESC + '$1');

  // Headings (escape-aware)
  text = text
    .replace(new RegExp(`^${ESC}?### (.+)$`, 'gm'), '<span class="md-heading md-heading-3">$1</span>')
    .replace(new RegExp(`^${ESC}?## (.+)$`, 'gm'), '<span class="md-heading md-heading-2">$1</span>')
    .replace(new RegExp(`^(?!##)# (.+)$`, 'gm'), '<span class="md-heading md-heading-1">$1</span>');

  // Bold + italic FIRST (order matters)
  text = text
    .replace(new RegExp(`(?<!${ESC})\\*\\*\\*(.+?)(?<!${ESC})\\*\\*\\*`, 'g'), '<strong><em>$1</em></strong>')
    .replace(new RegExp(`(?<!${ESC})\\*\\*(.+?)(?<!${ESC})\\*\\*`, 'g'), '<strong>$1</strong>')
    .replace(new RegExp(`(?<!${ESC})\\*(?!\\*)(.+?)(?<!${ESC})\\*`, 'g'), '<em>$1</em>')

    .replace(new RegExp(`(?<!${ESC})__(.+?)(?<!${ESC})__`, 'g'), '<u>$1</u>')
    .replace(new RegExp(`(?<!${ESC})~~(.+?)(?<!${ESC})~~`, 'g'), '<s>$1</s>')
    .replace(new RegExp(`(?<!${ESC})\\|\\|(.+?)(?<!${ESC})\\|\\|`, 'g'), '<span class="spoiler">$1</span>');

  // Greentext
  text = text.replace(/^&gt;(.*?)$/gm, '<span class="greentext">&gt;$1</span>');

  // Minecraft prefix line
  text = text.replace(/^mc:\s*(.*?)$/gm, '<span class="mc-text">$1</span>');

  // Pink text: only if "." is first non-space character
  text = text.replace(/^\s*\.(\s*)(.*?)$/gm, '<span class="pinktext">$2</span>');

  // Inline keyword
  text = text.replace(/\b(minecraft)\b/gi, '<span class="mc-text">$1</span>');

  // Newlines
  text = text.replace(/\n/g, '<br>');

  // Restore escaped chars
  text = text.replace(new RegExp(`${ESC}(.)`, 'g'), '$1');

  // Restore code blocks
  text = text.replace(/CODEBLOCK_(\d+)_END/g, (_, i) => codeBlocks[i]);

  return text;
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

<svelte:window 
  bind:innerWidth={windowWidth} 
  ontouchstart={handleTouchStart} 
  ontouchmove={handleTouchMove} 
  ontouchend={handleTouchEnd} 
/>

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
  <div class="sidebar" style={sidebarStyle}>
    <div class="sidebar-header">
      unblocked chat
      {#if isMobile}
        <button class="mobile-close-btn" onclick={() => sidebarOpen = false}>✕</button>
      {/if}
    </div>
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
      <button class="logout-btn" onclick={logout}>[🠔</button>
    </div>
  </div>
  
  <div class="chat">
    <div class="chat-header">
      {#if isMobile}
        <button class="mobile-menu-btn" onclick={() => sidebarOpen = true}>☰</button>
      {/if}
      {chatLabel}
    </div>
    <div class="messages" bind:this={messageContainer} onclick={toggleSpoiler}>
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
        <button class="upload-btn" type="button" onpointerdown={handleButtonPress} onclick={handleUploadClick} title="upload image">+</button>
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
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100..800&display=swap');
  :root { --crust: #181926; --mantle: #1e2030; --base: #24273a; --surface0: #363a4f; --surface1: #494d64; --surface2: #5b6078; --overlay0: #6e738d; --overlay1: #8087a2; --subtext0: #a5adcb; --text: #cad3f5; --lavender: #b7bdf8; --blue: #8aadf4; --mauve: #c6a0f6; --green: #a6da95; --teal: #8bd5ca; --red: #ed8796; --peach: #f5a97f; --yellow: #eed49f; --pink: #f5bde6; }
  :global(html), :global(body) { margin: 0; padding: 0; width: 100vw; min-height: calc(var(--vh, 1vh) * 100); height: calc(var(--vh, 1vh) * 100); max-height: calc(var(--vh, 1vh) * 100); background: var(--base); color: var(--subtext0); overflow: hidden; overscroll-behavior: none; touch-action: pan-y; font-family: monospace; font-size: 15px; user-select: none; }:global(html), :global(body) { margin: 0; padding: 0; width: 100vw; min-height: calc(var(--vh, 1vh) * 100); height: calc(var(--vh, 1vh) * 100); max-height: calc(var(--vh, 1vh) * 100); background: var(--base); color: var(--subtext0); overflow: hidden; overscroll-behavior: none; touch-action: pan-y; font-family: 'JetBrains Mono', monospace; font-size: 15px; user-select: none; }
  * { box-sizing: border-box; margin: 0; padding: 0; outline: none !important; font-family: inherit; user-select: none; }
  * {
    -webkit-tap-highlight-color: transparent;
  }
  
  .auth { position: fixed; inset: 0; width: 100vw; height: calc(var(--vh, 1vh) * 100); min-height: calc(var(--vh, 1vh) * 100); display: flex; align-items: center; justify-content: center; background: var(--base); }
  .auth-box { width: 360px; background: var(--mantle); border: 1px solid var(--surface0); padding: 40px; }
  .auth-box h2 { color: var(--mauve); font-size: 14px; letter-spacing: .15em; margin-bottom: 28px; }
  .auth-box label { display: block; font-size: 11px; color: var(--overlay0); margin-bottom: 7px; text-transform: uppercase; }
  .auth-box input { all: unset; box-sizing: border-box; display: block; width: 100%; background: var(--crust); border: 1px solid var(--surface0); color: var(--text); font-size: 15px; padding: 12px 14px; margin-bottom: 18px; user-select: text; cursor: text; }
  .auth-box button { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 14px; background: var(--mauve); color: var(--crust); font-size: 14px; font-weight: bold; cursor: pointer; text-align: center; user-select: none; }
  .auth-box button:hover { background: var(--lavender); }
  .auth-toggle { margin-top: 20px; text-align: center; font-size: 11px; color: var(--overlay0); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .auth-link { all: unset; color: var(--mauve); cursor: pointer; text-decoration: underline; margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .auth-error { color: var(--red); font-size: 12px; margin-top: 12px; text-align: center; min-height: 18px; }
  
  .app { position: fixed; inset: 0; display: flex; width: 100vw; height: calc(var(--vh, 1vh) * 100); min-height: calc(var(--vh, 1vh) * 100); background: var(--base); overflow: hidden; }
  
  .sidebar { width: 240px; flex-shrink: 0; background: var(--mantle); border-right: 1px solid var(--surface0); display: flex; flex-direction: column; height: 100%; }
  .sidebar-header { padding: 18px 20px; border-bottom: 1px solid var(--surface0); color: var(--mauve); font-size: 13px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .section-label { font-size: 10px; text-transform: uppercase; color: var(--surface2); padding: 16px 20px 8px; letter-spacing: 0.1em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; cursor: pointer; color: var(--overlay0); font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; user-select: none; }
  .nav-item:hover { background: var(--surface0); color: var(--text); }
  .nav-item.active { background: var(--surface0); color: var(--mauve); border-left: 3px solid var(--mauve); padding-left: 17px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--surface2); }
  .dot.online { background: var(--green); }
  .dot.away { background: var(--yellow); }
  .dot.offline { background: var(--red); }
  .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); margin-left: auto; }
  
  .sidebar-footer { margin-top: auto; border-top: 1px solid var(--surface0); padding: 12px 16px; display: flex; align-items: center; gap: 10px; }
  .footer-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .footer-name { color: var(--text); font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .avatar-error { color: var(--red); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .logout-btn { all: unset; cursor: pointer; font-size: 20px; color: var(--overlay0); flex-shrink: 0; user-select: none; }
  .logout-btn:hover { color: var(--red); }
  
  .avatar-wrap { position: relative; flex-shrink: 0; width: 36px; height: 36px; }
  .footer-avatar { all: unset; position: relative; width: 36px; height: 36px; border-radius: 6px; background: var(--surface0); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: var(--mauve); cursor: pointer; overflow: hidden; border: 1px solid transparent; box-sizing: border-box; user-select: none; }
  .footer-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .footer-avatar span { pointer-events: none; }
  .avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); color: var(--text); font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
  .footer-avatar:hover .avatar-overlay { opacity: 1; }
  .footer-avatar:hover { border-color: var(--mauve); }
  
  .avatar-clear, .avatar-clear:hover, .avatar-clear:active, .avatar-clear:focus, .avatar-clear:focus-visible { all: unset !important; position: absolute !important; top: -8px !important; right: -10px !important; color: var(--mauve) !important; font-size: 11px !important; line-height: 1 !important; cursor: pointer !important; z-index: 1 !important; background: transparent !important; border: none !important; outline: none !important; box-shadow: none !important; appearance: none !important; }
  .avatar-clear::before, .avatar-clear::after, .avatar-clear:hover::before, .avatar-clear:hover::after { content: none !important; display: none !important; }
  .avatar-clear:hover { color: var(--red) !important; }
  
  .chat { flex: 1; display: flex; flex-direction: column; background: var(--base); min-width: 0; }
  .chat-header { padding: 16px 24px; border-bottom: 1px solid var(--surface0); color: var(--text); font-size: 15px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  
  /* Mobile UI Buttons Base */
  .mobile-menu-btn { display: none; all: unset; cursor: pointer; font-size: 22px; margin-right: 12px; color: var(--mauve); line-height: 1; user-select: none; }
  .mobile-close-btn { display: none; all: unset; cursor: pointer; font-size: 18px; color: var(--overlay0); margin-left: auto; line-height: 1; padding: 4px; user-select: none; }
  .mobile-close-btn:hover { color: var(--red); }

  .messages { flex: 1; overflow-y: auto; padding: 20px 0 calc(20px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; scroll-behavior: smooth; scroll-padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px)); overscroll-behavior: contain; }
  .empty { margin: auto; color: var(--surface2); font-size: 14px; opacity: 0.7; }
  .msg { padding: 8px 24px; display: flex; gap: 14px; }
  .msg:hover { background: rgba(255, 255, 255, 0.02); }
  .msg-avatar { width: 36px; height: 36px; border-radius: 6px; background: var(--surface0); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: var(--mauve); flex-shrink: 0; overflow: hidden; }
  .msg-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .msg-body { flex: 1; min-width: 0; }
  .msg-meta { margin-bottom: 4px; display: flex; align-items: baseline; gap: 8px; }
  .msg-author { font-size: 13px; font-weight: bold; color: var(--blue); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; user-select: text; }
  .msg-author[data-author="orson"] { color: var(--teal); }
  .msg-time { font-size: 11px; color: var(--surface2); user-select: text; }
  
.msg-bubble { display: block; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 6px; padding: 10px 14px; font-size: 15px; color: var(--subtext0); line-height: normal; max-width: 100%; width: fit-content; word-wrap: break-word; user-select: text; }
  :global(.msg-bubble code) { background: var(--crust); color: var(--text); padding: 1px 5px; border-radius: 3px; font-size: 15px; white-space: pre-wrap; display: inline-block; max-width: 100%; vertical-align: baseline; } 
  :global(.msg-bubble .code-block) { display: block; background: var(--crust); border: 1px solid var(--surface0); border-radius: 6px; padding: 12px 14px; margin: 6px 0; overflow-x: auto; width: 100%; box-sizing: border-box; }
  :global(.msg-bubble .code-block pre) { margin: 0; padding: 0; background: none; border: none; }
  :global(.msg-bubble .code-block code) { background: none; color: var(--text); padding: 0; font-size: 15px; white-space: pre-wrap; display: block; }
  :global(.md-heading) { display: block; margin: 2px 0; padding: 0; line-height: 1.3; font-weight: bold; color: var(--text); }
  :global(.md-heading-1) { font-size: 2.5em; }
  :global(.md-heading-2) { font-size: 2em; }
  :global(.md-heading-3) { font-size: 1.5em; }
  :global(.msg-bubble strong) { color: var(--text); font-weight: bold; }
  :global(.msg-bubble em) { color: var(--subtext0); font-style: italic; }
  :global(.msg-bubble u) { text-decoration: underline; }
  :global(.msg-bubble s) { color: var(--surface2); text-decoration: line-through; }
  :global(.msg-bubble .spoiler) { background: var(--surface2); color: transparent; text-shadow: 0 0 0 var(--surface2); border-radius: 3px; cursor: pointer; transition: background 0.2s ease, color 0.2s ease, text-shadow 0.2s ease; }
  :global(.msg-bubble .spoiler.revealed) { background: var(--base); color: var(--text); text-shadow: none; }
  :global(.msg-bubble .greentext) { color: var(--green); }
  :global(.msg-bubble .pinktext) { color: var(--pink); }
  .msg.self .msg-bubble { background: var(--surface0); color: var(--text); }

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/jetbrainsmono.ttf') format('truetype');
}

@font-face {
  font-family: 'Minecraft';
  /* Replace this URL with the actual path to your .ttf file once you have it */
  src: url('/minecraft.otf') format('opentype');
}

:global(.msg-bubble .mc-text) { 
  font-family: 'Minecraft', monospace; 
  font-size: 16px; 
  font-weight: normal; /* Kills any accidental bolding */
  font-style: normal; /* Kills any accidental italics */
  line-height: 1.2; /* Keeps the text tightly packed like in-game */
  color: var(--text);
}

  .input-bar { padding: 15px 24px calc(20px + env(safe-area-inset-bottom, 12px)); }
  .input-wrap { display: flex; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 8px; align-items: center; }
  .input-wrap:focus-within { border-color: var(--mauve); }
  textarea { all: unset; flex: 1; color: var(--text); font-size: 15px; padding: 12px 18px; resize: none; overflow-y: hidden; overflow-wrap: break-word; word-break: break-word; white-space: pre-wrap; max-height: 150px; box-sizing: border-box; line-height: 1.5; user-select: text; cursor: text; }
  textarea::placeholder { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .auth-box input { all: unset; box-sizing: border-box; display: block; width: 100%; background: var(--crust); border: 1px solid var(--surface0); color: var(--text); font-size: 15px; padding: 12px 14px; margin-bottom: 18px; user-select: text; cursor: text; }
  .upload-btn { all: unset; border: 2px solid var(--surface0) !important; color: var(--overlay0); padding: 0 16px; cursor: pointer; font-size: 22px; height: 50px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; align-self: stretch; user-select: none; border-radius: 0 8px 8px 0; transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease, opacity 0.25s ease; }
  .upload-btn.selected { color: var(--mauve); background: var(--surface0); border-color: var(--mauve) !important; opacity: 0.85; }
  .char-count { font-size: 11px; color: var(--overlay0); text-align: right; padding: 4px 4px 0; }
  .char-count.warn { color: var(--peach); }
  .msg-image { max-width: 320px; max-height: 240px; border-radius: 6px; cursor: pointer; display: block; border: 1px solid var(--surface0); }
  .msg-image:hover { border-color: var(--mauve); }
  .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100; cursor: pointer; }
  .lightbox img { max-width: 90vw; max-height: 90vh; border-radius: 6px; }

  /* Mobile Exclusive Rules */
  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: calc(var(--vh, 1vh) * 100);
      z-index: 50;
    }
    .sidebar-header {
      display: flex;
      align-items: center;
    }
    .mobile-menu-btn {
      display: inline-block;
    }
    .mobile-close-btn {
      display: inline-block;
    }
    .chat-header {
      display: flex;
      align-items: center;
    }
  }
</style>