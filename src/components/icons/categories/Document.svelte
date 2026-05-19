<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Page body -->
  <path d="M15,5 L70,5 L85,20 L85,95 L15,95 Z"/>
  <!-- Folded corner cut-out -->
  <path d="M70,5 L70,20 L85,20 Z" fill="none" stroke="currentColor" stroke-width="0" opacity="0.3"/>
  <!-- Text lines (negative space effect would need different approach, so use separate rects) -->
</svg>
