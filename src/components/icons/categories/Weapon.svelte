<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Blade -->
  <polygon points="50,5 57,45 43,45"/>
  <!-- Guard -->
  <rect x="28" y="45" width="44" height="8" rx="2"/>
  <!-- Grip -->
  <rect x="45" y="53" width="10" height="28" rx="2"/>
  <!-- Pommel -->
  <circle cx="50" cy="85" r="7"/>
</svg>
