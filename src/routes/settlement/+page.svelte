<script>
    import { game } from '$lib/stores/game.js';
    import { targetStore } from '$lib/stores/map.js';
    import { user } from '$lib/stores/user.js';
    import { apiPost } from '$lib/api.js';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Button from '../../components/ui/Button.svelte';

    const worldId = $derived($game.worldKey);
    const tile = $derived($targetStore);
    const canSetTaxes = $derived(
        $user && tile?.structure && tile.structure.owner === $user.uid
    );

    let saving = $state(false);
    let saveMsg = $state(null);
    async function saveTaxes() {
        if (!canSetTaxes || !worldId) return;
        saving = true; saveMsg = null;
        try {
            await apiPost('/actions/setStructureTaxes', {
                worldId,
                tileX: tile.x,
                tileY: tile.y,
                taxes: taxRates
            });
            saveMsg = 'Sealed. Coffers will reflect these rates next tick.';
        } catch (e) {
            saveMsg = `Failed: ${e.message}`;
        } finally {
            saving = false;
        }
    }

    // When viewing a real structure, hydrate from its stored taxes if present.
    $effect(() => {
        const t = tile?.structure?.taxes;
        if (t) {
            taxRates = { ...taxRates, ...t };
        }
    });

    // Stub data — pending wire-up to api/db/chunks structure
    const settlement = {
        name: 'Greyfell Outpost',
        kind: 'Outpost · Human · Level 2',
        coords: '-18, -7',
        founded: 'Tick 11,488',
        biome: 'Dry Grassland',
        sight: 3,
        durability: 184,
        durabilityMax: 200
    };

    const stats = [
        ['Sight',       '3 tiles', 'outpost +1 · watchtower +2'],
        ['Defense',     '+2',      '+10% from walls L2'],
        ['Detection',   '+1',      'Pathfinders add +1'],
        ['Capacity',    '8 / 8',   'Build storage to expand'],
        ['Build queue', '3 / 3',   'Smithy L3 in 18m']
    ];

    // Reference: Taxes & coffers — the % of each producing building's output
    // that flows to the steward's coffers, plus the official currency for
    // commerce inside this settlement.
    let taxRates = $state({ trade: 5, building: 10, mine: 10, farm: 10 });
    let officialCurrency = $state({ name: '', symbol: '' });
    let taxYieldPerTick = $derived(
        Math.round(taxRates.mine * 1.4 + taxRates.farm * 2.2 + taxRates.building * 0.8 + taxRates.trade * 0.5)
    );

    const buildings = [
        { type: 'smithy',   icon: 'hammer', level: 2, pct: 0,    status: 'idle',      desc: 'Crafts weapons, tools & armor' },
        { type: 'barracks', icon: 'shield', level: 2, pct: 0.42, status: 'upgrading', desc: 'Train troops · → L3 unlocks Archer' },
        { type: 'wall',     icon: 'tower',  level: 1, pct: 0,    status: 'idle',      desc: 'Defensive structure' },
        { type: 'mine',     icon: 'stone',  level: 2, pct: 0,    status: 'producing', desc: '+10% yield · Iron Ore +14/h' },
        { type: 'farm',     icon: 'wheat',  level: 1, pct: 0,    status: 'producing', desc: 'Wheat +22/h · Berries +6/h' },
        { type: 'academy',  icon: 'scroll', level: 0, pct: 0,    status: 'locked',    desc: 'Needs workshop first' },
        { type: 'market',   icon: 'coin',   level: 1, pct: 0,    status: 'idle',      desc: '+10% trade rates' },
        { type: 'harbour',  icon: 'compass', level: 0, pct: 0,   status: 'locked',    desc: 'Needs adjacent water' }
    ];

    const garrison = [
        { name: 'Footman',    q: 14, equip: 'sword + leather' },
        { name: 'Pathfinder', q: 6,  equip: 'boots' },
        { name: 'Knight',     q: 2,  equip: 'iron body, iron shield', locked: 'L3 smithy' },
        { name: 'Healer',     q: 1,  equip: '—' },
        { name: 'Engineer',   q: 1,  equip: 'gear' }
    ];

    const recruitQueue = [
        { unit: 'Footman',    q: 8, pct: 0.78, eta: '1m',  cost: '16 Wooden Sticks · 8 Iron Shards' },
        { unit: 'Pathfinder', q: 4, pct: 0.34, eta: '5m',  cost: '4 Wooden Sticks · 8 Leather' },
        { unit: 'Healer',     q: 2, pct: 0.04, eta: '12m', cost: '4 Herb · 2 Water' }
    ];

    const stores = [
        ['WOODEN_STICKS', 144, 'common'],
        ['STONE_PIECES',   88, 'common'],
        ['IRON_ORE',       24, 'uncommon'],
        ['LEATHER',        32, 'common'],
        ['MEDICINAL_HERBS', 12, 'uncommon'],
        ['WHEAT',          62, 'common'],
        ['MOUNTAIN_CRYSTAL', 2, 'rare'],
        ['ANCIENT_COIN',    8, 'uncommon'],
        ['BONE_FRAGMENT',  14, 'common'],
        ['MONSTER_HIDE',    6, 'uncommon'],
        ['VOLCANIC_GLASS',  1, 'uncommon'],
        ['CRUDE_WEAPON',    4, 'common']
    ];

    const rarityColor = {
        common: 'var(--color-ink-300)',
        uncommon: 'var(--color-sage-deep)',
        rare: 'var(--color-wax-red)',
        epic: 'var(--color-aged-gold)',
        legendary: 'var(--color-vermilion)'
    };

    const statusColor = {
        idle: 'var(--color-ink-500)',
        upgrading: 'var(--color-aged-gold)',
        producing: 'var(--color-sage-deep)',
        locked: 'var(--color-ink-300)'
    };
