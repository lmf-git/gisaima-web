<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import Button from '../../components/ui/Button.svelte';

    // Real lives chronicle — pulled from /worlds/:id/lives. The mock catalogue
    // below is only shown when no world is selected (and as a fallback for
    // demo navigation).
    let lives = $state([]);
    let heirs = $state([]);
    let loading = $state(true);
    let reproError = $state(null);
    let reproducing = $state(false);
    let selectedParents = $state([]);
    let taking = $state(null);

    async function takeHeir(heirId) {
        if (!worldId || !heirId) return;
        taking = heirId;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/lives/respawn`, { heirLifeId: heirId });
            await load();
        } catch (e) {
            reproError = e.message;
        } finally {
            taking = null;
        }
    }

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const [l, h] = await Promise.all([
                apiGet(`/worlds/${encodeURIComponent(worldId)}/lives`).catch(() => null),
                apiGet(`/worlds/${encodeURIComponent(worldId)}/heirs`).catch(() => null)
            ]);
            lives = l?.items || [];
            heirs = h?.items || [];
        } catch (e) {
            reproError = e.message;
        } finally {
            loading = false;
        }
    }

    function toggleParent(lifeId) {
        if (selectedParents.includes(lifeId)) {
            selectedParents = selectedParents.filter((id) => id !== lifeId);
        } else if (selectedParents.length < 2) {
            selectedParents = [...selectedParents, lifeId];
        }
    }

    async function reproduce() {
        if (!selectedParents.length || !worldId) return;
        reproducing = true;
        reproError = null;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/lives/reproduce`, {
                parentLifeIds: selectedParents
            });
            selectedParents = [];
            await load();
        } catch (e) {
            reproError = e.message;
        } finally {
            reproducing = false;
        }
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });

    // Mock characters used only when no world is selected, so the page still
    // teaches the model.
    const mockCharacters = [
        { name: 'Edran of the Hill', age: 41, status: 'alive',    born: 't+1,820',  died: null,       deeds: 14, race: 'Human' },
        { name: 'Mira the First',    age: 0,  status: 'dead',     born: 't+202',    died: 't+11,402', deeds: 38, race: 'Human' },
        { name: 'Hawthorn',          age: 0,  status: 'dead',     born: 't+12,001', died: 't+12,840', deeds: 4,  race: 'Sylvan' },
        { name: 'Unnamed Heir',      age: 2,  status: 'unborn',   born: 't+14,800', died: null,       deeds: 0,  race: 'Human' }
    ];
    const characters = $derived(
        lives.length
            ? lives.map((l) => ({
                  id: l._id,
                  name: l.name,
                  status: l.died ? 'dead' : (l.isHeir ? 'unborn' : 'alive'),
                  born: l.born ? new Date(l.born).toLocaleDateString() : '—',
                  died: l.died ? new Date(l.died).toLocaleDateString() : null,
                  deeds: l.deeds || 0,
                  race: l.ethnicity || l.race || 'Human',
                  trait: l.trait || null
              }))
            : mockCharacters
    );

    const lifecycle = [
        ['Spawn',    'compass', 'Choose a rim of the realm. Spawn zones are exclusion zones — no killing, no building.'],
        ['Live',     'banner',  'Gather, build, fight, trade. Every act is recorded against your name.'],
        ['Reproduce','star',    'Names continue. Heirs may carry inheritance & relations.'],
        ['Die',      'skull',   'Some assets drop, some remain at the spawn store. Cooldown before respawn.'],
        ['Restart',  'plus',    'Choose a new flag — same House, or strike out anew.']
    ];

    const statusColor = {
        alive:  'var(--color-sage-deep)',
        dead:   'var(--color-wax-red)',
        unborn: 'var(--color-ink-300)'
    };
</script>

