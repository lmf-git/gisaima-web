<script>
  const { size = '1em', extraClass = '' } = $props();
</script>
<svg class="structure-icon {extraClass}" width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Side tower (taller) with two merlons -->
  <rect x="62" y="8" width="10" height="14"/>
  <rect x="78" y="8" width="10" height="14"/>
  <rect x="60" y="20" width="32" height="72"/>
  <!-- Main building roof -->
  <polygon points="42,22 72,42 10,42"/>
  <!-- Main building walls -->
  <rect x="10" y="42" width="62" height="50"/>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
</style>
