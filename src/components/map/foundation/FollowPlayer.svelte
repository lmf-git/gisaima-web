<script>
  import { browser } from '$app/environment';
  import { game } from '../../../lib/stores/game';
  import BoundIcon from '../../icons/BoundIcon.svelte';
  import UnboundIcon from '../../icons/UnboundIcon.svelte';

  // Props using Svelte 5 runes approach
  let { disabled = false, onFollowToggle = undefined } = $props();

  // Track state internally using runes
  let followPlayerPosition = $state(true);

  // Sync with localStorage on component init
  $effect(() => {
    if (browser && $game?.initialized) {
      const savedFollow = localStorage.getItem('follow_player_position');
      if (savedFollow !== null) {
        followPlayerPosition = savedFollow === 'true';
      }
    }
  });

  // Function to handle toggle
  function toggleFollow() {
    followPlayerPosition = !followPlayerPosition;

    // Save preference to localStorage
    if (browser) {
      localStorage.setItem('follow_player_position', followPlayerPosition.toString());
    }

    // Call the callback if provided
    if (typeof onFollowToggle === 'function') {
      onFollowToggle(followPlayerPosition);
    }
  }
</script>

<button 
  class="control-button follow-button" 
  onclick={toggleFollow}
  aria-label={followPlayerPosition ? "Stop following player" : "Follow player"}
  {disabled}>
  
  {#if followPlayerPosition}
    <BoundIcon extraClass="button-icon" />
  {:else}
    <UnboundIcon extraClass="button-icon" />
  {/if}
  
</button>

<style>
  .control-button {
    min-width: 2em;
    width: 2em;
    height: 2em;
    background-color: rgba(14, 19, 32, 0.85);
    border: 0.075em solid rgba(176, 141, 74, 0.4);
    border-radius: 0;
    color: var(--color-gold-pale, #d4b170);
    padding: 0.3em;
    font-size: 0.9em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    text-shadow: none;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    backdrop-filter: blur(0.5em);
    -webkit-backdrop-filter: blur(0.5em);
    opacity: 0;
    transform: translateY(-1em);
    animation: fadeInButton 0.7s ease-out 0.5s forwards;
  }

  .control-button:hover:not(:disabled) {
    background-color: rgba(176, 141, 74, 0.16);
    border-color: var(--color-gold-pale, #d4b170);
    color: var(--color-parchment-100);
  }

  .control-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @keyframes fadeInButton {
    0%   { opacity: 0; transform: translateY(-1em); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .control-button:focus-visible {
    outline: 0.15em solid var(--color-aged-gold, #b08d4a);
    outline-offset: 0.1em;
  }
</style>
