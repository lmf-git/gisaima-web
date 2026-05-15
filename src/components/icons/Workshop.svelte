<script>
  const { size = '1em', extraClass = '' } = $props();
</script>
<svg class="structure-icon {extraClass}" width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Chimney (tall, above roof) -->
  <rect x="60" y="5" width="15" height="38"/>
  <!-- Gabled roof -->
  <polygon points="50,10 90,42 10,42"/>
  <!-- Walls -->
  <rect x="14" y="42" width="72" height="50"/>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
</style>
