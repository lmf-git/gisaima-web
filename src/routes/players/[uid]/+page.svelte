<script>
    import { page } from '$app/stores';
    import { game } from '$lib/stores/game.js';
    import { apiGet } from '$lib/api.js';
    import WaxSeal from '../../../components/ui/WaxSeal.svelte';
    import Flourish from '../../../components/ui/Flourish.svelte';
    import Stamp from '../../../components/ui/Stamp.svelte';
    import Human from '../../../components/icons/Human.svelte';
    import Elf from '../../../components/icons/Elf.svelte';
    import Dwarf from '../../../components/icons/Dwarf.svelte';
    import Goblin from '../../../components/icons/Goblin.svelte';
    import Fairy from '../../../components/icons/Fairy.svelte';
    import Hammer from '../../../components/icons/Hammer.svelte';
    import Mine from '../../../components/icons/Mine.svelte';
    import Axe from '../../../components/icons/Axe.svelte';
    import Fish from '../../../components/icons/Fish.svelte';

    const uid = $derived($page.params.uid);
    const worldId = $derived($game.worldKey);

    let profile = $state(null);
    let loading = $state(true);
    let error = $state('');

    // Re-fetch whenever the target player or world changes.
    $effect(() => {
        const u = uid;
        const w = worldId;
        if (!u || !w) { loading = false; return; }
        loading = true;
        error = '';
        apiGet(`/worlds/${encodeURIComponent(w)}/players/${encodeURIComponent(u)}`)
            .then((data) => { profile = data; })
            .catch((e) => { error = e?.message || 'Could not load this profile.'; profile = null; })
            .finally(() => { loading = false; });
    });

    const RACE_ICON = { human: Human, elf: Elf, dwarf: Dwarf, goblin: Goblin, fairy: Fairy };
    const raceIcon = $derived(RACE_ICON[(profile?.race || '').toLowerCase()] || null);
    const initial = $derived((profile?.displayName || 'W').slice(0, 1).toUpperCase());
    const fmt = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
    const joinedDate = $derived(
        profile?.joined ? new Date(profile.joined).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
    );

    // Skills mirror the self-profile: gathering skills derive level from xp
    // (every 100 xp → +1 level), crafting keeps its stored level.
    const SKILLS = [
        { key: 'crafting',    label: 'Crafting',    icon: Hammer },
        { key: 'mining',      label: 'Mining',      icon: Mine },
        { key: 'woodcutting', label: 'Woodcutting', icon: Axe },
        { key: 'fishing',     label: 'Fishing',     icon: Fish },
    ];
    const skillLevelFromXp = (xp) => Math.floor((Number(xp) || 0) / 100) + 1;
    const skillLevels = $derived.by(() => {
        const s = profile?.skills || {};
        return SKILLS.map((def) => {
            const rec = s[def.key] || {};
            const xp = Number(rec.xp) || 0;
            const level = rec.level || skillLevelFromXp(xp);
            return { ...def, level, xp, progress: rec.level ? null : (xp % 100) };
        });
    });
</script>

<svelte:head><title>{profile?.displayName ? `${profile.displayName} — Gisaima` : 'Player profile — Gisaima'}</title></svelte:head>

