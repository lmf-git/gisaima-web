<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="2" y="5" width="9" height="4"/>
  <rect x="13" y="5" width="9" height="4"/>
  <rect x="2" y="15" width="9" height="4"/>
  <rect x="13" y="15" width="9" height="4"/>
  <rect x="6.5" y="10" width="11" height="4"/>
  <line x1="2" y1="10" x2="6" y2="10"/>
  <line x1="18" y1="10" x2="22" y2="10"/>
</svg>
