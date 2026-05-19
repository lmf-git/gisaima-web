<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Top roll cylinder -->
  <ellipse cx="50" cy="18" rx="35" ry="10"/>
  <!-- Scroll body -->
  <rect x="15" y="18" width="70" height="55"/>
  <!-- Bottom roll cylinder -->
  <ellipse cx="50" cy="73" rx="35" ry="10"/>
  <!-- Unrolled bit at bottom -->
  <path d="M30,73 Q30,92 50,92 Q70,92 70,73"/>
</svg>
