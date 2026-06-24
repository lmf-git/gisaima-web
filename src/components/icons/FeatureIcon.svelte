<script>
  // Maps a structure feature to a dedicated SVG icon component, keyed off the
  // emoji the shared STRUCTURES definitions tag each feature with. This keeps
  // the UI on real vector icons instead of rendering raw emoji glyphs.
  import BasicShelter from './BasicShelter.svelte';
  import StorageDepot from './StorageDepot.svelte';
  import Shield from './Shield.svelte';
  import Swords from './Swords.svelte';
  import Eye from './Eye.svelte';
  import Hammer from './Hammer.svelte';
  import WallStructure from './WallStructure.svelte';
  import Watchtower from './Watchtower.svelte';
  import Structure from './Structure.svelte';
  import Paw from './Paw.svelte';
  import Bolt from './Bolt.svelte';
  import Heart from './Heart.svelte';
  import Barrier from './Barrier.svelte';
  import Star from './Star.svelte';

  const { feature = null, icon = '', size = '1em', extraClass = '' } = $props();

  const BY_EMOJI = {
    '🏠': BasicShelter,
    '🏕️': BasicShelter,
    '📦': StorageDepot,
    '🐾': Paw,
    '🛡️': Shield,
    '⚡': Bolt,
    '❤️': Heart,
    '🚧': Barrier,
    '👁️': Eye,
    '🔨': Hammer,
    '🏰': WallStructure,
    '⚔️': Swords,
    '🏯': Watchtower,
    '🌟': Star,
  };

  const Icon = $derived(BY_EMOJI[feature?.icon ?? icon] ?? Structure);
</script>

<Icon {size} {extraClass} />
