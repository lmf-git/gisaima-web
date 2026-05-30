<script>
  import Player from './units/paths/Player.svelte';
  import HumanWarrior from './units/paths/HumanWarrior.svelte';
  import HumanScout from './units/paths/HumanScout.svelte';
  import HumanKnight from './units/paths/HumanKnight.svelte';
  import GoblinWarrior from './units/paths/GoblinWarrior.svelte';
  import GoblinScout from './units/paths/GoblinScout.svelte';
  import GoblinRaider from './units/paths/GoblinRaider.svelte';
  import ElfWarrior from './units/paths/ElfWarrior.svelte';
  import ElfScout from './units/paths/ElfScout.svelte';
  import ElfArcher from './units/paths/ElfArcher.svelte';
  import FairyWarrior from './units/paths/FairyWarrior.svelte';
  import FairyScout from './units/paths/FairyScout.svelte';
  import FairyEnchanter from './units/paths/FairyEnchanter.svelte';
  import DwarfWarrior from './units/paths/DwarfWarrior.svelte';
  import DwarfScout from './units/paths/DwarfScout.svelte';
  import DwarfDefender from './units/paths/DwarfDefender.svelte';
  import Healer from './units/paths/Healer.svelte';
  import Shaman from './units/paths/Shaman.svelte';
  import SiegeEngineer from './units/paths/SiegeEngineer.svelte';
  import EliteGuard from './units/paths/EliteGuard.svelte';
  import SiegeRam from './units/paths/SiegeRam.svelte';
  import MasterCraftsman from './units/paths/MasterCraftsman.svelte';
  import ResourceGatherer from './units/paths/ResourceGatherer.svelte';
  import SmallBoat from './units/paths/SmallBoat.svelte';
  import MediumBoat from './units/paths/MediumBoat.svelte';
  import LargeBoat from './units/paths/LargeBoat.svelte';
  import CombatBoat from './units/paths/CombatBoat.svelte';
  import Steamboat from './units/paths/Steamboat.svelte';
  import ExplorerBoat from './units/paths/ExplorerBoat.svelte';
  import ElvenSwanBoat from './units/paths/ElvenSwanBoat.svelte';
  import DwarfIronclad from './units/paths/DwarfIronclad.svelte';
  import FairyLilyPad from './units/paths/FairyLilyPad.svelte';
  import Ork from './units/paths/Ork.svelte';
  import Wolf from './units/paths/Wolf.svelte';
  import Bandit from './units/paths/Bandit.svelte';
  import Spider from './units/paths/Spider.svelte';
  import Skeleton from './units/paths/Skeleton.svelte';
  import Troll from './units/paths/Troll.svelte';
  import Elemental from './units/paths/Elemental.svelte';
  import Merfolk from './units/paths/Merfolk.svelte';
  import SeaSerpent from './units/paths/SeaSerpent.svelte';
  import Shark from './units/paths/Shark.svelte';
  import Kraken from './units/paths/Kraken.svelte';
  import Drowned from './units/paths/Drowned.svelte';

  import FbWarrior from './units/paths/fallbacks/Warrior.svelte';
  import FbScout from './units/paths/fallbacks/Scout.svelte';
  import FbSupport from './units/paths/fallbacks/Support.svelte';
  import FbKnight from './units/paths/fallbacks/Knight.svelte';
  import FbArcher from './units/paths/fallbacks/Archer.svelte';
  import FbDefender from './units/paths/fallbacks/Defender.svelte';
  import FbRaider from './units/paths/fallbacks/Raider.svelte';
  import FbEnchanter from './units/paths/fallbacks/Enchanter.svelte';
  import FbElite from './units/paths/fallbacks/Elite.svelte';
  import FbSiege from './units/paths/fallbacks/Siege.svelte';
  import FbWorker from './units/paths/fallbacks/Worker.svelte';
  import FbGatherer from './units/paths/fallbacks/Gatherer.svelte';
  import FbBoat from './units/paths/fallbacks/Boat.svelte';
  import FbShip from './units/paths/fallbacks/Ship.svelte';
  import FbPlayer from './units/paths/fallbacks/FallbackPlayer.svelte';

  const UNIT_ICONS = {
    player:            Player,
    human_warrior:     HumanWarrior,
    human_scout:       HumanScout,
    human_knight:      HumanKnight,
    goblin_warrior:    GoblinWarrior,
    goblin_scout:      GoblinScout,
    goblin_raider:     GoblinRaider,
    elf_warrior:       ElfWarrior,
    elf_scout:         ElfScout,
    elf_archer:        ElfArcher,
    fairy_warrior:     FairyWarrior,
    fairy_scout:       FairyScout,
    fairy_enchanter:   FairyEnchanter,
    dwarf_warrior:     DwarfWarrior,
    dwarf_scout:       DwarfScout,
    dwarf_defender:    DwarfDefender,
    healer:            Healer,
    shaman:            Shaman,
    siege_engineer:    SiegeEngineer,
    elite_guard:       EliteGuard,
    siege_ram:         SiegeRam,
    master_craftsman:  MasterCraftsman,
    resource_gatherer: ResourceGatherer,
    small_boat:        SmallBoat,
    medium_boat:       MediumBoat,
    large_boat:        LargeBoat,
    combat_boat:       CombatBoat,
    steamboat:         Steamboat,
    explorer_boat:     ExplorerBoat,
    elven_swan_boat:   ElvenSwanBoat,
    dwarf_ironclad:    DwarfIronclad,
    fairy_lily_pad:    FairyLilyPad,
    ork:               Ork,
    wolf:              Wolf,
    bandit:            Bandit,
    spider:            Spider,
    skeleton:          Skeleton,
    troll:             Troll,
    elemental:         Elemental,
    merfolk:           Merfolk,
    sea_serpent:       SeaSerpent,
    shark:             Shark,
    kraken:            Kraken,
    drowned:           Drowned,
  };

  const UNIT_FALLBACKS = {
    warrior:   FbWarrior,
    scout:     FbScout,
    support:   FbSupport,
    knight:    FbKnight,
    archer:    FbArcher,
    defender:  FbDefender,
    raider:    FbRaider,
    enchanter: FbEnchanter,
    elite:     FbElite,
    siege:     FbSiege,
    worker:    FbWorker,
    gatherer:  FbGatherer,
    boat:      FbBoat,
    ship:      FbShip,
    player:    FbPlayer,
  };

  const { type = '', size = '1em', extraClass = '' } = $props();

  const Component = $derived(UNIT_ICONS[type] || UNIT_FALLBACKS[type] || UNIT_FALLBACKS.warrior);
</script>

<Component {size} {extraClass} />
