<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<!-- Crossed swords — battle / combat indicator -->
<svg
  class="swords-icon {extraClass}"
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <!-- Sword 1: blade NW, handle SE -->
  <line x1="4" y1="4" x2="20" y2="20" />
  <polyline points="4,4 8,4 4,8" />
  <line x1="18" y1="18" x2="16" y2="20" />
  <line x1="20" y1="16" x2="18" y2="18" />
  <!-- Crossguard 1 -->
  <line x1="10" y1="10" x2="8" y2="12" />
  <line x1="12" y1="8" x2="14" y2="6" />
  <!-- Sword 2: blade NE, handle SW -->
  <line x1="20" y1="4" x2="4" y2="20" />
  <polyline points="20,4 16,4 20,8" />
  <line x1="6" y1="18" x2="8" y2="20" />
  <line x1="4" y1="16" x2="6" y2="18" />
  <!-- Crossguard 2 -->
  <line x1="14" y1="10" x2="16" y2="12" />
  <line x1="12" y1="8" x2="10" y2="6" />
</svg>

<style>
  .swords-icon {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }
</style>
