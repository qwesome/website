<script lang="ts">
  import { toasts } from '../../state/toasts.svelte';
  import Icon from './Icon.svelte';
</script>

<div class="toasts">
  {#each toasts.list as t (t.id)}
    <div class="toast {t.kind}" role="status">
      <span class="ic">
        <Icon name={t.kind === 'error' ? 'x' : t.kind === 'success' ? 'check' : 'send'} size={14} stroke={2.5} />
      </span>
      <span class="msg">{t.message}</span>
      <button type="button" class="close" title="Dismiss" onclick={() => toasts.dismiss(t.id)}>
        <Icon name="x" size={12} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 180px;
    max-width: 380px;
    padding: 9px 10px 9px 12px;
    background: var(--mantle);
    border: 1px solid var(--surface1);
    border-radius: var(--r);
    color: var(--text);
    font-size: 13px;
    box-shadow: var(--shadow-menu);
    animation: toast-in 0.18s ease-out;
  }
  @keyframes toast-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .toast.success { border-color: var(--green); }
  .toast.error { border-color: var(--red); }
  .ic { display: inline-flex; flex-shrink: 0; }
  .toast.info .ic { color: var(--blue); }
  .toast.success .ic { color: var(--green); }
  .toast.error .ic { color: var(--red); }
  .msg { flex: 1; min-width: 0; overflow-wrap: break-word; }
  .close { all: unset; display: inline-flex; cursor: pointer; color: var(--overlay0); padding: 2px; border-radius: var(--r-xs); flex-shrink: 0; }
  .close:hover { color: var(--text); background: var(--surface0); }
</style>
