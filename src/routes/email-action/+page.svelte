<script>
    // Legacy route — the email sign-in flow now lives at /login/verify. Forward
    // any inbound link (preserving its query, e.g. ?token=…) so old links resolve.
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    onMount(() => {
        const qs = $page.url.search || '';
        goto(`/login/verify${qs}`, { replaceState: true });
    });
</script>

<div class="redirecting">
    <p>Redirecting…</p>
</div>

<style>
    .redirecting {
        max-width: 26em;
        margin: 8em auto;
        text-align: center;
        color: var(--color-ink-700);
        font-family: var(--font-editorial);
        font-style: italic;
    }
</style>
