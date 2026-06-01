<script>
  import WoodenSticks from './items/WoodenSticks.svelte';
  import OakWood from './items/OakWood.svelte';
  import AncientWood from './items/AncientWood.svelte';
  import StonePieces from './items/StonePieces.svelte';
  import IronOre from './items/IronOre.svelte';
  import Iron from './items/Iron.svelte';
  import RareMetals from './items/RareMetals.svelte';
  import ScrapMetal from './items/ScrapMetal.svelte';
  import BogIron from './items/BogIron.svelte';
  import Leather from './items/Leather.svelte';
  import MonsterHide from './items/MonsterHide.svelte';
  import Wheat from './items/Wheat.svelte';
  import WildBerries from './items/WildBerries.svelte';
  import Herbs from './items/Herbs.svelte';
  import MedicinalHerbs from './items/MedicinalHerbs.svelte';
  import AlpineHerb from './items/AlpineHerb.svelte';
  import CactusFruit from './items/CactusFruit.svelte';
  import ExoticFruit from './items/ExoticFruit.svelte';
  import DesertBloom from './items/DesertBloom.svelte';
  import GlowingMushroom from './items/GlowingMushroom.svelte';
  import FreshWater from './items/FreshWater.svelte';
  import PureWater from './items/PureWater.svelte';
  import Fish from './items/Fish.svelte';
  import MonsterBlood from './items/MonsterBlood.svelte';
  import HerbalTea from './items/HerbalTea.svelte';
  import Crystal from './items/Crystal.svelte';
  import MountainCrystal from './items/MountainCrystal.svelte';
  import SandCrystal from './items/SandCrystal.svelte';
  import FrostCrystal from './items/FrostCrystal.svelte';
  import SunCrystal from './items/SunCrystal.svelte';
  import Pearl from './items/Pearl.svelte';
  import PrimalEssence from './items/PrimalEssence.svelte';
  import VolcanicGlass from './items/VolcanicGlass.svelte';
  import ObsidianShard from './items/ObsidianShard.svelte';
  import AbyssalCrystal from './items/AbyssalCrystal.svelte';
  import AnomalousFragment from './items/AnomalousFragment.svelte';
  import MagmaEssence from './items/MagmaEssence.svelte';
  import CoralFragment from './items/CoralFragment.svelte';
  import WillOWispEssence from './items/WillOWispEssence.svelte';
  import WoodenSword from './items/WoodenSword.svelte';
  import StoneSword from './items/StoneSword.svelte';
  import IronSword from './items/IronSword.svelte';
  import CrudeWeapon from './items/CrudeWeapon.svelte';
  import Bow from './items/Bow.svelte';
  import BoneAmulet from './items/BoneAmulet.svelte';
  import MonsterTooth from './items/MonsterTooth.svelte';
  import MonsterHideCape from './items/MonsterHideCape.svelte';
  import LeatherCap from './items/LeatherCap.svelte';
  import IronHelmet from './items/IronHelmet.svelte';
  import LeatherBody from './items/LeatherBody.svelte';
  import IronBody from './items/IronBody.svelte';
  import LeatherLegs from './items/LeatherLegs.svelte';
  import LeatherBoots from './items/LeatherBoots.svelte';
  import LeatherGloves from './items/LeatherGloves.svelte';
  import WoodenShield from './items/WoodenShield.svelte';
  import IronShield from './items/IronShield.svelte';
  import AncientFragment from './items/AncientFragment.svelte';
  import BrokenTool from './items/BrokenTool.svelte';
  import StrangeDevice from './items/StrangeDevice.svelte';
  import BoneFragment from './items/BoneFragment.svelte';
  import AncientCoin from './items/AncientCoin.svelte';
  import MysteriousArtifact from './items/MysteriousArtifact.svelte';

  const { code = '', size = '1em', extraClass = '' } = $props();

  const ICONS = {
    WOOD: WoodenSticks,
    OAK_WOOD: OakWood,
    ANCIENT_WOOD: AncientWood,
    STONE: StonePieces,
    METAL_ORE: IronOre,
    METAL: Iron,
    RARE_METALS: RareMetals,
    SCRAP_METAL: ScrapMetal,
    BOG_IRON: BogIron,
    LEATHER: Leather,
    MONSTER_HIDE: MonsterHide,
    WHEAT: Wheat,
    WILD_BERRIES: WildBerries,
    HERBS: Herbs,
    MEDICINAL_HERBS: MedicinalHerbs,
    ALPINE_HERB: AlpineHerb,
    CACTUS_FRUIT: CactusFruit,
    EXOTIC_FRUIT: ExoticFruit,
    DESERT_BLOOM: DesertBloom,
    GLOWING_MUSHROOM: GlowingMushroom,
    FRESH_WATER: FreshWater,
    PURE_WATER: PureWater,
    FISH: Fish,
    MONSTER_BLOOD: MonsterBlood,
    HERBAL_TEA: HerbalTea,
    CRYSTAL: Crystal,
    MOUNTAIN_CRYSTAL: MountainCrystal,
    SAND_CRYSTAL: SandCrystal,
    FROST_CRYSTAL: FrostCrystal,
    SUN_CRYSTAL: SunCrystal,
    PEARL: Pearl,
    PRIMAL_ESSENCE: PrimalEssence,
    VOLCANIC_GLASS: VolcanicGlass,
    OBSIDIAN_SHARD: ObsidianShard,
    ABYSSAL_CRYSTAL: AbyssalCrystal,
    ANOMALOUS_FRAGMENT: AnomalousFragment,
    MAGMA_ESSENCE: MagmaEssence,
    CORAL_FRAGMENT: CoralFragment,
    WILL_O_WISP_ESSENCE: WillOWispEssence,
    WOODEN_SWORD: WoodenSword,
    STONE_SWORD: StoneSword,
    IRON_SWORD: IronSword,
    CRUDE_WEAPON: CrudeWeapon,
    BOW: Bow,
    BONE_AMULET: BoneAmulet,
    MONSTER_TOOTH: MonsterTooth,
    MONSTER_HIDE_CAPE: MonsterHideCape,
    LEATHER_CAP: LeatherCap,
    IRON_HELMET: IronHelmet,
    LEATHER_BODY: LeatherBody,
    IRON_BODY: IronBody,
    LEATHER_LEGS: LeatherLegs,
    LEATHER_BOOTS: LeatherBoots,
    LEATHER_GLOVES: LeatherGloves,
    WOODEN_SHIELD: WoodenShield,
    IRON_SHIELD: IronShield,
    ANCIENT_FRAGMENT: AncientFragment,
    BROKEN_TOOL: BrokenTool,
    STRANGE_DEVICE: StrangeDevice,
    BONE_FRAGMENT: BoneFragment,
    ANCIENT_COIN: AncientCoin,
    MYSTERIOUS_ARTIFACT: MysteriousArtifact,
  };

  const Icon = $derived(ICONS[code] ?? ICONS['WOOD']);
</script>

<Icon {size} {extraClass} />
