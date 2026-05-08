<script>
  import { onMount, onDestroy, tick } from 'svelte';

  const API_KEY = "AIzaSyDU2BOzgA6xtjswS3pjuncZjfWMwuU7klg";
  const API_BASE = "https://geoapi.studiobean.com/api";

  const locations = [
    "-43.3741894,172.6653052",
    "-43.3653743,172.6676274",
    "-43.3746426,172.6528684",
    "-43.4873369,172.5465221",
    "48.8584,2.2945",
    "35.6762,139.6503",
    "-33.8688,151.2093",
    "40.7128,-74.0060",
    "51.5074,-0.1278",
    "-22.9068,-43.1729",
    "55.7558,37.6173",
    "1.3521,103.8198",
    "41.9028,12.4964",
  ];

  const catppuccinColors = [
    { name: 'Rosewater', hex: '#f5e0dc' },
    { name: 'Flamingo',  hex: '#f2cdcd' },
    { name: 'Pink',      hex: '#f5c2e7' },
    { name: 'Mauve',     hex: '#cba6f7' },
    { name: 'Red',       hex: '#f38ba8' },
    { name: 'Maroon',    hex: '#eba0ac' },
    { name: 'Peach',     hex: '#fab387' },
    { name: 'Yellow',    hex: '#f9e2af' },
    { name: 'Green',     hex: '#a6e3a1' },
    { name: 'Teal',      hex: '#94e2d5' },
    { name: 'Sky',       hex: '#89dceb' },
    { name: 'Sapphire',  hex: '#74c7ec' },
    { name: 'Blue',      hex: '#89b4fa' },
    { name: 'Lavender',  hex: '#b4befe' },
  ];

  // ─── Leaderboard State ───────────────────────────────────────────────────
  let showLeaderboard = false;
  let leaderboardData = [];
  let leaderboardLoading = false;
  let leaderboardError = '';

async function openLeaderboard() {
    showLeaderboard = true;
    leaderboardLoading = true;
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      leaderboardData = await res.json();
    } catch { leaderboardError = 'Failed to load'; } finally { leaderboardLoading = false; }
  }
  // ─── Auth State ───────────────────────────────────────────────────────────
  let authUser = null;       // { username, token } when logged in
  let showAuthModal = false;
  let authMode = 'login';    // 'login' | 'signup'
  let authUsername = '';
  let authPassword = '';
  let authConfirm = '';
  let authError = '';
  let authLoading = false;

function loadSession() {
    try {
      const raw = localStorage.getItem('worldguessr_session');
      if (raw) {
        authUser = JSON.parse(raw);
        // Restore settings from the session object if they exist
        if (authUser.settings) {
          accentColor = authUser.settings.accentColor || accentColor;
          unitSystem  = authUser.settings.unitSystem  || unitSystem;
        }
      }
    } catch { /* ignore */ }
  }

  function saveSession(user) {
    localStorage.setItem('worldguessr_session', JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem('worldguessr_session');
    authUser = null;
  }

  function openAuth(mode = 'login') {
    authMode = mode;
    authUsername = '';
    authPassword = '';
    authConfirm = '';
    authError = '';
    showAuthModal = true;
  }

  function closeAuth() {
    showAuthModal = false;
    authError = '';
  }

async function submitAuth() {
    authError = '';
    authLoading = true;
    try {
      const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/login';
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername.trim(), password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) { authError = data.error || 'Error'; return; }
      
      // Save user + their settings into the session
      authUser = { 
        username: data.username, 
        token: data.token,
        settings: data.settings 
      };
      saveSession(authUser);

      // Apply the settings to the UI immediately
      if (data.settings) {
        accentColor = data.settings.accentColor || accentColor;
        unitSystem  = data.settings.unitSystem  || unitSystem;
      }
      closeAuth();
    } catch (e) { authError = 'Server unreachable'; } finally { authLoading = false; }
  }
  function logout() {
    clearSession();
    // Reset settings to defaults on logout
    accentColor = '#a6e3a1';
    unitSystem  = 'metric';
  }

  // Push settings to server whenever they change (debounced)
let settingsSyncTimer = null;
  function syncSettings() {
    if (!authUser) return;
    clearTimeout(settingsSyncTimer);
    settingsSyncTimer = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/user/settings`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${authUser.token}` 
          },
          body: JSON.stringify({ accentColor, unitSystem }),
        });
      } catch (e) { console.error("Sync failed"); }
    }, 800);
  }

$: if (accentColor || unitSystem) syncSettings();

  // Push a completed game to server
