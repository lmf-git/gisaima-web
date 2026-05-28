<script>
  import { onDestroy } from 'svelte';
  
  import { currentPlayer } from '../../../lib/stores/game.js';
  import { targetStore } from '../../../lib/stores/map.js';

  import Logo from '../../Logo.svelte';

  import Close from '../../icons/Close.svelte';
  import Eye from '../../icons/Eye.svelte';
  import Rally from '../../icons/Rally.svelte';
  import Compass from '../../icons/Compass.svelte';
  import Sword from '../../icons/Sword.svelte';
  import Hammer from '../../icons/Hammer.svelte';
  import Crop from '../../icons/Crop.svelte';
  import Structure from '../../icons/Structure.svelte';
  import Info from '../../icons/Info.svelte';
  import Horn from '../../icons/Horn.svelte';
  
  

  // Define props with simplified approach
  const {
    onClose = (() => {}),
    onAction = (() => {}),
    onShowDetails = (() => {}),
    isOpen = false
  } = $props();
  
  // Access current tile data for action display
  const currentTileData = $derived($targetStore);

  // Check functions for action availability - similar to Details.svelte
  function canMobilize() {
    if (!currentTileData || !$currentPlayer) return false;
    
    // Check if player is on the tile
    const playerOnTile = currentTileData.players?.some(p => p.id === $currentPlayer.id);
    
    // Check if player is not already in a mobilizing/demobilising group
    const inProcessGroup = currentTileData.groups?.some(g => 
      (g.status === 'mobilizing' || g.status === 'demobilising') && 
      g.owner === $currentPlayer.id
    );
    
    return playerOnTile && !inProcessGroup;
  }
  
  function canDemobilize() {
    if (!currentTileData || !$currentPlayer || !currentTileData.structure) return false;
    
    // Check if there are any player-owned groups that are idle
    return currentTileData.groups?.some(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
  }
  
  // Add canBuild function to check for player-owned idle groups
  function canBuild() {
    if (!currentTileData || !$currentPlayer) return false;
    
    // Can only build if player has at least one idle group on the tile
    return !currentTileData?.structure && currentTileData.groups?.some(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
  }
  
  function canMove() {
    if (!currentTileData || !$currentPlayer) return false;
    
    // Check if there are any player-owned groups that are idle
    return currentTileData.groups?.some(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
  }
  
  function canAttack() {
    if (!currentTileData || !$currentPlayer) return false;
    
    // Check if there are any player-owned groups that are idle
    const playerGroups = currentTileData.groups?.filter(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
    
    // Check if there are any enemy groups on the tile
    // Now includes idle, gathering, building, and moving status
    const enemyGroups = currentTileData.groups?.filter(g => 
      g.owner !== $currentPlayer.id && 
      (g.status === 'idle' || g.status === 'gathering' || g.status === 'building' || g.status === 'moving')
    );
    
    // Can attack if player has at least one group and there's at least one enemy group
    return playerGroups?.length > 0 && enemyGroups?.length > 0;
  }
  
  function canGather() {
    if (!currentTileData || !$currentPlayer) return false;
    
    // Check if player is in an idle group
    const playerInIdleGroup = currentTileData.groups?.some(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
    
    // Can gather if player is in an idle group
    return playerInIdleGroup;
  }
  
  function canJoinBattle() {
    if (!currentTileData || !$currentPlayer) return false;
    
    // Check if there's battle and player has idle groups
    return currentTileData.battles?.length > 0 &&
           currentTileData.groups?.some(g => 
             g.owner === $currentPlayer.id && 
             g.status === 'idle'
           );
  }

  function canCraft() {
    if (!currentTileData || !$currentPlayer) return false;
    
    // Check if player is at a structure
    const hasStructure = !!currentTileData.structure;
    const playerOnTile = currentTileData.players?.some(p => p.id === $currentPlayer.id);
    
    // Check if player is in an idle group
    const playerInIdleGroup = currentTileData.groups?.some(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
    
    // Can craft if player is at a structure OR in an idle group
    return (hasStructure && playerOnTile) || playerInIdleGroup;
  }

  // Add function to check if recruitment is possible
  function canRecruit() {
    if (!currentTileData || !$currentPlayer || !currentTileData.structure) return false;
    
    // Player must be on tile as an entity
    const playerOnTile = currentTileData.players?.some(p => p.id === $currentPlayer.id);
    
    // Check if player is in ANY group (not just mobilizing/demobilizing)
    const isInAnyGroup = currentTileData.groups?.some(g => 
      g.owner === $currentPlayer.id || 
      (g.members && g.members[$currentPlayer.id]) ||
      (g.memberIds && Array.isArray(g.memberIds) && g.memberIds.includes($currentPlayer.id))
    );
    
    // Check if player is on tile but not in any group
    return playerOnTile && !isInAnyGroup;
  }

  // Define all possible actions
  const allActions = [
    { id: 'details', label: 'Details', icon: Info, condition: () => true }, // Always show details
    { id: 'inspect', label: 'Inspect', icon: Eye, condition: () => currentTileData?.structure },
    { id: 'build', label: 'Build', icon: Hammer, condition: canBuild },
    { id: 'craft', label: 'Craft', icon: Hammer, condition: canCraft },
    { id: 'move', label: 'Move', icon: Compass, condition: canMove },
    { id: 'mobilise', label: 'Mobilise', icon: Rally, condition: canMobilize },
    { id: 'gather', label: 'Gather', icon: Crop, condition: canGather },
    { id: 'attack', label: 'Attack', icon: Sword, condition: canAttack },
    { id: 'demobilise', label: 'Demobilise', icon: Structure, condition: canDemobilize },
    { id: 'joinBattle', label: 'Join Battle', icon: Sword, condition: canJoinBattle },
    // Change Rally to Horn for the Recruit action
    { id: 'recruitment', label: 'Recruit', icon: Horn, condition: canRecruit }
  ];

  // Filter actions based on conditions
  const availableActions = $derived(
    currentTileData 
      ? allActions.filter(action => action.condition())
      : [allActions[0]] // Always show at least the details button
  );

  // Include close button as part of the circle
  const totalItems = $derived(availableActions.length + 1); // +1 for close button
  
  // Calculate positions in a circle for each action
  function calculatePosition(index, total) {
    const radius = 6; // em units
    const angleStep = (2 * Math.PI) / total;
    const angle = index * angleStep - Math.PI / 2; // Start from top (-90 degrees)
    
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  }
  
  // Calculate close button position
  const closePosition = $derived(calculatePosition(availableActions.length, totalItems));

  // Create a combined array with all items including the close button for animation sequencing
  const allItems = $derived([
    ...availableActions.map((action, index) => ({
      type: 'action',
      action,
      position: calculatePosition(index, totalItems),
      index
    })),
    {
      type: 'close',
      position: closePosition,
      index: availableActions.length
    }
  ]);

  function handleActionClick(actionId, event) {
    // Prevent event from bubbling to parent elements
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // Special handling for details action
    if (actionId === 'details') {
      handleShowDetails(event);
      return;
    }
    
    // Special handling for inspect action to include tile data
    if (actionId === 'inspect' && currentTileData) {
      onAction(actionId, {
        x: currentTileData.x,
        y: currentTileData.y,
        tile: currentTileData
      });
      return;
    }
    
    onAction(actionId);
  }
  
  function handleShowDetails(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    onShowDetails();
    onClose(); // Also close the peek view
  }

  // VISIBILITY MANAGEMENT
  let isExiting = $state(false);
  let isVisible = $state(false);
  let isFullyOpen = $state(false); // true once the opening animation completes
  let exitTimeout;

  // Track which buttons are currently visible
  let visibleButtons = $state([]);

  // Simple handler for the close button - calls parent's onClose
  function handleClose() {
    // Simply call the parent's onClose handler
    // This will set isOpen to false, which will trigger our effect
    onClose();
  }

  // Watch isOpen prop changes to trigger animations
  $effect(() => {
    if (isOpen && !isVisible && !isExiting) {
      // Set component as visible immediately but start with no buttons
      isVisible = true;
      isFullyOpen = false;
      visibleButtons = [];

      // Add buttons one by one with staggered animation
      const showInterval = 80; // Same interval as removal for consistency

      // First add all action buttons in sequence
      for (let i = 0; i < totalItems - 1; i++) {
        setTimeout(() => {
          visibleButtons = [...visibleButtons, i];
        }, i * showInterval);
      }

      // Add the close button last, then mark as fully open
      setTimeout(() => {
        visibleButtons = [...Array(totalItems).keys()];
        isFullyOpen = true;
      }, (totalItems - 1) * showInterval);

    } else if (!isOpen && isVisible && !isExiting) {
      // Start closing animation
      isFullyOpen = false;
      isExiting = true;

      // Remove buttons in REVERSE sequence (last to first)
      let currentButtons = [...visibleButtons];
      const removeInterval = 80; // Time between button removals (ms)

      // Schedule removal of each action button in REVERSE order
      // Start from highest index (totalItems - 2) down to 0
      // We exclude the close button (totalItems - 1) which is removed separately
      for (let i = totalItems - 2; i >= 0; i--) {
        setTimeout(() => {
          if (currentButtons.includes(i)) {
            currentButtons = currentButtons.filter(btn => btn !== i);
            visibleButtons = currentButtons;
          }
        }, (totalItems - 2 - i) * removeInterval);
      }

      // Remove the close button last
      setTimeout(() => {
        visibleButtons = [];

        // Finally, hide the entire component
        setTimeout(() => {
          isVisible = false;
          isExiting = false;
        }, 100);
      }, (totalItems - 1) * removeInterval);
    }
  });

  // When available actions change while peek is fully open, show all current buttons
  $effect(() => {
    if (isFullyOpen && isOpen && isVisible && !isExiting) {
      visibleButtons = [...Array(totalItems).keys()];
    }
  });

  // Clean up on component destroy
  onDestroy(() => {
    if (exitTimeout) clearTimeout(exitTimeout);
  });
</script>

{#if isVisible}
  {@const R = 130}
  {@const r = 50}
  {@const N = availableActions.length || 1}
  {@const size = (R + 14) * 2}
  {@const center = R + 14}
  <div class="peek-container" class:exiting={isExiting} role="dialog" aria-label="Quick actions">
    <svg
      width={size}
      height={size}
      viewBox="0 0 {size} {size}"
      class="wheel"
      aria-hidden="false"
    >
      <!-- Outer ink ring -->
      <circle cx={center} cy={center} r={R + 1} fill="rgba(14,19,32,.65)" stroke="rgba(251,246,231,.6)" stroke-width="0.6" />

      <!-- Sectors -->
      {#each availableActions as action, i}
        {@const sectorVisible = visibleButtons.includes(i)}
        {@const a1 = (i / N) * Math.PI * 2 - Math.PI / 2 - Math.PI / N}
        {@const a2 = a1 + (Math.PI * 2) / N}
        {@const inset = 0.018}
        {@const p1x = center + Math.cos(a1 + inset) * R}
        {@const p1y = center + Math.sin(a1 + inset) * R}
        {@const p2x = center + Math.cos(a2 - inset) * R}
        {@const p2y = center + Math.sin(a2 - inset) * R}
        {@const p3x = center + Math.cos(a2 - inset) * r}
        {@const p3y = center + Math.sin(a2 - inset) * r}
        {@const p4x = center + Math.cos(a1 + inset) * r}
        {@const p4y = center + Math.sin(a1 + inset) * r}
        {@const largeArc = (a2 - a1) > Math.PI ? 1 : 0}
        {@const sectorPath = `M${p1x} ${p1y} A${R} ${R} 0 ${largeArc} 1 ${p2x} ${p2y} L${p3x} ${p3y} A${r} ${r} 0 ${largeArc} 0 ${p4x} ${p4y} Z`}
        {@const mid = (a1 + a2) / 2}
        {@const ix = center + Math.cos(mid) * ((R + r) / 2)}
        {@const iy = center + Math.sin(mid) * ((R + r) / 2)}
        <g class="sector" class:visible={sectorVisible} style="--i: {i}">
          <path
            d={sectorPath}
            class="sector-fill"
            onclick={(e) => handleActionClick(action.id, e)}
            onpointerdown={(e) => e.preventDefault()}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActionClick(action.id, e); } }}
            role="button"
            aria-label={action.label}
            tabindex="0"
          />
          <foreignObject x={ix - 12} y={iy - 22} width="24" height="24" pointer-events="none">
            <div xmlns="http://www.w3.org/1999/xhtml" class="sector-icon">
              {#if action.icon}
                <action.icon extraClass="wheel-icon" />
              {/if}
            </div>
          </foreignObject>
          <text x={ix} y={iy + 16} text-anchor="middle" class="sector-label" pointer-events="none">{action.label.toUpperCase()}</text>
        </g>
      {/each}

      <!-- Center hub: close button on parchment fill -->
      <circle cx={center} cy={center} r={r - 2} fill="#cac281" stroke="rgba(14,19,32,.55)" stroke-width="0.9" />
      <circle
        cx={center}
        cy={center}
        r={r - 4}
        class="center-hub"
        onclick={handleClose}
        onpointerdown={(e) => e.preventDefault()}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); handleClose(); } }}
        role="button"
        aria-label="Close action wheel"
        tabindex="0"
      />
      <text x={center} y={center - 4} text-anchor="middle" class="center-tag" pointer-events="none">CLOSE</text>
      <text x={center} y={center + 12} text-anchor="middle" class="center-coord" pointer-events="none">
        {currentTileData ? `${currentTileData.x} | ${currentTileData.y}` : ''}
      </text>
    </svg>
  </div>
{/if}

<style>
  /* Radial action wheel — six-segment ink-on-parchment pie, replaces the
     floating-button cluster. Sectors are SVG paths; icons live in
     foreignObject and inherit the per-action accent colour. */
  .peek-container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(1);
    z-index: 800;
    pointer-events: none;
    filter: drop-shadow(0 1em 2em rgba(0, 0, 0, 0.45));
    transition: transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .peek-container.exiting {
    transform: translate(-50%, -50%) scale(0.85);
    opacity: 0.4;
  }

  .wheel { display: block; pointer-events: none; overflow: visible; }

  .sector { opacity: 0; transition: opacity 0.18s ease; pointer-events: none; }
  .sector.visible { opacity: 1; pointer-events: auto; }

  .sector-fill {
    fill: rgba(251, 246, 231, 0.92);
    stroke: rgba(14, 19, 32, 0.6);
    stroke-width: 0.8;
    cursor: pointer;
    transition: fill 0.15s ease, stroke 0.15s ease;
  }
  .sector-fill:hover {
    fill: rgba(176, 141, 74, 0.9);
    stroke: var(--color-ink-900, #1a2030);
  }
  .sector-fill:focus-visible {
    outline: none;
    fill: rgba(176, 141, 74, 0.85);
  }

  .sector-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-ink-900);
  }
  .peek-container :global(.wheel-icon) {
    width: 22px;
    height: 22px;
    fill: var(--color-ink-900, #1a2030);
    stroke: var(--color-ink-900, #1a2030);
  }
  .sector-fill:hover ~ foreignObject .sector-icon,
  .sector-fill:hover ~ foreignObject :global(.wheel-icon) {
    color: var(--color-parchment-100, #fbf6e7);
    fill: var(--color-parchment-100, #fbf6e7);
    stroke: var(--color-parchment-100, #fbf6e7);
  }

  .sector-label {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 10px;
    letter-spacing: 0.12em;
    font-weight: 600;
    fill: var(--color-ink-900, #1a2030);
  }

  .center-hub {
    fill: transparent;
    cursor: pointer;
    pointer-events: auto;
  }
  .center-hub:focus {
    outline: none;
  }
  .center-tag {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.2em;
    fill: var(--color-ink-900, #1a2030);
  }
  .center-coord {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    fill: var(--color-wax-red, #5b1a1f);
  }
</style>
