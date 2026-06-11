<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import { BUILDINGS } from 'gisaima-shared/definitions/BUILDINGS.js';
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

    // Bounty target (player) selection.
    let targetQuery = $state('');
    let targetResults = $state([]);
    let targetSearching = $state(false);
    let proposeTarget = $state(null); // { uid, displayName }
    let targetSearchTimer = null;

    // Public-works building/upgrade selection — drawn from the shared building
    // catalogue (definitions live under BUILDINGS.types), monster buildings excluded.
    const buildingOptions = Object.entries(BUILDINGS.types || {})
        .filter(([id, b]) => !/monster/i.test(`${id} ${b?.name || ''}`))
        .map(([id, b]) => ({ id, name: b?.name || id }));
    let proposeBuilding = $state(buildingOptions[0]?.id ?? '');

    const GOLD_STEP = 25;
    function bumpGold(delta) {
        proposeGold = Math.max(1, Math.min(1_000_000, (Math.floor(Number(proposeGold) || 0)) + delta));
    }

    function onTargetInput() {
        proposeTarget = null;
        clearTimeout(targetSearchTimer);
        const q = targetQuery.trim();
        if (q.length < 2) { targetResults = []; return; }
        targetSearchTimer = setTimeout(searchTargets, 250);
    }
    async function searchTargets() {
        try {
            targetSearching = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/players/search?q=${encodeURIComponent(targetQuery.trim())}`);
            targetResults = r?.players || [];
        } catch {
            targetResults = [];
        } finally {
            targetSearching = false;
        }
    }
    function pickTarget(p) {
        proposeTarget = p;
        targetQuery = p.displayName;
        targetResults = [];
    }

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

        // Kind-specific params + a sensible default title.
        const params = {};
        let defaultTitle = `${kind?.label || 'Motion'} (${gold} gold)`;
        if (proposeKind === 'bounty') {
            if (!proposeTarget?.uid) { alert('Choose the player this bounty targets.'); return; }
            params.targetUid = proposeTarget.uid;
            params.targetName = proposeTarget.displayName;
            defaultTitle = `Bounty on ${proposeTarget.displayName} (${gold} gold)`;
        } else if (proposeKind === 'public_works') {
            if (!proposeBuilding) { alert('Choose the building or upgrade to fund.'); return; }
            const b = buildingOptions.find(o => o.id === proposeBuilding);
            params.building = proposeBuilding;
            params.buildingName = b?.name || proposeBuilding;
            defaultTitle = `Public Works: ${b?.name || proposeBuilding} (${gold} gold)`;
        }

        const title = proposeTitle.trim() || defaultTitle;
        try {
            proposing = true;
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/politics`, {
                title, kind: proposeKind, cost: { gold }, params,
            });
            proposeTitle = '';
            proposeTarget = null;
            targetQuery = '';
            await load();
        } catch (e) {
            alert(`Proposal failed: ${e.message}`);
        } finally {
            proposing = false;
        }
    }

    let donating = $state(false);
    async function donate() {
        if (donating) return;
        const raw = prompt('How much gold to donate to the coffers?', '100');
        if (raw === null) return;
        const amount = Math.floor(Number(raw));
        if (!Number.isFinite(amount) || amount <= 0) { alert('Enter a positive amount.'); return; }
        donating = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/politics/donate`, { amount });
            await load();
        } catch (e) {
            alert(`Donation failed: ${e.message}`);
        } finally {
            donating = false;
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

                {#if proposeKind === 'bounty'}
                    <div class="propose-target">
                        <span class="field-label">Target player</span>
                        <div class="target-search">
                            <input
                                class="propose-title"
                                type="text"
                                placeholder="Search players by name…"
                                bind:value={targetQuery}
                                oninput={onTargetInput}
                                autocomplete="off"
                            />
                            {#if proposeTarget}
                                <span class="target-chosen">✓ {proposeTarget.displayName}</span>
                            {/if}
                            {#if targetResults.length > 0 && !proposeTarget}
                                <ul class="target-results">
                                    {#each targetResults as p (p.uid)}
                                        <li><button type="button" onclick={() => pickTarget(p)}>{p.displayName}</button></li>
                                    {/each}
                                </ul>
                            {:else if targetSearching}
                                <span class="target-hint">Searching…</span>
                            {/if}
                        </div>
                    </div>
                {:else if proposeKind === 'public_works'}
                    <div class="propose-target">
                        <span class="field-label">Building / upgrade to fund</span>
                        <select class="propose-building" bind:value={proposeBuilding}>
                            {#each buildingOptions as b (b.id)}
                                <option value={b.id}>{b.name}</option>
                            {/each}
                        </select>
                    </div>
                {/if}

                <div class="propose-row">
                    <input class="propose-title" type="text" placeholder="Motion title (optional)" bind:value={proposeTitle} maxlength="120" />
                    <div class="propose-gold">
                        <span class="field-label">Gold</span>
                        <div class="qty-control">
                            <button type="button" class="qty-btn" onclick={() => bumpGold(-GOLD_STEP)} disabled={proposeGold <= 1} aria-label="Decrease gold">−</button>
                            <input class="qty-display" type="number" min="1" bind:value={proposeGold} aria-label="Gold amount" />
                            <button type="button" class="qty-btn" onclick={() => bumpGold(GOLD_STEP)} aria-label="Increase gold">+</button>
                        </div>
                    </div>
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
                <Button variant="primary" onclick={donate} disabled={donating}>
                    <Stamp kind="coin" size={14} /> {donating ? 'Donating…' : 'Donate'}
                </Button>
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
    .propose-gold { font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.1em; color: var(--color-ink-500); display: flex; align-items: center; gap: 0.5em; }
    .field-label { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-ink-500); }
    .qty-control { display: inline-flex; align-items: stretch; border: 1px solid rgba(26,32,48,.25); background: var(--color-parchment-100); }
    .qty-btn { width: 2.2em; border: none; background: var(--color-parchment-200); color: var(--color-ink-900); font-size: 1.1rem; line-height: 1; cursor: pointer; font-family: var(--font-display); }
    .qty-btn:hover:not(:disabled) { background: var(--color-wax-red); color: var(--color-parchment-100); }
    .qty-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .qty-display { width: 5em; padding: 0.5em 0.4em; border: none; border-left: 1px solid rgba(26,32,48,.18); border-right: 1px solid rgba(26,32,48,.18); background: transparent; font-family: var(--font-mono); text-align: center; -moz-appearance: textfield; }
    .qty-display::-webkit-outer-spin-button, .qty-display::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .propose-target { margin: 0.8em 0; display: flex; flex-direction: column; gap: 0.4em; }
    .propose-building { padding: 0.5em 0.7em; border: 1px solid rgba(26,32,48,.25); background: var(--color-parchment-100); font-family: var(--font-body); max-width: 22em; }
    .target-search { position: relative; max-width: 22em; }
    .target-search .propose-title { width: 100%; }
    .target-chosen { display: inline-block; margin-top: 0.3em; font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-forest, #2f5a4e); }
    .target-hint { display: inline-block; margin-top: 0.3em; font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-ink-500); }
    .target-results { list-style: none; margin: 0.2em 0 0; padding: 0; position: absolute; z-index: 5; left: 0; right: 0; background: var(--color-parchment-100); border: 1px solid rgba(26,32,48,.25); max-height: 12em; overflow-y: auto; box-shadow: 0 0.4em 1em rgba(0,0,0,.18); }
    .target-results li button { display: block; width: 100%; text-align: left; padding: 0.5em 0.7em; background: none; border: none; cursor: pointer; font-family: var(--font-body); color: var(--color-ink-900); }
    .target-results li button:hover { background: var(--color-parchment-300); }
    @media (max-width: 700px) {
        .block.split { grid-template-columns: 1fr; }
        .coffers { grid-template-columns: 1fr; }
        .cof { border-left: none; border-top: 1px solid rgba(26,32,48,.18); }
        .cof:first-child { border-top: none; }
    }
</style>
