<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Button from '../../components/ui/Button.svelte';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';

    let votes = $state([]);
    let coffers = $state(null);
    let loading = $state(true);
    let error = $state(null);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/politics`);
            votes = r?.votes || [];
            coffers = r?.coffers || null;
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function castVote(voteId, option) {
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/politics/${voteId}`, { option });
            await load();
        } catch (e) {
            alert(`Vote failed: ${e.message}`);
        }
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Politics — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Council Chamber</div>
    <h1>Politics of the Realm</h1>
    <p class="lede">Where the laws are written, the coffers counted, and the rulers raised or torn down.</p>
    <Flourish extraClass="page-flourish" />

    {#if loading}
        <p class="empty italic">Reading from the council ledger…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else}
        <section class="block">
            <div class="eyebrow">Open Votes</div>
            {#if votes.length === 0}
                <p class="empty italic">No motions on the table.</p>
            {:else}
                <ul class="vote-list">
                    {#each votes as v}
                        <li>
                            <div class="vote-head">
                                <h3>{v.title}</h3>
                                <span class="vote-meta">closes {v.closesAt ?? '—'}</span>
                            </div>
                            <p class="vote-desc">{v.description ?? ''}</p>
                            <div class="vote-opts">
                                {#each (v.options || []) as o}
                                    <button class="opt" onclick={() => castVote(v._id || v.id, o.id)}>
                                        <span class="opt-label">{o.label}</span>
                                        <span class="opt-bar"><span style="width: {(o.share || 0) * 100}%;"></span></span>
                                        <span class="opt-count">{o.count ?? 0}</span>
                                    </button>
                                {/each}
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>

        <hr class="rule-deco" />

        <section class="block split">
            <div>
                <div class="eyebrow">Coffers</div>
                <div class="coffers">
                    <div class="cof"><span class="big">{(coffers?.gold ?? 0).toLocaleString()}</span><span class="cof-label">GOLD</span></div>
                    <div class="cof"><span class="big">{(coffers?.taxes ?? 0).toLocaleString()}</span><span class="cof-label">TAXES / TICK</span></div>
                    <div class="cof"><span class="big">{(coffers?.debt ?? 0).toLocaleString()}</span><span class="cof-label">DEBT</span></div>
                </div>
                <Button variant="primary"><Stamp kind="coin" size={14} /> Donate</Button>
            </div>

            <div>
                <div class="eyebrow">Office Holders</div>
                <ul class="offices">
                    <li>
                        <WaxSeal glyph="crown" color="#5b1a1f" size={36} />
                        <div>
                            <div class="o-title">Steward of Brennec</div>
                            <div class="o-name">Vael of the Northwood</div>
                        </div>
                        <span class="o-term">term ends t+1,402</span>
                    </li>
                    <li>
                        <WaxSeal glyph="banner" color="#16393f" size={36} />
                        <div>
                            <div class="o-title">Chancellor</div>
                            <div class="o-name">vacant</div>
                        </div>
                        <span class="o-term">elect open</span>
                    </li>
                    <li>
                        <WaxSeal glyph="scroll" color="#3f5a4e" size={36} />
                        <div>
                            <div class="o-title">Chronicler</div>
                            <div class="o-name">Maela the Trade Lord</div>
                        </div>
                        <span class="o-term">term ends t+842</span>
                    </li>
                </ul>
            </div>
        </section>
    {/if}

    <p class="note">Vote / coffer / morality systems are stubbed via /worlds/:id/politics. Vote casting requires backing collections and tick-based closure logic (see <a href="/flows">flows</a>).</p>
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1100px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .empty { font-family: var(--font-editorial); color: var(--color-ink-500); padding: 2em 0; }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .block { margin: 2.5em 0; }
    .block.split { display: grid; grid-template-columns: 1fr 1fr; gap: 2em; align-items: start; }
    .vote-list { list-style: none; padding: 0; margin: 1em 0 0; display: grid; gap: 1.2em; }
    .vote-list li { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.2em 1.4em; }
    .vote-head { display: flex; justify-content: space-between; align-items: baseline; }
    .vote-head h3 { font-family: var(--font-display); font-size: 1.1rem; margin: 0; letter-spacing: 0.04em; }
    .vote-meta { font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-ink-500); }
    .vote-desc { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-700); margin: 0.4em 0 0.8em; }
    .vote-opts { display: grid; gap: 0.4em; }
    .opt { display: grid; grid-template-columns: 1fr 2fr auto; align-items: center; gap: 0.8em; padding: 0.6em 0.8em; background: var(--color-parchment-200); border: 1px solid rgba(26,32,48,.18); font-family: var(--font-body); text-align: left; cursor: pointer; }
    .opt:hover { background: var(--color-parchment-300); }
    .opt-label { font-family: var(--font-display); font-size: 0.85rem; letter-spacing: 0.04em; }
    .opt-bar { background: var(--color-parchment-300); height: 6px; border-radius: 2px; overflow: hidden; }
    .opt-bar span { display: block; height: 100%; background: var(--color-wax-red); }
    .opt-count { font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-700); min-width: 2em; text-align: right; }
    .coffers { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--color-ink-900); border-bottom: 1px solid var(--color-ink-900); margin: 0.6em 0 1em; }
    .cof { padding: 1em; border-left: 1px solid rgba(26, 32, 48, 0.18); }
    .cof:first-child { border-left: none; }
    .cof .big { display: block; font-family: var(--font-display); font-size: 1.8rem; color: var(--color-ink-900); }
    .cof .cof-label { font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.18em; color: var(--color-ink-500); }
    .offices { list-style: none; padding: 0; margin: 0.6em 0 0; }
    .offices li { display: grid; grid-template-columns: 36px 1fr auto; gap: 0.8em; align-items: center; padding: 0.7em 0; border-top: 1px solid rgba(26, 32, 48, 0.15); }
    .o-title { font-family: var(--font-display); font-size: 0.85rem; letter-spacing: 0.04em; }
    .o-name { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); font-size: 0.85rem; }
    .o-term { font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-ink-500); }
    .rule-deco { border: none; margin: 2em 0; }
    .note { font-family: var(--font-editorial); font-style: italic; font-size: 0.85rem; color: var(--color-ink-500); margin-top: 2em; }
    @media (max-width: 700px) {
        .block.split { grid-template-columns: 1fr; }
        .coffers { grid-template-columns: 1fr; }
        .cof { border-left: none; border-top: 1px solid rgba(26,32,48,.18); }
        .cof:first-child { border-top: none; }
    }
</style>
