<script>
  import { derived } from 'svelte/store';
  import { apiPost } from '../../../lib/api.js';

  import { targetStore, ready, entities, currentPlayerPosition } from '../../../lib/stores/map.js';
  import { game, currentPlayer } from '../../../lib/stores/game.js';
  import { user } from '../../../lib/stores/user.js';
  import { getGatherableItems } from 'gisaima-shared/definitions/ITEMS.js';

  import Mobilise        from '../actions/Mobilise.svelte';
  import Move            from '../actions/Move.svelte';
  import Gather          from '../actions/Gather.svelte';
  import Demobilise      from '../actions/Demobilise.svelte';
  import Attack          from '../actions/Attack.svelte';
  import JoinBattle      from '../actions/JoinBattle.svelte';
  import Build           from '../actions/Build.svelte';
  import Recruitment     from '../actions/Recruitment.svelte';
  import Crafting        from '../actions/Crafting.svelte';
  import StructureOverview from '../actions/StructureOverview.svelte';
  import Details         from '../actions/Details.svelte';
  import UnitDetails     from '../actions/UnitDetails.svelte';

  import Stamp from '../../ui/Stamp.svelte';
  import Close from '../../icons/Close.svelte';
  import Achievements from '../../features/feedback/Achievements.svelte';
  import Tutorial    from '../actions/Tutorial.svelte';

  const {
    panel = null,                  // active action panel id or null
    onClose = () => {},            // called when dossier should close
    onSwitchPanel = () => {},      // called to switch to a different panel
    onStartPathDrawing = () => {},
    onBuildRequest = () => {},
  } = $props();

  // Unit details sub-panel state (lifted from Details)
  let selectedUnit = $state(null);

  // Secondary sections collapsed when an action panel is active
  let locationOpen = $state(true);
  let dropsOpen = $state(true);

  $effect(() => {
    const isAction = panel !== null && panel !== 'details';
    locationOpen = !isAction;
    dropsOpen = !isAction;
  });

  // ─── Target tile ───────────────────────────────────────────────
  const tile   = $derived($targetStore);
  const pid    = $derived($currentPlayer?.id ?? $user?.uid);
  const groups = $derived(tile?.groups  ?? []);
  const struct = $derived(tile?.structure ?? null);
  const battles= $derived(tile?.battles  ?? []);

  // What can be gathered on this tile, by biome — shown when the tile is empty
  // (no groups, structure, or battles) so an otherwise-bare tile still tells the
  // player what its biome offers.
  const tileEmpty   = $derived(!groups.length && !struct && !battles.length);
  const gatherables = $derived(tile?.biome?.name ? getGatherableItems(tile.biome.name) : []);

  // ─── Player's current-location info (former CurrentLocationHud) ─
  const place = derived(
    [entities, currentPlayerPosition, user],
    ([$ent, $pos, $u]) => {
      if (!$pos || !$u) return null;
      const key = `${$pos.x},${$pos.y}`;
      const s   = $ent.structure?.[key] ?? null;
      const gs  = $ent.groups?.[key]    ?? [];
      const mine = gs.find(g => g?.owner === $u.uid);
      if (mine?.items && Object.keys(mine.items).length)
        return { kind: 'group', name: mine.name || 'Your Host', items: mine.items, owned: true };
      if (s) {
        const owned = s.owner === $u.uid || (s.members || []).includes($u.uid);
        return { kind: 'structure', name: s.name || 'Settlement', items: s.items || {}, owned };
      }
      if (mine) return { kind: 'group', name: mine.name || 'Your Host', items: mine.items || {}, owned: true };
      return null;
    }
  );

  // ─── Items on the player's tile (former ItemDropsHud) ──────────
  let dropBusy = $state(false);
  let dropDraft = $state({ key: 'GOLD', qty: 1 });

  const tileItems = derived(
    [entities, currentPlayerPosition],
    ([$ent, $pos]) => {
      if (!$pos) return {};
      const raw = $ent.items?.[`${$pos.x},${$pos.y}`];
      if (!raw) return {};
      if (Array.isArray(raw)) {
        const obj = {};
        for (const it of raw) {
          const k = (it?.code || it?.id || it?.name || '').toString().toUpperCase();
          if (!k || k.startsWith('_')) continue;
          obj[k] = (obj[k] || 0) + (Number(it?.quantity) || 1);
        }
        return obj;
      }
      return Object.fromEntries(Object.entries(raw).filter(([k]) => k && !k.startsWith('_')));
    }
  );

  const sinkItems = derived(
    [entities, currentPlayerPosition, user],
    ([$ent, $pos, $u]) => {
      if (!$pos || !$u) return null;
      const key = `${$pos.x},${$pos.y}`;
      const gs = $ent.groups?.[key] ?? [];
      const s  = $ent.structure?.[key];
      const mine = gs.find(g => g?.owner === $u.uid);
      if (mine?.items && Object.keys(mine.items).length) return mine.items;
      if (s?.owner === $u.uid && s.items) return s.items;
      return null;
    }
  );

  async function pickup(item, qty) {
    dropBusy = true;
    try { await apiPost(`/worlds/${encodeURIComponent($game.worldKey)}/items/pickup`, { items: { [item]: qty } }); }
    catch (e) { alert(`Pickup failed: ${e.message}`); }
    finally { dropBusy = false; }
  }

  async function drop() {
    dropBusy = true;
    const qty = Math.max(1, Math.floor(Number(dropDraft.qty) || 0));
    const key = (dropDraft.key || '').toUpperCase().trim();
    if (!key) { dropBusy = false; return; }
    try { await apiPost(`/worlds/${encodeURIComponent($game.worldKey)}/items/drop`, { items: { [key]: qty } }); }
    catch (e) { alert(`Drop failed: ${e.message}`); }
    finally { dropBusy = false; }
  }

  // ─── helpers ───────────────────────────────────────────────────
  const _fmt = t => t?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) ?? '';

  const PANEL_TITLES = {
    mobilise:    'Mobilise',
    move:        'Move Group',
    gather:      'Gather',
    demobilise:  'Demobilise',
    attack:      'Attack',
    joinBattle:  'Join Battle',
    build:       'Build',
    recruitment: 'Recruit',
    craft:       'Crafting',
    achievements:'Achievements',
    help:        'Guide',
    inspect:     'Inspect',
  };

  const panelTitle = $derived(panel ? (PANEL_TITLES[panel] ?? null) : null);

  function glyphFor(key) {
    const k = (key || '').toUpperCase();
    if (k === 'GOLD' || k.includes('COIN'))  return 'coin';
    if (k.includes('WOOD') || k.includes('STICK')) return 'wood';
    if (k.includes('STONE') || k.includes('METAL') || k.includes('ORE') || k.includes('CRYSTAL')) return 'stone';
    if (k.includes('WHEAT') || k.includes('GRAIN') || k.includes('BERRY') || k.includes('HERB')) return 'wheat';
    if (k.includes('SWORD') || k.includes('WEAPON')) return 'sword';
    if (k.includes('SHIELD') || k.includes('BODY') || k.includes('HELM')) return 'shield';
    if (k.includes('SKULL') || k.includes('BONE')) return 'skull';
    if (k.includes('SCROLL') || k.includes('FRAGMENT')) return 'scroll';
    return 'plus';
  }

  function itemEntries(items) {
    return Object.entries(items || {}).filter(([, q]) => q && q > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }

  function unitCount(group) {
    if (!group?.units) return 0;
    if (Array.isArray(group.units)) return group.units.length;
    return Object.keys(group.units).length;
  }

  function handleBuild(buildData) { onClose(); onBuildRequest(buildData); }
  function handleMove(groupData)  { onClose(); onStartPathDrawing(groupData); }

  const visible = $derived(panel !== null);
</script>

<aside
  class="tile-dossier"
  class:open={visible}
  aria-hidden={!visible}
>
  {#if visible}
    <!-- ── Persistent header — always shown, provides consistent close + context ── -->
    <div class="ds-topbar">
      <div class="ds-topbar-left">
        {#if panelTitle}
          <span class="ds-topbar-action">{panelTitle}</span>
        {:else if struct?.name}
          <span class="ds-topbar-name">{struct.name}</span>
        {:else}
          <span class="ds-topbar-name">Tile</span>
        {/if}
        {#if tile}
          <span class="ds-topbar-coords">{tile.x},{tile.y}</span>
          {#if tile.biome?.name}<span class="ds-topbar-biome">{_fmt(tile.biome.name)}</span>{/if}
        {/if}
      </div>
      <button class="ds-close" onclick={onClose} aria-label="Close dossier">
        <Close size="1.25em" />
      </button>
    </div>

    <div class="ds-body">

      <!-- ── Action panels (fill the body, body scrolls) ── -->
      {#if panel === 'mobilise'}
        <div class="ds-panel"><Mobilise onClose={onClose} /></div>

      {:else if panel === 'move'}
        <div class="ds-panel"><Move onStartPathDrawing={handleMove} onClose={onClose} /></div>

      {:else if panel === 'gather'}
        <div class="ds-panel"><Gather onClose={onClose} /></div>

      {:else if panel === 'demobilise' && tile}
        <div class="ds-panel"><Demobilise x={tile.x} y={tile.y} tile={tile} onClose={onClose} /></div>

      {:else if panel === 'attack' && tile}
        <div class="ds-panel"><Attack x={tile.x} y={tile.y} tile={tile} onClose={onClose} /></div>

      {:else if panel === 'joinBattle' && tile}
        <div class="ds-panel"><JoinBattle x={tile.x} y={tile.y} tile={tile} onClose={onClose} /></div>

      {:else if panel === 'build' && tile}
        <div class="ds-panel"><Build x={tile.x} y={tile.y} tile={tile} onBuild={handleBuild} onClose={onClose} /></div>

      {:else if panel === 'recruitment'}
        <div class="ds-panel"><Recruitment structure={struct} x={tile?.x} y={tile?.y} onClose={onClose} /></div>

      {:else if panel === 'craft'}
        <div class="ds-panel"><Crafting structure={struct} x={tile?.x} y={tile?.y} onClose={onClose} /></div>

      {:else if panel === 'achievements'}
        <div class="ds-panel"><Achievements onClose={onClose} /></div>

      {:else if panel === 'help'}
        <div class="ds-panel"><Tutorial onClose={onClose} onOpenAchievements={() => onSwitchPanel('achievements')} /></div>

      {:else if panel === 'inspect' && tile}
        <div class="ds-panel"><StructureOverview x={tile.x} y={tile.y} tile={tile} onClose={onClose} onShowModal={() => {}} /></div>

      {:else if panel === 'details' && !selectedUnit}
        <div class="ds-panel"><Details
          onClose={onClose}
          onShowModal={({ type }) => onSwitchPanel(type)}
          onOpenUnitDetails={(unit, unitId, group) => { selectedUnit = { unit, unitId, group }; }}
        /></div>

      {:else if panel === 'details' && selectedUnit}
        <div class="ds-panel"><UnitDetails
          unit={selectedUnit.unit}
          unitId={selectedUnit.unitId}
          group={selectedUnit.group}
          tileData={tile}
          onClose={() => { selectedUnit = null; }}
          onEquipped={() => { selectedUnit = null; }}
        /></div>

      {:else if panel === null && tile}
        <!-- ── Default tile overview (only when no action selected) ── -->
        {#if struct?.name}
          <div class="ds-settlement">{struct.name}</div>
        {/if}

        {#if groups.length}
          <section class="ds-section">
            <div class="ds-section-hd"><span class="ds-label">GARRISON</span><span class="ds-count">{groups.length}</span></div>
            <ul class="ds-list">
              {#each groups as g (g.id)}
                <li class="ds-row" class:mine={g.owner === pid}>
                  <span class="ds-row-name">{g.name || 'Unnamed Force'}</span>
                  <span class="ds-row-meta">{_fmt(g.status)} · {unitCount(g)}u</span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if struct}
          <section class="ds-section">
            <div class="ds-section-hd"><span class="ds-label">BUILDINGS</span></div>
            <ul class="ds-list">
              <li class="ds-row" class:mine={struct.owner === pid}>
                <span class="ds-row-name">{struct.name || _fmt(struct.type)}</span>
                {#if struct.level}<span class="ds-row-meta">Lv {struct.level}</span>{/if}
              </li>
              {#if struct.buildings}
                {#each Object.entries(struct.buildings) as [bType, bData] (bType)}
                  <li class="ds-row sub">
                    <span class="ds-row-name">{_fmt(bType)}</span>
                    {#if bData.level}<span class="ds-row-meta">Lv {bData.level}</span>{/if}
                  </li>
                {/each}
              {/if}
            </ul>
          </section>
        {/if}

        {#if tileEmpty && gatherables.length}
          <section class="ds-section ds-gather">
            <div class="ds-section-hd">
              <Stamp kind="wheat" size={12} />
              <span class="ds-label" style="margin-left:0.4em">GATHERABLE HERE</span>
              <span class="ds-count">{gatherables.length}</span>
            </div>
            <ul class="ds-items-list">
              {#each gatherables as g (g.code)}
                <li>
                  <Stamp kind={glyphFor(g.code)} size={12} />
                  <span class="ds-item-name">{g.name}</span>
                  <span class="ds-row-meta">{g.rarity}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        <!-- Location + drops only on default overview -->
        {#if $place}
          <section class="ds-section ds-location">
            <button class="ds-section-hd ds-toggle" onclick={() => (locationOpen = !locationOpen)} aria-expanded={locationOpen}>
              <Stamp kind={$place.kind === 'structure' ? 'tower' : 'banner'} size={12} />
              <span class="ds-label" style="margin-left:0.4em">{$place.name}</span>
              <span class="ds-meta-tag">{$place.kind === 'structure' ? 'STRUCTURE' : 'GROUP'}</span>
              {#if !$place.owned}<span class="ds-meta-tag ro">read-only</span>{/if}
              <span class="ds-chevron" class:open={locationOpen}>▸</span>
            </button>
            {#if locationOpen}
              {#if itemEntries($place.items).length === 0}
                <div class="ds-empty">— empty —</div>
              {:else}
                <ul class="ds-items-list">
                  {#each itemEntries($place.items) as [k, q]}
                    <li>
                      <Stamp kind={glyphFor(k)} size={12} />
                      <span class="ds-qty">{q.toLocaleString()}</span>
                      <span class="ds-item-name">{k.replace(/_/g, ' ').toLowerCase()}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
            {/if}
          </section>
        {/if}

        {#if Object.keys($tileItems).length > 0}
          <section class="ds-section ds-drops">
            <button class="ds-section-hd ds-toggle" onclick={() => (dropsOpen = !dropsOpen)} aria-expanded={dropsOpen}>
              <Stamp kind="scroll" size={12} />
              <span class="ds-label" style="margin-left:0.4em">ON THIS TILE</span>
              <span class="ds-count wax">{Object.keys($tileItems).length}</span>
              <span class="ds-chevron" class:open={dropsOpen}>▸</span>
            </button>
            {#if dropsOpen}
              <ul class="ds-items-list">
                {#each Object.entries($tileItems) as [k, q]}
                  <li>
                    <Stamp kind={glyphFor(k)} size={12} />
                    <span class="ds-qty">×{q}</span>
                    <span class="ds-item-name">{k.replace(/_/g, ' ').toLowerCase()}</span>
                    <button class="ds-pick" onclick={() => pickup(k, q)} disabled={dropBusy || !$sinkItems}>pick up</button>
                  </li>
                {/each}
              </ul>
              {#if $sinkItems && Object.keys($sinkItems).length}
                <form class="ds-drop-form" onsubmit={(e) => { e.preventDefault(); drop(); }}>
                  <select bind:value={dropDraft.key}>
                    {#each Object.entries($sinkItems) as [k, q]}
                      <option value={k}>{k.replace(/_/g, ' ').toLowerCase()} (×{q})</option>
                    {/each}
                  </select>
                  <input type="number" min="1" max="9999" bind:value={dropDraft.qty} />
                  <button type="submit" disabled={dropBusy}>drop</button>
                </form>
              {/if}
            {/if}
          </section>
        {/if}
      {/if}

    </div>
  {/if}
</aside>

<style>
  .tile-dossier {
    position: fixed;
    top: 3.5em;
    right: 0;
    width: 28em;
    bottom: 0;
    z-index: 1100;
    background: linear-gradient(180deg, var(--chrome-panel-a) 0%, var(--chrome-panel-b) 100%);
    border-left: 0.075em solid var(--chrome-border);
    color: var(--chrome-text);
    font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* Slide in from right */
    transform: translateX(100%);
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  .tile-dossier.open {
    transform: translateX(0);
    pointer-events: all;
  }

  /* On mobile, slide up from bottom as a drawer above the tab bar */
  @media (max-width: 700px) {
    .tile-dossier {
      top: auto;
      left: 0;
      right: 0;
      width: 100%;
      height: 65vh;
      bottom: 52px; /* clear the mobile tab bar */
      border-left: none;
      border-top: 0.075em solid var(--chrome-border);
      transform: translateY(calc(100% + 52px));
    }
    .tile-dossier.open { transform: translateY(0); }
  }

  /* ── Top bar ── */
  .ds-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.55em 0.75em 0.55em 1em;
    border-bottom: 0.075em solid var(--chrome-hairline);
    flex-shrink: 0;
    min-height: 2.75em;
    background: var(--chrome-gold-soft);
  }

  .ds-topbar-left {
    display: flex;
    align-items: baseline;
    gap: 0.55em;
    min-width: 0;
    overflow: hidden;
  }

  .ds-topbar-action {
    font-family: var(--font-display);
    font-size: 0.8em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--chrome-gold);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .ds-topbar-name {
    font-family: var(--font-display);
    font-size: 0.8em;
    letter-spacing: 0.1em;
    color: var(--chrome-gold);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ds-topbar-coords {
    font-family: var(--font-mono);
    font-size: 0.72em;
    color: var(--chrome-text-faint);
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .ds-topbar-biome {
    font-family: var(--font-mono);
    font-size: 0.65em;
    color: var(--chrome-text-faint);
    flex-shrink: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 7em;
  }

  .ds-close {
    background: transparent;
    border: none;
    color: var(--chrome-text-dim);
    cursor: pointer;
    padding: 0.3em 0.35em;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    transition: color 0.14s, background 0.14s;
    border-radius: 2px;
    margin-left: 0.4em;
  }
  .ds-close:hover {
    color: var(--chrome-text);
    background: var(--chrome-gold-soft);
  }

  /* ── Scrollable body ── */
  .ds-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    display: flex;
    flex-direction: column;
  }
  .ds-body::-webkit-scrollbar { display: none; }

  /* ── Action panel host — no scroll; ds-body is the single scroller ── */
  .ds-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  /* Suppress inner scrollbars — ds-body is the single scroll owner */
  .ds-panel :global(*) {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .ds-panel :global(*::-webkit-scrollbar) { display: none; }

  /* ── Scoped typography improvements for panels rendered in the dossier ── */

  /* Section headings: compact but readable */
  .ds-panel :global(h3) {
    font-size: 0.72em;
    letter-spacing: 0.18em;
    margin-bottom: 0.6em;
  }

  /* Item / row font size: comfortably readable in narrow column */
  .ds-panel :global(.group-name),
  .ds-panel :global(.structure-name),
  .ds-panel :global(.unit-name) {
    font-size: 0.9em;
  }

  /* Reduce tag/badge padding in the narrow context */
  .ds-panel :global(.race-tag),
  .ds-panel :global(.strength-tag),
  .ds-panel :global(.resources-tag),
  .ds-panel :global(.group-tag) {
    font-size: 0.72em;
    padding: 0.1em 0.35em;
  }

  /* Primary action button: full width in dossier */
  .ds-panel :global(.mobilise-btn),
  .ds-panel :global(.build-btn),
  .ds-panel :global(.gather-btn),
  .ds-panel :global(.attack-btn),
  .ds-panel :global(.join-btn),
  .ds-panel :global(.recruit-btn),
  .ds-panel :global(.craft-btn) {
    flex: 1;
  }

  /* Location-info blocks: compact */
  .ds-panel :global(.location-info) {
    padding: 0.6em 0.8em;
    margin-bottom: 0.7em;
  }

  /* Error / success banners */
  .ds-panel :global(.mobilise-error),
  .ds-panel :global(.build-error) {
    font-size: 0.82em;
    padding: 0.6em 0.8em;
    margin: 0.5em 0;
  }

  /* ── Settlement name ── */
  .ds-settlement {
    font-family: var(--font-display);
    font-size: 0.9em;
    letter-spacing: 0.08em;
    color: var(--chrome-text);
    padding: 0.7em 1em 0.2em;
  }

  /* ── Generic section ── */
  .ds-section {
    border-bottom: 0.075em solid var(--chrome-hairline);
    padding: 0.75em 1em;
  }
  .ds-section:last-child { border-bottom: none; }

  .ds-section-hd {
    display: flex;
    align-items: center;
    gap: 0.4em;
    margin-bottom: 0.5em;
  }

  /* Collapsible toggle header */
  .ds-toggle {
    width: 100%;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    padding: 0;
    margin-bottom: 0;
    color: inherit;
  }
  .ds-toggle:hover .ds-label { color: var(--chrome-gold); }
  .ds-chevron {
    font-size: 0.6em;
    color: var(--chrome-text-faint);
    margin-left: auto;
    display: inline-block;
    transition: transform 0.15s;
    transform: rotate(0deg);
  }
  .ds-chevron.open { transform: rotate(90deg); }

  .ds-label {
    font-family: var(--font-display);
    font-size: 0.58em;
    letter-spacing: 0.2em;
    color: var(--color-aged-gold, #b08d4a);
    opacity: 0.9;
    flex: 1;
  }

  .ds-count {
    font-family: var(--font-mono);
    font-size: 0.62em;
    color: var(--chrome-text-faint);
  }
  .ds-count.wax {
    color: var(--color-wax-red, #8b2020);
    background: rgba(139,32,32,0.15);
    padding: 0.1em 0.4em;
  }

  .ds-meta-tag {
    font-family: var(--font-mono);
    font-size: 0.58em;
    letter-spacing: 0.12em;
    color: var(--chrome-text-faint);
    flex-shrink: 0;
  }
  .ds-meta-tag.ro { color: var(--chrome-gold); }

  /* ── List rows ── */
  .ds-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.2em; }

  .ds-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 0.76em;
    padding: 0.18em 0 0.18em 0.45em;
    border-left: 0.2em solid transparent;
  }
  .ds-row.mine { border-left-color: var(--color-aged-gold, #b08d4a); }
  .ds-row.sub  { padding-left: 1.1em; opacity: 0.65; font-size: 0.7em; }

  .ds-row-name {
    color: var(--chrome-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
  }
  .ds-row-meta {
    font-family: var(--font-mono);
    color: var(--chrome-text-faint);
    font-size: 0.88em;
    flex-shrink: 0;
    margin-left: 0.5em;
  }

  /* ── Items list (place + drops) ── */
  .ds-items-list {
    list-style: none; padding: 0.25em 0 0; margin: 0;
    display: flex; flex-direction: column; gap: 0;
  }
  .ds-items-list li {
    display: grid;
    grid-template-columns: 16px auto 1fr auto;
    gap: 0.45em;
    align-items: center;
    padding: 0.28em 0;
    font-size: 0.78em;
    border-bottom: 0.04em solid var(--chrome-hairline);
  }
  .ds-items-list :global(svg) { color: var(--chrome-gold); }

  .ds-qty {
    font-family: var(--font-mono);
    color: var(--chrome-text);
    text-align: right;
    font-size: 0.9em;
  }
  .ds-item-name {
    font-family: var(--font-editorial, serif);
    font-style: italic;
    color: var(--chrome-text-dim);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .ds-empty {
    font-family: var(--font-editorial, serif);
    font-style: italic;
    color: var(--chrome-text-faint);
    font-size: 0.8em;
    text-align: center;
    padding: 0.5em 0;
  }

  .ds-pick {
    font-family: var(--font-display);
    font-size: 0.6em;
    letter-spacing: 0.14em;
    padding: 0.25em 0.45em;
    background: transparent;
    border: 0.075em solid var(--chrome-gold-border);
    color: var(--chrome-gold);
    cursor: pointer;
    white-space: nowrap;
  }
  .ds-pick:hover:not(:disabled) { background: var(--chrome-gold-soft); }
  .ds-pick:disabled { opacity: 0.4; cursor: not-allowed; }

  .ds-drop-form {
    margin-top: 0.5em;
    padding-top: 0.5em;
    border-top: 1px dashed var(--chrome-gold-soft);
    display: grid;
    grid-template-columns: 1fr 52px auto;
    gap: 0.3em;
  }
  .ds-drop-form select,
  .ds-drop-form input {
    background: var(--chrome-field-bg);
    border: 0.075em solid var(--chrome-field-border);
    color: var(--chrome-text);
    font-family: var(--font-mono);
    font-size: 0.72em;
    padding: 0.3em 0.4em;
  }
  .ds-drop-form button {
    font-family: var(--font-display);
    font-size: 0.62em;
    letter-spacing: 0.14em;
    background: var(--color-aged-gold, #b08d4a);
    color: var(--color-ink-900, #0e1320);
    border: 0.075em solid var(--color-aged-gold);
    padding: 0.3em 0.6em;
    cursor: pointer;
  }
  .ds-drop-form button:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
