<script>
    // A type-to-filter combobox: the player can type to narrow the list or pick
    // straight from the dropdown. Generic over { value, label, sub?, qty? }.
    //
    //   <SearchDropdown {options} bind:value placeholder="Item…" />
    //
    // `value` is the selected option's `value`. `disabled` greys it out.

    let {
        options = [],
        value = $bindable(null),
        placeholder = 'Search…',
        disabled = false,
        emptyText = 'No matches',
    } = $props();

    let open = $state(false);
    let query = $state('');
    let highlight = $state(0);
    let rootEl = $state(null);
    let closeTimer = null;

    // The label of the currently-selected option, shown when not actively typing.
    const selectedLabel = $derived(
        options.find(o => o.value === value)?.label ?? ''
    );

    const filtered = $derived.by(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(o =>
            (o.label || '').toLowerCase().includes(q) ||
            (o.sub || '').toLowerCase().includes(q) ||
            String(o.value || '').toLowerCase().includes(q)
        );
    });

    // What shows in the input: the live query while open, else the selection.
    const displayValue = $derived(open ? query : selectedLabel);

    function openList() {
        if (disabled) return;
        open = true;
        query = '';
        highlight = Math.max(0, filtered.findIndex(o => o.value === value));
    }

    function choose(opt) {
        value = opt.value;
        query = '';
        open = false;
    }

    function onInput(e) {
        query = e.target.value;
        open = true;
        highlight = 0;
    }

    function onKeydown(e) {
        if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { openList(); return; }
        if (!open) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); highlight = Math.min(highlight + 1, filtered.length - 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); highlight = Math.max(highlight - 1, 0); }
        else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlight]) choose(filtered[highlight]); }
        else if (e.key === 'Escape') { open = false; }
    }

    function onBlur() {
        // Delay so an option click registers before the list closes.
        closeTimer = setTimeout(() => { open = false; query = ''; }, 150);
    }
    function onFocus() { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } openList(); }
</script>

<div class="sd" bind:this={rootEl} class:disabled>
    <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="sd-list"
        autocomplete="off"
        {placeholder}
        {disabled}
        value={displayValue}
        oninput={onInput}
        onkeydown={onKeydown}
        onfocus={onFocus}
        onblur={onBlur}
    />
    <span class="caret" class:open aria-hidden="true">▾</span>

    {#if open}
        <ul class="sd-list" id="sd-list" role="listbox">
            {#if filtered.length === 0}
                <li class="sd-empty">{emptyText}</li>
            {:else}
                {#each filtered as o, i (o.value)}
                    <li
                        role="option"
                        aria-selected={o.value === value}
                        class:highlight={i === highlight}
                        onmousedown={(e) => { e.preventDefault(); choose(o); }}
                        onmouseenter={() => (highlight = i)}
                    >
                        <span class="sd-label">{o.label}</span>
                        {#if o.qty !== undefined}<span class="sd-qty">{o.qty}</span>{/if}
                        {#if o.sub}<span class="sd-sub">{o.sub}</span>{/if}
                    </li>
                {/each}
            {/if}
        </ul>
    {/if}
</div>

<style>
    .sd { position: relative; width: 100%; }
    .sd input {
        width: 100%;
        padding: 0.5em 1.8em 0.5em 0.7em;
        background: var(--color-parchment-200, #f0e8d6);
        border: 1px solid var(--color-parchment-shadow, #cbbfa6);
        font-family: var(--font-mono);
        font-size: 0.85rem;
        color: var(--color-ink-900, #1a2030);
        box-sizing: border-box;
    }
    .sd input:focus { outline: none; border-color: var(--color-wax-red, #5b1a1f); }
    .sd.disabled { opacity: 0.5; }
    .caret {
        position: absolute;
        right: 0.6em;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        font-size: 0.7em;
        color: var(--color-ink-500, #6b6450);
        transition: transform 0.15s;
    }
    .caret.open { transform: translateY(-50%) rotate(180deg); }

    .sd-list {
        position: absolute;
        top: calc(100% + 2px);
        left: 0;
        right: 0;
        z-index: 50;
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 16em;
        overflow-y: auto;
        background: var(--color-parchment-100, #f7f1e3);
        border: 1px solid var(--color-ink-900, #1a2030);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    }
    .sd-list li {
        display: flex;
        align-items: baseline;
        gap: 0.5em;
        padding: 0.45em 0.7em;
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: 0.82rem;
        color: var(--color-ink-900, #1a2030);
        border-bottom: 1px solid rgba(26, 32, 48, 0.08);
    }
    .sd-list li.highlight { background: var(--color-parchment-200, #efe6d2); }
    .sd-list li[aria-selected="true"] { color: var(--color-wax-red, #5b1a1f); }
    .sd-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sd-qty { font-weight: 600; color: var(--color-wax-red, #5b1a1f); }
    .sd-sub { font-size: 0.72rem; color: var(--color-ink-500, #6b6450); font-style: italic; }
    .sd-empty { padding: 0.6em 0.7em; font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500, #6b6450); }
</style>
