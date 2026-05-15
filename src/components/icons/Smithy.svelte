<script>
  const { size = '1em', extraClass = '' } = $props();
</script>
<svg class="structure-icon {extraClass}" width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Horn (left pointed extension) -->
  <path d="M5,65 Q5,52 22,50 L22,68 Z"/>
  <!-- Top surface / face -->
  <rect x="22" y="28" width="65" height="24" rx="4"/>
  <!-- Neck -->
  <rect x="36" y="52" width="36" height="12"/>
  <!-- Base -->
  <rect x="22" y="64" width="65" height="22" rx="3"/>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
</style>
