<script>
  import { browser } from '$app/environment';
  import { onMount, tick } from 'svelte';
  import { io } from 'socket.io-client';

  $: if (!userIsAdmin) adminMode = false;

  let activeChat = { type: 'channel', id: 'global' };
  let username = '', password = '', authError = '', isRegistering = false;
  let socket, messageContainer;
  let userState = {}, messageStore = { global: [] }, msgInput = '';
  let isFocused = true, hasNotified = false, unreadChats = {};
  let textareaElement;
  let idleTimer;

  // Pagination & History State
  let channelMeta = {}; 

  // Avatar state
  let avatarCache = {};
  let avatarFileInput;
  let avatarError = '';

  // Mobile & Touch State
  let windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  $: isMobile = windowWidth <= 768;
  
  let sidebarOpen = false;
  let viewportInitialized = false;

  let editingId = null; // ID of the message being edited
  let editInput = '';   // Temporary text holder for the edit

  let pendingDeleteId = null;
  let deleteTimer;

  let adminMode = false;

  let currentUser = typeof localStorage !== 'undefined' ? localStorage.getItem('chat_user') : null;
  let userIsAdmin = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('chat_is_admin') || 'false') : false;

  let pendingHideId = null; // To track which sidebar item is confirming
  let hideTimer;

  // --- Giphy GIF Picker Logic ---
  let showGifPicker = false;
  let gifQuery = '';
  let gifResults = [];
  let gifSearchTimer;
  
  const GIPHY_API_KEY = 'oWs2bVS6WYDiTzwFkXqarN3xbQMZAV8E'; 

  function toggleGifPicker() {
    showGifPicker = !showGifPicker;
    if (showGifPicker && gifResults.length === 0) searchGifs('trending');
  }

  function handleGifInput() {
    clearTimeout(gifSearchTimer);
    gifSearchTimer = setTimeout(() => {
      searchGifs(gifQuery || 'trending');
    }, 500);
  }

  async function searchGifs(query) {
    try {
      const endpoint = query === 'trending' ? 'trending' : 'search';
      const qParam = query === 'trending' ? '' : `&q=${encodeURIComponent(query)}`;
      const res = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?api_key=${GIPHY_API_KEY}${qParam}&limit=20&rating=pg-13`);
      const json = await res.json();
      gifResults = json.data;
    } catch (e) { console.error("Giphy fetch failed", e); }
  }

  function sendGif(gifUrl) {
    const msg = { 
      channel: activeChat.id, 
      author: currentUser, 
      text: '', // Empty text, just the GIF
      image: gifUrl, 
      ts: Date.now(),
      isAdmin: adminMode,
      reply_to: replyingTo ? replyingTo.id : null 
    };
    
    if (socket) socket.emit('chat_message', msg);
    
    // Cleanup and close
    showGifPicker = false;
    gifQuery = '';
    replyingTo = null;
    scrollToBottom();
  }

  async function hideConversation(partnerName) {
    const channelId = dmId(partnerName);
    
    if (pendingHideId === partnerName) {
      try {
        const res = await fetch(`${SERVER_URL}/api/conversations/hide`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUser, channel: channelId })
        });
        if (res.ok) {
          loadRecentConversations(); // Refresh list
          if (activeChat.id === channelId) openChannel('global'); // Kick to global if active
        }
      } catch (e) { console.error(e); }
      pendingHideId = null;
    } else {
      pendingHideId = partnerName;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { pendingHideId = null; }, 3000);
    }
  }

let recentConversations = []; // Array of { username, last_ts }

  async function loadRecentConversations() {
    if (!currentUser) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/conversations/${currentUser}`);
      if (res.ok) {
        recentConversations = await res.json();
        // Fetch avatars for anyone we don't know yet
        recentConversations.forEach(c => fetchAvatar(c.username));
      }
    } catch (e) { console.error(e); }
  }

  // Update deleteMsg to include isAdmin flag
function deleteMsg(msg) {
    // UI Guard: Only proceed if it's your message OR admin mode is toggled on
    if (msg.author !== currentUser && !adminMode) return;

    if (pendingDeleteId === msg.id) {
      if (socket) {
        socket.emit('delete_message', { 
          id: msg.id, 
          channel: msg.channel, 
          author: currentUser,
          isAdmin: adminMode // Tell the server to use admin privileges
        });
      }
      pendingDeleteId = null;
    } else {
      pendingDeleteId = msg.id;
      // Auto-reset after 3s
      clearTimeout(deleteTimer);
      deleteTimer = setTimeout(() => { pendingDeleteId = null; }, 3000);
    }
  }

  // Update saveEdit to include isAdmin flag
function saveEdit() {
    if (!editingId) return;
    
    // Find the message in the store to get its channel/author
    const msg = messages.find(m => m.id === editingId);
    if (!msg) return;

    if (socket) {
      socket.emit('edit_message', { 
        id: editingId, 
        channel: activeChat.id, 
        author: currentUser, 
        newText: editInput,
        isAdmin: adminMode // Pass the admin flag
      });
    }
    editingId = null;
  }
  function updateViewportHeight() {
    if (typeof window === 'undefined') return;
    const height = window.visualViewport?.height ?? window.innerHeight;
    const vh = height * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.height = `${height}px`;
    document.body.style.height = `${height}px`;
  }

  let touchStartX = 0, touchStartY = 0, touchCurrentX = 0;
  let isSwiping = false, isHorizontalSwipe = null;

  const SERVER_URL = 'https://api.studiobean.com';

  const handleFocus = () => { 
    isFocused = true; hasNotified = false; clearTimeout(idleTimer);
    if (socket && currentUser) socket.emit('update_status', 'online');
  };

const handleBlur = () => { 
  isFocused = false; 
  clearTimeout(idleTimer);
  if (currentUser && socket) {
    // Set a timer to go "away" after 5 seconds of tab inactivity
    idleTimer = setTimeout(() => { 
      socket.emit('update_status', 'away'); 
    }, 5000);
  }
};

