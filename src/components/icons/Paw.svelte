<script>
  const { extraClass = '', size = '1em' } = $props();
</script>

<svg
  class={extraClass}
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="currentColor"
  stroke="none"
  aria-hidden="true"
>
  <ellipse cx="6"  cy="11" rx="1.8" ry="2.4" />
  <ellipse cx="10" cy="7"  rx="1.8" ry="2.4" />
  <ellipse cx="14" cy="7"  rx="1.8" ry="2.4" />
  <ellipse cx="18" cy="11" rx="1.8" ry="2.4" />
  <path d="M12 12c-2.6 0-5 1.9-5 4.3 0 1.9 1.6 2.7 3 2.7 1 0 1.4-.4 2-.4s1 .4 2 .4c1.4 0 3-.8 3-2.7 0-2.4-2.4-4.3-5-4.3z" />
</svg>
