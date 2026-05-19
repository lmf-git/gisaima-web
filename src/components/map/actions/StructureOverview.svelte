<script>
  import { slide } from "svelte/transition";

  import { BUILDINGS, ITEMS } from "gisaima-shared";

  import { currentPlayer } from "../../../lib/stores/game.js";
  import { targetStore, coordinates } from "../../../lib/stores/map.js";

  import Close from '../../icons/Close.svelte';
  import Structure from '../../icons/Structure.svelte';
  import Torch from '../../icons/Torch.svelte';
  import Human from '../../icons/Human.svelte';
  import Elf from '../../icons/Elf.svelte';
  import Dwarf from '../../icons/Dwarf.svelte';
  import Goblin from '../../icons/Goblin.svelte';
  import Fairy from '../../icons/Fairy.svelte';
  import Hammer from '../../icons/Hammer.svelte';
  import BuildingIcon from '../../icons/BuildingIcon.svelte';
  

  // Props - using correct Svelte 5 runes syntax
  const { 
    x = 0, 
    y = 0, 
    onClose = () => {},
    onAchievement = () => {}, // Add this to handle achievements
    onShowModal = () => {}, // Add this prop to handle showing modals
    isActive = false, // Add prop for z-index control
    onMouseEnter = () => {} // Add prop for mouse enter event
  } = $props();
  
  // Add to the state
  let collapsedSections = $state({
    items: false,
    building: false,
    buildings: false,
    availableBuildings: false  // Add this line
  });
  
  // Add state for storage tab selection
  let activeTab = $state('shared');
  
  // Add state for upgrade process
  let isUpgrading = $state(false);
  let upgradeError = $state(null);
  let upgradeSuccess = $state(null);

  // Fix the derived value to return the actual data, not a function
  let tileData = $derived($targetStore || null);
  
  // Function to toggle section collapse state
  function toggleSection(sectionId) {
    collapsedSections[sectionId] = !collapsedSections[sectionId];
  }

  // Helper functions
  function formatCoords(x, y) {
    return `${x},${y}`;
  }
  
  function formatText(text) {
    if (!text) return '';
    return text.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  
  function isOwnedByCurrentPlayer(entity) {
    if (!entity || !$currentPlayer) return false;
    return entity.owner === $currentPlayer.id;
  }
  
  // Reactive declarations using $derived - now using tileData instead of tile
  let hasPersonalBank = $derived(
    $currentPlayer?.id && 
    tileData?.structure?.banks && 
    tileData?.structure?.banks[$currentPlayer.id] && 
    tileData?.structure?.banks[$currentPlayer.id].length > 0
  );
  
  // Add this function to convert the new map item format to displayable format
  function convertItemsToDisplayFormat(items) {
    if (!items) return [];
    
    // If items is already an array, it's in the old format - just return it
    if (Array.isArray(items)) return items;
    
    // If it's an object with the {itemCode: quantity} format,
    // convert it to an array of item objects
    if (typeof items === 'object') {
      const entries = Object.entries(items)
        .filter(([key, _]) => !key.startsWith('_')); // Skip metadata keys like _x, _y
    
      return entries.map(([itemCode, quantity]) => {
        // Try to get item definition from ITEMS
        const itemDef = ITEMS[itemCode];
        
        if (itemDef) {
          return {
            id: itemCode,
            code: itemCode,
            name: itemDef.name || formatText(itemCode),
            type: itemDef.type || 'resource',
            rarity: itemDef.rarity || 'common',
            quantity: quantity,
            description: itemDef.description
          };
        } else {
          // Fallback if item not in definitions
          return {
            id: itemCode,
            code: itemCode,
            name: formatText(itemCode),
            type: 'resource',
            quantity: quantity
          };
        }
      });
    }
    
    return [];
  }
  
  // Fix the displayItems derived function to ensure it works with the object format
  let displayItems = $derived(() => {
    let items = null;
    
    if (activeTab === 'shared') {
      items = tileData?.structure?.items;
    } else {
      items = hasPersonalBank ? tileData?.structure?.banks[$currentPlayer.id] : null;
    }
    
    // Early return if no items exist
    if (!items) return [];
    
    // Convert items to displayable format if needed
    return convertItemsToDisplayFormat(items);
  });
  
  let showStorageTabs = $derived(
    hasPersonalBank || 
    (tileData?.structure?.items && 
     (Array.isArray(tileData?.structure?.items) ? 
      tileData?.structure?.items.length > 0 : 
      Object.keys(tileData?.structure?.items).filter(k => !k.startsWith('_')).length > 0))
  );
  
  // Add keyboard handler for the Escape key
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  // Function to check if recruitment is possible at this structure
  function canRecruitAtStructure() {
    // Check if structure exists
    if (!tileData?.structure) return false;
    
    return true;
  }

  // Function to execute various actions like 'recruitment'
  function executeAction(action, data = {}) {
    if (onShowModal) {
      switch (action) {
        case 'recruitment':
          onShowModal({ 
            type: 'recruitment',
            data: { 
              x, 
              y, 
              structure: tileData?.structure,
              tile: tileData
            }
          });
          break;
        case 'upgrade':
          onShowModal({
            type: 'upgrade',
            data: {
              x,
              y,
              structure: tileData?.structure,
              tile: tileData
            }
          });
          break;
        case 'upgrade-building':
          onShowModal({
            type: 'upgrade-building',
            data: {
              x,
              y,
              structure: tileData?.structure,
              tile: tileData,
              buildingId: data.buildingId,
              building: data.building
            }
          });
          break;
        case 'add-building':
          onShowModal({
            type: 'add-building',
            data: {
              x,
              y,
              structure: tileData?.structure,
              tile: tileData,
              buildingType: data.buildingType
            }
          });
          break;
      }
    }
  }

  // New function: Check if player can see and use upgrade UI
  function canSeeUpgradeUI(structure) {
    if (!structure || !$currentPlayer) return false;
    
    // Check if structure is owned by player
    const isOwner = isOwnedByCurrentPlayer(structure);
    
    // Special handling for spawn points
    if (structure.type === 'spawn') {
      // For spawn structures, player must be of the same race
      const isPlayerRace = structure.race === $currentPlayer.race;
      if (!isPlayerRace) return false;
    } else if (!isOwner) {
      // For non-spawn structures, player must be the owner
      return false;
    }
    
    // Check if player is present at the tile
    const isPlayerAtTile = tileData?.players?.some(p => p.id === $currentPlayer.id);
    
    // Check if player has a group at the tile
    const hasGroupAtTile = tileData?.groups?.some(g => g.owner === $currentPlayer.id);
    
    // Player must be present or have a group at the tile
    if (!isPlayerAtTile && !hasGroupAtTile) return false;
    
    return true;
  }

  // New function: Check if player can see and use building upgrade UI
  function canSeeBuildingUpgradeUI(building) {
    if (!building || !$currentPlayer) return false;
    
    // First check if player can see structure upgrade UI at all
    if (!canSeeUpgradeUI(tileData?.structure)) return false;
    
    return true;
  }

  // Modify the existing canUpgradeStructure to use the new visibility function
  function canUpgradeStructure() {
    if (!tileData?.structure) return false;
    
    // First check if player can see upgrade UI at all
    if (!canSeeUpgradeUI(tileData?.structure)) return false;
    
    // Check level - make sure it's not at max level (assumed max level 5)
    const currentLevel = tileData?.structure?.level || 1;
    const maxLevel = 5;
    
    return currentLevel < maxLevel;
  }

  // Helper function to get item definition from ITEMS by name
  function getItemByName(name) {
    if (!name) return null;
    
    // First try to find by normalized name
    const normalizedName = name.toUpperCase().replace(/ /g, '_');
    if (ITEMS[normalizedName]) {
      return ITEMS[normalizedName];
    }
    
    // Try to find by name property
    return Object.values(ITEMS).find(item => 
      item.name.toUpperCase().replace(/ /g, '_') === normalizedName) || null;
  }

  // Function to get required resources for upgrade with proper ITEMS definitions
  function getUpgradeRequirements() {
    if (!tileData?.structure) return [];
    
    const currentLevel = tileData?.structure?.level || 1;
    const structureType = tileData?.structure?.type || 'generic';
    
    // Base requirements scaling with level
    const baseWood = currentLevel * 5;
    const baseStone = currentLevel * 3;
    
    // Different structure types have different requirements
    const requirements = [];
    
    if (structureType === 'outpost' || structureType === 'spawn') {
      addResourceRequirement(requirements, 'WOODEN_STICKS', baseWood);
      addResourceRequirement(requirements, 'STONE_PIECES', baseStone);
    } else if (structureType === 'stronghold' || structureType === 'fortress') {
      addResourceRequirement(requirements, 'WOODEN_STICKS', baseWood * 1.5);
      addResourceRequirement(requirements, 'STONE_PIECES', baseStone * 1.5);
      addResourceRequirement(requirements, 'IRON_ORE', currentLevel * 2);
    } else {
      // Default requirements
      addResourceRequirement(requirements, 'WOODEN_STICKS', baseWood);
      addResourceRequirement(requirements, 'STONE_PIECES', baseStone);
    }
    
    // Higher level upgrades might require special materials
    if (currentLevel >= 3) {
      addResourceRequirement(requirements, 'CRYSTAL_SHARD', 1);
    }
    
    return requirements;
  }
  
  // Helper to add resource requirement using ITEMS definitions when available
  function addResourceRequirement(requirements, itemId, quantity) {
    const itemDef = ITEMS[itemId];
    if (itemDef) {
      requirements.push({
        id: itemDef.id,
        name: itemDef.name,
        quantity: Math.floor(quantity),
        rarity: itemDef.rarity
      });
    } else {
      // Fallback for items not in ITEMS definition
      requirements.push({
        name: itemId.replace(/_/g, ' ').toLowerCase(),
        quantity: Math.floor(quantity)
      });
    }
  }
  
  // Helper function to check available resources for a specific requirement
  function getAvailableQuantity(requirementName) {
    if (!displayItems || !displayItems.length) return 0;
    
    // Calculate total available quantity for this requirement
    return displayItems.reduce((total, item) => 
      item && item.name === requirementName ? total + (item.quantity || 0) : total, 0) || 0;
  }
  
  // Fix the available resource calculation to use proper item matching
  function countAvailableResources(requirementName) {
    if (!displayItems || !displayItems.length) return 0;
    
    // Calculate total available quantity for this requirement
    return displayItems.reduce((total, item) => {
      if (item && item.name === requirementName) {
        return total + (item.quantity || 0);
      }
      return total;
    }, 0);
  }
  
  // Fix the hasResourcesForUpgrade function to use improved resource matching
  function hasResourcesForUpgrade() {
    const requirements = getUpgradeRequirements();
    if (!requirements.length) return false;
    
    // Check both shared storage and personal bank
    const sharedItems = convertItemsToDisplayFormat(tileData?.structure?.items || []);
    const personalItems = hasPersonalBank ? 
      convertItemsToDisplayFormat(tileData?.structure?.banks[$currentPlayer.id] || []) : [];
    
    // Normalize all resources for consistent matching
    const normalizedResources = {};
    
    // Function to add normalized resources to the map
    function addNormalizedResource(item) {
      if (!item || item.type !== 'resource') return;
      
      // Try with item ID if available
      if (item.id) {
        const normId = item.id.toUpperCase();
        normalizedResources[normId] = (normalizedResources[normId] || 0) + (item.quantity || 0);
      }
      
      // Also add with normalized name
      if (item.name) {
        const normName = item.name.toUpperCase().replace(/ /g, '_');
        normalizedResources[normName] = (normalizedResources[normName] || 0) + (item.quantity || 0);
      }
    }
    
    // Process shared resources
    sharedItems.forEach(addNormalizedResource);
    
    // Process personal resources
    personalItems.forEach(addNormalizedResource);
    
    // Check if all requirements are met
    for (const req of requirements) {
      let foundAmount = 0;
      
      // Check by ID if available
      if (req.id) {
        const normId = req.id.toUpperCase();
        foundAmount += normalizedResources[normId] || 0;
      }
      
      // Also check by name
      const normName = req.name.toUpperCase().replace(/ /g, '_');
      foundAmount += normalizedResources[normName] || 0;
      
      if (foundAmount < req.quantity) {
        return false;
      }
    }
    
    return true;
  }
  
  // Function to start structure upgrade
  async function startUpgrade() {
    if (!canUpgradeStructure() || !hasResourcesForUpgrade()) {
      upgradeError = 'Cannot upgrade: missing resources or prerequisites';
      return;
    }
    
    try {
      isUpgrading = true;
      upgradeError = null;
      upgradeSuccess = null;
      
      executeAction('upgrade');
      
    } catch (error) {
      console.error("Error starting upgrade:", error);
      upgradeError = error.message || "Failed to start upgrade";
    } finally {
      isUpgrading = false;
    }
  }

  // Get features that would be unlocked by next upgrade
  function getNewFeatures() {
    if (!tileData?.structure) return [];
    
    const currentLevel = tileData?.structure?.level || 1;
    const structureType = tileData?.structure?.type || 'generic';
    
    // Features that would be unlocked at the next level
    const newFeatures = [];
    
    if (currentLevel === 1) {
      if (structureType === 'outpost') {
        newFeatures.push({
          name: 'Storage Expansion',
          description: 'Increases storage capacity',
          iconType: 'mine'
        });
      } else if (structureType === 'stronghold') {
        newFeatures.push({
          name: 'Advanced Forge',
          description: 'Allows crafting of better weapons',
          iconType: 'smithy'
        });
      }
    } else if (currentLevel === 2) {
      if (['stronghold', 'fortress'].includes(structureType)) {
        newFeatures.push({
          name: 'Recruitment Hall',
          description: 'Allows training advanced units',
          iconType: 'barracks'
        });
      }
    }
    
    return newFeatures;
  }

  // Function to check if current player is the structure owner
  function isOwner(structure) {
    if (!structure || !$currentPlayer) return false;
    return structure.owner === $currentPlayer.id;
  }

  // New function: Check if player can modify this structure (owner or spawn)
  function canModifyStructure(structure) {
    if (!structure || !$currentPlayer) return false;
    const isPlayerOwner = structure.owner === $currentPlayer.id;
    const isSpawn = structure.type === 'spawn';
    return isPlayerOwner || isSpawn;
  }

  // Function to check if a building can be upgraded
  function canUpgradeBuilding(buildingId, building) {
    // Check if building exists and is not already upgrading
    if (!building || building.upgradeInProgress) return false;
    
    // Check if player can see building upgrade UI
    if (!canSeeBuildingUpgradeUI(building)) return false;
    
    // Check level - make sure it's not at max level (assumed max level 5)
    const currentLevel = building.level || 1;
    const maxLevel = 5;
    
    // Check if resource requirements are met
    const hasResources = checkBuildingUpgradeResources(building);
    
    return currentLevel < maxLevel && hasResources;
  }

  // Function to check if there are enough resources for building upgrade
  function checkBuildingUpgradeResources(building) {
    const currentLevel = building.level || 1;
    const resources = BUILDINGS.getUpgradeRequirements(building.type, currentLevel);
    
    // Check if structure has all the required resources
    const structureItems = convertItemsToDisplayFormat(tileData?.structure?.items || []);
    
    // Check if all requirements are met
    for (const req of resources) {
      const availableItem = structureItems.find(item => item.name === req.name);
      const availableQuantity = availableItem ? availableItem.quantity : 0;
      
      if (availableQuantity < req.quantity) {
        return false;
      }
    }
    
    return true;
  }
  
  // Calculate upgrade progress for a building
  function getBuildingUpgradeProgress(building) {
    if (!building.upgradeCompletesAt || !building.upgradeStartedAt) return 0;
    
    const now = Date.now();
    const total = building.upgradeCompletesAt - building.upgradeStartedAt;
    const elapsed = now - building.upgradeStartedAt;
    
    if (elapsed >= total) return 100;
    return Math.floor((elapsed / total) * 100);
  }

  // Function to start building upgrade
  function startBuildingUpgrade(buildingId, building) {
    executeAction('upgrade-building', { buildingId, building });
  }

  // Function to check if a new building can be added
  function canAddNewBuilding() {
    if (!tileData?.structure) return false;
    
    // Special handling for spawn structures - allow more buildings
    if (tileData.structure.type === 'spawn') {
      const buildingsCount = tileData?.structure?.buildings ? 
        Object.keys(tileData.structure.buildings).length : 0;
      
      // Spawn points can have up to 5 buildings regardless of level
      return buildingsCount < 5;
    }
    
    // For other structures, use the regular logic
    const structureLevel = tileData?.structure?.level || 1;
    const buildingsCount = tileData?.structure?.buildings ? 
      Object.keys(tileData.structure.buildings).length : 0;
    
    // Simple rule: can have (structureLevel) buildings
    return structureLevel > buildingsCount;
  }

  // Check if a tile qualifies as water
  function isWaterTile(tile) {
    if (!tile) return false;
    if (tile.biome?.water) return true;
    if (tile.riverValue > 0.2 || tile.lakeValue > 0.2) return true;
    return false;
  }

  // Check if the current tile or any neighbour (8-directional) is water
  function hasAdjacentWater() {
    if (!tileData) return false;
    if (isWaterTile(tileData)) return true;

    const offsets = [
      { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
      { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
    ];

    for (const offset of offsets) {
      const neighbour = $coordinates.find(
        c => c.x === tileData.x + offset.x && c.y === tileData.y + offset.y
      );
      if (isWaterTile(neighbour)) return true;
    }
    return false;
  }

  // Get available building types based on structure level and existing buildings
  function getAvailableBuildingTypes() {
    if (!tileData?.structure) return [];

    const structureLevel = tileData.structure.level || 1;
    const existingBuildings = tileData.structure.buildings || {};
    const existingTypes = Object.values(existingBuildings).map(b => b.type);

    // All possible building types, excluding monster-only buildings
    const allBuildingTypes = Object.keys(BUILDINGS.types)
      .filter(type => !BUILDINGS.types[type].monster)
      .map(type => ({
        type,
        name: BUILDINGS.types[type].name,
        description: BUILDINGS.types[type].description
      }));

    // Filter out already built types (only allow one of each type for simplicity)
    let filteredByType = allBuildingTypes.filter(b => !existingTypes.includes(b.type));

    // Harbour requires an adjacent water tile
    if (!hasAdjacentWater()) {
      filteredByType = filteredByType.filter(b => b.type !== 'harbour');
    }

    // Special handling for spawn structures - allow more buildings
    if (tileData.structure.type === 'spawn') {
      // Spawn points can have up to 5 buildings regardless of level
      const buildingsCount = Object.keys(existingBuildings).length;
      const availableSlots = Math.max(0, 5 - buildingsCount);

      if (availableSlots <= 0) return [];
      return filteredByType;
    }

    // Regular handling for other structures
    const buildingsCount = Object.keys(existingBuildings).length;
    const availableSlots = Math.max(0, structureLevel - buildingsCount);

    if (availableSlots <= 0) return [];
    return filteredByType;
  }

  // Check if player has resources for a specific building
  function hasResourcesForBuilding(buildingType) {
    const requirements = getBuildingRequirements(buildingType);
    if (!requirements.length) return false;
    
    // Check shared storage (only using shared for new buildings)
    const sharedItems = convertItemsToDisplayFormat(tileData?.structure?.items || []);
    
    // Track available resources
    const availableResources = {};
    
    // Count shared resources - sharedItems is now guaranteed to be an array
    sharedItems.forEach(item => {
      if (!availableResources[item.name]) {
        availableResources[item.name] = 0;
      }
      availableResources[item.name] += item.quantity || 0;
    });
    
    // Check if all requirements are met
    for (const req of requirements) {
      const available = availableResources[req.name] || 0;
      if (available < req.quantity) {
        return false;
      }
    }
    
    return true;
  }

  // Get resource requirements for a new building
  function getBuildingRequirements(buildingType) {
    const buildingDef = BUILDINGS.types[buildingType];
    return buildingDef ? buildingDef.baseRequirements : [];
  }

  // Get building icon based on type
  function getBuildingIcon(type) {
    return BUILDINGS.getBuildingIcon(type);
  }

  // Get combined list of existing buildings and available building types
  function getAllBuildingsAndOptions() {
    if (!tileData?.structure) return [];
    
    // Get existing buildings as an array of objects with buildingId property
    const existingBuildings = tileData.structure.buildings ? 
      Object.entries(tileData.structure.buildings).map(([id, building]) => ({
        ...building,
        buildingId: id,
        isExisting: true
      })) : [];
    
    // Get available building types if new buildings can be added
    let availableBuildings = [];
    if (canAddNewBuilding()) {
      const existingTypes = existingBuildings.map(b => b.type);
      
      // Get available building types
      availableBuildings = getAvailableBuildingTypes()
        .filter(b => !existingTypes.includes(b.type))
        .map(building => ({
          ...building,
          level: 0,
          isExisting: false,
          description: building.description || getBuildingDescription(building.type)
        }));
    }
    
    // Combine and sort - existing buildings first, then available buildings by name
    return [
      ...existingBuildings.sort((a, b) => a.name.localeCompare(b.name)),
      ...availableBuildings.sort((a, b) => a.name.localeCompare(b.name))
    ];
  }

  // Get building description if not already provided
  function getBuildingDescription(buildingType) {
    return BUILDINGS.getBuildingDescription(buildingType);
  }

  // Function to build a new building
  function buildNewBuilding(buildingType) {
    executeAction('add-building', { buildingType });
  }

  // Set buildings section to be expanded by default since it now contains more content
  $effect(() => {
    collapsedSections.buildings = false;
  });
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="modal-container">
  <div class="structure-modal" class:active={isActive} onmouseenter={onMouseEnter} role="dialog" tabindex="-1">
    <header class="modal-header">
      <h3>
        {formatText(tileData?.structure?.type || 'Structure')} 
        {tileData ? `(${formatCoords(tileData.x, tileData.y)})` : ''}
      </h3>
      <button class="close-button" onclick={onClose}>
        <Close size="1.6em" extraClass="close-icon-dark" />
      </button>
    </header>

    <div class="modal-content">
      <div class="structure-container">
        <div class="structure-icon-container">
          {#if tileData?.structure?.type === 'spawn'}
            <Torch size="3.5em" extraClass="structure-type-icon spawn-icon" />
          {:else}
            <Structure size="3.5em" extraClass="structure-type-icon {tileData?.structure?.type || ''}-icon" />
          {/if}
        </div>
        
        <div class="structure-info">
          <div class="structure-name">
            <h2>{tileData?.structure?.name || formatText(tileData?.structure?.type) || 'Unknown'}</h2>
            {#if isOwnedByCurrentPlayer(tileData?.structure)}
              <span class="entity-badge owner-badge">Yours</span>
            {/if}
            
            <!-- Add level badge -->
            {#if tileData?.structure?.level || tileData?.structure?.level === 0}
              <span class="entity-badge level-badge">Level {tileData.structure.level}</span>
            {/if}
            
            {#if tileData?.structure?.race}
              <span class="entity-badge race-badge">
                <!-- Race icon in race badge is kept -->
                {#if tileData?.structure?.race.toLowerCase() === 'human'}
                  <Human extraClass="race-icon-badge" />
                {:else if tileData?.structure?.race.toLowerCase() === 'elf'}
                  <Elf extraClass="race-icon-badge" />
                {:else if tileData?.structure?.race.toLowerCase() === 'dwarf'}
                  <Dwarf extraClass="race-icon-badge" />
                {:else if tileData?.structure?.race.toLowerCase() === 'goblin'}
                  <Goblin extraClass="race-icon-badge" />
                {:else if tileData?.structure?.race.toLowerCase() === 'fairy'}
                  <Fairy extraClass="race-icon-badge" />
                {/if}
                <span>{formatText(tileData?.structure?.race)}</span>
              </span>
            {/if}
          </div>
          
          {#if tileData?.structure?.description}
            <div class="structure-description">
              {tileData.structure.description}
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Building info section (collapsible) -->
      <div class="entities-section">
        <div 
          class="section-header"
          onclick={() => toggleSection('building')}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              toggleSection('building');
              e.preventDefault();
            }
          }}
          role="button"
          tabindex="0"
          aria-expanded={!collapsedSections.building}
        >
          <h4>Building Info</h4>
          <button class="collapse-button">
            {collapsedSections.building ? '▼' : '▲'}
          </button>
        </div>
        
        {#if !collapsedSections.building}
          <div class="section-content" transition:slide|local={{duration: 300}}>
            <div class="building-info">
              <!-- Level and basic info -->
              <div class="info-group">
                <div class="info-label">Type:</div>
                <div class="info-value">{formatText(tileData?.structure?.type || 'Unknown')}</div>
              </div>
              
              <div class="info-group">
                <div class="info-label">Level:</div>
                <div class="info-value">{tileData?.structure?.level || 1}</div>
              </div>
              
              {#if tileData?.structure?.capacity}
                <div class="info-group">
                  <div class="info-label">Capacity:</div>
                  <div class="info-value">{tileData.structure.capacity}</div>
                </div>
              {/if}
              
              {#if tileData?.structure?.owner}
                <div class="info-group">
                  <div class="info-label">Owner:</div>
                  <div class="info-value">{tileData.structure.ownerName || 'Unknown'}</div>
                </div>
              {/if}
              
              <!-- Building features -->
              {#if tileData?.structure?.features && tileData.structure.features.length > 0}
                <div class="features-list">
                  <h5>Features</h5>
                  {#each tileData.structure.features as feature}
                    <div class="feature-item">
                      <div class="feature-icon">{feature.icon}</div>
                      <div class="feature-details">
                        <div class="feature-name">{feature.name}</div>
                        <div class="feature-description">{feature.description}</div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
              
              <!-- Upgrade section -->
              {#if canUpgradeStructure()}
                <div class="upgrade-section">
                  <h5>Upgrade to Level {(tileData?.structure?.level || 1) + 1}</h5>
                  
                  <!-- Resource requirements -->
                  <div class="upgrade-requirements">
                    <div class="requirements-title">Required Resources:</div>
                    <div class="requirements-list">
                      {#each getUpgradeRequirements() as requirement}
                        {@const available = getAvailableQuantity(requirement.name)}
                        <div class="requirement-item {available >= requirement.quantity ? 'sufficient' : 'insufficient'}">
                          {requirement.name}: {requirement.quantity} 
                          <span class="available-count">
                            (Have: {available})
                          </span>
                        </div>
                      {/each}
                    </div>
                  </div>
                  
                  <!-- New features that would be unlocked -->
                  {#if getNewFeatures().length > 0}
                    <div class="new-features">
                      <div class="new-features-title">Unlocks:</div>
                      <div class="new-features-list">
                        {#each getNewFeatures() as feature}
                          <div class="new-feature-item">
                            <div class="feature-icon building-feature-icon">
                              <BuildingIcon type={feature.iconType} size="1.2em" extraClass="building-type-icon" />
                            </div>
                            <div class="feature-details">
                              <div class="feature-name">{feature.name}</div>
                              <div class="feature-description">{feature.description}</div>
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                  
                  {#if upgradeError}
                    <div class="error-message">{upgradeError}</div>
                  {/if}
                  
                  {#if upgradeSuccess}
                    <div class="success-message">{upgradeSuccess}</div>
                  {/if}
                  
                  <!-- Upgrade button -->
                  <button 
                    class="upgrade-button action-button" 
                    onclick={startUpgrade}
                    disabled={isUpgrading || !hasResourcesForUpgrade()}
                  >
                    <Hammer extraClass="action-icon" />
                    <span>{isUpgrading ? 'Upgrading...' : 'Upgrade Structure'}</span>
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
      
      <!-- UPDATED SECTION: Combined Buildings section -->
      <div class="entities-section">
        <div 
          class="section-header"
          onclick={() => toggleSection('buildings')}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              toggleSection('buildings');
              e.preventDefault();
            }
          }}
          role="button"
          tabindex="0"
          aria-expanded={!collapsedSections.buildings}
        >
          <h4>Buildings <span class="entity-count buildings-count">{tileData?.structure?.buildings ? Object.keys(tileData?.structure?.buildings).length : 0}</span></h4>
          <button class="collapse-button">
            {collapsedSections.buildings ? '▼' : '▲'}
          </button>
        </div>
        
        {#if !collapsedSections.buildings}
          <div class="section-content" transition:slide|local={{duration: 300}}>
            {#if getAllBuildingsAndOptions().length > 0}
              <div class="buildings-grid">
                <!-- Fix the building card section for accurate resource status labels -->
                {#each getAllBuildingsAndOptions() as building}
                  <div class="building-card {building.upgradeInProgress ? 'upgrading' : ''} {building.level === 0 ? 'available-building' : ''}">
                    {#if building.level === 0}
                      <div class="building-header">
                        <div class="building-icon">
                          <BuildingIcon type={building.type} size="1.4em" extraClass="building-type-icon" />
                        </div>

                        <div class="building-title">
                          <div class="building-name">{building.name || formatText(building.type)}</div>
                          <div class="building-level">
                            <!-- Fix the label to accurately show resource status -->
                            <span class={hasResourcesForBuilding(building.type) ? "available-label" : "unavailable-label"}>
                              {hasResourcesForBuilding(building.type) ? "Available to Build" : "Missing Resources"}
                            </span>
                          </div>
                        </div>
                      </div>
                    {:else}
                      <div class="building-header">
                        <div class="building-icon">
                          <BuildingIcon type={building.type} size="1.4em" extraClass="building-type-icon" />
                        </div>
                        
                        <div class="building-title">
                          <div class="building-name">{building.name || formatText(building.type)}</div>
                          <div class="building-level">
                            Level {building.level || 1}
                          </div>
                        </div>
                      </div>
                    {/if}
                    
                    {#if building.description}
                      <div class="building-description">{building.description}</div>
                    {/if}
                    
                    {#if building.level === 0}
                      <!-- AVAILABLE BUILDING - Show requirements and build button -->
                      <div class="building-requirements">
                        <h6>Required Resources:</h6>
                        <div class="requirements-list">
                          {#each getBuildingRequirements(building.type) as req}
                            {@const structureItems = convertItemsToDisplayFormat(tileData?.structure?.items || [])}
                            {@const available = structureItems.reduce((total, item) => 
                              item && item.name === req.name ? total + (item.quantity || 0) : total, 0) || 0}
                            <div class="requirement-item {available >= req.quantity ? 'sufficient' : 'insufficient'}">
                              {req.name}: {req.quantity} 
                              <span class="available-count">
                                (Have: {available})
                              </span>
                            </div>
                          {/each}
                        </div>
                      </div>
                      
                      <!-- Only show build button if player can see upgrade UI and it's not a spawn of different race -->
                      {#if canSeeUpgradeUI(tileData?.structure) && 
                        !(tileData?.structure?.type === 'spawn' && tileData?.structure?.race !== $currentPlayer?.race)}
                        <button 
                          class="build-building-button"
                          onclick={() => buildNewBuilding(building.type)}
                          disabled={!hasResourcesForBuilding(building.type)}
                        >
                          Build Now
                        </button>
                      {/if}
                    {:else if building.upgradeInProgress}
                      <!-- UPGRADING BUILDING - Show progress -->
                      <div class="upgrade-progress">
                        <div class="progress-bar">
                          <div class="progress-fill" style="width: {getBuildingUpgradeProgress(building)}%"></div>
                        </div>
                        <div class="progress-text">
                          Upgrade to level {(building.level || 1) + 1}: {getBuildingUpgradeProgress(building)}%
                        </div>
                      </div>
                    {:else if canUpgradeBuilding(building.buildingId, building)}
                      <!-- UPGRADABLE BUILDING - Show upgrade button -->
                      <button 
                        class="upgrade-building-button"
                        onclick={() => startBuildingUpgrade(building.buildingId, building)}
                      >
                        <Hammer extraClass="action-icon-small" />
                        Upgrade to Level {(building.level || 1) + 1}
                      </button>
                    {:else}
                      <!-- NON-UPGRADABLE BUILDING - Show reason -->
                      <div class="building-max-level">
                        {building.level >= 5 ? 'Maximum level reached' : 'Upgrade requirements not met'}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {:else}
              <div class="empty-state">
                {canModifyStructure(tileData?.structure) ? 
                  'No buildings yet. Add buildings to improve your structure!' : 
                  'No buildings in this structure yet.'}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Storage section - Clean version without debug elements -->
      {#if showStorageTabs}
        <div class="entities-section">
          <div 
            class="section-header"
            onclick={() => toggleSection('items')}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                toggleSection('items');
                e.preventDefault();
              }
            }}
            role="button"
            tabindex="0"
            aria-expanded={!collapsedSections.items}
          >
            <h4>Storage 
              <span class="entity-count items-count">
                {activeTab === 'shared' 
                  ? (Array.isArray(tileData?.structure?.items) 
                    ? tileData?.structure?.items.length 
                    : Object.keys(tileData?.structure?.items || {}).filter(k => !k.startsWith('_')).length)
                  : (Array.isArray(tileData?.structure?.banks?.$currentPlayer?.id) 
                    ? tileData?.structure?.banks?.$currentPlayer?.id.length
                    : Object.keys(tileData?.structure?.banks?.$currentPlayer?.id || {}).filter(k => !k.startsWith('_')).length)
                }
              </span>
            </h4>
            <button class="collapse-button">
              {collapsedSections.items ? '▼' : '▲'}
            </button>
          </div>
          
          {#if !collapsedSections.items}
            <div class="section-content" transition:slide|local={{duration: 300}}>
              {#if hasPersonalBank || (tileData?.structure?.items && 
                (Array.isArray(tileData?.structure?.items) 
                ? tileData?.structure?.items.length > 0 
                : Object.keys(tileData?.structure?.items).filter(k => !k.startsWith('_')).length > 0))}
                <div class="storage-tabs">
                  <button 
                    class="tab-button {activeTab === 'shared' ? 'active' : ''}" 
                    onclick={() => activeTab = 'shared'}
                  >
                    Shared Storage
                    {#if tileData?.structure?.items}
                      <span class="tab-count">
                        {Array.isArray(tileData.structure.items) 
                          ? tileData.structure.items.length 
                          : Object.keys(tileData.structure.items).filter(k => !k.startsWith('_')).length}
                      </span>
                    {/if}
                  </button>
                  
                  {#if hasPersonalBank}
                    <button 
                      class="tab-button {activeTab === 'personal' ? 'active' : ''}"
                      onclick={() => activeTab = 'personal'}
                    >
                      Your Bank
                      <span class="tab-count">
                        {Array.isArray(tileData?.structure?.banks[$currentPlayer.id])
                          ? tileData.structure.banks[$currentPlayer.id].length
                          : Object.keys(tileData?.structure?.banks[$currentPlayer.id] || {}).filter(k => !k.startsWith('_')).length}
                      </span>
                    </button>
                  {/if}
                </div>
              {/if}
              
              <!-- Combined storage display -->
              {#if !displayItems || displayItems.length === 0}
                {#if activeTab === 'shared' && tileData?.structure?.items && Object.keys(tileData?.structure?.items).filter(k => !k.startsWith('_')).length > 0}
                  <!-- Fallback rendering when normal conversion fails -->
                  <div class="items-count-info">Showing {Object.keys(tileData.structure.items).filter(k => !k.startsWith('_')).length} items</div>
                  {#each Object.entries(tileData.structure.items).filter(([key]) => !key.startsWith('_')) as [itemCode, quantity]}
                    <div class="entity item common">
                      <div class="item-info">
                        <div class="item-name">
                          {ITEMS[itemCode]?.name || formatText(itemCode)} <span class="item-quantity">×{quantity}</span>
                        </div>
                        <div class="item-details">
                          <span class="item-type">{ITEMS[itemCode]?.type ? formatText(ITEMS[itemCode].type) : 'Resource'}</span>
                          {#if ITEMS[itemCode]?.rarity && ITEMS[itemCode].rarity !== 'common'}
                            <span class="item-rarity {ITEMS[itemCode].rarity}">{formatText(ITEMS[itemCode].rarity)}</span>
                          {/if}
                        </div>
                        {#if ITEMS[itemCode]?.description}
                          <div class="item-description">{ITEMS[itemCode].description}</div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                {:else}
                  <div class="empty-state">
                    {activeTab === 'shared' ? 'No items in shared storage' : 'Your personal bank is empty'}
                  </div>
                {/if}
              {:else}
                <!-- Normal item display when conversion worked -->
                <div class="items-count-info">Showing {displayItems.length} items</div>
                {#each displayItems as item}
                  <div class="entity item {item?.rarity || 'common'}">
                    <div class="item-info">
                      <div class="item-name">
                        {item.name || formatText(item.code) || "Unknown Item"} <span class="item-quantity">×{item.quantity}</span>
                      </div>
                      <div class="item-details">
                        {#if item.type}
                          <span class="item-type">{formatText(item.type)}</span>
                        {/if}
                        {#if item.rarity && item.rarity !== 'common'}
                          <span class="item-rarity {item.rarity}">{formatText(item.rarity)}</span>
                        {/if}
                      </div>
                      {#if item.description}
                        <div class="item-description">{item.description}</div>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* ── Floating modal chrome (standalone use) ── */
  .modal-container {
    position: fixed;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    pointer-events: none;
  }

  .structure-modal {
    pointer-events: auto;
    width: 90%;
    max-width: 34em;
    max-height: 85vh;
    background: linear-gradient(180deg, rgba(10, 14, 26, 0.97), rgba(14, 19, 32, 0.97));
    border: 0.075em solid rgba(176, 141, 74, 0.3);
    box-shadow: 0 1em 3em rgba(0, 0, 0, 0.6);
    color: var(--color-parchment-100, #fbf6e7);
    z-index: 1000;
    font-size: 1.4em;
    font-family: var(--font-body, 'EB Garamond', serif);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(8px);
    animation: modalAppear 0.2s ease-out forwards;
  }

  @keyframes modalAppear {
    from { opacity: 0; transform: scale(0.97); }
    to   { opacity: 1; transform: scale(1); }
  }

  /* ── Header ── */
  .modal-header {
    padding: 0.7em 1em;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(176, 141, 74, 0.07);
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.18);
    flex-shrink: 0;
  }

  h3 {
    margin: 0;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.78em;
    font-weight: 400;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-gold-pale, #d4b170);
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.3em;
    display: flex;
    align-items: center;
    color: rgba(232, 228, 210, 0.5);
    transition: color 0.15s;
  }
  .close-button:hover { color: var(--color-parchment-100, #fbf6e7); }

  /* ── Scrollable content ── */
  .modal-content {
    padding: 0.75em 0.9em;
    overflow-y: auto;
    flex: 1;
  }

  /* ── Structure hero row ── */
  .structure-container {
    display: flex;
    align-items: center;
    gap: 0.85em;
    padding-bottom: 0.85em;
    border-bottom: 0.075em solid rgba(255, 255, 255, 0.06);
    margin-bottom: 0.85em;
  }

  .structure-icon-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 3em;
    color: var(--color-gold-pale, #d4b170);
  }

  .structure-info { flex: 1; }

  .structure-name {
    display: flex;
    align-items: center;
    gap: 0.4em;
    flex-wrap: wrap;
    margin-bottom: 0.35em;
  }

  .structure-name h2 {
    margin: 0;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.88em;
    font-weight: 500;
    letter-spacing: 0.07em;
    color: var(--color-parchment-100, #fbf6e7);
  }

  .structure-description {
    font-family: var(--font-editorial, 'IM Fell English', serif);
    font-style: italic;
    font-size: 0.82em;
    color: rgba(232, 228, 210, 0.6);
    line-height: 1.4;
  }

  /* ── Badges ── */
  .entity-badge {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.62em;
    padding: 0.2em 0.45em;
    letter-spacing: 0.08em;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.3em;
  }

  .owner-badge {
    background: rgba(76, 175, 80, 0.12);
    color: #6ecf72;
    border: 0.075em solid rgba(76, 175, 80, 0.3);
  }

  .race-badge {
    background: rgba(33, 150, 243, 0.12);
    color: #64b5f6;
    border: 0.075em solid rgba(33, 150, 243, 0.28);
  }

  .level-badge {
    background: rgba(176, 141, 74, 0.15);
    color: var(--color-gold-pale, #d4b170);
    border: 0.075em solid rgba(176, 141, 74, 0.3);
  }

  :global(.race-icon-badge) {
    width: 1em;
    height: 1em;
    fill: currentColor;
  }

  /* ── Collapsible sections ── */
  .entities-section {
    margin-bottom: 0.6em;
    border: 0.075em solid rgba(176, 141, 74, 0.15);
    background: rgba(255, 255, 255, 0.02);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5em 0.8em;
    background: rgba(176, 141, 74, 0.05);
    cursor: pointer;
    user-select: none;
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.1);
  }

  .section-header:hover { background: rgba(176, 141, 74, 0.09); }

  .collapse-button {
    background: none;
    border: none;
    color: rgba(232, 228, 210, 0.4);
    font-size: 0.75em;
    cursor: pointer;
    padding: 0.2em 0.4em;
    transition: color 0.15s;
    line-height: 1;
  }
  .collapse-button:hover { color: var(--color-gold-pale, #d4b170); }

  h4 {
    margin: 0;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.62em;
    font-weight: 400;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-aged-gold, #b08d4a);
    display: flex;
    align-items: center;
    gap: 0.4em;
  }

  .section-content { padding: 0.7em 0.85em; }

  /* ── Building info key/value rows ── */
  .building-info { display: flex; flex-direction: column; gap: 0.5em; }

  .info-group {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.82em;
    padding-bottom: 0.4em;
    border-bottom: 0.04em solid rgba(255, 255, 255, 0.05);
  }

  .info-label {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.88em;
    letter-spacing: 0.08em;
    color: var(--color-aged-gold, #b08d4a);
  }

  .info-value {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    color: var(--color-parchment-100, #fbf6e7);
  }

  h5 {
    margin: 0.7em 0 0.35em;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.7em;
    font-weight: 400;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-aged-gold, #b08d4a);
  }

  .features-list, .upgrade-requirements, .new-features {
    background: rgba(255, 255, 255, 0.02);
    padding: 0.55em;
    border: 0.075em solid rgba(176, 141, 74, 0.12);
  }

  .feature-item, .new-feature-item {
    display: flex;
    align-items: flex-start;
    gap: 0.55em;
    margin-bottom: 0.45em;
    padding-bottom: 0.45em;
    border-bottom: 0.04em solid rgba(255, 255, 255, 0.05);
  }
  .feature-item:last-child, .new-feature-item:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .feature-icon {
    background: rgba(176, 141, 74, 0.1);
    width: 1.8em;
    height: 1.8em;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--color-gold-pale, #d4b170);
  }

  .feature-details { flex: 1; }

  .feature-name {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.8em;
    letter-spacing: 0.06em;
    color: var(--color-parchment-100, #fbf6e7);
    margin-bottom: 0.15em;
  }

  .feature-description {
    font-family: var(--font-editorial, 'IM Fell English', serif);
    font-style: italic;
    font-size: 0.78em;
    color: rgba(232, 228, 210, 0.55);
  }

  /* ── Upgrade section ── */
  .upgrade-section {
    margin-top: 0.8em;
    padding-top: 0.8em;
    border-top: 0.075em solid rgba(176, 141, 74, 0.15);
  }

  .requirements-title, .new-features-title {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.68em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-aged-gold, #b08d4a);
    margin-bottom: 0.4em;
  }

  .requirements-list { display: flex; flex-direction: column; gap: 0.3em; }

  .requirement-item {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.78em;
    padding: 0.3em 0.55em;
    background: rgba(255, 255, 255, 0.03);
    border: 0.075em solid rgba(176, 141, 74, 0.12);
    color: rgba(232, 228, 210, 0.75);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .requirement-item.sufficient {
    color: #6ecf72;
    background: rgba(76, 175, 80, 0.08);
    border-color: rgba(76, 175, 80, 0.22);
  }

  .requirement-item.insufficient {
    color: #ef7878;
    background: rgba(198, 40, 40, 0.08);
    border-color: rgba(198, 40, 40, 0.22);
  }

  .available-count {
    font-size: 0.88em;
    opacity: 0.7;
  }

  .new-features { margin-top: 0.8em; }

  /* ── Storage tabs ── */
  .storage-tabs {
    display: flex;
    margin-bottom: 0.7em;
    border: 0.075em solid rgba(176, 141, 74, 0.2);
  }

  .tab-button {
    flex: 1;
    padding: 0.45em 0.7em;
    background: rgba(255, 255, 255, 0.03);
    border: none;
    border-right: 0.075em solid rgba(176, 141, 74, 0.18);
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.65em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    color: rgba(232, 228, 210, 0.55);
    transition: background 0.15s, color 0.15s;
  }
  .tab-button:last-child { border-right: none; }
  .tab-button.active {
    background: rgba(176, 141, 74, 0.12);
    color: var(--color-gold-pale, #d4b170);
  }
  .tab-button:hover:not(.active) {
    background: rgba(176, 141, 74, 0.06);
    color: rgba(232, 228, 210, 0.8);
  }

  .tab-count {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    background: rgba(176, 141, 74, 0.15);
    padding: 0.1em 0.4em;
    font-size: 0.85em;
  }

  /* ── Empty / status states ── */
  .empty-state {
    padding: 1.5em 0;
    text-align: center;
    font-family: var(--font-editorial, 'IM Fell English', serif);
    font-style: italic;
    color: rgba(232, 228, 210, 0.35);
    font-size: 0.85em;
  }

  .items-count-info {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.68em;
    color: var(--color-aged-gold, #b08d4a);
    letter-spacing: 0.1em;
    margin-bottom: 0.5em;
    opacity: 0.8;
  }

  /* ── Item rows ── */
  .entity {
    display: flex;
    align-items: flex-start;
    margin-bottom: 0.35em;
    padding: 0.45em 0.65em;
    background: rgba(255, 255, 255, 0.02);
    border: 0.075em solid rgba(176, 141, 74, 0.12);
    transition: background 0.15s;
  }
  .entity:last-child { margin-bottom: 0; }
  .entity:hover { background: rgba(176, 141, 74, 0.06); }

  .item-info { flex: 1; }

  .item-name {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.8em;
    letter-spacing: 0.05em;
    color: var(--color-parchment-100, #fbf6e7);
    margin-bottom: 0.15em;
  }

  .item-quantity {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.88em;
    color: rgba(232, 228, 210, 0.6);
    margin-left: 0.4em;
    font-weight: normal;
  }

  .item-details {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    font-size: 0.75em;
    color: rgba(232, 228, 210, 0.5);
  }

  .item-type {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    letter-spacing: 0.06em;
  }

  .item-description {
    font-family: var(--font-editorial, 'IM Fell English', serif);
    font-style: italic;
    font-size: 0.82em;
    color: rgba(232, 228, 210, 0.45);
    margin-top: 0.3em;
  }

  /* Item rarity borders */
  .entity.item.uncommon { border-color: rgba(76, 175, 80, 0.28); }
  .entity.item.rare     { border-color: rgba(33, 150, 243, 0.28); }
  .entity.item.epic     { border-color: rgba(156, 39, 176, 0.28); }
  .entity.item.legendary{ border-color: rgba(255, 152, 0, 0.28); }
  .entity.item.mythic   { border-color: rgba(233, 30, 99, 0.35); animation: pulseMythic 2s infinite alternate; }

  .item-rarity {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.8em;
    padding: 0.1em 0.4em;
    letter-spacing: 0.06em;
  }
  .item-rarity.uncommon { color: #6ecf72; background: rgba(76, 175, 80, 0.1); }
  .item-rarity.rare     { color: #64b5f6; background: rgba(33, 150, 243, 0.1); }
  .item-rarity.epic     { color: #ba68c8; background: rgba(156, 39, 176, 0.1); }
  .item-rarity.legendary{ color: #ffb74d; background: rgba(255, 152, 0, 0.1); }
  .item-rarity.mythic   { color: #f06292; background: rgba(233, 30, 99, 0.1); border: 0.075em solid rgba(233, 30, 99, 0.3); }

  @keyframes pulseMythic {
    from { box-shadow: none; }
    to   { box-shadow: 0 0 0.5em rgba(233, 30, 99, 0.25); }
  }

  /* ── Count badges in section headers ── */
  .entity-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.85em;
    padding: 0.05em 0.5em;
    margin-left: 0.3em;
    color: rgba(232, 228, 210, 0.6);
    background: rgba(255, 255, 255, 0.06);
    border: 0.075em solid rgba(255, 255, 255, 0.1);
  }

  .items-count     { color: var(--color-gold-pale, #d4b170); border-color: rgba(176, 141, 74, 0.3); }
  .buildings-count { color: #ba68c8; border-color: rgba(156, 39, 176, 0.25); }

  /* ── Structure icon filters ── */
  :global(.structure-type-icon) { opacity: 0.85; }
  :global(.spawn-icon)     { filter: drop-shadow(0 0 2px rgba(0, 220, 220, 0.5)); }
  :global(.fortress-icon)  { filter: drop-shadow(0 0 2px rgba(230, 190, 138, 0.6)); }
  :global(.outpost-icon)   { filter: drop-shadow(0 0 2px rgba(138, 176, 230, 0.6)); }
  :global(.watchtower-icon){ filter: drop-shadow(0 0 2px rgba(168, 230, 138, 0.6)); }
  :global(.stronghold-icon){ filter: drop-shadow(0 0 2px rgba(230, 138, 138, 0.6)); }
  :global(.citadel-icon)   { filter: drop-shadow(0 0 2px rgba(209, 138, 230, 0.6)); }

  /* ── Buildings grid — single column inside narrow dossier ── */
  .buildings-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin-bottom: 0.6em;
  }

  .building-card {
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.02);
    border: 0.075em solid rgba(176, 141, 74, 0.15);
    padding: 0.65em;
    transition: background 0.15s;
  }
  .building-card:hover { background: rgba(176, 141, 74, 0.05); }

  .building-card.available-building { border-style: dashed; border-color: rgba(76, 175, 80, 0.35); }
  .building-card.available-building:has(.unavailable-label) { border-color: rgba(198, 40, 40, 0.35); }

  .available-label   { color: #6ecf72; }
  .unavailable-label { color: #ef7878; }

  .building-header {
    display: flex;
    align-items: center;
    gap: 0.65em;
    margin-bottom: 0.5em;
  }

  .building-icon {
    background: rgba(176, 141, 74, 0.08);
    width: 2.1em;
    height: 2.1em;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--color-gold-pale, #d4b170);
  }

  :global(.building-type-icon) { display: block; }

  .building-title { flex: 1; }

  .building-name {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.82em;
    letter-spacing: 0.06em;
    color: var(--color-parchment-100, #fbf6e7);
    margin-bottom: 0.1em;
  }

  .building-level {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72em;
    color: rgba(232, 228, 210, 0.5);
  }

  .building-description {
    font-family: var(--font-editorial, 'IM Fell English', serif);
    font-style: italic;
    font-size: 0.8em;
    color: rgba(232, 228, 210, 0.5);
    margin-bottom: 0.6em;
    line-height: 1.3;
  }

  .building-requirements {
    margin: 0.1em 0 0.6em;
    background: rgba(255, 255, 255, 0.02);
    padding: 0.5em;
    border: 0.075em solid rgba(176, 141, 74, 0.1);
  }

  .building-requirements h6 {
    margin: 0 0 0.35em;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.65em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-aged-gold, #b08d4a);
  }

  /* ── Upgrade progress ── */
  .upgrade-progress { margin-top: 0.4em; }

  .progress-bar {
    background: rgba(255, 255, 255, 0.06);
    height: 0.3em;
    margin-bottom: 0.35em;
    overflow: hidden;
  }

  .progress-fill { background: var(--color-aged-gold, #b08d4a); height: 100%; }

  .progress-text {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.72em;
    color: rgba(232, 228, 210, 0.55);
  }

  /* ── Upgrade/build buttons ── */
  .upgrade-building-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    width: 100%;
    margin-top: 0.4em;
    padding: 0.45em 0.8em;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.65em;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    background: transparent;
    color: var(--color-gold-pale, #d4b170);
    border: 0.075em solid rgba(176, 141, 74, 0.4);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .upgrade-building-button:hover {
    background: rgba(176, 141, 74, 0.1);
    border-color: var(--color-gold-pale, #d4b170);
  }

  .building-max-level {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.7em;
    color: rgba(232, 228, 210, 0.35);
    text-align: center;
    padding: 0.35em 0;
  }

  .build-building-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    width: 100%;
    margin-top: 0.3em;
    padding: 0.45em 0.8em;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.65em;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    background: rgba(76, 175, 80, 0.15);
    color: #6ecf72;
    border: 0.075em solid rgba(76, 175, 80, 0.35);
    cursor: pointer;
    transition: background 0.15s;
  }
  .build-building-button:not(:disabled):hover { background: rgba(76, 175, 80, 0.25); }
  .build-building-button:disabled {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(232, 228, 210, 0.3);
    border-color: rgba(255, 255, 255, 0.08);
    cursor: not-allowed;
  }

  /* Upgrade structure button (action-button) */
  .action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    width: 100%;
    margin-top: 0.6em;
    padding: 0.5em 0.9em;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.7em;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .upgrade-button {
    background: var(--color-aged-gold, #b08d4a);
    color: var(--color-ink-900, #0e1320);
    border: 0.075em solid var(--color-aged-gold, #b08d4a);
  }
  .upgrade-button:not(:disabled):hover {
    background: var(--color-gold-pale, #d4b170);
    border-color: var(--color-gold-pale, #d4b170);
  }
  .upgrade-button:disabled {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(232, 228, 210, 0.3);
    border-color: rgba(255, 255, 255, 0.08);
    cursor: not-allowed;
  }

  /* ── Messages ── */
  .error-message {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.75em;
    color: #ef7878;
    margin-top: 0.4em;
    padding: 0.35em 0.55em;
    background: rgba(198, 40, 40, 0.1);
    border: 0.075em solid rgba(198, 40, 40, 0.25);
  }

  .success-message {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.75em;
    color: #6ecf72;
    margin-top: 0.4em;
    padding: 0.35em 0.55em;
    background: rgba(76, 175, 80, 0.1);
    border: 0.075em solid rgba(76, 175, 80, 0.25);
  }

  :global(.action-icon) {
    width: 1.1em;
    height: 1.1em;
    fill: currentColor;
  }
</style>
