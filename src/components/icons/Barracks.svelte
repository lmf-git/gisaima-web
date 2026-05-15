<script>
  const { size = '1em', extraClass = '' } = $props();
</script>
<svg class="structure-icon {extraClass}" width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Crenelated top (4 merlons) -->
  <path d="M5,28 L5,5 L18,5 L18,18 L34,18 L34,5 L50,5 L50,18 L66,18 L66,5 L82,5 L82,18 L95,18 L95,28 Z"/>
  <!-- Fortress wall body -->
  <rect x="5" y="28" width="90" height="62"/>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
</style>
