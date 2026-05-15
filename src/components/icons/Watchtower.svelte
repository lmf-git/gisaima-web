<script>
  const { size = '1em', extraClass = '' } = $props();
</script>
<svg class="structure-icon {extraClass}" width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Battlements: three merlons -->
  <rect x="22" y="5" width="14" height="20"/>
  <rect x="44" y="5" width="12" height="20"/>
  <rect x="64" y="5" width="14" height="20"/>
  <!-- Tower body -->
  <rect x="30" y="24" width="40" height="71"/>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
</style>
