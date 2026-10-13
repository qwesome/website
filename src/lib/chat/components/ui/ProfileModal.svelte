<script lang="ts">
  import { goto } from '$app/navigation';
  import { requestFriend, respondFriend, removeFriend } from '../../api/friends';
  import { setAvatar } from '../../api/avatars';
  import { setBanner, updateProfile } from '../../api/profile';
  import { auth } from '../../state/auth.svelte';
  import { avatars } from '../../state/avatars.svelte';
  import { friends } from '../../state/friends.svelte';
  import { presence } from '../../state/presence.svelte';
  import { profiles } from '../../state/profiles.svelte';
  import { ui } from '../../state/ui.svelte';
  import { toast } from '../../state/toasts.svelte';
  import { dmHref } from '../../utils/route';
  import { ensureLegible, hexToRgb, mix, readableOn, rgbToHex } from '../../utils/color';
  import type { Status } from '../../types';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

  const me = $derived(auth.user ?? '');
  const user = $derived(ui.profileUser);

  const isMe = $derived(user ? user === me : false);
  const status = $derived((user ? presence.statusOf(user) : 'offline') as Status);
  const isFriend = $derived(user ? friends.isFriend(user) : false);
  const isOutgoing = $derived(user ? friends.hasOutgoingTo(user) : false);
  const isIncoming = $derived(user ? friends.hasRequestFrom(user) : false);

  const statusLabel = $derived(({ online: 'Online', away: 'Away', offline: 'Offline' } as Record<Status, string>)[status]);
  const profile = $derived(user ? profiles.get(user) : undefined);
  const custom = $derived(user ? presence.customOf(user) ?? profile?.status ?? null : null);

  let cardEl = $state<HTMLElement | null>(null);
  let baseBg = $state('#1e1e2e');
  let pos = $state({ x: 0, y: 0 });
  let ready = $state(false);
  const centered = $derived(!ui.profilePos);

  $effect(() => {
    if (user) void profiles.ensure(user);
  });

  // Position the popup near the cursor, clamped so it never leaves the screen.
  $effect(() => {
    // track values that change the card's size so we re-measure
    void profile;
    void editing;
    void status;
    void custom;
    if (!user) {
      ready = false;
      return;
    }
    if (!ui.profilePos || !cardEl) {
      ready = true;
      return;
    }
    const p = ui.profilePos;
    const r = cardEl.getBoundingClientRect();
    const M = 12;
    const gap = 14;
    let x = p.x + gap;
    let y = p.y + gap;
    if (x + r.width + M > window.innerWidth) x = p.x - r.width - gap;
    if (y + r.height + M > window.innerHeight) y = p.y - r.height - gap;
    x = Math.max(M, Math.min(x, window.innerWidth - r.width - M));
    y = Math.max(M, Math.min(y, window.innerHeight - r.height - M));
    pos = { x, y };
    ready = true;
  });

  $effect(() => {
    if (!cardEl) return;
    const v = getComputedStyle(cardEl).getPropertyValue('--mantle').trim();
    if (v) baseBg = v;
  });

  const scheme = $derived.by(() => {
    const c = profile?.profile_color;
    if (!c) return null;
    const tint = rgbToHex(mix(hexToRgb(c), hexToRgb(baseBg), 0.86));
    return {
      bannerFrom: c,
      bannerTo: rgbToHex(mix(hexToRgb(c), { r: 0, g: 0, b: 0 }, 0.4)),
      bannerText: readableOn(c),
      card: tint,
      cardText: readableOn(tint),
      accent: ensureLegible(c, tint, 4)
    };
  });

  let editing = $state(false);
  let editDisplayName = $state('');
  let editPronouns = $state('');
  let editBio = $state('');
  let editColor = $state('#5865f2');
  let saving = $state(false);

  /** Bios are capped at 6 lines (and 300 chars) to fit the profile card. */
  function clampBio(value: string): string {
    return value.replace(/\r\n?/g, '\n').split('\n').slice(0, 6).join('\n').slice(0, 300);
  }

  function startEdit() {
    editDisplayName = profile?.display_name ?? '';
    editPronouns = profile?.pronouns ?? '';
    editBio = profile?.bio ?? '';
    editColor = profile?.profile_color ?? '#5865f2';
    editing = true;
  }

  async function saveEdit() {
    const name = user;
    if (!name || saving) return;
    saving = true;
    try {
      const bio = clampBio(editBio.trim());
      await updateProfile({ display_name: editDisplayName.trim(), pronouns: editPronouns, bio, profile_color: editColor });
      profiles.patch(name, { display_name: editDisplayName.trim(), pronouns: editPronouns.trim(), bio, profile_color: editColor });
      toast('Profile updated', 'success');
      editing = false;
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to update profile', 'error');
    } finally {
      saving = false;
    }
  }

  async function run(fn: () => Promise<unknown>) {
    const name = user;
    if (!name) return;
    try {
      await fn();
    } catch (e) {
      console.error(e);
    }
  }

  function message() {
    const name = user;
    close();
    if (name) goto(dmHref(name));
  }

  function changeAvatar() {
    const name = user;
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

  function changeBanner() {
    const name = user;
    if (!name) return;
    ui.pickImage({
      title: 'change banner',
      name,
      value: profile?.banner ?? null,
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
    const name = user;
    if (!name) return;
    try {
      await setBanner(null);
      profiles.patch(name, { banner: null });
      toast('Banner removed');
    } catch {
      toast('Failed to remove banner', 'error');
    }
  }

  async function removeAvatar() {
    const name = user;
    if (!name) return;
    try {
      await setAvatar(null);
      avatars.set(name, null);
      toast('Profile picture removed');
    } catch {
      toast('Failed to remove profile picture', 'error');
    }
  }

  function close() {
    ui.profileUser = null;
    ui.profilePos = null;
    editing = false;
  }
</script>

{#if user}
  <div class="scrim" role="presentation" onclick={close} oncontextmenu={(e) => { e.preventDefault(); close(); }}></div>
  <div
    class="body"
    class:pointer={!centered}
    class:centered
    class:ready
    role="dialog"
    aria-label={`${user}'s profile`}
    bind:this={cardEl}
    style="{!centered ? `left: ${pos.x}px; top: ${pos.y}px;` : ''}{scheme
      ? `--profile-bg: ${scheme.card}; --profile-text: ${scheme.cardText}; --profile-accent: ${scheme.accent};`
      : ''}"
  >
      <div
        class="banner"
        style={scheme
          ? `background: linear-gradient(135deg, ${scheme.bannerFrom}, ${scheme.bannerTo});`
          : 'background: linear-gradient(135deg, var(--accent), var(--crust));'}
      >
        {#if profile?.banner}
          <img src={profile.banner} alt="" />
        {/if}
        {#if isMe}
          <div class="banner-tools">
            <button type="button" class="banner-btn" onclick={changeBanner}>
              <Icon name="image" size={13} /> change
            </button>
            {#if profile?.banner}
              <button type="button" class="banner-btn danger" onclick={removeBanner}>
                <Icon name="trash" size={13} />
              </button>
            {/if}
          </div>
        {/if}
      </div>

      <div class="identity">
        <div class="pfp">
          <Avatar name={user} size={72} />
          <span class="dot {status}" title={statusLabel}></span>
        </div>
        <button type="button" class="x" aria-label="Close" onclick={close}>
          <Icon name="x" size={16} />
        </button>
      </div>

      <div class="content">
        <div class="name-row">
          <h2 class="name" title={user}>{profile?.display_name || user}</h2>
          {#if profile?.pronouns}
            <span class="pronouns">{profile.pronouns}</span>
          {/if}
          {#if profile?.is_admin}
            <span class="badge">admin</span>
          {/if}
        </div>
        {#if profile?.display_name}
          <p class="handle">@{user}</p>
        {/if}

        <p class="status"><span class="dot-inline {status}"></span>{statusLabel}</p>

        {#if custom && (custom.emoji || custom.text)}
          <p class="custom">
            {#if custom.emoji}<span class="custom-emoji">{custom.emoji}</span>{/if}
            {#if custom.text}<span>{custom.text}</span>{/if}
          </p>
        {/if}

        {#if editing}
          <div class="editor">
            <label class="field">
              <span>display name</span>
              <input type="text" bind:value={editDisplayName} maxlength="40" placeholder={user} spellcheck="false" />
            </label>
            <label class="field">
              <span>pronouns</span>
              <input type="text" bind:value={editPronouns} maxlength="40" placeholder="they/them" spellcheck="false" />
            </label>
            <label class="field">
              <span>bio</span>
              <textarea
                value={editBio}
                maxlength="300"
                rows="6"
                placeholder="a little about you…"
                oninput={(e) => (editBio = clampBio(e.currentTarget.value))}
              ></textarea>
            </label>
            <label class="field color">
              <span>accent colour</span>
              <span class="color-row">
                <input type="color" bind:value={editColor} />
                <input type="text" bind:value={editColor} maxlength="7" spellcheck="false" />
              </span>
            </label>
            <div class="actions">
              <button type="button" class="btn" onclick={() => (editing = false)}>cancel</button>
              <button type="button" class="btn primary" disabled={saving} onclick={saveEdit}>
                {saving ? 'saving…' : 'save'}
              </button>
            </div>
          </div>
        {:else}
          {#if profile?.bio}
            <p class="bio">{profile.bio}</p>
          {/if}

          <div class="actions">
            {#if isMe}
              <button type="button" class="btn primary" onclick={startEdit}>edit profile</button>
              <button type="button" class="btn" onclick={changeAvatar}>change picture</button>
              {#if avatars.get(me)}
                <button type="button" class="btn danger" onclick={removeAvatar}>remove</button>
              {/if}
            {:else}
              <button type="button" class="btn" onclick={message}>message</button>
              {#if isFriend}
                <button type="button" class="btn danger" onclick={() => run(() => removeFriend(user))}>unfriend</button>
              {:else if isOutgoing}
                <button type="button" class="btn" onclick={() => run(() => removeFriend(user))}>cancel request</button>
              {:else if isIncoming}
                <button type="button" class="btn primary" onclick={() => run(() => respondFriend(user, true))}>accept</button>
                <button type="button" class="btn" onclick={() => run(() => respondFriend(user, false))}>decline</button>
              {:else}
                <button type="button" class="btn primary" onclick={() => run(() => requestFriend(user))}>add friend</button>
              {/if}
            {/if}
          </div>
        {/if}

        <div class="footer">
          <button
            type="button"
            class="copy"
            onclick={() => {
              navigator.clipboard?.writeText(user);
              toast('Copied username', 'success');
            }}
          >
            <Icon name="link" size={13} /> copy username
          </button>
        </div>
      </div>
    </div>
{/if}

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<style>
  .scrim { position: fixed; inset: 0; z-index: 14999; }
  .body { position: fixed; z-index: 15000; width: 340px; max-width: 92vw; max-height: 90vh; overflow-y: auto; background: var(--profile-bg, var(--mantle)); border: 1px solid var(--surface0); border-radius: 12px; color: var(--profile-text, var(--text)); font-family: 'JetBrains Mono', monospace; box-shadow: var(--shadow-menu); opacity: 0; }
  .body.ready { opacity: 1; animation: profile-in 0.14s ease-out; }
  .body.pointer { transform-origin: top left; }
  .body.centered { inset: 0; margin: auto; }
  @keyframes profile-in { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .banner { position: relative; height: 120px; background: var(--crust); border-bottom: 1px solid var(--surface0); overflow: hidden; }
  .banner img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .banner-tools { position: absolute; top: 8px; right: 8px; display: flex; gap: 6px; }
  .banner-btn { all: unset; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; background: rgba(0, 0, 0, 0.55); color: #fff; font-size: 11px; font-weight: 600; padding: 5px 9px; border-radius: var(--r-sm, 6px); }
  .banner-btn:hover { background: rgba(0, 0, 0, 0.75); }
  .banner-btn.danger:hover { background: var(--red); }
  .identity { position: relative; height: 0; }
  .pfp { position: absolute; left: 16px; top: -40px; }
  .pfp :global(.avatar) { border-radius: 50%; }
  .pfp :global(img) { border-radius: 50%; border: 4px solid var(--profile-bg, var(--mantle)); }
  .dot { position: absolute; bottom: 4px; right: 4px; width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--profile-bg, var(--mantle)); }
  .dot.online { background: var(--green); }
  .dot.away { background: var(--yellow); }
  .dot.offline { background: var(--surface2); }
  .x { all: unset; position: absolute; top: 8px; right: 10px; color: #fff; cursor: pointer; display: inline-flex; background: rgba(0, 0, 0, 0.45); border-radius: 50%; padding: 4px; }
  .x:hover { background: rgba(0, 0, 0, 0.7); }
  .content { padding: 44px 18px 18px; }
  .name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 2px; }
  .name { margin: 0; font-size: 18px; color: var(--profile-accent, var(--text)); overflow-wrap: anywhere; user-select: text; }
  .handle { margin: 3px 0 0; font-size: 12px; color: var(--overlay0); user-select: text; }
  .pronouns { font-size: 11px; color: var(--subtext0); background: color-mix(in srgb, currentColor 12%, transparent); border: 1px solid var(--surface0); border-radius: 999px; padding: 1px 8px; }
  .badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--on-accent); background: var(--accent); border-radius: var(--r-xs); padding: 1px 6px; }
  .status { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; color: var(--subtext0); font-size: 13px; }
  .dot-inline { width: 8px; height: 8px; border-radius: 50%; }
  .dot-inline.online { background: var(--green); }
  .dot-inline.away { background: var(--yellow); }
  .dot-inline.offline { background: var(--surface2); }
  .custom { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 12px; color: var(--subtext0); }
  .custom-emoji { font-size: 14px; }
  .bio { margin: 18px 0 0; font-size: 13px; line-height: 1.5; color: var(--subtext0); white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; }
  .actions { display: flex; align-items: center; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
  .btn { all: unset; background: var(--surface0); color: var(--text); padding: 8px 14px; border-radius: 5px; font-size: 13px; cursor: pointer; }
  .btn:hover { background: var(--surface1); }
  .btn.primary { background: var(--accent); color: var(--on-accent); font-weight: 700; }
  .btn.primary:hover { filter: brightness(1.1); }
  .btn.primary:disabled { opacity: 0.6; cursor: default; }
  .btn.danger { color: var(--red); }
  .btn.danger:hover { background: color-mix(in srgb, var(--red) 10%, transparent); }
  .editor { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field > span:first-child { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--overlay0); font-weight: 700; }
  .field input[type='text'], .field textarea { background: var(--base); border: 1px solid var(--surface0); color: var(--text); font-family: inherit; font-size: 13px; padding: 8px 10px; border-radius: var(--r-sm, 6px); resize: vertical; }
  .field input[type='text']:focus, .field textarea:focus { outline: none; border-color: var(--accent); }
  .color-row { display: flex; align-items: center; gap: 8px; }
  .color-row input[type='color'] { width: 40px; height: 32px; padding: 0; border: 1px solid var(--surface0); border-radius: var(--r-sm, 6px); background: none; cursor: pointer; }
  .color-row input[type='text'] { flex: 1; }
  .footer { margin-top: 20px; border-top: 1px solid var(--surface0); padding-top: 14px; }
  .copy { all: unset; display: inline-flex; align-items: center; gap: 6px; color: var(--overlay0); font-size: 12px; cursor: pointer; }
  .copy:hover { color: var(--text); }
</style>
