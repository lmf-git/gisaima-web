<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Isometric cube -->
  <!-- Top face -->
  <polygon points="50,8 85,28 50,48 15,28"/>
  <!-- Left face -->
  <polygon points="15,28 50,48 50,88 15,68" opacity="0.7"/>
  <!-- Right face -->
  <polygon points="85,28 50,48 50,88 85,68" opacity="0.85"/>
</svg>
