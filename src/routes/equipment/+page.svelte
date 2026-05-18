<script>
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';

    // 11 EQUIPMENT_SLOTS — port from reference
    const SLOTS = [
        { k: 'helmet',   name: 'Helmet',   glyph: 'shield', row: 0, col: 1, item: 'Iron Helmet',       rarity: 'uncommon', stats: '+4 def' },
        { k: 'back',     name: 'Cape',     glyph: 'banner', row: 1, col: 0, item: 'Monster Hide Cape', rarity: 'uncommon', stats: '+2 def' },
        { k: 'torso',    name: 'Torso',    glyph: 'shield', row: 1, col: 1, item: 'Iron Body',         rarity: 'uncommon', stats: '+6 def' },
        { k: 'amulet',   name: 'Amulet',   glyph: 'star',   row: 1, col: 2, item: 'Bone Amulet',       rarity: 'uncommon', stats: '+1 atk · +1 def' },
        { k: 'weapon',   name: 'Weapon',   glyph: 'sword',  row: 2, col: 0, item: 'Iron Sword',        rarity: 'uncommon', stats: '+10 atk' },
        { k: 'legs',     name: 'Legs',     glyph: 'shield', row: 2, col: 1, item: 'Leather Legs',      rarity: 'common',   stats: '+1 def' },
        { k: 'shield',   name: 'Shield',   glyph: 'shield', row: 2, col: 2, item: 'Iron Shield',       rarity: 'uncommon', stats: '+7 def' },
        { k: 'bracelet', name: 'Bracelet', glyph: 'star',   row: 3, col: 0, item: 'Leather Gloves',    rarity: 'common',   stats: '+1 def' },
        { k: 'ring1',    name: 'Ring',    glyph: 'star',    row: 3, col: 1, item: null },
        { k: 'ring2',    name: 'Ring',    glyph: 'star',    row: 3, col: 2, item: null },
        { k: 'boots',    name: 'Boots',   glyph: 'shield',  row: 4, col: 1, item: 'Leather Boots',     rarity: 'common',   stats: '+1 def · +1 spd' }
    ];

    const BAG = [
        ['Wooden Sword',        'common',   'weapon',   '+2 atk'],
        ['Stone Sword',         'common',   'weapon',   '+5 atk'],
        ['Leather Cap',         'common',   'helmet',   '+1 def'],
        ['Wooden Shield',       'common',   'shield',   '+3 def'],
        ['Leather Body',        'common',   'torso',    '+2 def'],
        ['Mountain Crystal',    'rare',     'gem',      'material'],
        ['Crude Weapon',        'common',   'weapon',   '+3 atk · monster drop'],
        ['Ancient Fragment',    'rare',     'artifact', 'material'],
        ['Mysterious Artifact', 'rare',     'artifact', '+8 power']
    ];

    const RAR = {
        common:    'var(--color-ink-300)',
        uncommon:  'var(--color-sage-deep)',
        rare:      'var(--color-wax-red)',
        epic:      'var(--color-aged-gold)',
        legendary: 'var(--color-vermilion)',
        mythic:    'var(--color-wax-red)'
    };

    const ACHIEVEMENTS = [
        { name: 'First Blood',     desc: 'Win your first battle.',          done: true },
        { name: 'Settler',         desc: 'Found a settlement.',             done: true },
        { name: 'Wayfarer',        desc: 'Travel 100 tiles.',               done: true },
        { name: 'Hoarder',         desc: 'Store 1,000 of any resource.',    done: false },
        { name: 'Banner Bearer',   desc: 'Join or found a tribe.',          done: true },
        { name: 'Knight Errant',   desc: 'Reach Knight rank.',              done: false },
        { name: 'Bounty Hunter',   desc: 'Claim a bounty.',                 done: false },
        { name: 'Master Builder',  desc: 'Raise a building to L5.',         done: false },
        { name: 'Chronicler',      desc: 'Be cited in a world report.',     done: false }
    ];

    const totalStats = { atk: 10, def: 21, spd: 1 };
</script>

