<script>
  import Helmet from './equipment/Helmet.svelte';
  import Back from './equipment/Back.svelte';
  import Torso from './equipment/Torso.svelte';
  import Amulet from './equipment/Amulet.svelte';
  import Weapon from './equipment/Weapon.svelte';
  import Legs from './equipment/Legs.svelte';
  import Shield from './equipment/Shield.svelte';
  import Bracelet from './equipment/Bracelet.svelte';
  import Ring from './equipment/Ring.svelte';
  import Boots from './equipment/Boots.svelte';

  const EQUIPMENT_ICONS = {
    helmet:   Helmet,
    back:     Back,
    torso:    Torso,
    amulet:   Amulet,
    weapon:   Weapon,
    legs:     Legs,
    shield:   Shield,
    bracelet: Bracelet,
    ring:     Ring,
    boots:    Boots,
  };

  const { slot = '', size = '1em', extraClass = '' } = $props();

  const key = slot === 'ring1' || slot === 'ring2' ? 'ring' : slot;
  const Component = $derived(EQUIPMENT_ICONS[key] || null);
</script>

{#if Component}
  <svelte:component this={Component} {size} {extraClass} />
{/if}

<style>
  :global(.equip-slot-icon) {
    display: inline-block;
    vertical-align: middle;
  }
</style>