async function syncGame(totalScore) {
    if (!authUser) return;
    try {
      await fetch(`${API_BASE}/user/game`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${authUser.token}` 
        },
        body: JSON.stringify({ 
          rounds: maxRounds, 
          totalScore: totalScore, 
          timestamp: Date.now() 
        }),
      });
    } catch { /* silent */ }
  }

  // ─── Game State ───────────────────────────────────────────────────────────
  let gameState = 'menu'; // 'menu' | 'options' | 'settings' | 'playing' | 'summary'

  let maxRounds = 5;
  let selectedTimeOption = 300;
  let customTimeInput = 60;

  let accentColor = '#a6e3a1';
  let unitSystem  = 'metric';

  let currentRound = 1;
  let totalScore   = 0;
  let roundHistory = [];
  let timerInterval = null;
  let timeLeft = null;

  function getRandomLocation() {
    const coords  = locations[Math.floor(Math.random() * locations.length)];
    const heading = Math.floor(Math.random() * 360);
    const pitch   = Math.floor(Math.random() * 31) - 15;
    return { location: coords, heading, pitch };
  }

  let current = getRandomLocation();
  let src = '';
  let guessPlaced = false;
  let map = null;
  let score = null;
  let distance = null;
  let showResult = false;
  let roundOver = false;
  let isSubmitting = false;
  let iframeKey = 0;

  let actualLabel = '';
  let guessLabel  = '';
  let baseGuess   = null;
  let baseActual  = null;
  let shortestDiffLng = 0;

  let renderedWraps   = new Map();
  let summaryElements = [];

  function buildSrc(loc) {
    const [lat, lng] = loc.location.split(',');
    return `https://www.google.com/maps/embed/v1/streetview?key=${API_KEY}&location=${lat},${lng}&heading=${loc.heading}&pitch=${loc.pitch}&fov=90`;
  }

  $: src = buildSrc(current);
  $: if (accentColor || unitSystem) syncSettings();

  function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function calcScore(km) { return Math.round(5000 * Math.exp(-km / 2000)); }

  function formatTime(seconds) {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function getDisplayDistance(km) {
    if (km === null || km === '-') return { value: '-', unit: '' };
    if (unitSystem === 'imperial') return { value: Math.round(km * 0.621371).toLocaleString(), unit: 'mi' };
    return { value: km.toLocaleString(), unit: 'km' };
  }

  async function fetchLocationName(lat, lng) {
    try {
      const res  = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      const data = await res.json();
      const city = data.city || data.locality;
      const country = data.countryName;
      if (city && country && city !== country) return `${city}, ${country}`;
      else if (country) return country;
      else if (city) return city;
      return 'Unknown Location';
    } catch { return 'Unknown Location'; }
  }

  function startGame() {
    currentRound = 1;
    totalScore   = 0;
    roundHistory = [];
    gameState    = 'playing';
    resetRoundState();
  }

  function resetRoundState() {
    showResult   = false;
    roundOver    = false;
    guessPlaced  = false;
    isSubmitting = false;
    baseGuess    = null;
    baseActual   = null;
    score        = null;
    distance     = null;
    actualLabel  = '';
    guessLabel   = '';

    for (const elements of renderedWraps.values()) {
      if (elements.g) elements.g.remove();
      if (elements.a) elements.a.remove();
      if (elements.l) elements.l.remove();
    }
    renderedWraps.clear();

    if (map) { map.setView([0, 0], 0); setTimeout(() => map.invalidateSize(), 100); }

    current  = getRandomLocation();
    iframeKey += 1;

    if (timerInterval) clearInterval(timerInterval);
    const totalSeconds = selectedTimeOption === 'custom' ? customTimeInput : selectedTimeOption;
    timeLeft = totalSeconds > 0 ? totalSeconds : null;
  }

  function onStreetViewLoad() {
    if (timerInterval) clearInterval(timerInterval);
    const totalSeconds = selectedTimeOption === 'custom' ? customTimeInput : selectedTimeOption;
    if (totalSeconds <= 0 || roundOver) return;
    timerInterval = setInterval(() => {
      if (gameState !== 'playing' || roundOver) { clearInterval(timerInterval); return; }
      timeLeft--;
      if (timeLeft <= 0) { clearInterval(timerInterval); submitGuess(true); }
    }, 1000);
  }

  async function nextRound() {
    if (currentRound < maxRounds) { currentRound++; resetRoundState(); }
    else await showSummary();
  }

  async function showSummary() {
    gameState = 'summary';
    if (timerInterval) clearInterval(timerInterval);

    for (const elements of renderedWraps.values()) {
      if (elements.g) elements.g.remove();
      if (elements.a) elements.a.remove();
      if (elements.l) elements.l.remove();
    }
    renderedWraps.clear();

    await tick();
    map.invalidateSize();

    const guessIcon  = window.L.divIcon({ className: 'custom-guess-marker',  iconSize: [16,16], iconAnchor: [8,8] });
    const actualIcon = window.L.divIcon({ className: 'custom-actual-marker', iconSize: [16,16], iconAnchor: [8,8] });
    let bounds = window.L.latLngBounds([]);

    roundHistory.forEach((r, index) => {
      if (r.guess) {
        let aLng = r.guess.lng + r.diff;
        let gMarker = window.L.marker([r.guess.lat,  r.guess.lng], { icon: guessIcon  }).addTo(map).bindPopup(`<b>Round ${index+1} Guess</b><br>${r.score} pts`);
        let aMarker = window.L.marker([r.actual.lat, aLng],        { icon: actualIcon }).addTo(map).bindPopup(`<b>Round ${index+1} Actual</b><br>${r.label}`);
        let line    = window.L.polyline([[r.guess.lat, r.guess.lng],[r.actual.lat, aLng]], { color: '#f38ba8', weight: 2, dashArray: '6,4' }).addTo(map);
        summaryElements.push(gMarker, aMarker, line);
        bounds.extend([r.guess.lat,  r.guess.lng]);
        bounds.extend([r.actual.lat, aLng]);
      } else {
        let aMarker = window.L.marker([r.actual.lat, r.actual.lng], { icon: actualIcon }).addTo(map).bindPopup(`<b>Round ${index+1} Actual</b><br>${r.label} (Time Out)`);
        summaryElements.push(aMarker);
        bounds.extend([r.actual.lat, r.actual.lng]);
      }
    });

    map.fitBounds(bounds, { padding: [100, 100] });

    // Sync completed game to server
    syncGame(totalScore);
  }

  function returnToMenu() {
    summaryElements.forEach(e => e.remove());
    summaryElements = [];
    gameState = 'menu';
  }

  function updateDynamicElements() {
    if (!map || !window.L || gameState !== 'playing') return;
    if (!guessPlaced && !roundOver) return;

    const bounds  = map.getBounds();
    const minWrap = Math.floor(bounds.getWest() / 360) - 1;
    const maxWrap = Math.ceil(bounds.getEast()  / 360) + 1;
    const neededWraps = new Set();
    for (let i = minWrap; i <= maxWrap; i++) neededWraps.add(i);

    for (const [wrap, elements] of renderedWraps.entries()) {
      if (!neededWraps.has(wrap)) {
        if (elements.g) elements.g.remove();
        if (elements.a) elements.a.remove();
        if (elements.l) elements.l.remove();
        renderedWraps.delete(wrap);
      }
    }

    const guessIcon  = window.L.divIcon({ className: 'custom-guess-marker',  iconSize: [16,16], iconAnchor: [8,8] });
    const actualIcon = window.L.divIcon({ className: 'custom-actual-marker', iconSize: [16,16], iconAnchor: [8,8] });

    for (const wrap of neededWraps) {
      let elements = renderedWraps.get(wrap);
      if (!elements) { elements = {}; renderedWraps.set(wrap, elements); }

      if (baseGuess) {
        let gLng = baseGuess.lng + (wrap * 360);
        if (!elements.g) elements.g = window.L.marker([baseGuess.lat, gLng], { icon: guessIcon }).addTo(map);
        if (roundOver) {
          let aLng = gLng + shortestDiffLng;
          if (elements.g && !elements.g.getPopup()) elements.g.bindPopup(`<b>Your Guess:</b> ${guessLabel}`);
          if (!elements.a) elements.a = window.L.marker([baseActual.lat, aLng], { icon: actualIcon }).addTo(map).bindPopup(`<b>Actual:</b> ${actualLabel}`);
          if (!elements.l) elements.l = window.L.polyline([[baseGuess.lat, gLng],[baseActual.lat, aLng]], { color: '#f38ba8', weight: 2, dashArray: '6,4' }).addTo(map);
        }
      } else if (roundOver) {
        let aLng = baseActual.lng + (wrap * 360);
        if (!elements.a) elements.a = window.L.marker([baseActual.lat, aLng], { icon: actualIcon }).addTo(map).bindPopup(`<b>Actual:</b> ${actualLabel}`);
      }
    }
  }

  async function submitGuess(isTimeout = false) {
    if ((!guessPlaced && !isTimeout) || roundOver || isSubmitting) return;
    isSubmitting = true;
    roundOver    = true;
    showResult   = true;
    if (timerInterval) clearInterval(timerInterval);

    const [alat, alng] = current.location.split(',').map(Number);
    baseActual = { lat: alat, lng: ((alng + 180) % 360 + 360) % 360 - 180 };

    if (!guessPlaced && isTimeout) {
      score       = 0;
      distance    = '-';
      actualLabel = 'Loading location...';
      guessLabel  = 'Time ran out!';
      updateDynamicElements();
      if (window.L && map) {
        setTimeout(() => { map.invalidateSize(); map.setView([baseActual.lat, baseActual.lng], 3); }, 300);
      }
      actualLabel = await fetchLocationName(baseActual.lat, baseActual.lng);
      roundHistory.push({ guess: null, actual: baseActual, diff: 0, score: 0, distance: '-', label: actualLabel });
      for (const elements of renderedWraps.values()) {
        if (elements.a) elements.a.setPopupContent(`<b>Actual:</b> ${actualLabel} (Time Out)`);
      }
      isSubmitting = false;
      return;
    }

    let diffLng  = baseActual.lng - baseGuess.lng;
    shortestDiffLng = ((diffLng + 180) % 360 + 360) % 360 - 180;

    const km = haversineDistance(baseGuess.lat, baseGuess.lng, baseActual.lat, baseGuess.lng + shortestDiffLng);
    distance     = Math.round(km);
    score        = calcScore(km);
    totalScore  += score;
    actualLabel  = 'Loading location...';
    guessLabel   = 'Loading location...';

    updateDynamicElements();

    if (window.L && map) {
      setTimeout(() => {
        map.invalidateSize();
        const currentWrap = Math.round((map.getCenter().lng - baseGuess.lng) / 360);
        const focusGLng   = baseGuess.lng + (currentWrap * 360);
        const focusALng   = focusGLng + shortestDiffLng;
        const bounds      = window.L.latLngBounds([baseGuess.lat, focusGLng], [baseActual.lat, focusALng]);
        map.fitBounds(bounds, { padding: [30, 30] });
        const centerElements = renderedWraps.get(currentWrap);
        if (centerElements && centerElements.a) centerElements.a.openPopup();
      }, 300);
    }

    const [fetchedActual, fetchedGuess] = await Promise.all([
      fetchLocationName(baseActual.lat, baseActual.lng),
      fetchLocationName(baseGuess.lat, baseGuess.lng),
    ]);
    actualLabel = fetchedActual;
    guessLabel  = fetchedGuess;

    roundHistory.push({ guess: { lat: baseGuess.lat, lng: baseGuess.lng }, actual: { lat: baseActual.lat, lng: baseActual.lng }, diff: shortestDiffLng, score, distance, label: actualLabel });

    for (const elements of renderedWraps.values()) {
      if (elements.a) elements.a.setPopupContent(`<b>Actual:</b> ${actualLabel}`);
      if (elements.g) elements.g.setPopupContent(`<b>Your Guess:</b> ${guessLabel}`);
    }
    isSubmitting = false;
  }

  function handleKeydown(event) {
    if (showLeaderboard && event.key === 'Escape') { showLeaderboard = false; return; }
    if (showAuthModal && event.key === 'Escape') { closeAuth(); return; }
    if (gameState === 'playing') {
      if (event.code === 'Space') {
        event.preventDefault();
        if (!roundOver && guessPlaced) submitGuess();
        else if (roundOver && !isSubmitting) nextRound();
      }
    }
  }

  onMount(async () => {
    loadSession();

    await new Promise((resolve) => {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
      const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload = resolve; document.head.appendChild(script);
    });

    map = window.L.map('guess-map', { center: [0,0], zoom: 0, minZoom: 0, zoomControl: true, attributionControl: false });
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    document.querySelector('.map-panel').addEventListener('transitionend', () => { if (map) map.invalidateSize(); });
    map.on('move', () => { if (gameState === 'playing') updateDynamicElements(); });
    map.on('click', (e) => {
      if (roundOver || gameState !== 'playing') return;
      guessPlaced = true;
      let normalizedLng = ((e.latlng.lng + 180) % 360 + 360) % 360 - 180;
      baseGuess = { lat: e.latlng.lat, lng: normalizedLng };
      for (const elements of renderedWraps.values()) {
        if (elements.g) elements.g.remove();
        if (elements.a) elements.a.remove();
        if (elements.l) elements.l.remove();
      }
      renderedWraps.clear();
      updateDynamicElements();
    });
  });

  onDestroy(() => {
    if (map) map.remove();
    if (timerInterval) clearInterval(timerInterval);
  });
</script>

<svelte:head>
  <title>worldguessr</title>
  <link rel="icon" href="favicon-worldguessr.png" />
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="app-container" style="--accent: {accentColor};">

  <!-- ─── Leaderboard Modal ─────────────────────────────────────────────── -->
  {#if showLeaderboard}
    <div class="modal-backdrop" on:click|self={() => showLeaderboard = false}>
      <div class="modal leaderboard-modal">
        <button class="modal-close" on:click={() => showLeaderboard = false}>✕</button>
        <h2 class="leaderboard-title">Leaderboard</h2>
        <p class="leaderboard-sub">Multiplayer wins</p>

        {#if leaderboardLoading}
          <div class="lb-loading">
            <div class="lb-spinner"></div>
            <span>Loading…</span>
          </div>
        {:else if leaderboardError}
          <div class="lb-error">{leaderboardError}</div>
        {:else if leaderboardData.length === 0}
          <div class="lb-empty">No games played yet. Be the first!</div>
        {:else}
          <div class="lb-table">
            <div class="lb-header">
              <span class="lb-col rank">#</span>
              <span class="lb-col player">Player</span>
              <span class="lb-col wins">Wins</span>
              <span class="lb-col games">Games</span>
              <span class="lb-col avg">Avg Score</span>
            </div>
            {#each leaderboardData as row, i}
              <div class="lb-row" class:lb-me={authUser && row.username === authUser.username} class:lb-gold={i === 0} class:lb-silver={i === 1} class:lb-bronze={i === 2}>
                <span class="lb-col rank">
                  {#if i === 0}🥇{:else if i === 1}🥈{:else if i === 2}🥉{:else}{row.rank ?? i + 1}{/if}
                </span>
                <span class="lb-col player">{row.username}{#if authUser && row.username === authUser.username} <span class="lb-you">you</span>{/if}</span>
                <span class="lb-col wins accent">{row.wins}</span>
                <span class="lb-col games">{row.games}</span>
                <span class="lb-col avg">{row.avgScore?.toLocaleString() ?? '—'}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- ─── Auth Modal ─────────────────────────────────────────────────────── -->
  {#if showAuthModal}
    <div class="modal-backdrop" on:click|self={closeAuth}>
      <div class="modal">
        <button class="modal-close" on:click={closeAuth}>✕</button>

        <div class="modal-tabs">
          <button class="tab-btn" class:active={authMode === 'login'}  on:click={() => { authMode = 'login';  authError = ''; }}>Log In</button>
          <button class="tab-btn" class:active={authMode === 'signup'} on:click={() => { authMode = 'signup'; authError = ''; }}>Sign Up</button>
        </div>

        <div class="modal-body">
          <div class="field">
            <label for="auth-username">Username</label>
            <input id="auth-username" type="text" bind:value={authUsername} placeholder="your_username" autocomplete="username" on:keydown={e => e.key === 'Enter' && submitAuth()} />
          </div>

          <div class="field">
            <label for="auth-password">Password</label>
            <input id="auth-password" type="password" bind:value={authPassword} placeholder="••••••••" autocomplete={authMode === 'signup' ? 'new-password' : 'current-password'} on:keydown={e => e.key === 'Enter' && submitAuth()} />
          </div>

          {#if authMode === 'signup'}
            <div class="field">
              <label for="auth-confirm">Confirm Password</label>
              <input id="auth-confirm" type="password" bind:value={authConfirm} placeholder="••••••••" autocomplete="new-password" on:keydown={e => e.key === 'Enter' && submitAuth()} />
            </div>
          {/if}

          {#if authError}
            <p class="auth-error">{authError}</p>
          {/if}

          <button class="auth-submit-btn" on:click={submitAuth} disabled={authLoading}>
            {authLoading ? 'Loading…' : authMode === 'signup' ? 'Create Account' : 'Log In'}
          </button>

          <p class="auth-switch">
            {#if authMode === 'login'}
              No account? <button class="link-btn" on:click={() => { authMode = 'signup'; authError = ''; }}>Sign up</button>
            {:else}
              Already have one? <button class="link-btn" on:click={() => { authMode = 'login'; authError = ''; }}>Log in</button>
            {/if}
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- ─── Menu / Options / Settings ────────────────────────────────────── -->
  {#if gameState === 'menu' || gameState === 'options' || gameState === 'settings'}
    <div class="menu-overlay">

      <!-- Top-left leaderboard button -->
      <div class="top-left-pill">
        <button class="auth-action-btn" on:click={openLeaderboard}>Leaderboard</button>
      </div>

      <!-- Top-right auth pill -->
      <div class="auth-pill">
        {#if authUser}
          <span class="auth-username">👤 {authUser.username}</span>
          <button class="auth-action-btn" on:click={logout}>Log Out</button>
        {:else}
          <button class="auth-action-btn" on:click={() => openAuth('login')}>Log In</button>
          <button class="auth-action-btn accent" on:click={() => openAuth('signup')}>Sign Up</button>
        {/if}
      </div>

      <div class="menu-content">
        <h1 class="game-title">WORLDGUESSR</h1>

        {#if gameState === 'menu'}
          <div class="menu-buttons">
            <button class="menu-btn primary" on:click={() => gameState = 'options'}>Singleplayer</button>

            <button class="menu-btn multiplayer" disabled>
              <span class="main-text">Multiplayer</span>
              <span class="hover-text">COMING SOON!</span>
            </button>

            <button class="menu-btn secondary settings-btn" on:click={() => gameState = 'settings'}>Settings</button>
          </div>
        {/if}

        {#if gameState === 'options'}
          <div class="options-panel">
            <h2>Game Options</h2>

            <div class="option-row">
              <span>Rounds</span>
              <div class="setting-controls">
                <input type="range" min="1" max="15" bind:value={maxRounds} />
                <input type="number" min="1" bind:value={maxRounds} class="num-input" />
              </div>
            </div>

            <div class="option-row">
              <span>Time Limit</span>
              <div class="setting-controls">
                <select bind:value={selectedTimeOption} class="dropdown">
                  <option value={0}>Infinite</option>
                  <option value={10}>10 Seconds</option>
                  <option value={30}>30 Seconds</option>
                  <option value={120}>2 Minutes</option>
                  <option value={300}>5 Minutes</option>
                  <option value="custom">Custom</option>
                </select>
                {#if selectedTimeOption === 'custom'}
                  <input type="number" min="1" bind:value={customTimeInput} class="num-input small" placeholder="Secs" />
                {/if}
              </div>
            </div>

            <div class="option-row">
              <span>Map</span>
              <span class="option-val">World</span>
            </div>

            <div class="options-actions">
              <button class="menu-btn secondary" on:click={() => gameState = 'menu'}>Back</button>
              <button class="menu-btn primary" on:click={startGame}>START</button>
            </div>
          </div>
        {/if}

        {#if gameState === 'settings'}
          <div class="options-panel">
            <h2>Settings</h2>

            {#if !authUser}
              <div class="guest-notice">
                <span>⚠️ You're playing as a guest.</span>
                <button class="link-btn accent" on:click={() => openAuth('signup')}>Sign up to save your settings.</button>
              </div>
            {/if}

            <div class="settings-section">
              <span class="settings-label">Accent Color</span>
              <div class="color-grid">
                {#each catppuccinColors as color}
                  <button class="color-swatch" style="background-color: {color.hex};" class:active={accentColor === color.hex} on:click={() => accentColor = color.hex} title={color.name}></button>
                {/each}
              </div>
            </div>

            <div class="option-row">
              <span>Distance Units</span>
              <div class="setting-controls">
                <select bind:value={unitSystem} class="dropdown">
                  <option value="metric">Metric (km)</option>
                  <option value="imperial">Imperial (mi)</option>
                </select>
              </div>
            </div>

            <div class="options-actions">
              <button class="menu-btn primary" on:click={() => gameState = 'menu'}>Done</button>
            </div>
          </div>
        {/if}
      </div>

      <div class="credits-container">
        <div class="credits-track">
          Developed using SvelteKit • Map Data © OpenStreetMap contributors • Imagery © Google • Not officially affiliated with GeoGuessr
        </div>
      </div>
    </div>
  {/if}

  <!-- ─── Game ──────────────────────────────────────────────────────────── -->
  <div class="game" class:hidden={gameState === 'menu' || gameState === 'options' || gameState === 'settings'}>

    {#if gameState === 'playing'}
      <div class="top-bar">
        <div class="round-counter">Round {currentRound} / {maxRounds}</div>

        {#if timeLeft !== null}
          <div class="timer-container" class:hurry={timeLeft <= 10}>{formatTime(timeLeft)}</div>
        {/if}

        <div class="score-counter">{totalScore.toLocaleString()} pts</div>
      </div>
    {/if}

    <div class="streetview-wrapper" class:hidden={gameState === 'summary'}>
      <div style="position:absolute; top:-70px; left:0; right:0; bottom:-70px; overflow:hidden;">
        {#key iframeKey}
          <iframe title="Street View" {src} allowfullscreen on:load={onStreetViewLoad} style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;"></iframe>
        {/key}
      </div>
    </div>

    <div class="map-panel" class:result={showResult} class:summary={gameState === 'summary'}>
      <div id="guess-map"></div>

      {#if gameState === 'playing'}
        {#if !roundOver}
          <button class="guess-btn" disabled={!guessPlaced} on:click={() => submitGuess()}>
            {guessPlaced ? 'Submit Guess (Space)' : 'Click map to place pin'}
          </button>
        {:else}
          <div class="result-info">
            <div class="result-row">
              <span class="result-distance">📍 {getDisplayDistance(distance).value} {getDisplayDistance(distance).unit} away</span>
              <span class="result-score">+{score?.toLocaleString()} pts</span>
            </div>
            <div class="result-label" title={actualLabel}>{actualLabel}</div>
            <button class="next-btn" disabled={isSubmitting} on:click={nextRound}>
              {currentRound < maxRounds ? 'Next Round (Space) →' : 'View Summary →'}
            </button>
          </div>
        {/if}
      {/if}

      {#if gameState === 'summary'}
        <div class="summary-overlay">
          <h2>Game Over</h2>
          <div class="summary-score">{totalScore.toLocaleString()} Total Points</div>
          {#if !authUser}
            <p class="guest-save-nudge">
              <button class="link-btn accent" on:click={() => openAuth('signup')}>Sign up</button> to save your score and track your history.
            </p>
          {/if}
          <button class="menu-btn primary" on:click={returnToMenu}>Play Again</button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(body, html) { margin: 0; padding: 0; overflow: hidden; background: #000; font-family: 'JetBrains Mono', monospace, sans-serif; }
  :global(.custom-guess-marker)  { background-color: #89b4fa; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.5); box-sizing: border-box; }
  :global(.custom-actual-marker) { background-color: var(--accent, #a6e3a1); border: 2px solid #fff; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.5); box-sizing: border-box; }

  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type="number"] { -moz-appearance: textfield; }

  .hidden { display: none !important; }
  .app-container { width: 100vw; height: 100vh; position: relative; }
  .game { width: 100%; height: 100%; position: relative; overflow: hidden; }

  /* ── Top-left pill ───────────────────────────────────────────────────────── */
  .top-left-pill {
    position: absolute; top: 18px; left: 18px;
    z-index: 10;
  }

  /* ── Leaderboard Modal ───────────────────────────────────────────────────── */
  .leaderboard-modal { width: 480px; max-width: 95vw; }

  .leaderboard-title {
    margin: 0 0 2px; font-size: 1.3rem; font-weight: 900;
    color: var(--accent); letter-spacing: 0.04em;
  }
  .leaderboard-sub { margin: 0 0 20px; font-size: 0.75rem; color: #6c7086; text-transform: uppercase; letter-spacing: 0.08em; }

  .lb-loading { display: flex; align-items: center; gap: 12px; color: #a6adc8; font-size: 0.9rem; padding: 20px 0; }
  .lb-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.1); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .lb-error { color: #f38ba8; font-size: 0.85rem; padding: 12px 0; }
  .lb-empty { color: #6c7086; font-size: 0.85rem; padding: 12px 0; text-align: center; }

  .lb-table { display: flex; flex-direction: column; gap: 4px; }

  .lb-header {
    display: flex; padding: 6px 10px;
    font-size: 0.7rem; color: #6c7086;
    text-transform: uppercase; letter-spacing: 0.08em;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    margin-bottom: 4px;
  }

  .lb-row {
    display: flex; align-items: center;
    padding: 10px 10px; border-radius: 8px;
    background: rgba(255,255,255,0.04);
    border: 1px solid transparent;
    font-size: 0.88rem;
    transition: background 0.15s;
  }
  .lb-row:hover { background: rgba(255,255,255,0.07); }
  .lb-row.lb-me { border-color: rgba(166,227,161,0.25); background: rgba(166,227,161,0.06); }
  .lb-row.lb-gold   { background: rgba(249, 226, 175, 0.07); }
  .lb-row.lb-silver { background: rgba(186, 194, 222, 0.05); }
  .lb-row.lb-bronze { background: rgba(235, 160, 172, 0.05); }

  .lb-col { display: flex; align-items: center; }
  .lb-col.rank   { width: 36px; flex-shrink: 0; font-weight: 700; font-size: 1rem; }
  .lb-col.player { flex: 1; font-weight: 700; color: #cdd6f4; gap: 6px; }
  .lb-col.wins   { width: 52px; justify-content: center; font-weight: 800; }
  .lb-col.games  { width: 60px; justify-content: center; color: #a6adc8; }
  .lb-col.avg    { width: 80px; justify-content: flex-end; color: #a6adc8; }
  .lb-col.accent { color: var(--accent); }

  .lb-you {
    background: var(--accent); color: #11111b;
    font-size: 0.65rem; font-weight: 900;
    padding: 1px 5px; border-radius: 3px;
    letter-spacing: 0.06em; text-transform: uppercase;
  }

  /* ── Auth Modal ─────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
  }

  .modal {
    background: #1e1e2e;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    width: 340px;
    padding: 28px 28px 24px;
    position: relative;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    color: #cdd6f4;
    animation: modal-in 0.18s ease;
  }
  @keyframes modal-in { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }

  .modal-close {
    position: absolute; top: 14px; right: 14px;
    background: none; border: none; color: #6c7086; font-size: 1rem; cursor: pointer;
    line-height: 1; padding: 4px;
    transition: color 0.15s;
  }
  .modal-close:hover { color: #cdd6f4; }

  .modal-tabs {
    display: flex; gap: 0; margin-bottom: 24px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .tab-btn {
    flex: 1; background: none; border: none; border-bottom: 2px solid transparent;
    color: #6c7086; font-family: inherit; font-size: 0.9rem; font-weight: 700;
    padding: 8px 0 10px; cursor: pointer; letter-spacing: 0.04em;
    text-transform: uppercase; transition: color 0.15s, border-color 0.15s;
    margin-bottom: -1px;
  }
  .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

  .modal-body { display: flex; flex-direction: column; gap: 14px; }

  .field { display: flex; flex-direction: column; gap: 5px; }
  .field label { font-size: 0.75rem; color: #a6adc8; letter-spacing: 0.06em; text-transform: uppercase; }
  .field input {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    color: #cdd6f4;
    font-family: inherit;
    font-size: 0.9rem;
    padding: 9px 12px;
    outline: none;
    transition: border-color 0.15s;
  }
  .field input:focus { border-color: var(--accent); }
  .field input::placeholder { color: #45475a; }

  .auth-error {
    background: rgba(243, 139, 168, 0.12);
    border: 1px solid rgba(243, 139, 168, 0.3);
    border-radius: 6px;
    color: #f38ba8;
    font-size: 0.8rem;
    margin: 0;
    padding: 8px 12px;
  }

  .auth-submit-btn {
    background: var(--accent); color: #11111b;
    border: none; border-radius: 7px;
    font-family: inherit; font-size: 0.9rem; font-weight: 800;
    letter-spacing: 0.05em; text-transform: uppercase;
    padding: 11px;
    cursor: pointer; transition: filter 0.15s, opacity 0.15s;
    margin-top: 2px;
  }
  .auth-submit-btn:hover:not(:disabled) { filter: brightness(0.9); }
  .auth-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .auth-switch { margin: 0; font-size: 0.8rem; color: #6c7086; text-align: center; }

  .link-btn { background: none; border: none; color: var(--accent); font-family: inherit; font-size: inherit; font-weight: 700; cursor: pointer; padding: 0; text-decoration: underline; }
  .link-btn.accent { color: var(--accent); }

  /* ── Auth Pill (top-right) ───────────────────────────────────────────── */
  .auth-pill {
    position: absolute; top: 18px; right: 18px;
    display: flex; align-items: center; gap: 8px;
    z-index: 10;
  }
  .auth-username { font-size: 0.85rem; color: #cdd6f4; font-weight: 700; }
  .auth-action-btn {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    color: #cdd6f4;
    font-family: inherit; font-size: 0.8rem; font-weight: 700;
    padding: 7px 14px; border-radius: 6px;
    cursor: pointer; transition: background 0.15s;
    letter-spacing: 0.04em;
  }
  .auth-action-btn:hover { background: rgba(255,255,255,0.15); }
  .auth-action-btn.accent { background: var(--accent); color: #11111b; border-color: transparent; }
  .auth-action-btn.accent:hover { filter: brightness(0.9); }

  /* ── Guest notices ───────────────────────────────────────────────────── */
  .guest-notice {
    background: rgba(249, 226, 175, 0.08);
    border: 1px solid rgba(249, 226, 175, 0.2);
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 0.8rem;
    color: #f9e2af;
    display: flex; flex-direction: column; gap: 4px;
    align-items: center; text-align: center;
  }
  .settings-lock-hint { font-size: 0.7rem; color: #6c7086; font-weight: 400; letter-spacing: 0; text-transform: none; }
  .guest-save-nudge { font-size: 0.78rem; color: #a6adc8; margin: 0 0 10px; text-align: center; }

  /* ── Menu ────────────────────────────────────────────────────────────── */
  .menu-overlay { position: absolute; inset: 0; background: radial-gradient(circle at center, #1e1e2e 0%, #11111b 100%); z-index: 1000; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #cdd6f4; }
  .menu-content { display: flex; flex-direction: column; align-items: center; gap: 40px; width: 100%; max-width: 400px; }
  .game-title { font-size: 4rem; font-weight: 900; letter-spacing: 0.1em; margin: 0; text-shadow: 0 4px 12px rgba(0,0,0,0.5); background: linear-gradient(135deg, #89b4fa, var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .menu-buttons { display: flex; flex-direction: column; gap: 16px; width: 100%; }

  .menu-btn { width: 100%; padding: 16px; font-family: inherit; font-size: 1.1rem; font-weight: 800; letter-spacing: 0.05em; border-radius: 8px; border: none; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; }
  .menu-btn.primary { background: var(--accent); color: #11111b; }
  .menu-btn.primary:hover { filter: brightness(0.9); transform: translateY(-2px); }
  .menu-btn.secondary { background: rgba(255,255,255,0.1); color: #cdd6f4; }
  .menu-btn.secondary:hover { background: rgba(255,255,255,0.2); }
  .menu-btn.multiplayer { background: rgba(255,255,255,0.05); color: rgba(205,214,244,0.4); cursor: not-allowed; }
  .menu-btn.multiplayer .hover-text { display: none; color: #f38ba8; }
  .menu-btn.multiplayer:hover .main-text { display: none; }
  .menu-btn.multiplayer:hover .hover-text { display: block; }

  .options-panel { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; width: 100%; display: flex; flex-direction: column; gap: 16px; }
  .options-panel h2 { margin: 0 0 8px 0; text-align: center; font-size: 1.2rem; }
  .option-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 0.9rem; color: #a6adc8; }
  .option-val { color: #cdd6f4; font-weight: bold; }
  .options-actions { display: flex; gap: 12px; margin-top: 12px; }

  .settings-section { display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 6px; }
  .settings-label { font-size: 0.9rem; color: #a6adc8; margin-bottom: 4px; }
  .color-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
  .color-swatch { width: 100%; aspect-ratio: 1; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.2s; }
  .color-swatch:hover { transform: scale(1.1); }
  .color-swatch.active { border-color: #fff; transform: scale(1.1); box-shadow: 0 0 8px rgba(255,255,255,0.3); }

  .setting-controls { display: flex; align-items: center; gap: 10px; }
  .num-input { width: 60px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 4px 8px; border-radius: 4px; font-family: inherit; font-weight: bold; text-align: center; outline: none; }
  .num-input:focus { border-color: var(--accent); }
  .num-input.small { width: 70px; }
  .dropdown { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 4px 8px; border-radius: 4px; font-family: inherit; font-weight: bold; outline: none; cursor: pointer; }
  .dropdown option { background: #1e1e2e; }
  input[type=range] { accent-color: var(--accent); cursor: pointer; }

  .credits-container { position: absolute; bottom: 40px; width: 100%; overflow: hidden; white-space: nowrap; opacity: 0.4; font-size: 0.9rem; }
  .credits-track { display: inline-block; padding-left: 100%; animation: marquee 25s linear infinite; }
  @keyframes marquee { 0% { transform: translate(0,0); } 100% { transform: translate(-100%,0); } }

  /* ── Game HUD ────────────────────────────────────────────────────────── */
  .top-bar { position: absolute; top: 0; left: 0; right: 0; padding: 20px; display: flex; justify-content: space-between; align-items: flex-start; z-index: 50; pointer-events: none; }
  .round-counter, .score-counter { background: rgba(17,17,27,0.85); color: #cdd6f4; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 1.1rem; backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); }
  .score-counter { color: var(--accent); }
  .timer-container { position: absolute; left: 50%; transform: translateX(-50%); background: rgba(17,17,27,0.85); color: #cdd6f4; padding: 8px 24px; border-radius: 8px; font-weight: 900; font-size: 1.5rem; backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); transition: color 0.3s, transform 0.2s; }
  .timer-container.hurry { color: #f38ba8; animation: pulse 1s infinite; }
  @keyframes pulse { 0% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } 100% { transform: translateX(-50%) scale(1); } }

  .streetview-wrapper { width: 100%; height: 100%; overflow: hidden; position: absolute; inset: 0; }

  .map-panel { position: absolute; bottom: 20px; right: 20px; width: 250px; height: 200px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3); transition: all 0.3s cubic-bezier(0.4,0,0.2,1); overflow: hidden; z-index: 100; display: flex; flex-direction: column; opacity: 0.5; }
  .map-panel:hover, .map-panel.result { width: 380px; height: 300px; opacity: 1; }
  .map-panel.result { height: 370px; }
  .map-panel.summary { width: 100vw; height: 100vh; bottom: 0; right: 0; border-radius: 0; opacity: 1; z-index: 2000; }
  #guess-map { flex: 1; min-height: 0; border-top: 1px solid rgba(137,180,250,0.1); }

  .summary-overlay { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); background: rgba(17,17,27,0.95); padding: 30px 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 40px rgba(0,0,0,0.5); text-align: center; color: #fff; z-index: 2500; pointer-events: auto; }
  .summary-overlay h2 { margin: 0 0 10px 0; font-size: 2rem; color: var(--accent); }
  .summary-score { font-size: 1.5rem; color: var(--accent); font-weight: bold; margin-bottom: 16px; }

  .guess-btn { flex-shrink: 0; margin: 10px; padding: 10px; background: var(--accent); color: #1e1e2e; border: none; border-radius: 6px; font-family: inherit; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.05em; cursor: pointer; transition: filter 0.2s, opacity 0.2s; }
  .guess-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .guess-btn:not(:disabled):hover { filter: brightness(1.1); }

  .result-info { flex-shrink: 0; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; background: rgba(17,17,27,0.95); }
  .result-row { display: flex; justify-content: space-between; align-items: center; }
  .result-distance { color: #f38ba8; font-size: 0.78rem; font-weight: 700; }
  .result-score { color: var(--accent); font-size: 1.1rem; font-weight: 700; }
  .result-label { color: #cdd6f4; font-size: 0.72rem; opacity: 0.7; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .next-btn { padding: 9px; background: var(--accent); color: #1e1e2e; border: none; border-radius: 6px; font-family: inherit; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: filter 0.2s; }
  .next-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .next-btn:not(:disabled):hover { filter: brightness(1.1); }
</style>