<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Button from '../../components/ui/Button.svelte';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';

    let items = $state([]);
    let mine = $state(null);
    let loading = $state(true);
    let error = $state(null);
    let toggling = $state(false);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const [w, s] = await Promise.all([
                apiGet(`/worlds/${encodeURIComponent(worldId)}/wealth`),
                $user && !$user.isAnonymous
                    ? apiGet(`/worlds/${encodeURIComponent(worldId)}/stats`).catch(() => null)
                    : Promise.resolve(null)
            ]);
            items = w?.items || [];
            mine = s;
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function toggleHide() {
        if (!mine) return;
        toggling = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/stats`, {
                field: 'hideWealth',
                value: !mine.hideWealth
            });
            await load();
        } catch (e) {
            alert(`Toggle failed: ${e.message}`);
        } finally {
            toggling = false;
        }
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Wealth — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Strongbox Roll</div>
    <h1>Wealth</h1>
    <p class="lede">Coin counted in the open. Those who would not be seen may strike themselves from the roll.</p>
    <Flourish width={220} color="var(--color-ink-900)" />

    {#if mine}
        <section class="me">
            <WaxSeal glyph="coin" color="#b08d4a" size={56} />
            <div>
                <div class="me-amt">{mine.gold.toLocaleString()}</div>
                <div class="me-label">your gold · level {mine.level} · {mine.xp.toLocaleString()} XP · {mine.distance.toLocaleString()} tiles walked</div>
            </div>
            <Button variant="ghost" onclick={toggleHide} disabled={toggling}>
                {mine.hideWealth ? 'Reveal on roll' : 'Strike from roll'}
            </Button>
        </section>
    {/if}

    {#if loading}
        <p class="empty italic">Counting purses…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world.</p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else if !items.length}
        <p class="empty italic">No fortunes claimed yet.</p>
    {:else}
        <table>
            <thead>
                <tr><th>#</th><th>House</th><th class="num">Gold</th></tr>
            </thead>
            <tbody>
                {#each items as r, i}
                    <tr>
                        <td class="rank">{i + 1}</td>
                        <td class="name">{r.displayName}</td>
                        <td class="num"><Stamp kind="coin" size={11} /> {r.gold.toLocaleString()}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 900px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .me { display: flex; gap: 1.2em; align-items: center; background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1em 1.4em; margin: 1.5em 0; }
    .me-amt { font-family: var(--font-display); font-size: 2.2rem; color: var(--color-ink-900); }
    .me-label { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); font-size: 0.85rem; }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    table { width: 100%; border-collapse: collapse; margin-top: 0.8em; }
    th { text-align: left; font-family: var(--font-display); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.6em 0.4em; border-bottom: 1px solid var(--color-ink-900); }
    th.num, td.num { text-align: right; font-family: var(--font-mono); font-size: 0.9rem; display: table-cell; }
    td.num { display: table-cell; }
    td.num :global(svg) { vertical-align: text-bottom; margin-right: 0.3em; color: var(--color-aged-gold); }
    td { padding: 0.6em 0.4em; border-bottom: 1px solid rgba(26, 32, 48, 0.15); }
    td.rank { width: 40px; font-family: var(--font-mono); color: var(--color-ink-500); }
    td.name { font-family: var(--font-display); }
</style>
