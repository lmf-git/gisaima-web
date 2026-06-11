<script>
    import { onMount } from 'svelte';
    import { user } from '$lib/stores/user.js';
    import { game, currentPlayer, listenToPlayerWorldData } from '$lib/stores/game.js';
    import { diplomacy, getMyTribe } from '$lib/stores/diplomacy.js';
    import { apiPost } from '$lib/api.js';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import CompassRose from '../../components/ui/CompassRose.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Button from '../../components/ui/Button.svelte';
    import FamilyTree from '../../components/features/FamilyTree.svelte';
    import HousePicker from '../../components/specific/worlds/HousePicker.svelte';
    import DeedsPanel from '../../components/features/world/DeedsPanel.svelte';
    import Hammer from '../../components/icons/Hammer.svelte';
    import Mine from '../../components/icons/Mine.svelte';
    import Axe from '../../components/icons/Axe.svelte';
    import Fish from '../../components/icons/Fish.svelte';

    const player = $derived($currentPlayer);
    const worldId = $derived($game.worldKey);
    const initial = $derived(($user?.displayName || $user?.email || 'G').slice(0, 1).toUpperCase());

    // Tribe membership lives in the tribes collection, not the player doc, so
    // resolve it from the diplomacy store (fetched on mount).
    const myTribe = $derived(getMyTribe($diplomacy.tribes, $user?.uid));

    // ── Editable motto ──────────────────────────────────────────────
    let editingMotto = $state(false);
    let mottoDraft = $state('');
    let savingMotto = $state(false);
    function startEditMotto() {
        mottoDraft = player?.motto || '';
        editingMotto = true;
    }
    async function saveMotto() {
        if (!worldId || savingMotto) return;
        savingMotto = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/profile`, { motto: mottoDraft.trim() });
            await refreshPlayer();
            editingMotto = false;
        } catch (e) {
            alert(`Could not save motto: ${e.message}`);
        } finally {
            savingMotto = false;
        }
    }

    // ── Avatar upload ───────────────────────────────────────────────
    let uploadingAvatar = $state(false);
    let avatarError = $state('');
    async function handleAvatarChange(event) {
        avatarError = '';
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { avatarError = 'Choose an image file.'; return; }
        if (file.size > 2 * 1024 * 1024) { avatarError = 'Image must be under 2MB.'; return; }
        const dataUrl = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(file);
        }).catch(() => null);
        if (!dataUrl) { avatarError = 'Could not read that image.'; return; }
        uploadingAvatar = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/profile`, { avatar: dataUrl });
            await refreshPlayer();
        } catch (e) {
            avatarError = e.message || 'Upload failed';
        } finally {
            uploadingAvatar = false;
        }
    }

    // The four trainable skills, each with its own SVG icon. Gathering skills
    // (mining/woodcutting/fishing) track xp on the player doc and the level is
    // derived (every 100 xp → +1 level); crafting keeps its stored level.
    const SKILLS = [
        { key: 'crafting',    label: 'Crafting',    icon: Hammer },
        { key: 'mining',      label: 'Mining',      icon: Mine },
        { key: 'woodcutting', label: 'Woodcutting', icon: Axe },
        { key: 'fishing',     label: 'Fishing',     icon: Fish },
    ];
    function skillLevelFromXp(xp) { return Math.floor((Number(xp) || 0) / 100) + 1; }
    const skillLevels = $derived.by(() => {
        const s = player?.skills || {};
        return SKILLS.map(def => {
            const rec = s[def.key] || {};
            const xp = Number(rec.xp) || 0;
            const level = rec.level || skillLevelFromXp(xp);
            return {
                ...def,
                level,
                xp,
                // Progress through the current level, 0–100 (xp-based skills only).
                progress: rec.level ? null : (xp % 100),
            };
        });
    });

    // House membership is optional. From here a player can found a house, request
    // to join one (pending the founder's approval), or leave to have no house.
    let showHouseModal = $state(false);
    let houseSelection = $state(null);
    let switching = $state(false);
    let houseError = $state('');
    let actioning = $state(false); // approve/reject/cancel in flight

    const houseBase = $derived(`/worlds/${encodeURIComponent(worldId)}/houses`);

    function openHouseModal() {
        houseSelection = null;
        houseError = '';
        showHouseModal = true;
    }

    async function refreshPlayer() {
        if ($user?.uid && worldId) await listenToPlayerWorldData($user.uid, worldId);
    }

    onMount(() => { if (worldId) diplomacy.fetchTribes(worldId); });
    $effect(() => { if (worldId) diplomacy.fetchTribes(worldId); });

    async function confirmHouseSwitch() {
        if (!houseSelection || !worldId) return;
        switching = true;
        houseError = '';
        try {
            if (houseSelection.mode === 'none') {
                await apiPost(`${houseBase}/leave`, {});
            } else if (houseSelection.mode === 'join') {
                await apiPost(`${houseBase}/join`, { houseId: houseSelection.houseId });
            } else {
                await apiPost(houseBase, { name: houseSelection.houseName });
            }
            await refreshPlayer();
            showHouseModal = false;
        } catch (e) {
            houseError = e?.message || 'Could not change house';
        } finally {
            switching = false;
        }
    }

    async function approveRequest(uid) {
        if (actioning || !player?.houseId) return;
        actioning = true;
        try {
            await apiPost(`${houseBase}/${player.houseId}/approve`, { uid });
            await refreshPlayer();
        } catch (e) {
            houseError = e?.message || 'Could not approve request';
        } finally {
            actioning = false;
        }
    }

    async function rejectRequest(uid) {
        if (actioning || !player?.houseId) return;
        actioning = true;
        try {
            await apiPost(`${houseBase}/${player.houseId}/reject`, { uid });
            await refreshPlayer();
        } catch (e) {
            houseError = e?.message || 'Could not reject request';
        } finally {
            actioning = false;
        }
    }

    async function cancelOwnRequest() {
        if (actioning || !player?.pendingHouseRequest) return;
        actioning = true;
        try {
            await apiPost(`${houseBase}/cancel`, { houseId: player.pendingHouseRequest.houseId });
            await refreshPlayer();
        } catch (e) {
            houseError = e?.message || 'Could not cancel request';
        } finally {
            actioning = false;
        }
    }