<svelte:head><title>Loadout — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">Sir Edran of the Hill · Knight · Lvl 4</div>
    <h1>Loadout</h1>
    <p class="lede">Eleven slots, one body. What hangs on a knight makes the difference between glory and a quiet grave.</p>
    <Flourish width={240} color="var(--color-ink-900)" />

    <div class="grid">
        <section class="doll">
            <div class="eyebrow">Equipment grid</div>
            <div class="paper-doll">
                <svg class="body" viewBox="0 0 60 100">
                    <circle cx="30" cy="12" r="8" fill="none" stroke="currentColor" stroke-width=".5" />
                    <path d="M22 22 L 18 50 L 22 80 L 28 80 L 30 50 L 32 80 L 38 80 L 42 50 L 38 22 Z" fill="none" stroke="currentColor" stroke-width=".5" />
                </svg>
                {#each SLOTS as s}
                    <div
                        class="slot {s.item ? 'filled' : 'empty'}"
                        style="
                            grid-column: {s.col + 1};
                            grid-row: {s.row + 1};
                            border-color: {s.item ? RAR[s.rarity] : 'var(--color-parchment-shadow)'};
                        "
                    >
                        <div class="slot-head">
                            <Stamp kind={s.glyph} size={14} />
                            <span class="slot-name">{s.name.toUpperCase()}</span>
                        </div>
                        {#if s.item}
                            <div class="item">{s.item}</div>
                            <div class="item-stats">{s.stats}</div>
                        {:else}
                            <div class="empty-text">— empty —</div>
                        {/if}
                    </div>
                {/each}
            </div>
        </section>

        <section>
            <div class="eyebrow">Bag</div>
            <div class="bag">
                {#each BAG as [name, r, kind, stats]}
                    <div class="bag-item" style="border-left-color: {RAR[r]};">
                        <div class="b-name">{name}</div>
                        <div class="b-meta">{kind} · {stats}</div>
                    </div>
                {/each}
            </div>
        </section>

        <section>
            <div class="eyebrow">Battle Stats</div>
            <div class="stat-block">
                <div class="big"><span class="num">{totalStats.atk}</span><span class="label">ATK</span></div>
                <div class="big"><span class="num">{totalStats.def}</span><span class="label">DEF</span></div>
                <div class="big"><span class="num">{totalStats.spd}</span><span class="label">SPD</span></div>
            </div>

            <div class="eyebrow mt">Achievements</div>
            <ul class="ach">
                {#each ACHIEVEMENTS as a}
                    <li class:done={a.done}>
                        {#if a.done}
                            <WaxSeal glyph="star" color="#b08d4a" size={26} />
                        {:else}
                            <span class="placeholder"></span>
                        {/if}
                        <div>
                            <div class="a-name">{a.name}</div>
                            <div class="a-desc">{a.desc}</div>
                        </div>
                    </li>
                {/each}
            </ul>
        </section>
    </div>

    <p class="note">Loadout data is mocked. Wiring requires the EQUIPMENT_SLOTS shared definition and per-player inventory.</p>
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1300px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; max-width: 680px; }
    .grid { display: grid; grid-template-columns: 1.1fr 1.3fr 1fr; gap: 2em; margin-top: 2em; }
    .doll { background: linear-gradient(180deg, var(--color-parchment-100), var(--color-parchment-200)); border: 1px solid var(--color-ink-900); padding: 1.5em; }
    .paper-doll {
        margin-top: 0.8em;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(5, 1fr);
        gap: 0.5em;
        aspect-ratio: 3 / 5;
        position: relative;
    }
    .paper-doll .body { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.06; pointer-events: none; }
    .slot { padding: 0.5em 0.7em; border: 1px solid var(--color-parchment-shadow); background: var(--color-parchment-100); display: flex; flex-direction: column; justify-content: space-between; min-height: 60px; }
    .slot.empty { border-style: dashed; background: rgba(176, 141, 74, 0.08); }
    .slot-head { display: flex; align-items: center; gap: 0.4em; color: var(--color-ink-500); }
    .slot-name { font-family: var(--font-display); font-size: 8px; letter-spacing: 0.18em; }
    .item { font-family: var(--font-display); font-size: 0.85rem; letter-spacing: 0.04em; margin-top: 0.3em; }
    .item-stats { font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-ink-500); }
    .empty-text { font-family: var(--font-editorial); font-style: italic; font-size: 0.7rem; color: var(--color-ink-300); }
    .bag { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5em; margin-top: 0.8em; }
    .bag-item { padding: 0.5em 0.8em; background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.18); border-left-width: 4px; }
    .b-name { font-family: var(--font-display); font-size: 0.85rem; }
    .b-meta { font-family: var(--font-editorial); font-style: italic; font-size: 0.7rem; color: var(--color-ink-500); }
    .stat-block { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-top: 1px solid var(--color-ink-900); border-bottom: 1px solid var(--color-ink-900); margin-top: 0.6em; }
    .stat-block .big { padding: 1em 0.7em; border-left: 1px solid rgba(26, 32, 48, 0.18); text-align: center; }
    .stat-block .big:first-child { border-left: none; }
    .stat-block .num { display: block; font-family: var(--font-display); font-size: 1.8rem; color: var(--color-ink-900); }
    .stat-block .label { display: block; font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.18em; color: var(--color-ink-500); margin-top: 0.2em; }
    .mt { margin-top: 1.4em; }
    .ach { list-style: none; padding: 0; margin: 0.8em 0 0; }
    .ach li { display: grid; grid-template-columns: 30px 1fr; gap: 0.7em; padding: 0.6em 0; border-top: 1px solid rgba(26, 32, 48, 0.15); opacity: 0.55; }
    .ach li.done { opacity: 1; }
    .ach .placeholder { width: 26px; height: 26px; border: 1px dashed var(--color-parchment-shadow); border-radius: 50%; }
    .a-name { font-family: var(--font-display); font-size: 0.9rem; }
    .a-desc { font-family: var(--font-editorial); font-style: italic; font-size: 0.78rem; color: var(--color-ink-500); }
    .note { font-family: var(--font-editorial); font-style: italic; font-size: 0.85rem; color: var(--color-ink-500); margin-top: 2em; }
    @media (max-width: 900px) {
        .grid { grid-template-columns: 1fr; }
    }
</style>
