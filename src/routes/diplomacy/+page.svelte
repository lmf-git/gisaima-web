<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Button from '../../components/ui/Button.svelte';

    let tribes = $state([]);
    let myTribe = $state(null);
    let loading = $state(true);
    let error = $state(null);

    let form = $state({ name: '', tag: '' });
    let posting = $state(false);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/tribes`);
            tribes = Array.isArray(r) ? r : (r?.tribes || r?.items || []);
            myTribe = r?.mine || tribes.find((t) => (t.members || []).some((m) => m.uid === $user?.uid)) || null;
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function create(e) {
        e.preventDefault();
        posting = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/tribes`, {
                name: form.name.trim(),
                tag: form.tag.trim().toUpperCase()
            });
            form = { name: '', tag: '' };
            await load();
        } catch (e) {
            alert(`Failed: ${e.message}`);
        } finally {
            posting = false;
        }
    }

    async function join(tribeId) {
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/tribes/join`, { tribeId });
            await load();
        } catch (e) { alert(`Join failed: ${e.message}`); }
    }

    async function leave() {
        if (!confirm('Leave your tribe?')) return;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/tribes/leave`, {});
            await load();
        } catch (e) { alert(`Leave failed: ${e.message}`); }
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Diplomacy — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Council of Banners</div>
    <h1>Diplomacy</h1>
    <p class="lede">Alliances are signed in wax. The Chronicle keeps every oath, and every breach.</p>
    <Flourish width={220} color="var(--color-ink-900)" />

    {#if loading}
        <p class="empty italic">Reading the heraldry rolls…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else}
        {#if myTribe}
            <section class="block my-tribe">
                <div class="eyebrow">Your tribe</div>
                <div class="tribe-row">
                    <WaxSeal label={(myTribe.tag || myTribe.name || 'T')[0]} color="#16393f" size={56} />
                    <div class="tribe-meta">
                        <div class="tribe-name">
                            <span class="tribe-tag">[{myTribe.tag}]</span> {myTribe.name}
                        </div>
                        <div class="tribe-sub">{(myTribe.members || []).length} members</div>
                    </div>
                    <Button variant="ghost" onclick={leave}>Leave tribe</Button>
                </div>
            </section>
        {:else if $user && !$user.isAnonymous}
            <section class="block">
                <form class="form" onsubmit={create}>
                    <div class="eyebrow">Found a new tribe</div>
                    <div class="row">
                        <label>
                            <span>Name</span>
                            <input bind:value={form.name} required placeholder="House of the Hill" />
                        </label>
                        <label>
                            <span>Tag</span>
                            <input bind:value={form.tag} required maxlength="6" placeholder="HOTH" />
                        </label>
                    </div>
                    <Button variant="primary" type="submit" disabled={posting}>
                        {posting ? 'Sealing…' : 'Raise the banner'}
                    </Button>
                </form>
            </section>
        {/if}

        <section class="block">
            <div class="eyebrow">Tribes in the realm</div>
            {#if !tribes.length}
                <p class="empty italic">No tribes yet — be the first.</p>
            {:else}
                <ul class="list">
                    {#each tribes as t}
                        <li>
                            <WaxSeal label={(t.tag || t.name || 'T')[0]} color="#3f5a4e" size={42} />
                            <div>
                                <div class="t-name"><span class="t-tag">[{t.tag}]</span> {t.name}</div>
                                <div class="t-sub">{(t.members || []).length} member{(t.members || []).length === 1 ? '' : 's'}</div>
                            </div>
                            {#if !myTribe && $user && !$user.isAnonymous}
                                <button class="join" onclick={() => join(t._id || t.tribeId)}>
                                    <Stamp kind="banner" size={12} /> Join
                                </button>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>
    {/if}
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1000px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .block { margin: 2em 0; }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .my-tribe { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.3em 1.5em; }
    .tribe-row { display: grid; grid-template-columns: 70px 1fr auto; gap: 1.2em; align-items: center; }
    .tribe-name { font-family: var(--font-display); font-size: 1.3rem; letter-spacing: 0.04em; }
    .tribe-tag { color: var(--color-wax-red); font-family: var(--font-mono); font-size: 0.85rem; }
    .tribe-sub { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin-top: 0.2em; }
    .form { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.3em 1.5em; max-width: 480px; display: grid; gap: 0.7em; }
    .form .row { display: grid; grid-template-columns: 2fr 1fr; gap: 0.6em; }
    .form label { display: grid; gap: 0.2em; }
    .form label span { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--color-ink-700); }
    .form input { padding: 0.5em 0.7em; background: var(--color-parchment-200); border: 1px solid var(--color-parchment-shadow); font-family: var(--font-body); }
    .list { list-style: none; padding: 0; margin: 0.8em 0 0; display: grid; gap: 0.7em; }
    .list li { display: grid; grid-template-columns: 50px 1fr auto; gap: 1em; align-items: center; background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.2); padding: 0.85em 1.1em; }
    .t-name { font-family: var(--font-display); font-size: 1.05rem; letter-spacing: 0.04em; }
    .t-tag { color: var(--color-wax-red); font-family: var(--font-mono); font-size: 0.8rem; }
    .t-sub { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); font-size: 0.85rem; }
    .join { padding: 0.5em 1em; background: var(--color-ink-900); color: var(--color-parchment-100); border: 1px solid var(--color-ink-900); font-family: var(--font-display); font-size: 0.75em; letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4em; }
    .join:hover { background: var(--color-ink-700); }
</style>