const handleGlobalKeyDown = (e) => {
    // NEW: If Escape is pressed, cancel the reply (and editing)
    if (e.key === 'Escape') {
      if (replyingTo) cancelReply();
      if (editingId) cancelEdit();
      if (showGifPicker) showGifPicker = false;
      return;
    }

    if (!currentUser || !textareaElement) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    
    // Auto-focus textarea on any letter key
    if (e.key.length === 1) textareaElement.focus();
  };

  function handleTouchStart(e) {
    if (!isMobile || !currentUser) return;
    touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
    touchCurrentX = touchStartX; isHorizontalSwipe = null; isSwiping = true;
  }

  function handleTouchMove(e) {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX, currentY = e.touches[0].clientY;
    if (isHorizontalSwipe === null) {
      const dx = Math.abs(currentX - touchStartX), dy = Math.abs(currentY - touchStartY);
      if (dx > 5 || dy > 5) isHorizontalSwipe = dx > dy;
    }
    if (isHorizontalSwipe) touchCurrentX = currentX;
  }

  function handleTouchEnd() {
    if (!isSwiping) return;
    isSwiping = false;
    const deltaX = touchCurrentX - touchStartX;
    if (!sidebarOpen && deltaX > windowWidth/3) sidebarOpen = true;
    else if (sidebarOpen && deltaX < -windowWidth/3) sidebarOpen = false;
  }

onMount(() => {
    // These only run in the browser
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('scroll', handleScrollBlur, { passive: true });
    window.addEventListener('resize', updateViewportHeight);
    updateViewportHeight();
    
    // Check localStorage safely
    const saved = localStorage.getItem('chat_user');
    if (saved) { 
      currentUser = saved; 
      fetchAvatar(saved); 
      
      // Connect and sync history/DMs
      connectWebSocket(); 
      loadHistory(activeChat.id, true); 
      loadRecentConversations(); // Fetch the DM sidebar list
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleGlobalKeyDown);
      clearTimeout(idleTimer);
    };
  });

  async function fetchAvatar(user) {
    if (user in avatarCache) return;
    avatarCache[user] = null;
    try {
      const res = await fetch(`${SERVER_URL}/api/avatar/${encodeURIComponent(user)}`);
      if (res.ok) {
        const data = await res.json();
        avatarCache = { ...avatarCache, [user]: data.avatar || null };
      }
    } catch {}
  }

async function scrollToBottom() {
    // Tick ensures Svelte has finished updating the DOM with the new message
    await tick(); 
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }
  }
  function focusOnMount(node) {
    node.focus();
    if (node.value) {
      const len = node.value.length;
      node.setSelectionRange(len, len);
    }
  }

async function loadHistory(channelId, isInitial = false) {
    if (channelId === 'admin-panel') {
        const guide = {
            id: 0,
            author: 'SYSTEM',
            ts: Date.now(),
            text: "### Admin Command Key\n" +
                  "* `list users` - Show all registered accounts\n" +
                  "* `count messages [channel]` - Total counts\n" +
                  "* `delete [num] [channel]` - Remove N messages\n" +
                  "* `delete all` - Wipe entire database\n" +
                  "* `deleteuser [username]` - Wipe account\n" +
                  "* `testpass [user] [pass]` - Verify credentials\n" +
                  "* `removepfp [username]` - Reset user avatar"
        };
        messageStore[channelId] = [guide];
        return;
    }

    if (channelMeta[channelId]?.isLoading || (channelMeta[channelId] && !channelMeta[channelId].hasMore && !isInitial)) return;
    
    if (!channelMeta[channelId]) {
      channelMeta[channelId] = { earliestCursor: Date.now(), hasMore: true, isLoading: false };
    }
    
    channelMeta[channelId].isLoading = true;

    try {
      // The server now returns 'reply_to' and 'edited' in the row objects
      const res = await fetch(`${SERVER_URL}/api/messages/${channelId}?before=${channelMeta[channelId].earliestCursor}&limit=30`);
      const newMsgs = await res.json();

      if (newMsgs.length < 30) channelMeta[channelId].hasMore = false;

      if (newMsgs.length > 0) {
        // Use the earliest message timestamp for the next pagination fetch
        channelMeta[channelId].earliestCursor = newMsgs[0].ts;
        
        const oldHeight = messageContainer?.scrollHeight || 0;
        
        // Update the store
        messageStore[channelId] = [...newMsgs, ...(messageStore[channelId] || [])];
        
        await tick();
        
        if (isInitial) {
          scrollToBottom();
        } else if (messageContainer) {
          // Maintain scroll position when loading older messages
          messageContainer.scrollTop = messageContainer.scrollHeight - oldHeight;
        }
      }
    } catch (e) { 
      console.error(e); 
    } finally { 
      channelMeta[channelId].isLoading = false; 
    }
  }

  function handleScroll(e) {
    if (e.currentTarget.scrollTop < 100 && !channelMeta[activeChat.id]?.isLoading) loadHistory(activeChat.id);
  }

