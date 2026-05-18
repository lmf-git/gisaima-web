<script>
    let { size = 80, color = 'currentColor', opacity = 1 } = $props();

    const ticks = Array.from({ length: 32 }, (_, i) => {
        const a = (i * Math.PI * 2) / 32;
        const r1 = i % 4 === 0 ? 32 : 34;
        const r2 = 36;
        return {
            x1: 50 + Math.cos(a) * r1,
            y1: 50 + Math.sin(a) * r1,
            x2: 50 + Math.cos(a) * r2,
            y2: 50 + Math.sin(a) * r2,
            sw: i % 4 === 0 ? 1 : 0.5
        };
    });
</script>

<svg viewBox="0 0 100 100" width={size} height={size} style:opacity>
    <g fill="none" stroke={color} stroke-width="0.7" stroke-linecap="round">
        <circle cx="50" cy="50" r="46" />
        <circle cx="50" cy="50" r="36" stroke-dasharray="0.5 2" />
        <circle cx="50" cy="50" r="22" />
        {#each ticks as t, i}
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke-width={t.sw} />
        {/each}
    </g>
    <g fill={color}>
        <path d="M50 4 53 50 50 22 47 50Z" opacity=".85" />
        <path d="M50 96 47 50 50 78 53 50Z" opacity=".55" />
        <path d="M4 50 50 47 22 50 50 53Z" opacity=".7" />
        <path d="M96 50 50 53 78 50 50 47Z" opacity=".7" />
    </g>
    <g fill={color} font-family="Cinzel, serif" font-size="7" text-anchor="middle" letter-spacing="1">
        <text x="50" y="13">N</text>
        <text x="50" y="93">S</text>
        <text x="10" y="52">W</text>
        <text x="90" y="52">E</text>
    </g>
</svg>
