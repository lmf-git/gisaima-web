<script>
  const { size = '1em', extraClass = '' } = $props();
</script>
<svg class="structure-icon {extraClass}" width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Crenelated top (3 merlons, wide wall) -->
  <path d="M5,30 L5,8 L22,8 L22,20 L38,20 L38,8 L56,8 L56,20 L72,20 L72,8 L88,8 L88,20 L95,20 L95,30 Z"/>
  <!-- Wall body -->
  <rect x="5" y="30" width="90" height="60"/>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
</style>
