<script>
    import Stamp from './Stamp.svelte';

    // items: [{ kind, value, label }]
    let { items = [] } = $props();
</script>

<div class="strip">
    {#each items as it, i}
        <div class="cell" class:last={i === items.length - 1}>
            <Stamp kind={it.kind} size={16} />
            <div class="text">
                <div class="value">{it.value}</div>
                <div class="label">{it.label}</div>
            </div>
        </div>
    {/each}
</div>

<style>
    .strip {
        display: inline-flex;
        gap: 0;
        background: var(--color-ink-900);
        color: var(--color-parchment-100);
        border: 0.075em solid var(--color-ink-1000);
        border-radius: 0.15em;
        font-family: var(--font-mono);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 2px 6px rgba(0, 0, 0, 0.25);
    }
    .cell {
        display: flex;
        align-items: center;
        gap: 0.55em;
        padding: 0.7em 1.1em;
        border-right: 0.075em solid rgba(255, 255, 255, 0.08);
    }
    .cell.last {
        border-right: none;
    }
    .text {
        line-height: 1;
    }
    .value {
        font-size: 14px;
        font-weight: 500;
    }
    .label {
        font-size: 9px;
        opacity: 0.55;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-top: 2px;
    }
</style>
