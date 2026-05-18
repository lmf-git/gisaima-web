<script>
  import { onMount, onDestroy } from 'svelte';
  import {  timeUntilNextTick, worldInfo } from '../../../lib/stores/game.js';
  
  // Optional props with defaults
  const { 
    extraClass = '',
    showLabel = true,
    compact = false
  } = $props();
  
  // Local state variables
  let isPending = $state(false);
  let secondsRemaining = $state(0);
  let updateCounter = $state(0); // Forces reactivity on interval
  let intervalId;
  let previousLastTick = $state(null); // Track previous lastTick to detect changes
  let tickChangeTimestamp = $state(null); // Track when tick was last changed
  let graceTimeMs = 5000; // Grace period after tick change before showing pending again
  
  // Calculate if tick is pending
  function updateTickState() {
    if (!$worldInfo || !$worldInfo.lastTick) return;
    
    const now = Date.now();
    const lastTick = $worldInfo.lastTick || now;
    const worldSpeed = $worldInfo.speed || 1;
    
    // Check if lastTick has changed - if so, reset pending state and record timestamp
    if (previousLastTick !== lastTick) {
      isPending = false;
      previousLastTick = lastTick;
      tickChangeTimestamp = now;
    }
    
    // Base tick interval (1 minute) adjusted for world speed
    const baseTickInterval = 60000;
    const adjustedInterval = Math.round(baseTickInterval / worldSpeed);
    
    // Time since last tick
    const timeSinceLastTick = now - lastTick;
    
    // Time since tick change
    const timeSinceTickChange = tickChangeTimestamp ? (now - tickChangeTimestamp) : 60000;
    
    // Only set to pending if:
    // 1. Last tick was more than 60 seconds ago
    // 2. We're past the grace period after a tick change
    if (timeSinceLastTick > 60000 && timeSinceTickChange > graceTimeMs) {
      isPending = true;
    }
    
    // Calculate seconds for next expected tick
    const expectedNextTick = lastTick + adjustedInterval;
    const timeRemaining = expectedNextTick - now;
    secondsRemaining = Math.max(0, Math.ceil(timeRemaining / 1000));
  }
  
  // Format time for display
  function formatTimeDisplay() {
    if (!$worldInfo || !$worldInfo.lastTick) return "Unknown";
    
    updateCounter; // Keep reactive dependency on the counter
    
    const now = Date.now();
    const lastTick = $worldInfo.lastTick || now;
    const worldSpeed = $worldInfo.speed || 1;
    
    // Check if we're in pending state
    if (isPending) return;
    
    // If we're within a minute, show seconds countdown
    const baseTickInterval = 60000; 
    const adjustedInterval = Math.round(baseTickInterval / worldSpeed);
    const expectedNextTick = lastTick + adjustedInterval;
    const timeRemaining = expectedNextTick - now;
    
    if (timeRemaining <= 60000) {
      return `${Math.max(0, Math.ceil(timeRemaining / 1000))}s`;
    }
    
    // Otherwise use the store's formatted time
    return $timeUntilNextTick;
  }
  
  // Set up interval timer to update every second
  onMount(() => {
    // Initialize previousLastTick and tickChangeTimestamp
    if ($worldInfo && $worldInfo.lastTick) {
      previousLastTick = $worldInfo.lastTick || Date.now();
      tickChangeTimestamp = Date.now();
    }

    updateTickState(); // Initial update
    intervalId = setInterval(() => {
      updateTickState();
      updateCounter++; // Force reactivity
    }, 1000);
  });
  
  // Clean up interval on component destruction
  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
  
  // Add effect to track changes in lastTick
  $effect(() => {
    if ($worldInfo && $worldInfo.lastTick) {
      const currentLastTick = $worldInfo.lastTick;
      const now = Date.now();
      
      // If lastTick has changed, we've received a new tick
      if (previousLastTick && currentLastTick !== previousLastTick) {
        // Reset pending state and record the time when tick changed
        isPending = false;
        tickChangeTimestamp = now;
      }
      
      previousLastTick = currentLastTick;
    }
  });
</script>

<div class="next-tick-container {extraClass}" class:compact={compact} class:pending={isPending} class:animated={extraClass.includes('control-button-like')}>
  {#if showLabel}
    <span class="next-tick-label">Next tick:</span>
  {/if}
  
  <span class="next-tick-time">
    {#if isPending}
      <span class="spinner"></span>
    {:else}
      {formatTimeDisplay()}
    {/if}
  </span>
  
  {#if !compact && $worldInfo?.speed && $worldInfo.speed !== 1.0}
    <span class="speed-indicator">
      {$worldInfo.speed}x
    </span>
  {/if}
</div>

<style>
  .next-tick-container {
    display: flex;
    align-items: center;
    gap: 0.5em;
    background-color: rgba(176, 141, 74, 0.12);
    border-radius: 0;
    padding: 0.3em 0.7em;
    color: var(--color-gold-pale, #d4b170);
    font-family: var(--font-mono);
    backdrop-filter: blur(0.4em);
    -webkit-backdrop-filter: blur(0.4em);
    border: 0.075em solid rgba(176, 141, 74, 0.4);
    box-shadow: 0 0.15em 0.5em rgba(0, 0, 0, 0.2);
    transition: background-color 0.3s, box-shadow 0.3s;
    min-width: 5em;
  }
  
  /* Add animation for control-button-like styling */
  .next-tick-container.animated {
    opacity: 0;
    transform: translateY(-1em);
    animation: fadeInButton 0.7s ease-out 0.5s forwards;
  }
  
  @keyframes fadeInButton {
    0% {
      opacity: 0;
      transform: translateY(-1em);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .next-tick-container.compact {
    padding: 0.25em 0.5em;
    min-width: 3em;
  }

  .next-tick-container.pending {
    background-color: rgba(176, 141, 74, 0.3);
    border-color: var(--color-gold-pale, #d4b170);
    animation: pulse 1.5s infinite alternate;
  }

  .next-tick-container.animated.pending {
    animation: fadeInButton 0.7s ease-out 0.5s forwards, pulse 1.5s 1.2s infinite alternate;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0.15em 0.5em rgba(0, 0, 0, 0.2); }
    100% { box-shadow: 0 0.2em 0.8em rgba(212, 177, 112, 0.5); }
  }

  .next-tick-label {
    font-family: var(--font-display);
    font-size: 0.62em;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(232, 228, 210, 0.7);
    white-space: nowrap;
  }

  .next-tick-time {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-gold-pale, #d4b170);
    display: flex;
    align-items: center;
    gap: 0.3em;
  }

  .speed-indicator {
    font-family: var(--font-mono);
    font-size: 0.78em;
    background-color: rgba(14, 19, 32, 0.6);
    border: 0.075em solid rgba(176, 141, 74, 0.3);
    border-radius: 0;
    padding: 0.1em 0.4em;
    margin-left: 0.2em;
    color: var(--color-parchment-100);
  }

  /* Spinner animation for pending state */
  .spinner {
    width: 1em;
    height: 1em;
    border: 0.12em solid rgba(212, 177, 112, 0.3);
    border-radius: 50%;
    border-top-color: var(--color-gold-pale, #d4b170);
    animation: spin 1s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
