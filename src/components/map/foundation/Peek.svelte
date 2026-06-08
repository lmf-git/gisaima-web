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
    const playerOnTile = currentTileData.players?.some(p => p.uid === $currentPlayer.id);
    
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
    const playerOnTile = currentTileData.players?.some(p => p.uid === $currentPlayer.id);
    
    // Check if player is in an idle group
    const playerInIdleGroup = currentTileData.groups?.some(g => 
      g.owner === $currentPlayer.id && 
      g.status === 'idle'
    );
    
    // Can craft if player is at a structure OR in an idle group
    return (hasStructure && playerOnTile) || playerInIdleGroup;
  }

  // Research is available at a structure that hosts an Academy building, when the
  // player is present (on the tile or in an idle group there).
  function canResearch() {
    if (!currentTileData?.structure || !$currentPlayer) return false;
    const hasAcademy = Object.values(currentTileData.structure.buildings || {})
      .some(b => b?.type === 'academy');
    if (!hasAcademy) return false;
    const playerOnTile = currentTileData.players?.some(p => p.uid === $currentPlayer.id);
    const playerInIdleGroup = currentTileData.groups?.some(g =>
      g.owner === $currentPlayer.id && g.status === 'idle');
    return playerOnTile || playerInIdleGroup;
  }

  // Add function to check if recruitment is possible
  function canRecruit() {
    if (!currentTileData || !$currentPlayer || !currentTileData.structure) return false;
    
    // Player must be on tile as an entity
    const playerOnTile = currentTileData.players?.some(p => p.uid === $currentPlayer.id);
    
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
    { id: 'research', label: 'Research', icon: Info, condition: canResearch },
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
  let isEntering = $state(false); // true for the first frame so the container can transition in from collapsed
  let isFullyOpen = $state(false); // true once the opening animation completes
  let exitTimeout;
  let enterFrame;

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
      // Mount in a collapsed state, then flip to the open state on the next
      // frame so the container's scale/opacity transition actually plays
      // (a value set in the same frame it mounts wouldn't animate).
      isVisible = true;
      isEntering = true;
      isFullyOpen = false;
      visibleButtons = [];

      if (enterFrame) cancelAnimationFrame(enterFrame);
      enterFrame = requestAnimationFrame(() => {
        enterFrame = requestAnimationFrame(() => {
          isEntering = false;
        });
      });

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
      // Start closing animation. Rather than removing sectors one-by-one in
      // JS (which left their backgrounds lingering at partial opacity), the
      // `.exiting` class drives a single coordinated CSS collapse — every
      // sector scales back into the hub and fades fully, with a brief reverse
      // stagger keyed off --i. We just unmount once that animation is done.
      isFullyOpen = false;
      isExiting = true;

      if (exitTimeout) clearTimeout(exitTimeout);
      exitTimeout = setTimeout(() => {
        isVisible = false;
        isExiting = false;
        visibleButtons = [];
      }, 360);
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
    if (enterFrame) cancelAnimationFrame(enterFrame);
  });
</script>

{#if isVisible}
  {@const R = 130}
  {@const r = 50}
  {@const N = availableActions.length || 1}
  {@const size = (R + 14) * 2}
  {@const center = R + 14}
  <div class="peek-container" class:entering={isEntering} class:exiting={isExiting} role="dialog" aria-label="Quick actions">
    <svg
      width={size}
      height={size}
      viewBox="0 0 {size} {size}"
      class="wheel"
      aria-hidden="false"
    >
      <!-- Outer ink ring -->
      <circle cx={center} cy={center} r={R + 1} class="outer-ring" stroke-width="0.6" />

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
        <g class="sector" class:visible={sectorVisible} style="--i: {i}; --total: {N}; transform-origin: {center}px {center}px;">
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
      <circle cx={center} cy={center} r={r - 2} class="hub-bg" stroke-width="0.9" />
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
    opacity: 1;
    z-index: 800;
    pointer-events: none;
    filter: drop-shadow(0 1em 2em rgba(0, 0, 0, 0.45));
    transition: transform 0.26s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                opacity 0.22s ease;
  }
  /* Reveal: the whole wheel (ring + hub + sectors) scales up out of the
     centre instead of popping in at full size. */
  .peek-container.entering {
    transform: translate(-50%, -50%) scale(0.55);
    opacity: 0;
  }
  /* Retract: collapse back toward the centre and fade on close. */
  .peek-container.exiting {
    transform: translate(-50%, -50%) scale(0.55);
    opacity: 0;
    transition: transform 0.24s cubic-bezier(0.4, 0, 1, 1),
                opacity 0.2s ease;
  }

  .wheel { display: block; pointer-events: none; overflow: visible; }

  /* Sectors grow out of / collapse into the hub via scale, not just opacity,
     so closing reads as a clean retraction instead of fading spokes. */
  .sector {
    opacity: 0;
    transform: scale(0.45);
    transform-box: view-box;
    transition: opacity 0.18s ease,
                transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none;
  }
  .sector.visible {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
  /* Coordinated exit: every sector retracts toward the hub with a short
     reverse stagger (outer/last-shown leaves first). Higher specificity than
     `.sector.visible` so it wins even while .visible is still set. */
  .peek-container.exiting .sector {
    opacity: 0;
    transform: scale(0.45);
    transition: opacity 0.16s ease,
                transform 0.2s cubic-bezier(0.4, 0, 1, 1);
    transition-delay: calc((var(--total) - var(--i)) * 0.028s);
  }

  .outer-ring {
    fill: var(--chrome-bg);
    stroke: var(--chrome-border-strong);
  }

  .hub-bg {
    fill: var(--chrome-gold-soft);
    stroke: var(--chrome-border-strong);
  }

  .sector-fill {
    fill: var(--chrome-panel-a);
    stroke: var(--chrome-border-strong);
    stroke-width: 0.8;
    cursor: pointer;
    transition: fill 0.15s ease, stroke 0.15s ease;
  }
  .sector-fill:hover {
    fill: var(--chrome-gold);
    stroke: var(--chrome-border-strong);
  }
  .sector-fill:focus-visible {
    outline: none;
    fill: var(--chrome-gold-soft);
  }

  .sector-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--chrome-text);
  }
  .peek-container :global(.wheel-icon) {
    width: 22px;
    height: 22px;
    fill: var(--chrome-text);
    stroke: var(--chrome-text);
  }
  .sector-fill:hover ~ foreignObject .sector-icon,
  .sector-fill:hover ~ foreignObject :global(.wheel-icon) {
    color: var(--chrome-bg);
    fill: var(--chrome-bg);
    stroke: var(--chrome-bg);
  }

  .sector-label {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 10px;
    letter-spacing: 0.12em;
    font-weight: 600;
    fill: var(--chrome-text);
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
    fill: var(--chrome-text);
  }
  .center-coord {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    fill: var(--color-wax-red);
  }
</style>
