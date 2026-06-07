<script>
    // A small custom dropdown for a fixed list of options — a themed replacement
    // for the native <select> so menus match the game chrome on every platform
    // (the browser default ignores our --chrome-* tokens). Generic over
    // { value, label } options.
    //
    //   <Select {options} bind:value disabled={…} />

    let {
        options = [],
        value = $bindable(null),
        disabled = false,
        ariaLabel = undefined,
    } = $props();

    let open = $state(false);
    let highlight = $state(0);
    let rootEl = $state(null);

    const selectedLabel = $derived(
        options.find(o => o.value === value)?.label ?? ''
    );

    function toggle() {
        if (disabled) return;
        open = !open;
        if (open) highlight = Math.max(0, options.findIndex(o => o.value === value));
    }

    function choose(opt) {
        value = opt.value;
        open = false;
    }

    function onKeydown(e) {
        if (disabled) return;
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
            return;
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); highlight = Math.min(highlight + 1, options.length - 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); highlight = Math.max(highlight - 1, 0); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (options[highlight]) choose(options[highlight]); }
        else if (e.key === 'Escape') { e.preventDefault(); open = false; }
    }

    function onBlur(e) {
        // Close when focus leaves the whole control, not just the trigger.
        if (rootEl && !rootEl.contains(e.relatedTarget)) open = false;
    }
</script>

<div class="sel" bind:this={rootEl} class:disabled onblur={onBlur}>
    <button
        type="button"
        class="sel-trigger"
        class:open
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        {disabled}
        onclick={toggle}
        onkeydown={onKeydown}
    >
        <span class="sel-value">{selectedLabel}</span>
        <span class="sel-caret" class:open aria-hidden="true">▾</span>
    </button>

    {#if open}
        <ul class="sel-list" role="listbox">
            {#each options as o, i (o.value)}
                <li
                    role="option"
                    aria-selected={o.value === value}
                    class:highlight={i === highlight}
                    onmousedown={(e) => { e.preventDefault(); choose(o); }}
                    onmouseenter={() => (highlight = i)}
                >
                    {o.label}
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .sel { position: relative; width: 100%; }
    .sel.disabled { opacity: 0.5; }

    .sel-trigger {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5em;
        background: var(--chrome-field-bg);
        border: 0.075em solid var(--chrome-field-border);
        color: var(--chrome-text);
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        font-size: 0.8em;
        letter-spacing: 0.04em;
        padding: 0.4em 0.55em;
        cursor: pointer;
        text-align: left;
        box-sizing: border-box;
        transition: border-color 0.14s ease;
    }
    .sel-trigger:hover:not(:disabled),
    .sel-trigger.open { border-color: var(--chrome-gold-border); }
    .sel-trigger:focus-visible { outline: 0.12em solid var(--chrome-gold); outline-offset: 0.1em; }
    .sel-trigger:disabled { cursor: not-allowed; }

    .sel-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sel-caret {
        flex-shrink: 0;
        font-size: 0.85em;
        color: var(--chrome-text-faint);
        transition: transform 0.15s ease;
    }
    .sel-caret.open { transform: rotate(180deg); }

    .sel-list {
        position: absolute;
        top: calc(100% + 0.2em);
        left: 0;
        right: 0;
        z-index: 50;
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 14em;
        overflow-y: auto;
        background: var(--chrome-panel-b, var(--chrome-field-bg));
        border: 0.075em solid var(--chrome-gold-border);
        box-shadow: var(--chrome-shadow, 0 0.4em 1.2em rgba(0, 0, 0, 0.35));
    }
    .sel-list li {
        padding: 0.45em 0.6em;
        cursor: pointer;
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        font-size: 0.8em;
        color: var(--chrome-text-dim);
        border-bottom: 0.04em solid var(--chrome-hairline);
    }
    .sel-list li:last-child { border-bottom: none; }
    .sel-list li.highlight { background: var(--chrome-gold-soft); color: var(--chrome-text); }
    .sel-list li[aria-selected="true"] { color: var(--chrome-gold); }
</style>