<svelte:head><title>Lives — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Family Tree</div>
    <h1>Lives</h1>
    <p class="lede">A house is many lives, one after another. Death is not the end of the chronicle.</p>
    <Flourish width={220} color="var(--color-ink-900)" />

    <section class="block">
        <div class="eyebrow">Characters</div>
        <ul class="chars">
            {#each characters as c}
                <li class={c.status} class:selectable={c.id && c.status === 'alive'} class:selected={c.id && selectedParents.includes(c.id)}>
                    <WaxSeal
                        label={c.name[0]}
                        color={c.status === 'dead' ? '#2d3548' : '#5b1a1f'}
                        size={48}
                    />
                    <div>
                        <div class="c-name">{c.name}</div>
                        <div class="c-meta">
                            {c.race} · born {c.born}{c.died ? ` · died ${c.died}` : ''}
                            {#if c.trait}· <em>{c.trait}</em>{/if}
                        </div>
                    </div>
                    <div class="c-deeds"><span>{c.deeds}</span><small>DEEDS</small></div>
                    <span class="c-status" style="color: {statusColor[c.status]};">{c.status.toUpperCase()}</span>
                    {#if c.id && c.status === 'alive'}
                        <button class="pick" onclick={() => toggleParent(c.id)}>
                            {selectedParents.includes(c.id) ? '✓ parent' : 'select'}
                        </button>
                    {/if}
                </li>
            {/each}
        </ul>

        {#if lives.length}
            <div class="repro">
                <div class="eyebrow">Reproduce</div>
                <p class="lede italic">
                    Select up to two living characters above. Their heir inherits ethnicity & one trait.
                    Twins ~3% · triplets ~0.5%.
                </p>
                {#if reproError}<p class="err">{reproError}</p>{/if}
                <Button
                    variant="primary"
                    onclick={reproduce}
                    disabled={reproducing || selectedParents.length === 0}
                >
                    {reproducing ? 'Drawing the line…' : `Continue the House (${selectedParents.length} parent${selectedParents.length === 1 ? '' : 's'})`}
                </Button>
            </div>
        {/if}
    </section>

    {#if heirs.length}
        <section class="block">
            <div class="eyebrow">Heirs in waiting</div>
            <p class="lede italic">When your current life ends, you may take up an heir's body and continue the chronicle. Their ethnicity and trait stay with them.</p>
            <ul class="chars">
                {#each heirs as h}
                    <li class="unborn">
                        <WaxSeal label={h.name[0]} color="#b08d4a" size={42} />
                        <div>
                            <div class="c-name">{h.name}</div>
                            <div class="c-meta">{h.ethnicity || 'Unknown'} · sex {h.sex || '?'} · trait <em>{h.trait || 'none'}</em></div>
                        </div>
                        <span class="c-status" style="color: var(--color-aged-gold);">HEIR</span>
                        <button class="pick take" onclick={() => takeHeir(h._id)} disabled={taking === h._id}>
                            {taking === h._id ? 'Stirring…' : 'Take this body'}
                        </button>
                    </li>
                {/each}
            </ul>
        </section>
    {/if}

    <hr class="rule-deco" />

    <section class="block">
        <div class="eyebrow">Lifecycle</div>
        <ol class="life">
            {#each lifecycle as [name, glyph, body], i}
                <li>
                    <span class="num">{String(i + 1).padStart(2, '0')}</span>
                    <span class="stamp"><Stamp kind={glyph} size={20} /></span>
                    <div>
                        <div class="life-name">{name}</div>
                        <p>{body}</p>
                    </div>
                </li>
            {/each}
        </ol>
    </section>

    <p class="note">Lives / reproduction / heirs are not yet implemented in the tick layer. This page documents the model and shows mock characters.</p>
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 900px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .block { margin: 2.5em 0; }
    .chars { list-style: none; padding: 0; margin: 0.8em 0 0; }
    .chars li { display: grid; grid-template-columns: 56px 1fr auto auto auto; gap: 1em; align-items: center; padding: 1em 0; border-top: 1px solid rgba(26, 32, 48, 0.15); }
    .chars li.dead { opacity: 0.7; }
    .chars li.unborn { opacity: 0.55; }
    .chars li.selected { background: rgba(176, 141, 74, 0.08); }
    .pick { padding: 0.4em 0.8em; font-family: var(--font-display); font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; background: transparent; border: 1px solid var(--color-ink-900); cursor: pointer; }
    .pick.take { background: var(--color-aged-gold); border-color: var(--color-aged-gold); color: var(--color-ink-900); }
    .pick.take:hover { background: var(--color-gold-pale); }
    .pick.take:disabled { opacity: 0.5; cursor: not-allowed; }
    .chars li.selected .pick { background: var(--color-wax-red); color: var(--color-parchment-100); border-color: var(--color-wax-red); }
    .repro { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.2em 1.4em; margin-top: 1.5em; }
    .lede { font-family: var(--font-editorial); color: var(--color-ink-500); margin: 0.5em 0 1em; }
    .err { font-family: var(--font-editorial); color: var(--color-wax-red); font-style: italic; margin: 0 0 0.6em; }
    .c-meta em { color: var(--color-wax-red); font-style: italic; }
    .c-name { font-family: var(--font-display); font-size: 1.05rem; letter-spacing: 0.04em; }
    .c-meta { font-family: var(--font-editorial); font-style: italic; font-size: 0.85rem; color: var(--color-ink-500); }
    .c-deeds { text-align: right; }
    .c-deeds span { font-family: var(--font-display); font-size: 1.3rem; }
    .c-deeds small { display: block; font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.18em; color: var(--color-ink-500); }
    .c-status { font-family: var(--font-mono); font-size: 0.78rem; letter-spacing: 0.18em; min-width: 5em; text-align: right; }
    .life { list-style: none; padding: 0; margin: 0.8em 0 0; }
    .life li { display: grid; grid-template-columns: 36px 30px 1fr; gap: 0.7em; padding: 0.8em 0; border-top: 1px solid rgba(26, 32, 48, 0.15); align-items: start; }
    .life .num { font-family: var(--font-mono); color: var(--color-ink-500); }
    .life .stamp { color: var(--color-wax-red); }
    .life-name { font-family: var(--font-display); font-size: 1rem; letter-spacing: 0.04em; }
    .life p { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-700); margin: 0.2em 0 0; }
    .rule-deco { border: none; margin: 2em 0; }
    .note { font-family: var(--font-editorial); font-style: italic; font-size: 0.85rem; color: var(--color-ink-500); margin-top: 2em; }
</style>
