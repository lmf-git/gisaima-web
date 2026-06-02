<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { completeEmailLogin } from '$lib/stores/user';

    let status = $state('verifying'); // 'verifying' | 'error'
    let error = $state('');

    onMount(async () => {
        const token = $page.url.searchParams.get('token');
        if (!token) {
            status = 'error';
            error = 'This sign-in link is missing its token.';
            return;
        }
        const result = await completeEmailLogin(token);
        if (result.success) {
            goto('/worlds');
        } else {
            status = 'error';
            error = result.error || 'This sign-in link is invalid or has expired.';
        }
    });
</script>

<div class="verify-container">
    {#if status === 'verifying'}
        <div class="spinner"></div>
        <p>Signing you in…</p>
    {:else}
        <h1>Sign-in failed</h1>
        <p class="error">{error}</p>
        <a href="/login" class="link">Back to login</a>
    {/if}
</div>

<style>
    .verify-container {
        max-width: 26em;
        width: 100%;
        padding: 2.5em;
        margin: 8em auto 2em;
        text-align: center;
        color: var(--color-ink-700);
        font-family: var(--font-editorial);
    }
    h1 {
        font-family: var(--font-display);
        color: var(--color-ink-900);
        margin-bottom: 0.5em;
    }
    .error {
        color: var(--color-wax-red);
        font-style: italic;
    }
    .link {
        display: inline-block;
        margin-top: 1.5em;
        color: var(--color-wax-red);
        font-family: var(--font-display);
        letter-spacing: 0.06em;
        text-decoration: none;
    }
    .spinner {
        width: 2em;
        height: 2em;
        margin: 0 auto 1em;
        border: 0.25em solid rgba(26, 32, 48, 0.15);
        border-top-color: var(--color-ink-900);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
</style>
