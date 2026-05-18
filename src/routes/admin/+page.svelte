<script>
    import { user } from '$lib/stores/user.js';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Button from '../../components/ui/Button.svelte';

    const checklist = [
        { id: 'settings',   label: 'World settings',          done: true,  desc: 'Name, seed, tick interval, speed multiplier' },
        { id: 'biomes',     label: 'Biome map generated',     done: true,  desc: 'Procedural noise + cluster biome assignment' },
        { id: 'spawn-n',    label: 'Spawn point: North',      done: true,  desc: 'Within ±5 tiles of (0, -120)' },
        { id: 'spawn-e',    label: 'Spawn point: East',       done: true,  desc: 'Within ±5 tiles of (+120, 0)' },
        { id: 'spawn-s',    label: 'Spawn point: South',      done: false, desc: 'Pending placement near (0, +120)' },
        { id: 'spawn-w',    label: 'Spawn point: West',       done: false, desc: 'Pending placement near (-120, 0)' },
        { id: 'cpu',        label: 'CPU monster groups',      done: false, desc: 'Aggressive/passive seeds, see Bestiary' },
        { id: 'rules',      label: 'Rule overrides',          done: false, desc: 'Per-world morality, scavenge, retreat thresholds' },
        { id: 'announce',   label: 'World announcement',      done: false, desc: 'Opening chronicle entry & broadcast' }
    ];

    const worlds = [
        { id: 'brennec',  status: 'live',     players: 142, tick: 14802 },
        { id: 'sylgard',  status: 'live',     players: 64,  tick: 9210  },
        { id: 'morbreach',status: 'starting', players: 0,   tick: 0     },
        { id: 'volgar',   status: 'archive',  players: 31,  tick: 28104 }
    ];
</script>

