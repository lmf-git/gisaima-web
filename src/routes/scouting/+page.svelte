<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { apiGet } from '$lib/api.js';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';

    let data = $state(null);
    let loading = $state(true);
    let error = $state(null);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            data = await apiGet(`/worlds/${encodeURIComponent(worldId)}/scouting`);
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Scouting & Exclusion — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">By Spyglass & Rumour</div>
    <h1>Scouting</h1>
    <p class="lede">Distance dulls the eye. Bad deeds raise a beacon — visible all the further for it.</p>
    <Flourish extraClass="page-flourish" />

    <section class="block">
        <div class="eyebrow">Visibility tiers</div>
        <ol class="tiers">
            {#each (data?.tiers || []) as t, i}
                <li>
                    <span class="dist">≤ {t.maxDistance}</span>
                    <span class="name">{t.tier}</span>
                    <span class="desc">{t.desc}</span>
                </li>
            {/each}
        </ol>
    </section>

    <hr class="rule-deco" />

    <section class="block">
        <div class="eyebrow">Spawn exclusion zones</div>
        {#if loading}
            <p class="empty italic">Marking the rim…</p>
        {:else if !worldId}
            <p class="empty italic">Select a world.</p>
        {:else if error}
            <p class="empty err">{error}</p>
        {:else if !data?.spawns?.length}
            <p class="empty italic">No spawns declared.</p>
        {:else}
            <ul class="spawn-list">
                {#each data.spawns as s}
                    <li>
                        <Stamp kind="banner" size={18} />
                        <div>
                            <div class="s-name">{s.name || s.kind}</div>
                            <div class="s-meta">({s.x}, {s.y}) · {s.radius}-tile zone · {s.kind}</div>
                        </div>
                    </li>
                {/each}
            </ul>
            <p class="hint">Inside an exclusion zone, kills incur a heavy morality penalty and structures cannot be built (except by the spawn owner). Movement is permitted.</p>
        {/if}
    </section>
</div>

<style>
    .page { position: relative; z-index: 2; width: 100%; max-width: 1100px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .block { margin: 2.5em 0; }
    .tiers { list-style: none; padding: 0; margin: 0.8em 0 0; }
    .tiers li { display: grid; grid-template-columns: 60px 120px 1fr; gap: 0.8em; padding: 0.7em 0; border-top: 1px solid rgba(26, 32, 48, 0.15); }
    .dist { font-family: var(--font-mono); color: var(--color-wax-red); text-align: right; }
    .name { font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .desc { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-700); }
    .spawn-list { list-style: none; padding: 0; margin: 0.6em 0 0; }
    .spawn-list li { display: grid; grid-template-columns: 26px 1fr; gap: 0.7em; padding: 0.6em 0; border-top: 1px solid rgba(26, 32, 48, 0.15); color: var(--color-ink-700); }
    .s-name { font-family: var(--font-display); font-size: 0.95rem; letter-spacing: 0.04em; }
    .s-meta { font-family: var(--font-editorial); font-style: italic; font-size: 0.82rem; color: var(--color-ink-500); }
    .hint { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 1em 0 0; }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .rule-deco { border: none; margin: 2em 0; }
</style>
