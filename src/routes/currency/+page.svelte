<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Button from '../../components/ui/Button.svelte';

    let items = $state([]);
    let loading = $state(true);
    let error = $state(null);
    let form = $state({ name: '', symbol: '', exchange: 1.0, structureKey: '' });
    let posting = $state(false);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/currencies`);
            items = r?.items || [];
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function submit(e) {
        e.preventDefault();
        posting = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/currencies`, {
                name: form.name,
                symbol: form.symbol,
                exchange: Number(form.exchange),
                structureKey: form.structureKey || null
            });
            form = { name: '', symbol: '', exchange: 1.0, structureKey: '' };
            await load();
        } catch (e) {
            alert(`Mint failed: ${e.message}`);
        } finally {
            posting = false;
        }
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Currencies — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Mint</div>
    <h1>Currencies</h1>
    <p class="lede">Issue a coin in your own name. Set its rate against gold. Make it the law of a city.</p>
    <Flourish extraClass="page-flourish" />

    {#if $user && !$user.isAnonymous}
        <form class="form" onsubmit={submit}>
            <div class="eyebrow">Mint new currency</div>
            <div class="row">
                <label>
                    <span>Name</span>
                    <input bind:value={form.name} required placeholder="e.g. Brennec Crown" />
                </label>
                <label>
                    <span>Symbol</span>
                    <input bind:value={form.symbol} required placeholder="₿ Br ₸" maxlength="4" />
                </label>
            </div>
            <div class="row">
                <label>
                    <span>Exchange (per 1 gold)</span>
                    <input type="number" step="0.01" min="0.01" bind:value={form.exchange} required />
                </label>
                <label>
                    <span>Structure key (x,y) — optional</span>
                    <input bind:value={form.structureKey} placeholder="-18,-7" />
                </label>
            </div>
            <Button variant="primary" type="submit" disabled={posting}>
                {posting ? 'Stamping…' : 'Mint'}
            </Button>
        </form>
    {/if}

    {#if loading}
        <p class="empty italic">Counting the strongboxes…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world.</p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else if !items.length}
        <p class="empty italic">No mints opened.</p>
    {:else}
        <ul class="list">
            {#each items as c}
                <li>
                    <span class="symbol">{c.symbol}</span>
                    <div>
                        <div class="name">{c.name}</div>
                        <div class="meta">issued by {c.issuerUid.slice(0, 8)}{c.structureKey ? ` · official @ ${c.structureKey}` : ''}</div>
                    </div>
                    <span class="rate"><Stamp kind="coin" size={14} /> {c.exchange.toFixed(2)} per gold</span>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 900px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .form { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.5em; display: grid; gap: 0.8em; max-width: 600px; margin: 1.5em 0; }
    .form label { display: grid; gap: 0.2em; }
    .form label span { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--color-ink-700); }
    .form input { padding: 0.5em 0.7em; background: var(--color-parchment-200); border: 1px solid var(--color-parchment-shadow); font-family: var(--font-body); }
    .form .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6em; }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .list { list-style: none; padding: 0; margin: 1em 0 0; display: grid; gap: 0.6em; }
    .list li { display: grid; grid-template-columns: 60px 1fr auto; gap: 1em; align-items: center; background: var(--color-parchment-100); border: 1px solid rgba(26,32,48,.2); padding: 0.9em 1.1em; }
    .symbol { font-family: var(--font-display); font-size: 1.8rem; color: var(--color-wax-red); text-align: center; }
    .name { font-family: var(--font-display); font-size: 1.05rem; letter-spacing: 0.04em; }
    .meta { font-family: var(--font-editorial); font-style: italic; font-size: 0.78rem; color: var(--color-ink-500); }
    .rate { font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-700); display: inline-flex; align-items: center; gap: 0.4em; }
</style>