async function authenticate() {
    authError = '';
    username = username.toLowerCase().replace(/\s/g, '').slice(0, 20);
    if (!username || !password) { authError = 'all fields required'; return; }
    
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(`${SERVER_URL}${endpoint}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      if (!res.ok) { authError = data.message || 'Auth failed'; return; }

      // --- NEW: Capture admin status from server ---
      if (!isRegistering) {
        userIsAdmin = data.isAdmin || false;
      }
      // ---------------------------------------------

      currentUser = username;
      localStorage.setItem('chat_user', currentUser);
      
      // Also save admin status to localStorage if you want it to persist on refresh
      localStorage.setItem('chat_is_admin', userIsAdmin);

      fetchAvatar(currentUser);
      connectWebSocket();
      loadHistory(activeChat.id, true);
    } catch (err) { 
      authError = 'Server connection error.'; 
    }
  }

function logout() {
    // 1. Clear LocalStorage
    localStorage.removeItem('chat_user');
    localStorage.removeItem('chat_is_admin');
    
    // 2. Disconnect Socket
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    // 3. Reset local variables (Optional, but good practice)
    currentUser = null;
    userIsAdmin = false;
    adminMode = false;
    unreadChats = {};
    avatarCache = {};
    channelMeta = {};
    sidebarOpen = false;
    userState = {};

    // 4. THE REFRESH: Hard reload the page
    location.reload();
  }

function startEdit(msg) {
    editingId = msg.id;
    editInput = msg.text;
  }

  function cancelEdit() {
    editingId = null;
    editInput = '';
  }

  let replyingTo = null; // Stores the message object we are replying to

  function setReply(msg) {
    replyingTo = msg;
    // Focus the main input so the user can start typing immediately
    if (textareaElement) textareaElement.focus();
  }

  function cancelReply() {
    replyingTo = null;
  }

  // Handle Enter/Esc in the edit input
  function handleEditKey(e) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  }

function connectWebSocket() {
    // 1. Guard against Server-Side Rendering (SSR)
    if (typeof window === 'undefined' || socket?.connected) return;

    socket = io(SERVER_URL);
    
    // 2. Only attach listeners if the socket was successfully initialized
    if (!socket) return;

    socket.emit('user_joined', currentUser);

    socket.on('chat_message', (msg) => {
      const channelId = msg.channel;
      
      // Auto-refresh the conversation list if it's a DM
      if (channelId.startsWith('dm:')) {
        loadRecentConversations();
      }

      const isAtBottom = messageContainer && (messageContainer.scrollHeight - messageContainer.scrollTop - messageContainer.clientHeight < 100);
      
      messageStore = { ...messageStore, [channelId]: [...(messageStore[channelId] ?? []), msg] };
      
      if (typeof window !== 'undefined' && "Notification" in window && channelId.startsWith('dm:') && !isFocused && !hasNotified && msg.author !== currentUser && Notification.permission === "granted") {
        new Notification(`DM from ${msg.author}`, { body: msg.text, tag: 'chat-alert' });
        hasNotified = true;
      }
      
      if (channelId !== activeChat.id) {
        unreadChats = { ...unreadChats, [channelId]: true };
      }
      
      if (channelId === activeChat.id && isAtBottom) {
        scrollToBottom();
      }
    });

    socket.on('message_deleted', ({ id, channel }) => {
      if (id === 'all') {
        Object.keys(messageStore).forEach(key => {
            messageStore[key] = [];
        });
      } else if (messageStore[channel]) {
        messageStore[channel] = messageStore[channel].filter(m => m.id !== id);
      }
      messageStore = { ...messageStore };
    });

socket.on('active_users', (serverUsersMap) => {
  // Create a fresh state object
  const newState = {};
  
  Object.entries(serverUsersMap).forEach(([u, status]) => {
    newState[u] = { status: status };
    // Fetch avatar if we haven't seen them this session
    if (!avatarCache[u]) fetchAvatar(u);
  });
  
  userState = newState; // Trigger Svelte reactivity
});
    
    socket.on('message_edited', ({ id, channel, newText }) => {
      if (messageStore[channel]) {
        messageStore[channel] = messageStore[channel].map(m => 
          m.id === id ? { ...m, text: newText, edited: 1 } : m
        );
        messageStore = { ...messageStore }; 
      }
    });

    socket.on('avatar_update', ({ username: u, avatar }) => {
      avatarCache = { ...avatarCache, [u]: avatar };
    });
  }

  function openChannel(id) { 
    activeChat = { type: 'channel', id }; 
    unreadChats = { ...unreadChats, [id]: false }; 
    sidebarOpen = false;
    if (!(messageStore[id]?.length > 0)) loadHistory(id, true);
    else scrollToBottom();
  }
  
  function openDM(user) { 
    const id = dmId(user); 
    activeChat = { type: 'dm', id, name: user }; 
    unreadChats = { ...unreadChats, [id]: false }; 
    sidebarOpen = false;
    if (!(messageStore[id]?.length > 0)) loadHistory(id, true);
    else scrollToBottom();
  }
  
  function dmId(user) { return ['dm', currentUser, user].sort().join(':'); }

  $: visibleUsers = Object.keys(userState).filter(u => u !== currentUser);
  $: messages = messageStore[activeChat.id] ?? [];
  $: chatLabel = activeChat.type === 'channel' ? '#' + activeChat.id : activeChat.name;
  
  $: inputPlaceholder = (() => {
    const base = activeChat.type === 'dm' ? `message @${activeChat.name}` : `message #${activeChat.id}`;
    const maxLength = windowWidth < 360 ? 14 : windowWidth < 430 ? 18 : 24;
    return base.length <= maxLength ? base : base.slice(0, maxLength - 1) + '…';
  })();
  $: charCount = msgInput.length;
  $: nearLimit = charCount >= 3500;
  $: overWarning = charCount >= 3800;
  $: myAvatar = currentUser ? avatarCache[currentUser] : null;

  let sidebarStyle = '';
  $: if (isMobile) {
    if (isSwiping && isHorizontalSwipe) {
      let offset = sidebarOpen ? (touchCurrentX - touchStartX) : -windowWidth + (touchCurrentX - touchStartX);
      sidebarStyle = `transform: translateX(${Math.min(0, Math.max(-windowWidth, offset))}px); transition: none;`;
    } else {
      sidebarStyle = `transform: translateX(${sidebarOpen ? 0 : -100}%); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);`;
    }
  } else { sidebarStyle = ''; }

  function autoResize(e) {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  }

  function handleButtonPress(event) { if (textareaElement) event.preventDefault(); flashButtonState(event.currentTarget); }
  function flashButtonState(button) { if (!button) return; button.classList.add('selected'); setTimeout(() => button.classList.remove('selected'), 0); }
  function handleUploadClick() { triggerFileInput(); }
  function toggleSpoiler(event) { const spoiler = event.target.closest('.spoiler'); if (spoiler) spoiler.classList.toggle('revealed'); }
  function handleScrollBlur() { if (textareaElement && document.activeElement === textareaElement) textareaElement.blur(); }

// --- Link Embed Logic ---
  let urlMetadataCache = {};

  // Clean Svelte reactivity trigger
  $: extractUrls(messages);

