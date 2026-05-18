<script>
  import { unreadReports } from '../../../lib/stores/reports.js';

  const {
    onOpenReports    = () => {},
    onOpenDiplomacy  = () => {},
    onOpenRankings   = () => {},
    showReports      = false,
    showDiplomacy    = false,
    showRankings     = false,
  } = $props();
</script>

<nav class="game-header-nav">
  <button class="header-link" class:active={showDiplomacy} onclick={onOpenDiplomacy}>
    Diplomacy
  </button>
  <button class="header-link" class:active={showRankings} onclick={onOpenRankings}>
    Rankings
  </button>
  <button class="header-link" class:active={showReports} onclick={onOpenReports}>
    Reports
    {#if $unreadReports > 0}
      <span class="header-badge">{$unreadReports}</span>
    {/if}
  </button>
</nav>

<style>
  .game-header-nav {
    position: absolute;
    top: 0.6em;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0;
    align-items: stretch;
    padding: 0;
    z-index: 500;
    pointer-events: all;
    background: rgba(14, 19, 32, 0.85);
    border: 1px solid rgba(176, 141, 74, 0.4);
    backdrop-filter: blur(8px);
  }

  .header-link {
    background: none;
    border: none;
    border-left: 1px solid rgba(176, 141, 74, 0.18);
    color: rgba(232, 228, 210, 0.7);
    font-family: var(--font-display);
    font-size: 0.7em;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 0.7em 1.1em;
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.4em;
    transition: color 0.15s, background 0.15s;
  }

  .header-link:first-child {
    border-left: none;
  }

  .header-link:hover {
    color: var(--color-gold-pale);
    background: rgba(176, 141, 74, 0.08);
  }

  .header-link.active {
    color: var(--color-gold-pale);
    background: rgba(176, 141, 74, 0.18);
    box-shadow: inset 0 2px 0 var(--color-aged-gold);
  }

  .header-badge {
    background: var(--color-wax-red);
    color: var(--color-parchment-100);
    font-family: var(--font-mono);
    font-size: 0.85em;
    font-weight: 500;
    border-radius: 1em;
    padding: 0.1em 0.5em;
    min-width: 1.4em;
    text-align: center;
    line-height: 1.4;
  }
</style>
