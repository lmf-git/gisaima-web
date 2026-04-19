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
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.25em;
    align-items: center;
    padding: 0.3em 0.5em;
    z-index: 500;
    pointer-events: all;
  }

  .header-link {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.55);
    font-size: 0.85em;
    font-weight: 500;
    padding: 0.3em 0.65em;
    border-radius: 0.3em;
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.4em;
    transition: color 0.15s, background 0.15s;
    letter-spacing: 0.01em;
  }

  .header-link:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.08);
  }

  .header-link.active {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.1);
  }

  .header-badge {
    background: rgba(255, 180, 50, 0.9);
    color: #000;
    font-size: 0.7em;
    font-weight: 700;
    border-radius: 1em;
    padding: 0.1em 0.45em;
    min-width: 1.4em;
    text-align: center;
    line-height: 1.4;
  }
</style>
