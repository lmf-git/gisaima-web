<script>
  const { size = '1em', extraClass = '' } = $props();
</script>
<svg class="structure-icon {extraClass}" width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Ring at top (solid circle) -->
  <circle cx="50" cy="13" r="11"/>
  <!-- Shaft -->
  <rect x="47" y="18" width="6" height="62"/>
  <!-- Stock (horizontal crossbar) -->
  <rect x="18" y="18" width="64" height="7"/>
  <!-- Flukes: horizontal bar at bottom -->
  <rect x="22" y="76" width="56" height="7"/>
  <!-- Left fluke curve -->
  <path d="M22,83 Q8,72 22,60 L28,64 Q18,72 28,83 Z"/>
  <!-- Right fluke curve -->
  <path d="M78,83 Q92,72 78,60 L72,64 Q82,72 72,83 Z"/>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
</style>
