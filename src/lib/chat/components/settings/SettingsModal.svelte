<script lang="ts">
  import { appearance, type TimestampMode } from '../../state/appearance.svelte';
  import { toast } from '../../state/toasts.svelte';
  import { auth } from '../../state/auth.svelte';
  import { avatars } from '../../state/avatars.svelte';
  import { ui } from '../../state/ui.svelte';
  import { setAvatar } from '../../api/avatars';
  import { setBanner, updateProfile } from '../../api/profile';
  import { profiles } from '../../state/profiles.svelte';
  import { NOTIFY_SOUNDS, findNotifySound } from '../../notifySounds';
  import { BUILTIN_THEMES, getTheme } from '../../themes';
  import { importThemeFromString } from '../../themes/codec';
  import Icon from '../ui/Icon.svelte';
  import Avatar from '../ui/Avatar.svelte';
  import ThemeMaker from './ThemeMaker.svelte';

  let { open = $bindable(false) } = $props();

  const TABS = [
    'profile',
    'appearance',
    'chat',
    'notifications',
    'accessibility',
    'keyboard',
    'servers',
    'about',
    'advanced'
  ] as const;
  type Tab = (typeof TABS)[number];

  let activeTab = $state<Tab>('appearance');
  let importCode = $state('');
  let importError = $state('');

  // --- draft state (committed only on "save changes") ---
  let draftMode = $state<'single' | 'dual'>('single');
  let draftActiveMode = $state<'dark' | 'light'>('dark');
  let draftDarkTheme = $state('catppuccin-macchiato');
  let draftLightTheme = $state('catppuccin-latte');
  let draftAccents = $state<Record<string, string>>({});

  let draftShowTimestamps = $state<TimestampMode>('hover');
  let draftGroupConsecutive = $state(true);
  let draftShowEmbeds = $state(true);
  let draftEnterToSend = $state(true);
  let draftShowMembersList = $state(true);
  let draftCompactMessages = $state(false);
  let draftReduceMotion = $state(false);
  let draftFontScale = $state(1);
  let draftNotificationSound = $state('off');
  let draftNotificationVolume = $state(1);
  let draftDesktopNotifications = $state(false);
  let draftConfirmDeletes = $state(true);

  let isDirty = $state(false);

  // --- profile card form ---
  let profDisplayName = $state('');
  let profPronouns = $state('');
  let profBio = $state('');
  let profColor = $state('#5865f2');
  let profSaving = $state(false);

  /** Bios are capped at 6 lines (and 300 chars) to fit the profile card. */
  function clampBio(value: string): string {
    return value.replace(/\r\n?/g, '\n').split('\n').slice(0, 6).join('\n').slice(0, 300);
  }

  type Snapshot = {
    mode: 'system' | 'light' | 'dark';
    darkTheme: string;
    lightTheme: string;
    accents: Record<string, string>;
    showTimestamps: TimestampMode;
    groupConsecutiveMessages: boolean;
    showEmbeds: boolean;
    enterToSend: boolean;
    showMembersList: boolean;
    compactMessages: boolean;
    reduceMotion: boolean;
    fontScale: number;
    notificationSound: string;
    notificationVolume: number;
    desktopNotifications: boolean;
    confirmDeletes: boolean;
  };
  let baseline: Snapshot | null = null;

  function snapshot(): Snapshot {
    return {
      mode: appearance.mode,
      darkTheme: appearance.darkTheme,
      lightTheme: appearance.lightTheme,
      accents: JSON.parse(JSON.stringify(appearance.accents)),
      showTimestamps: appearance.showTimestamps,
      groupConsecutiveMessages: appearance.groupConsecutiveMessages,
      showEmbeds: appearance.showEmbeds,
      enterToSend: appearance.enterToSend,
      showMembersList: appearance.showMembersList,
      compactMessages: appearance.compactMessages,
      reduceMotion: appearance.reduceMotion,
      fontScale: appearance.fontScale,
      notificationSound: appearance.notificationSound,
      notificationVolume: appearance.notificationVolume,
      desktopNotifications: appearance.desktopNotifications,
      confirmDeletes: appearance.confirmDeletes
    };
  }

  // Sync draft state from active settings on open
  $effect(() => {
    if (open) {
      baseline = snapshot();
      draftMode = appearance.mode === 'system' ? 'dual' : 'single';
      draftActiveMode = appearance.mode === 'light' ? 'light' : 'dark';
      draftDarkTheme = appearance.darkTheme;
      draftLightTheme = appearance.lightTheme;
      draftAccents = JSON.parse(JSON.stringify(appearance.accents));
      draftShowTimestamps = appearance.showTimestamps;
      draftGroupConsecutive = appearance.groupConsecutiveMessages;
      draftShowEmbeds = appearance.showEmbeds;
      draftEnterToSend = appearance.enterToSend;
      draftShowMembersList = appearance.showMembersList;
      draftCompactMessages = appearance.compactMessages;
      draftReduceMotion = appearance.reduceMotion;
      draftFontScale = appearance.fontScale;
      draftNotificationSound = appearance.notificationSound;
      draftNotificationVolume = appearance.notificationVolume;
      draftDesktopNotifications = appearance.desktopNotifications;
      draftConfirmDeletes = appearance.confirmDeletes;
      isDirty = false;
    }
  });

  function markDirty() {
    isDirty = true;
    // Live-preview the draft theme without saving to storage or the server.
    appearance.applyPreview({
      mode: draftMode === 'dual' ? 'system' : draftActiveMode,
      darkTheme: draftDarkTheme,
      lightTheme: draftLightTheme,
      accents: draftAccents,
      customThemes: appearance.customThemes
    });
  }

  /** Non-theme settings preview live; they only persist together on Save. */
  function chatDirty() {
    isDirty = true;
  }

  function previewSound(id: string) {
    const sound = findNotifySound(id);
    if (!sound) return;
    const audio = new Audio(sound.file);
    audio.volume = draftNotificationVolume;
    audio.play().catch(() => {});
  }

  const myName = $derived(auth.user ?? '');
  const myProfile = $derived(profiles.get(myName));

  // Load the signed-in user's profile card into the form when the modal opens.
  $effect(() => {
    if (!open) return;
    const name = myName;
    void profiles.ensure(name).then(() => {
      const p = profiles.get(name);
      if (!p) return;
      profDisplayName = p.display_name ?? '';
      profPronouns = p.pronouns ?? '';
      profBio = p.bio ?? '';
      profColor = p.profile_color ?? '#5865f2';
    });
  });

  function changeAvatar() {
    const name = myName;
    if (!name) return;
    ui.pickImage({
      title: 'change profile picture',
      name,
      value: avatars.get(name),
      shape: 'circle',
      maxDim: 512,
      onpick: async (value) => {
        try {
          const res = await setAvatar(value);
          avatars.set(name, res.avatar);
          toast('Profile picture updated', 'success');
        } catch {
          toast('Failed to update profile picture', 'error');
        }
      }
    });
  }

  async function removeAvatar() {
    const name = myName;
    if (!name) return;
    try {
      await setAvatar(null);
      avatars.set(name, null);
      toast('Profile picture removed');
    } catch {
      toast('Failed to remove profile picture', 'error');
    }
  }

  function changeBanner() {
    const name = myName;
    if (!name) return;
    ui.pickImage({
      title: 'change banner',
      name,
      value: profiles.get(name)?.banner ?? null,
      shape: 'square',
      aspect: 3,
      maxDim: 960,
      onpick: async (value) => {
        try {
          const res = await setBanner(value);
          profiles.patch(name, { banner: res.banner });
          toast('Banner updated', 'success');
        } catch {
          toast('Failed to update banner', 'error');
        }
      }
    });
  }

  async function removeBanner() {
    const name = myName;
    if (!name) return;
    try {
      await setBanner(null);
      profiles.patch(name, { banner: null });
      toast('Banner removed');
    } catch {
      toast('Failed to remove banner', 'error');
    }
  }

  async function saveProfile() {
    const name = myName;
    if (!name || profSaving) return;
    profSaving = true;
    try {
      const bio = clampBio(profBio.trim());
      await updateProfile({ display_name: profDisplayName.trim(), pronouns: profPronouns, bio, profile_color: profColor });
      profiles.patch(name, { display_name: profDisplayName.trim(), pronouns: profPronouns.trim(), bio, profile_color: profColor });
      toast('Profile updated', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to update profile', 'error');
    } finally {
      profSaving = false;
    }
  }

  function handleSave() {
    if (!isDirty) return;

    appearance.mode = draftMode === 'dual' ? 'system' : draftActiveMode;
    appearance.darkTheme = draftDarkTheme;
    appearance.lightTheme = draftLightTheme;
    appearance.accents = draftAccents;
    appearance.showTimestamps = draftShowTimestamps;
    appearance.groupConsecutiveMessages = draftGroupConsecutive;
    appearance.showEmbeds = draftShowEmbeds;
    appearance.enterToSend = draftEnterToSend;
    appearance.showMembersList = draftShowMembersList;
    appearance.compactMessages = draftCompactMessages;
    appearance.reduceMotion = draftReduceMotion;
    appearance.fontScale = draftFontScale;
    appearance.notificationSound = draftNotificationSound;
    appearance.notificationVolume = draftNotificationVolume;
    appearance.desktopNotifications = draftDesktopNotifications;
    appearance.confirmDeletes = draftConfirmDeletes;

    appearance.save();
    baseline = snapshot();
    isDirty = false;
    toast('Saved settings', 'success');
  }

  function close() {
    // Discard unsaved edits: restore every setting and put the theme back.
    if (isDirty && baseline) {
      const b = baseline;
      appearance.mode = b.mode;
      appearance.darkTheme = b.darkTheme;
      appearance.lightTheme = b.lightTheme;
      appearance.accents = b.accents;
      appearance.showTimestamps = b.showTimestamps;
      appearance.groupConsecutiveMessages = b.groupConsecutiveMessages;
      appearance.showEmbeds = b.showEmbeds;
      appearance.enterToSend = b.enterToSend;
      appearance.showMembersList = b.showMembersList;
      appearance.compactMessages = b.compactMessages;
      appearance.reduceMotion = b.reduceMotion;
      appearance.fontScale = b.fontScale;
      appearance.notificationSound = b.notificationSound;
      appearance.notificationVolume = b.notificationVolume;
      appearance.desktopNotifications = b.desktopNotifications;
      appearance.confirmDeletes = b.confirmDeletes;
      appearance.applyToDOM();
      isDirty = false;
    }
    open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  async function handleImport() {
    importError = '';
    try {
      const imported = await importThemeFromString(importCode.trim());
      appearance.customThemes.push(imported);
      appearance.save();
      importCode = '';
    } catch (err: any) {
      importError = err.message || 'Failed to import theme';
    }
  }

  function handleReset() {
    if (!confirm('Reset every appearance setting to its default?')) return;
    appearance.reset();
    if (open) markDirty();
    baseline = snapshot();
    isDirty = false;
    toast('Settings reset');
  }

  async function toggleDesktop(e: Event) {
    const on = (e.currentTarget as HTMLInputElement).checked;
    draftDesktopNotifications = on;
    chatDirty();
    if (on && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
  }

  const darkThemes = $derived(BUILTIN_THEMES.filter((t) => t.mode === 'dark'));
  const lightThemes = $derived(BUILTIN_THEMES.filter((t) => t.mode === 'light'));

  const activeSelectedTheme = $derived(
    draftActiveMode === 'dark' ? getTheme(draftDarkTheme) : getTheme(draftLightTheme)
  );

  const SHORTCUTS: { keys: string; what: string }[] = [
    { keys: 'Enter', what: 'send message' },
    { keys: 'Shift + Enter', what: 'new line' },
    { keys: 'Esc', what: 'cancel reply / close modal' },
    { keys: '↑', what: 'edit your last message (when empty)' },
    { keys: 'Click avatar', what: 'open a profile' },
    { keys: 'Right click', what: 'message actions' }
  ];
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={close} onkeydown={(e) => e.key === 'Escape' && close()} role="presentation">
    <div class="modal-body" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <header class="modal-header">
        <h2>settings</h2>
        <button class="icon-btn" onclick={close} aria-label="Close modal">
          <Icon name="x" />
        </button>
      </header>

      <div class="settings-layout">
        <nav class="settings-sidebar">
          {#each TABS as t (t)}
            <button class="tab-btn" class:active={activeTab === t} onclick={() => (activeTab = t)}>{t}</button>
          {/each}
        </nav>

        <main class="settings-content">
          {#if activeTab === 'profile'}
            <section class="setting-group">
              <h3>profile picture</h3>
              <div class="pfp-row">
                <Avatar name={myName} size={72} />
                <div class="pfp-actions">
                  <button type="button" class="action-btn" onclick={changeAvatar}>change picture</button>
                  {#if avatars.get(myName)}
                    <button type="button" class="action-btn danger" onclick={removeAvatar}>remove</button>
                  {/if}
                  <span class="pfp-note">upload a photo or pick a GIF from Giphy</span>
                </div>
              </div>
            </section>

            <section class="setting-group">
              <h3>account</h3>
              <div class="setting-row">
                <span class="setting-label">signed in as</span>
                <span class="account-name">{myName}</span>
              </div>
            </section>

            <section class="setting-group">
              <h3>banner</h3>
              <div class="banner-row">
                <div
                  class="banner-preview"
                  style={myProfile?.profile_color
                    ? `background: linear-gradient(135deg, ${myProfile.profile_color}, color-mix(in srgb, ${myProfile.profile_color} 35%, #000));`
                    : 'background: linear-gradient(135deg, var(--accent), var(--crust));'}
                >
                  {#if myProfile?.banner}<img src={myProfile.banner} alt="" />{/if}
                </div>
                <div class="pfp-actions">
                  <button type="button" class="action-btn" onclick={changeBanner}>change banner</button>
                  {#if myProfile?.banner}
                    <button type="button" class="action-btn danger" onclick={removeBanner}>remove</button>
                  {/if}
                </div>
              </div>
            </section>

            <section class="setting-group">
              <h3>profile details</h3>
              <div class="stack-form">
                <label class="field-label">
                  <span>display name</span>
                  <input class="field" type="text" placeholder={myName} maxlength="40" bind:value={profDisplayName} spellcheck="false" autocomplete="off" />
                </label>
                <label class="field-label">
                  <span>pronouns</span>
                  <input class="field" type="text" placeholder="they/them" maxlength="40" bind:value={profPronouns} spellcheck="false" autocomplete="off" />
                </label>
                <label class="field-label">
                  <span>bio</span>
                  <textarea
                    class="field"
                    rows="6"
                    maxlength="300"
                    placeholder="a little about you…"
                    value={profBio}
                    oninput={(e) => (profBio = clampBio(e.currentTarget.value))}
                  ></textarea>
                </label>
                <label class="field-label">
                  <span>accent colour</span>
                  <span class="color-row">
                    <input type="color" bind:value={profColor} />
                    <input class="field" type="text" maxlength="7" bind:value={profColor} spellcheck="false" />
                  </span>
                </label>
                <button type="button" class="action-btn" disabled={profSaving} onclick={saveProfile}>
                  {profSaving ? 'saving…' : 'save profile details'}
                </button>
                <span class="pfp-note">your username stays visible on your profile as @{myName}.</span>
              </div>
            </section>
          {:else if activeTab === 'appearance'}
            <section class="setting-group">
              <div class="setting-row">
                <span class="setting-label">mode</span>
                <div class="toggle-group">
                  <button class="mode-toggle-btn" class:active={draftActiveMode === 'dark'} onclick={() => { draftActiveMode = 'dark'; markDirty(); }}>
                    dark
                  </button>
                  <button class="mode-toggle-btn" class:active={draftActiveMode === 'light'} onclick={() => { draftActiveMode = 'light'; markDirty(); }}>
                    light
                  </button>
                </div>
              </div>

              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={draftMode === 'dual'}
                  onchange={(e) => {
                    draftMode = e.currentTarget.checked ? 'dual' : 'single';
                    markDirty();
                  }}
                />
                <span>select both a light and dark theme (sync with system)</span>
              </label>
            </section>

            {#if activeSelectedTheme}
              <section class="setting-group">
                <h3>accent color ({activeSelectedTheme.name.toLowerCase()})</h3>
                <div class="accent-row">
                  {#each activeSelectedTheme.accents as acc}
                    <button
                      class="accent-btn"
                      class:selected={(draftAccents[activeSelectedTheme.id] || activeSelectedTheme.defaultAccent) === acc.id}
                      style="background: {acc.value}"
                      title={acc.name}
                      aria-label={acc.name}
                      onclick={() => {
                        draftAccents[activeSelectedTheme.id] = acc.id;
                        markDirty();
                      }}
                    ></button>
                  {/each}
                </div>
              </section>
            {/if}

            {#if draftMode === 'dual' || draftActiveMode === 'dark'}
              <section class="setting-group">
                <h3>dark themes</h3>
                <div class="theme-grid">
                  {#each darkThemes as theme}
                    <button
                      class="theme-card"
                      class:active={draftDarkTheme === theme.id}
                      onclick={() => {
                        draftDarkTheme = theme.id;
                        draftActiveMode = 'dark';
                        markDirty();
                      }}
                    >
                      <div class="swatch-row">
                        <span class="swatch" style="background: {theme.tokens.crust}"></span>
                        <span class="swatch" style="background: {theme.tokens.base}"></span>
                        <span class="swatch" style="background: {theme.tokens.surface0}"></span>
                        <span class="swatch" style="background: {theme.tokens.text}"></span>
                      </div>
                      <span class="theme-name">{theme.name.toLowerCase()}</span>
                    </button>
                  {/each}
                </div>
              </section>
            {/if}

            {#if draftMode === 'dual' || draftActiveMode === 'light'}
              <section class="setting-group">
                <h3>light themes</h3>
                <div class="theme-grid">
                  {#each lightThemes as theme}
                    <button
                      class="theme-card"
                      class:active={draftLightTheme === theme.id}
                      onclick={() => {
                        draftLightTheme = theme.id;
                        draftActiveMode = 'light';
                        markDirty();
                      }}
                    >
                      <div class="swatch-row">
                        <span class="swatch" style="background: {theme.tokens.crust}"></span>
                        <span class="swatch" style="background: {theme.tokens.base}"></span>
                        <span class="swatch" style="background: {theme.tokens.surface0}"></span>
                        <span class="swatch" style="background: {theme.tokens.text}"></span>
                      </div>
                      <span class="theme-name">{theme.name.toLowerCase()}</span>
                    </button>
                  {/each}
                </div>
              </section>
            {/if}

            <section class="setting-group">
              <h3>import custom theme</h3>
              <div class="import-row">
                <input type="text" placeholder="paste uct1:... string" bind:value={importCode} class="import-input" />
                <button class="action-btn" onclick={handleImport}>import</button>
              </div>
              {#if importError}<p class="error-msg">{importError}</p>{/if}
            </section>

            <section class="setting-group">
              <h3>theme maker</h3>
              <ThemeMaker />
            </section>
          {:else if activeTab === 'chat'}
            <section class="setting-group">
              <h3>messages</h3>
              <div class="opt-row">
                <span>timestamps</span>
                <select
                  class="select"
                  value={draftShowTimestamps}
                  onchange={(e) => {
                    draftShowTimestamps = e.currentTarget.value as TimestampMode;
                    chatDirty();
                  }}
                >
                  <option value="always">always</option>
                  <option value="hover">on hover</option>
                  <option value="never">never</option>
                </select>
              </div>
              <label class="opt-row">
                <span>group consecutive messages</span>
                <input type="checkbox" checked={draftGroupConsecutive} onchange={(e) => { draftGroupConsecutive = e.currentTarget.checked; chatDirty(); }} />
              </label>
              <label class="opt-row">
                <span>show link previews</span>
                <input type="checkbox" checked={draftShowEmbeds} onchange={(e) => { draftShowEmbeds = e.currentTarget.checked; chatDirty(); }} />
              </label>
              <label class="opt-row">
                <span>press Enter to send</span>
                <input type="checkbox" checked={draftEnterToSend} onchange={(e) => { draftEnterToSend = e.currentTarget.checked; chatDirty(); }} />
              </label>
              <label class="opt-row">
                <span>compact messages</span>
                <input type="checkbox" checked={draftCompactMessages} onchange={(e) => { draftCompactMessages = e.currentTarget.checked; chatDirty(); }} />
              </label>
            </section>
          {:else if activeTab === 'notifications'}
            <section class="setting-group">
              <h3>notifications</h3>
              <div class="opt-row">
                <span>notification sound</span>
                <select
                  class="select"
                  value={draftNotificationSound}
                  onchange={(e) => {
                    draftNotificationSound = e.currentTarget.value;
                    previewSound(draftNotificationSound);
                    chatDirty();
                  }}
                >
                  <option value="off">off</option>
                  {#each NOTIFY_SOUNDS as s (s.id)}
                    <option value={s.id}>{s.name.toLowerCase()}</option>
                  {/each}
                </select>
              </div>
              <div class="opt-row">
                <span>sound volume ({Math.round(draftNotificationVolume * 100)}%)</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={draftNotificationVolume}
                  oninput={(e) => { draftNotificationVolume = Number(e.currentTarget.value); chatDirty(); }}
                />
              </div>
              <button
                type="button"
                class="action-btn"
                disabled={draftNotificationSound === 'off'}
                onclick={() => previewSound(draftNotificationSound)}
              >
                test notification
              </button>
              <label class="opt-row">
                <span>desktop notifications for DMs</span>
                <input type="checkbox" checked={draftDesktopNotifications} onchange={toggleDesktop} />
              </label>
            </section>
          {:else if activeTab === 'accessibility'}
            <section class="setting-group">
              <h3>accessibility</h3>
              <label class="opt-row">
                <span>reduce motion</span>
                <input type="checkbox" checked={draftReduceMotion} onchange={(e) => { draftReduceMotion = e.currentTarget.checked; chatDirty(); }} />
              </label>
              <div class="opt-row">
                <span>message font size ({Math.round(draftFontScale * 100)}%)</span>
                <input
                  type="range"
                  min="0.85"
                  max="1.3"
                  step="0.05"
                  value={draftFontScale}
                  oninput={(e) => {
                    draftFontScale = Number(e.currentTarget.value);
                    appearance.fontScale = draftFontScale;
                    appearance.applyToDOM();
                    chatDirty();
                  }}
                />
              </div>
            </section>
          {:else if activeTab === 'keyboard'}
            <section class="setting-group">
              <h3>keyboard shortcuts</h3>
              <div class="shortcut-list">
                {#each SHORTCUTS as s (s.keys)}
                  <div class="shortcut-row">
                    <kbd>{s.keys}</kbd>
                    <span>{s.what}</span>
                  </div>
                {/each}
              </div>
            </section>
          {:else if activeTab === 'servers'}
            <section class="setting-group">
              <h3>servers</h3>
              <label class="opt-row">
                <span>show the member list in servers</span>
                <input type="checkbox" checked={draftShowMembersList} onchange={(e) => { draftShowMembersList = e.currentTarget.checked; chatDirty(); }} />
              </label>
            </section>
          {:else if activeTab === 'about'}
            <section class="setting-group">
              <h3>about</h3>
              <p class="about-copy">
                studiobean chat — a small, self-hosted messenger with servers, DMs, themes and a friends system.
                Built with SvelteKit and Socket.IO.
              </p>
              <div class="setting-row">
                <span class="setting-label">signed in as</span>
                <span class="account-name">{myName}</span>
              </div>
            </section>
          {:else if activeTab === 'advanced'}
            <section class="setting-group">
              <h3>advanced</h3>
              <label class="opt-row">
                <span>confirm before deleting servers/channels</span>
                <input type="checkbox" checked={draftConfirmDeletes} onchange={(e) => { draftConfirmDeletes = e.currentTarget.checked; chatDirty(); }} />
              </label>
              <div class="opt-row">
                <span>reset all appearance &amp; chat settings</span>
                <button type="button" class="action-btn danger" onclick={handleReset}>reset</button>
              </div>
            </section>
          {/if}
        </main>
      </div>

      <footer class="modal-footer">
        <button class="save-btn" disabled={!isDirty} onclick={handleSave}>save changes</button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }
  .modal-body {
    background: var(--mantle);
    border: 1px solid var(--surface0);
    border-radius: 8px;
    width: 720px;
    height: 580px;
    max-width: 92vw;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--surface0);
  }
  .modal-header h2 { margin: 0; font-size: 1.1rem; font-weight: 600; }
  .settings-layout { display: flex; flex: 1; overflow: hidden; }
  .settings-sidebar {
    width: 160px;
    background: var(--crust);
    border-right: 1px solid var(--surface0);
    padding: 0.75rem 0.5rem;
    overflow-y: auto;
  }
  .tab-btn {
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--subtext0);
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    text-transform: capitalize;
  }
  .tab-btn.active, .tab-btn:hover { background: var(--surface0); color: var(--text); }
  .settings-content { flex: 1; padding: 1.25rem; overflow-y: auto; }
  .setting-group { margin-bottom: 1.5rem; }
  .setting-group h3 { font-size: 0.85rem; color: var(--subtext0); margin-bottom: 0.5rem; }
  .setting-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
  .setting-label { font-size: 0.85rem; color: var(--subtext0); }
  .toggle-group { display: flex; background: var(--base); border: 1px solid var(--surface0); border-radius: 4px; padding: 2px; }
  .mode-toggle-btn {
    background: transparent;
    border: none;
    color: var(--subtext0);
    padding: 0.25rem 0.75rem;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.8rem;
  }
  .mode-toggle-btn.active { background: var(--surface0); color: var(--text); }
  .checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--subtext0); cursor: pointer; }
  .accent-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .accent-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
  }
  .accent-btn.selected { border-color: var(--text); transform: scale(1.1); }
  .theme-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .theme-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--base);
    border: 1px solid var(--surface0);
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: var(--text);
  }
  .theme-card.active { border-color: var(--accent); }
  .swatch-row { display: flex; gap: 0.25rem; }
  .swatch { width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.1); }
  .theme-name { font-size: 0.8rem; }
  .import-row { display: flex; gap: 0.5rem; }
  .import-input, .field {
    flex: 1;
    background: var(--base);
    border: 1px solid var(--surface0);
    color: var(--text);
    padding: 0.5rem;
    border-radius: 4px;
    font-family: inherit;
  }
  .field { flex: none; width: 100%; box-sizing: border-box; }
  .stack-form { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; max-width: 320px; }
  .stack-form .action-btn { width: 100%; }
  .action-btn {
    background: var(--surface0);
    color: var(--text);
    border: 1px solid var(--surface1);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
  }
  .action-btn:hover { background: var(--surface1); }
  .action-btn:disabled { opacity: 0.6; cursor: default; }
  .action-btn.danger { color: var(--red); }
  .action-btn.danger:hover { background: color-mix(in srgb, var(--red) 10%, transparent); }
  .pfp-row { display: flex; align-items: center; gap: 1rem; }
  .pfp-row :global(.avatar) { border-radius: 50%; }
  .pfp-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .banner-row { display: flex; align-items: center; gap: 1rem; }
  .banner-preview { width: 180px; height: 60px; border-radius: 6px; overflow: hidden; border: 1px solid var(--surface0); flex-shrink: 0; }
  .banner-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .field-label { display: flex; flex-direction: column; gap: 0.35rem; width: 100%; }
  .field-label > span:first-child { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--overlay0); font-weight: 700; }
  .field-label textarea.field { resize: vertical; min-height: 96px; }
  .color-row { display: flex; align-items: center; gap: 0.5rem; width: 100%; }
  .color-row input[type='color'] { width: 44px; height: 34px; padding: 0; border: 1px solid var(--surface0); border-radius: 4px; background: none; cursor: pointer; }
  .color-row .field { flex: 1; }
  .pfp-note { font-size: 11px; color: var(--overlay0); display: block; margin-top: 0.5rem; }
  .account-name { font-size: 0.85rem; font-weight: 700; }
  .modal-footer {
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--surface0);
    display: flex;
    justify-content: flex-end;
    background: var(--crust);
  }
  .save-btn {
    background: var(--accent);
    color: var(--on-accent);
    border: none;
    padding: 0.5rem 1.25rem;
    border-radius: 4px;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .save-btn:disabled {
    background: var(--surface0);
    color: var(--subtext0);
    cursor: not-allowed;
    opacity: 0.6;
  }
  .icon-btn { background: transparent; border: none; color: var(--subtext0); cursor: pointer; }
  .error-msg { color: var(--red); font-size: 0.8rem; margin-top: 0.25rem; }

  .opt-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.5rem 0; font-size: 0.85rem; color: var(--subtext0); cursor: pointer; }
  .opt-row input[type='checkbox'] { cursor: pointer; }
  .opt-row input[type='range'] { accent-color: var(--accent); cursor: pointer; }
  .opt-row > span { flex: 1; }
  .select {
    background: var(--base);
    border: 1px solid var(--surface0);
    color: var(--text);
    padding: 0.35rem 0.5rem;
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .select:focus { outline: none; border-color: var(--accent); }
  .shortcut-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .shortcut-row { display: flex; align-items: center; gap: 1rem; font-size: 0.85rem; color: var(--subtext0); }
  .shortcut-row kbd {
    background: var(--base);
    border: 1px solid var(--surface1);
    border-radius: 4px;
    padding: 0.2rem 0.5rem;
    font-family: inherit;
    font-size: 0.75rem;
    min-width: 96px;
    text-align: center;
  }
  .about-copy { font-size: 0.85rem; color: var(--subtext0); line-height: 1.5; margin: 0 0 1rem; }
</style>
