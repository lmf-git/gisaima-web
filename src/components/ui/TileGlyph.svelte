<script>
    let { kind = 'village', color = '#1a2030', size = 22 } = $props();
</script>

{#if kind === 'village'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} stroke-width="1.4" stroke-linejoin="round">
        <path d="M4 20V10l8-6 8 6v10Z" fill={color} fill-opacity=".18" />
        <path d="M10 20v-5h4v5" />
        <path d="M4 10h16" />
    </svg>
{:else if kind === 'tower'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} stroke-width="1.4" stroke-linejoin="round">
        <path d="M7 21V8l-1-1V5h1v1h2V5h1v1h2V5h1v1h2V5h1v2l-1 1v13Z" fill={color} fill-opacity=".18" />
        <path d="M10 21v-5h4v5" />
    </svg>
{:else if kind === 'beast'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} stroke-width="1.4" stroke-linejoin="round">
        <path d="M6 11a6 6 0 1 1 12 0v3l-1 1v3h-3v-2h-4v2H7v-3l-1-1Z" fill={color} fill-opacity=".2" />
        <circle cx="10" cy="12" r="1.2" fill={color} />
        <circle cx="14" cy="12" r="1.2" fill={color} />
        <path d="M11 16h2M4 10l-2-2M20 10l2-2" />
    </svg>
{:else if kind === 'unit'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} stroke-width="1.4" stroke-linejoin="round">
        <circle cx="12" cy="8" r="3" fill={color} fill-opacity=".25" />
        <path d="M5 21c0-4 3-7 7-7s7 3 7 7" fill={color} fill-opacity=".15" />
    </svg>
{:else if kind === 'ruin'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} stroke-width="1.4" stroke-linejoin="round">
        <path d="M3 21V12l3-2 3 2v-3l3-2 3 2v3l3-2 3 2v9Z" fill={color} fill-opacity=".15" />
    </svg>
{/if}
