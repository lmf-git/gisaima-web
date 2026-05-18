<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Button from '../../components/ui/Button.svelte';

    let items = $state([]);
    let loading = $state(true);
    let error = $state(null);
    let postOpen = $state(false);
    let postForm = $state({ targetUid: '', targetName: '', amount: 100 });
    let posting = $state(false);
    let postError = $state(null);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) {
            loading = false;
            return;
        }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/bounties`);
            items = r.items || [];
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function submit(e) {
        e.preventDefault();
        if (!worldId) return;
        posting = true;
        postError = null;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/bounties`, {
                targetUid: postForm.targetUid.trim(),
                targetName: postForm.targetName.trim(),
                amount: Number(postForm.amount)
            });
            postOpen = false;
            postForm = { targetUid: '', targetName: '', amount: 100 };
            await load();
        } catch (e) {
            postError = e.message;
        } finally {
            posting = false;
        }
    }

    function timeAgo(d) {
        const t = new Date(d).getTime();
        const s = Math.floor((Date.now() - t) / 1000);
        if (s < 60) return `${s}s ago`;
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        return `${Math.floor(s / 86400)}d ago`;
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Bounties — Gisaima</title></svelte:head>

<div class="page">
    <header class="hero">
        <div class="eyebrow wax">The Black List</div>
        <h1>Bounties of the Realm</h1>
        <p class="lede">A coin upon a head. The realm keeps a long memory of those whose lives have been priced.</p>
        <Flourish width={220} color="var(--color-ink-900)" />

        {#if $user && !$user.isAnonymous && worldId}
            <div class="actions">
                <Button variant="danger" onclick={() => (postOpen = !postOpen)}>
                    <Stamp kind="skull" size={14} />
                    {postOpen ? 'Cancel' : 'Post a Bounty'}
                </Button>
            </div>
        {/if}
    </header>

    {#if postOpen}
        <form class="post-form" onsubmit={submit}>
            <div class="eyebrow">New Contract</div>
            <label>
                <span>Target UID</span>
                <input bind:value={postForm.targetUid} required placeholder="uid of hunted player" />
            </label>
            <label>
                <span>Display Name</span>
                <input bind:value={postForm.targetName} required placeholder="as known in the realm" />
            </label>
            <label>
                <span>Reward (gold)</span>
                <input type="number" min="1" step="1" bind:value={postForm.amount} required />
            </label>
            {#if postError}<div class="err">{postError}</div>{/if}
            <Button variant="primary" type="submit" disabled={posting}>
                {posting ? 'Sealing…' : 'Affix Seal'}
            </Button>
        </form>
    {/if}

    {#if loading}
        <p class="empty italic">The clerks are unrolling the parchment…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world to view its bounties. <a href="/worlds">Choose a realm.</a></p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else if items.length === 0}
        <p class="empty italic">No bounties currently posted. The realm sleeps uneasy.</p>
    {:else}
        <ul class="list">
            {#each items as b (b._id)}
                <li class="row">
                    <div class="seal-col">
                        <WaxSeal glyph="crossed-swords" color="#9a3320" size={56} />
                    </div>
                    <div class="body">
                        <div class="target">
                            <span class="name">{b.targetName}</span>
                            <span class="uid">{b.targetUid}</span>
                        </div>
                        <div class="meta">
                            posted by <strong>{b.postedByName}</strong>
                            · <span class="time">{timeAgo(b.postedAt)}</span>
                        </div>
                    </div>
                    <div class="reward">
                        <Stamp kind="coin" size={18} />
                        <span class="amount">{b.amount.toLocaleString()}</span>
                        <span class="unit">GOLD</span>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .page {
        position: relative;
        z-index: 2;
        max-width: 900px;
        margin: 0 auto;
        padding: 7em 2em 4em;
        color: var(--color-ink-900);
    }
    .hero { margin-bottom: 2em; }
    .eyebrow.wax { color: var(--color-wax-red); }
    .hero h1 {
        font-family: var(--font-display);
        font-size: 2.8rem;
        margin: 0.3em 0;
        letter-spacing: 0.04em;
    }
    .lede {
        font-family: var(--font-editorial);
        font-style: italic;
        color: var(--color-ink-500);
        max-width: 600px;
        margin: 0 0 1em;
    }
    .actions { margin-top: 1.2em; }
    .post-form {
        background: var(--color-parchment-100);
        border: 1px solid var(--color-ink-900);
        padding: 1.5em;
        margin-bottom: 2em;
        display: grid;
        gap: 0.8em;
        max-width: 480px;
    }
    .post-form label {
        display: grid;
        gap: 0.3em;
    }
    .post-form label span {
        font-family: var(--font-display);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--color-ink-700);
    }
    .post-form input {
        padding: 0.5em 0.7em;
        border: 1px solid var(--color-parchment-shadow);
        background: var(--color-parchment-200);
        font-family: var(--font-mono);
        font-size: 0.9rem;
        color: var(--color-ink-900);
        border-radius: 2px;
    }
    .empty {
        font-family: var(--font-editorial);
        color: var(--color-ink-500);
        text-align: center;
        padding: 3em 1em;
    }
    .empty.italic { font-style: italic; }
    .err { color: var(--color-wax-red); font-family: var(--font-mono); font-size: 0.85em; }
    .list { list-style: none; padding: 0; margin: 0; }
    .row {
        display: grid;
        grid-template-columns: 64px 1fr auto;
        align-items: center;
        gap: 1.2em;
        padding: 1.2em 0;
        border-top: 1px solid rgba(26, 32, 48, 0.18);
    }
    .row:last-child { border-bottom: 1px solid rgba(26, 32, 48, 0.18); }
    .target .name {
        font-family: var(--font-display);
        font-size: 1.2rem;
        letter-spacing: 0.04em;
    }
    .target .uid {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        color: var(--color-ink-300);
        margin-left: 0.6em;
    }
    .meta {
        font-family: var(--font-editorial);
        font-style: italic;
        color: var(--color-ink-500);
        font-size: 0.9rem;
        margin-top: 0.2em;
    }
    .time { font-family: var(--font-mono); font-style: normal; font-size: 0.78rem; }
    .reward {
        display: flex;
        align-items: baseline;
        gap: 0.4em;
        font-family: var(--font-mono);
        color: var(--color-wax-red);
    }
    .reward .amount { font-size: 1.4rem; font-weight: 500; }
    .reward .unit { font-size: 0.7rem; letter-spacing: 0.18em; }
</style>
