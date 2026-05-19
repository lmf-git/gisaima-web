<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="5" r="2"/>
  <line x1="12" y1="7" x2="12" y2="21"/>
  <path d="M5 13 C5 17.5 8 21 12 21 C16 21 19 17.5 19 13"/>
  <line x1="5" y1="10" x2="19" y2="10"/>
</svg>
