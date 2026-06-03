<script>
  import { page } from '$app/stores';
  import { unreadReports } from '../../../lib/stores/reports.js';
  import CharacterSwitcher from './CharacterSwitcher.svelte';

  // Reference: Diplomacy / Rankings / Reports are top-level world surfaces,
  // not transient popups on the map. They route to dedicated pages
  // (/diplomacy, /rankings, /chronicle) so they get the full WorldContextBar
  // chrome and bookmarkable URLs.
</script>

<div class="game-header-switcher"><CharacterSwitcher /></div>

<nav class="game-header-nav">
  <a class="header-link" class:active={$page.url?.pathname === '/house'} href="/house">
    House
  </a>
  <a class="header-link" class:active={$page.url?.pathname === '/rankings'} href="/rankings">
    Rankings
  </a>
  <a class="header-link" class:active={$page.url?.pathname === '/chronicle'} href="/chronicle">
    Reports
    {#if $unreadReports > 0}
      <span class="header-badge">{$unreadReports}</span>
    {/if}
  </a>
</nav>

<style>
  .game-header-switcher {
    position: absolute;
    top: 0.6em;
    right: 0.6em;
    z-index: 500;
  }

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
