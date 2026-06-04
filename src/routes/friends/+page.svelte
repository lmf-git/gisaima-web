<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import Flourish from '../../components/ui/Flourish.svelte';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import Button from '../../components/ui/Button.svelte';

    let friends = $state([]);          // [{ uid, displayName }]
    let incoming = $state([]);         // [{ from, displayName, createdAt }]
    let outgoing = $state([]);         // [{ to, displayName, createdAt }]
    let loading = $state(true);
    let error = $state(null);
    let busy = $state(false);

    // Player search
    let query = $state('');
    let results = $state([]);          // [{ uid, displayName }]
    let searching = $state(false);
    let searched = $state(false);
    let searchSeq = 0;

    const worldId = $derived($game.worldKey);
    const wid = $derived(encodeURIComponent($game.worldKey || ''));

    // Players already in a relationship — filtered out of search results.
    const friendUids = $derived(new Set(friends.map(f => f.uid)));
    const outgoingUids = $derived(new Set(outgoing.map(r => r.to)));
    const incomingUids = $derived(new Set(incoming.map(r => r.from)));
    const candidates = $derived(
        results.filter(p =>
            p.uid !== $user?.uid &&
            !friendUids.has(p.uid) &&
            !outgoingUids.has(p.uid) &&
            !incomingUids.has(p.uid)
        )
    );

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const [f, r] = await Promise.all([
                apiGet(`/worlds/${wid}/friends`),
                apiGet(`/worlds/${wid}/friends/requests`),
            ]);
            friends  = f?.friends || [];
            incoming = r?.incoming || [];
            outgoing = r?.outgoing || [];
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function search() {
        const term = query.trim();
        if (term.length < 2) { results = []; searched = false; return; }
        const seq = ++searchSeq;
        searching = true;
        try {
            const r = await apiGet(`/worlds/${wid}/players/search?q=${encodeURIComponent(term)}`);
            if (seq !== searchSeq) return; // a newer search superseded this one
            results = r?.players || [];
            searched = true;
        } catch (e) {
            if (seq === searchSeq) { results = []; searched = true; }
        } finally {
            if (seq === searchSeq) searching = false;
        }
    }

    let debounce;
    function onInput() {
        clearTimeout(debounce);
        debounce = setTimeout(search, 300);
    }

    async function act(fn) {
        if (busy) return;
        busy = true;
        try { await fn(); await load(); }
        catch (e) { alert(`Failed: ${e.message}`); }
        finally { busy = false; }
    }

    const sendRequest  = (toUid)   => act(() => apiPost(`/worlds/${wid}/friends/requests`, { toUid }));
    const accept       = (fromUid) => act(() => apiPost(`/worlds/${wid}/friends/requests/${encodeURIComponent(fromUid)}/accept`, {}));
    const decline      = (uid)     => act(() => apiPost(`/worlds/${wid}/friends/requests/${encodeURIComponent(uid)}/decline`, {}));
    const cancel       = (toUid)   => act(() => apiPost(`/worlds/${wid}/friends/requests/${encodeURIComponent(toUid)}/decline`, {}));
    const remove       = (uid)     => act(() => apiPost(`/worlds/${wid}/friends/${encodeURIComponent(uid)}/remove`, {}));

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Friends — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">Bonds of the realm</div>
    <h1>Friends</h1>
    <p class="lede">Friends may be granted access to your structures — to build, recruit, and store.</p>
    <Flourish extraClass="page-flourish" />

    {#if loading}
        <p class="empty italic">Reading the rolls…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else}
        {#if incoming.length}
            <section class="block">
                <div class="eyebrow">Requests to you</div>
                <ul class="list">
                    {#each incoming as r}
                        <li>
                            <WaxSeal label={(r.displayName || '?')[0]} color="#7a4b16" size={42} />
                            <div><div class="t-name">{r.displayName}</div></div>
                            <div class="actions">
                                <button class="ok" disabled={busy} onclick={() => accept(r.from)}>Accept</button>
                                <button class="ghost" disabled={busy} onclick={() => decline(r.from)}>Decline</button>
                            </div>
                        </li>
                    {/each}
                </ul>
            </section>
        {/if}

        <section class="block">
            <div class="eyebrow">Your friends</div>
            {#if !friends.length}
                <p class="empty italic">No friends yet.</p>
            {:else}
                <ul class="list">
                    {#each friends as f}
                        <li>
                            <WaxSeal label={(f.displayName || '?')[0]} color="#3f5a4e" size={42} />
                            <div><div class="t-name">{f.displayName}</div></div>
                            <button class="ghost" disabled={busy} onclick={() => remove(f.uid)}>Remove</button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>

        {#if outgoing.length}
            <section class="block">
                <div class="eyebrow">Pending (sent)</div>
                <ul class="list">
                    {#each outgoing as r}
                        <li>
                            <WaxSeal label={(r.displayName || '?')[0]} color="#555" size={42} />
                            <div><div class="t-name">{r.displayName}</div><div class="t-sub">Awaiting reply</div></div>
                            <button class="ghost" disabled={busy} onclick={() => cancel(r.to)}>Cancel</button>
                        </li>
                    {/each}
                </ul>
            </section>
        {/if}

        {#if $user && !$user.isAnonymous}
            <section class="block">
                <div class="eyebrow">Add a friend</div>
                <input
                    class="search"
                    type="search"
                    placeholder="Search players by name…"
                    bind:value={query}
                    oninput={onInput}
                />
                {#if query.trim().length < 2}
                    <p class="empty italic">Type a name to find players.</p>
                {:else if searching}
                    <p class="empty italic">Searching…</p>
                {:else if !candidates.length}
                    <p class="empty italic">{searched ? 'No players found.' : ''}</p>
                {:else}
                    <ul class="list">
                        {#each candidates as p}
                            <li>
                                <WaxSeal label={(p.displayName || '?')[0]} color="#16393f" size={42} />
                                <div><div class="t-name">{p.displayName}</div></div>
                                <button class="ok" disabled={busy} onclick={() => sendRequest(p.uid)}>Add</button>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </section>
        {/if}
    {/if}
</div>

<style>
    .page { position: relative; z-index: 2; width: 100%; max-width: 1100px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .block { margin: 2em 0; }
    .search { width: 100%; box-sizing: border-box; margin-top: 0.8em; padding: 0.7em 1em; font-family: var(--font-body); font-size: 1rem; color: var(--color-ink-900); background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.3); }
    .search:focus { outline: none; border-color: var(--color-ink-900); }
    @media (max-width: 600px) {
        .page { padding: 6em 1.2em 3em; }
        h1 { font-size: 1.9rem; }
        .list li { grid-template-columns: 40px 1fr; gap: 0.7em; }
        .actions { grid-column: 2; }
    }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .list { list-style: none; padding: 0; margin: 0.8em 0 0; display: grid; gap: 0.7em; }
    .list li { display: grid; grid-template-columns: 50px 1fr auto; gap: 1em; align-items: center; background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.2); padding: 0.85em 1.1em; }
    .t-name { font-family: var(--font-display); font-size: 1.05rem; letter-spacing: 0.04em; }
    .t-sub { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); font-size: 0.85rem; }
    .actions { display: inline-flex; gap: 0.5em; }
    .ok, .ghost { padding: 0.5em 1em; font-family: var(--font-display); font-size: 0.75em; letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; }
    .ok { background: var(--color-ink-900); color: var(--color-parchment-100); border: 1px solid var(--color-ink-900); }
    .ok:hover { background: var(--color-ink-700); }
    .ghost { background: transparent; color: var(--color-ink-900); border: 1px solid var(--color-ink-900); }
    .ghost:hover { background: var(--color-parchment-200); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
