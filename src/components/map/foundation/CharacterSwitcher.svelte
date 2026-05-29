<script>
  // Header control to switch which of the player's living characters the map
  // follows. A user may control several concurrent characters (children born of
  // unions). Switching sets the server's controlledLifeId and recenters the map
  // on the chosen character.
  import { onMount } from 'svelte';
  import { currentPlayer, listCharacters, switchCharacter } from '../../../lib/stores/game.js';
  import { moveTarget } from '../../../lib/stores/map.js';

  let characters = $state([]);
  let open = $state(false);
  let busy = $state(false);

  const controlledId = $derived($currentPlayer?.lifeId ?? null);
  const activeName = $derived(
    characters.find(c => String(c._id) === String(controlledId))?.name
      || $currentPlayer?.displayName
      || 'Character'
  );

  async function refresh() {
    characters = await listCharacters();
  }

  onMount(refresh);
  // Reload the roster whenever control changes (e.g. after a death hands over).
  $effect(() => { controlledId; refresh(); });

  async function choose(c) {
    open = false;
    if (busy || String(c._id) === String(controlledId)) return;
    busy = true;
    const r = await switchCharacter(String(c._id));
    busy = false;
    if (r.success && c.lastLocation) moveTarget(c.lastLocation.x, c.lastLocation.y, true);
  }
</script>

{#if characters.length > 1}
  <div class="switcher">
    <button class="sw-trigger" onclick={() => (open = !open)} aria-expanded={open} disabled={busy}>
      <span class="sw-dot"></span>
      <span class="sw-name">{activeName}</span>
      <span class="sw-caret" class:open>▾</span>
    </button>
    {#if open}
      <ul class="sw-menu" role="listbox">
        {#each characters as c (c._id)}
          <li>
            <button
              class="sw-item"
              class:active={String(c._id) === String(controlledId)}
              role="option"
              aria-selected={String(c._id) === String(controlledId)}
              onclick={() => choose(c)}
            >
              <span class="sw-item-name">{c.name}</span>
              {#if c.ethnicity}<span class="sw-item-tag">{c.ethnicity}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .switcher { position: relative; pointer-events: all; }
  .sw-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.45em;
    background: rgba(14, 19, 32, 0.85);
    border: 0.075em solid rgba(176, 141, 74, 0.4);
    color: var(--color-gold-pale, #d4b170);
    font-family: var(--font-display);
    font-size: 0.7em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.55em 0.8em;
    cursor: pointer;
    backdrop-filter: blur(0.5em);
    transition: background-color 0.15s, color 0.15s, border-color 0.15s;
  }
  .sw-trigger:hover:not(:disabled) { background: rgba(176, 141, 74, 0.16); color: var(--color-parchment-100); }
  .sw-dot { width: 0.5em; height: 0.5em; border-radius: 50%; background: var(--color-wax-red, #8b2020); flex-shrink: 0; }
  .sw-name { max-width: 9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sw-caret { font-size: 0.7em; transition: transform 0.15s; }
  .sw-caret.open { transform: rotate(180deg); }

  .sw-menu {
    position: absolute;
    top: calc(100% + 0.3em);
    left: 0;
    min-width: 100%;
    list-style: none;
    margin: 0;
    padding: 0.2em;
    background: rgba(14, 19, 32, 0.96);
    border: 0.075em solid rgba(176, 141, 74, 0.4);
    backdrop-filter: blur(0.5em);
    z-index: 600;
  }
  .sw-item {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.6em;
    width: 100%;
    background: transparent;
    border: none;
    color: var(--color-parchment-200, #e8e4d2);
    font-family: var(--font-body);
    font-size: 0.8em;
    text-align: left;
    padding: 0.5em 0.7em;
    cursor: pointer;
    white-space: nowrap;
  }
  .sw-item:hover { background: rgba(176, 141, 74, 0.14); }
  .sw-item.active { color: var(--color-gold-pale); }
  .sw-item-tag {
    font-family: var(--font-mono);
    font-size: 0.8em;
    color: rgba(232, 228, 210, 0.4);
  }
</style>
