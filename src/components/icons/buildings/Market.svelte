<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="12" y1="3" x2="12" y2="21"/>
  <line x1="6" y1="20" x2="18" y2="20"/>
  <line x1="5" y1="7" x2="19" y2="7"/>
  <path d="M5 7 L2 13 a3 3 0 0 0 6 0 Z"/>
  <path d="M19 7 L16 13 a3 3 0 0 0 6 0 Z"/>
</svg>
