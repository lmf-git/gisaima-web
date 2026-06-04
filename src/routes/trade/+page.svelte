<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import { entities } from '$lib/stores/map.js';
    import { ITEMS } from 'gisaima-shared/definitions/ITEMS.js';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Button from '../../components/ui/Button.svelte';
    import SearchDropdown from '../../components/ui/SearchDropdown.svelte';
    import RoutePreview from '../../components/ui/RoutePreview.svelte';

    let tab = $state('offers');
    let offers = $state([]);
    let mine = $state([]);
    let loading = $state(true);
    let error = $state(null);

    // Trade ships from one of the player's own structures, so the "give" side is
    // limited to whatever that structure actually holds.
    let myStructures = $state([]);
    let originKey = $state(null); // "x,y" of the chosen origin structure

    let newOffer = $state({ give: null, giveQty: 10, want: 'WOOD', wantQty: 10, risk: 'safe' });
    let posting = $state(false);

    // Item label lookup for the "want" side (any tradeable resource).
    const itemName = (code) => ITEMS[code]?.name || code;
    const allItemOptions = Object.keys(ITEMS)
        .filter((code) => !code.startsWith('_'))
        .map((code) => ({ value: code, label: itemName(code), sub: ITEMS[code]?.type }))
        .sort((a, b) => a.label.localeCompare(b.label));

    // Structures the player can ship from, as dropdown options.
    const structureOptions = $derived(
        myStructures.map((s) => ({
            value: `${s.x},${s.y}`,
            label: s.name || (s.type ? s.type.replace(/_/g, ' ') : 'Structure'),
            sub: `${s.x}, ${s.y}`,
        }))
    );

    const originStructure = $derived(
        myStructures.find((s) => `${s.x},${s.y}` === originKey) || null
    );

    // Only items actually stored at the origin structure can be offered.
    const giveOptions = $derived.by(() => {
        const items = originStructure?.items || {};
        return Object.entries(items)
            .filter(([code, qty]) => !code.startsWith('_') && Number(qty) > 0)
            .map(([code, qty]) => ({ value: code, label: itemName(code), qty: Number(qty) }))
            .sort((a, b) => b.qty - a.qty);
    });

    const giveAvailable = $derived(
        Number(originStructure?.items?.[newOffer.give] || 0)
    );

    // Keep the offered item valid for the chosen structure, and clamp quantity to
    // what's on hand.
    $effect(() => {
        if (newOffer.give && !giveOptions.some((o) => o.value === newOffer.give)) {
            newOffer.give = null;
        }
        if (giveAvailable && newOffer.giveQty > giveAvailable) {
            newOffer.giveQty = giveAvailable;
        }
    });

    // Currency conversion — list of issued currencies in this world, and
    // a selected one to show the converted equivalent price of an offer.
    let currencies = $state([]);
    let selectedCurrencyId = $state('');

    const worldId = $derived($game.worldKey);

    // ── Trade routes (structure → structure) ──────────────────────────────
    let routes = $state([]);
    let routeOrigin = $state(null);   // "x,y" of one of my structures
    let routeDest = $state(null);     // "x,y" of any structure on the map
    let routeManifest = $state({});   // { CODE: qty } to ship
    let routeAddItem = $state(null);  // transient: item being added to manifest
    let routeAutoship = $state(false);
    let creatingRoute = $state(false);

    const routeOriginStruct = $derived(
        myStructures.find((s) => `${s.x},${s.y}` === routeOrigin) || null
    );

    // Does a structure (by "x,y") have a harbour? Own structures carry the flag
    // from /holdings; for others, infer from their buildings on the map.
    const clientHasHarbour = (s) => {
        const b = s?.buildings || {};
        return Object.keys(b).some((k) => /harbou?r|dock|port/i.test(k));
    };
    function structHarbour(key) {
        const own = myStructures.find((s) => `${s.x},${s.y}` === key);
        if (own) return !!own.harbour;
        return clientHasHarbour($entities?.structure?.[key]);
    }

    // Naval only when BOTH ends are ports; otherwise an overland caravan.
    const routeMode = $derived(
        routeOriginStruct?.harbour && routeDest && structHarbour(routeDest) ? 'naval' : 'land'
    );
    // A shipment must be crewed by a spare garrison unit at the origin.
    const originCrew = $derived(Number(routeOriginStruct?.crewUnits || 0));

    // Destinations: any structure currently visible on the map (excluding origin).
    const destOptions = $derived.by(() => {
        const byKey = new Map();
        // Your own structures (intra-realm logistics)…
        for (const s of myStructures) {
            const key = `${s.x},${s.y}`;
            if (key === routeOrigin) continue;
            byKey.set(key, { value: key, label: s.name || (s.type ? s.type.replace(/_/g, ' ') : 'Structure'), sub: `${s.x}, ${s.y}` });
        }
        // …plus any structure currently visible on the map.
        for (const [key, s] of Object.entries($entities?.structure || {})) {
            if (key === routeOrigin || byKey.has(key)) continue;
            const [x, y] = key.split(',').map(Number);
            byKey.set(key, { value: key, label: s?.name || (s?.type ? s.type.replace(/_/g, ' ') : 'Structure'), sub: `${x}, ${y}` });
        }
        return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
    });

    // Items at the origin structure not already on the manifest.
    const routeItemOptions = $derived.by(() => {
        const items = routeOriginStruct?.items || {};
        return Object.entries(items)
            .filter(([c, q]) => !c.startsWith('_') && Number(q) > 0 && !(c in routeManifest))
            .map(([c, q]) => ({ value: c, label: itemName(c), qty: Number(q) }))
            .sort((a, b) => b.qty - a.qty);
    });

    const routeAvail = (code) => Number(routeOriginStruct?.items?.[code] || 0);
    const manifestEntries = $derived(Object.entries(routeManifest));

    function addManifestItem(code) {
        if (!code) return;
        routeManifest = { ...routeManifest, [code]: 1 };
        routeAddItem = null;
    }
    function removeManifestItem(code) {
        const m = { ...routeManifest };
        delete m[code];
        routeManifest = m;
    }

    // When the "add item" dropdown picks something, fold it into the manifest.
    $effect(() => {
        if (routeAddItem) addManifestItem(routeAddItem);
    });

    const routeFromXY = $derived(routeOrigin ? routeOrigin.split(',').map(Number) : null);
    const routeToXY = $derived(routeDest ? routeDest.split(',').map(Number) : null);

    // Drop manifest items that aren't valid for the chosen origin, and clamp qty.
    $effect(() => {
        let changed = false;
        const m = { ...routeManifest };
        for (const code of Object.keys(m)) {
            const avail = routeAvail(code);
            if (avail <= 0) { delete m[code]; changed = true; }
            else if (m[code] > avail) { m[code] = avail; changed = true; }
        }
        if (changed) routeManifest = m;
    });

    async function loadRoutes() {
        if (!worldId) return;
        try {
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/trade/routes`);
            routes = r?.items || [];
        } catch { /* ignore */ }
    }

    async function createRoute() {
        if (!routeOriginStruct) { alert('Choose a structure to ship from.'); return; }
        if (!routeToXY) { alert('Choose a destination structure.'); return; }
        if (manifestEntries.length === 0) { alert('Add at least one item to ship.'); return; }
        creatingRoute = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/trade/routes`, {
                fromX: routeOriginStruct.x, fromY: routeOriginStruct.y,
                toX: routeToXY[0], toY: routeToXY[1],
                items: routeManifest,
                autoship: routeAutoship,
                template: routeAutoship,
            });
            routeManifest = {};
            routeAutoship = false;
            await Promise.all([load(), loadRoutes()]);
        } catch (e) {
            alert(`Route failed: ${e.message}`);
        } finally {
            creatingRoute = false;
        }
    }

    async function routeAction(id, action, body) {
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/trade/routes/${id}/${action}`, body || {});
            await Promise.all([load(), loadRoutes()]);
        } catch (e) {
            alert(`Failed: ${e.message}`);
        }
    }

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const [tr, cu, hold] = await Promise.all([
                apiGet(`/worlds/${encodeURIComponent(worldId)}/trade/offers`),
                apiGet(`/worlds/${encodeURIComponent(worldId)}/currencies`).catch(() => null),
                apiGet(`/worlds/${encodeURIComponent(worldId)}/holdings`).catch(() => null)
            ]);
            offers = tr?.items || [];
            mine = tr?.mine || [];
            currencies = cu?.items || [];
            myStructures = Array.isArray(hold?.structures) ? hold.structures : [];
            if (myStructures.length) {
                const first = `${myStructures[0].x},${myStructures[0].y}`;
                if (!originKey) originKey = first;
                if (!routeOrigin) routeOrigin = first;
            }
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
        if (!originStructure) { alert('Choose a structure to ship from.'); return; }
        if (!newOffer.give) { alert('Choose an item that structure holds.'); return; }
        if (newOffer.giveQty > giveAvailable) { alert('Not enough of that item at the structure.'); return; }
        posting = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/trade/offers`, {
                ...newOffer,
                originX: originStructure.x,
                originY: originStructure.y,
            });
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

    onMount(() => { load(); loadRoutes(); });
    $effect(() => { if (worldId) { load(); loadRoutes(); } });

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
        <button class:active={tab === 'routes'} onclick={() => (tab = 'routes')}>Routes</button>
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
        {#if myStructures.length === 0}
            <p class="empty italic">You hold no structures to trade from. Build or capture one first.</p>
        {:else}
            <form class="new-form" onsubmit={postOffer}>
                <label class="full">
                    <span>Ship from structure</span>
                    <SearchDropdown options={structureOptions} bind:value={originKey} placeholder="Choose a structure…" />
                </label>

                <div class="row">
                    <label>
                        <span>Give (from this structure)</span>
                        <SearchDropdown
                            options={giveOptions}
                            bind:value={newOffer.give}
                            placeholder={giveOptions.length ? 'Search items…' : 'No items here'}
                            disabled={giveOptions.length === 0}
                            emptyText="This structure holds nothing"
                        />
                    </label>
                    <label>
                        <span>Qty {giveAvailable ? `(max ${giveAvailable})` : ''}</span>
                        <input type="number" min="1" max={giveAvailable || 1} bind:value={newOffer.giveQty} required />
                    </label>
                </div>

                <div class="for">⇆</div>

                <div class="row">
                    <label>
                        <span>Want</span>
                        <SearchDropdown options={allItemOptions} bind:value={newOffer.want} placeholder="Search items…" />
                    </label>
                    <label>
                        <span>Qty</span>
                        <input type="number" min="1" bind:value={newOffer.wantQty} required />
                    </label>
                </div>

                <Button variant="primary" type="submit" disabled={posting || !newOffer.give}>
                    {posting ? 'Inking…' : 'Post Offer'}
                </Button>
            </form>
        {/if}
    {:else if tab === 'routes'}
        {#if myStructures.length === 0}
            <p class="empty italic">You hold no structures to ship from. Build or capture one first.</p>
        {:else}
            <div class="route-builder">
                <div class="rb-form">
                    <label class="full">
                        <span>From (your structure)</span>
                        <SearchDropdown options={structureOptions} bind:value={routeOrigin} placeholder="Origin structure…" />
                    </label>
                    <label class="full">
                        <span>To (any structure)</span>
                        <SearchDropdown options={destOptions} bind:value={routeDest} placeholder={destOptions.length ? 'Destination structure…' : 'No structures in view'} disabled={destOptions.length === 0} />
                    </label>

                    <div class="mode-line">
                        <span class="mode-badge" class:naval={routeMode === 'naval'}>
                            <Stamp kind="compass" size={12} />
                            {routeMode === 'naval' ? 'Naval — sea lane checked on dispatch' : 'Land caravan'}
                        </span>
                        <span class="crew-badge" class:lack={originCrew === 0}>
                            {originCrew === 0 ? 'No crew available' : `Crew: 1 unit (of ${originCrew})`}
                        </span>
                    </div>

                    <div class="manifest">
                        <span class="mf-title">Cargo (locked from origin on dispatch)</span>
                        {#each manifestEntries as [code, qty]}
                            <div class="mf-row">
                                <span class="mf-name">{itemName(code)}</span>
                                <input
                                    type="number" min="1" max={routeAvail(code)}
                                    value={qty}
                                    oninput={(e) => (routeManifest = { ...routeManifest, [code]: Math.max(1, Math.min(routeAvail(code), Number(e.target.value) || 1)) })}
                                />
                                <span class="mf-avail">/ {routeAvail(code)}</span>
                                <button class="mf-del" type="button" onclick={() => removeManifestItem(code)} aria-label="Remove">✕</button>
                            </div>
                        {/each}
                        {#if routeItemOptions.length}
                            <SearchDropdown
                                options={routeItemOptions}
                                bind:value={routeAddItem}
                                placeholder="Add an item to ship…"
                                emptyText="Nothing left to add"
                            />
                        {:else if manifestEntries.length === 0}
                            <p class="mf-empty italic">This structure holds nothing to ship.</p>
                        {/if}
                    </div>

                    <label class="autoship">
                        <input type="checkbox" bind:checked={routeAutoship} />
                        <span>Save as auto-shipping route (dispatches every tick while stocked)</span>
                    </label>

                    <Button variant="primary" onclick={createRoute} disabled={creatingRoute || manifestEntries.length === 0 || !routeDest || originCrew === 0}>
                        {creatingRoute ? 'Dispatching…' : (routeAutoship ? 'Save & Dispatch Route' : 'Dispatch Shipment')}
                    </Button>
                    {#if originCrew === 0}
                        <p class="crew-warn italic">This structure has no spare units to crew a shipment. Recruit units there first.</p>
                    {/if}
                </div>

                <div class="rb-preview">
                    <RoutePreview from={routeFromXY} to={routeToXY} mode={routeMode} />
                </div>
            </div>

            <h2 class="sub">Your Routes</h2>
            {#if routes.length === 0}
                <p class="empty italic">No routes dispatched yet.</p>
            {:else}
                <ul class="route-list">
                    {#each routes as r}
                        <li class:archived={r.status === 'archived'}>
                            <div class="rl-main">
                                <span class="rl-mode" class:naval={r.mode === 'naval'}>{r.mode === 'naval' ? 'NAVAL' : 'LAND'}</span>
                                <span class="rl-path">({r.fromX},{r.fromY}) → ({r.toX},{r.toY})</span>
                                <span class="rl-cargo">{Object.entries(r.items || {}).map(([c, q]) => `${q} ${itemName(c)}`).join(', ')}</span>
                            </div>
                            <div class="rl-meta">
                                {#if r.autoship}<span class="tag auto">AUTO</span>{/if}
                                <span class="runs">×{r.runCount || 1}</span>
                            </div>
                            <div class="rl-actions">
                                {#if r.status !== 'archived'}
                                    <button class="link" onclick={() => routeAction(r._id, 'run')}>Run</button>
                                    <button class="link" onclick={() => routeAction(r._id, 'autoship', { on: !r.autoship })}>
                                        {r.autoship ? 'Stop auto' : 'Auto'}
                                    </button>
                                    <button class="link danger" onclick={() => routeAction(r._id, 'delete')}>Archive</button>
                                {/if}
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        {/if}
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
    .page { position: relative; z-index: 2; width: 100%; max-width: 1100px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    @media (max-width: 600px) {
        .page { padding: 6em 1.2em 3em; }
        h1 { font-size: 1.9rem; }
        .new-form .row { grid-template-columns: 1fr; }
    }
    .tabs { display: flex; gap: 0; margin: 2em 0 1em; border-bottom: 1px solid var(--color-ink-900); }
    .tabs button { font-family: var(--font-display); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.8em 1.4em; background: transparent; border: none; color: var(--color-ink-500); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .tabs button.active { color: var(--color-wax-red); border-bottom-color: var(--color-wax-red); }
    .new-form { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.5em; display: grid; gap: 0.8em; max-width: 520px; }
    .new-form .row { display: grid; grid-template-columns: 2fr 1fr; gap: 0.6em; }
    .new-form .for { text-align: center; font-family: var(--font-display); font-size: 1.4rem; color: var(--color-ink-500); }
    .new-form label { display: grid; gap: 0.2em; }
    .new-form label.full { grid-column: 1 / -1; }
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

    /* ── Route builder ── */
    .route-builder { display: grid; grid-template-columns: 1fr 240px; gap: 1.5em; align-items: start; }
    .rb-form { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.5em; display: grid; gap: 0.8em; }
    .rb-form label { display: grid; gap: 0.25em; }
    .rb-form label span { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-ink-700); }
    .rb-preview { position: sticky; top: 7em; }
    .mode-line { margin: 0.2em 0; display: flex; flex-wrap: wrap; gap: 0.5em; align-items: center; }
    .mode-badge { display: inline-flex; align-items: center; gap: 0.4em; font-family: var(--font-mono); font-size: 0.72rem; padding: 0.25em 0.6em; background: var(--color-parchment-200); border: 1px solid var(--color-parchment-shadow); color: var(--color-ink-700); }
    .mode-badge.naval { color: #2c5a85; border-color: #aac4dc; background: #e7f0f7; }
    .crew-badge { font-family: var(--font-mono); font-size: 0.7rem; padding: 0.25em 0.6em; background: var(--color-parchment-200); border: 1px solid var(--color-parchment-shadow); color: var(--color-ink-700); }
    .crew-badge.lack { color: var(--color-wax-red); border-color: var(--color-wax-red); background: rgba(91,26,31,0.06); }
    .crew-warn { margin: 0; font-size: 0.78rem; color: var(--color-wax-red); }
    .manifest { display: grid; gap: 0.4em; padding: 0.6em; background: var(--color-parchment-200); border: 1px solid var(--color-parchment-shadow); }
    .mf-title { font-family: var(--font-display); font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-ink-500); }
    .mf-row { display: grid; grid-template-columns: 1fr 70px auto auto; gap: 0.5em; align-items: center; }
    .mf-name { font-family: var(--font-mono); font-size: 0.82rem; color: var(--color-ink-900); }
    .mf-row input { padding: 0.3em 0.4em; font-family: var(--font-mono); background: var(--color-parchment-100); border: 1px solid var(--color-parchment-shadow); width: 100%; box-sizing: border-box; }
    .mf-avail { font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-ink-500); }
    .mf-del { background: none; border: none; cursor: pointer; color: var(--color-wax-red); font-size: 0.8rem; }
    .mf-empty { margin: 0; font-size: 0.8rem; color: var(--color-ink-500); }
    .autoship { display: flex !important; flex-direction: row !important; align-items: center; gap: 0.5em; font-family: var(--font-body); font-size: 0.82rem; color: var(--color-ink-700); }
    .autoship input { width: auto; }

    .sub { font-family: var(--font-display); font-size: 1.1rem; margin: 2em 0 0.5em; letter-spacing: 0.04em; }
    .route-list { list-style: none; padding: 0; margin: 0.5em 0 0; display: grid; gap: 0.6em; }
    .route-list li { display: grid; grid-template-columns: 1fr auto auto; gap: 1em; align-items: center; background: var(--color-parchment-100); border: 1px solid rgba(26,32,48,.2); padding: 0.7em 1em; }
    .route-list li.archived { opacity: 0.5; }
    .rl-main { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.6em; min-width: 0; }
    .rl-mode { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; padding: 0.1em 0.4em; background: var(--color-parchment-200); color: var(--color-ink-700); border: 1px solid var(--color-parchment-shadow); }
    .rl-mode.naval { color: #2c5a85; border-color: #aac4dc; background: #e7f0f7; }
    .rl-path { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-ink-900); }
    .rl-cargo { font-family: var(--font-editorial); font-style: italic; font-size: 0.8rem; color: var(--color-ink-500); }
    .rl-meta { display: inline-flex; align-items: center; gap: 0.5em; }
    .tag.auto { font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.1em; padding: 0.1em 0.4em; background: var(--color-wax-red); color: var(--color-parchment-100); }
    .runs { font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-ink-500); }
    .rl-actions { display: inline-flex; gap: 0.3em; }

    @media (max-width: 700px) {
        .route-builder { grid-template-columns: 1fr; }
        .rb-preview { position: static; }
        .route-list li { grid-template-columns: 1fr; gap: 0.4em; }
    }
</style>
