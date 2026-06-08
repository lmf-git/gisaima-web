<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import Stamp from '../../ui/Stamp.svelte';
    import Flourish from '../../ui/Flourish.svelte';
    import Button from '../../ui/Button.svelte';
    import WaxSeal from '../../ui/WaxSeal.svelte';

    let votes = $state([]);
    let coffers = $state(null);
    let effects = $state(null);
    let loading = $state(true);
    let error = $state(null);

    // Propose-a-motion form. Each kind spends from the coffers when it passes.
    const PROPOSAL_KINDS = [
        { id: 'festival',     label: 'Festival',     hint: 'Boosts production realm-wide for a time.' },
        { id: 'public_works', label: 'Public Works', hint: 'Funds a temporary defensive bonus.' },
        { id: 'bounty',       label: 'Bounty Pool',  hint: 'Seeds bounties on villains and monsters.' },
    ];
    let proposeKind = $state('festival');
    let proposeGold = $state(100);
    let proposeTitle = $state('');
    let proposing = $state(false);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/politics`);
            votes = r?.votes || [];
            coffers = r?.coffers || null;
            effects = r?.effects || null;
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function proposeMotion() {
        const gold = Math.max(1, Math.floor(Number(proposeGold) || 0));
        const kind = PROPOSAL_KINDS.find(k => k.id === proposeKind);
        const title = proposeTitle.trim() || `${kind?.label || 'Motion'} (${gold} gold)`;
        try {
            proposing = true;
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/politics`, {
                title, kind: proposeKind, cost: { gold },
            });
            proposeTitle = '';
            await load();
        } catch (e) {
            alert(`Proposal failed: ${e.message}`);
        } finally {
            proposing = false;
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

<div class="panel">
    <div class="eyebrow wax">The Council Chamber</div>
    <h2>Council of the Realm</h2>
    <p class="lede">Where the laws are written, the coffers counted, and the rulers raised or torn down.</p>
    <Flourish extraClass="page-flourish" />

    {#if loading}
        <p class="empty italic">Reading from the council ledger…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else}
        {#if effects && (effects.festival || effects.publicWorks || effects.bountyPool)}
            <section class="block">
                <div class="eyebrow">In Effect</div>
                <ul class="effects">
                    {#if effects.festival}<li>🎉 Festival — production heightened across the realm.</li>{/if}
                    {#if effects.publicWorks}<li>🛡️ Public Works — defences reinforced.</li>{/if}
                    {#if effects.bountyPool}<li>⚖️ Bounty pool: <strong>{effects.bountyPool.toLocaleString()}</strong> gold for hunting villains.</li>{/if}
                </ul>
            </section>
        {/if}

        <section class="block">
            <div class="eyebrow">Propose a Motion</div>
            <div class="propose">
                <div class="propose-kinds">
                    {#each PROPOSAL_KINDS as k}
                        <button
                            class="kind"
                            class:selected={proposeKind === k.id}
                            onclick={() => (proposeKind = k.id)}
                            title={k.hint}
                        >{k.label}</button>
                    {/each}
                </div>
                <p class="propose-hint">{PROPOSAL_KINDS.find(k => k.id === proposeKind)?.hint}</p>
                <div class="propose-row">
                    <input class="propose-title" type="text" placeholder="Motion title (optional)" bind:value={proposeTitle} maxlength="120" />
                    <label class="propose-gold">Gold <input type="number" min="1" bind:value={proposeGold} /></label>
                    <Button variant="primary" onclick={proposeMotion} disabled={proposing}>
                        {proposing ? 'Proposing…' : 'Propose'}
                    </Button>
                </div>
            </div>
        </section>

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
</div>

<style>
    .panel { color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h2 { font-family: var(--font-display); font-size: 2.2rem; letter-spacing: 0.04em; margin: 0.2em 0; }
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
    .effects { list-style: none; padding: 0; margin: 0.6em 0 0; display: grid; gap: 0.4em; }
    .effects li { font-family: var(--font-editorial); color: var(--color-ink-700); }
    .propose { margin-top: 0.8em; }
    .propose-kinds { display: flex; gap: 0.5em; flex-wrap: wrap; }
    .kind { font-family: var(--font-display); font-size: 0.8rem; letter-spacing: 0.04em; padding: 0.45em 0.9em; background: var(--color-parchment-200); border: 1px solid rgba(26,32,48,.2); cursor: pointer; }
    .kind:hover { background: var(--color-parchment-300); }
    .kind.selected { background: var(--color-wax-red); color: var(--color-parchment-100); border-color: var(--color-wax-red); }
    .propose-hint { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0.5em 0; font-size: 0.85rem; }
    .propose-row { display: flex; gap: 0.6em; align-items: center; flex-wrap: wrap; }
    .propose-title { flex: 1 1 12em; padding: 0.5em 0.7em; border: 1px solid rgba(26,32,48,.25); background: var(--color-parchment-100); font-family: var(--font-body); }
    .propose-gold { font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.1em; color: var(--color-ink-500); display: flex; align-items: center; gap: 0.4em; }
    .propose-gold input { width: 6em; padding: 0.5em 0.6em; border: 1px solid rgba(26,32,48,.25); background: var(--color-parchment-100); font-family: var(--font-mono); }
    @media (max-width: 700px) {
        .block.split { grid-template-columns: 1fr; }
        .coffers { grid-template-columns: 1fr; }
        .cof { border-left: none; border-top: 1px solid rgba(26,32,48,.18); }
        .cof:first-child { border-top: none; }
    }
</style>
