<script>
  import { slide } from 'svelte/transition';
  import Trophy from '../../icons/Trophy.svelte';

  const {
    onClose = () => {},
    onOpenAchievements = () => {},
  } = $props();

  let worldExpanded    = $state(false);
  let terrainExpanded  = $state(false);
  let structExpanded   = $state(false);
  let unitsExpanded    = $state(false);
  let controlsExpanded = $state(false);

  function openAchievements() {
    onClose();
    onOpenAchievements();
  }

  function dismiss() {
    localStorage.setItem('tutorial-state', 'closed');
    onClose();
  }
</script>

<div class="help-panel">
  <div class="help-body">
    <p class="summary">
      Strategic open-world MMO with procedurally generated maps, territory control,
      and real-time interaction. Explore worlds, build structures, and compete with other players.
    </p>

    <div class="sections">

      <div class="section">
        <button class="section-hd" onclick={() => (worldExpanded = !worldExpanded)} aria-expanded={worldExpanded}>
          <span>Map Exploration</span>
          <span class="chevron" class:open={worldExpanded}>▸</span>
        </button>
        {#if worldExpanded}
          <ul class="section-body" transition:slide|local={{ duration: 200 }}>
            <li>Explore an infinite procedurally generated world</li>
            <li>Grid-based coordinate system for precise navigation</li>
            <li>URL updates with coordinates for location sharing</li>
            <li>Hover over tiles to view detailed information</li>
          </ul>
        {/if}
      </div>

      <div class="section">
        <button class="section-hd" onclick={() => (terrainExpanded = !terrainExpanded)} aria-expanded={terrainExpanded}>
          <span>Terrain &amp; Biomes</span>
          <span class="chevron" class:open={terrainExpanded}>▸</span>
        </button>
        {#if terrainExpanded}
          <ul class="section-body" transition:slide|local={{ duration: 200 }}>
            <li>Multiple biomes with unique resource characteristics</li>
            <li>Terrain rarity system: common to mythic quality</li>
            <li>Rare terrain provides strategic advantages</li>
            <li>Special visual effects indicate valuable terrain</li>
          </ul>
        {/if}
      </div>

      <div class="section">
        <button class="section-hd" onclick={() => (structExpanded = !structExpanded)} aria-expanded={structExpanded}>
          <span>Structures</span>
          <span class="chevron" class:open={structExpanded}>▸</span>
        </button>
        {#if structExpanded}
          <ul class="section-body" transition:slide|local={{ duration: 200 }}>
            <li>Build spawn points, watchtowers, and fortresses</li>
            <li>Structures provide territorial control and strategic advantages</li>
            <li>Different structures have unique functions and requirements</li>
            <li>Strategic placement is key to efficient expansion</li>
          </ul>
        {/if}
      </div>

      <div class="section">
        <button class="section-hd" onclick={() => (unitsExpanded = !unitsExpanded)} aria-expanded={unitsExpanded}>
          <span>Units &amp; Combat</span>
          <span class="chevron" class:open={unitsExpanded}>▸</span>
        </button>
        {#if unitsExpanded}
          <ul class="section-body" transition:slide|local={{ duration: 200 }}>
            <li>Command unit groups for expansion and resource gathering</li>
            <li>Combat factors: unit strength, terrain, and positioning</li>
            <li>Form alliances with other players for mutual benefits</li>
            <li>Balance expansion with defensive capabilities</li>
          </ul>
        {/if}
      </div>

      <div class="section">
        <button class="section-hd" onclick={() => (controlsExpanded = !controlsExpanded)} aria-expanded={controlsExpanded}>
          <span>Controls</span>
          <span class="chevron" class:open={controlsExpanded}>▸</span>
        </button>
        {#if controlsExpanded}
          <div class="section-body controls-grid" transition:slide|local={{ duration: 200 }}>
            <div class="ctrl"><kbd>WASD</kbd> / <kbd>↑←↓→</kbd> Navigate</div>
            <div class="ctrl"><kbd>Click</kbd> Move to tile</div>
            <div class="ctrl"><kbd>Drag</kbd> Pan view</div>
            <div class="ctrl"><kbd>Hover</kbd> Tile details</div>
          </div>
        {/if}
      </div>

    </div>

    <div class="ach-row">
      <button class="ach-btn" onclick={openAchievements}>
        <Trophy extraClass="ach-icon" />
        View Achievements
      </button>
    </div>

    <a href="/guide" target="_blank" rel="noopener noreferrer" class="guide-link">
      Read the complete guide ↗
    </a>

    <button class="dismiss-btn close-btn" onclick={dismiss}>Got it — start exploring</button>
  </div>
</div>

<style>
  .help-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    color: var(--color-parchment-100, #fbf6e7);
    font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
  }

  .help-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.75em 1em 1.25em;
    display: flex;
    flex-direction: column;
    gap: 0.9em;
    scrollbar-width: thin;
    scrollbar-color: rgba(176, 141, 74, 0.25) transparent;
  }

  .summary {
    font-family: var(--font-editorial, serif);
    font-style: italic;
    font-size: 0.8em;
    line-height: 1.5;
    color: rgba(232, 228, 210, 0.6);
    margin: 0;
  }

  /* ── Collapsible sections ── */
  .sections {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }

  .section {
    border: 0.075em solid rgba(176, 141, 74, 0.14);
  }

  .section-hd {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(176, 141, 74, 0.06);
    border: none;
    color: var(--color-parchment-100, #fbf6e7);
    padding: 0.55em 0.8em;
    font-family: var(--font-display);
    font-size: 0.7em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s;
  }
  .section-hd:hover { background: rgba(176, 141, 74, 0.12); }

  .chevron {
    font-size: 0.75em;
    color: rgba(232, 228, 210, 0.35);
    display: inline-block;
    transition: transform 0.15s;
    transform: rotate(0deg);
    flex-shrink: 0;
  }
  .chevron.open { transform: rotate(90deg); }

  .section-body {
    list-style: none;
    margin: 0;
    padding: 0.5em 0.8em 0.6em;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }

  .section-body li {
    font-family: var(--font-editorial, serif);
    font-style: italic;
    font-size: 0.78em;
    color: rgba(232, 228, 210, 0.65);
    line-height: 1.4;
    padding-left: 0.8em;
    position: relative;
  }
  .section-body li::before {
    content: '·';
    position: absolute;
    left: 0;
    color: var(--color-aged-gold, #b08d4a);
  }

  /* Controls grid inside section-body */
  .controls-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4em 0.8em;
  }

  .ctrl {
    font-family: var(--font-mono);
    font-size: 0.72em;
    color: rgba(232, 228, 210, 0.6);
  }

  kbd {
    font-family: var(--font-mono);
    font-size: 0.85em;
    background: rgba(255, 255, 255, 0.08);
    border: 0.075em solid rgba(255, 255, 255, 0.15);
    padding: 0.1em 0.3em;
    color: var(--color-parchment-100);
  }

  /* ── Achievements row ── */
  .ach-row { flex-shrink: 0; }

  .ach-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    width: 100%;
    padding: 0.5em 1em;
    background: rgba(176, 141, 74, 0.1);
    border: 0.075em solid rgba(176, 141, 74, 0.3);
    color: var(--color-gold-pale, #d4b170);
    font-family: var(--font-display);
    font-size: 0.7em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .ach-btn:hover {
    background: rgba(176, 141, 74, 0.18);
    border-color: var(--color-aged-gold, #b08d4a);
  }

  .help-panel :global(.ach-icon) {
    width: 1em;
    height: 1em;
    color: var(--color-gold-pale, #d4b170);
  }

  /* ── Guide link ── */
  .guide-link {
    font-family: var(--font-mono);
    font-size: 0.68em;
    color: rgba(176, 141, 74, 0.7);
    text-decoration: none;
    text-align: center;
    letter-spacing: 0.06em;
    transition: color 0.12s;
    flex-shrink: 0;
  }
  .guide-link:hover { color: var(--color-gold-pale, #d4b170); }

  /* ── Dismiss button — hidden in dossier (close-btn global override) ── */
  .dismiss-btn {
    font-family: var(--font-display);
    font-size: 0.68em;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    background: var(--color-aged-gold, #b08d4a);
    color: var(--color-ink-900, #0e1320);
    border: 0.075em solid var(--color-aged-gold);
    padding: 0.55em 1em;
    cursor: pointer;
    width: 100%;
    transition: background 0.12s;
    flex-shrink: 0;
  }
  .dismiss-btn:hover { background: var(--color-gold-pale, #d4b170); }
</style>
