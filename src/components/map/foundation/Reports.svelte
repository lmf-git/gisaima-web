<script>
  import { fly } from 'svelte/transition';
  import { reports, unreadReports } from '../../../lib/stores/reports.js';
  import { game } from '../../../lib/stores/game.js';
  import Close from '../../icons/Close.svelte';

  const { onClose = () => {}, onMouseEnter = () => {} } = $props();

  const TYPE_LABELS = {
    battle_victory:     'Victory',
    battle_defeat:      'Defeat',
    structure_captured: 'Captured',
    structure_lost:     'Lost',
  };

  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  async function handleClick(report) {
    if (!report.read) {
      await reports.markRead($game.worldKey, report._id);
    }
  }

  async function markAllRead() {
    const worldId = $game.worldKey;
    for (const r of $reports.reports.filter(r => !r.read)) {
      await reports.markRead(worldId, r._id);
    }
  }
</script>

<div
  class="reports-container"
  role="region"
  aria-label="Reports"
  onmouseenter={onMouseEnter}
  transition:fly={{ x: 300, duration: 250 }}
>
  <div class="reports-header">
    <h3>
      Reports
      {#if $unreadReports > 0}
        <span class="unread-count">{$unreadReports}</span>
      {/if}
    </h3>
    <div class="reports-header-actions">
      {#if $unreadReports > 0}
        <button class="mark-all-btn" onclick={markAllRead}>Mark all read</button>
      {/if}
      <button class="close-btn" onclick={onClose} aria-label="Close reports">
        <Close size="1em" />
      </button>
    </div>
  </div>

  <div class="reports-list">
    {#if $reports.loading}
      <div class="reports-empty">Loading...</div>
    {:else if $reports.reports.length === 0}
      <div class="reports-empty">No reports yet.</div>
    {:else}
      {#each $reports.reports as report (report._id)}
        <button
          class="report-item"
          class:unread={!report.read}
          class:victory={report.type === 'battle_victory'}
          class:defeat={report.type === 'battle_defeat'}
          class:captured={report.type === 'structure_captured'}
          class:lost={report.type === 'structure_lost'}
          onclick={() => handleClick(report)}
        >
          <div class="report-top">
            <span class="report-type">{TYPE_LABELS[report.type] ?? report.type}</span>
            <span class="report-date">{formatDate(report.timestamp)}</span>
          </div>
          <div class="report-title">{report.title}</div>
          <div class="report-summary">{report.summary}</div>
        </button>
      {/each}
    {/if}
  </div>
</div>

<style>
  .reports-container {
    display: flex;
    flex-direction: column;
    background-color: rgba(255, 255, 255, 0.85);
    border-radius: 0.5rem;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    overflow: hidden;
    box-shadow: 0 0.2em 1em rgba(0, 0, 0, 0.1);
    border: 0.05em solid rgba(255, 255, 255, 0.2);
    width: min(400px, 90vw);
    max-height: 50vh;
    color: rgba(0, 0, 0, 0.8);
    text-shadow: 0 0 0.15em rgba(255, 255, 255, 0.7);
  }

  .reports-header {
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
    display: flex;
    align-items: center;
    gap: 0.5em;
  }

  .unread-count {
    background: rgba(200, 130, 20, 0.15);
    color: rgba(150, 85, 0, 0.9);
    font-size: 0.72em;
    font-weight: 700;
    border-radius: 1em;
    padding: 0.1em 0.5em;
    min-width: 1.4em;
    text-align: center;
  }

  .reports-header-actions {
    display: flex;
    gap: 0.5em;
    align-items: center;
  }

  .mark-all-btn {
    background: none;
    border: 1px solid rgba(0, 0, 0, 0.2);
    color: rgba(0, 0, 0, 0.55);
    border-radius: 0.3em;
    padding: 0.2em 0.5em;
    font-size: 0.75em;
    cursor: pointer;
    font-family: var(--font-body);
    transition: color 0.15s, border-color 0.15s;
  }
  .mark-all-btn:hover { color: rgba(0, 0, 0, 0.85); border-color: rgba(0, 0, 0, 0.4); }

  .close-btn {
    background: none;
    border: none;
    color: rgba(0, 0, 0, 0.6);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
  }
  .close-btn:hover { color: rgba(0, 0, 0, 0.9); }

  .reports-list {
    overflow-y: auto;
    flex: 1;
    padding: 0.4em;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }

  .reports-empty {
    color: rgba(0, 0, 0, 0.4);
    text-align: center;
    padding: 2em 1em;
    font-size: 0.9em;
  }

  .report-item {
    background: rgba(0, 0, 0, 0.03);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 0.35em;
    padding: 0.55em 0.7em;
    text-align: left;
    cursor: pointer;
    width: 100%;
    transition: background 0.15s;
    font-family: var(--font-body);
  }
  .report-item:hover { background: rgba(0, 0, 0, 0.07); }

  .report-item.unread {
    border-left: 3px solid rgba(180, 120, 20, 0.6);
    background: rgba(200, 140, 20, 0.06);
  }

  .report-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25em;
  }

  .report-type {
    font-size: 0.7em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.15em 0.45em;
    border-radius: 0.25em;
  }

  .victory .report-type   { background: rgba(60, 160, 60, 0.15);  color: rgb(30, 110, 30); }
  .defeat .report-type    { background: rgba(200, 50, 50, 0.15);   color: rgb(160, 30, 30); }
  .captured .report-type  { background: rgba(50, 120, 220, 0.15);  color: rgb(30, 80, 180); }
  .lost .report-type      { background: rgba(180, 100, 20, 0.15);  color: rgb(140, 70, 10); }

  .report-date {
    font-size: 0.75em;
    color: rgba(0, 0, 0, 0.4);
  }

  .report-title {
    font-size: 0.9em;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.8);
    margin-bottom: 0.2em;
  }

  .report-summary {
    font-size: 0.8em;
    color: rgba(0, 0, 0, 0.55);
    line-height: 1.4;
  }
</style>
