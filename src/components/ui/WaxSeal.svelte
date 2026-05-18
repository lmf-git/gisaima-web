<script>
    import Stamp from './Stamp.svelte';

    // Either a text label (letter) OR a glyph kind from Stamp.
    let {
        size = 56,
        label = null,
        glyph = null, // Stamp kind: 'star' | 'cross' | 'crossed-swords' | 'crown' | ...
        color = 'var(--color-wax-red)'
    } = $props();
</script>

<div
    class="wax-seal"
    style="
        --size: {size}px;
        --color: {color};
        --font-size: {size * 0.42}px;
    "
>
    {#if glyph}
        <Stamp kind={glyph} size={Math.round(size * 0.48)} />
    {:else if label}
        <span class="text">{label}</span>
    {/if}
    <div class="ring"></div>
</div>

<style>
    .wax-seal {
        width: var(--size);
        height: var(--size);
        border-radius: 50%;
        background: radial-gradient(circle at 35% 30%, #c34238 0%, var(--color) 55%, #2a0707 100%);
        box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-display, 'Cinzel', serif);
        font-weight: 700;
        color: rgba(255, 230, 210, 0.85);
        font-size: var(--font-size);
        transform: rotate(-7deg);
        border: 0.075em solid rgba(0, 0, 0, 0.3);
        position: relative;
        flex-shrink: 0;
    }
    .wax-seal .text,
    .wax-seal :global(svg) {
        filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.4));
        line-height: 1;
        color: rgba(255, 230, 210, 0.85);
    }
    .ring {
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        border: 1px dashed rgba(255, 220, 200, 0.25);
    }
</style>
