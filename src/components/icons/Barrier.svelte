<script>
  const { extraClass = '', size = '1em' } = $props();
</script>

<svg
  class={extraClass}
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <rect x="2" y="8" width="20" height="8" rx="1" />
  <path d="M5 8 9 16M11 8 15 16M17 8 21 16" />
</svg>