<svelte:head><title>Admin — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Cartographers</div>
    <h1>Admin · World Start</h1>
    <p class="lede">Every realm begins with a checklist. None proceed until each ledger is signed.</p>
    <Flourish width={220} color="var(--color-ink-900)" />

    {#if !$user || !$user?.admin}
        <div class="warning">
            <Stamp kind="eye" size={16} />
            <span>You are viewing the admin surface in read-only preview. Access control is not yet wired — these actions will not persist.</span>
        </div>
    {/if}

    <section class="block">
        <div class="eyebrow">Worlds</div>
        <table>
            <thead>
                <tr><th>World</th><th>Status</th><th class="num">Players</th><th class="num">Tick</th><th></th></tr>
            </thead>
            <tbody>
                {#each worlds as w}
                    <tr>
                        <td class="name">{w.id}</td>
                        <td><span class="badge badge-{w.status}">{w.status}</span></td>
                        <td class="num">{w.players}</td>
                        <td class="num">{w.tick.toLocaleString()}</td>
                        <td class="act"><a href={`/admin/${w.id}`}>Open →</a></td>
                    </tr>
                {/each}
            </tbody>
        </table>
        <div class="cta-row">
            <Button variant="primary"><Stamp kind="plus" size={14} /> New world</Button>
        </div>
    </section>

    <section class="block">
        <div class="eyebrow">Start Checklist · morbreach</div>
        <ol class="checklist">
            {#each checklist as c, i}
                <li class:done={c.done}>
                    <span class="num">{String(i + 1).padStart(2, '0')}</span>
                    <span class="mark">
                        {#if c.done}
                            <Stamp kind="banner" size={16} />
                        {:else}
                            <span class="circle"></span>
                        {/if}
                    </span>
                    <div>
                        <div class="lbl">{c.label}</div>
                        <div class="dsc">{c.desc}</div>
                    </div>
                    <button class="row-act">{c.done ? 'review' : 'configure'}</button>
                </li>
            {/each}
        </ol>
    </section>

    <section class="block split">
        <div>
            <div class="eyebrow">Server health</div>
            <ul class="kv">
                <li><span>Uptime</span><span class="v mono">7d 14h 22m</span></li>
                <li><span>WebSocket clients</span><span class="v mono">238</span></li>
                <li><span>Tick latency (p95)</span><span class="v mono">12 ms</span></li>
                <li><span>DB collections</span><span class="v mono">9</span></li>
            </ul>
        </div>
        <div>
            <div class="eyebrow">Quick actions</div>
            <div class="qa">
                <Button variant="ghost"><Stamp kind="hammer" size={14} /> Force tick</Button>
                <Button variant="ghost"><Stamp kind="scroll" size={14} /> Broadcast</Button>
                <Button variant="ghost"><Stamp kind="raven" size={14} /> Spawn CPU</Button>
                <Button variant="danger"><Stamp kind="skull" size={14} /> Pause world</Button>
            </div>
        </div>
    </section>

    <p class="note">Admin actions are mock-only. The real endpoints (force-tick, CPU spawn, world pause) are not yet exposed by api/routes/router.js.</p>
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1100px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .warning { display: flex; align-items: center; gap: 0.7em; margin: 1.5em 0; padding: 0.8em 1em; background: var(--color-parchment-100); border-left: 4px solid var(--color-wax-red); font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-700); }
    .block { margin: 2.5em 0; }
    .block.split { display: grid; grid-template-columns: 1fr 1fr; gap: 2em; align-items: start; }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-body); margin-top: 0.8em; }
    thead th { text-align: left; font-family: var(--font-display); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.6em 0.4em; border-bottom: 1px solid var(--color-ink-900); }
    th.num, td.num { text-align: right; font-family: var(--font-mono); font-size: 0.85rem; }
    td { padding: 0.6em 0.4em; border-bottom: 1px solid rgba(26, 32, 48, 0.15); }
    td.name { font-family: var(--font-display); letter-spacing: 0.04em; }
    .badge { font-family: var(--font-mono); font-size: 0.7rem; padding: 0.2em 0.6em; letter-spacing: 0.08em; }
    .badge-live { background: var(--color-sage-pale); color: var(--color-sage-deep); }
    .badge-starting { background: rgba(176, 141, 74, 0.3); color: var(--color-aged-gold); }
    .badge-archive { background: var(--color-parchment-300); color: var(--color-ink-500); }
    td.act a { font-family: var(--font-display); font-size: 0.78rem; letter-spacing: 0.12em; }
    .cta-row { margin-top: 1em; }
    .checklist { list-style: none; padding: 0; margin: 0.8em 0 0; }
    .checklist li { display: grid; grid-template-columns: 36px 28px 1fr auto; gap: 0.8em; align-items: center; padding: 0.8em 0; border-top: 1px solid rgba(26, 32, 48, 0.15); opacity: 0.55; }
    .checklist li.done { opacity: 1; }
    .checklist .num { font-family: var(--font-mono); color: var(--color-ink-500); }
    .checklist .mark .circle { display: inline-block; width: 16px; height: 16px; border: 1px dashed var(--color-parchment-shadow); border-radius: 50%; }
    .checklist .lbl { font-family: var(--font-display); font-size: 0.95rem; letter-spacing: 0.04em; }
    .checklist .dsc { font-family: var(--font-editorial); font-style: italic; font-size: 0.82rem; color: var(--color-ink-500); margin-top: 0.1em; }
    .row-act { font-family: var(--font-display); font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 0.4em 0.9em; background: transparent; border: 1px solid var(--color-ink-900); cursor: pointer; }
    .kv { list-style: none; padding: 0; margin: 0.6em 0 0; }
    .kv li { display: flex; justify-content: space-between; padding: 0.5em 0; border-bottom: 1px solid rgba(26, 32, 48, 0.15); }
    .kv .v { font-family: var(--font-mono); color: var(--color-ink-700); }
    .mono { font-family: var(--font-mono); }
    .qa { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6em; margin-top: 0.6em; }
    .note { font-family: var(--font-editorial); font-style: italic; font-size: 0.85rem; color: var(--color-ink-500); margin-top: 2em; }
    @media (max-width: 700px) {
        .block.split { grid-template-columns: 1fr; }
        .qa { grid-template-columns: 1fr; }
    }
</style>
