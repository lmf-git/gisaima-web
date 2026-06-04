<script>
  // Family tree for a player's lineage in the active world. Lives are pulled
  // from /worlds/:id/lives (which includes heirs); each life links to its
  // parent(s) via parentLifeId (single) or parentLifeIds (array). We lay the
  // tree out in generation rows derived from each life's max parent depth.
  import { onMount } from 'svelte';
  import { apiGet } from '$lib/api.js';
  import { eraLabel, span } from '$lib/era.js';

  const { worldId = null, currentLifeId = null } = $props();

  let lives = $state([]);
  let currentTick = $state(0);
  let loading = $state(true);
  let error = $state(null);

  onMount(load);
  async function load() {
    if (!worldId) { loading = false; return; }
    try {
      const [r, world] = await Promise.all([
        apiGet(`/worlds/${encodeURIComponent(worldId)}/lives`),
        apiGet(`/worlds/${encodeURIComponent(worldId)}`).catch(() => null),
      ]);
      lives = r?.items || [];
      currentTick = Number(world?.info?.tickCount) || 0;
    } catch (e) {
      error = e?.message || 'Failed to load lineage';
    } finally {
      loading = false;
    }
  }

  function parentsOf(life) {
    if (Array.isArray(life.parentLifeIds) && life.parentLifeIds.length) {
      return life.parentLifeIds.map(String);
    }
    if (life.parentLifeId) return [String(life.parentLifeId)];
    return [];
  }

  function buildGenerations(list) {
    if (!list.length) return [];
    const byId = new Map(list.map((l) => [String(l._id), l]));
    const depth = new Map();
    function depthOf(life, seen = new Set()) {
      const id = String(life._id);
      if (depth.has(id)) return depth.get(id);
      if (seen.has(id)) return 0; // cycle guard
      seen.add(id);
      const parents = parentsOf(life).map((pid) => byId.get(pid)).filter(Boolean);
      const d = parents.length ? Math.max(...parents.map((p) => depthOf(p, seen))) + 1 : 0;
      depth.set(id, d);
      return d;
    }
    list.forEach((l) => depthOf(l));
    const maxD = Math.max(...list.map((l) => depth.get(String(l._id))));
    const rows = Array.from({ length: maxD + 1 }, () => []);
    list.forEach((l) => rows[depth.get(String(l._id))].push(l));
    rows.forEach((r) => r.sort((a, b) => new Date(a.born) - new Date(b.born)));
    return rows;
  }

  const generations = $derived(buildGenerations(lives));
  const nameById = $derived(new Map(lives.map((l) => [String(l._id), l.name])));

  function parentNames(life) {
    return parentsOf(life)
      .map((id) => nameById.get(id))
      .filter(Boolean)
      .join(' & ');
  }

  const isActive = (life) => currentLifeId && String(life._id) === String(currentLifeId);

  // In-world reckoning. Born tick → "Age II · Year 47"; lifespan in years runs
  // to the death tick, or to the realm's current tick for the still-living.
  const bornLabel = (life) => eraLabel(life.bornTick) || 'the Elder Days';
  function lifespan(life) {
    const years = span(life.bornTick, life.died ? life.diedTick : currentTick);
    if (years === null) return null;
    return life.died ? `lived ${years} yr${years === 1 ? '' : 's'}` : `${years} yr${years === 1 ? '' : 's'} on`;
  }
</script>

<div class="family-tree">
  {#if loading}
    <p class="ft-note italic">Reading the chronicle…</p>
  {:else if error}
    <p class="ft-note italic">Could not read the lineage: {error}</p>
  {:else if !lives.length}
    <p class="ft-note italic">No lineage recorded yet. Your story begins now.</p>
  {:else}
    {#each generations as row, gen}
      <div class="ft-gen">
        <div class="ft-gen-label">{gen === 0 ? 'Founders' : `Generation ${gen + 1}`}</div>
        <div class="ft-row">
          {#each row as life (life._id)}
            <div
              class="ft-card"
              class:active={isActive(life)}
              class:heir={life.isHeir && !life.died}
              class:fallen={!!life.died}
            >
              <div class="ft-name">
                {life.name}
                {#if isActive(life)}<span class="ft-badge active">Active</span>
                {:else if life.isHeir && !life.died}<span class="ft-badge heir">Heir</span>
                {:else if life.died}<span class="ft-badge fallen">Fallen</span>{/if}
              </div>
              <div class="ft-meta">
                {#if life.ethnicity}<span class="ft-tag">{life.ethnicity}</span>{/if}
                {#if life.trait}<span class="ft-tag">{life.trait}</span>{/if}
                {#if life.sex}<span class="ft-tag">{life.sex === 'f' ? '♀' : '♂'}</span>{/if}
              </div>
              <div class="ft-dates">
                {bornLabel(life)}{#if life.died && eraLabel(life.diedTick)} – {eraLabel(life.diedTick)}{/if}
                {#if lifespan(life)}<span class="ft-span"> · {lifespan(life)}</span>{/if}
              </div>
              {#if parentNames(life)}
                <div class="ft-parents">child of {parentNames(life)}</div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .family-tree { display: flex; flex-direction: column; gap: 1.4em; }
  .ft-note { font-family: var(--font-editorial); color: var(--color-ink-500); }
  .italic { font-style: italic; }

  .ft-gen { display: flex; flex-direction: column; gap: 0.5em; }
  .ft-gen-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-ink-500);
  }
  .ft-row { display: flex; flex-wrap: wrap; gap: 0.8em; }

  .ft-card {
    min-width: 11em;
    flex: 0 1 auto;
    padding: 0.7em 0.9em;
    border: 1px solid rgba(26, 32, 48, 0.2);
    background: rgba(251, 246, 231, 0.5);
    border-radius: 0.2em;
  }
  .ft-card.active { border-color: var(--color-wax-red); box-shadow: inset 0 0 0 1px var(--color-wax-red); }
  .ft-card.heir   { border-style: dashed; }
  .ft-card.fallen { opacity: 0.62; }

  .ft-name {
    font-family: var(--font-display);
    font-size: 1.02rem;
    display: flex;
    align-items: baseline;
    gap: 0.5em;
    flex-wrap: wrap;
  }
  .ft-badge {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 0.15em 0.45em;
    border-radius: 1em;
  }
  .ft-badge.active { background: var(--color-wax-red); color: var(--color-parchment-100); }
  .ft-badge.heir   { background: rgba(176, 141, 74, 0.22); color: var(--color-ink-900); }
  .ft-badge.fallen { background: rgba(26, 32, 48, 0.12); color: var(--color-ink-500); }

  .ft-meta { display: flex; gap: 0.35em; flex-wrap: wrap; margin: 0.3em 0; }
  .ft-tag {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.08em;
    color: var(--color-ink-500);
    border: 1px solid rgba(26, 32, 48, 0.15);
    padding: 0.05em 0.4em;
    border-radius: 0.2em;
  }
  .ft-dates {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-ink-500);
  }
  .ft-span { opacity: 0.8; font-style: italic; }
  .ft-parents {
    font-family: var(--font-editorial);
    font-style: italic;
    font-size: 0.8rem;
    color: var(--color-ink-500);
    margin-top: 0.3em;
  }
</style>
