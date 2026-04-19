<script>
  import { fly } from 'svelte/transition';
  import { game } from '../../../lib/stores/game.js';
  import { apiGet } from '../../../lib/api.js';
  import Close from '../../icons/Close.svelte';

  const { onClose = () => {}, onMouseEnter = () => {} } = $props();

  let tab        = $state('kills');   // 'kills' | 'structures' | 'points'
  let entity     = $state('player');  // 'player' | 'tribe'
  let rankings   = $state(null);
  let loading    = $state(true);
  let error      = $state('');

  const worldId = $derived($game.worldKey);

  $effect(() => {
    if (!worldId) return;
    loading = true;
    error = '';
    apiGet(`/worlds/${worldId}/rankings`)
      .then(r => { rankings = r; loading = false; })
      .catch(e => { error = e.message; loading = false; });
  });

  const tabs = [
    { id: 'kills',      label: 'Kills' },
    { id: 'structures', label: 'Structures' },
    { id: 'points',     label: 'Points' },
  ];

  const rows = $derived(() => {
    if (!rankings) return [];
    if (entity === 'tribe') {
      const key = tab === 'kills' ? 'tribeKills' : tab === 'structures' ? 'tribeStructures' : 'tribePoints';
      return rankings[key] || [];
    }
    return rankings[tab] || [];
  });
</script>

<div
  class="rankings-container"
  role="region"
  aria-label="Rankings"
  onmouseenter={onMouseEnter}
  transition:fly={{ y: -20, duration: 200 }}
>
  <div class="panel-header">
    <h3>Rankings</h3>
    <button class="close-btn" onclick={onClose} aria-label="Close rankings">
      <Close size="1em" />
    </button>
  </div>

  <div class="entity-toggle">
    <button class="toggle-btn" class:active={entity === 'player'} onclick={() => (entity = 'player')}>Players</button>
    <button class="toggle-btn" class:active={entity === 'tribe'}  onclick={() => (entity = 'tribe')}>Tribes</button>
  </div>

  <div class="tab-bar">
    {#each tabs as t}
      <button class="tab-btn" class:active={tab === t.id} onclick={() => (tab = t.id)}>
        {t.label}
      </button>
    {/each}
  </div>

  <div class="panel-body">
    {#if loading}
      <div class="empty">Loading…</div>
    {:else if error}
      <div class="empty error-text">{error}</div>
    {:else if rows().length === 0}
      <div class="empty">No data yet.</div>
    {:else}
      <ol class="rank-list">
        {#each rows() as row, i}
          <li class="rank-row" class:top3={i < 3}>
            <span class="rank-num">{i + 1}</span>
            {#if entity === 'tribe'}
              <span class="rank-name">
                <span class="tribe-tag">[{row.tag}]</span> {row.name}
                <span class="member-count">{row.memberCount}m</span>
              </span>
            {:else}
              <span class="rank-name">{row.displayName}</span>
            {/if}
            <span class="rank-value">
              {#if tab === 'kills'}{(row.kills).toLocaleString()} kills
              {:else if tab === 'structures'}{row.structureCount} owned
              {:else}{row.structurePoints} pts
              {/if}
            </span>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</div>

<style>
  .rankings-container {
    display: flex;
    flex-direction: column;
    background-color: rgba(255, 255, 255, 0.85);
    border-radius: 0.5rem;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    overflow: hidden;
    box-shadow: 0 0.2em 1em rgba(0, 0, 0, 0.1);
    border: 0.05em solid rgba(255, 255, 255, 0.2);
    width: min(340px, 90vw);
    max-height: 60vh;
    color: rgba(0, 0, 0, 0.8);
    text-shadow: 0 0 0.15em rgba(255, 255, 255, 0.7);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background-color: rgba(0, 0, 0, 0.05);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.8);
    font-family: var(--font-heading);
  }

  .close-btn {
    background: none;
    border: none;
    color: rgba(0, 0, 0, 0.6);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    transition: color 0.15s;
  }
  .close-btn:hover { color: rgba(0, 0, 0, 0.9); }

  .entity-toggle {
    display: flex;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(0, 0, 0, 0.02);
    flex-shrink: 0;
  }

  .toggle-btn {
    flex: 1;
    background: none;
    border: none;
    padding: 0.35em 0.5em;
    font-size: 0.8em;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.4);
    cursor: pointer;
    font-family: var(--font-body);
    transition: all 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .toggle-btn:hover { color: rgba(0, 0, 0, 0.7); }
  .toggle-btn.active {
    color: rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.06);
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(0, 0, 0, 0.03);
    flex-shrink: 0;
  }

  .tab-btn {
    flex: 1;
    background: none;
    border: none;
    padding: 0.4em 0.5em;
    font-size: 0.78em;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.5);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    font-family: var(--font-body);
    transition: color 0.15s, border-color 0.15s;
  }
  .tab-btn:hover { color: rgba(0, 0, 0, 0.8); }
  .tab-btn.active {
    color: rgba(66, 133, 244, 0.9);
    border-bottom-color: rgba(66, 133, 244, 0.7);
  }

  .panel-body {
    overflow-y: auto;
    flex: 1;
    padding: 0.4em;
  }

  .empty {
    color: rgba(0, 0, 0, 0.4);
    text-align: center;
    padding: 2em 1em;
    font-size: 0.9em;
  }
  .error-text { color: rgb(160, 30, 30); }

  .rank-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }

  .rank-row {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.4em 0.6em;
    border-radius: 0.3em;
    background: rgba(0, 0, 0, 0.02);
  }

  .rank-row.top3 {
    background: rgba(66, 133, 244, 0.05);
  }

  .rank-num {
    font-size: 0.78em;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.35);
    width: 1.4em;
    text-align: right;
    flex-shrink: 0;
  }

  .rank-row.top3 .rank-num {
    color: rgba(66, 133, 244, 0.7);
  }

  .rank-name {
    flex: 1;
    font-size: 0.88em;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.75);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.4em;
  }

  .tribe-tag {
    font-size: 0.85em;
    font-weight: 700;
    color: rgba(66, 133, 244, 0.8);
    flex-shrink: 0;
  }

  .member-count {
    font-size: 0.75em;
    color: rgba(0, 0, 0, 0.4);
    flex-shrink: 0;
  }

  .rank-value {
    font-size: 0.8em;
    color: rgba(0, 0, 0, 0.5);
    font-weight: 600;
    white-space: nowrap;
  }
</style>
