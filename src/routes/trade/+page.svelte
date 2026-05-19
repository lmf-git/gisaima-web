<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Button from '../../components/ui/Button.svelte';

    let tab = $state('offers');
    let offers = $state([]);
    let mine = $state([]);
    let loading = $state(true);
    let error = $state(null);

    let newOffer = $state({ give: 'WHEAT', giveQty: 10, want: 'WOOD', wantQty: 10, risk: 'safe' });
    let posting = $state(false);

    // Currency conversion — list of issued currencies in this world, and
    // a selected one to show the converted equivalent price of an offer.
    let currencies = $state([]);
    let selectedCurrencyId = $state('');

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const [tr, cu] = await Promise.all([
                apiGet(`/worlds/${encodeURIComponent(worldId)}/trade/offers`),
                apiGet(`/worlds/${encodeURIComponent(worldId)}/currencies`).catch(() => null)
            ]);
            offers = tr?.items || [];
            mine = tr?.mine || [];
            currencies = cu?.items || [];
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    const selectedCurrency = $derived(
        currencies.find((c) => String(c._id) === selectedCurrencyId) || null
    );
    function convert(qty, key) {
        if (!selectedCurrency) return null;
        if (key !== 'GOLD' && key !== 'COIN') return null;
        return Math.round(qty * (selectedCurrency.exchange || 1));
    }

    async function postOffer(e) {
        e.preventDefault();
        posting = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/trade/offers`, newOffer);
            await load();
        } catch (e) {
            alert(`Post failed: ${e.message}`);
        } finally {
            posting = false;
        }
    }

    async function accept(id) {
        const risk = window.confirm(
            'Hire a guarded caravan? (cancel = run the cheaper but riskier route — 10% chance of ambush on arrival)'
        ) ? 'safe' : 'caravan';
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/trade/offers/${id}/accept`, { risk });
            await load();
        } catch (e) {
            alert(`Trade failed: ${e.message}`);
        }
    }

    async function cancel(id) {
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/trade/offers/${id}/cancel`, {});
            await load();
        } catch (e) {
            alert(`Cancel failed: ${e.message}`);
        }
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });

    const list = $derived(tab === 'offers' ? offers : mine);
</script>

<svelte:head><title>The Market — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Marketplace</div>
    <h1>The Market</h1>
    <p class="lede">A coin moves further than a sword. Trade is recorded in the same ledger as battle.</p>
    <Flourish extraClass="page-flourish" />

    <nav class="tabs">
        <button class:active={tab === 'offers'} onclick={() => (tab = 'offers')}>All Offers</button>
        <button class:active={tab === 'mine'} onclick={() => (tab = 'mine')}>My Offers</button>
        <button class:active={tab === 'new'} onclick={() => (tab = 'new')}>Post New</button>
        {#if currencies.length}
            <span class="cur-pick">
                <span class="eyebrow">SHOW IN</span>
                <select bind:value={selectedCurrencyId}>
                    <option value="">gold</option>
                    {#each currencies as c}
                        <option value={String(c._id)}>{c.symbol} {c.name}</option>
                    {/each}
                </select>
            </span>
        {/if}
    </nav>

    {#if tab === 'new'}
        <form class="new-form" onsubmit={postOffer}>
            <div class="row">
                <label>
                    <span>Give</span>
                    <input bind:value={newOffer.give} required placeholder="resource key" />
                </label>
                <label>
                    <span>Qty</span>
                    <input type="number" min="1" bind:value={newOffer.giveQty} required />
                </label>
            </div>
            <div class="for">⇆</div>
            <div class="row">
                <label>
                    <span>Want</span>
                    <input bind:value={newOffer.want} required placeholder="resource key" />
                </label>
                <label>
                    <span>Qty</span>
                    <input type="number" min="1" bind:value={newOffer.wantQty} required />
                </label>
            </div>
            <Button variant="primary" type="submit" disabled={posting}>
                {posting ? 'Inking…' : 'Post Offer'}
            </Button>
        </form>
    {:else if loading}
        <p class="empty italic">Reading the merchants' book…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else if list.length === 0}
        <p class="empty italic">The market is quiet today.</p>
    {:else}
        <ul class="offer-list">
            {#each list as o}
                <li>
                    <div class="terms">
                        <div class="side">
                            <Stamp kind={(o.giveKind || 'coin')} size={20} />
                            <div>
                                <div class="qty">
                                    {o.giveQty}
                                    {#if convert(o.giveQty, o.give) !== null}
                                        <span class="alt">= {selectedCurrency.symbol}{convert(o.giveQty, o.give)}</span>
                                    {/if}
                                </div>
                                <div class="key">{o.give?.replace(/_/g, ' ').toLowerCase()}</div>
                            </div>
                        </div>
                        <div class="arrow">⇆</div>
                        <div class="side">
                            <Stamp kind={(o.wantKind || 'coin')} size={20} />
                            <div>
                                <div class="qty">
                                    {o.wantQty}
                                    {#if convert(o.wantQty, o.want) !== null}
                                        <span class="alt">= {selectedCurrency.symbol}{convert(o.wantQty, o.want)}</span>
                                    {/if}
                                </div>
                                <div class="key">{o.want?.replace(/_/g, ' ').toLowerCase()}</div>
                            </div>
                        </div>
                    </div>
                    <div class="who">posted by <em>{o.postedByName}</em></div>
                    <div class="actions">
                        {#if tab === 'mine' || o.postedBy === $user?.uid}
                            <button class="link danger" onclick={() => cancel(o._id || o.id)}>Cancel</button>
                        {:else}
                            <Button variant="soft" onclick={() => accept(o._id || o.id)}>Accept</Button>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}

    <p class="note">Trade backed by stubbed endpoints under /worlds/:id/trade/offers. Inventory transfers / caravan risk / currency creation from the roadmap are not yet wired into the tick system.</p>
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1000px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .tabs { display: flex; gap: 0; margin: 2em 0 1em; border-bottom: 1px solid var(--color-ink-900); }
    .tabs button { font-family: var(--font-display); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.8em 1.4em; background: transparent; border: none; color: var(--color-ink-500); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .tabs button.active { color: var(--color-wax-red); border-bottom-color: var(--color-wax-red); }
    .new-form { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.5em; display: grid; gap: 0.8em; max-width: 520px; }
    .new-form .row { display: grid; grid-template-columns: 2fr 1fr; gap: 0.6em; }
    .new-form .for { text-align: center; font-family: var(--font-display); font-size: 1.4rem; color: var(--color-ink-500); }
    .new-form label { display: grid; gap: 0.2em; }
    .new-form label span { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--color-ink-700); }
    .new-form input { padding: 0.5em 0.7em; background: var(--color-parchment-200); border: 1px solid var(--color-parchment-shadow); font-family: var(--font-mono); }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .offer-list { list-style: none; padding: 0; margin: 1em 0 0; display: grid; gap: 0.8em; }
    .offer-list li { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 1em; background: var(--color-parchment-100); border: 1px solid rgba(26,32,48,.2); padding: 1em 1.2em; }
    .terms { display: flex; align-items: center; gap: 1em; }
    .side { display: flex; align-items: center; gap: 0.5em; }
    .qty { font-family: var(--font-display); font-size: 1.1rem; color: var(--color-ink-900); display: flex; align-items: baseline; gap: 0.4em; }
    .qty .alt { font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-wax-red); }
    .cur-pick { margin-left: auto; display: inline-flex; align-items: center; gap: 0.5em; padding: 0.4em 0; }
    .cur-pick .eyebrow { font-family: var(--font-display); font-size: 0.62rem; letter-spacing: 0.22em; color: var(--color-ink-500); }
    .cur-pick select { padding: 0.3em 0.5em; font-family: var(--font-mono); background: var(--color-parchment-200); border: 1px solid var(--color-parchment-shadow); }
    .key { font-family: var(--font-editorial); font-style: italic; font-size: 0.78rem; color: var(--color-ink-500); }
    .arrow { font-family: var(--font-display); font-size: 1.2rem; color: var(--color-ink-300); }
    .who { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); font-size: 0.85rem; }
    .who em { color: var(--color-ink-700); }
    .actions { display: flex; gap: 0.6em; }
    .link { background: transparent; border: none; cursor: pointer; font-family: var(--font-display); font-size: 0.75rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.4em 0.8em; }
    .link.danger { color: var(--color-wax-red); }
    .note { font-family: var(--font-editorial); font-style: italic; font-size: 0.85rem; color: var(--color-ink-500); margin-top: 2em; }
</style>