</script>

<svelte:head><title>{settlement.name} — Gisaima</title></svelte:head>

<div class="page">
    <header class="hero">
        <div class="crest"><WaxSeal glyph="tower" color="#1a2030" size={84} /></div>
        <div class="title">
            <div class="eyebrow wax">{settlement.kind.toUpperCase()} · {settlement.coords}</div>
            <h1>{settlement.name}</h1>
            <div class="motto">Founded {settlement.founded} · {settlement.biome} · {settlement.sight}-tile sight</div>
        </div>
        <div class="durability">
            <div class="label">Durability</div>
            <div class="value"><span class="big">{settlement.durability}</span><span class="of">/ {settlement.durabilityMax}</span></div>
            <div class="bar"><div class="fill" style="width: {(settlement.durability / settlement.durabilityMax) * 100}%;"></div></div>
        </div>
    </header>

    <div class="stat-bar">
        {#each stats as [k, v, sub]}
            <div class="cell">
                <div class="k">{k.toUpperCase()}</div>
                <div class="v">{v}</div>
                <div class="sub">{sub}</div>
            </div>
        {/each}
    </div>

    <section class="two-col">
        <div>
            <div class="eyebrow">Buildings</div>
            <div class="building-grid">
                {#each buildings as b}
                    <div class="building" class:locked={b.status === 'locked'}>
                        <Stamp kind={b.icon} size={22} />
                        <div class="bd">
                            <div class="bd-name">{b.type.toUpperCase()} · L{b.level}</div>
                            <div class="bd-desc">{b.desc}</div>
                            {#if b.pct > 0}
                                <div class="prog"><div style="width: {b.pct * 100}%;"></div></div>
                            {/if}
                        </div>
                        <div class="bd-status" style="color: {statusColor[b.status]};">{b.status}</div>
                    </div>
                {/each}
            </div>
        </div>

        <div>
            <div class="eyebrow">Garrison</div>
            <ul class="list">
                {#each garrison as g}
                    <li class:dim={g.locked}>
                        <span class="q">×{g.q}</span>
                        <span class="name">{g.name}</span>
                        <span class="equip">{g.equip}</span>
                        {#if g.locked}<span class="lock">{g.locked}</span>{/if}
                    </li>
                {/each}
            </ul>

            <div class="eyebrow mt">Recruit Queue</div>
            <ul class="list">
                {#each recruitQueue as r}
                    <li>
                        <span class="q">×{r.q}</span>
                        <span class="name">{r.unit}</span>
                        <span class="equip">{r.cost}</span>
                        <span class="eta">{r.eta}</span>
                    </li>
                {/each}
            </ul>
            <div class="cta-row">
                <Button variant="primary"><Stamp kind="plus" size={14} /> Recruit</Button>
                <Button variant="ghost">Manage</Button>
            </div>
        </div>
    </section>

    <hr class="rule-deco" />

    <section class="taxes">
        <div class="eyebrow">Taxes & Coffers</div>
        <p class="hint">Every producing building tithes a share to the steward's coffers each tick. Tighten the screws or loosen them.</p>
        <div class="tax-grid">
            {#each Object.entries(taxRates) as [k, v]}
                <label class="tax-row">
                    <span class="tax-name">{k}</span>
                    <span class="tax-val">{v}%</span>
                    <input type="range" min="0" max="50" bind:value={taxRates[k]} />
                </label>
            {/each}
        </div>
        <p class="yield">
            Estimated yield · <strong><Stamp kind="coin" size={11} /> {taxYieldPerTick}</strong>
            per tick into coffers.
        </p>

        {#if canSetTaxes}
            <Button variant="primary" onclick={saveTaxes} disabled={saving}>
                {saving ? 'Sealing…' : 'Set tax rates'}
            </Button>
            {#if saveMsg}<p class="save-msg">{saveMsg}</p>{/if}
        {:else if tile?.structure}
            <p class="hint italic">Only the steward of <strong>{tile.structure.name || 'this structure'}</strong> may set its rates.</p>
        {/if}

        <div class="eyebrow mt">Official Currency</div>
        <div class="currency-row">
            <label>
                <span>Name</span>
                <input bind:value={officialCurrency.name} placeholder="e.g. Greyfell Mark" />
            </label>
            <label>
                <span>Symbol</span>
                <input bind:value={officialCurrency.symbol} placeholder="₿ ₸" maxlength="4" />
            </label>
            <button class="set-currency" disabled={!officialCurrency.name || !officialCurrency.symbol}>
                Mint
            </button>
        </div>
        <p class="hint">Sets a currency as legal tender in this settlement. Trade offers are denominated in this currency when accepted here. (Mint endpoint at /currencies — wire-up next.)</p>
    </section>

    <hr class="rule-deco" />

    <section>
        <div class="eyebrow">Stores</div>
        <div class="stores">
            {#each stores as [k, n, r]}
                <div class="store" style="border-left-color: {rarityColor[r]};">
                    <div class="n">{n}</div>
                    <div class="k">{k.replace(/_/g, ' ').toLowerCase()}</div>
                </div>
            {/each}
        </div>
        <p class="note">Mock data — wires into structure / building / inventory state once Settlement detail is bound to the chunk store.</p>
    </section>
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    .hero { display: grid; grid-template-columns: auto 1fr auto; gap: 2em; align-items: center; margin-bottom: 2em; }
    .hero h1 { font-family: var(--font-display); font-size: 2.4rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .motto { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); font-size: 0.95rem; }
    .durability .label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.16em; color: var(--color-ink-500); text-align: right; }
    .durability .value { display: flex; align-items: baseline; gap: 0.3em; justify-content: flex-end; }
    .durability .big { font-family: var(--font-display); font-size: 2rem; color: var(--color-sage-deep); }
    .durability .of { font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-ink-500); }
    .durability .bar { width: 160px; height: 6px; background: var(--color-parchment-300); margin-top: 4px; margin-left: auto; }
    .durability .fill { height: 100%; background: var(--color-sage-deep); }
    .stat-bar { display: grid; grid-template-columns: repeat(5, 1fr); border-top: 1px solid var(--color-ink-900); border-bottom: 1px solid var(--color-ink-900); margin-bottom: 2em; }
    .stat-bar .cell { padding: 1em 1.2em; border-left: 1px solid rgba(26, 32, 48, 0.18); }
    .stat-bar .cell:first-child { border-left: none; }
    .stat-bar .k { font-family: var(--font-display); font-size: 9px; letter-spacing: 0.18em; color: var(--color-ink-500); }
    .stat-bar .v { font-family: var(--font-display); font-size: 1.3rem; margin-top: 0.2em; }
    .stat-bar .sub { font-family: var(--font-editorial); font-style: italic; font-size: 0.7rem; color: var(--color-ink-500); margin-top: 0.1em; }
    .two-col { display: grid; grid-template-columns: 1.4fr 1fr; gap: 2em; margin-bottom: 2em; }
    .building-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8em; margin-top: 0.8em; }
    .building { display: grid; grid-template-columns: 24px 1fr auto; gap: 0.8em; align-items: center; padding: 0.8em 1em; background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.2); }
    .building.locked { opacity: 0.55; }
    .bd-name { font-family: var(--font-display); font-size: 0.85rem; letter-spacing: 0.06em; }
    .bd-desc { font-family: var(--font-body); font-size: 0.8rem; color: var(--color-ink-500); margin-top: 0.1em; }
    .bd-status { font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; }
    .prog { width: 100%; height: 3px; background: var(--color-parchment-300); margin-top: 0.4em; }
    .prog div { height: 100%; background: var(--color-aged-gold); }
    .list { list-style: none; padding: 0; margin: 0.8em 0 0; }
    .list li { display: grid; grid-template-columns: 36px 1fr auto auto; gap: 0.6em; align-items: baseline; padding: 0.5em 0; border-top: 1px solid rgba(26, 32, 48, 0.15); font-family: var(--font-body); font-size: 0.9rem; }
    .list li.dim { opacity: 0.5; }
    .list .q { font-family: var(--font-mono); color: var(--color-wax-red); }
    .list .name { font-family: var(--font-display); font-size: 0.9rem; }
    .list .equip { font-family: var(--font-editorial); font-style: italic; font-size: 0.78rem; color: var(--color-ink-500); }
    .list .eta, .list .lock { font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-ink-500); }
    .cta-row { display: flex; gap: 0.6em; margin-top: 1.2em; }
    .mt { margin-top: 1.6em; }
    .stores { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.6em; margin-top: 0.8em; }
    .store { padding: 0.6em 0.9em; background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.2); border-left-width: 4px; }
    .store .n { font-family: var(--font-mono); font-size: 1.1rem; color: var(--color-ink-900); }
    .store .k { font-family: var(--font-editorial); font-size: 0.78rem; color: var(--color-ink-500); }
    .note { font-family: var(--font-editorial); font-style: italic; font-size: 0.85rem; color: var(--color-ink-500); margin-top: 1em; }
    .rule-deco { border: none; margin: 2em 0; }

    .taxes { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.5em 1.7em; margin: 2em 0; }
    .hint { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0.4em 0 1em; font-size: 0.92rem; }
    .tax-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6em; margin-top: 0.6em; }
    .tax-row { display: grid; grid-template-columns: 80px 50px 1fr; gap: 0.6em; align-items: center; padding: 0.4em 0; border-top: 1px solid rgba(26, 32, 48, 0.1); }
    .tax-row:first-child { border-top: none; }
    .tax-name { font-family: var(--font-display); font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-ink-700); }
    .tax-val { font-family: var(--font-mono); color: var(--color-wax-red); text-align: right; }
    .yield { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-700); margin: 1em 0 0; }
    .yield strong { font-family: var(--font-mono); font-style: normal; color: var(--color-ink-900); display: inline-flex; align-items: center; gap: 0.3em; vertical-align: middle; }
    .save-msg { font-family: var(--font-editorial); font-style: italic; color: var(--color-sage-deep); margin: 0.6em 0 0; }
    .hint.italic { font-style: italic; }
    .hint strong { color: var(--color-ink-900); font-weight: 600; }
    .mt { margin-top: 1.4em; }
    .currency-row { display: grid; grid-template-columns: 2fr 1fr auto; gap: 0.6em; margin-top: 0.6em; align-items: end; }
    .currency-row label { display: grid; gap: 0.2em; }
    .currency-row span { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--color-ink-700); }
    .currency-row input { padding: 0.5em 0.7em; background: var(--color-parchment-200); border: 1px solid var(--color-parchment-shadow); font-family: var(--font-body); }
    .set-currency { padding: 0.6em 1.2em; background: var(--color-ink-900); color: var(--color-parchment-100); border: 1px solid var(--color-ink-900); font-family: var(--font-display); font-size: 0.72em; letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; }
    .set-currency:disabled { opacity: 0.4; cursor: not-allowed; }
    @media (max-width: 800px) {
        .hero { grid-template-columns: 1fr; }
        .stat-bar { grid-template-columns: repeat(2, 1fr); }
        .stat-bar .cell:nth-child(3) { border-left: none; border-top: 1px solid rgba(26,32,48,.18); }
        .two-col { grid-template-columns: 1fr; }
        .building-grid { grid-template-columns: 1fr; }
    }
</style>
