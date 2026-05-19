<script>
  import Smithy from './Smithy.svelte';
  import Barracks from './Barracks.svelte';
  import Mine from './Mine.svelte';
  import WallStructure from './WallStructure.svelte';
  import Academy from './Academy.svelte';
  import Market from './Market.svelte';
  import Farm from './Farm.svelte';
  import Harbour from './Harbour.svelte';

  const { type = '', size = '1em', extraClass = '' } = $props();

  const icons = {
    smithy: Smithy,
    barracks: Barracks,
    mine: Mine,
    wall: WallStructure,
    academy: Academy,
    market: Market,
    farm: Farm,
    harbour: Harbour,
  };

  const Icon = $derived(icons[type?.toLowerCase()]);
</script>

{#if Icon}
  <Icon {size} {extraClass} />
{:else}
  <!-- Generic building fallback -->
  <svg class={extraClass} width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
    <polygon points="50,5 95,35 95,95 5,95 5,35"/>
    <rect x="35" y="60" width="30" height="35"/>
  </svg>
{/if}
