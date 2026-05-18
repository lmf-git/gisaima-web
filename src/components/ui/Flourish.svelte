<script>
    let { width = 200, color = 'currentColor' } = $props();
</script>

<svg viewBox="0 0 200 16" {width} height="16" fill="none" stroke={color} stroke-width="0.8" stroke-linecap="round">
    <path d="M0 8h70" />
    <path d="M130 8h70" />
    <path d="M70 8c2-3 6-3 8 0s6 3 8 0M114 8c2-3 6-3 8 0s6 3 8 0" />
    <circle cx="100" cy="8" r="2.2" fill={color} />
    <path d="M94 8c2-3 4-3 6 0s4 3 6 0" />
</svg>
