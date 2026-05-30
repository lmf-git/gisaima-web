<script>
  let { activeSection, scrollToSection, baseDelay = 0 } = $props();

  // Table-of-contents entries. Order here is the on-screen order and drives the
  // staggered reveal (each entry fades in slightly after the previous one).
  const entries = [
    { id: 'getting-started',       label: 'Getting Started' },
    { id: 'map-exploration',       label: 'Map & Exploration' },
    { id: 'terrain-biomes',        label: 'Terrain & Biomes' },
    { id: 'units-groups',          label: 'Units & Groups' },
    { id: 'structures',            label: 'Structures & Building' },
    { id: 'activities',            label: 'Activities' },
    { id: 'battles',               label: 'Battles & Combat' },
    { id: 'trade-economy',         label: 'Trade & Economy' },
    { id: 'character-development', label: 'Character Development' },
    { id: 'community-politics',    label: 'Community & Politics' },
    { id: 'races',                 label: 'Races' },
    { id: 'items-inventory',       label: 'Items & Inventory' },
    { id: 'morality-system',       label: 'Morality System' },
    { id: 'reports-rankings',      label: 'Reports & Rankings' },
    { id: 'game-mechanics',        label: 'Game Mechanics' },
    { id: 'strategy-tips',         label: 'Strategy Tips' },
    { id: 'faq',                   label: 'FAQ' }
  ];
</script>

<aside class="sidebar">
  <nav class="toc">
    <h2 class="toc-item" style="animation-delay: {baseDelay}ms">Contents</h2>
    <ul>
      {#each entries as entry, i}
        <li class="toc-item" style="animation-delay: {baseDelay + 80 + i * 45}ms">
          <button class:active={activeSection === entry.id} onclick={() => scrollToSection(entry.id)}>
            {entry.label}
          </button>
        </li>
      {/each}
    </ul>
  </nav>
</aside>

<style>
  .sidebar {
    width: 100%;
    position: relative;
  }

  @media (min-width: 900px) {
    .sidebar {
      position: sticky;
      top: 7em;
      align-self: start;
      max-height: calc(100vh - 8em);
    }
  }

  .toc {
    background: var(--color-parchment-100);
    padding: 1.4em 1.2em;
    border: 1px solid var(--color-ink-900);
    border-radius: 0;
    box-shadow: 0 0.5em 1.6em rgba(0, 0, 0, 0.08);
    text-shadow: none;
    max-height: calc(100vh - 8em);
    overflow: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .toc::-webkit-scrollbar { display: none; }

  /* Each contents entry fades + slides in, staggered via its inline
     animation-delay (set from the entry index plus the header offset). */
  .toc-item {
    animation: toc-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes toc-in {
    from { opacity: 0; transform: translateX(-0.6em); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .toc-item { animation: none; }
  }

  .toc h2 {
    color: var(--color-wax-red);
    margin: 0 0 1em;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.7em;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .toc ul { list-style: none; padding: 0; margin: 0; }
  .toc li { margin: 0 0 0.1em; }

  .toc button {
    background: none;
    border: none;
    border-left: 2px solid transparent;
    color: var(--color-ink-700);
    font-family: var(--font-display);
    font-size: 0.78em;
    letter-spacing: 0.06em;
    cursor: pointer;
    padding: 0.45em 0.6em;
    width: 100%;
    text-align: left;
    border-radius: 0;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .toc button:hover {
    color: var(--color-ink-900);
    background: var(--color-parchment-200);
  }

  .toc button.active {
    background: transparent;
    border-left-color: var(--color-wax-red);
    color: var(--color-wax-red);
    font-weight: 600;
  }
</style>
