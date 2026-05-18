<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Button from '../../components/ui/Button.svelte';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';

    let trails = $state([]);
    let loading = $state(true);
    let error = $state(null);
    let creating = $state(false);
    let form = $state({ kind: 'anagram', seedString: '', originX: 0, originY: 0, rewardItem: 'MYSTERIOUS_ARTIFACT' });

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/trails`);
            trails = r?.items || [];
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function create(e) {
        e.preventDefault();
        creating = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/trails`, {
                kind: form.kind,
                seedString: form.seedString || ($user?.displayName || $user?.uid),
                originX: Number(form.originX) || 0,
                originY: Number(form.originY) || 0,
                rewardItem: form.rewardItem
            });
            await load();
        } catch (e) {
            alert(`Create failed: ${e.message}`);
        } finally {
            creating = false;
        }
    }

    async function solveAt(trailId, idx) {
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/trails/${trailId}`, { stepIndex: idx });
            await load();
        } catch (e) {
            alert(`Solve failed: ${e.message}`);
        }
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Treasure Trails — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">A Bearing Whispered</div>
    <h1>Treasure Trails</h1>
    <p class="lede">Each clue points further. Walk close enough to a waypoint and the next reveals itself.</p>
    <Flourish width={220} color="var(--color-ink-900)" />

    {#if $user && !$user.isAnonymous}
        <form class="form" onsubmit={create}>
            <div class="eyebrow">Lay a new trail</div>
            <label>
                <span>Kind</span>
                <select bind:value={form.kind}>
                    <option value="anagram">Anagram (from a name)</option>
                    <option value="spawn">Spawn-radiating</option>
                </select>
            </label>
            <label>
                <span>Seed string (name, village…)</span>
                <input bind:value={form.seedString} placeholder="your house name" />
            </label>
            <div class="row">
                <label>
                    <span>Origin X</span>
                    <input type="number" bind:value={form.originX} />
                </label>
                <label>
                    <span>Origin Y</span>
                    <input type="number" bind:value={form.originY} />
                </label>
            </div>
            <label>
                <span>Reward item key</span>
                <input bind:value={form.rewardItem} />
            </label>
            <Button variant="primary" type="submit" disabled={creating}>
                {creating ? 'Drawing…' : 'Lay trail'}
            </Button>
        </form>
    {/if}

    {#if loading}
        <p class="empty italic">Unrolling the map…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else if !trails.length}
        <p class="empty italic">No trails on your name.</p>
    {:else}
        <div class="grid">
            {#each trails as t}
                <article class="trail" class:done={t.status === 'completed'}>
                    <header>
                        <WaxSeal glyph="compass" color={t.status === 'completed' ? '#3f5a4e' : '#5b1a1f'} size={44} />
                        <div>
                            <div class="kind">{t.kind.toUpperCase()} TRAIL</div>
                            <div class="reward">reward · {t.rewardItem.replace(/_/g, ' ').toLowerCase()}</div>
                        </div>
                        <span class="status">{t.status}</span>
                    </header>
                    <ol class="steps">
                        {#each t.steps as s, i}
                            <li class:solved={s.solved}>
                                <span class="n">{String(i + 1).padStart(2, '0')}</span>
                                <span class="loc">{s.x}, {s.y}</span>
                                <span class="clue">{s.clue}</span>
                                {#if !s.solved && t.status === 'open'}
                                    <button class="solve" onclick={() => solveAt(t._id, i)}>mark visited</button>
                                {:else if s.solved}
                                    <span class="mark"><Stamp kind="banner" size={14} /></span>
                                {/if}
                            </li>
                        {/each}
                    </ol>
                </article>
            {/each}
        </div>
    {/if}
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1000px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .form { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.5em; display: grid; gap: 0.8em; max-width: 500px; margin: 1.5em 0; }
    .form label { display: grid; gap: 0.2em; }
    .form label span { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--color-ink-700); }
    .form .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6em; }
    .form input, .form select { padding: 0.5em 0.7em; background: var(--color-parchment-200); border: 1px solid var(--color-parchment-shadow); font-family: var(--font-body); }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1em; }
    .trail { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1em 1.2em; }
    .trail.done { background: var(--color-sage-pale); }
    .trail header { display: grid; grid-template-columns: 56px 1fr auto; gap: 0.8em; align-items: center; margin-bottom: 0.8em; }
    .kind { font-family: var(--font-display); font-size: 0.85rem; letter-spacing: 0.14em; }
    .reward { font-family: var(--font-editorial); font-style: italic; font-size: 0.78rem; color: var(--color-ink-500); }
    .status { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.18em; color: var(--color-wax-red); text-transform: uppercase; }
    .steps { list-style: none; padding: 0; margin: 0; }
    .steps li { display: grid; grid-template-columns: 30px auto 1fr auto; gap: 0.6em; align-items: center; padding: 0.4em 0; border-top: 1px solid rgba(26, 32, 48, 0.15); font-size: 0.85rem; }
    .steps li.solved { opacity: 0.65; }
    .n { font-family: var(--font-mono); color: var(--color-ink-500); }
    .loc { font-family: var(--font-mono); color: var(--color-wax-red); }
    .clue { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-700); }
    .solve { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.3em 0.6em; background: transparent; border: 1px solid var(--color-ink-900); cursor: pointer; }
    .mark { color: var(--color-sage-deep); }
</style>
