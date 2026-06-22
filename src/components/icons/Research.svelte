<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<!-- Research: a conical laboratory flask. Distinct from the Info (circle-i)
     icon the Details action uses, so the peek wheel reads "research" clearly. -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  class={extraClass}
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  <path d="M9 3h6" />
  <path d="M10 3v6L5 18.2A2 2 0 0 0 6.8 21h10.4a2 2 0 0 0 1.8-2.8L14 9V3" />
  <path d="M7.6 14.5h8.8" />
  <circle cx="10.5" cy="17.6" r="0.9" fill="currentColor" stroke="none" />
  <circle cx="13.2" cy="18.1" r="0.7" fill="currentColor" stroke="none" />
</svg>
