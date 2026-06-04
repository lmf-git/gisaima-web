<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Button from '../../components/ui/Button.svelte';

    let loans = $state([]);
    let loading = $state(true);
    let error = $state(null);
    let form = $state({ bankerUid: '', principal: 500, interestRate: 0.05, termTicks: 24 });
    let posting = $state(false);

    // Banker credibility — % of loans this banker has historically repaid as agreed.
    let credCheck = $state({ bankerUid: '', result: null, loading: false });
    async function checkCredibility() {
        if (!credCheck.bankerUid.trim() || !worldId) return;
        credCheck.loading = true;
        try {
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/banks/credibility?bankerUid=${encodeURIComponent(credCheck.bankerUid)}`);
            credCheck.result = r;
        } catch (e) {
            credCheck.result = { error: e.message };
        } finally {
            credCheck.loading = false;
        }
    }

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/loans`);
            loans = r?.items || [];
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function request(e) {
        e.preventDefault();
        posting = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/loans`, {
                bankerUid: form.bankerUid.trim(),
                principal: Number(form.principal),
                interestRate: Number(form.interestRate),
                termTicks: Number(form.termTicks)
            });
            await load();
        } catch (e) {
            alert(`Request failed: ${e.message}`);
        } finally {
            posting = false;
        }
    }

    async function approve(id) {
        try { await apiPost(`/worlds/${encodeURIComponent(worldId)}/loans/${id}/approve`, {}); await load(); }
        catch (e) { alert(`Approve failed: ${e.message}`); }
    }
    async function repay(id, due) {
        const amt = prompt('Repayment amount:', String(due));
        if (!amt) return;
        try { await apiPost(`/worlds/${encodeURIComponent(worldId)}/loans/${id}/repay`, { amount: Number(amt) }); await load(); }
        catch (e) { alert(`Repay failed: ${e.message}`); }
    }

    function asBanker(l) { return $user && l.bankerUid === $user.uid; }
    function asBorrower(l) { return $user && l.borrowerUid === $user.uid; }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Banks — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Strongbox</div>
    <h1>Banks & Loans</h1>
    <p class="lede">Lend, borrow, charge interest. Default and the chronicle remembers.</p>
    <Flourish extraClass="page-flourish" />

    <section class="cred">
        <div class="eyebrow">Banker credibility</div>
        <div class="cred-row">
            <input bind:value={credCheck.bankerUid} placeholder="banker uid" />
            <button onclick={checkCredibility} disabled={credCheck.loading}>Check</button>
        </div>
        {#if credCheck.result}
            {#if credCheck.result.error}
                <p class="cred-err">{credCheck.result.error}</p>
            {:else if credCheck.result === null}
                <!-- no result -->
            {:else if credCheck.result.total === undefined}
                <p class="cred-meta italic">No completed loans on the books — nothing to judge by.</p>
            {:else}
                <p class="cred-meta">
                    <strong>{Math.round((credCheck.result.ratio ?? 0) * 100)}%</strong>
                    of {credCheck.result.total} settled loan{credCheck.result.total === 1 ? '' : 's'} repaid as agreed
                    ({credCheck.result.repaid} repaid, {credCheck.result.total - credCheck.result.repaid} defaulted).
                </p>
            {/if}
        {/if}
    </section>

    {#if $user && !$user.isAnonymous}
        <form class="form" onsubmit={request}>
            <div class="eyebrow">Request a loan</div>
            <label>
                <span>Banker UID</span>
                <input bind:value={form.bankerUid} required />
            </label>
            <div class="row">
                <label>
                    <span>Principal</span>
                    <input type="number" min="1" bind:value={form.principal} required />
                </label>
                <label>
                    <span>Interest / tick</span>
                    <input type="number" step="0.001" min="0" bind:value={form.interestRate} required />
                </label>
                <label>
                    <span>Term (ticks)</span>
                    <input type="number" min="1" bind:value={form.termTicks} required />
                </label>
            </div>
            <Button variant="primary" type="submit" disabled={posting}>
                {posting ? 'Sealing…' : 'Request'}
            </Button>
        </form>
    {/if}

    {#if loading}
        <p class="empty italic">Counting strongboxes…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world.</p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else if !loans.length}
        <p class="empty italic">No loans on the books.</p>
    {:else}
        <ul class="list">
            {#each loans as l}
                <li class={l.status}>
                    <div>
                        <div class="amt"><Stamp kind="coin" size={14} /> {l.principal.toLocaleString()} → due {l.accruedDue.toLocaleString()}</div>
                        <div class="meta">
                            {asBanker(l) ? `to ${l.borrowerUid.slice(0, 8)}` : `from ${l.bankerUid.slice(0, 8)}`}
                            · {l.interestRate * 100}% / tick · {l.ticksElapsed}/{l.termTicks} ticks
                        </div>
                    </div>
                    <span class="status">{l.status.toUpperCase()}</span>
                    <div class="acts">
                        {#if asBanker(l) && l.status === 'pending'}
                            <button onclick={() => approve(l._id)}>Approve</button>
                        {/if}
                        {#if asBorrower(l) && l.status === 'active'}
                            <button onclick={() => repay(l._id, l.accruedDue)}>Repay</button>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .page { position: relative; z-index: 2; width: 100%; max-width: 1100px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .cred { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.2em 1.4em; margin: 1.5em 0; max-width: 600px; }
    .cred-row { display: grid; grid-template-columns: 1fr auto; gap: 0.6em; margin-top: 0.5em; }
    .cred-row input { padding: 0.5em 0.7em; background: var(--color-parchment-200); border: 1px solid var(--color-parchment-shadow); font-family: var(--font-mono); }
    .cred-row button { padding: 0.5em 1em; background: var(--color-ink-900); color: var(--color-parchment-100); border: 1px solid var(--color-ink-900); font-family: var(--font-display); font-size: 0.75em; letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; }
    .cred-meta { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-700); margin: 0.8em 0 0; }
    .cred-meta strong { font-family: var(--font-mono); font-style: normal; color: var(--color-wax-red); }
    .cred-err { color: var(--color-wax-red); font-family: var(--font-mono); font-size: 0.85em; margin: 0.5em 0 0; }
    .form { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.5em; display: grid; gap: 0.8em; max-width: 600px; margin: 1.5em 0; }
    .form label { display: grid; gap: 0.2em; }
    .form label span { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--color-ink-700); }
    .form input { padding: 0.5em 0.7em; background: var(--color-parchment-200); border: 1px solid var(--color-parchment-shadow); font-family: var(--font-mono); }
    .form .row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.6em; }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .list { list-style: none; padding: 0; margin: 1em 0 0; display: grid; gap: 0.6em; }
    .list li { display: grid; grid-template-columns: 1fr auto auto; gap: 1em; align-items: center; background: var(--color-parchment-100); border: 1px solid rgba(26,32,48,.2); padding: 0.8em 1.1em; }
    .list li.defaulted { background: rgba(154, 51, 32, 0.08); border-left: 3px solid var(--color-wax-red); }
    .list li.repaid { opacity: 0.6; }
    .amt { font-family: var(--font-mono); display: inline-flex; align-items: center; gap: 0.5em; color: var(--color-ink-900); }
    .meta { font-family: var(--font-editorial); font-style: italic; font-size: 0.78rem; color: var(--color-ink-500); margin-top: 0.2em; }
    .status { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.18em; color: var(--color-wax-red); }
    .acts button { font-family: var(--font-display); font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.4em 0.8em; background: var(--color-ink-900); color: var(--color-parchment-100); border: none; cursor: pointer; }
</style>
