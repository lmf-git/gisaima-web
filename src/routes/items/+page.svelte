<script>
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';

    // Roadmap-inspired named items + general bestiary placeholder
    const NAMED = [
        { name: "Charts of James",        rarity: 'mythical',  glyph: 'eye',           desc: 'Best sight in game. Reveals dozens of tiles around the bearer.' },
        { name: "Ryan's Warhammer",       rarity: 'legendary', glyph: 'hammer',        desc: 'Strongest boost. +24 atk · +6 power. Demons take note of its bearer.' },
        { name: "Nathan's Olive Branch",  rarity: 'legendary', glyph: 'wheat',         desc: 'Best kindness item. Halves morality decay for the bearer.' },
        { name: "Rahman Abacus",          rarity: 'legendary', glyph: 'coin',          desc: 'Best trade advantage. +20% market yield.' },
        { name: "Suleman's Pendant",      rarity: 'legendary', glyph: 'star',          desc: 'Bearer is shown vividly to all scouts. Attention-seeker item.' },
        { name: 'Mountain Crystal',       rarity: 'rare',      glyph: 'stone',         desc: 'Rare crafting material. Used in light & sight enchantments.' },
        { name: 'Mysterious Artifact',    rarity: 'rare',      glyph: 'scroll',        desc: '+8 power. Origin unknown.' },
        { name: 'Bone Amulet',            rarity: 'uncommon',  glyph: 'star',          desc: 'Carved from monster ribs. +1 atk · +1 def.' },
        { name: 'Iron Sword',             rarity: 'uncommon',  glyph: 'sword',         desc: '+10 atk.' }
    ];

    const BESTIARY = [
        { name: 'Goblin Scout',  glyph: 'beast',  personality: 'aggressive',  notes: 'Travels in 3–6. Drops crude weapons.' },
        { name: 'Dire Wolf',     glyph: 'beast',  personality: 'territorial', notes: 'Defends a den. Drops pelts.' },
        { name: 'Bog Wight',     glyph: 'skull',  personality: 'passive',     notes: 'Only attacks if struck. Wet ground favours them.' },
        { name: 'Hill Bandit',   glyph: 'sword',  personality: 'aggressive',  notes: 'Player-like. Rare drop: stolen coin.' },
        { name: 'Mountain Troll', glyph: 'shield',personality: 'territorial', notes: 'Heavy, slow, terrifying.' },
        { name: 'Raven Familiar', glyph: 'raven', personality: 'curious',     notes: 'Not hostile. Drops: feather.' },
        { name: 'Wisp',          glyph: 'star',   personality: 'fleeing',     notes: 'Cannot be killed, only chased.' },
        { name: 'Old Lich',      glyph: 'crown',  personality: 'aggressive',  notes: 'Mini-boss tier. Drops ancient fragments.' }
    ];

    const RAR = {
        common:    { c: 'var(--color-ink-300)',    l: 'Common' },
        uncommon:  { c: 'var(--color-sage-deep)',  l: 'Uncommon' },
        rare:      { c: 'var(--color-wax-red)',    l: 'Rare' },
        epic:      { c: 'var(--color-aged-gold)',  l: 'Epic' },
        legendary: { c: 'var(--color-vermilion)',  l: 'Legendary' },
        mythical:  { c: 'var(--color-wax-red)',    l: 'Mythical' }
    };
</script>

<svelte:head><title>Bestiary & Items — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Catalogue</div>
    <h1>Bestiary & Items</h1>
    <p class="lede">Named things, named beasts. What may be held, what may be slain.</p>
    <Flourish extraClass="page-flourish" />

    <section class="block">
        <div class="eyebrow">Named Items</div>
        <div class="grid">
            {#each NAMED as i}
                <div class="item" style="border-left-color: {RAR[i.rarity].c};">
                    <div class="i-head">
                        <Stamp kind={i.glyph} size={20} />
                        <div>
                            <div class="i-name">{i.name}</div>
                            <div class="i-rar" style="color: {RAR[i.rarity].c};">{RAR[i.rarity].l}</div>
                        </div>
                    </div>
                    <p class="i-desc">{i.desc}</p>
                </div>
            {/each}
        </div>
    </section>

    <hr class="rule-deco" />

    <section class="block">
        <div class="eyebrow">Bestiary</div>
        <ul class="best">
            {#each BESTIARY as b}
                <li>
                    <Stamp kind={b.glyph} size={20} />
                    <div>
                        <div class="b-name">{b.name}</div>
                        <div class="b-meta"><em>{b.personality}</em> · {b.notes}</div>
                    </div>
                </li>
            {/each}
        </ul>
    </section>
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1100px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .block { margin: 2.5em 0; }
    @media (max-width: 600px) {
        .page { padding: 6em 1.2em 3em; }
        h1 { font-size: 1.9rem; }
        .grid { grid-template-columns: 1fr; }
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.8em; margin-top: 0.8em; }
    .item { padding: 0.9em 1.1em; background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.2); border-left-width: 4px; }
    .i-head { display: flex; align-items: center; gap: 0.7em; color: var(--color-ink-700); }
    .i-name { font-family: var(--font-display); font-size: 1rem; letter-spacing: 0.04em; }
    .i-rar { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; }
    .i-desc { font-family: var(--font-body); font-size: 0.9rem; margin: 0.5em 0 0; color: var(--color-ink-700); }
    .best { list-style: none; padding: 0; margin: 0.8em 0 0; }
    .best li { display: grid; grid-template-columns: 30px 1fr; gap: 0.7em; padding: 0.6em 0; border-top: 1px solid rgba(26, 32, 48, 0.15); align-items: start; color: var(--color-ink-700); }
    .b-name { font-family: var(--font-display); font-size: 0.95rem; letter-spacing: 0.04em; color: var(--color-ink-900); }
    .b-meta { font-family: var(--font-body); font-size: 0.85rem; color: var(--color-ink-500); }
    .b-meta em { color: var(--color-wax-red); font-style: italic; }
    .rule-deco { border: none; margin: 2em 0; }
</style>
