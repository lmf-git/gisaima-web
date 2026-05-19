<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M14 4 L20 10 L18 12 L12 6 Z"/>
  <path d="M18 12 L10 20"/>
  <path d="M4 20 L10 14"/>
  <line x1="4" y1="20" x2="10" y2="20"/>
</svg>