<div class="page">
    {#if !worldId}
        <p class="empty italic">Select a world to view its players. <a href="/worlds">Choose a realm.</a></p>
    {:else if loading}
        <p class="empty italic">Reading the ledger…</p>
    {:else if error}
        <p class="empty italic">{error}</p>
    {:else if profile}
        <header class="hero">
            <div class="crest">
                {#if profile.avatar}
                    <img class="avatar-img" src={profile.avatar} alt="{profile.displayName || 'Player'} avatar" />
                {:else}
                    <WaxSeal label={initial} color="#5b1a1f" size={84} />
                {/if}
            </div>
            <div>
                <div class="eyebrow wax">{profile.houseName || 'Unhoused wanderer'}</div>
                <h1>{profile.displayName || 'Wanderer'}</h1>
                <p class="motto">{profile.motto ? `"${profile.motto}"` : 'This wanderer keeps their own counsel.'}</p>
                <Flourish extraClass="page-flourish" />
            </div>
        </header>

        <section class="block">
            <div class="eyebrow">Standing</div>
            <div class="stat-grid">
                <div class="stat">
                    <div class="value race-value">
                        {#if raceIcon}
                            {@const RaceIcon = raceIcon}
                            <span class="race-glyph"><RaceIcon extraClass="race-svg" /></span>
                        {/if}
                        {fmt(profile.race) || '—'}
                    </div>
                    <div class="label">Race</div>
                </div>
                <div class="stat">
                    <div class="value">{profile.sex === 'm' ? 'Male' : profile.sex === 'f' ? 'Female' : '—'}</div>
                    <div class="label">Sex</div>
                </div>
                <div class="stat">
                    <div class="value">{profile.alive ? 'Living' : 'Fallen'}</div>
                    <div class="label">Status</div>
                </div>
                <div class="stat">
                    <div class="value">{joinedDate}</div>
                    <div class="label">Sworn in</div>
                </div>
            </div>
        </section>

        <section class="block">
            <div class="eyebrow">Skills</div>
            <div class="skills-grid">
                {#each skillLevels as skill (skill.key)}
                    <div class="skill-card">
                        <div class="skill-icon"><skill.icon size="1.6em" extraClass="skill-svg" /></div>
                        <div class="skill-body">
                            <div class="skill-top">
                                <span class="skill-name">{skill.label}</span>
                                <span class="skill-level">Lvl {skill.level}</span>
                            </div>
                            {#if skill.progress !== null}
                                <div class="skill-bar" title="{skill.progress}/100 XP to next level">
                                    <span style="width: {skill.progress}%;"></span>
                                </div>
                                <div class="skill-xp">
                                    <span>{skill.xp.toLocaleString()} XP</span>
                                    <span>{100 - skill.progress} to Lvl {skill.level + 1}</span>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </section>

        <section class="block">
            <div class="eyebrow">Decrees</div>
            <ul class="decrees">
                <li><Stamp kind="compass" size={16} /> <a href="/map">Return to the map</a></li>
                <li><Stamp kind="crown" size={16} /> <a href="/rankings">View the standings</a></li>
            </ul>
        </section>
    {/if}
</div>

<style>
    .page {
        max-width: 56em;
        margin: 0 auto;
        padding: 7em 2em 4em;
        color: var(--color-ink-900);
    }
    .empty { font-family: var(--font-editorial); color: var(--color-ink-500); text-align: center; padding: 3em 1em; }
    .empty a { color: var(--color-wax-red); }
    .italic { font-style: italic; }
    .hero {
        display: flex;
        gap: 2em;
        align-items: center;
        margin-bottom: 2.5em;
    }
    .eyebrow.wax { color: var(--color-wax-red); }
    .hero h1 {
        font-family: var(--font-display);
        font-size: 2.6rem;
        margin: 0.2em 0 0.1em;
        letter-spacing: 0.04em;
    }
    .motto {
        font-family: var(--font-editorial);
        font-style: italic;
        color: var(--color-ink-500);
        margin: 0 0 0.6em;
    }
    .crest { position: relative; }
    .avatar-img {
        width: 84px;
        height: 84px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--color-wax-red);
        display: block;
    }
    .block { margin: 2.5em 0; }
    .stat-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0;
        border-top: 1px solid var(--color-ink-900);
        border-bottom: 1px solid var(--color-ink-900);
    }
    .stat {
        padding: 1.2em 1em;
        border-left: 1px solid rgba(26, 32, 48, 0.18);
    }
    .stat:first-child { border-left: none; }
    .stat .value {
        font-family: var(--font-display);
        font-size: 1.8rem;
        letter-spacing: 0.04em;
    }
    .race-value { display: flex; align-items: center; gap: 0.4em; }
    .race-glyph {
        display: inline-flex;
        width: 1.1em;
        height: 1.1em;
        color: var(--color-wax-red);
    }
    :global(.race-svg) { width: 100%; height: 100%; }
    .stat .label {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--color-ink-500);
        margin-top: 0.3em;
    }
    .skills-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.8em;
        border-top: 1px solid var(--color-ink-900);
        border-bottom: 1px solid var(--color-ink-900);
        padding: 1em 0;
    }
    .skill-card { display: flex; align-items: center; gap: 0.8em; }
    .skill-icon {
        flex: 0 0 auto;
        width: 2.4em;
        height: 2.4em;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-wax-red);
        border: 1px solid rgba(26, 32, 48, 0.18);
        border-radius: 50%;
        background: var(--color-parchment-100);
    }
    .skill-body { flex: 1; min-width: 0; }
    .skill-top { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5em; }
    .skill-name { font-family: var(--font-display); font-size: 0.95rem; letter-spacing: 0.03em; }
    .skill-level { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-ink-500); }
    .skill-bar { margin-top: 0.35em; height: 5px; background: var(--color-parchment-300); border-radius: 2px; overflow: hidden; }
    .skill-bar span { display: block; height: 100%; background: var(--color-sage-deep, #3f5a4e); }
    .skill-xp { display: flex; justify-content: space-between; gap: 0.5em; margin-top: 0.25em; font-family: var(--font-mono); font-size: 0.68rem; color: var(--color-ink-500); }

    .decrees { list-style: none; padding: 0; margin: 0; }
    .decrees li {
        display: flex;
        align-items: center;
        gap: 0.7em;
        padding: 0.7em 0;
        border-top: 1px solid rgba(26, 32, 48, 0.15);
        font-family: var(--font-body);
    }
    .decrees li:first-child { border-top: none; }
    .decrees a { color: var(--color-ink-900); text-decoration: none; }
    .decrees a:hover { color: var(--color-wax-red); }

    @media (max-width: 700px) {
        .page { padding: 5em 1.2em 3em; }
        .hero {
            flex-direction: column;
            text-align: center;
            gap: 1.2em;
            align-items: center;
            margin-bottom: 2em;
        }
        .hero h1 { font-size: 2rem; }
        .motto { font-size: 0.95rem; }
        .block { margin: 2em 0; }
        .stat-grid { grid-template-columns: repeat(2, 1fr); }
        .stat { padding: 1em 0.8em; }
        .stat .value { font-size: 1.5rem; }
        .stat:nth-child(odd) { border-left: none; }
        .stat:nth-child(n+3) { border-top: 1px solid rgba(26,32,48,.18); }
        .race-value { justify-content: center; }
    }
</style>
