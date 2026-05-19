<script>
  import Weapon from './categories/Weapon.svelte';
  import Tool from './categories/Tool.svelte';
  import Consumable from './categories/Consumable.svelte';
  import Document from './categories/Document.svelte';
  import Artifact from './categories/Artifact.svelte';
  import Material from './categories/Material.svelte';
  import Scroll from './categories/Scroll.svelte';
  import TradeGood from './categories/TradeGood.svelte';

  const { category = '', size = '1em', extraClass = '' } = $props();

  const icons = {
    weapon: Weapon,
    tool: Tool,
    consumable: Consumable,
    document: Document,
    artifact: Artifact,
    material: Material,
    scroll: Scroll,
    trade_good: TradeGood,
  };

  const Icon = $derived(icons[category?.toLowerCase()]);
</script>

{#if Icon}
  <Icon {size} {extraClass} />
{:else}
  <!-- Generic fallback -->
  <svg class={extraClass} width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
    <rect x="20" y="20" width="60" height="60" rx="6"/>
  </svg>
{/if}
