<script>
  import { apiPost } from '../../../lib/api.js';
  import { game } from '../../../lib/stores/game.js';
  import { RESEARCH, getAvailableResearch, highestAcademyLevel } from 'gisaima-shared/definitions/RESEARCH.js';

  const { structure = null, x, y, onClose = () => {} } = $props();

  let busy = $state(false);
  let error = $state(null);
  let success = $state(null);

  const academyLevel = $derived(highestAcademyLevel(structure));
  const completed = $derived(structure?.research || {});
  const inProgress = $derived(structure?.researchInProgress || null);
  const available = $derived(structure ? getAvailableResearch(structure) : []);

  // Research the player can't start yet, with the reason — so the panel teaches
  // the requirements instead of just hiding them.
  const locked = $derived(
    Object.entries(RESEARCH)
      .filter(([id]) => !completed[id] && !available.some(a => a.id === id))
      .map(([id, def]) => {
        let reason = '';
        if (academyLevel < def.requiredAcademyLevel) reason = `Needs Academy L${def.requiredAcademyLevel}`;
        else if (def.requiredResearch && !completed[def.requiredResearch]) reason = `Needs ${RESEARCH[def.requiredResearch]?.name}`;
        return { id, ...def, reason };
      })
  );

  function cost(def) {
    return Object.entries(def.cost || {}).map(([c, q]) => `${q} ${c}`).join(', ');
  }

  async function start(id) {
    if (busy || inProgress) return;
    busy = true; error = null; success = null;
    try {
      await apiPost('/actions/startResearch', { worldId: $game.worldKey, x, y, researchId: id });
      success = 'Research begun.';
    } catch (e) {
      error = e.message || 'Could not start research';
    } finally {
      busy = false;
    }
  }
</script>

<div class="research">
  {#if !structure}
    <p class="empty">No structure here.</p>
  {:else if academyLevel < 1}
    <p class="empty">This structure has no Academy. Build and level an Academy to conduct research.</p>
  {:else}
    <p class="academy">Academy level <strong>{academyLevel}</strong></p>

    {#if inProgress}
      <div class="in-progress">
        <span class="spin" aria-hidden="true"></span>
        Researching <strong>{inProgress.name || inProgress.id}</strong>…
      </div>
    {/if}

    {#if error}<div class="msg err">{error}</div>{/if}
    {#if success}<div class="msg ok">{success}</div>{/if}

    {#if available.length}
      <ul class="list">
        {#each available as r (r.id)}
          <li>
            <div class="r-head">
              <span class="r-name">{r.name}</span>
              <button class="r-go" onclick={() => start(r.id)} disabled={busy || !!inProgress}>Research</button>
            </div>
            <p class="r-desc">{r.description}</p>
            <p class="r-cost">Cost: {cost(r) || '—'} · {r.ticksRequired} ticks</p>
          </li>
        {/each}
      </ul>
    {:else if !inProgress}
      <p class="empty">No research available right now.</p>
    {/if}

    {#each Object.keys(completed).filter(k => completed[k]) as id (id)}
      <div class="done">✓ {RESEARCH[id]?.name || id}</div>
    {/each}

    {#each locked as r (r.id)}
      <div class="locked">🔒 {r.name} — {r.reason}</div>
    {/each}
  {/if}
</div>

<style>
  .research { padding: 0.6em 0.9em; color: var(--chrome-text, #e8e0cc); font-family: var(--font-ui, system-ui, sans-serif); }
  .empty { font-family: var(--font-editorial, serif); font-style: italic; color: var(--chrome-text-dim, #a09070); }
  .academy { font-size: 0.8em; color: var(--chrome-text-dim, #a09070); margin: 0 0 0.6em; }
  .in-progress { display: flex; align-items: center; gap: 0.5em; font-size: 0.8em; padding: 0.4em 0.6em; background: var(--chrome-gold-soft, #2a2010); border-left: 2px solid var(--chrome-gold, #b08d4a); margin-bottom: 0.6em; }
  .spin { width: 0.8em; height: 0.8em; border: 2px solid var(--chrome-gold-border, #5a4520); border-top-color: var(--chrome-gold, #b08d4a); border-radius: 50%; animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .msg { font-size: 0.75em; padding: 0.4em 0.6em; margin-bottom: 0.5em; }
  .msg.err { color: #ff7676; background: rgba(91,26,31,0.18); }
  .msg.ok { color: var(--chrome-gold, #b08d4a); background: var(--chrome-gold-soft, #2a2010); }
  .list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6em; }
  .list li { border: 1px solid var(--chrome-gold-soft, #2a2010); padding: 0.5em 0.7em; background: var(--chrome-card, #1a1e28); }
  .r-head { display: flex; justify-content: space-between; align-items: center; gap: 0.6em; }
  .r-name { font-family: var(--font-display, serif); font-size: 0.85em; letter-spacing: 0.06em; color: var(--chrome-gold, #b08d4a); }
  .r-go { background: var(--color-aged-gold, #b08d4a); border: none; color: var(--color-ink-900, #0e1320); font-family: var(--font-display, serif); font-size: 0.65em; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.4em 0.7em; cursor: pointer; }
  .r-go:disabled { opacity: 0.4; cursor: default; }
  .r-desc { font-family: var(--font-editorial, serif); font-style: italic; font-size: 0.75em; color: var(--chrome-text-dim, #a09070); margin: 0.3em 0; }
  .r-cost { font-family: var(--font-mono, monospace); font-size: 0.65em; color: var(--chrome-text-faint, #6a5f45); margin: 0; }
  .done { font-size: 0.72em; color: var(--chrome-gold, #b08d4a); margin-top: 0.4em; }
  .locked { font-size: 0.72em; color: var(--chrome-text-faint, #6a5f45); margin-top: 0.4em; }
</style>