</script>

<svelte:head><title>Player profile — Gisaima</title></svelte:head>

<div class="page">
    {#if !$user}
        <p class="empty italic">You are not signed in. <a href="/login">Take the oath.</a></p>
    {:else}
        <header class="hero">
            <div class="crest">
                {#if player?.avatar}
                    <img class="avatar-img" src={player.avatar} alt="Your avatar" />
                {:else}
                    <WaxSeal label={initial} color="#5b1a1f" size={84} />
                {/if}
                <label class="avatar-edit" title="Change avatar">
                    {uploadingAvatar ? '…' : 'Edit'}
                    <input type="file" accept="image/*" onchange={handleAvatarChange} disabled={uploadingAvatar} hidden />
                </label>
            </div>
            <div>
                <div class="eyebrow wax">{player?.houseName || 'Unhoused wanderer'}</div>
                <h1>{$user.displayName || ($user.isAnonymous ? 'Guest' : $user.email?.split('@')[0]) || 'Wanderer'}</h1>

                {#if editingMotto}
                    <div class="motto-edit">
                        <input
                            type="text"
                            class="motto-input"
                            placeholder="A few words to live (and die) by"
                            bind:value={mottoDraft}
                            maxlength="120"
                            disabled={savingMotto}
                        />
                        <Button variant="primary" onclick={saveMotto} disabled={savingMotto}>{savingMotto ? 'Saving…' : 'Save'}</Button>
                        <Button variant="ghost" onclick={() => (editingMotto = false)} disabled={savingMotto}>Cancel</Button>
                    </div>
                {:else}
                    <button class="motto motto-button" onclick={startEditMotto} title="Edit motto">
                        {player?.motto ? `"${player.motto}"` : 'Set a personal motto…'}
                        <span class="motto-pencil">✎</span>
                    </button>
                {/if}
                {#if avatarError}<div class="avatar-error">{avatarError}</div>{/if}
                <Flourish extraClass="page-flourish" />
            </div>
        </header>

        <section class="block">
            <div class="eyebrow">Standing</div>
            <div class="stat-grid">
                <div class="stat">
                    <div class="value">{worldId || '—'}</div>
                    <div class="label">Realm</div>
                </div>
                <div class="stat">
                    <div class="value">{player?.kills ?? 0}</div>
                    <div class="label">Kills</div>
                </div>
                <div class="stat">
                    <div class="value">{player?.lastLocation ? `${player.lastLocation.x},${player.lastLocation.y}` : '—'}</div>
                    <div class="label">Last seen</div>
                </div>
                <div class="stat">
                    {#if myTribe}
                        <div class="value tribe-value">{myTribe.tag ? `[${myTribe.tag}]` : myTribe.name}</div>
                        <div class="label">{myTribe.tag ? myTribe.name : 'Tribe'}</div>
                    {:else}
                        <div class="value"><a class="tribe-link" href="/house">No tribe</a></div>
                        <div class="label">Find a tribe</div>
                    {/if}
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
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </section>

        <section class="block">
            <div class="eyebrow">House</div>
            <div class="house-row">
                <div>
                    <div class="house-name">{player?.houseName || 'No house'}</div>
                    {#if player?.isHouseFounder}
                        <div class="lede italic">You founded this house. Wanderers may petition to join — their fate is yours to seal.</div>
                    {:else if player?.houseName}
                        <div class="lede italic">You are sworn to this house.</div>
                    {:else if player?.pendingHouseRequest}
                        <div class="lede italic">Your petition to <strong>{player.pendingHouseRequest.houseName}</strong> awaits the founder's seal.</div>
                    {:else}
                        <div class="lede italic">You walk alone. Found a house, or petition to join one.</div>
                    {/if}
                </div>
                <Button variant="ghost" onclick={openHouseModal} disabled={!worldId}>
                    {player?.houseName ? 'Change house' : 'Find a house'}
                </Button>
            </div>

            {#if player?.pendingHouseRequest}
                <div class="request-pending">
                    <span class="italic">Petition sent to <strong>{player.pendingHouseRequest.houseName}</strong> — awaiting approval.</span>
                    <Button variant="ghost" onclick={cancelOwnRequest} disabled={actioning}>Withdraw</Button>
                </div>
            {/if}

            {#if player?.isHouseFounder && (player?.houseRequests?.length ?? 0) > 0}
                <div class="requests">
                    <div class="eyebrow">Petitions to join</div>
                    <ul class="request-list">
                        {#each player.houseRequests as r (r.uid)}
                            <li class="request-item">
                                <span class="request-name">{r.displayName || 'A wanderer'}</span>
                                <span class="request-actions">
                                    <Button variant="primary" onclick={() => approveRequest(r.uid)} disabled={actioning}>Approve</Button>
                                    <Button variant="ghost" onclick={() => rejectRequest(r.uid)} disabled={actioning}>Reject</Button>
                                </span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}

            {#if houseError && !showHouseModal}<div class="modal-error">{houseError}</div>{/if}
        </section>

        <section class="block split">
            <div>
                <div class="eyebrow">Heraldry</div>
                <div class="heraldry">
                    <CompassRose size={120} color="var(--color-ink-900)" opacity={0.85} />
                    <p class="lede italic">A crest is earned. Wax bears witness. This space awaits your sigil.</p>
                </div>
            </div>
            <div>
                <div class="eyebrow">Decrees</div>
                <ul class="decrees">
                    <li><Stamp kind="scroll" size={16} /> <a href="/house">Convene the house hall</a></li>
                    <li><Stamp kind="crown" size={16} /> <a href="/rankings">View the standings</a></li>
                    <li><Stamp kind="compass" size={16} /> <a href="/map">Return to the map</a></li>
                </ul>
            </div>
        </section>

        <div class="rule-deco"></div>

        <section class="block">
            <div class="eyebrow">Lineage</div>
            <FamilyTree {worldId} currentLifeId={player?.controlledLifeId ?? player?.currentLifeId} />
        </section>

        <div class="rule-deco"></div>

        <section class="block">
            <div class="eyebrow">Deeds</div>
            <DeedsPanel />
        </section>
    {/if}
</div>

{#if showHouseModal}
    <div
        class="house-backdrop"
        onclick={() => !switching && (showHouseModal = false)}
        onkeydown={(e) => e.key === 'Escape' && !switching && (showHouseModal = false)}
        role="button"
        tabindex="0"
        aria-label="Close"
    ></div>
    <div class="house-modal" role="dialog" aria-modal="true">
        <h2 class="modal-title">Change house</h2>
        <p class="lede italic modal-lede">Found your own house, petition to join another (the founder must approve), or walk alone. Any change leaves your current house.</p>
        <HousePicker worldId={worldId} bind:selection={houseSelection} disabled={switching} />
        {#if houseError}<div class="modal-error">{houseError}</div>{/if}
        <div class="modal-actions">
            <Button variant="ghost" onclick={() => (showHouseModal = false)} disabled={switching}>Cancel</Button>
            <Button variant="primary" onclick={confirmHouseSwitch} disabled={!houseSelection || switching}>
                {switching ? 'Swearing…' : 'Confirm'}
            </Button>
        </div>
    </div>
{/if}

<style>
    .page {
        position: relative;
        z-index: 2;
        max-width: 1000px;
        margin: 0 auto;
        padding: 7em 2em 4em;
        color: var(--color-ink-900);
    }
    .empty { font-family: var(--font-editorial); color: var(--color-ink-500); text-align: center; padding: 3em 1em; }
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
        margin-bottom: 0.6em;
    }
    .motto-button {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        text-align: left;
        display: inline-flex;
        align-items: center;
        gap: 0.5em;
        font-size: 1rem;
    }
    .motto-button:hover { color: var(--color-ink-900); }
    .motto-pencil { font-style: normal; font-size: 0.8em; opacity: 0.5; }
    .motto-edit { display: flex; gap: 0.5em; align-items: center; flex-wrap: wrap; margin-bottom: 0.6em; }
    .motto-input {
        flex: 1 1 16em;
        padding: 0.5em 0.7em;
        border: 1px solid var(--color-parchment-shadow);
        background: var(--color-parchment-100);
        font-family: var(--font-editorial);
        font-style: italic;
        color: var(--color-ink-900);
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
    .avatar-edit {
        position: absolute;
        bottom: -0.3em;
        right: -0.3em;
        background: var(--color-ink-900);
        color: var(--color-parchment-100);
        font-family: var(--font-display);
        font-size: 0.6rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 0.25em 0.5em;
        border-radius: 2px;
        cursor: pointer;
    }
    .avatar-edit:hover { background: var(--color-ink-700); }
    .avatar-error { color: var(--color-wax-red); font-family: var(--font-editorial); font-style: italic; font-size: 0.85em; margin: 0.3em 0; }
    .tribe-value { color: var(--color-ink-900); }
    .tribe-link { color: var(--color-wax-red); text-decoration: none; }
    .tribe-link:hover { text-decoration: underline; }
    .block { margin: 2.5em 0; }
    .block.split { display: grid; grid-template-columns: 1fr 1fr; gap: 3em; align-items: start; }
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

    .heraldry { display: flex; gap: 1.5em; align-items: center; }
    .lede {
        font-family: var(--font-editorial);
        color: var(--color-ink-500);
        max-width: 320px;
        margin: 0;
    }
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
    .rule-deco { margin: 2em 0; }
    .house-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5em;
        flex-wrap: wrap;
        border-top: 1px solid var(--color-ink-900);
        border-bottom: 1px solid var(--color-ink-900);
        padding: 1.2em 0;
    }
    .house-name {
        font-family: var(--font-display);
        font-size: 1.8rem;
        letter-spacing: 0.04em;
        margin-bottom: 0.2em;
    }
    .request-pending {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1em;
        flex-wrap: wrap;
        padding: 0.9em 0;
        border-bottom: 1px solid var(--color-ink-900);
        font-family: var(--font-editorial);
        color: var(--color-ink-700);
    }
    .requests { margin-top: 1.2em; }
    .request-list { list-style: none; padding: 0; margin: 0.6em 0 0; display: grid; gap: 0.5em; }
    .request-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1em;
        flex-wrap: wrap;
        padding: 0.7em 0.9em;
        background: var(--color-parchment-200);
        border: 1px solid var(--color-parchment-shadow);
    }
    .request-name {
        font-family: var(--font-display);
        font-size: 1.05rem;
        letter-spacing: 0.02em;
        color: var(--color-ink-900);
    }
    .request-actions { display: flex; gap: 0.5em; }
    .house-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(14, 19, 32, 0.55);
        backdrop-filter: blur(2px);
        z-index: 999;
        cursor: pointer;
    }
    .house-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 32em;
        max-height: 90vh;
        overflow-y: auto;
        background: var(--color-parchment-100);
        border: 1px solid var(--color-ink-900);
        box-shadow: 0 2em 5em rgba(0, 0, 0, 0.35);
        padding: 1.8em 2em;
        z-index: 1000;
        color: var(--color-ink-900);
    }
    .modal-title {
        font-family: var(--font-display);
        font-size: 1.5em;
        letter-spacing: 0.04em;
        margin: 0 0 0.3em;
        text-align: center;
    }
    .modal-lede { text-align: center; max-width: none; margin: 0 auto 1.2em; }
    .modal-error {
        color: var(--color-wax-red);
        font-family: var(--font-editorial);
        font-style: italic;
        font-size: 0.9em;
        margin-top: 0.8em;
        text-align: center;
    }
    .modal-actions {
        display: flex;
        justify-content: center;
        gap: 1em;
        margin-top: 1.5em;
    }
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
        .block.split { grid-template-columns: 1fr; gap: 2em; }
        .stat-grid { grid-template-columns: repeat(2, 1fr); }
        .stat { padding: 1em 0.8em; }
        .stat .value { font-size: 1.5rem; }
        .stat:nth-child(3) { border-left: none; }
        .stat:nth-child(odd) { border-left: none; }
        .stat:nth-child(n+3) { border-top: 1px solid rgba(26,32,48,.18); }
        .house-name { font-size: 1.5rem; }
        .house-row { gap: 1em; }
        .heraldry { flex-direction: column; text-align: center; gap: 1em; }
        .lede { max-width: none; }
        .house-modal { padding: 1.4em 1.2em; }
    }
</style>
