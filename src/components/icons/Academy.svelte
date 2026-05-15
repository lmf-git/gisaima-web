<script>
  const { size = '1em', extraClass = '' } = $props();
</script>
<svg class="structure-icon {extraClass}" width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Dome on top -->
  <path d="M18,48 Q18,8 50,8 Q82,8 82,48 Z"/>
  <!-- Building walls -->
  <rect x="10" y="48" width="80" height="44"/>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
</style>
