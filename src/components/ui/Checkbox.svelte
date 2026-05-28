<script>
    let {
        checked = $bindable(false),
        label = '',
        id = '',
        disabled = false,
        onchange = undefined
    } = $props();

    function toggle() {
        if (disabled) return;
        checked = !checked;
        onchange?.(checked);
    }
</script>

<label class="checkbox-label" class:disabled>
    <div
        class="checkbox"
        class:checked
        class:disabled
        onclick={toggle}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle()}
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        tabindex={disabled ? -1 : 0}
        {id}
    >
        {#if checked}
            <svg viewBox="0 0 24 24" class="check-icon" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        {/if}
    </div>
    {#if label}
        <span class="checkbox-text">{label}</span>
    {/if}
</label>

<style>
    .checkbox-label {
        display: inline-flex;
        align-items: center;
        gap: 0.5em;
        cursor: pointer;
        user-select: none;
    }

    .checkbox-label.disabled {
        cursor: not-allowed;
        opacity: 0.45;
    }

    .checkbox {
        width: 1.2em;
        height: 1.2em;
        border: 0.075em solid rgba(176, 141, 74, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(26, 32, 48, 0.55);
        transition: background-color 0.15s, border-color 0.15s;
        flex-shrink: 0;
        cursor: pointer;
    }

    .checkbox:focus {
        outline: none;
        border-color: var(--color-aged-gold, #b08d4a);
    }

    .checkbox.checked {
        background-color: var(--color-aged-gold, #b08d4a);
        border-color: var(--color-aged-gold, #b08d4a);
    }

    .checkbox.disabled {
        cursor: not-allowed;
    }

    .check-icon {
        width: 100%;
        height: 100%;
        color: var(--color-ink-900, #1a2030);
    }

    .checkbox-text {
        color: var(--color-parchment-100, #fbf6e7);
        font-weight: 500;
    }
</style>
