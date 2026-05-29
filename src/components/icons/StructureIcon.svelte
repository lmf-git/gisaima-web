<script>
  import BasicShelter from './BasicShelter.svelte';
  import Watchtower from './Watchtower.svelte';
  import StorageDepot from './StorageDepot.svelte';
  import Workshop from './Workshop.svelte';
  import Outpost from './Outpost.svelte';
  import Structure from './Structure.svelte';

  const { type = '', size = '1em', extraClass = '' } = $props();

  const icons = {
    basic_shelter: BasicShelter,
    shelter: BasicShelter,
    watchtower: Watchtower,
    storage: StorageDepot,
    workshop: Workshop,
    outpost: Outpost,
  };

  const Icon = $derived(icons[type?.toLowerCase()] ?? Structure);
</script>

<Icon {size} {extraClass} />
