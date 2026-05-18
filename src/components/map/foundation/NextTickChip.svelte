<script>
    import { onMount, onDestroy } from 'svelte';
    import { worldInfo } from '$lib/stores/game.js';

    let now = $state(Date.now());
    let timer;

    onMount(() => {
        timer = setInterval(() => (now = Date.now()), 1000);
    });
    onDestroy(() => clearInterval(timer));

    // Tick interval comes from world info (ms between ticks). Fall back to 60s.
    const tickInterval = $derived(($worldInfo?.tickInterval ?? $worldInfo?.tickMs ?? 60_000));
    const lastTick = $derived(($worldInfo?.lastTick ?? null));

    const nextAt = $derived(lastTick ? new Date(lastTick).getTime() + tickInterval : null);
    const secondsLeft = $derived(nextAt ? Math.max(0, Math.floor((nextAt - now) / 1000)) : null);

    const display = $derived.by(() => {
        if (secondsLeft == null) return '—';
        const m = Math.floor(secondsLeft / 60);
        const s = secondsLeft % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    });

    // Derive in-world time-of-day from total tick count.
    // One tick == one in-world hour (per roadmap).
    const inGameHour = $derived(
        typeof $worldInfo?.tickCount === 'number'
            ? $worldInfo.tickCount % 24
            : null
    );
    const phase = $derived.by(() => {
        if (inGameHour == null) return null;
        if (inGameHour < 5) return 'night';
        if (inGameHour < 8) return 'dawn';
        if (inGameHour < 18) return 'day';
        if (inGameHour < 21) return 'dusk';
        return 'night';
    });
</script>

<div class="chip">
    <span class="dot"></span>
    <span class="lbl">NEXT TICK</span>
    <span class="val">{display}</span>
    {#if inGameHour != null}
        <span class="sep">·</span>
        <span class="hour">{String(inGameHour).padStart(2, '0')}:00</span>
        <span class="phase">{phase}</span>
    {/if}
</div>

<style>
    .chip {
        position: absolute;
        top: 0.6em;
        right: 1em;
        display: flex;
        align-items: center;
        gap: 0.6em;
        padding: 0.5em 0.9em;
        background: rgba(176, 141, 74, 0.12);
        border: 0.075em solid rgba(176, 141, 74, 0.4);
        backdrop-filter: blur(0.5em);
        font-family: var(--font-mono);
        font-size: 0.78em;
        color: var(--color-gold-pale);
        z-index: 500;
        pointer-events: none;
    }
    .dot {
        width: 0.45em;
        height: 0.45em;
        border-radius: 50%;
        background: var(--color-gold-pale);
        box-shadow: 0 0 0.5em var(--color-gold-pale);
        animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }
    .lbl {
        font-size: 0.85em;
        letter-spacing: 0.18em;
        opacity: 0.75;
    }
    .val {
        font-weight: 500;
        color: var(--color-gold-pale);
    }
    .sep { opacity: 0.4; }
    .hour {
        letter-spacing: 0.05em;
        opacity: 0.85;
    }
    .phase {
        font-family: var(--font-display);
        font-size: 0.78em;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        opacity: 0.6;
    }
    @media (max-width: 600px) {
        .chip { font-size: 0.7em; padding: 0.4em 0.7em; right: 0.6em; }
        .phase, .hour, .sep { display: none; }
    }
</style>
