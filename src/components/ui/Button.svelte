<script>
    // variant: 'primary' (ink), 'ghost' (outline), 'danger' (vermilion), 'soft' (parchment chip)
    let {
        variant = 'primary',
        href = undefined,
        type = 'button',
        onclick = undefined,
        disabled = false,
        children
    } = $props();
</script>

{#if href}
    <a class="btn {variant}" {href}>{@render children?.()}</a>
{:else}
    <button class="btn {variant}" {type} {disabled} {onclick}>{@render children?.()}</button>
{/if}

<style>
    .btn {
        font-family: var(--font-display);
        font-weight: 600;
        letter-spacing: 0.15em;
        font-size: 0.85em;
        text-transform: uppercase;
        padding: 0.9em 1.5em;
        border-radius: 0.15em;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        gap: 0.55em;
        align-items: center;
        justify-content: center;
        border: none;
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }
    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .btn.primary {
        background: var(--color-ink-900);
        color: var(--color-parchment-100);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 1px 0 rgba(0, 0, 0, 0.4);
    }
    .btn.primary:hover:not(:disabled) {
        background: var(--color-ink-700);
    }
    .btn.ghost {
        background: transparent;
        color: var(--color-ink-900);
        border: 0.075em solid var(--color-ink-900);
        padding: 0.85em 1.5em;
    }
    .btn.ghost:hover:not(:disabled) {
        background: rgba(26, 32, 48, 0.06);
    }
    .btn.danger {
        background: var(--color-vermilion);
        color: var(--color-parchment-100);
    }
    .btn.danger:hover:not(:disabled) {
        background: var(--color-vermilion-2);
    }
    .btn.soft {
        font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
        font-size: 0.85em;
        font-weight: 500;
        letter-spacing: normal;
        text-transform: none;
        background: var(--color-parchment-200);
        color: var(--color-ink-900);
        border: 0.075em solid var(--color-parchment-shadow);
        padding: 0.55em 0.95em;
    }
    .btn.soft:hover:not(:disabled) {
        background: var(--color-parchment-300);
    }
</style>
