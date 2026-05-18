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
    let loading = $state(true);
    let error = $state(null);
    let propose = $state({ captiveUid: '', amount: 500, note: '' });
    let posting = $state(false);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/ransoms`);
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
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/ransoms`, {
                captiveUid: propose.captiveUid.trim(),
                amount: Number(propose.amount),
                note: propose.note
            });
            propose = { captiveUid: '', amount: 500, note: '' };
            await load();
        } catch (e) {
            alert(`Propose failed: ${e.message}`);
        } finally {
            posting = false;
        }
    }

    async function respond(id, action, counter) {
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/ransoms/${id}`, { action, counter });
            await load();
        } catch (e) {
            alert(`Response failed: ${e.message}`);
        }
    }

    function role(r) {
        if (!$user) return '';
        if (r.captorUid === $user.uid) return 'captor';
        if (r.captiveUid === $user.uid) return 'captive';
        return '';
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Ransoms — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Captive's Coin</div>
    <h1>Ransoms</h1>
    <p class="lede">Better gold than blood. Or so the captives say.</p>
    <Flourish width={220} color="var(--color-ink-900)" />

    {#if $user && !$user.isAnonymous}
        <form class="form" onsubmit={submit}>
            <div class="eyebrow">Propose a ransom</div>
            <label>
                <span>Captive UID</span>
                <input bind:value={propose.captiveUid} required placeholder="uid of captive" />
            </label>
            <label>
                <span>Amount (gold)</span>
                <input type="number" min="1" bind:value={propose.amount} required />
            </label>
            <label>
                <span>Note (optional)</span>
                <textarea bind:value={propose.note} rows="2" placeholder="terms, threats, niceties"></textarea>
            </label>
            <Button variant="primary" type="submit" disabled={posting}>
                {posting ? 'Sealing…' : 'Propose'}
            </Button>
        </form>
    {/if}

    {#if loading}
        <p class="empty italic">Reading the chain links…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else if !items.length}
        <p class="empty italic">No ransoms in negotiation.</p>
    {:else}
        <ul class="list">
            {#each items as r}
                {@const myRole = role(r)}
                <li>
                    <WaxSeal glyph="crossed-swords" color="#5b1a1f" size={46} />
                    <div class="body">
                        <div class="head">
                            <span class="status">{r.status.toUpperCase()}</span>
                            <span class="amount">{r.amount.toLocaleString()} gold</span>
                        </div>
                        <div class="parties">
                            <span>captor: <em>{r.captorUid?.slice(0, 8)}</em></span>
                            <span class="sep">·</span>
                            <span>captive: <em>{r.captiveUid?.slice(0, 8)}</em></span>
                        </div>
                        {#if r.note}<p class="note">{r.note}</p>{/if}
                    </div>
                    {#if myRole && (r.status === 'proposed' || r.status === 'counter')}
                        <div class="acts">
                            <button onclick={() => respond(r._id, 'accept')}>Accept</button>
                            <button onclick={() => {
                                const c = prompt('Counter amount:', r.amount);
                                if (c) respond(r._id, 'counter', c);
                            }}>Counter</button>
                            <button class="reject" onclick={() => respond(r._id, 'reject')}>Reject</button>
                        </div>
                    {/if}
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
    .form { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.5em; display: grid; gap: 0.8em; max-width: 500px; margin: 1.5em 0; }
    .form label { display: grid; gap: 0.2em; }
    .form label span { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--color-ink-700); }
    .form input, .form textarea {
        padding: 0.5em 0.7em; background: var(--color-parchment-200);
        border: 1px solid var(--color-parchment-shadow); font-family: var(--font-body); color: var(--color-ink-900);
    }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .list { list-style: none; padding: 0; margin: 1em 0 0; display: grid; gap: 1em; }
    .list li { display: grid; grid-template-columns: 56px 1fr auto; gap: 1.2em; align-items: center; background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.2); padding: 1em 1.2em; }
    .head { display: flex; justify-content: space-between; align-items: baseline; }
    .status { font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.18em; color: var(--color-wax-red); }
    .amount { font-family: var(--font-display); font-size: 1.1rem; color: var(--color-ink-900); }
    .parties { font-family: var(--font-editorial); font-style: italic; font-size: 0.85rem; color: var(--color-ink-500); margin-top: 0.3em; }
    .parties em { color: var(--color-ink-700); font-family: var(--font-mono); }
    .sep { opacity: 0.4; margin: 0 0.4em; }
    .note { font-family: var(--font-body); margin: 0.5em 0 0; color: var(--color-ink-700); font-size: 0.9rem; }
    .acts { display: flex; gap: 0.4em; flex-direction: column; }
    .acts button { font-family: var(--font-display); font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.5em 0.9em; background: var(--color-ink-900); color: var(--color-parchment-100); border: none; cursor: pointer; }
    .acts button.reject { background: transparent; color: var(--color-wax-red); border: 1px solid var(--color-wax-red); }
</style>
