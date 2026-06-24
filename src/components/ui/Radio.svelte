<script>
    let {
        group = $bindable(undefined),
        value,
        label = '',
        description = '',
        id = '',
        disabled = false,
        onchange = undefined
    } = $props();

    let selected = $derived(group === value);

    function select() {
        if (disabled || selected) return;
        group = value;
        onchange?.(value);
    }
</script>

<div
    class="radio-label"
    class:selected
    class:disabled
    onclick={select}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select())}
    role="radio"
    aria-checked={selected}
    aria-disabled={disabled}
    tabindex={disabled ? -1 : 0}
    {id}
>
    <div class="radio" class:selected class:disabled aria-hidden="true">
        {#if selected}
            <div class="radio-dot"></div>
        {/if}
    </div>
    <div class="radio-content">
        {#if label}
            <span class="radio-text">{label}</span>
        {/if}
        {#if description}
            <span class="radio-description">{description}</span>
        {/if}
    </div>
</div>

<style>
    .radio-label {
        display: flex;
        align-items: flex-start;
        gap: 0.7em;
        padding: 0.8em;
        border: 0.075em solid var(--chrome-border);
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
        user-select: none;
    }

    .radio-label:hover {
        background: var(--chrome-gold-soft);
    }

    .radio-label.selected {
        border-color: var(--chrome-gold-border);
        background: var(--chrome-gold-soft);
    }

    .radio-label.disabled {
        cursor: not-allowed;
        opacity: 0.45;
    }

    .radio-label:focus {
        outline: none;
    }

    .radio-label:focus-visible {
        border-color: var(--chrome-gold-border, #b08d4a);
    }

    .radio {
        width: 1.2em;
        height: 1.2em;
        border: 0.075em solid rgba(176, 141, 74, 0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(26, 32, 48, 0.55);
        transition: border-color 0.15s;
        flex-shrink: 0;
        margin-top: 0.1em;
    }

    .radio.selected {
        border-color: var(--color-aged-gold, #b08d4a);
    }

    .radio-dot {
        width: 0.6em;
        height: 0.6em;
        border-radius: 50%;
        background-color: var(--color-aged-gold, #b08d4a);
    }

    .radio-content {
        display: flex;
        flex-direction: column;
    }

    .radio-text {
        font-weight: 500;
        margin-bottom: 0.3em;
        color: var(--chrome-text);
    }

    .radio-label.selected .radio-text {
        color: var(--chrome-gold);
    }

    .radio-description {
        font-size: 0.8em;
        color: var(--chrome-text-faint);
    }

    .radio-label.selected .radio-description {
        color: var(--chrome-text-dim);
    }
</style>