function extractUrls(msgs) {
    msgs.forEach(m => {
      if (m.text) {
        const urls = m.text.match(/https?:\/\/[^\s<"]+/g) || [];
        urls.slice(0, 1).forEach(url => {
          // NEW: Skip API call if it's a direct image file
          if (url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)) return;

          if (urlMetadataCache[url] === undefined) {
            urlMetadataCache = { ...urlMetadataCache, [url]: null }; 
            fetchMetadata(url);
          }
        });
      }
    });
  }
async function fetchMetadata(url) {
    try {
      // Use Microlink's free API to get clean, ready-to-use JSON metadata
      const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      const json = await res.json();

      if (json.status === 'success' && json.data) {
        urlMetadataCache = {
          ...urlMetadataCache,
          [url]: {
            title: json.data.title || new URL(url).hostname,
            description: json.data.description || '',
            // Fallback to the site logo if there's no big preview image
            image: json.data.image?.url || json.data.logo?.url || '',
            hostname: json.data.publisher || new URL(url).hostname
          }
        };
      } else {
        urlMetadataCache = { ...urlMetadataCache, [url]: { error: true } };
      }
    } catch (e) {
      urlMetadataCache = { ...urlMetadataCache, [url]: { error: true } };
    }
  }

  function decodeHTMLEntities(text) {
    if (typeof document === 'undefined') return text;
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
  }

async function send() {
    const text = msgInput.trim();
    if (!text || !currentUser) return;
    
    const msg = { 
      channel: activeChat.id, 
      author: currentUser, 
      text, 
      ts: Date.now(),
      isAdmin: adminMode,
      reply_to: replyingTo ? replyingTo.id : null 
    };
    
    if (socket) socket.emit('chat_message', msg);
    
    msgInput = '';
    replyingTo = null; 
    
    if (textareaElement) textareaElement.style.height = 'auto';

    // NEW: Force the jump to bottom immediately after sending
    await scrollToBottom();
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

    // Link formatting (Added back in for your clickable links)
    text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');

    // Escape ANY escaped character
    text = text.replace(/\\(.)/g, ESC + '$1');

    // Headings (escape-aware)
    text = text
      .replace(new RegExp(`^${ESC}?### (.+)$`, 'gm'), '<span class="md-heading md-heading-3">$1</span>')
      .replace(new RegExp(`^${ESC}?## (.+)$`, 'gm'), '<span class="md-heading md-heading-2">$1</span>')
      .replace(new RegExp(`^(?<!${ESC})-# (.+)$`, 'gm'), '<span class="md-heading md-heading-small">$1</span>')
      .replace(new RegExp(`^(?!##)# (.+)$`, 'gm'), '<span class="md-heading md-heading-1">$1</span>');

    // Bold + italic (Properly ordered)
    text = text
      .replace(new RegExp(`(?<!${ESC})\\*\\*\\*(.+?)(?<!${ESC})\\*\\*\\*`, 'g'), '<strong><em>$1</em></strong>')
      .replace(new RegExp(`(?<!${ESC})\\*\\*(.+?)(?<!${ESC})\\*\\*`, 'g'), '<strong>$1</strong>')
      .replace(new RegExp(`(?<!${ESC})\\*(?!\\*)(.+?)(?<!${ESC})\\*`, 'g'), '<em>$1</em>')
      .replace(new RegExp(`(?<!${ESC})__(.+?)(?<!${ESC})__`, 'g'), '<u>$1</u>')
      .replace(new RegExp(`(?<!${ESC})~~(.+?)(?<!${ESC})~~`, 'g'), '<s>$1</s>')
      .replace(new RegExp(`(?<!${ESC})\\|\\|(.+?)(?<!${ESC})\\|\\|`, 'g'), '<span class="spoiler">$1</span>');

    // Greentext
    text = text.replace(/^&gt;(.*?)$/gm, '<span class="greentext">&gt;$1</span>');

    // Minecraft & Pinktext
    text = text.replace(/^mc:\s*(.*?)$/gm, '<span class="mc-text">$1</span>');
    text = text.replace(/minecraft/gi, '<span class="mc-text">Minecraft</span>');
    text = text.replace(/^\s*\.(\s*)(.*?)$/gm, '<span class="pinktext">$2</span>');

    // Newlines
    text = text.replace(/\n/g, '<br>');

    // Restore escaped chars and code blocks
    text = text.replace(new RegExp(`${ESC}(.)`, 'g'), '$1');
    return text.replace(/CODEBLOCK_(\d+)_END/g, (_, i) => codeBlocks[i]);
  }

  let fileInput, imageError = '';
  function triggerFileInput() { fileInput.click(); }
function onFileChange(e) {
    imageError = '';
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { imageError = 'only image files allowed'; fileInput.value = ''; return; }
    if (file.size > 1024 * 1024) { imageError = 'image must be under 1mb'; fileInput.value = ''; return; }
    
    const reader = new FileReader();
    reader.onload = () => {
      // Logic: Include the reply_to ID if we are currently replying
      const msg = { 
        channel: activeChat.id, 
        author: currentUser, 
        image: reader.result, 
        ts: Date.now(),
        reply_to: replyingTo ? replyingTo.id : null 
      };
      
      if (socket) socket.emit('chat_message', msg);
      
      // Cleanup: Close the reply preview and clear the file input
      replyingTo = null; 
      fileInput.value = '';
      scrollToBottom();
    };
    reader.readAsDataURL(file);
  }
  function triggerAvatarUpload() { avatarFileInput.click(); }
  function onAvatarFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await fetch(`${SERVER_URL}/api/avatar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser, avatar: reader.result }) });
      if (res.ok) avatarCache = { ...avatarCache, [currentUser]: reader.result };
    };
    reader.readAsDataURL(file);
  }

  async function clearAvatar() {
    const res = await fetch(`${SERVER_URL}/api/avatar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser, avatar: null }) });
    if (res.ok) avatarCache = { ...avatarCache, [currentUser]: null };
  }

  let lightboxSrc = null;

