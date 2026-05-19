<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={size}
  height={size}
  class={extraClass}
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  <path d="M17 7L7 17M15 5l4 4-2 2-4-4 2-2zM3 19l2 2 4-4-2-2-4 4zM13 9l-6 6M16 4l4 4" />
</svg>
