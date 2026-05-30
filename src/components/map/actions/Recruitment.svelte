<script>
    import { apiPost } from '../../../lib/api.js';

    import { onMount } from "svelte";
    import { get } from "svelte/store";
    
    import UNITS from "gisaima-shared/definitions/UNITS.js";
    import { ITEMS } from "gisaima-shared/definitions/ITEMS.js";

    import { game, currentPlayer } from "../../../lib/stores/game.js";

    import Unit from "../../icons/Unit.svelte";
    import BuildingIcon from "../../icons/BuildingIcon.svelte";
    import Structure from "../../icons/Structure.svelte";
    import Lock from "../../icons/Lock.svelte";
    import Info from "../../icons/Info.svelte";

    // Props
    const {
        structure = null,
        x = 0,
        y = 0,
        onClose = () => {},
        onRecruitStart = () => {},
    } = $props();

    // Component state
    let isLoading = $state(false);
    let error = $state(null);
    let success = $state(null);
    let selectedUnit = $state(null);
    let quantity = $state(1);
    let availableUnits = $state([]);
    let structureData = $state(null);
    let queue = $state([]);
    let maxUnits = $state(10); // Default max queue size
    let completionInfo = $state(null);
    
    // Flag to track initial setup
    let initialSetupDone = $state(false);

    // Set initial data from props - modified to avoid infinite loops
    $effect(() => {
        if (structure && !initialSetupDone) {
            structureData = structure;

            // Set max units based on structure capacity
            maxUnits = structure.capacity || 10;
            
            // Load available units directly from UNITS
            const units = getAvailableUnits(structure);
            availableUnits = units;
            
            // Update queue
            if (structure.recruitmentQueue) {
                queue = Object.values(structure.recruitmentQueue)
                    .filter((item) => item && typeof item === "object")
                    .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
            }
            
            // Set initial selected unit AFTER setting available units
            const firstAvailable = units.find(unit => unit.available);
            if (firstAvailable) {
                selectedUnit = firstAvailable;
            } else if (units.length > 0) {
                selectedUnit = units[0];
            }
            
            // Mark setup as complete to avoid re-running
            initialSetupDone = true;
        }
    });

    // Update completion info when selectedUnit or quantity changes
    $effect(() => {
        if (selectedUnit && quantity > 0) {
            // Create a new object without modifying state
            completionInfo = calculateCompletionTime();
        } else {
            completionInfo = null;
        }
    });

    // Function to get available units directly from UNITS
    function getAvailableUnits(structure) {
        const race = structure.race?.toLowerCase();
        const structureLevel = structure.level || 1;
        const structureType = structure.type;
        
        // Get buildings inside the structure (if any)
        const buildings = structure.buildings || {};
        
        // Get the player's race from the currentPlayer store
        const player = get(currentPlayer);
        const playerRace = player?.race?.toLowerCase() || null;
        
        // Filter units from UNITS that are player recruitable units 
        // But exclude units with type 'player' (the player character)
        // And only show units that match the player's race or are neutral
        return Object.entries(UNITS)
            .filter(([_, unit]) => {
                // Must be a player unit category but not player type
                const isPlayerUnit = unit.category === 'player' && unit.type !== 'player';
                
                // Must match player's race or be neutral race
                const unitRace = unit.race?.toLowerCase() || 'neutral';
                const matchesPlayerRace = !playerRace || unitRace === 'neutral' || unitRace === playerRace;
                
                return isPlayerUnit && matchesPlayerRace;
            })
            .map(([id, unit]) => {
                // Create a clean unit object with recruitment properties
                const cleanUnit = {
                    id,
                    name: unit.name,
                    description: unit.description,
                    type: unit.type,
                    race: unit.race || 'neutral',
                    cost: unit.cost || {},
                    timePerUnit: unit.timePerUnit || 60,
                    icon: unit.icon,
                    meleeAttack: unit.meleeAttack ?? 0,
                    rangedAttack: unit.rangedAttack ?? 0,
                    magicAttack: unit.magicAttack ?? 0,
                    meleeDefense: unit.meleeDefense ?? 0,
                    rangedDefense: unit.rangedDefense ?? 0,
                    magicDefense: unit.magicDefense ?? 0,
                    requirements: unit.requirements || {},
                    sortOrder: unit.recruitment?.sortOrder || 999,
                    tooltip: unit.recruitment?.tooltip || ''
                };
                
                // Calculate availability based on requirements
                const reqs = unit.requirements || {};
                let available = true;
                let unavailableReason = "";
                
                // Use provided unavailable text if available
                if (unit.recruitment?.unavailableText) {
                    unavailableReason = unit.recruitment.unavailableText;
                }
                
                // Structure level check
                if (reqs.structureLevel > structureLevel) {
                    available = false;
                    if (!unavailableReason) {
                        unavailableReason = `Requires structure level ${reqs.structureLevel}`;
                    }
                }
                
                // Race check
                if (reqs.race && reqs.race !== race) {
                    available = false;
                    if (!unavailableReason) {
                        unavailableReason = `Requires ${formatRaceName(reqs.race)} structure`;
                    }
                }
                
                // Structure type check
                if (reqs.structureType && 
                    !reqs.structureType.includes(structureType)) {
                    available = false;
                    if (!unavailableReason) {
                        unavailableReason = `Requires ${formatStructureTypeName(reqs.structureType[0])}`;
                    }
                }
                
                // Building type and level check
                if (reqs.buildingType) {
                    const requiredBuilding = buildings[reqs.buildingType];
                    const requiredLevel = reqs.buildingLevel || 1;
                    
                    if (!requiredBuilding || requiredBuilding.level < requiredLevel) {
                        available = false;
                        if (!unavailableReason) {
                            const buildingName = formatStructureTypeName(reqs.buildingType);
                            unavailableReason = `Requires ${buildingName} level ${requiredLevel}`;
                        }
                    }
                }
                
                // Research check
                if (reqs.research) {
                    // Check if research is completed in structure
                    const researchCompleted = structure.research && 
                        structure.research[reqs.research];
                    
                    // Or check if research is completed in any building
                    const buildingWithResearch = Object.values(buildings).some(
                        building => building.research && building.research[reqs.research]
                    );
                    
                    if (!researchCompleted && !buildingWithResearch) {
                        available = false;
                        if (!unavailableReason) {
                            unavailableReason = `Requires ${formatResearchName(reqs.research)} research`;
                        }
                    }
                }
                
                // Return the unit with availability info
                return {
                    ...cleanUnit,
                    available,
                    unavailableReason
                };
            })
            .sort((a, b) => a.sortOrder - b.sortOrder); // Sort by recruitment order
    }

    // Helpers for unit requirements
    function formatRaceName(race) {
        if (!race) return "";
        return race.charAt(0).toUpperCase() + race.slice(1);
    }
    
    function formatStructureTypeName(type) {
        if (!type) return "";
        return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    
    function formatResearchName(research) {
        if (!research) return "";
        return research.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // Select a unit - modified to allow selecting unavailable units for info display
    function selectUnit(unit) {
        selectedUnit = unit;
        error = null;
    }

    // Calculate total resources needed
    function calculateTotalCost() {
        if (!selectedUnit) return {};

        const totalCost = {};
        Object.entries(selectedUnit.cost).forEach(([resource, amount]) => {
            totalCost[resource] = amount * quantity;
        });

        return totalCost;
    }

    // Calculate estimated completion time - modified to work with ticks
    function calculateCompletionTime() {
        if (!selectedUnit) return null;

        const now = Date.now();
        const ticksPerUnit = selectedUnit.timePerUnit || 1;
        const totalTicks = ticksPerUnit * quantity;

        // Add time for existing queue items
        let queueTicks = 0;
        queue.forEach((item) => {
            if (item.completesAt && item.completesAt > now) {
                // Convert remaining time to ticks
                queueTicks += (item.completesAt - now) / (60 * 1000); // 1 tick = 60 seconds
            }
        });

        // Total time including queue
        const totalTicksWithQueue = queueTicks + totalTicks;
        const tickDuration = 60 * 1000; // 60 seconds per tick in milliseconds
        const completionDate = new Date(now + totalTicksWithQueue * tickDuration);

        return {
            ticks: totalTicks,
            totalTicks: totalTicksWithQueue,
            date: completionDate,
            queueTicks: queueTicks,
            ticksRequired: Math.ceil(totalTicks)
        };
    }

    // Format time in ticks to readable format
    function formatTicks(ticks) {
        if (ticks < 1) return `${Math.round(ticks * 10) / 10} ticks`;
        if (ticks === 1) return "1 tick";
        return `${Math.round(ticks * 10) / 10} ticks`;
    }

    // Format a number with commas
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Format date to human-readable format
    function formatDate(date) {
        if (!date) return "";
        const now = new Date();
        const diff = date - now;

        // If less than a day, show relative time
        if (diff < 86400000) {
            // 24 hours in ms
            return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        }

        return date.toLocaleString();
    }

    // Format a resource name using ITEMS definition
    function formatResource(resourceId) {
        // Convert to uppercase for consistency with ITEMS keys
        const upperResourceId = resourceId.toUpperCase();
        
        // If the resource exists in ITEMS, use its defined name
        if (ITEMS[upperResourceId]) {
            return ITEMS[upperResourceId].name;
        }
        
        // Fallback to simple formatting if not found in ITEMS
        return resourceId.charAt(0).toUpperCase() + resourceId.slice(1);
    }

    // Get player's resources - updated to work with simplified item format {item_code: quantity}
    function getPlayerResources() {
        const player = get(currentPlayer);
        if (!player || !player.id) return { resources: {}, isOwner: false };
        
        // Start with an empty resource map
        const resources = {};
        
        // First add resources from player's personal bank at this structure
        if (structureData && structureData.banks && structureData.banks[player.id]) {
            const playerBank = structureData.banks[player.id];
            
            // Check if new format (object with item codes as keys)
            if (!Array.isArray(playerBank) && typeof playerBank === 'object') {
                // Directly use the object format - make a copy to avoid mutations
                Object.entries(playerBank).forEach(([itemCode, quantity]) => {
                    resources[itemCode.toUpperCase()] = (resources[itemCode.toUpperCase()] || 0) + quantity;
                });
            } 
            // Handle legacy format (array of item objects)
            else if (Array.isArray(playerBank)) {
                playerBank.forEach(item => {
                    if (item.type === 'resource') {
                        // Store by ID if available
                        if (item.id) {
                            const upperCaseId = item.id.toUpperCase();
                            resources[upperCaseId] = (resources[upperCaseId] || 0) + (item.quantity || 1);
                        }
                        
                        // Also normalize name as fallback (e.g., "Wood" -> "WOOD")
                        if (item.name) {
                            const normalizedName = item.name.toUpperCase().replace(/ /g, '_');
                            resources[normalizedName] = (resources[normalizedName] || 0) + (item.quantity || 1);
                            
                            // Also add using lowercase name as a fallback
                            const lowerName = item.name.toLowerCase();
                            resources[lowerName] = (resources[lowerName] || 0) + (item.quantity || 1);
                        }
                    }
                });
            }
        }
        
        // Check if player owns the structure to include shared resources
        const isOwner = structureData && structureData.owner === player.id;
        
        // If player is owner, also add resources from shared storage
        if (isOwner && structureData && structureData.items) {
            // Check if new format (object with item codes as keys)
            if (!Array.isArray(structureData.items) && typeof structureData.items === 'object') {
                // Directly use the object format - make a copy to avoid mutations
                Object.entries(structureData.items).forEach(([itemCode, quantity]) => {
                    resources[itemCode.toUpperCase()] = (resources[itemCode.toUpperCase()] || 0) + quantity;
                });
            }
            // Handle legacy format (array of item objects)
            else if (Array.isArray(structureData.items)) {
                structureData.items.forEach(item => {
                    if (item.type === 'resource') {
                        // Store by ID if available
                        if (item.id) {
                            const upperCaseId = item.id.toUpperCase();
                            resources[upperCaseId] = (resources[upperCaseId] || 0) + (item.quantity || 1);
                        }
                        
                        // Also normalize name as fallback
                        if (item.name) {
                            const normalizedName = item.name.toUpperCase().replace(/ /g, '_');
                            resources[normalizedName] = (resources[normalizedName] || 0) + (item.quantity || 1);
                            
                            // Also add using lowercase name as a fallback
                            const lowerName = item.name.toLowerCase();
                            resources[lowerName] = (resources[lowerName] || 0) + (item.quantity || 1);
                        }
                    }
                });
            }
        }
        
        return {
            resources,
            isOwner
        };
    }
    
    // Get detailed resource breakdown showing sources
    function getResourceBreakdown(resourceKey) {
        const player = get(currentPlayer);
        if (!player || !player.id) return { personal: 0, shared: 0, total: 0, isOwner: false };
        
        // Normalize resource key
        const upperResourceKey = resourceKey.toUpperCase();
        let personalAmount = 0;
        let sharedAmount = 0;
        
        // Check player's personal bank - supports new format
        if (structureData?.banks?.[player.id]) {
            const playerBank = structureData.banks[player.id];
            
            // Check if new format (object with item codes as keys)
            if (!Array.isArray(playerBank) && typeof playerBank === 'object') {
                // Direct lookup in object format
                personalAmount += playerBank[upperResourceKey] || 0;
            }
            // Handle legacy format (array of item objects)
            else if (Array.isArray(playerBank)) {
                playerBank.forEach(item => {
                    if (item.type === 'resource') {
                        const matchesId = item.id && item.id.toUpperCase() === upperResourceKey;
                        const matchesName = item.name && item.name.toUpperCase().replace(/ /g, '_') === upperResourceKey;
                        
                        if (matchesId || matchesName) {
                            personalAmount += item.quantity || 1;
                        }
                    }
                });
            }
        }
        
        // Check shared storage if player is owner
        const isOwner = structureData && structureData.owner === player.id;
        if (isOwner && structureData?.items) {
            // Check if new format (object with item codes as keys)
            if (!Array.isArray(structureData.items) && typeof structureData.items === 'object') {
                // Direct lookup in object format
                sharedAmount += structureData.items[upperResourceKey] || 0;
            }
            // Handle legacy format (array of item objects)
            else if (Array.isArray(structureData.items)) {
                structureData.items.forEach(item => {
                    if (item.type === 'resource') {
                        const matchesId = item.id && item.id.toUpperCase() === upperResourceKey;
                        const matchesName = item.name && item.name.toUpperCase().replace(/ /g, '_') === upperResourceKey;
                        
                        if (matchesId || matchesName) {
                            sharedAmount += item.quantity || 1;
                        }
                    }
                });
            }
        }
        
        return {
            personal: personalAmount,
            shared: sharedAmount,
            total: personalAmount + sharedAmount,
            isOwner
        };
    }

    // Check if player has enough resources - update to handle resource ID matching
    function hasEnoughResources() {
        if (!selectedUnit) return false;

        const { resources } = getPlayerResources();
        const totalCost = calculateTotalCost();

        for (const [resourceId, amount] of Object.entries(totalCost)) {
            // Try different formats of the resource ID/name
            const normalizedId = resourceId.toUpperCase();
            const normalizedName = ITEMS[normalizedId]?.name.toUpperCase().replace(/ /g, '_') || '';
            const lowerName = ITEMS[normalizedId]?.name.toLowerCase() || '';
            
            // Check all possible ways this resource might be stored
            const availableAmount = 
                resources[normalizedId] || 
                resources[normalizedName] || 
                resources[lowerName] || 
                0;
                
            if (availableAmount < amount) return false;
        }

        return true;
    }

    // Start recruitment - updated to include resource deduction info in UI feedback
    async function startRecruitment() {
        if (!selectedUnit) {
            error = "No unit type selected";
            return;
        }

        if (quantity < 1) {
            error = "Quantity must be at least 1";
            return;
        }

        if (!hasEnoughResources()) {
            error = "Not enough resources";
            return;
        }

        if (queue.length >= maxUnits) {
            error = "Recruitment queue is full";
            return;
        }

        try {
            isLoading = true;
            error = null;

            const result = await apiPost('/actions/recruitUnits', {
                structureId: structureData.id,
                x,
                y,
                worldId: get(game).worldKey,
                unitType: selectedUnit.id,
                quantity: quantity,
                cost: calculateTotalCost(),
            });

            console.log("Recruitment started:", result);

            // Show more detailed success message if resources were used from both storages
            if (result.resourceDeduction) {
                const { personal, shared } = result.resourceDeduction;
                const usedPersonal = Object.keys(personal).length > 0;
                const usedShared = Object.keys(shared).length > 0;
                
                if (usedPersonal && usedShared) {
                    success = `Started recruiting ${quantity} ${selectedUnit.name} units using resources from personal and shared storage`;
                } else {
                    success = `Started recruiting ${quantity} ${selectedUnit.name} units`;
                }
            } else {
                success = `Started recruiting ${quantity} ${selectedUnit.name} units`;
            }

            // Refresh queue from the result
            if (result.queue) {
                queue = Object.values(result.queue).sort(
                    (a, b) => (a.startedAt || 0) - (b.startedAt || 0),
                );
            }

            // Trigger the achievement callback
            onRecruitStart(result);
        } catch (err) {
            console.error("Error starting recruitment:", err);
            error = err.message || "Failed to start recruitment";
        } finally {
            isLoading = false;
        }
    }

    // Cancel a recruitment item
    async function cancelRecruitment(recruitmentId) {
        try {
            isLoading = true;
            error = null;

            await apiPost('/actions/cancelRecruitment', {
                recruitmentId,
                structureId: structureData.id,
                x,
                y,
                worldId: get(game).worldKey,
            });

            // Remove from local queue
            queue = queue.filter((item) => item.id !== recruitmentId);
            success = "Recruitment cancelled";
        } catch (err) {
            console.error("Error cancelling recruitment:", err);
            error = err.message || "Failed to cancel recruitment";
        } finally {
            isLoading = false;
        }
    }

    // Get progress percentage for a queue item
    function getProgressPercentage(item) {
        if (!item || !item.startedAt || !item.completesAt) return 0;

        const now = Date.now();
        const total = item.completesAt - item.startedAt;
        const elapsed = now - item.startedAt;

        if (elapsed >= total) return 100;
        return Math.floor((elapsed / total) * 100);
    }

    // Initialize
    onMount(() => {
        // Refresh queue on interval
        const interval = setInterval(() => {
            // Force update of progress calculations
            queue = [...queue];
        }, 1000);

        return () => clearInterval(interval);
    });
</script>

<div class="recruitment-modal">
    <div class="modal-content">
        <!-- Queue section -->
        <div class="section queue-section">
            <h4>
                Recruitment Queue
                <span class="entity-count">{queue.length}/{maxUnits}</span>
            </h4>

            {#if queue.length === 0}
                <div class="empty-state">
                    No units currently being recruited
                </div>
            {:else}
                <div class="queue-list">
                    {#each queue as item}
                        <div class="queue-item">
                            <div class="queue-item-header">
                                <div class="queue-item-icon">
                                    <!-- Replace conditional icon rendering with Unit component -->
                                    {#if item.unitType}
                                        <Unit unitIconKey={item.unitType} extraClass="unit-icon" />
                                    {/if}
                                </div>
                                <div class="queue-item-info">
                                    <div class="queue-item-name">
                                        {item.unitName || "Unknown Unit"} x{item.quantity}
                                    </div>
                                    <div class="queue-item-time">
                                        Completes: {formatDate(
                                            new Date(item.completesAt),
                                        )}
                                    </div>
                                </div>
                                {#if item.owner === $currentPlayer?.id}
                                    <button
                                        class="cancel-button"
                                        onclick={() =>
                                            cancelRecruitment(item.id)}
                                        disabled={isLoading}
                                    >
                                        ✕
                                    </button>
                                {/if}
                            </div>

                            <div class="progress-bar">
                                <div
                                    class="progress-fill"
                                    style={`width: ${getProgressPercentage(item)}%`}
                                ></div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Recruitment form -->
        <div class="section recruitment-form">
            <h4>Recruit New Units</h4>

            {#if availableUnits.length === 0}
                <div class="empty-state">
                    No units available for recruitment
                </div>
            {:else}
                <div class="form-content">
                    <!-- Unit selection -->
                    <div class="form-group">
                        <div class="unit-select-container">
                            {#each availableUnits as unit}
                                <button
                                    class="unit-option {selectedUnit?.id === unit.id ? 'selected' : ''} {!unit.available ? 'unavailable' : ''}"
                                    onclick={() => selectUnit(unit)}
                                    title={unit.available ? (unit.tooltip || unit.description) : `${unit.description} - ${unit.unavailableReason}`}
                                >
                                    <div class="unit-option-icon">
                                        <!-- Use unit.id (e.g. 'human_warrior') not unit.type -->
                                        <Unit unitIconKey={unit.id} extraClass="unit-icon" />
                                    </div>
                                    <div class="unit-option-info">
                                        <div class="unit-option-name">
                                            {unit.name}
                                            {#if !unit.available}
                                                <span class="locked-icon"><Lock size="0.85em" /></span>
                                            {/if}
                                        </div>
                                        <div class="unit-option-power">
                                            {#if unit.meleeAttack > 0}<span class="stat-chip melee">M·{unit.meleeAttack.toFixed(1)}</span>{/if}{#if unit.rangedAttack > 0}<span class="stat-chip ranged">R·{unit.rangedAttack.toFixed(1)}</span>{/if}{#if unit.magicAttack > 0}<span class="stat-chip magic">Mg·{unit.magicAttack.toFixed(1)}</span>{/if}
                                            {#if unit.tooltip}
                                                <span class="unit-tooltip-hint"><Info size="0.9em" /></span>
                                            {/if}
                                        </div>
                                    </div>
                                </button>
                            {/each}
                        </div>
                    </div>

                    {#if selectedUnit}
                        <!-- Unit details -->
                        <div class="unit-details {!selectedUnit.available ? 'unavailable' : ''}">
                            <h5>{selectedUnit.name}</h5>
                            <p class="unit-description">
                                {selectedUnit.description}
                            </p>
                            
                            <!-- Requirements Section -->
                            <div class="unit-requirements">
                                <h6>Requirements:</h6>
                                <div class="requirements-list">
                                    {#if selectedUnit.requirements.structureLevel}
                                        <div class="requirement-item {structureData.level >= selectedUnit.requirements.structureLevel ? 'met' : 'unmet'}">
                                            <span class="requirement-icon"><Structure size="1em" /></span>
                                            <span class="requirement-text">Structure Level {selectedUnit.requirements.structureLevel}</span>
                                            <span class="requirement-status">{structureData.level >= selectedUnit.requirements.structureLevel ? '✓' : '✗'}</span>
                                        </div>
                                    {/if}

                                    {#if selectedUnit.requirements.race}
                                        <div class="requirement-item {structureData.race === selectedUnit.requirements.race ? 'met' : 'unmet'}">
                                            <span class="requirement-icon"><Structure size="1em" /></span>
                                            <span class="requirement-text">{formatRaceName(selectedUnit.requirements.race)} Structure</span>
                                            <span class="requirement-status">{structureData.race === selectedUnit.requirements.race ? '✓' : '✗'}</span>
                                        </div>
                                    {/if}

                                    {#if selectedUnit.requirements.structureType}
                                        {@const hasCorrectType = selectedUnit.requirements.structureType.includes(structureData.type)}
                                        <div class="requirement-item {hasCorrectType ? 'met' : 'unmet'}">
                                            <span class="requirement-icon"><Structure size="1em" /></span>
                                            <span class="requirement-text">Structure Type: {selectedUnit.requirements.structureType.map(formatStructureTypeName).join(' or ')}</span>
                                            <span class="requirement-status">{hasCorrectType ? '✓' : '✗'}</span>
                                        </div>
                                    {/if}

                                    {#if selectedUnit.requirements.buildingType}
                                        {@const building = (structureData.buildings || {})[selectedUnit.requirements.buildingType]}
                                        {@const requiredLevel = selectedUnit.requirements.buildingLevel || 1}
                                        {@const hasBuilding = building && building.level >= requiredLevel}
                                        <div class="requirement-item {hasBuilding ? 'met' : 'unmet'}">
                                            <span class="requirement-icon"><BuildingIcon type={selectedUnit.requirements.buildingType} size="1em" /></span>
                                            <span class="requirement-text">{formatStructureTypeName(selectedUnit.requirements.buildingType)} (Level {requiredLevel}+)</span>
                                            <span class="requirement-status">{hasBuilding ? '✓' : '✗'}</span>
                                        </div>
                                    {/if}

                                    {#if selectedUnit.requirements.research}
                                        {@const researchCompleted = structureData.research && structureData.research[selectedUnit.requirements.research]}
                                        {@const buildingWithResearch = Object.values(structureData.buildings || {}).some(
                                            b => b.research && b.research[selectedUnit.requirements.research]
                                        )}
                                        {@const hasResearch = researchCompleted || buildingWithResearch}
                                        <div class="requirement-item {hasResearch ? 'met' : 'unmet'}">
                                            <span class="requirement-icon"><BuildingIcon type="academy" size="1em" /></span>
                                            <span class="requirement-text">Research: {formatResearchName(selectedUnit.requirements.research)}</span>
                                            <span class="requirement-status">{hasResearch ? '✓' : '✗'}</span>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                            
                            {#if !selectedUnit.available}
                                <div class="unavailable-reason">
                                    <span class="locked-icon"><Lock size="1em" /></span> {selectedUnit.unavailableReason}
                                </div>
                            {/if}

                            <div class="unit-stats">
                                {#if selectedUnit.meleeAttack > 0}
                                    <div class="unit-stat">
                                        <span class="stat-label">Melee:</span>
                                        <span class="stat-value">{selectedUnit.meleeAttack}</span>
                                    </div>
                                {/if}
                                {#if selectedUnit.rangedAttack > 0}
                                    <div class="unit-stat">
                                        <span class="stat-label">Ranged:</span>
                                        <span class="stat-value">{selectedUnit.rangedAttack}</span>
                                    </div>
                                {/if}
                                {#if selectedUnit.magicAttack > 0}
                                    <div class="unit-stat">
                                        <span class="stat-label">Magic:</span>
                                        <span class="stat-value">{selectedUnit.magicAttack}</span>
                                    </div>
                                {/if}
                                <div class="unit-stat">
                                    <span class="stat-label">Defense:</span>
                                    <span class="stat-value">{selectedUnit.meleeDefense}/{selectedUnit.rangedDefense}/{selectedUnit.magicDefense}</span>
                                </div>
                                <div class="unit-stat">
                                    <span class="stat-label">Time:</span>
                                    <span class="stat-value">{formatTicks(
                                        selectedUnit.timePerUnit,
                                    )} per unit</span>
                                </div>
                            </div>

                            <div class="unit-cost">
                                <h6>Cost per unit:</h6>
                                <div class="cost-items">
                                    {#each Object.entries(selectedUnit.cost) as [resource, amount]}
                                        <div class="cost-item">
                                            {formatResource(resource)}: {amount}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        </div>

                        <!-- Only show quantity selection and recruitment UI if the unit is available -->
                        {#if selectedUnit.available}
                            <!-- Quantity selection -->
                            <div class="form-group">
                                <label for="quantity">Quantity</label>
                                <div class="quantity-control">
                                    <button
                                        class="quantity-button"
                                        onclick={() => (quantity = Math.max(1, quantity - 1))}
                                        disabled={isLoading || quantity <= 1}
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        id="quantity"
                                        bind:value={quantity}
                                        min="1"
                                        max="100"
                                        disabled={isLoading}
                                    />
                                    <button
                                        class="quantity-button"
                                        onclick={() => (quantity = Math.min(100, quantity + 1))}
                                        disabled={isLoading || quantity >= 100}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <!-- Total cost and time -->
                            <div class="totals">
                                <div class="total-section">
                                    <h6>Total Cost:</h6>
                                    <div class="total-items">
                                        {#each Object.entries(calculateTotalCost()) as [resource, amount]}
                                            {@const resourceBreakdown = getResourceBreakdown(resource)}
                                            <div 
                                                class="total-item {resourceBreakdown.total >= amount ? 'sufficient' : 'insufficient'}"
                                                title={`You need ${amount} ${formatResource(resource)}`}>
                                                <span class="resource-name">{formatResource(resource)}:</span>
                                                <span class="resource-amount">
                                                    {#if resourceBreakdown.isOwner && resourceBreakdown.shared > 0}
                                                        <!-- Show detailed breakdown for structure owners with shared resources -->
                                                        <span class="resource-breakdown">
                                                            <span class="personal-amount">{resourceBreakdown.personal}</span>
                                                            <span class="separator">+</span>
                                                            <span class="shared-amount">{resourceBreakdown.shared}</span>
                                                            <span class="separator">=</span>
                                                            <span class="total-amount">{resourceBreakdown.total}</span>
                                                        </span>
                                                        <span class="separator">/</span>
                                                        <span class="needed">{amount}</span>
                                                    {:else}
                                                        <!-- Simple display for non-owners or no shared resources -->
                                                        <span class="current">{resourceBreakdown.total}</span>
                                                        <span class="separator">/</span>
                                                        <span class="needed">{amount}</span>
                                                    {/if}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                    
                                    {#if getPlayerResources().isOwner}
                                        <div class="storage-note">
                                            <span class="note-icon"><Info size="0.9em" /></span>
                                            Resources will be used from both your personal bank and shared storage
                                        </div>
                                    {/if}
                                </div>
                                
                                <div class="total-section">
                                    <h6>Time Required:</h6>
                                    <div class="time-info">
                                        <div>
                                            Production: {formatTicks(
                                                completionInfo?.ticks || 0,
                                            )}
                                        </div>
                                        {#if completionInfo?.queueTicks > 0}
                                            <div>
                                                Queue wait: {formatTicks(
                                                    completionInfo?.queueTicks || 0,
                                                )}
                                            </div>
                                            <div class="completion-estimate">
                                                Estimated completion: {formatDate(
                                                    completionInfo?.date,
                                                )}
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            </div>

                            {#if error}
                                <div class="error-message">{error}</div>
                            {/if}

                            {#if success}
                                <div class="success-message">{success}</div>
                            {/if}

                            <!-- Submit button -->
                            <div class="form-actions">
                                <button
                                    class="recruit-button"
                                    onclick={startRecruitment}
                                    disabled={isLoading || !hasEnoughResources() || queue.length >= maxUnits}
                                >
                                    {isLoading ? "Processing..." : "Start Recruitment"}
                                </button>
                            </div>
                        {/if}
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .recruitment-modal {
        display: flex;
        flex-direction: column;
        flex: 1;
        background: transparent;
        color: var(--color-parchment-100);
        font-family: var(--font-body);
    }

    .modal-content {
        padding: 1rem;
        overflow-y: auto;
        flex: 1;
    }

    .section {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background-color: rgba(176, 141, 74, 0.03);
        border: 0.075em solid rgba(176, 141, 74, 0.18);
    }

    h4 {
        margin: 0 0 1rem 0;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-aged-gold);
        display: flex;
        align-items: center;
        font-family: var(--font-display);
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    .entity-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85em;
        font-weight: 500;
        padding: 0.1em 0.6em;
        margin-left: 0.5rem;
        color: var(--color-parchment-200);
        background: rgba(176, 141, 74, 0.08);
        border: 0.075em solid rgba(176, 141, 74, 0.2);
        font-family: var(--font-mono);
    }

    .empty-state {
        padding: 2rem 0;
        text-align: center;
        color: rgba(232, 228, 210, 0.55);
        font-style: italic;
    }

    .queue-list {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }

    .queue-item {
        padding: 0.8rem;
        background-color: rgba(176, 141, 74, 0.05);
        border: 0.075em solid rgba(176, 141, 74, 0.18);
    }

    .queue-item-header {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        margin-bottom: 0.5rem;
    }

    .queue-item-icon {
        width: 2.5rem;
        height: 2.5rem;
        background-color: rgba(176, 141, 74, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: var(--color-gold-pale);
    }

    :global(.unit-icon) {
        width: 1.5rem;
        height: 1.5rem;
        fill: var(--color-gold-pale);
        color: var(--color-gold-pale);
    }

    .queue-item-info {
        flex-grow: 1;
    }

    .queue-item-name {
        font-weight: 500;
        margin-bottom: 0.2rem;
        color: var(--color-parchment-100);
    }

    .queue-item-time {
        font-size: 0.85rem;
        color: rgba(232, 228, 210, 0.65);
        font-family: var(--font-mono);
    }

    .cancel-button {
        width: 1.8rem;
        height: 1.8rem;
        background-color: rgba(91, 26, 31, 0.15);
        border: 0.075em solid rgba(91, 26, 31, 0.3);
        color: #ff5757;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background-color 0.2s;
    }

    .cancel-button:hover:not(:disabled) {
        background-color: rgba(91, 26, 31, 0.3);
    }

    .progress-bar {
        height: 0.5rem;
        background-color: rgba(176, 141, 74, 0.12);
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background-color: var(--color-aged-gold);
    }

    .unit-select-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        max-height: 16rem;
        overflow-y: auto;
        padding: 0.5rem;
        background-color: rgba(176, 141, 74, 0.03);
        border: 0.075em solid rgba(176, 141, 74, 0.15);
    }

    .unit-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background-color: rgba(176, 141, 74, 0.05);
        border: 0.075em solid rgba(176, 141, 74, 0.18);
        cursor: pointer;
        transition: background-color 0.2s;
        width: calc(50% - 0.25rem);
        text-align: left;
        color: var(--color-parchment-100);
    }

    .unit-option:hover {
        background-color: rgba(176, 141, 74, 0.1);
        border-color: rgba(176, 141, 74, 0.3);
    }

    .unit-option.selected {
        background-color: rgba(176, 141, 74, 0.14);
        border-color: rgba(176, 141, 74, 0.45);
    }

    .unit-option-icon {
        width: 2rem;
        height: 2rem;
        background-color: rgba(176, 141, 74, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: var(--color-gold-pale);
    }

    .unit-option-info {
        flex-grow: 1;
        font-size: 0.85rem;
    }

    .unit-option-name {
        font-weight: 500;
        margin-bottom: 0.2rem;
        color: var(--color-parchment-100);
    }

    .unit-option-power {
        font-size: 0.75rem;
        color: var(--color-parchment-200);
        font-family: var(--font-mono);
        display: flex;
        flex-wrap: wrap;
        gap: 0.2rem;
        align-items: center;
    }

    .stat-chip {
        padding: 0.05em 0.35em;
        border: 0.075em solid rgba(176, 141, 74, 0.2);
        font-size: 0.95em;
    }
    .stat-chip.melee { background: rgba(91, 26, 31, 0.12); border-color: rgba(91, 26, 31, 0.28); }
    .stat-chip.ranged { background: rgba(40, 70, 40, 0.14); border-color: rgba(60, 110, 60, 0.28); }
    .stat-chip.magic { background: rgba(50, 40, 90, 0.18); border-color: rgba(90, 70, 160, 0.3); }

    .unit-details {
        padding: 1rem;
        background-color: rgba(176, 141, 74, 0.05);
        border: 0.075em solid rgba(176, 141, 74, 0.18);
    }

    h5 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-parchment-100);
        font-family: var(--font-display);
        letter-spacing: 0.05em;
    }

    .unit-description {
        margin: 0 0 1rem 0;
        font-size: 0.9rem;
        color: var(--color-parchment-200);
        font-family: var(--font-editorial);
        font-style: italic;
    }

    .unit-stats {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .unit-stat {
        font-size: 0.85rem;
    }

    .stat-label {
        font-weight: 500;
        color: var(--color-parchment-200);
        font-family: var(--font-display);
        letter-spacing: 0.06em;
        font-size: 0.85em;
    }

    .stat-value {
        color: var(--color-parchment-100);
        font-family: var(--font-mono);
    }

    .unit-cost h6,
    .total-section h6 {
        margin: 0 0 0.5rem 0;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-aged-gold);
        font-family: var(--font-display);
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    .cost-items,
    .total-items {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .cost-item,
    .total-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        padding: 0.3rem 0.6rem;
        background-color: rgba(176, 141, 74, 0.08);
        border: 0.075em solid rgba(176, 141, 74, 0.15);
        width: calc(50% - 0.25rem);
        color: var(--color-parchment-200);
    }

    .total-item.sufficient {
        background-color: rgba(63, 90, 78, 0.15);
        border-color: rgba(76, 175, 80, 0.2);
        color: #6fcf79;
    }

    .total-item.insufficient {
        background-color: rgba(91, 26, 31, 0.15);
        border-color: rgba(91, 26, 31, 0.25);
        color: #ff5757;
    }

    .resource-name {
        font-weight: 500;
    }

    .resource-amount {
        display: inline-flex;
        align-items: center;
        gap: 0.15rem;
        font-weight: 500;
        font-family: var(--font-mono);
    }

    .separator {
        opacity: 0.7;
        margin: 0 0.1rem;
    }

    @media (max-width: 500px) {
        .unit-option, .total-item {
            width: 100%;
        }
    }

    .unit-option.unavailable {
        opacity: 0.75;
        background-color: rgba(176, 141, 74, 0.04);
        border-color: rgba(176, 141, 74, 0.12);
        cursor: help;
    }

    .unit-option.unavailable:hover {
        background-color: rgba(176, 141, 74, 0.08);
    }

    .locked-icon {
        display: inline-flex;
        align-items: center;
        font-size: 0.8em;
        margin-left: 0.3rem;
        color: rgba(232, 228, 210, 0.5);
        vertical-align: middle;
    }

    .unit-details.unavailable {
        background-color: rgba(176, 141, 74, 0.04);
        border-color: rgba(176, 141, 74, 0.12);
    }

    .unavailable-reason {
        margin: 0.5rem 0 1rem;
        padding: 0.5rem;
        background-color: rgba(176, 141, 74, 0.08);
        border: 0.075em solid rgba(176, 141, 74, 0.25);
        color: var(--color-gold-pale);
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .unavailable-reason .locked-icon {
        font-size: 1em;
        color: var(--color-gold-pale);
    }

    .unit-requirements {
        margin-bottom: 1rem;
    }

    .requirements-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .requirement-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        padding: 0.5rem;
        background-color: rgba(176, 141, 74, 0.05);
        border: 0.075em solid rgba(176, 141, 74, 0.15);
        color: var(--color-parchment-200);
    }

    .requirement-item.met {
        background-color: rgba(63, 90, 78, 0.12);
        color: #6fcf79;
        border-color: rgba(76, 175, 80, 0.2);
    }

    .requirement-item.unmet {
        background-color: rgba(91, 26, 31, 0.12);
        color: #ff5757;
        border-color: rgba(91, 26, 31, 0.25);
    }

    .requirement-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.4rem;
        height: 1.4rem;
        flex-shrink: 0;
        color: inherit;
    }

    .requirement-text {
        flex-grow: 1;
    }

    .requirement-status {
        margin-left: auto;
        font-weight: bold;
        font-family: var(--font-mono);
    }

    h6 {
        margin: 0.8rem 0 0.5rem 0;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-aged-gold);
        font-family: var(--font-display);
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: var(--color-parchment-200);
        font-family: var(--font-display);
        font-size: 0.85em;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .quantity-control {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .quantity-button {
        width: 2.5rem;
        height: 2.5rem;
        background-color: rgba(176, 141, 74, 0.08);
        border: 0.075em solid rgba(176, 141, 74, 0.25);
        color: var(--color-parchment-200);
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .quantity-button:hover:not(:disabled) {
        background-color: rgba(176, 141, 74, 0.15);
        border-color: rgba(176, 141, 74, 0.4);
    }

    .quantity-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    input[type="number"] {
        width: 4rem;
        height: 2.5rem;
        text-align: center;
        padding: 0 0.5rem;
        border: 0.075em solid rgba(176, 141, 74, 0.25);
        font-size: 1rem;
        color: var(--color-parchment-100);
        background-color: rgba(26, 32, 48, 0.7);
        font-family: var(--font-mono);
    }

    input[type="number"]:focus {
        outline: none;
        border-color: var(--color-aged-gold);
    }

    .time-info {
        font-size: 0.85rem;
        color: var(--color-parchment-200);
        font-family: var(--font-mono);
    }

    .completion-estimate {
        margin-top: 0.5rem;
        font-weight: 500;
    }

    .error-message {
        margin: 1rem 0;
        padding: 0.8rem;
        background-color: rgba(91, 26, 31, 0.15);
        border: 0.075em solid rgba(91, 26, 31, 0.3);
        color: #ff5757;
        font-weight: 500;
    }

    .success-message {
        margin: 1rem 0;
        padding: 0.8rem;
        background-color: rgba(63, 90, 78, 0.15);
        border: 0.075em solid rgba(76, 175, 80, 0.2);
        color: #6fcf79;
        font-weight: 500;
    }

    .form-actions {
        margin-top: 1.5rem;
        display: flex;
        justify-content: center;
    }

    .recruit-button {
        padding: 0.8rem 2rem;
        background-color: var(--color-aged-gold);
        color: var(--color-ink-900);
        border: none;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
        font-family: var(--font-display);
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    .recruit-button:hover:not(:disabled) {
        background-color: var(--color-gold-pale);
    }

    .recruit-button:disabled {
        background-color: rgba(176, 141, 74, 0.25);
        color: rgba(26, 32, 48, 0.4);
        cursor: not-allowed;
    }

    .unit-tooltip-hint {
        font-size: 0.9em;
        margin-left: 0.3rem;
        opacity: 0.8;
    }

    .unit-option.selected .unit-option-name {
        color: var(--color-gold-pale);
    }

    .resource-breakdown {
        display: inline-flex;
        align-items: center;
        gap: 0.1rem;
        font-family: var(--font-mono);
    }

    .personal-amount {
        color: var(--color-gold-pale);
    }

    .shared-amount {
        color: rgba(232, 228, 210, 0.65);
    }

    .total-amount {
        font-weight: 600;
    }

    .storage-note {
        margin-top: 0.5rem;
        font-size: 0.8rem;
        font-style: italic;
        color: rgba(232, 228, 210, 0.65);
        display: flex;
        align-items: center;
        gap: 0.3rem;
    }

    .note-icon {
        font-size: 1rem;
        opacity: 0.8;
    }
</style>
