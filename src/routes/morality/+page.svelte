<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Button from '../../components/ui/Button.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';

    let scores = $state([]);
    let mine = $state(null);
    let loading = $state(true);
    let error = $state(null);
    let accuse = $state({ targetUid: '', polarity: 'evil', reportRef: '', comment: '' });
    let submitting = $state(false);
    let submitMsg = $state(null);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/morality`);
            scores = r?.scores || [];
            mine = r?.mine || null;
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function submit(e) {
        e.preventDefault();
        submitting = true;
        submitMsg = null;
        try {
            const r = await apiPost(`/worlds/${encodeURIComponent(worldId)}/morality`, {
                targetUid: accuse.targetUid.trim(),
                polarity: accuse.polarity,
                reportRef: accuse.reportRef || null,
                comment: accuse.comment || ''
            });
            submitMsg = `Recorded. Target score: ${r.score}`;
            accuse = { targetUid: '', polarity: 'evil', reportRef: '', comment: '' };
            await load();
        } catch (e) {
            submitMsg = `Failed: ${e.message}`;
        } finally {
            submitting = false;
        }
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Morality — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Ledger of Deeds</div>
    <h1>Morality</h1>
    <p class="lede">Good and evil are decided by the realm. Five accusations a day, and a long memory.</p>
    <Flourish extraClass="page-flourish" />

    {#if mine}
        <section class="me">
            <div class="me-row">
                <WaxSeal glyph={mine.score >= 0 ? 'star' : 'skull'} color={mine.score >= 0 ? '#3f5a4e' : '#5b1a1f'} size={56} />
                <div>
                    <div class="me-score">{mine.score}</div>
                    <div class="me-label">Your standing</div>
                </div>
                <div class="me-counts">
                    <div><span>+{mine.good}</span><small>GOOD</small></div>
                    <div><span>−{mine.evil}</span><small>EVIL</small></div>
                </div>
            </div>
        </section>
    {/if}

    {#if $user && !$user.isAnonymous}
        <form class="form" onsubmit={submit}>
            <div class="eyebrow">Accuse a player</div>
            <label>
                <span>Target UID</span>
                <input bind:value={accuse.targetUid} required placeholder="uid of player" />
            </label>
            <label>
                <span>Polarity</span>
                <select bind:value={accuse.polarity}>
                    <option value="evil">Evil</option>
                    <option value="good">Good</option>
                </select>
            </label>
            <label>
                <span>Justification (report ID, optional)</span>
                <input bind:value={accuse.reportRef} placeholder="report:abc123" />
            </label>
            <label>
                <span>Comment (optional)</span>
                <textarea bind:value={accuse.comment} rows="2"></textarea>
            </label>
            {#if submitMsg}<div class="msg">{submitMsg}</div>{/if}
            <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Inking…' : 'Record'}
            </Button>
        </form>
    {/if}

    <hr class="rule-deco" />

    <section>
        <div class="eyebrow">The Roll</div>
        {#if loading}
            <p class="empty italic">Counting deeds…</p>
        {:else if !worldId}
            <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
        {:else if error}
            <p class="empty err">{error}</p>
        {:else if !scores.length}
            <p class="empty italic">No deeds yet recorded.</p>
        {:else}
            <table>
                <thead>
                    <tr><th>#</th><th>Player</th><th class="num">Good</th><th class="num">Evil</th><th class="num">Score</th></tr>
                </thead>
                <tbody>
                    {#each scores as p, i}
                        <tr>
                            <td class="rank">{i + 1}</td>
                            <td class="name">{p.displayName}</td>
                            <td class="num good">+{p.good}</td>
                            <td class="num evil">−{p.evil}</td>
                            <td class="num score" class:positive={p.score >= 0} class:negative={p.score < 0}>{p.score}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </section>
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1000px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .me { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.5em; margin: 1.5em 0; }
    .me-row { display: flex; align-items: center; gap: 1.5em; }
    .me-score { font-family: var(--font-display); font-size: 2.4rem; }
    .me-label { font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.18em; color: var(--color-ink-500); }
    .me-counts { display: flex; gap: 2em; margin-left: auto; }
    .me-counts span { font-family: var(--font-display); font-size: 1.4rem; }
    .me-counts small { display: block; font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.2em; color: var(--color-ink-500); margin-top: 0.2em; }
    .form { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.5em; display: grid; gap: 0.8em; max-width: 500px; margin: 1.5em 0; }
    .form label { display: grid; gap: 0.2em; }
    .form label span { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--color-ink-700); }
    .form input, .form select, .form textarea {
        padding: 0.5em 0.7em; background: var(--color-parchment-200);
        border: 1px solid var(--color-parchment-shadow); font-family: var(--font-body);
        color: var(--color-ink-900); border-radius: 2px;
    }
    .msg { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-700); }
    table { width: 100%; border-collapse: collapse; margin-top: 0.8em; }
    th { text-align: left; font-family: var(--font-display); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.6em 0.4em; border-bottom: 1px solid var(--color-ink-900); }
    th.num, td.num { text-align: right; font-family: var(--font-mono); font-size: 0.85rem; }
    td { padding: 0.6em 0.4em; border-bottom: 1px solid rgba(26, 32, 48, 0.15); }
    td.rank { width: 40px; font-family: var(--font-mono); color: var(--color-ink-500); }
    td.name { font-family: var(--font-display); }
    td.good { color: var(--color-sage-deep); }
    td.evil { color: var(--color-wax-red); }
    td.score.positive { color: var(--color-sage-deep); }
    td.score.negative { color: var(--color-wax-red); }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .rule-deco { border: none; margin: 2em 0; }
</style>
