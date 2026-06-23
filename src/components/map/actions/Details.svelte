<script>
  import { apiPost } from '../../../lib/api.js';
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { slide } from "svelte/transition";
  
  import { calculateGroupPower, calculateGroupCombatStats } from 'gisaima-shared/war/battles.js';
  import UNITS from 'gisaima-shared/definitions/UNITS.js';
  import { groupCarryCapacity } from 'gisaima-shared/economy/items.js';
  import { ITEMS, getGatherableItems } from 'gisaima-shared/definitions/ITEMS.js';
  import { STRUCTURES } from 'gisaima-shared/definitions/STRUCTURES.js';

  import { coordinates, targetStore, entities } from "../../../lib/stores/map.js";
  import { game, currentPlayer, cancelMove } from "../../../lib/stores/game.js";
  
  import Torch from '../../icons/Torch.svelte';
  import StructureIcon from '../../icons/StructureIcon.svelte';
  import Cancel from '../../icons/Close.svelte';
  import Horn from '../../icons/Horn.svelte';
  import Human from '../../icons/Human.svelte';
  import Elf from '../../icons/Elf.svelte';
  import Dwarf from '../../icons/Dwarf.svelte';
  import Goblin from '../../icons/Goblin.svelte';
  import Fairy from '../../icons/Fairy.svelte';
  import Monster from '../../icons/Monster.svelte';
  import Swords from '../../icons/Swords.svelte';
  import Compass from '../../icons/Compass.svelte';
  import Crop from '../../icons/Crop.svelte';
  import Rally from '../../icons/Rally.svelte';
  import Rings from '../../icons/Rings.svelte';
  import Sword from '../../icons/Sword.svelte';
  import Hammer from '../../icons/Hammer.svelte';
  import Unit from '../../icons/Unit.svelte';
  import Race from '../../icons/Race.svelte';
  import ItemIcon from '../../icons/ItemIcon.svelte';
  import GroupStatus from './GroupStatus.svelte';
  const {
    onClose = () => {},
    onShowModal = null,
    onOpenUnitDetails = () => {},
  } = $props();

  // Add state to track collapsed sections — all sections start collapsed so the
  // panel opens compact; the player expands what they want.
  let collapsedSections = $state({
    actions: true,
    structures: true,
    players: true,
    groups: true,
    items: true,
    battles: true
  });

  // Add state to track sorting options
  let sortOptions = $state({
    groups: { by: 'name', asc: true },
    players: { by: 'name', asc: true },
    items: { by: 'name', asc: true },
    battles: { by: 'power', asc: true }
  });

  // Add a render counter to force fresh animation on each open
  let renderKey = $state(0);
  
  // Add a flag to track if component is ready to render
  let isReady = $state(false);
  
  // Add state to track expanded group units
  let expandedGroups = $state({});

  // Use simpler mounting animation control
  onMount(() => {
    // Short timeout to ensure DOM is ready
    setTimeout(() => isReady = true, 10);
  });
  
  onDestroy(() => {
    isReady = false;
  });
  
  // Function to toggle section collapse state
  function toggleSection(sectionId) {
    collapsedSections[sectionId] = !collapsedSections[sectionId];
  }

  // Function to toggle group details expansion
  function toggleGroupDetails(groupId, event) {
    if (event) {
      event.stopPropagation();
    }
    expandedGroups[groupId] = !expandedGroups[groupId];
  }

  // Function to change sort option for a section
  function setSortOption(section, by) {
    sortOptions[section] = { 
      by, 
      asc: sortOptions[section].by === by ? !sortOptions[section].asc : true 
    };
  }
  
  // Function to sort entities based on current sort options
  function sortEntities(entities, section) {
    if (!entities || !entities.length) return [];
    
    const option = sortOptions[section];
    
    return [...entities].sort((a, b) => {
      // First check if either entity is the current player (highest priority)
      if (section === 'players') {
        if (a.uid === $currentPlayer?.id) return -1;
        if (b.uid === $currentPlayer?.id) return 1;
      }
      
      // Then check if either entity is owned by the current player
      const aOwned = isOwnedByCurrentPlayer(a);
      const bOwned = isOwnedByCurrentPlayer(b);
      
      // If ownership differs, prioritize owned entities
      if (aOwned !== bOwned) {
        return aOwned ? -1 : 1;
      }
      
      // Regular sorting logic for entities with the same ownership status
      let valueA, valueB;
      
      switch(option.by) {
        case 'name':
          valueA = (a.name || a.displayName || formatEntityName(a) || '').toLowerCase();
          valueB = (b.name || b.displayName || formatEntityName(b) || '').toLowerCase();
          break;
        case 'type':
          valueA = (a.type || a.race || '').toLowerCase();
          valueB = (b.type || b.race || '').toLowerCase();
          break;
        case 'rarity':
          // For items
          const rarityOrder = { 'common': 0, 'uncommon': 1, 'rare': 2, 'epic': 3, 'legendary': 4, 'mythic': 5 };
          valueA = rarityOrder[a.rarity?.toLowerCase()] || 0;
          valueB = rarityOrder[b.rarity?.toLowerCase()] || 0;
          break;
        case 'status':
          valueA = a.status || '';
          valueB = b.status || '';
          break;
        case 'power':
          // For battles/groups
          valueA = a.power || 0;
          valueB = b.power || 0;
          break;
        default:
          valueA = a.id || '';
          valueB = b.id || '';
      }
      
      // Handle numeric comparisons
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return option.asc ? valueA - valueB : valueB - valueA;
      }
      
      // Handle string comparisons
      return option.asc ? 
        valueA.localeCompare(valueB) : 
        valueB.localeCompare(valueA);
    });
  }

  // Use targetStore instead of highlightedStore for details data
  // This ensures hovering over the minimap doesn't change the displayed information
  const detailsData = $derived($targetStore || null);

  // Derive sorted entity lists synchronously so status changes from optimistic
  // entity updates are reflected immediately without the async $effect delay.
  const sortedGroups  = $derived(sortEntities(detailsData?.groups  || [], 'groups'));
  const sortedPlayers = $derived(sortEntities(detailsData?.players || [], 'players'));

  // Marriage: wed the controlled character to another character standing on the
  // same tile (in a group together or demobilised at a structure). The server
  // enforces co-location, single-marriage, and ownership — here we just offer it
  // for any character that isn't the one you're currently controlling.
  let marryBusy = $state(false);
  function canWed(player) {
    return !!player?.id && !!$currentPlayer?.lifeId && String(player.id) !== String($currentPlayer.lifeId);
  }
  async function marryTo(otherLifeId) {
    if (marryBusy || !$currentPlayer?.lifeId) return;
    marryBusy = true;
    try {
      await apiPost(`/worlds/${encodeURIComponent($game.worldKey)}/lives/marry`, {
        lifeIdA: $currentPlayer.lifeId,
        lifeIdB: otherLifeId,
      });
    } catch (e) {
      alert(`Marriage failed: ${e.message}`);
    } finally {
      marryBusy = false;
    }
  }
  const sortedItems   = $derived(sortEntities(detailsData?.items   || [], 'items'));
  const sortedBattles = $derived(sortEntities(detailsData?.battles || [], 'battles'));

  // ─── Empty-tile "potential" overview ────────────────────────────
  // When a tile has no structure, surface what the biome offers so the tile
  // still tells the player something useful: gatherable resources and any
  // build opportunities the terrain unlocks (e.g. harbours next to water).
  // Gather resolution is shared with the server (getGatherableItems resolves
  // any specific biome name to its broad category in ITEMS.js).
  function isWaterTile(t) {
    if (!t) return false;
    if (t.biome?.water) return true;
    if (t.riverValue > 0.2 || t.lakeValue > 0.2) return true;
    return false;
  }

  // Resolve the list of gatherable resources for the current empty tile.
  const gatherables = $derived.by(() => {
    const biomeName = detailsData?.biome?.name;
    if (!biomeName) return [];
    return getGatherableItems(biomeName);
  });

  // Is this tile on or adjacent to water? (unlocks harbours / boats)
  const nearWater = $derived.by(() => {
    if (!detailsData) return false;
    if (isWaterTile(detailsData)) return true;
    const offsets = [
      { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
      { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
    ];
    const coords = get(coordinates);
    return offsets.some(o =>
      isWaterTile(coords.find(c => c.x === detailsData.x + o.x && c.y === detailsData.y + o.y))
    );
  });

  const onWater = $derived(detailsData ? isWaterTile(detailsData) : false);

  // Player-buildable structures (exclude monster lairs and spawns).
  const buildableStructures = $derived(
    Object.entries(STRUCTURES)
      .filter(([id, s]) => !s.monster && id !== 'spawn')
      .map(([id, s]) => ({ id, name: s.name, type: s.type, buildTime: s.buildTime }))
  );

  // Does the player have an idle group here that could actually build?
  const canBuildHere = $derived(
    !detailsData?.structure &&
    !!detailsData?.groups?.some(g => g.owner === $currentPlayer?.id && g.status === 'idle')
  );

  // ─── Structure explainer modal ──────────────────────────────────
  // Clicking a build-opportunity chip opens a modal describing that structure
  // (durability, build time, costs, features) so players can compare options
  // before committing an idle group to building.
  let infoStructureId = $state(null);
  const infoStructure = $derived(infoStructureId ? STRUCTURES[infoStructureId] : null);
  function openStructureInfo(id) { infoStructureId = id; }
  function closeStructureInfo() { infoStructureId = null; }
  function structureBonusList(def) {
    if (!def?.bonuses) return [];
    return Object.entries(def.bonuses).map(([k, v]) => ({ label: _fmt(k), value: v }));
  }

  // Function to execute action
  function executeAction(action, data = null) {
    if (!onShowModal || !detailsData) return;

    const tileData = get(coordinates).find(c => 
      c.x === detailsData.x && c.y === detailsData.y
    );

    if (!tileData) return;

    switch (action) {
      case 'mobilise':
        onShowModal({ type: 'mobilise', data: tileData });
        break;
        
      case 'move':
        onShowModal({ type: 'move', data: data ? { ...tileData, group: data.group } : tileData });
        break;

      case 'build':
        onShowModal({ type: 'build', data: tileData });
        break;
        
      case 'attack':
        onShowModal({ type: 'attack', data: tileData });
        break;
        
      case 'gather':
        console.log('Starting gather action with data:', data);
        console.log('Tile data:', tileData);
        
        // Fix: Ensure we always include the tileData, regardless of whether a specific group was selected
        const gatherData = data && data.group 
          ? { ...tileData, group: data.group } 
          : { ...tileData };
          
        onShowModal({ type: 'gather', data: gatherData });
        break;
        
      case 'demobilise':
        onShowModal({ type: 'demobilise', data: tileData });
        break;
        
      case 'joinBattle':
        onShowModal({ type: 'joinBattle', data: data ? { ...tileData, group: data.group } : tileData });
        break;
        
      // Change 'recruit' to 'recruitment' to match what +page.svelte expects
      case 'recruit':
        onShowModal({ type: 'recruitment', data: tileData });
        break;
        
      case 'craft':
        onShowModal({ 
          type: 'craft', 
          data: { 
            x: tileData.x, 
            y: tileData.y, 
            structure: tileData.structure,
            tile: tileData
          } 
        });
        break;
        
      default:
        console.warn("Unknown action:", action);
    }
  }

  // Format entity name
  function formatEntityName(entity) {
    if (!entity) return "Unknown";
    return entity.name || entity.displayName || entity.type || "Unnamed";
  }

  // Format text with proper capitalization
  function _fmt(text) {
    if (!text) return '';
    return text.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Check if current player owns an entity
  function isOwnedByCurrentPlayer(entity) {
    if (!entity || !$currentPlayer) return false;

    // Check if any ID matches between the two sets
    return entity.owner === $currentPlayer.id;
  }
  
  function canMobilize(tile) {
    if (!tile || !$currentPlayer) return false;
    
    // Check if player is on the tile
    const playerOnTile = tile.players?.some(p => p.uid === $currentPlayer.id);
    
    // Check if player is not already in a mobilizing/demobilising group
    const inProcessGroup = tile.groups?.some(g => 
      (g.status === 'mobilizing' || g.status === 'demobilising') && 
      g.owner === $currentPlayer.id
    );
    
    return playerOnTile && !inProcessGroup;
  }
  
  function canDemobilize(tile) {
    if (!tile || !$currentPlayer || !tile.structure) return false;
    
    // Check if there are any player-owned groups that are idle
    return tile.groups?.some(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
  }

  function canBuild(tile) {
    return !tile?.structure && tile.groups?.some(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
  };
  
  function canMove(tile) {
    if (!tile || !$currentPlayer) return false;
    
    // Check if there are any player-owned groups that are idle
    return tile.groups?.some(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
  }
  
  // Add new function to check if attack is possible
  function canAttack(tile) {
    if (!tile || !$currentPlayer) return false;
    
    // Check if there are any player-owned groups that are idle
    const playerGroups = tile.groups?.filter(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
    
    // Check if there are any enemy groups on the tile
    // Now includes both idle and gathering status
    const enemyGroups = tile.groups?.filter(g => 
      g.owner !== $currentPlayer.id && 
      (g.status === 'idle' || g.status === 'gathering')
    );
    
    // Can attack if player has at least one group and there's at least one enemy group
    return playerGroups?.length > 0 && enemyGroups?.length > 0;
  }
  
  function canGather(tile) {
    if (!tile || !$currentPlayer) {
      return false;
    }
    
    // Only check if there are any player-owned groups that are idle and not in battle
    // (Similar to canDemobilize, but don't check for items)
    return tile.groups?.some(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
  }
  
  function canCraft(tile) {
    if (!tile || !$currentPlayer) return false;
    
    // Check if player is at a structure
    const hasStructure = !!tile.structure;
    const playerOnTile = tile.players?.some(p => p.uid === $currentPlayer.id);
    
    // Check if player is in an idle group
    const playerInIdleGroup = tile.groups?.some(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
    
    // Can craft if player is at a structure OR in an idle group
    return (hasStructure && playerOnTile) || playerInIdleGroup;
  }
  
  function canJoinBattle(tile) {
    if (!tile || !$currentPlayer) return false;
    
    // Check if there's battle and player has idle groups
    return tile.battles?.length > 0 &&
           tile.groups?.some(g => 
             g.owner === $currentPlayer.id && 
             g.status === 'idle'
           );
  }

  // Add function to check if recruitment is possible
  function canRecruit(tile) {
    if (!tile || !$currentPlayer || !tile.structure) return false;
    
    // Player must be on tile as an entity
    const playerOnTile = tile.players?.some(p => p.uid === $currentPlayer.id);
    
    // Check if player is in ANY group (not just mobilizing/demobilizing)
    const isInAnyGroup = tile.groups?.some(g => 
      g.owner === $currentPlayer.id || 
      (g.members && g.members[$currentPlayer.id]) ||
      (g.memberIds && Array.isArray(g.memberIds) && g.memberIds.includes($currentPlayer.id))
    );
    
    // Check if player is on tile but not in any group
    return playerOnTile && !isInAnyGroup;
  }
  
  // Add function to check if player can be mobilized
  function canMobilizePlayer(player) {
    if (!player || !$currentPlayer || player.uid !== $currentPlayer.id) return false;
    
    // Check if player is not already in a mobilizing/demobilising group
    const inProcessGroup = detailsData?.groups?.some(g => 
      (g.status === 'mobilizing' || g.status === 'demobilising') && 
      g.owner === $currentPlayer.id
    );
    
    return !inProcessGroup;
  }
  
  // Get status class from status
  function getStatusClass(status) {
    return status || 'idle';
  }
  
  // Get rarity class from item rarity
  function getRarityClass(rarity) {
    return rarity?.toLowerCase() || 'common';
  }

  // Format coordinates for display
  function formatCoords(x, y) {
    return `${x},${y}`;
  }

  // Timer for updating countdown
  let updateTimer;
  // Counter to force updates
  let updateCounter = $state(0);

  // Set up timer to update countdown values
  onMount(() => {
    updateTimer = setInterval(() => {
      updateCounter++;
    }, 1000);
    
    return () => {
      if (updateTimer) clearInterval(updateTimer);
    };
  });

  // Function to display item count for a group
  function getGroupItemCount(group) {
    if (!group.items) return 0;
    if (Array.isArray(group.items)) return group.items.reduce((s, i) => s + (i.quantity || 1), 0);
    return Object.values(group.items).reduce((s, i) => s + (typeof i === 'number' ? i : (i.quantity || 1)), 0);
  }

  // Mirror the shared groupCarryCapacity (incl. genetic carry bonus) so the
  // displayed "x/y" matches the server's gather-until-full stop exactly.
  function getGroupCarryCapacity(group) {
    return groupCarryCapacity(group);
  }

  // Typed combat breakdown for the battle view — melee/ranged/magic attack &
  // defence, the stats that actually drive the battle, rather than a single
  // opaque "power" number.
  function combatStats(group) {
    const s = calculateGroupCombatStats(group);
    const r = (n) => Math.round(n || 0);
    return {
      atk: [
        { key: 'melee',  label: 'Melee',  value: r(s.meleeAtk) },
        { key: 'ranged', label: 'Ranged', value: r(s.rangedAtk) },
        { key: 'magic',  label: 'Magic',  value: r(s.magicAtk) },
      ],
      def: [
        { key: 'melee',  label: 'Melee',  value: r(s.meleeDef) },
        { key: 'ranged', label: 'Ranged', value: r(s.rangedDef) },
        { key: 'magic',  label: 'Magic',  value: r(s.magicDef) },
      ],
    };
  }

  // Function to count units in a group
  function getGroupUnitCount(group) {
    if (!group.units) return 0;
    return Array.isArray(group.units) ? group.units.length : Object.keys(group.units).length;
  }

  // Format total power for each side
  function formatPower(power) {
    if (!power && power !== 0) return '?';
    return power.toLocaleString();
  }

  // Determine winning side CSS class
  function getWinningSideClass(battle, side) {
    if (!battle) return '';
    return battle.winner === side ? 'winning-side' : 'losing-side';
  }

  // Get unit count for a side in battle
  function getUnitCountForSide(battle, side) {
    if (!battle) return 0;
    const sideData = side === 1 ? battle.side1 : battle.side2;
    if (!sideData?.groups) return 0;
    
    return Object.values(sideData.groups).reduce((count, g) => 
      count + (g.units ? Object.keys(g.units).length : 0), 0);
  }

  // Add keyboard handler for the Escape key
  // Function to handle keyboard events on interactive elements
  function handleSectionKeyDown(event, sectionId) {
    // Toggle section on Enter or Space key
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent page scroll on space
      toggleSection(sectionId);
    }
  }

  // Function to cancel group movement
  async function cancelGroupMove(group, event) {
    if (!group || !$currentPlayer) {
      return;
    }
    
    // Stop event propagation to prevent other click handlers from triggering
    if (event) {
      event.stopPropagation();
    }
    
    try {
      // Use the cancelMove function imported from game store
      const result = await cancelMove(group.id, group.x, group.y);

      if (result.success) {
        // Optimistically update the group status so movement lines disappear immediately
        const tileKey = `${group.x},${group.y}`;
        entities.update(current => {
          const tileGroups = current.groups[tileKey];
          if (!tileGroups) return current;
          return {
            ...current,
            groups: {
              ...current.groups,
              [tileKey]: tileGroups.map(g =>
                g.id === group.id
                  ? { ...g, status: 'stopping', movementPath: null, pathIndex: null }
                  : g
              )
            }
          };
        });
      } else {
        console.error('Failed to cancel movement:', result.error);
      }
    } catch (error) {
      console.error('Error cancelling movement:', error);
    }
  }

  // Function to handle fleeing from battle
  async function handleFleeBattle(group, event) {
    if (!group || !$currentPlayer) {
      return;
    }
    
    // Stop event propagation
    if (event) {
      event.stopPropagation();
    }
    
    try {
      const result = await apiPost('/actions/flee', {
        groupId: group.id,
        x: group.x,
        y: group.y,
        worldId: $game.worldKey
      });
      
      console.log('Successfully fled from battle:', result);
      
      // No need to update UI manually as Firebase will trigger changes
    } catch (error) {
      console.error('Error fleeing from battle:', error);
    }
  }
  
  // Add function to check if a group can flee from battle
  function canFleeFromBattle(group) {
    if (!group || !$currentPlayer) return false;
    
    // Group must be owned by current player and in battle
    return group.owner === $currentPlayer.id && group.battleId;
  }
  
  // Add helper function to count units by type
  function countUnitsByType(units) {
    if (!units) return [];
    
    const counts = {};
    Object.values(units).forEach(unit => {
      const unitType = unit.type || 'unknown';
      if (!counts[unitType]) {
        counts[unitType] = {
          type: unitType,
          count: 0,
          race: unit.race || null,
          // Track if there are any players in this type
          hasPlayers: unitType === 'player'
        };
      }
      counts[unitType].count++;
    });
    
    return Object.values(counts);
  }
  
  // Helper function to calculate power from items only
  function calculateItemPower(group) {
    if (!group || !group.items) return 0;
    
    // Convert items to array if it's an object
    const items = Array.isArray(group.items) ? group.items : Object.values(group.items);
    
    let totalItemPower = 0;
    
    // Simple calculation - assume each item contributes 1 power
    // In a real implementation this would use actual item power values
    items.forEach(item => {
      const quantity = item.quantity || 1;
      const power = item.power || 1;
      totalItemPower += power * quantity;
    });
    
    return totalItemPower;
  }
  
  // Boat helpers
  function isBoatGroup(group) {
    return group?.motion?.includes('water') && group?.boatCapacity > 0;
  }

  function getBoatPassengers(group) {
    return Object.entries(group?.passengers || {}).map(([id, g]) => ({ ...g, id }));
  }

  function getLoadableGroups(boatGroup) {
    if (!detailsData?.groups) return [];
    const used = Object.keys(boatGroup.passengers || {});
    return detailsData.groups.filter(g =>
      g.id !== boatGroup.id &&
      g.owner === $currentPlayer?.id &&
      g.status === 'idle' &&
      !used.includes(g.id)
    );
  }

  function getRemainingCapacity(boatGroup) {
    const passengerUnits = Object.values(boatGroup.passengers || {})
      .reduce((sum, g) => sum + Object.keys(g.units || {}).length, 0);
    return boatGroup.boatCapacity - (boatGroup.transportedUnits || 0) - passengerUnits;
  }

  async function handleLoadGroup(boatGroup, passengerGroup, event) {
    if (event) event.stopPropagation();
    try {
      await apiPost('/actions/loadGroup', {
        worldId: $game.worldKey,
        boatGroupId: boatGroup.id,
        passengerGroupId: passengerGroup.id,
        tileX: detailsData.x,
        tileY: detailsData.y
      });
    } catch (e) {
      console.error('Failed to load group:', e);
    }
  }

  async function handleUnloadGroup(boatGroup, passengerGroupId, event) {
    if (event) event.stopPropagation();
    try {
      await apiPost('/actions/unloadGroup', {
        worldId: $game.worldKey,
        boatGroupId: boatGroup.id,
        passengerGroupId,
        tileX: detailsData.x,
        tileY: detailsData.y
      });
    } catch (e) {
      console.error('Failed to unload group:', e);
    }
  }

  // Function to cancel group gathering
  async function cancelGroupGather(group, event) {
    if (!group || !$currentPlayer) {
      return;
    }
    
    // Stop event propagation to prevent other click handlers from triggering
    if (event) {
      event.stopPropagation();
    }
    
    try {
      const result = await apiPost('/actions/cancelGathering', {
        groupId: group.id,
        locationX: group.x,
        locationY: group.y,
        worldId: $game.worldKey
      });
      
      if (result.success) {
        // Optimistically flip the group to idle — the server cancels
        // immediately but ops.flush() does not broadcast, so without this the
        // group keeps showing "gathering" until the next page load.
        const tileKey = `${group.x},${group.y}`;
        entities.update(current => {
          const tileGroups = current.groups[tileKey];
          if (!tileGroups) return current;
          return {
            ...current,
            groups: {
              ...current.groups,
              [tileKey]: tileGroups.map(g =>
                g.id === group.id
                  ? { ...g, status: 'idle', gatheringBiome: null, gatheringTicksRemaining: null }
                  : g
              )
            }
          };
        });
      } else {
        console.error('Failed to cancel gathering:', result.data.error);
      }
    } catch (error) {
      console.error('Error cancelling gathering:', error);
    }
  }
</script>

<div class="details-modal" key={renderKey}>
    <div class="modal-content">
      <!-- Empty-tile potential: gatherables + build opportunities -->
      {#if detailsData && !detailsData.structure}
        <div class="tile-potential">
          {#if gatherables.length > 0}
            <div class="potential-block">
              <div class="potential-title">
                <Crop extraClass="potential-icon" />
                Gatherable here
                <span class="entity-count items-count">{gatherables.length}</span>
              </div>
              <div class="potential-tags">
                {#each gatherables as g (g.code)}
                  <span class="resource-chip {getRarityClass(g.rarity)}" title={_fmt(g.rarity)}>
                    {g.name}{#if g.food}<span class="food-dot" title="Food">●</span>{/if}
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          {#if onWater}
            <div class="potential-block">
              <div class="potential-title">
                <Hammer extraClass="potential-icon" />
                Build opportunities
              </div>
              <div class="potential-hint">
                Structures can't be built on water. Build a harbour on adjacent
                land to put boats to sea.
              </div>
            </div>
          {:else}
            <div class="potential-block">
              <div class="potential-title">
                <Hammer extraClass="potential-icon" />
                Build opportunities
              </div>
              <div class="potential-tags">
                {#each buildableStructures as s (s.id)}
                  <button
                    type="button"
                    class="build-chip"
                    onclick={() => openStructureInfo(s.id)}
                    title="Learn about the {s.name}"
                  >
                    <StructureIcon type={s.type} size="1.1em" extraClass="build-chip-icon" />
                    <span class="build-chip-name">{s.name}</span>
                  </button>
                {/each}
                {#if nearWater}
                  <span class="build-chip water">
                    ⚓ Harbour (water adjacent)
                  </span>
                {/if}
              </div>
              <div class="potential-hint">
                {#if canBuildHere}
                  Use an idle group's <strong>Build</strong> action to construct here.
                {:else}
                  Move an idle group here to build.
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Groups section with styled count -->
      {#if detailsData.groups?.length > 0}
        <div class="entities-section">
          <div 
            class="section-header"
            onclick={() => toggleSection('groups')}
            role="button"
            tabindex="0"
            aria-expanded={!collapsedSections.groups}
            onkeydown={(e) => handleSectionKeyDown(e, 'groups')}
          >
            <div class="section-title">
              Groups <span class="entity-count groups-count">{detailsData.groups.length}</span>
            </div>
            <div class="section-controls">
              {#if !collapsedSections.groups}
                <div class="sort-controls">
                  <button 
                    class="sort-option"
                    class:active={sortOptions.groups.by === 'name'}
                    onclick={(e) => { e.stopPropagation(); setSortOption('groups', 'name'); }}
                  >
                    <span>Name</span>
                    {#if sortOptions.groups.by === 'name'}
                      <span class="sort-direction">{sortOptions.groups.asc ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                  <button 
                    class="sort-option" 
                    class:active={sortOptions.groups.by === 'status'}
                    onclick={(e) => { e.stopPropagation(); setSortOption('groups', 'status'); }}
                  >
                    <span>Status</span>
                    {#if sortOptions.groups.by === 'status'}
                      <span class="sort-direction">{sortOptions.groups.asc ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                  <button 
                    class="sort-option" 
                    class:active={sortOptions.groups.by === 'power'}
                    onclick={(e) => { e.stopPropagation(); setSortOption('groups', 'power'); }}
                  >
                    <span>Power</span>
                    {#if sortOptions.groups.by === 'power'}
                      <span class="sort-direction">{sortOptions.groups.asc ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                </div>
              {/if}
              <button class="collapse-button">
                {collapsedSections.groups ? '▼' : '▲'}
              </button>
            </div>
          </div>
          
          {#if !collapsedSections.groups}
            <div class="section-content" transition:slide|local={{ duration: 300 }}>
              {#each sortedGroups as group}
                <div class="entity group {isOwnedByCurrentPlayer(group) ? 'player-owned' : ''}">
                  <div class="entity-left">
                    <div class="entity-icon">
                      {#if group.type === 'monster'}
                        <Monster extraClass="race-icon-details" />
                      {:else if group.race}
                        {#if group.race.toLowerCase() === 'human'}
                          <Human extraClass="race-icon-details" />
                        {:else if group.race.toLowerCase() === 'elf'}
                          <Elf extraClass="race-icon-details" />
                        {:else if group.race.toLowerCase() === 'dwarf'}
                          <Dwarf extraClass="race-icon-details" />
                        {:else if group.race.toLowerCase() === 'goblin'}
                          <Goblin extraClass="race-icon-details" />
                        {:else if group.race.toLowerCase() === 'fairy'}
                          <Fairy extraClass="race-icon-details" />
                        {/if}
                      {/if}
                    </div>
                    
                    <div class="entity-info">
                      <div class="entity-name">
                        {formatEntityName(group)}
                        <span class="group-power">({formatPower(calculateGroupPower(group))})</span>
                        {#if isOwnedByCurrentPlayer(group)}
                          <span class="entity-badge owner-badge">Yours</span>
                        {/if}
                      </div>
                      
                      <div class="entity-details">
                        <div class="entity-details-left">
                          <span class="unit-count">
                            {getGroupUnitCount(group)} units
                            {#if getGroupCarryCapacity(group) > 0}
                              • <span class="item-count">{getGroupItemCount(group)}/{getGroupCarryCapacity(group)} items</span>
                            {:else if getGroupItemCount(group) > 0}
                              • <span class="item-count">{getGroupItemCount(group)} items</span>
                            {/if}
                            {#if getGroupUnitCount(group) > 0}
                              <button 
                                class="toggle-units-btn"
                                onclick={(e) => toggleGroupDetails(group.id, e)}
                                aria-expanded={!!expandedGroups[group.id]}
                              >
                                {expandedGroups[group.id] ? 'Hide' : 'Show'}
                              </button>
                            {/if}
                          </span>
                          
                          <!-- Replace manual status rendering with GroupStatus component -->
                          <GroupStatus {group} />
                        </div>
                      </div>
                      
                      <!-- Add expandable units list -->
                      {#if expandedGroups[group.id] && (getGroupUnitCount(group) > 0 || getGroupItemCount(group) > 0)}
                        <div class="group-expanded-details">
                          {#if getGroupUnitCount(group) > 0}
                            <div class="expanded-section-title">Units ({getGroupUnitCount(group)})</div>
                            <div class="group-units-list">
                              {#each Object.entries(group.units) as [unitId, unit]}
                                {@const isOwned = group.owner === $currentPlayer?.id}
                                <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                                <div
                                  class="group-unit"
                                  class:clickable={isOwned}
                                  role={isOwned ? 'button' : undefined}
                                  tabindex={isOwned ? 0 : undefined}
                                  onclick={isOwned ? () => onOpenUnitDetails(unit, unitId, group) : undefined}
                                  onkeydown={isOwned ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenUnitDetails(unit, unitId, group); } } : undefined}
                                >
                                  <div class="unit-icon">
                                    {#if unit.type === 'player'}
                                      <Race raceKey={unit.race} extraClass="expanded-unit-race-icon" />
                                    {:else}
                                      <Unit unitIconKey={unit.type} extraClass="expanded-unit-race-icon" />
                                    {/if}
                                  </div>
                                  <div class="unit-info">
                                    <div class="unit-name">
                                      {unit.displayName || unit.name || unit.type || unitId.slice(-5)}
                                      {#if unit.type === 'player' && unit.uid === $currentPlayer?.id}
                                        <span class="entity-badge owner-badge">You</span>
                                      {/if}
                                      {#if isOwned}
                                        <span class="unit-equip-hint">⚙ Equip</span>
                                      {/if}
                                    </div>
                                    <div class="unit-details">
                                      {#if unit.type === 'player' }
                                        <span class="unit-race-tag">{_fmt(unit.race)}</span>
                                      {/if}
                                      <span class="unit-type-tag">{_fmt(unit.type)}</span>
                                      {#if unit.type !== 'player'}
                                        {@const uDef = UNITS[unit.type]}
                                        {#if uDef}
                                          {#if (uDef.meleeAttack||0) > 0}<span class="unit-stat-tag melee">M·{uDef.meleeAttack.toFixed(1)}</span>{/if}
                                          {#if (uDef.rangedAttack||0) > 0}<span class="unit-stat-tag ranged">R·{uDef.rangedAttack.toFixed(1)}</span>{/if}
                                          {#if (uDef.magicAttack||0) > 0}<span class="unit-stat-tag magic">Mg·{uDef.magicAttack.toFixed(1)}</span>{/if}
                                        {/if}
                                      {/if}
                                      {#if unit.type !== 'player'}
                                        <span
                                          class="unit-level-tag"
                                          title="XP: {unit.xp ?? 0} / {(unit.level ?? 1) * 100}"
                                        >Lv {unit.level ?? 1}</span>
                                      {/if}
                                      {#if unit.equipment && Object.values(unit.equipment).some(Boolean)}
                                        <span class="unit-equipped-tag">⚔ Equipped</span>
                                      {/if}
                                    </div>
                                  </div>
                                </div>
                              {/each}
                            </div>
                          {/if}
                          
                          {#if getGroupItemCount(group) > 0}
                            <div class="expanded-section-title">Items ({getGroupItemCount(group)}{#if getGroupCarryCapacity(group) > 0}/{getGroupCarryCapacity(group)}{/if})</div>
                            <div class="group-items-list">
                              {#if Array.isArray(group.items)}
                                {#each group.items as item}
                                  {@const itemCode = (item.id || item.type || '').toUpperCase()}
                                  <div class="group-item {getRarityClass(item.rarity)}">
                                    <div class="item-icon-wrap">
                                      <ItemIcon code={itemCode} extraClass="group-item-icon" />
                                    </div>
                                    <div class="item-name">
                                      {item.name || _fmt(item.type) || "Unknown Item"}
                                      {#if item.quantity > 1}
                                        <span class="item-quantity">×{item.quantity}</span>
                                      {/if}
                                    </div>
                                    {#if item.rarity && item.rarity !== 'common'}
                                      <span class="item-rarity-tag {item.rarity.toLowerCase()}">{_fmt(item.rarity)}</span>
                                    {/if}
                                  </div>
                                {/each}
                              {:else}
                                {#each Object.entries(group.items) as [itemId, item]}
                                  {@const qty = typeof item === 'number' ? item : (item.quantity || 1)}
                                  {@const itemObj = typeof item === 'object' ? item : null}
                                  {@const itemDef = ITEMS[itemId] || ITEMS[String(itemId).toUpperCase()]}
                                  {@const itemCode = String(itemId).toUpperCase()}
                                  <div class="group-item {getRarityClass(itemObj?.rarity || itemDef?.rarity)}">
                                    <div class="item-icon-wrap">
                                      <ItemIcon code={itemCode} extraClass="group-item-icon" />
                                    </div>
                                    <div class="item-name">
                                      {itemObj?.name || itemDef?.name || _fmt(itemObj?.type) || _fmt(itemId) || "Unknown Item"}
                                      {#if qty > 1}
                                        <span class="item-quantity">×{qty}</span>
                                      {/if}
                                    </div>
                                    {#if (itemObj?.rarity || itemDef?.rarity) && (itemObj?.rarity || itemDef?.rarity) !== 'common'}
                                      {@const rarity = itemObj?.rarity || itemDef?.rarity}
                                      <span class="item-rarity-tag {rarity.toLowerCase()}">{_fmt(rarity)}</span>
                                    {/if}
                                  </div>
                                {/each}
                              {/if}
                            </div>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  </div>
                  
                  {#if isOwnedByCurrentPlayer(group) && group.status === 'idle'}
                    <div class="entity-actions">
                      <button class="entity-action" onclick={() => executeAction('move', { group })}>
                        <Compass extraClass="action-icon-small compass-icon" />
                        Move
                      </button>
                      {#if detailsData.items?.length > 0}
                        <button class="entity-action" onclick={() => executeAction('gather', { group })}>
                          <Crop extraClass="action-icon-small crop-icon" />
                          Gather
                        </button>
                      {/if}
                      {#if detailsData.battles?.length > 0}
                        <button class="entity-action" onclick={() => executeAction('joinBattle', { group })}>
                          Join Battle
                        </button>
                      {/if}
                      {#if isBoatGroup(group)}
                        {@const loadable = getLoadableGroups(group)}
                        {@const capacity = getRemainingCapacity(group)}
                        <span class="boat-capacity-badge">
                          {capacity}/{group.boatCapacity} capacity
                        </span>
                        {#each loadable as pg}
                          {#if Object.keys(pg.units || {}).length <= capacity}
                            <button class="entity-action boat-action" onclick={(e) => handleLoadGroup(group, pg, e)}>
                              Board: {pg.name || 'Group'}
                            </button>
                          {/if}
                        {/each}
                        {#each getBoatPassengers(group) as pg}
                          <button class="entity-action boat-action disembark" onclick={(e) => handleUnloadGroup(group, pg.id, e)}>
                            Disembark: {pg.name || 'Group'}
                          </button>
                        {/each}
                      {/if}
                    </div>
                  {:else if isOwnedByCurrentPlayer(group) && group.status === 'moving'}
                    <div class="entity-actions">
                      <button 
                        class="entity-action cancel-action" 
                        onclick={(e) => cancelGroupMove(group, e)}
                      >
                        <Cancel extraClass="action-icon-small cancel-icon" />
                        Cancel Move
                      </button>
                    </div>
                  {:else if isOwnedByCurrentPlayer(group) && group.status === 'gathering'}
                    <div class="entity-actions">
                      <button 
                        class="entity-action cancel-action" 
                        onclick={(e) => cancelGroupGather(group, e)}
                      >
                        <Cancel extraClass="action-icon-small cancel-icon" />
                        Cancel Gather
                      </button>
                    </div>
                  {:else if canFleeFromBattle(group)}
                    <!-- Add new flee button for groups in battle -->
                    <div class="entity-actions">
                      <button 
                        class="entity-action flee-action" 
                        onclick={(e) => handleFleeBattle(group, e)}
                      >
                        <Cancel extraClass="action-icon-small flee-icon" />
                        Flee Battle
                      </button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      
      <!-- Players section with styled count -->
      {#if detailsData.players?.length > 0}
        <div class="entities-section">
          <div 
            class="section-header"
            onclick={() => toggleSection('players')}
            role="button"
            tabindex="0"
            aria-expanded={!collapsedSections.players}
            onkeydown={(e) => handleSectionKeyDown(e, 'players')}
          >
            <div class="section-title">
              Players <span class="entity-count players-count">{detailsData.players.length}</span>
            </div>
            <div class="section-controls">
              {#if !collapsedSections.players}
                <div class="sort-controls">
                  <button 
                    class="sort-option"
                    class:active={sortOptions.players.by === 'name'}
                    onclick={(e) => { e.stopPropagation(); setSortOption('players', 'name'); }}
                  >
                    <span>Name</span>
                    {#if sortOptions.players.by === 'name'}
                      <span class="sort-direction">{sortOptions.players.asc ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                  <button 
                    class="sort-option" 
                    class:active={sortOptions.players.by === 'type'}
                    onclick={(e) => { e.stopPropagation(); setSortOption('players', 'type'); }}
                  >
                    <span>Race</span>
                    {#if sortOptions.players.by === 'type'}
                      <span class="sort-direction">{sortOptions.players.asc ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                </div>
              {/if}
              <button class="collapse-button">
                {collapsedSections.players ? '▼' : '▲'}
              </button>
            </div>
          </div>
          
          {#if !collapsedSections.players}
            <div class="section-content" transition:slide|local={{ duration: 300 }}>
              {#each sortedPlayers as player}
                <div class="entity player {player.uid === $currentPlayer?.id ? 'current' : ''} {player.uid === $currentPlayer?.id ? 'player-owned' : ''}">
                  <div class="entity-icon">
                    {#if player.race}
                      {#if player.race.toLowerCase() === 'human'}
                        <Human extraClass="race-icon-details" />
                      {:else if player.race.toLowerCase() === 'elf'}
                        <Elf extraClass="race-icon-details" />
                      {:else if player.race.toLowerCase() === 'dwarf'}
                        <Dwarf extraClass="race-icon-details" />
                      {:else if player.race.toLowerCase() === 'goblin'}
                        <Goblin extraClass="race-icon-details" />
                      {:else if player.race.toLowerCase() === 'fairy'}
                        <Fairy extraClass="race-icon-details" />
                      {/if}
                    {/if}
                  </div>
                  <div class="entity-info">
                    <div class="entity-name">
                      {player.displayName || 'Player'}
                      {#if player.uid === $currentPlayer?.id}
                        <span class="entity-badge owner-badge">You</span>
                      {/if}
                    </div>
                    <div class="entity-details">
                      <div class="entity-details-left">
                        {#if player.race}
                          <div class="entity-race">{_fmt(player.race)}</div>
                        {/if}
                        {#if player.status}
                          <span class="entity-badge {getStatusClass(player.status)}">
                            {_fmt(player.status)}
                          </span>
                        {/if}
                      </div>
                    </div>
                  </div>

                  <!-- Mobilise sits at entity level so it right-aligns correctly -->
                  {#if canWed(player)}
                    <div class="entity-actions">
                      <button class="entity-action" onclick={() => marryTo(player.id)} disabled={marryBusy} title="Wed your character to this one (must be on the same tile)">
                        <Rings extraClass="action-icon-small" />
                        Wed
                      </button>
                    </div>
                  {/if}
                  {#if canMobilizePlayer(player)}
                    <div class="entity-actions">
                      <button class="entity-action" onclick={() => executeAction('mobilise')}>
                        <Rally extraClass="action-icon-small rally-icon" />
                        Mobilise
                      </button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      
      <!-- Items section with styled count -->
      {#if detailsData.items?.length > 0}
        <div class="entities-section">
          <div 
            class="section-header"
            onclick={() => toggleSection('items')}
            role="button"
            tabindex="0"
            aria-expanded={!collapsedSections.items}
            onkeydown={(e) => handleSectionKeyDown(e, 'items')}
          >
            <div class="section-title">
              Items <span class="entity-count items-count">{detailsData.items.length}</span>
            </div>
            <div class="section-controls">
              {#if !collapsedSections.items}
                <div class="sort-controls">
                  <button 
                    class="sort-option"
                    class:active={sortOptions.items.by === 'name'}
                    onclick={(e) => { e.stopPropagation(); setSortOption('items', 'name'); }}
                  >
                    <span>Name</span>
                    {#if sortOptions.items.by === 'name'}
                      <span class="sort-direction">{sortOptions.items.asc ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                  <button 
                    class="sort-option" 
                    class:active={sortOptions.items.by === 'rarity'}
                    onclick={(e) => { e.stopPropagation(); setSortOption('items', 'rarity'); }}
                  >
                    <span>Rarity</span>
                    {#if sortOptions.items.by === 'rarity'}
                      <span class="sort-direction">{sortOptions.items.asc ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                </div>
              {/if}
              <button class="collapse-button">
                {collapsedSections.items ? '▼' : '▲'}
              </button>
            </div>
          </div>
          
          {#if !collapsedSections.items}
            <div class="section-content" transition:slide|local={{ duration: 300 }}>
              {#each sortedItems as item}
                {@const itemCode = (item.id || item.type || '').toUpperCase()}
                <div class="entity item {getRarityClass(item.rarity)}">
                  <div class="entity-icon">
                    <ItemIcon code={itemCode} extraClass="tile-item-icon" />
                  </div>
                  <div class="entity-info">
                    <div class="entity-name item-name-row">
                      <span class="entity-name-text">{item.name || _fmt(item.type) || "Unknown Item"}</span>
                      {#if item.quantity > 1}
                        <span class="item-quantity">×{item.quantity}</span>
                      {/if}
                      {#if item.rarity && item.rarity !== 'common'}
                        <span class="item-rarity {item.rarity}">{_fmt(item.rarity)}</span>
                      {/if}
                    </div>
                    {#if item.description}
                      <div class="item-description">{item.description}</div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      
      <!-- Battles section with styled count -->
      {#if detailsData.battles?.length > 0}
        <div class="entities-section">
          <div 
            class="section-header"
            onclick={() => toggleSection('battles')}
            role="button"
            tabindex="0"
            aria-expanded={!collapsedSections.battles}
            onkeydown={(e) => handleSectionKeyDown(e, 'battles')}
          >
            <div class="section-title">
              Battles <span class="entity-count battles-count">{detailsData.battles.length}</span>
            </div>
            <div class="section-controls">
              {#if !collapsedSections.battles}
                <div class="sort-controls">
                  <button 
                    class="sort-option" 
                    class:active={sortOptions.battles.by === 'power'}
                    onclick={(e) => { e.stopPropagation(); setSortOption('battles', 'power'); }}
                  >
                    <span>Power</span>
                    {#if sortOptions.battles.by === 'power'}
                      <span class="sort-direction">{sortOptions.battles.asc ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                </div>
              {/if}
              <button class="collapse-button">
                {collapsedSections.battles ? '▼' : '▲'}
              </button>
            </div>
          </div>
          
          {#if !collapsedSections.battles}
            <div class="section-content" transition:slide|local={{ duration: 300 }}>
              {#each sortedBattles as battle}
                <div class="entity battle">
                  <div class="battle-header">
                    <div class="battle-header-left">
                      <Swords size="1.1em" extraClass="battle-icon" />
                      {#if battle.tickCount > 0}
                        <span class="battle-status-tag">Round {battle.tickCount}</span>
                      {:else}
                        <span class="battle-status-tag new">New</span>
                      {/if}
                    </div>
                    {#if battle.side1?.casualties > 0 || battle.side2?.casualties > 0}
                      <div class="battle-casualties">
                        {#if battle.side1?.casualties > 0}
                          <span class="casualties-tag">-{battle.side1.casualties}</span>
                        {/if}
                        {#if battle.side2?.casualties > 0}
                          <span class="casualties-tag">-{battle.side2.casualties}</span>
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <div class="battle-sides">
                    <div class="battle-side side1 {getWinningSideClass(battle, 1)}">
                      <div class="side-name">{battle?.side1?.name || 'Attackers'}</div>
                      {#if battle?.side1?.groups}
                        <div class="battle-groups-details">
                          {#each Object.entries(battle.side1.groups) as [groupId, group]}
                            <div class="battle-group">
                              <div class="group-info">
                                {#if group.type && (!group.race || group.race.toLowerCase() === group.type.toLowerCase())}
                                  <span class="group-type">{_fmt(group.type)}</span>
                                {:else}
                                  {#if group.race}<span class="group-race">{_fmt(group.race)}</span>{/if}
                                  {#if group.type}<span class="group-type">{_fmt(group.type)}</span>{/if}
                                {/if}
                                {#if typeof calculateGroupPower === 'function'}
                                  {@const groupPower = calculateGroupPower(group)}
                                  {@const itemPower = calculateItemPower(group)}
                                  {@const cs = combatStats(group)}
                                  <span class="group-combat-stats">
                                    {#each cs.atk as a}
                                      <span class="cs-stat cs-{a.key}" title="{a.label} attack">{a.label.slice(0, 3)} {a.value}</span>
                                    {/each}
                                  </span>
                                  <span class="group-power-info" title="Total combat power">
                                    Power: {groupPower}{#if itemPower > 0}<span class="item-power-bonus">+{itemPower}</span>{/if}
                                  </span>
                                {/if}
                              </div>
                              {#if group.units && Object.keys(group.units).length > 0}
                                <div class="battle-units">
                                  {#each countUnitsByType(group.units) as unitType}
                                    <div class="unit-type-summary">
                                      <span class="unit-type-name">
                                        {_fmt(unitType.type)}
                                        {#if unitType.race && unitType.type !== 'player' && unitType.type.toLowerCase() !== unitType.race.toLowerCase()}
                                          <span class="unit-race-tag">{_fmt(unitType.race)}</span>
                                        {/if}
                                      </span>
                                      <span class="unit-count-badge">×{unitType.count}</span>
                                    </div>
                                  {/each}
                                </div>
                              {/if}
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>

                    <div class="battle-vs">vs</div>

                    <div class="battle-side side2 {getWinningSideClass(battle, 2)}">
                      <div class="side-name">{battle?.side2?.name || 'Defenders'}</div>
                      {#if battle?.side2?.groups}
                        <div class="battle-groups-details">
                          {#each Object.entries(battle.side2.groups) as [groupId, group]}
                            <div class="battle-group">
                              <div class="group-info">
                                {#if group.type && (!group.race || group.race.toLowerCase() === group.type.toLowerCase())}
                                  <span class="group-type">{_fmt(group.type)}</span>
                                {:else}
                                  {#if group.race}<span class="group-race">{_fmt(group.race)}</span>{/if}
                                  {#if group.type}<span class="group-type">{_fmt(group.type)}</span>{/if}
                                {/if}
                                {#if typeof calculateGroupPower === 'function'}
                                  {@const groupPower = calculateGroupPower(group)}
                                  {@const itemPower = calculateItemPower(group)}
                                  {@const cs = combatStats(group)}
                                  <span class="group-combat-stats">
                                    {#each cs.atk as a}
                                      <span class="cs-stat cs-{a.key}" title="{a.label} attack">{a.label.slice(0, 3)} {a.value}</span>
                                    {/each}
                                  </span>
                                  <span class="group-power-info" title="Total combat power">
                                    Power: {groupPower}{#if itemPower > 0}<span class="item-power-bonus">+{itemPower}</span>{/if}
                                  </span>
                                {/if}
                              </div>
                              {#if group.units && Object.keys(group.units).length > 0}
                                <div class="battle-units">
                                  {#each countUnitsByType(group.units) as unitType}
                                    <div class="unit-type-summary">
                                      <span class="unit-type-name">
                                        {_fmt(unitType.type)}
                                        {#if unitType.race && unitType.type !== 'player' && unitType.type.toLowerCase() !== unitType.race.toLowerCase()}
                                          <span class="unit-race-tag">{_fmt(unitType.race)}</span>
                                        {/if}
                                      </span>
                                      <span class="unit-count-badge">×{unitType.count}</span>
                                    </div>
                                  {/each}
                                </div>
                              {/if}
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                  
                  {#if canJoinBattle(detailsData)}
                    <button class="join-battle-btn" onclick={() => executeAction('joinBattle')}>
                      Join Battle
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
</div>

<!-- Structure explainer modal — opened from a Build-opportunity chip -->
{#if infoStructure}
  <div
    class="struct-info-overlay"
    role="button"
    tabindex="0"
    aria-label="Close structure details"
    onclick={closeStructureInfo}
    onkeydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeStructureInfo(); } }}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="struct-info" role="dialog" tabindex="-1" aria-modal="true" aria-label="{infoStructure.name} details" onclick={(e) => e.stopPropagation()}>
      <div class="struct-info-head">
        <StructureIcon type={infoStructure.type} size="2em" extraClass="struct-info-icon" />
        <div class="struct-info-titles">
          <h3>{infoStructure.name}</h3>
          <span class="struct-info-type">{_fmt(infoStructure.type)}</span>
        </div>
        <button class="struct-info-close" onclick={closeStructureInfo} aria-label="Close">×</button>
      </div>

      {#if infoStructure.description}
        <p class="struct-info-desc">{infoStructure.description}</p>
      {/if}

      <div class="struct-info-stats">
        {#if infoStructure.durability}
          <div class="struct-stat"><span class="struct-stat-label">Durability</span><span class="struct-stat-value">{infoStructure.durability}</span></div>
        {/if}
        {#if infoStructure.buildTime}
          <div class="struct-stat"><span class="struct-stat-label">Build time</span><span class="struct-stat-value">{infoStructure.buildTime} tick{infoStructure.buildTime !== 1 ? 's' : ''}</span></div>
        {/if}
        {#if infoStructure.capacity}
          <div class="struct-stat"><span class="struct-stat-label">Capacity</span><span class="struct-stat-value">{infoStructure.capacity}</span></div>
        {/if}
        {#if infoStructure.sightRange}
          <div class="struct-stat"><span class="struct-stat-label">Sight</span><span class="struct-stat-value">{infoStructure.sightRange}</span></div>
        {/if}
        {#each structureBonusList(infoStructure) as b}
          <div class="struct-stat"><span class="struct-stat-label">{b.label}</span><span class="struct-stat-value">+{b.value}</span></div>
        {/each}
      </div>

      {#if infoStructure.requiredResources?.length}
        <div class="struct-info-section">
          <div class="struct-info-section-title">Build cost</div>
          <div class="struct-cost-list">
            {#each infoStructure.requiredResources as r}
              <span class="struct-cost-item">
                <ItemIcon code={String(r.id).toUpperCase()} extraClass="struct-cost-icon" />
                {ITEMS[r.id]?.name || _fmt(r.id)} ×{r.quantity}
              </span>
            {/each}
          </div>
        </div>
      {/if}

      {#if infoStructure.features?.length}
        <div class="struct-info-section">
          <div class="struct-info-section-title">Features</div>
          <ul class="struct-feature-list">
            {#each infoStructure.features as f}
              <li class="struct-feature">
                {#if f.icon}<span class="struct-feature-icon">{f.icon}</span>{/if}
                <span class="struct-feature-text"><strong>{f.name}</strong> — {f.description}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .details-modal {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: transparent;
    color: var(--chrome-text);
    font-family: var(--font-body);
    overflow: hidden;
  }

  .modal-content {
    padding: 0.75em 0.9em;
    overflow-y: auto;
    max-height: calc(85vh - 4em);
    color: var(--chrome-text);
  }

  .core-section {
    padding-bottom: 1em;
    border-bottom: 1px solid var(--chrome-gold-border);
    margin-bottom: 1em;
    background-color: var(--chrome-card);
    border-radius: 0.3em;
    border: 1px solid var(--chrome-gold-soft);
    padding: 0.8em;
  }

  .core-content {
    padding: 0;
  }

  .attribute {
    display: flex;
    margin-bottom: 0.6em;
    font-size: 0.9em;
    gap: 0.8em;
    align-items: flex-start;
  }

  .attribute-label {
    color: var(--chrome-text-dim);
    font-weight: 500;
    min-width: 40px;
    flex-shrink: 0;
  }

  .attribute-value {
    flex-grow: 1;
    color: var(--chrome-text);
    display: flex;
    align-items: center;
  }

  .terrain-color {
    display: inline-block;
    width: 1em;
    height: 1em;
    border-radius: 0.2em;
    margin-right: 0.5em;
    vertical-align: middle;
    border: 1px solid rgba(0, 0, 0, 0.2);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  }

  .core-actions {
    margin-top: 1em;
  }
  
  /* Match StructureOverview's collapsible sections: a flat field-bg container
     with a gold-soft header. Borderless — the background fill and the header's
     bottom hairline provide enough separation without a boxed outline. */
  .entities-section {
    margin-bottom: 0.6em;
    background: var(--chrome-field-bg);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5em 0.8em;
    cursor: pointer;
    user-select: none;
    position: relative;
    width: 100%;
    background-color: var(--chrome-gold-soft);
    border-bottom: 0.075em solid var(--chrome-hairline);
    transition: background-color 0.2s ease;
  }

  .section-header:hover {
    background-color: var(--chrome-gold-soft);
    filter: brightness(1.08);
  }

  /* Section title — kept identical to StructureOverview's .section-title so the
     two panels stacked in the tile-dossier read as one consistent list. Both are
     plain spans (not <h4>) so neither is recoloured by the global `.app.map h4`
     rule, which is why no specificity gymnastics are needed here. */
  .section-title {
    margin: 0;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.62em;
    font-weight: 400;
    color: var(--chrome-text);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 0.4em;
  }

  .section-controls {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin-left: auto;
  }
  
  .collapse-button {
    background: none;
    border: none;
    color: var(--chrome-text-faint);
    font-size: 0.75em;
    cursor: pointer;
    padding: 0.2em 0.4em;
    transition: color 0.15s;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .collapse-button:hover {
    color: var(--chrome-gold);
  }

  
  .entity-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 1em;
    font-size: 0.7em;
    font-weight: bold;
    padding: 0.1em 0.6em;
    margin-left: 0.3em;
    line-height: 1;
    background: var(--chrome-field-bg);
    color: var(--chrome-text);
  }

  .entity-count.groups-count {
    background: rgba(154, 51, 32, 0.2);
    color: var(--color-vermilion-2);
    border-color: rgba(193, 74, 47, 0.4);
  }

  .entity-count.players-count {
    background: var(--chrome-field-bg);
    color: var(--chrome-text-dim);
    border-color: var(--chrome-border);
  }

  .entity-count.items-count {
    background: var(--chrome-gold-soft);
    color: var(--chrome-gold);
    border-color: var(--chrome-gold-border);
  }

  .entity-count.battles-count {
    background: rgba(91, 26, 31, 0.2);
    color: var(--color-vermilion-2);
    border-color: rgba(154, 51, 32, 0.4);
  }

  .entity-count.structures-count {
    background: var(--chrome-card-strong);
    color: var(--chrome-text);
    border-color: var(--chrome-border);
  }

  .sort-controls {
    display: flex;
    gap: 0.2em;
    margin-right: 0.5em;
  }
  
  .sort-option {
    background: none;
    border: none;
    font-size: 0.7em;
    color: var(--chrome-text-faint);
    padding: 0.2em 0.4em;
    border-radius: 0.3em;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.2em;
    transition: all 0.2s ease;
  }

  .sort-option:hover {
    background-color: var(--chrome-gold-soft);
    color: var(--chrome-text);
  }

  .sort-option.active {
    background-color: var(--chrome-gold-soft);
    color: var(--chrome-gold);
  }
  
  .sort-direction {
    font-size: 0.9em;
    font-weight: bold;
  }
  
  
  .section-content {
    padding: 0.7em 0.85em;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5em;
  }

  
  .action-button {
    padding: 0.6em;
    background-color: var(--chrome-gold-soft);
    border: 1px solid var(--chrome-border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    color: var(--chrome-text);
    font-family: var(--font-body);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
  }

  .action-button:hover {
    background-color: var(--chrome-card-strong);
    transform: translateY(-1px);
  }
  
  
  .action-button:has(.compass-icon) {
    background-color: rgba(63, 90, 78, 0.22);
    border-color: rgba(76, 175, 80, 0.3);
    color: var(--chrome-text-dim);
  }

  .action-button:has(.compass-icon):hover {
    background-color: rgba(63, 90, 78, 0.35);
  }
  
  
  .action-button:has(.crop-icon) {
    background-color: rgba(255, 193, 7, 0.1);
    border-color: rgba(255, 193, 7, 0.3);
  }
  
  .action-button:has(.crop-icon):hover {
    background-color: rgba(255, 193, 7, 0.2);
  }

  
  .action-button:has(.structure-icon),
  .action-button:has(.torch-icon) {
    background-color: rgba(0, 150, 136, 0.1);
    border-color: rgba(0, 150, 136, 0.3);
  }
  
  .action-button:has(.structure-icon):hover,
  .action-button:has(.torch-icon):hover {
    background-color: rgba(0, 150, 136, 0.2);
  }

  
  .attack-button {
    background-color: rgba(244, 67, 54, 0.1);
    border-color: rgba(244, 67, 54, 0.3);
  }

  .attack-button:hover {
    background-color: rgba(244, 67, 54, 0.2);
  }

  
  .action-button:has(.rally-icon) {
    background-color: rgba(63, 81, 181, 0.1);
    border-color: rgba(63, 81, 181, 0.3);
  }
  
  .action-button:has(.rally-icon):hover {
    background-color: rgba(63, 81, 181, 0.2);
  }
  
  /* Add styling for horn icon (recruit action) */
  .action-button:has(.horn-icon) {
    background-color: rgba(156, 39, 176, 0.1);
    border-color: rgba(156, 39, 176, 0.3);
  }
  
  .action-button:has(.horn-icon):hover {
    background-color: rgba(156, 39, 176, 0.2);
  }

  
  .action-button:not(:has(.action-icon)) {
    background-color: rgba(183, 28, 28, 0.1);
    border-color: rgba(183, 28, 28, 0.3);
  }
  
  .action-button:not(:has(.action-icon)):hover {
    background-color: rgba(183, 28, 28, 0.2);
  }

  
  .entity-action {
    padding: 0.4em 0.7em;
    background-color: var(--chrome-gold-soft);
    border: 1px solid var(--chrome-gold-border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.82em;
    color: var(--chrome-text);
    font-family: var(--font-body);
    transition: background-color 0.15s, border-color 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    white-space: nowrap;
  }

  .entity-action:hover:not(:disabled) {
    background-color: var(--chrome-card-strong);
    border-color: var(--chrome-gold);
    color: var(--chrome-text);
  }

  .entity-action:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .entity-action:has(.rally-icon) {
    background-color: rgba(63, 90, 78, 0.22);
    border-color: rgba(76, 175, 80, 0.3);
  }
  
  .entity-action:has(.compass-icon):hover {
    background-color: rgba(63, 90, 78, 0.35);
  }
  
  .entity-action:has(.crop-icon) {
    background-color: rgba(255, 193, 7, 0.1);
    border-color: rgba(255, 193, 7, 0.3);
  }
  
  .entity-action:has(.crop-icon):hover {
    background-color: rgba(255, 193, 7, 0.2);
  }
  
  .entity-action:has(.rally-icon) {
    background-color: rgba(63, 81, 181, 0.1);
    border-color: rgba(63, 81, 181, 0.3);
  }
  
  .entity-action:has(.rally-icon):hover {
    background-color: rgba(63, 81, 181, 0.2);
  }

  /* Add styling for horn icon in entity actions */
  .entity-action:has(.horn-icon) {
    background-color: rgba(156, 39, 176, 0.1);
    border-color: rgba(156, 39, 176, 0.3);
  }
  
  .entity-action:has(.horn-icon):hover {
    background-color: rgba(156, 39, 176, 0.2);
  }

  .player-owned {
    background-color: var(--chrome-gold-soft);
    position: relative;
  }

  .player-owned:hover {
    background-color: var(--chrome-card-strong);
  }

  .player-owned .entity-name {
    color: var(--chrome-gold);
    font-weight: 600;
  }

  .player-owned .entity-race,
  .player-owned .entity-details {
    color: var(--chrome-text-dim);
  }

  .player-owned::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: var(--color-bright-accent, #64ffda);
  }

  .unit-count {
    color: var(--chrome-text-dim);
    font-weight: 500;
  }
  
  .item-count {
    color: var(--color-sage-deep);
    font-weight: 500;
  }

  .entity.item .entity-icon {
    color: var(--chrome-gold);
    flex-shrink: 0;
  }

  /* Rarity shown as a subtle left accent + faint tint rather than a full box. */
  .entity.item.uncommon {
    box-shadow: inset 0.2em 0 0 rgba(76, 175, 80, 0.5);
    background-color: rgba(76, 175, 80, 0.05);
  }

  .entity.item.rare {
    box-shadow: inset 0.2em 0 0 rgba(33, 150, 243, 0.5);
    background-color: rgba(33, 150, 243, 0.05);
  }

  .entity.item.epic {
    box-shadow: inset 0.2em 0 0 rgba(156, 39, 176, 0.5);
    background-color: rgba(156, 39, 176, 0.05);
  }

  .entity.item.legendary {
    box-shadow: inset 0.2em 0 0 rgba(255, 152, 0, 0.5);
    background-color: rgba(255, 152, 0, 0.05);
  }

  .entity.item.mythic {
    box-shadow: inset 0.2em 0 0 rgba(233, 30, 99, 0.5);
    background-color: rgba(233, 30, 99, 0.05);
    animation: pulseMythic 2s infinite alternate;
  }

  .item-type {
    font-weight: 500;
    margin-right: 0.5em;
  }

  .item-quantity {
    font-size: 0.85em;
    color: var(--chrome-text-faint);
    margin-left: 0.2em;
    margin-right: 0.5em;
  }

  
  /* Battles hold stacked sections (header, the two sides, a join button), so they
     override the base .entity flex-row — otherwise the sections are squeezed side
     by side into an unreadable cram. */
  .entity.battle {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5em;
    cursor: default;
    padding: 0.6em 0.7em;
    margin: 0.4em 0;
    background-color: rgba(139, 0, 0, 0.08);
    box-shadow: inset 0.2em 0 0 rgba(139, 0, 0, 0.45);
  }

  .battle-status-tag {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.7em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.15em 0.5em;
    color: var(--chrome-text-dim);
    background: var(--chrome-field-bg);
    border: 1px solid var(--chrome-hairline);
    border-radius: 0.25em;
  }
  .battle-status-tag.new { color: #ffcf8a; border-color: rgba(255, 207, 138, 0.4); }

  .casualties-tag {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72em;
    font-weight: 700;
    color: #ef7878;
  }

  .join-battle-btn {
    width: 100%;
    margin-top: 0.1em;
    padding: 0.5em 0.8em;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.7em;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #ef7878;
    background: rgba(198, 40, 40, 0.12);
    border: 0.075em solid rgba(198, 40, 40, 0.4);
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .join-battle-btn:hover { background: rgba(198, 40, 40, 0.22); }

  .battle-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 0.5em;
  }
  
  .battle-header-left {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }

  .battle-casualties {
    display: flex;
    gap: 0.3em;
  }
  
  /* Stack battle sides vertically — the dossier column is too narrow for
     two side-by-side group lists, which crammed the content. */
  .battle-sides {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    font-size: 0.85em;
    margin-top: 0.4em;
    width: 100%;
    align-items: stretch;
  }

  .battle-side {
    padding: 0.5em 0.6em;
    border-radius: 0.3em;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .battle-side.side1 {
    background-color: rgba(120, 170, 255, 0.1);
    border: 1px solid rgba(120, 170, 255, 0.28);
    border-left: 3px solid rgba(120, 170, 255, 0.7);
    color: var(--chrome-text);
  }

  .battle-side.side2 {
    background-color: rgba(255, 130, 130, 0.1);
    border: 1px solid rgba(255, 130, 130, 0.28);
    border-left: 3px solid rgba(255, 130, 130, 0.7);
    color: var(--chrome-text);
  }

  /* vs divider sits between the stacked sides */
  .battle-vs {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.05em 0;
    font-weight: bold;
    font-size: 0.85em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--chrome-text-faint);
  }

  /* Battle group / unit breakdown — these were unstyled in the dossier, which
     made the battle content read as a cramped wall of text. */
  .battle-groups-details {
    margin-top: 0.5em;
    font-size: 0.9em;
    max-height: 12em;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.35em;
  }

  .side-name {
    font-weight: 600;
    margin-bottom: 0.2em;
    color: var(--chrome-text);
  }

  .side-units {
    font-size: 0.85em;
  }

  .battle-group {
    padding: 0.4em 0.5em;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.3em;
  }

  .group-info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3em 0.55em;
  }

  .group-combat-stats {
    margin-left: auto;
    display: inline-flex;
    gap: 0.4em;
    white-space: nowrap;
  }
  .cs-stat {
    font-size: 0.78em;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    padding: 0 0.3em;
    border-radius: 0.25em;
    background: rgba(255, 255, 255, 0.06);
  }
  .cs-stat.cs-melee  { color: #ff9d7a; }  /* warm — physical */
  .cs-stat.cs-ranged { color: #9fe0a8; }  /* green — precision */
  .cs-stat.cs-magic  { color: #b9a0ff; }  /* violet — arcane */

  .group-power-info {
    margin-left: 0.5em;
    font-weight: 600;
    color: #ffcf8a;
    font-size: 0.8em;
    opacity: 0.85;
    white-space: nowrap;
  }

  .item-power-bonus {
    color: #9fe0a8;
    font-weight: 400;
    margin-left: 0.2em;
  }

  .battle-units {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3em;
    margin-top: 0.4em;
    padding-top: 0.4em;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .unit-type-summary {
    display: flex;
    align-items: center;
    gap: 0.3em;
    padding: 0.15em 0.45em;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.3em;
  }

  .unit-type-name {
    display: flex;
    align-items: center;
    gap: 0.3em;
    font-weight: 500;
  }

  .unit-count-badge {
    background: rgba(0, 0, 0, 0.28);
    border-radius: 1em;
    padding: 0 0.45em;
    font-size: 0.85em;
    font-weight: 700;
  }
  
  /* Consolidated entity-badge styles */
  .entity-badge {
    display: inline-block;
    font-size: 0.8em;
    font-weight: 500;
    padding: 0.1em 0.5em;
    border-radius: 0.3em;
    white-space: nowrap;
    text-transform: capitalize;
    flex-shrink: 0; 
    align-self: flex-start; 
  }
  
  .entity-badge.idle {
    background: rgba(128, 128, 128, 0.15);
    border: 1px solid rgba(128, 128, 128, 0.3);
    color: var(--chrome-text-dim);
  }

  .entity-badge.moving {
    background: rgba(0, 128, 0, 0.15);
    border: 1px solid rgba(0, 128, 0, 0.3);
    color: #006400;
  }
  
  .entity-badge.mobilizing {
    background: rgba(255, 140, 0, 0.15);
    border: 1px solid rgba(255, 140, 0, 0.3);
    color: #d06000;
  }
  
  .entity-badge.demobilising {
    background: rgba(138, 43, 226, 0.15);
    border:1px solid rgba(138, 43, 226, 0.3);
    color: #6a1b9a;
  }
  
  .entity-badge.gathering {
    background: rgba(138, 43, 226, 0.15);
    border: 1px solid rgba(138, 43, 226, 0.3);
    color: #8a2be2;
  }
  
  .entity-badge.fighting {
    background: rgba(220, 20, 60, 0.15);
    border: 1px solid rgba(220, 20, 60, 0.3);
    color: #c62828;
  }
  
  .entity-badge.active {
    background: rgba(255, 0, 0, 0.15);
    border: 1px solid rgba(255, 0, 0, 0.3);
    color: #d32f2f;
  }
  
  .entity-badge.resolved {
    background: rgba(0, 128, 0, 0.15);
    border: 1px solid rgba(0, 128, 0, 0.3);
    color: #2e7d32;
  }
  
  .entity-badge.pending-tick {
    position: relative;
    animation: pulse 1s infinite alternate;
  }
  
  .entity-badge.pending-tick::after {
    content: '↻';
    margin-left: 0.3em;
    font-weight: bold;
  }

  .entity-badge.owner-badge {
    background-color: rgba(63, 90, 78, 0.35);
    color: #2e7d32;
    border: 1px solid rgba(76, 175, 80, 0.4);
  }

  /* Consolidated rarity-badge styles */
  .rarity-badge {
    display: inline-block;
    font-size: 0.9em;
    padding: 0.1em 0.5em;
    border-radius: 0.3em;
    font-weight: 500;
  }
  
  .rarity-badge.common {
    background-color: rgba(158, 158, 158, 0.2);
    color: #616161;
    border: 1px solid rgba(158, 158, 158, 0.4);
  }
  
  .rarity-badge.uncommon {
    background-color: rgba(63, 90, 78, 0.35);
    color: #2e7d32;
  }
  
  .rarity-badge.rare {
    background-color: rgba(176, 141, 74, 0.22);
    color: #0277bd;
  }
  
  .rarity-badge.epic {
    background-color: rgba(156, 39, 176, 0.2);
    color: #7b1fa2;
  }
  
  .rarity-badge.legendary {
    background-color: rgba(255, 152, 0, 0.2);
    color: #ef6c00;
  }
  
  .rarity-badge.mythic {
    background-color: rgba(233, 30, 99, 0.2);
    color: #c2185b;
    border: 1px solid rgba(233, 30, 99, 0.4);
  }

  /* Consolidated animations */
  @keyframes pulse {
    from { opacity: 0.8; }
    to { opacity: 1; }
  }

  @keyframes pulseMythic {
    from {
      box-shadow: inset 0.2em 0 0 rgba(233, 30, 99, 0.5), 0 0 0 0 rgba(233, 30, 99, 0.1);
    }
    to {
      box-shadow: inset 0.2em 0 0 rgba(233, 30, 99, 0.5), 0 0 8px 1px rgba(233, 30, 99, 0.25);
    }
  }

  .structure-name {
    color: var(--chrome-text);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  
  .structure-type {
    display: flex;
    align-items: center;
  }

  .structure-type-icon-container {
    display: inline-flex;
       align-items: center;
    justify-content: center;
    margin-right: 0.5em;
    vertical-align: middle;
  }
  
  :global(.structure-type-icon) {
    opacity: 0.9;
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.7));
  }
  
  
  :global(.race-icon-details) {
    width: 1.4em;
    height: 1.4em;
    opacity: 0.85;
    fill: rgba(212, 177, 112, 0.9);
  }
  
  
  :global(.race-icon-details.fairy-icon path) {
    fill: rgba(138, 43, 226, 0.8);
  }
  
  :global(.race-icon-details.goblin-icon path) {
    fill: rgba(0, 128, 0, 0.8);
  }
  
  :global(.entity-race-icon) {
    margin-right: 0.7em;
    margin-top: 0.1em;
    flex-shrink: 0;
  }

  
  .tile-info-container {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
  }
  
  
  @media (min-width: 640px) {
    .tile-info-container {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5em;
    }
    
    .structure-column,
    .terrain-column {
      flex: 1;
      min-width: 0;
    }
    
    .tile-info-container:has(.terrain-column:only-child) .terrain-column {
      width: 100%;
    }
  }

  
  /* Flat rows separated by hairlines — consistent with StructureOverview's
     feature/info rows, instead of raised bordered cards. */
  .entity {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0;
    padding: 0.5em 0.3em;
    background-color: transparent;
    border-bottom: 0.04em solid var(--chrome-hairline);
    transition: background-color 0.2s ease;
    position: relative;
    cursor: pointer;
  }
  .entity:last-child { border-bottom: none; }

  .entity-left {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    gap: 1em; /* Add 1em gap between icon and content */
  }
  
  /* Add spacing for player entity icons to match the gap in entity-left */
  .entity.player .entity-icon {
    margin-right: 1em;
  }
  
  .entity-info {
    flex: 1;
    min-width: 0;
    margin-right: 0.5em  }

  .entity-actions {
    width: auto;
    margin-left: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4em;
    align-self: center;
  }

  
  .entity-name, .entity-details {
    width: 100%;
  }

  /* Tile item rows: name, quantity and rarity badge share one line. */
  .item-name-row {
    display: flex;
    align-items: baseline;
    gap: 0.4em;
  }
  .item-name-row .entity-name-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .item-name-row .item-quantity { flex-shrink: 0; }
  .item-name-row .item-rarity { margin-left: auto; flex-shrink: 0; }

  .item-rarity {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.78em;
    letter-spacing: 0.04em;
    padding: 0.05em 0.4em;
    border-radius: 0.2em;
  }
  .item-rarity.uncommon  { color: #6ecf72; background: rgba(76, 175, 80, 0.12); }
  .item-rarity.rare      { color: #64b5f6; background: rgba(33, 150, 243, 0.12); }
  .item-rarity.epic      { color: #ba68c8; background: rgba(156, 39, 176, 0.12); }
  .item-rarity.legendary { color: #ffb74d; background: rgba(255, 152, 0, 0.12); }
  .item-rarity.mythic    { color: #f06292; background: rgba(233, 30, 99, 0.12); }

  
  .entity-details {
    display: flex;
    flex-wrap: wrap;
    font-size: 0.85em;
    color: var(--chrome-text-dim);
  }

  /* Add styling for cancel button */
  .entity-action.cancel-action {
    background-color: rgba(244, 67, 54, 0.1);
    border-color: rgba(244, 67, 54, 0.3);
    color: rgba(244, 67, 54, 0.9);
  }
  
  .entity-action.cancel-action:hover:not(:disabled) {
    background-color: rgba(244, 67, 54, 0.2);
    transform: translateY(-1px);
  }
  
  .entity-action.cancel-action:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  /* Add the flee-action button style */
  .entity-action.flee-action {
    background-color: rgba(156, 39, 176, 0.1);
    border-color: rgba(156, 39, 176, 0.3);
    color: rgba(156, 39, 176, 0.9);
  }
  
  .entity-action.flee-action:hover:not(:disabled) {
    background-color: rgba(156, 39, 176, 0.2);
    transform: translateY(-1px);
  }
  
  .entity-action.flee-action:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .entity-action.boat-action {
    background-color: rgba(2, 119, 189, 0.1);
    border-color: rgba(2, 119, 189, 0.4);
    color: rgba(2, 119, 189, 0.95);
  }

  .entity-action.boat-action:hover:not(:disabled) {
    background-color: rgba(2, 119, 189, 0.2);
    transform: translateY(-1px);
  }

  .entity-action.boat-action.disembark {
    background-color: rgba(0, 137, 123, 0.1);
    border-color: rgba(0, 137, 123, 0.4);
    color: rgba(0, 137, 123, 0.95);
  }

  .boat-capacity-badge {
    font-size: 0.7em;
    padding: 0.15em 0.4em;
    border-radius: 0.25em;
    background: rgba(2, 119, 189, 0.1);
    border: 1px solid rgba(2, 119, 189, 0.3);
    color: rgba(2, 119, 189, 0.9);
    align-self: center;
  }

  .group-power {
    font-weight: 500;
    color: #d32f2f;
    margin-left: 0.3em;
    font-size: 0.9em;
  }
  
  .side-power {
    color: #d32f2f;
    font-weight: 500;
    font-size: 0.9em;
    margin-left: 0.3em;
  }
  
  /* Group units list styling */
  .toggle-units-btn {
    background: none;
    border: none;
    color: var(--chrome-gold);
    cursor: pointer;
    font-size: 0.9em;
    margin-left: 0.5em;
    padding: 0.1em 0.3em;
    border-radius: 0.2em;
    transition: background-color 0.2s ease;
  }
  
  .toggle-units-btn:hover {
    background-color: rgba(176, 141, 74, 0.14);
    text-decoration: underline;
  }
  
  /* Add styling for expanded section titles */
  .expanded-section-title {
    margin: 0.8em 0 0.4em 0;
    font-weight: 500;
    color: var(--chrome-text-dim);
    padding-bottom: 0.3em;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  .group-expanded-details {
    margin-top: 0.5em;
  }
  
  .group-units-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3em;
    margin-top: 0.3em;
    padding: 0.5em;
    background-color: rgba(0, 0, 0, 0.02);
    border-radius: 0.3em;
    border: 1px solid rgba(0, 0, 0, 0.05);
    font-size: 0.9em;
    max-height: 10em;
    overflow-y: auto;
  }
  
  .group-items-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3em;
    margin-top: 0.3em;
    margin-bottom: 0.8em;
    padding: 0.5em;
    background-color: rgba(0, 0, 0, 0.02);
    border-radius: 0.3em;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  .group-unit {
    display: flex;
    align-items: center;
    padding: 0.3em 0.5em;
    border-radius: 0.2em;
    background-color: var(--chrome-field-bg);
    border: 1px solid rgba(0, 0, 0, 0.05);
    width: 48%;
    min-width: 120px;
    box-sizing: border-box;
  }

  .group-unit.clickable {
    cursor: pointer;
    transition: all 0.15s;
  }
  .group-unit.clickable:hover {
    background-color: rgba(66, 133, 244, 0.08);
    border-color: rgba(176, 141, 74, 0.45);
  }

  .unit-equip-hint {
    font-size: 0.62em;
    color: rgba(66, 133, 244, 0.7);
    font-weight: 500;
    margin-left: 0.3em;
  }

  .unit-equipped-tag {
    font-size: 0.65em;
    padding: 0.1em 0.35em;
    background: rgba(156, 39, 176, 0.12);
    color: #7b1fa2;
    border-radius: 0.25em;
    font-weight: 600;
  }
  
  /* Add margin to unit icons */
  .unit-icon {
    margin-right: 0.5em;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  :global(.expanded-unit-race-icon) {
    width: 1.2em;
    height: 1.2em;
    opacity: 0.8;
  }
  
  .group-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.4em;
    padding: 0.3em 0.5em;
    border-radius: 0.2em;
    background-color: var(--chrome-field-bg);
    border: 1px solid rgba(0, 0, 0, 0.05);
    width: 48%;
    min-width: 120px;
    box-sizing: border-box;
  }

  .item-icon-wrap {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: var(--chrome-gold);
  }

  :global(.group-item-icon) {
    display: block;
    fill: currentColor;
    width: 1.4em;
    height: 1.4em;
  }

  :global(.tile-item-icon) {
    display: block;
    fill: currentColor;
    width: 1.6em;
    height: 1.6em;
  }

  .unit-info {
    flex: 1;
    min-width: 0;
  }

  .unit-name {
    font-size: 0.85em;
    font-weight: 500;
    color: var(--chrome-text);
    margin-bottom: 0.2em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .unit-details {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25em;
    font-size: 0.8em;
  }

  .unit-stat-tag {
    font-size: 0.75em;
    padding: 0.1em 0.35em;
    font-family: var(--font-mono);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    color: var(--chrome-text-dim);
  }
  .unit-stat-tag.melee { background: rgba(91, 26, 31, 0.12); border-color: rgba(91, 26, 31, 0.28); }
  .unit-stat-tag.ranged { background: rgba(40, 70, 40, 0.14); border-color: rgba(60, 110, 60, 0.28); }
  .unit-stat-tag.magic { background: rgba(50, 40, 90, 0.18); border-color: rgba(90, 70, 160, 0.3); }

  .unit-level-tag {
    font-size: 0.75em;
    padding: 0.1em 0.35em;
    border-radius: 0.2em;
    background-color: rgba(25, 118, 210, 0.1);
    color: #1565c0;
    cursor: help;
  }

  /* ── Empty-tile potential (gatherables + build opportunities) ── */
  .tile-potential {
    display: flex;
    flex-direction: column;
    gap: 0.9em;
    margin-bottom: 1.2em;
  }

  .potential-block {
    background-color: rgba(176, 141, 74, 0.05);
    border: 1px solid rgba(176, 141, 74, 0.15);
    border-radius: 0.3em;
    padding: 0.7em 0.8em;
  }

  .potential-title {
    display: flex;
    align-items: center;
    gap: 0.4em;
    font-size: 0.78em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--chrome-gold);
    margin-bottom: 0.6em;
  }

  :global(.potential-icon) {
    width: 1.1em;
    height: 1.1em;
    opacity: 0.85;
    fill: var(--chrome-gold);
  }

  .potential-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4em;
  }

  .resource-chip,
  .build-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    font-size: 0.8em;
    padding: 0.25em 0.55em;
    border-radius: 0.3em;
    background: rgba(176, 141, 74, 0.1);
    border: 1px solid rgba(176, 141, 74, 0.22);
    color: var(--chrome-text-dim);
    line-height: 1.2;
  }

  /* Build chips are interactive: clicking opens the structure explainer.
     Hover changes only colours (no transform/shadow) so the icon and label
     stay put — a lift caused the row to jitter as chips reflowed. */
  button.build-chip {
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  button.build-chip:hover {
    background: var(--chrome-gold);
    border-color: var(--chrome-gold);
    color: var(--color-ink-900, #1a2030);
  }
  button.build-chip:hover :global(.build-chip-icon) {
    opacity: 1;
    color: var(--color-ink-900, #1a2030);
    fill: var(--color-ink-900, #1a2030);
  }
  button.build-chip:focus-visible {
    outline: none;
    border-color: var(--chrome-gold);
    box-shadow: 0 0 0 2px var(--chrome-gold-soft);
  }

  .build-chip-name { white-space: nowrap; }

  /* Fixed icon box so the SVG can't change the chip's metrics on hover. */
  :global(.build-chip-icon) {
    width: 1.1em;
    height: 1.1em;
    flex: 0 0 auto;
    opacity: 0.85;
    transition: opacity 0.15s ease, color 0.15s ease, fill 0.15s ease;
  }

  .build-chip.water {
    background: rgba(45, 102, 147, 0.22);
    border-color: rgba(93, 153, 184, 0.4);
    color: var(--chrome-text-dim);
  }

  /* ── Structure explainer modal ── */
  .struct-info-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5em;
    background: rgba(8, 11, 18, 0.62);
    backdrop-filter: blur(3px);
    cursor: default;
  }
  .struct-info {
    width: min(420px, 92vw);
    max-height: 82vh;
    overflow-y: auto;
    background: linear-gradient(180deg, var(--chrome-panel-a) 0%, var(--chrome-panel-b) 100%);
    border: 1px solid var(--chrome-gold-border);
    border-radius: 0.5em;
    box-shadow: 0 1em 3em rgba(0, 0, 0, 0.5);
    padding: 1.2em 1.3em 1.4em;
    color: var(--chrome-text);
  }
  .struct-info-head {
    display: flex;
    align-items: center;
    gap: 0.7em;
    margin-bottom: 0.8em;
  }
  :global(.struct-info-icon) {
    fill: var(--chrome-gold);
    flex-shrink: 0;
  }
  .struct-info-titles { flex: 1; min-width: 0; }
  .struct-info-titles h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.15em;
    letter-spacing: 0.03em;
    color: var(--chrome-gold);
  }
  .struct-info-type {
    font-size: 0.72em;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--chrome-text-faint);
  }
  .struct-info-close {
    background: none;
    border: none;
    color: var(--chrome-text-dim);
    font-size: 1.6em;
    line-height: 1;
    cursor: pointer;
    padding: 0 0.1em;
    transition: color 0.15s ease;
  }
  .struct-info-close:hover { color: var(--chrome-gold); }
  .struct-info-desc {
    margin: 0 0 1em;
    font-family: var(--font-editorial, serif);
    font-style: italic;
    color: var(--chrome-text-dim);
    line-height: 1.4;
  }
  .struct-info-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4em;
    margin-bottom: 1em;
  }
  .struct-stat {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5em;
    padding: 0.35em 0.55em;
    background: var(--chrome-gold-soft);
    border-radius: 0.3em;
    font-size: 0.82em;
  }
  .struct-stat-label { color: var(--chrome-text-dim); }
  .struct-stat-value { font-weight: 600; color: var(--chrome-text); }
  .struct-info-section { margin-bottom: 0.9em; }
  .struct-info-section-title {
    font-size: 0.74em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--chrome-gold);
    margin-bottom: 0.45em;
  }
  .struct-cost-list { display: flex; flex-wrap: wrap; gap: 0.4em; }
  .struct-cost-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    font-size: 0.8em;
    padding: 0.25em 0.55em;
    border-radius: 0.3em;
    background: rgba(176, 141, 74, 0.1);
    border: 1px solid rgba(176, 141, 74, 0.22);
    color: var(--chrome-text-dim);
  }
  :global(.struct-cost-icon) { width: 1.1em; height: 1.1em; }
  .struct-feature-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4em; }
  .struct-feature {
    display: flex;
    align-items: flex-start;
    gap: 0.5em;
    font-size: 0.85em;
    line-height: 1.35;
    color: var(--chrome-text-dim);
  }
  .struct-feature-icon { flex-shrink: 0; }
  .struct-feature-text strong { color: var(--chrome-text); }

  /* Resource rarity tinting — reuse the palette used elsewhere in this file */
  .resource-chip.uncommon { border-color: rgba(76, 175, 80, 0.4);  color: #8fd494; }
  .resource-chip.rare     { border-color: rgba(2, 119, 189, 0.45); color: #7fc4e8; }
  .resource-chip.epic     { border-color: rgba(156, 39, 176, 0.45); color: #d49ae0; }
  .resource-chip.legendary{ border-color: rgba(255, 152, 0, 0.5);  color: #f0b96c; }
  .resource-chip.mythic   { border-color: rgba(233, 30, 99, 0.5);  color: #ef88ad; }

  .food-dot {
    color: #8fd494;
    font-size: 0.7em;
    margin-left: 0.1em;
  }

  .potential-hint {
    margin-top: 0.6em;
    font-size: 0.72em;
    font-style: italic;
    color: var(--chrome-text-faint);
    font-family: var(--font-editorial, serif);
  }
  .potential-hint strong { color: var(--chrome-gold); font-style: normal; }
</style>