function clickOutside(node) {
    const handleClick = (e) => {
      // Close if clicking outside the picker AND not clicking the GIF button
      if (!node.contains(e.target) && !e.target.closest('.gif-toggle-btn')) {
        showGifPicker = false;
      }
    };
    
    document.addEventListener('pointerdown', handleClick, true);
    return { destroy: () => document.removeEventListener('pointerdown', handleClick, true) };
  }

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
    </div>

    {#if adminMode}
      <div class="section-label" style="color: var(--red)">Admin</div>
      <div class="nav-item admin-panel-nav" class:active={activeChat.id === 'admin-panel'} onclick={() => openChannel('admin-panel')}>
        <span class="hash" style="color: var(--red)">!</span> admin-panel
      </div>
    {/if}

<div class="section-label">channels</div>
<div class="nav-item" class:active={activeChat.id === 'global'} onclick={() => openChannel('global')}>
  <span class="hash">#</span> global {#if unreadChats['global']}<span class="unread-dot"></span>{/if}
</div>

<div class="section-label">direct messages</div>
{#each recentConversations as chat}
  <div class="nav-item sidebar-dm-item" class:active={activeChat.id === dmId(chat.username)} onclick={() => openDM(chat.username)}>
    <span class="dot {userState[chat.username]?.status || 'offline'}"></span>
    <span class="dm-name">{chat.username}</span>
    
    <button 
      class="delete-btn red-icon sidebar-hide-btn" 
      class:confirming={pendingHideId === chat.username}
      onclick={(e) => { e.stopPropagation(); hideConversation(chat.username); }}
      title={pendingHideId === chat.username ? "Click to confirm hide" : "Hide Conversation"}
    >
      {#if pendingHideId === chat.username}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      {/if}
    </button>
  </div>
{/each}

<div class="section-label">online users</div>
{#each visibleUsers.filter(u => !recentConversations.find(c => c.username === u)) as u}
  <div class="nav-item dimmed" onclick={() => openDM(u)}>
    <span class="dot {userState[u].status}"></span>{u}
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
      <button class="logout-btn" onclick={logout} title="Sign Out">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
        </svg>
      </button>
    </div>
  </div>  
  <div class="chat">
    <div class="chat-header">
      {#if isMobile}
        <button class="mobile-menu-btn" onclick={() => sidebarOpen = true}>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
      </svg>
    </button>
      {/if}
      {chatLabel}
  {#if userIsAdmin}
    <label class="admin-toggle">
      <input type="checkbox" bind:checked={adminMode} />
      <span class="toggle-text">{adminMode ? 'ADMIN ACTIVE' : 'ADMIN MODE'}</span>
    </label>
  {/if}
    </div>
    
<div class="messages" bind:this={messageContainer} onscroll={handleScroll} onclick={toggleSpoiler}>
  {#if channelMeta[activeChat.id]?.isLoading}
    <div class="loading-status">loading history...</div>
  {/if}

  {#each messages as m (m.id)}
    <div class="msg" class:self={m.author === currentUser} data-author={m.author}>
      <div class="msg-avatar">
        {#if avatarCache[m.author]}
          <img src={avatarCache[m.author]} alt={m.author} />
        {:else}
          {m.author[0].toUpperCase()}
        {/if}
      </div>
  
<div class="msg-body">
        <div class="msg-meta">
          <span class="msg-author" data-author={m.author}>{m.author}</span>
          <span class="msg-time">{formatTime(m.ts)}</span>
          
          <button class="delete-btn" onclick={() => setReply(m)} title="Reply">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
            </svg>
          </button>
          
          {#if m.author === currentUser || adminMode}
            {#if !m.image}
              <button class="delete-btn" onclick={() => startEdit(m)} title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                </svg>
              </button>
            {/if}

            <button 
              class="delete-btn red-icon" 
              class:confirming={pendingDeleteId === m.id}
              onclick={() => deleteMsg(m)} 
              title={pendingDeleteId === m.id ? "Click again to confirm" : "Delete"}
            >
              {#if pendingDeleteId === m.id}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
                </svg>
              {/if}
            </button>
          {/if}
        </div>
                
        {#if m.reply_to}
          {@const parent = messages.find(msg => msg.id === m.reply_to)}
          {#if parent}
            <div class="reply-reference">
              <span class="reply-ref-author">@{parent.author}</span>
              <span class="reply-ref-text">
                {#if parent.image && !parent.text}
                  📷 Image
                {:else}
                  {parent.text.length > 40 ? parent.text.slice(0, 40) + '...' : parent.text}
                {/if}
              </span>
            </div>
          {/if}
        {/if}

        {#if m.image}
          <img class="msg-image" src={m.image} alt="uploaded" onclick={() => lightboxSrc = m.image} />
        {:else}
          {#if editingId === m.id}
            <div class="edit-wrap">
              <input bind:value={editInput} onkeydown={handleEditKey} class="edit-input" use:focusOnMount />
              <div class="edit-actions">
                <span role="button" tabindex="0" onclick={saveEdit}>save</span> • 
                <span role="button" tabindex="0" onclick={cancelEdit}>cancel</span>
              </div>
            </div>
          {:else}
            <div class="msg-bubble">
              {@html parseMarkdown(m.text)}
              {#if m.edited}<span class="edited-tag">(edited)</span>{/if}
            </div>
            
            {#if m.text}
              {@const urls = m.text.match(/https?:\/\/[^\s<"]+/g) || []}
              {#each urls.slice(0, 1) as url}
                {#if url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)}
                  <div class="image-embed">
                    <img src={url} alt="inline embed" class="msg-image" onclick={() => lightboxSrc = url} />
                  </div>
                {:else if urlMetadataCache[url] && !urlMetadataCache[url].error}
                  <a href={url} target="_blank" rel="noopener noreferrer" class="embed-card">
                    {#if urlMetadataCache[url].image}
                      <img src={urlMetadataCache[url].image} alt="embed" class="embed-image" />
                    {/if}
                    <div class="embed-info">
                      <div class="embed-site">{urlMetadataCache[url].hostname}</div>
                      <div class="embed-title">{urlMetadataCache[url].title}</div>
                      {#if urlMetadataCache[url].description}
                        <div class="embed-desc">{urlMetadataCache[url].description}</div>
                      {/if}
                    </div>
                  </a>
                {/if}
              {/each}
            {/if}
          {/if}
{/if}
      </div>
    </div>
  {/each}
</div>

<div class="input-bar" class:has-reply={replyingTo}>
  {#if replyingTo}
    <div class="reply-preview">
      <div class="reply-preview-info">
        <span class="reply-preview-label">replying to <strong>{replyingTo.author}</strong></span>
<div class="reply-preview-text">
  {#if replyingTo.image && !replyingTo.text}
    📷 Image
  {:else}
    {replyingTo.text.length > 80 ? replyingTo.text.slice(0, 80) + '...' : replyingTo.text}
  {/if}
</div>
</div>
<button class="cancel-reply-btn" onclick={cancelReply}>
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
</button>
</div>
  {/if}

{#if showGifPicker}
    <div class="gif-picker" use:clickOutside>
      <div class="gif-header">
        <input 
          type="text" 
          placeholder="Search Giphy..." 
          bind:value={gifQuery} 
          oninput={handleGifInput} 
          use:focusOnMount 
        />
        </div>
      <div class="gif-grid">
        <div class="gif-masonry">
          {#each gifResults as gif}
            <img 
              src={gif.images.fixed_height_small.url} 
              alt={gif.title} 
              onclick={() => sendGif(gif.images.fixed_height.url)} 
            />
          {/each}
        </div>
      </div>
    </div>
  {/if}
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
  
<button class="upload-btn gif-toggle-btn" type="button" onclick={toggleGifPicker} title="send a gif" style="font-weight: 800; font-size: 13px;">
    GIF
  </button>
    
<button class="upload-btn" type="button" onpointerdown={handleButtonPress} onclick={handleUploadClick} title="upload image">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
</button>
</div>
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
  :global(html), :global(body) { margin: 0; padding: 0; width: 100vw; min-height: calc(var(--vh, 1vh) * 100); height: calc(var(--vh, 1vh) * 100); max-height: calc(var(--vh, 1vh) * 100); background: var(--base); color: var(--subtext0); overflow: hidden; overscroll-behavior: none; touch-action: pan-y; font-family: 'JetBrains Mono', monospace; font-size: 15px; user-select: none; }
  * { box-sizing: border-box; margin: 0; padding: 0; outline: none !important; font-family: inherit; user-select: none; }
  * { -webkit-tap-highlight-color: transparent; }
  
.image-embed {
    margin-top: 8px;
    display: block;
    max-width: fit-content;
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

  .nav-item.admin-panel-nav {
    color: var(--red);
    font-weight: bold;
  }
  .nav-item.admin-panel-nav:hover {
      background: rgba(237, 135, 150, 0.1);
  }

.dot { width: 9px; height: 9px; border-radius: 50%; background: var(--surface2); transition: background 0.3s ease; }
.dot.online { background: var(--green); box-shadow: 0 0 4px var(--green); }
.dot.away { background: var(--yellow); }
/* No class = offline = var(--surface2) gray */
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

  .loading-status { text-align: center; font-size: 11px; color: var(--mauve); padding: 10px; opacity: 0.8; }

  /* Changed scroll-behavior from smooth to auto to prevent jumping during infinite scroll pagination */
  .messages { flex: 1; overflow-y: auto; padding: 20px 0 calc(20px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; scroll-behavior: auto; scroll-padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px)); overscroll-behavior: contain; }
  
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

  /* Terminal output style for SYSTEM in admin-panel */
  .msg[data-author="SYSTEM"] .msg-bubble {
      background: var(--crust);
      border-color: var(--red);
      color: var(--green);
      font-family: 'JetBrains Mono', monospace;
      white-space: pre-wrap;
  }
  
.input-bar { 
    display: flex; 
    flex-direction: column; 
    padding: 15px 24px calc(20px + env(safe-area-inset-bottom, 12px)); 
    position: relative; /* CRUCIAL for the GIF picker */
  }

  /* The Container Logic */
  .input-wrap { 
    display: flex; 
    background: var(--mantle); 
    border: 1px solid var(--surface0); 
    border-radius: 8px; 
    transition: border-color 0.2s;
  }

  /* When replying, flatten the meeting edges */
  .has-reply .reply-preview {
    border-bottom: none;
    border-radius: 8px 8px 0 0;
  }
  .has-reply .input-wrap {
    border-radius: 0 0 8px 8px;
    border-top: 1px solid var(--surface0); /* subtle separator */
  }

  /* THE MAUVE FOCUS LOGIC */
  /* Highlight both parts when the textarea inside is focused */
  .input-bar:focus-within .input-wrap,
  .input-bar:focus-within .reply-preview {
    border-color: var(--mauve);
  }

  .reply-preview {
    background: var(--crust);
    border: 1px solid var(--surface0);
    padding: 8px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: border-color 0.2s;
  }

  .reply-preview-label { font-size: 11px; color: var(--mauve); display: block; }
  .reply-preview-text { font-size: 13px; color: var(--subtext0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Make sure bubbles stay visible */
  .msg-bubble {
    display: inline-block; /* Changed from block to help sizing */
    max-width: 90%;
    word-break: break-word;
  }
  
  :global(.pinktext) { color: var(--pink); }
  :global(.greentext) { color: var(--green); }
  :global(.mc-text) { font-family: 'Minecraft', monospace; font-size: 16px; color: var(--text); }
  
  :global(.chat-link) { color: var(--blue); text-decoration: none; }
  :global(.chat-link:hover) { text-decoration: underline; }

  /* Ensure headings look right inside the bubble */
  :global(.msg-bubble .md-heading) { display: block; margin: 4px 0; color: var(--text); }

  .msg-bubble { display: block; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 6px; padding: 10px 14px; font-size: 15px; color: var(--subtext0); line-height: normal; max-width: 100%; width: fit-content; word-wrap: break-word; user-select: text; }
  :global(.msg-bubble code) { background: var(--crust); color: var(--text); padding: 1px 5px; border-radius: 3px; font-size: 15px; white-space: pre-wrap; display: inline-block; max-width: 100%; vertical-align: baseline; } 
  :global(.msg-bubble .code-block) { display: block; background: var(--crust); border: 1px solid var(--surface0); border-radius: 6px; padding: 12px 14px; margin: 6px 0; overflow-x: auto; width: 100%; box-sizing: border-box; }
  :global(.msg-bubble .code-block pre) { margin: 0; padding: 0; background: none; border: none; }
  :global(.msg-bubble .code-block code) { background: none; color: var(--text); padding: 0; font-size: 15px; white-space: pre-wrap; display: block; }
  :global(.md-heading) { display: block; margin: 2px 0; padding: 0; line-height: 1.3; font-weight: bold; color: var(--text); }
  :global(.md-heading-1) { font-size: 2.5em; }
  :global(.md-heading-2) { font-size: 2em; }
  :global(.md-heading-3) { font-size: 1.5em; }
  :global(.md-heading-small) { font-size: 0.8em; color: var(--subtext0); }
  :global(.msg-bubble strong) { color: var(--text); font-weight: bold; }
  :global(.msg-bubble em) { color: var(--subtext0); font-style: italic; }
  :global(.msg-bubble u) { text-decoration: underline; }
  :global(.msg-bubble s) { color: var(--surface2); text-decoration: line-through; }
  :global(.msg-bubble .spoiler) { background: var(--surface2); color: transparent; text-shadow: 0 0 0 var(--surface2); border-radius: 3px; cursor: pointer; transition: background 0.2s ease, color 0.2s ease, text-shadow 0.2s ease; }
  :global(.msg-bubble .spoiler.revealed) { background: var(--base); color: var(--text); text-shadow: none; }
  :global(.msg-bubble .greentext) { color: var(--green); }
  :global(.msg-bubble .pinktext) { color: var(--pink); }
  .msg.self .msg-bubble { background: var(--surface0); color: var(--text); }

  @font-face { font-family: 'JetBrains Mono'; src: url('/jetbrainsmono.ttf') format('truetype'); }
  @font-face { font-family: 'Minecraft'; src: url('/minecraft.otf') format('opentype'); }

  :global(.msg-bubble .mc-text) { 
    font-family: 'Minecraft', monospace; 
    font-size: 16px; 
    font-weight: normal;
    font-style: normal;
    line-height: 1.2;
    color: var(--text);
  }

  .input-wrap { display: flex; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 8px; align-items: center; }
  .input-wrap:focus-within { border-color: var(--mauve); }
  textarea { all: unset; flex: 1; color: var(--text); font-size: 15px; padding: 12px 18px; resize: none; overflow-y: hidden; overflow-wrap: break-word; word-break: break-word; white-space: pre-wrap; max-height: 150px; box-sizing: border-box; line-height: 1.5; user-select: text; cursor: text; }
  textarea::placeholder { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .upload-btn { all: unset; border: 2px solid var(--surface0) !important; color: var(--overlay0); padding: 0 16px; cursor: pointer; font-size: 22px; height: 50px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; align-self: stretch; user-select: none; transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease, opacity 0.25s ease; }
  .upload-btn:last-child { border-radius: 0 8px 8px 0; }
  .upload-btn.selected { color: var(--mauve); background: var(--surface0); border-color: var(--mauve) !important; opacity: 0.85; }
  .upload-btn:hover { color: var(--mauve); }
  .char-count { font-size: 11px; color: var(--overlay0); text-align: right; padding: 4px 4px 0; }
  .char-count.warn { color: var(--peach); }
  .msg-image { max-width: 320px; max-height: 240px; border-radius: 6px; cursor: pointer; display: block; border: 1px solid var(--surface0); }
  .msg-image:hover { border-color: var(--mauve); }
.lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9); /* Darker backdrop */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

.lightbox img {
    /* Set your predetermined sizes here */
    width: 800px;           /* The "standard" width you want */
    height: 800px;          /* The "standard" height you want */
    
    /* Responsive guards: ensure it doesn't break small screens */
    max-width: 95vw;        
    max-height: 85vh;
    
    /* Magic: forces the image to scale inside that box without stretching */
    object-fit: contain;    
    
    border-radius: 8px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
  }
  /* Mobile Exclusive Rules */
  @media (max-width: 768px) {
    .sidebar { position: fixed; top: 0; left: 0; width: 100vw; height: calc(var(--vh, 1vh) * 100); z-index: 50; }
    .sidebar-header { display: flex; align-items: center; }
    .mobile-menu-btn { display: inline-block; }
    .mobile-close-btn { display: inline-block; }
    .chat-header { display: flex; align-items: center; }
  }

.delete-btn {
    all: unset;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    margin-left: 10px;
    transition: opacity 0.2s, color 0.2s;
    /* Default color for Edit/Reply */
    color: var(--text);
  }

  /* Keep icons hidden on desktop until hover */
  @media (min-width: 769px) {
    .delete-btn {
      opacity: 0;
    }
    .msg:hover .delete-btn {
      opacity: 1;
    }
  }

  /* Always visible on mobile */
  @media (max-width: 768px) {
    .delete-btn {
      opacity: 1;
    }
  }

  /* Specific color for Delete (Trash) icon */
  .delete-btn.red-icon {
    color: var(--text);
  }

  .delete-btn.red-icon:hover {
    color: var(--red);
  }

  .msg:hover .delete-btn {
    opacity: 1;
  }
  .delete-btn:hover {
    color: var(--mauve);
  }

.delete-btn.red-icon.confirming {
    color: var(--red); /* Brighter red */
    animation: pulse-red 0.8s infinite;
    opacity: 1 !important; /* Force visibility during confirmation */
  }

  @keyframes pulse-red {
    0% { filter: drop-shadow(0 0 0px rgba(237, 135, 150, 0)); }
    50% { filter: drop-shadow(0 0 4px rgba(237, 135, 150, 0.8)); }
    100% { filter: drop-shadow(0 0 0px rgba(237, 135, 150, 0)); }
  }

  .edit-input {
    all: unset;
    width: 100%;
    background: var(--crust);
    border: 1px solid var(--mauve);
    color: var(--text);
    padding: 8px;
    border-radius: 4px;
    font-size: 14px;
    margin: 4px 0;
    user-select: text;
  }
  .edit-actions {
    font-size: 10px;
    color: var(--overlay0);
    cursor: pointer;
  }
  .edit-actions span:hover {
    color: var(--mauve);
    text-decoration: underline;
  }
  .edited-tag {
    font-size: 10px;
    color: var(--surface2);
    margin-left: 5px;
  }

/* The small reference inside the message history */
  .reply-reference {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-left: 2px solid var(--mauve);
    padding: 4px 10px;
    margin-bottom: 4px;
    border-radius: 4px;
    font-size: 12px;
    max-width: fit-content;
    color: var(--overlay1);
  }
  .reply-ref-author { color: var(--mauve); font-weight: bold; }

  /* The preview bar above the input box */
  .reply-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--mantle);
    border: 1px solid var(--surface0);
    border-bottom: none;
    padding: 8px 16px;
    border-radius: 8px 8px 0 0;
  }
  .reply-preview-info { min-width: 0; }
  .reply-preview-label { font-size: 11px; color: var(--mauve); display: block; }
  .reply-preview-text { font-size: 13px; color: var(--subtext0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cancel-reply-btn { all: unset; cursor: pointer; color: var(--red); font-weight: bold; padding: 4px; }

  .chat-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--surface0);
  color: var(--text);
  font-size: 15px;
  font-weight: bold;
  overflow: visible; /* Prevents the toggle from being cut off */
}

.chat-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1; /* Title gives way if screen is small */
}

.admin-toggle {
  /* This pins the toggle to the far right */
  margin-left: auto; 
  
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface0);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--surface1);
  cursor: pointer;
  flex-shrink: 0; /* Prevents the toggle from shrinking */
  user-select: none;
}

.toggle-text {
  font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--overlay1);
}

.admin-toggle input:checked ~ .toggle-text {
  color: var(--red);
}

/* Styling for the Admin section label specifically */
.section-label[style*="color: var(--red)"] {
  margin-top: 10px;
  border-bottom: 1px solid rgba(237, 135, 150, 0.2);
  padding-bottom: 4px;
  margin-bottom: 4px;
}

/* Ensure the nav item within admin looks distinct */
.nav-item.admin-panel-nav {
  color: var(--red);
  font-weight: 800; /* Extra bold for admin */
  letter-spacing: 0.02em;
}

/* Active state for admin panel */
.nav-item.admin-panel-nav.active {
  border-left: 3px solid var(--red);
  background: rgba(237, 135, 150, 0.1);
}

.nav-item.dimmed {
  opacity: 0.6;
  font-size: 12px;
}
.nav-item.dimmed:hover {
  opacity: 1;
}
.empty-hint {
  padding: 10px 20px;
  font-style: italic;
}

.sidebar { 
    width: 240px; 
    flex-shrink: 0; 
    background: var(--mantle); 
    border-right: 1px solid var(--surface0); 
    display: flex; 
    flex-direction: column; 
    height: 100%; 
    /* NEW: Enable scrolling */
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: var(--surface2) transparent;
  }

  /* Custom scrollbar styling for Chrome/Safari/Edge */
  .sidebar::-webkit-scrollbar {
    width: 4px;
  }
  .sidebar::-webkit-scrollbar-track {
    background: transparent;
  }
  .sidebar::-webkit-scrollbar-thumb {
    background-color: var(--surface2);
    border-radius: 10px;
  }

  /* Ensure the footer stays at the bottom even when scrolling */
  .sidebar-footer { 
    margin-top: auto; /* Pushes to bottom */
    position: sticky;
    bottom: 0;
    background: var(--mantle); /* Prevents content from bleeding through */
    border-top: 1px solid var(--surface0); 
    padding: 12px 16px; 
    display: flex; 
    align-items: center; 
    gap: 10px; 
    z-index: 10;
  }

  .sidebar-dm-item {
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
  }

  .dm-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar-hide-btn {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s, color 0.2s;
    padding: 4px;
    color: var(--overlay0);
  }

  .sidebar-dm-item:hover .sidebar-hide-btn {
    opacity: 0.6;
  }

  .sidebar-hide-btn:hover {
    opacity: 1 !important;
    color: var(--red) !important;
  }

  /* Keep it visible if we are waiting for confirmation */
  .sidebar-hide-btn.confirming {
    opacity: 1 !important;
    color: var(--red);
    animation: pulse-red 0.8s infinite;
  }

  .nav-item.dimmed {
    opacity: 0.5;
    font-size: 13px;
  }
  .nav-item.dimmed:hover {
    opacity: 1;
  }

  .sidebar-dm-item {
  display: flex;
  align-items: center;
  position: relative;
}

.dm-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-hide-btn {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: auto;
  transition: opacity 0.2s, color 0.2s;
  padding: 4px;
  color: var(--overlay0);
}

/* DESKTOP: Only show on hover */
@media (min-width: 769px) {
  .sidebar-hide-btn {
    opacity: 0;
  }
  .sidebar-dm-item:hover .sidebar-hide-btn {
    opacity: 0.6;
  }
}

/* MOBILE: Always show */
@media (max-width: 768px) {
  .sidebar-hide-btn {
    opacity: 0.8 !important; 
    padding: 8px; /* Bigger hit area for thumbs */
  }
}

/* HIGH VISIBILITY: Hover and Confirming states */
.sidebar-hide-btn:hover, 
.sidebar-hide-btn.confirming {
  opacity: 1 !important;
  color: var(--red) !important;
}

/* --- GIF Picker Styles --- */
  .gif-picker {
    position: absolute;
    bottom: calc(100% - 10px);
    right: 24px;
    width: 320px;
    height: 350px;
    background: var(--mantle);
    border: 1px solid var(--surface0);
    border-radius: 8px;
    margin-bottom: 10px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    z-index: 100;
    overflow: hidden;
  }

  .gif-header {
    display: flex;
    padding: 10px;
    background: var(--crust);
    border-bottom: 1px solid var(--surface0);
  }

  .gif-header input {
    all: unset;
    flex: 1;
    background: var(--mantle);
    color: var(--text);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 13px;
    border: 1px solid var(--surface0);
    transition: border-color 0.2s;
  }

  .gif-header input:focus {
    border-color: var(--mauve);
  }

  .gif-header button {
    all: unset;
    cursor: pointer;
    color: var(--overlay0);
    padding: 0 10px;
    font-weight: bold;
    font-size: 16px;
    transition: color 0.2s;
  }

  .gif-header button:hover {
    color: var(--red);
  }

/* 1. The Scrollable Container */
  .gif-grid {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
    scrollbar-width: thin;
    scrollbar-color: var(--surface2) transparent;
  }

  /* 2. The Masonry Layout (grows infinitely tall) */
  .gif-masonry {
    column-count: 2;
    column-gap: 4px;
    width: 100%;
  }

  /* 3. The Images */
  .gif-masonry img {
    width: 100%;
    height: auto;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.2s;
    break-inside: avoid; /* Prevents splitting an image across columns */
    margin-bottom: 4px;
    display: block;
  }

  .gif-masonry img:hover {
    opacity: 0.7;
  }

  /* --- Link & Embed Styles --- */
  :global(.chat-link) { 
    color: var(--blue); 
    text-decoration: none; 
    word-break: break-all;
  }
  :global(.chat-link:hover) { 
    text-decoration: underline; 
  }

  .embed-card {
    display: flex;
    flex-direction: column;
    margin-top: 8px;
    border-left: 4px solid var(--surface2);
    background: var(--crust);
    border-radius: 4px;
    overflow: hidden;
    max-width: 400px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s;
  }

  .embed-card:hover { 
    border-color: var(--mauve); 
  }

  .embed-image { 
    width: 100%; 
    max-height: 200px; 
    object-fit: cover; 
    display: block;
  }

  .embed-info { 
    padding: 10px 12px; 
    display: flex; 
    flex-direction: column; 
    gap: 4px; 
  }

  .embed-site { 
    font-size: 11px; 
    color: var(--mauve); 
    font-weight: bold; 
    text-transform: uppercase; 
  }

  .embed-title { 
    font-size: 14px; 
    color: var(--blue); 
    font-weight: bold; 
  }

  .embed-desc { 
    font-size: 12px; 
    color: var(--subtext0); 
    display: -webkit-box; 
    -webkit-line-clamp: 2; 
    -webkit-box-orient: vertical; 
    overflow: hidden; 
    line-height: 1.4; 
  }
</style>