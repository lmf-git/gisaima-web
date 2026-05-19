<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Potion neck -->
  <rect x="38" y="5" width="24" height="20" rx="3"/>
  <!-- Potion stopper -->
  <rect x="34" y="22" width="32" height="8" rx="2"/>
  <!-- Potion body -->
  <path d="M25,30 Q15,45 15,65 Q15,92 50,92 Q85,92 85,65 Q85,45 75,30 Z"/>
</svg>
