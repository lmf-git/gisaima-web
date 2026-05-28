<script>
  let { activeSection, scrollToSection } = $props();
</script>

<aside class="sidebar">
  <nav class="toc">
    <h2>Contents</h2>
    <ul>
      <li><button class:active={activeSection === 'getting-started'} onclick={() => scrollToSection('getting-started')}>Getting Started</button></li>
      <li><button class:active={activeSection === 'map-exploration'} onclick={() => scrollToSection('map-exploration')}>Map & Exploration</button></li>
      <li><button class:active={activeSection === 'terrain-biomes'} onclick={() => scrollToSection('terrain-biomes')}>Terrain & Biomes</button></li>
      <li><button class:active={activeSection === 'units-groups'} onclick={() => scrollToSection('units-groups')}>Units & Groups</button></li>
      <li><button class:active={activeSection === 'structures'} onclick={() => scrollToSection('structures')}>Structures & Building</button></li>
      <li><button class:active={activeSection === 'activities'} onclick={() => scrollToSection('activities')}>Activities</button></li>
      <li><button class:active={activeSection === 'battles'} onclick={() => scrollToSection('battles')}>Battles & Combat</button></li>
      <li><button class:active={activeSection === 'trade-economy'} onclick={() => scrollToSection('trade-economy')}>Trade & Economy</button></li>
      <li><button class:active={activeSection === 'character-development'} onclick={() => scrollToSection('character-development')}>Character Development</button></li>
      <li><button class:active={activeSection === 'community-politics'} onclick={() => scrollToSection('community-politics')}>Community & Politics</button></li>
      <li><button class:active={activeSection === 'races'} onclick={() => scrollToSection('races')}>Races</button></li>
      <li><button class:active={activeSection === 'items-inventory'} onclick={() => scrollToSection('items-inventory')}>Items & Inventory</button></li>
      <li><button class:active={activeSection === 'morality-system'} onclick={() => scrollToSection('morality-system')}>Morality System</button></li>
      <li><button class:active={activeSection === 'reports-rankings'} onclick={() => scrollToSection('reports-rankings')}>Reports & Rankings</button></li>
      <li><button class:active={activeSection === 'game-mechanics'} onclick={() => scrollToSection('game-mechanics')}>Game Mechanics</button></li>
      <li><button class:active={activeSection === 'strategy-tips'} onclick={() => scrollToSection('strategy-tips')}>Strategy Tips</button></li>
      <li><button class:active={activeSection === 'faq'} onclick={() => scrollToSection('faq')}>FAQ</button></li>
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
