<script>
  import Chevron from '../icons/Chevron.svelte';

  let { activeSection, scrollToSection, baseDelay = 0 } = $props();

  // On mobile the contents list collapses behind a toggle so it doesn't push
  // the guide body far down the page. On desktop CSS keeps it always open.
  let open = $state(false);

  function selectSection(id) {
    scrollToSection(id);
    open = false;
  }

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

<aside class="sidebar" class:open>
  <nav class="toc">
    <button
      class="toc-toggle toc-item"
      style="animation-delay: {baseDelay}ms"
      onclick={() => (open = !open)}
      aria-expanded={open}
    >
      <span>Contents</span>
      <Chevron extraClass="toc-chevron" direction={open ? 'down' : 'right'} size="0.85em" />
    </button>
    <ul class="toc-list">
      {#each entries as entry, i}
        <li class="toc-item" style="animation-delay: {baseDelay + 80 + i * 45}ms">
          <button class:active={activeSection === entry.id} onclick={() => selectSection(entry.id)}>
            {entry.label}
          </button>
        </li>
      {/each}
    </ul>
  </nav>
  {#if open}
    <div
      class="toc-backdrop"
      onclick={() => (open = false)}
      onkeydown={(e) => e.key === 'Escape' && (open = false)}
      role="button"
      tabindex="-1"
      aria-label="Close contents"
    ></div>
  {/if}
</aside>

<style>
  .sidebar {
    width: 100%;
    position: relative;
  }

  /* On mobile the TOC becomes a slide-in drawer. The "Contents" trigger sits
     in the bottom-left corner so it doesn't overlap the header and is easy to
     reach. The drawer slides in from the left with a full-screen backdrop. */
  @media (max-width: 899px) {
    .sidebar {
      position: fixed;
      bottom: 1.5em;
      left: 1em;
      width: auto;
      z-index: 122;
    }

    .toc {
      background: none;
      border: none;
      box-shadow: none;
      padding: 0;
      max-height: none;
      overflow: visible;
    }

    .toc-toggle {
      margin: 0;
      padding: 0.6em 1.1em;
      font-size: 0.85em;
      background: var(--color-parchment-100);
      border: 1px solid var(--color-ink-900);
      border-radius: 2em;
      box-shadow: 0 0.3em 1em rgba(0, 0, 0, 0.22);
      gap: 0.5em;
    }

    .sidebar .toc-list {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: min(78vw, 300px);
      padding: 5em 1.2em 2em;
      background: var(--color-parchment-100);
      border-right: 1px solid var(--color-ink-900);
      box-shadow: 0.4em 0 1.6em rgba(0, 0, 0, 0.3);
      overflow-y: auto;
      z-index: 121;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
    }
    .sidebar.open .toc-list {
      transform: translateX(0);
    }

    .toc-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 120;
      cursor: pointer;
    }
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

  .toc-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6em;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-wax-red);
    margin: 0 0 1em;
    padding: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.7em;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    text-align: left;
  }
  .toc-toggle :global(.toc-chevron) { flex-shrink: 0; }

  /* Collapsed by default on mobile; the toggle reveals it. */
  .toc-list { list-style: none; padding: 0; margin: 0; display: none; }
  .sidebar.open .toc-list { display: block; }

  @media (min-width: 900px) {
    /* On desktop the contents are always shown and the toggle is inert. */
    .toc-list { display: block; }
    .toc-toggle { cursor: default; }
    .toc-toggle :global(.toc-chevron) { display: none; }
  }
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
