<script>
  import { untrack } from 'svelte';
  import HousePicker from './HousePicker.svelte';
  import Human from '../../icons/Human.svelte';
  import Elf from '../../icons/Elf.svelte';
  import Dwarf from '../../icons/Dwarf.svelte';
  import Goblin from '../../icons/Goblin.svelte';
  import Fairy from '../../icons/Fairy.svelte';

  // Props for the component
  const { 
    world, 
    onClose, 
    onConfirm, 
    animatingOut = false,
    initialName = ''
  } = $props();

  // Available races with icon components mapping
  const races = [
    {
      id: 'human',
      name: 'Humans',
      description: 'Versatile and adaptable, humans excel at diplomacy and trade.',
      icon: Human
    },
    {
      id: 'elf',
      name: 'Elves',
      description: 'Ancient forest dwellers with deep connections to nature and magic.',
      icon: Elf
    },
    {
      id: 'dwarf',
      name: 'Dwarves',
      description: 'Sturdy mountain folk, master craftsmen and miners.',
      icon: Dwarf
    },
    {
      id: 'goblin',
      name: 'Goblins',
      description: 'Cunning and numerous, goblins thrive in harsh environments.',
      icon: Goblin
    },
    {
      id: 'fairy',
      name: 'Fairies',
      description: 'Magical beings with flight capabilities and illusion powers.',
      icon: Fairy
    }
  ];

  // Component state
  let selectedRace = $state(null);
  // Mobile shows one race at a time in a chevron carousel; the visible race is
  // the selected one. Keep an index so prev/next can cycle through.
  let currentRaceIndex = $state(0);
  let displayName = $state(untrack(() => initialName));
  let houseSelection = $state(null); // from HousePicker: { mode, houseId? | houseName? }
  let displayNameError = $state('');
  let submitting = $state(false);
  let currentStep = $state(1); // Added step tracker: 1 = race selection, 2 = name input
  let displayNameTouched = $state(false);

  // Track expanded state for each race on mobile
  let expandedRaces = $state({});
  
  // Detect if we're on mobile
  let isMobile = $state(false);
  
  // Check window size on mount
  $effect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        isMobile = window.innerWidth <= 768;
      };
      
      checkMobile();
      window.addEventListener('resize', checkMobile);
      
      return () => {
        window.removeEventListener('resize', checkMobile);
      };
    }
  });

  // Handle race selection
  function selectRace(race) {
    selectedRace = race;
  }

  // On mobile the carousel selects whichever race is currently shown.
  $effect(() => {
    if (isMobile) {
      selectedRace = races[currentRaceIndex];
    }
  });

  function prevRace() {
    currentRaceIndex = (currentRaceIndex - 1 + races.length) % races.length;
  }

  function nextRace() {
    currentRaceIndex = (currentRaceIndex + 1) % races.length;
  }
  
  // Toggle race description on mobile
  function toggleRaceDetails(raceId, event) {
    if (!isMobile) return;
    event.stopPropagation();
    expandedRaces = {
      ...expandedRaces,
      [raceId]: !expandedRaces[raceId]
    };
  }

  // Handle keyboard interaction for race selection
  function handleRaceKeydown(race, event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectRace(race);
    }
  }

  // Add validation for display name
  function validateDisplayName() {
    if (!displayNameTouched) return true;
    
    if (!displayName || displayName.trim().length < 2) {
      displayNameError = 'Display name must be at least 2 characters';
      return false;
    }
    if (displayName.trim().length > 20) {
      displayNameError = 'Display name must be less than 20 characters';
      return false;
    }
    displayNameError = '';
    return true;
  }

  // Separate handlers for input and blur
  function handleInput() {
    if (displayName?.length > 0) {
      displayNameTouched = true;
      validateDisplayName();
    }
  }

  function handleBlur() {
    // Only mark as touched on blur if the user entered something and then left
    // or if they tabbed into the field and then out without entering anything
    if (displayName?.length > 0) {
      displayNameTouched = true;
      validateDisplayName();
    }
  }

  // Move to next step (name input)
  function goToNameInput() {
    if (selectedRace) {
      currentStep = 2;
    }
  }

  // Go back to race selection
  function goBackToRaceSelection() {
    currentStep = 1;
  }

  // Handle confirmation
  async function handleConfirm() {
    if (!selectedRace) return;
    displayNameTouched = true;
    if (!validateDisplayName()) return;
    if (!houseSelection) return;

    submitting = true;
    try {
      // Include spawn information if available
      await onConfirm(world.id, selectedRace.id, displayName.trim(), houseSelection);

    } catch (error) {
      console.error('Error joining world:', error);
      submitting = false;
    }
  }

  // Helper function to convert race name to singular form
  function getSingularRaceName(race) {
    if (!race) return '';
    
    // Map race IDs to their singular forms
    const singularForms = {
      'human': 'Human',
      'elf': 'Elf',
      'dwarf': 'Dwarf',
      'goblin': 'Goblin',
      'fairy': 'Fairy'
    };
    
    return singularForms[race.id] || race.id.charAt(0).toUpperCase() + race.id.slice(1);
  }

  // Add keyboard handler for backdrop
  function handleBackdropKeyDown(event) {
    if (event.key === 'Escape' || event.key === 'Enter') {
      onClose();
    }
  }
</script>

{#snippet raceIcon(race, extra)}
  {#if race?.id === 'human'}
    <Human extraClass={extra} />
  {:else if race?.id === 'elf'}
    <Elf extraClass={extra} />
  {:else if race?.id === 'dwarf'}
    <Dwarf extraClass={extra} />
  {:else if race?.id === 'goblin'}
    <Goblin extraClass={extra} />
  {:else if race?.id === 'fairy'}
    <Fairy extraClass={extra} />
  {/if}
{/snippet}

<!-- Add backdrop that covers the full screen -->
<div
  class={`confirmation-backdrop ${animatingOut ? 'animate-out' : 'animate-in'}`} 
  onclick={onClose}
  onkeydown={handleBackdropKeyDown}
  role="button"
  tabindex="0"
>
</div>

<div class={`join-confirmation ${animatingOut ? 'animate-out' : 'animate-in'}`}>
  <div class="confirmation-content">
    <!-- Step 1: Race Selection -->
    {#if currentStep === 1}
      <h2 class="step-title">Select Your Race</h2>

      {#if isMobile}
        <!-- Mobile: one race at a time, navigated with chevrons. The flex grid
             of cards doesn't fit comfortably on narrow screens. -->
        {@const race = races[currentRaceIndex]}
        <div class="race-carousel">
          <button class="race-chevron" onclick={prevRace} aria-label="Previous race">‹</button>

          <div class="race-option selected carousel-card">
            <div class="race-icon-container large">
              {@render raceIcon(race, 'confirmation-race-icon large')}
            </div>
            <h3>{race.name}</h3>
            <div class="race-description carousel-description">
              <p>{race.description}</p>
            </div>
          </div>

          <button class="race-chevron" onclick={nextRace} aria-label="Next race">›</button>
        </div>

        <div class="carousel-dots" role="tablist" aria-label="Race selection">
          {#each races as r, i (r.id)}
            <button
              class="carousel-dot"
              class:active={i === currentRaceIndex}
              role="tab"
              aria-label={r.name}
              aria-selected={i === currentRaceIndex}
              onclick={() => (currentRaceIndex = i)}
            ></button>
          {/each}
        </div>
      {:else}
        <div class="race-selection">
          {#each races as race (race.id)}
            <div
              class="race-option"
              class:selected={selectedRace?.id === race.id}
              onclick={() => selectRace(race)}
              onkeydown={(e) => handleRaceKeydown(race, e)}
              tabindex="0"
              role="button"
              aria-pressed={selectedRace?.id === race.id}
            >
              <div class="race-icon-container">
                {@render raceIcon(race, 'confirmation-race-icon')}
              </div>
              <h3>{race.name}</h3>
              <div class="race-description">
                <p>{race.description}</p>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="confirmation-actions">
        <button class="cancel-button" onclick={onClose}>
          Back
        </button>
        <button
          class="next-button"
          disabled={!selectedRace}
          onclick={goToNameInput}
        >
          Next
        </button>
      </div>

    <!-- Step 2: Name Input -->
    {:else if currentStep === 2}
      <h2 class="step-title">
        Choose Your Name
        <span class="race-header-info">
          <span class="race-name">{getSingularRaceName(selectedRace)}</span>
          <div class="race-icon-container inline">
            {@render raceIcon(selectedRace, 'confirmation-race-icon header')}
          </div>
        </span>
      </h2>
      
      <div class="name-input-container">
        <label class="field-label" for="display-name">Display name</label>
        <input
          type="text"
          id="display-name"
          placeholder="Enter your display name"
          bind:value={displayName}
          onblur={handleBlur}
          oninput={handleInput}
          class:error={displayNameError && displayNameTouched}
          disabled={submitting}
        />
        {#if displayNameError && displayNameTouched}
          <div class="input-error">{displayNameError}</div>
        {/if}

        <label class="field-label" for="house-picker">House</label>
        <div id="house-picker">
          <HousePicker worldId={world.id} bind:selection={houseSelection} disabled={submitting} />
        </div>
      </div>
      
      <div class="confirmation-actions">
        <button class="back-button" onclick={goBackToRaceSelection} disabled={submitting}>
          Back
        </button>
        <button 
          class="confirm-button" 
          onclick={handleConfirm}
          disabled={!displayName?.trim() || !houseSelection || submitting}
        >
          {#if submitting}
            <div class="spinner"></div>
            Joining...
          {:else}
            Join World
          {/if}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .confirmation-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(14, 19, 32, 0.55);
    z-index: 999;
    cursor: pointer;
    backdrop-filter: blur(2px);
  }

  .join-confirmation {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 40em;
    max-height: 90vh;
    background: var(--color-parchment-100);
    border: 1px solid var(--color-ink-900);
    border-radius: 0;
    box-shadow: 0 2em 5em rgba(0, 0, 0, 0.35);
    padding: 1.8em 2em;
    overflow-y: auto;
    z-index: 1000;
    color: var(--color-ink-900);
    font-family: var(--font-body);
  }

  .step-title {
    color: var(--color-ink-900);
    margin: 0 0 1em 0;
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.04em;
    font-size: 1.6em;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.4em;
  }
  
  .race-header-info {
    display: flex;
    align-items: center;
    gap: 0.4em;
    margin-left: 0.3em;
  }
  
  .race-name {
    font-weight: 500;
    color: var(--color-bright-accent);
  }
  
  .race-icon-container.inline {
    margin: 0;
    display: inline-flex;
  }
  
  :global(.confirmation-race-icon.header) {
    width: 1.5em;
    height: 1.5em;
    margin-top: 0.15em;
  }
  
  .confirmation-content {
    display: flex;
    flex-direction: column;
    gap: 1em;
  }
  
  .race-selection {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9em, 1fr));
    gap: 1em;
    margin: 0.5em 0 1em 0;
  }
  
  .race-option {
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(26, 32, 48, 0.18);
    border-radius: 0;
    padding: 1em 0.8em;
    cursor: pointer;
    text-align: center;
    transition: background 0.15s ease, border-color 0.15s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    color: var(--color-ink-900);
    background: var(--color-parchment-200);
  }

  .race-option:hover {
    background-color: var(--color-parchment-300);
  }

  .race-option.selected {
    border: 2px solid var(--color-wax-red);
    background-color: var(--color-parchment-100);
  }
  
  .race-icon-container {
    display: flex;
    justify-content: center;
    margin-bottom: 0.5em;
  }

  .race-icon-container.large {
    margin: 0.5em auto;
  }
  
  :global(.confirmation-race-icon) {
    width: 2.5em;
    height: 2.5em;
    fill: var(--color-ink-700);
    transition: fill 0.15s ease, transform 0.15s ease;
  }

  :global(.confirmation-race-icon.large) {
    width: 4em;
    height: 4em;
  }

  .race-option.selected :global(.confirmation-race-icon) {
    fill: var(--color-wax-red);
    transform: scale(1.05);
  }

  .race-option:hover :global(.confirmation-race-icon) {
    fill: var(--color-ink-900);
  }

  .race-option h3 {
    font-family: var(--font-display);
    font-weight: 600;
    margin: 0 0 0.5em 0;
    color: var(--color-ink-700);
    font-size: 0.85em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .race-option.selected h3 {
    color: var(--color-wax-red);
  }

  .race-description {
    font-size: 0.85em;
    max-height: 5em;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    font-family: var(--font-editorial);
    font-style: italic;
  }

  .race-option p {
    margin: 0;
    text-align: center;
    color: var(--color-ink-500);
  }

  .race-option:focus {
    outline: 2px solid var(--color-wax-red);
    outline-offset: 2px;
  }

  /* Mobile race carousel */
  .race-carousel {
    display: flex;
    align-items: stretch;
    gap: 0.5em;
    margin: 0.5em 0 0.8em 0;
  }

  .race-chevron {
    flex: 0 0 auto;
    width: 2.2em;
    background: transparent;
    border: 1px solid var(--color-parchment-shadow);
    border-radius: 2px;
    color: var(--color-ink-900);
    font-size: 1.6em;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .race-chevron:hover {
    background: var(--color-parchment-300);
    border-color: var(--color-ink-900);
  }

  .carousel-card {
    flex: 1 1 auto;
    min-width: 0;
    cursor: default;
  }

  .carousel-description {
    max-height: none;
    -webkit-line-clamp: unset;
    line-clamp: unset;
    display: block;
  }

  .carousel-dots {
    display: flex;
    justify-content: center;
    gap: 0.5em;
    margin-bottom: 0.4em;
  }

  .carousel-dot {
    width: 0.6em;
    height: 0.6em;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--color-ink-700);
    background: transparent;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .carousel-dot.active {
    background: var(--color-wax-red);
    border-color: var(--color-wax-red);
  }
  
  .confirmation-actions {
    display: flex;
    justify-content: center;
    gap: 0.8em;
    margin-top: 1em;
  }

  .cancel-button,
  .back-button {
    flex: 1 1 0;
    min-width: 0;
    background: transparent;
    color: var(--color-ink-900);
    border: 1px solid var(--color-ink-900);
    padding: 0.75em 1em;
    border-radius: 2px;
    cursor: pointer;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.78em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: background 0.15s ease;
    white-space: nowrap;
  }

  .next-button,
  .confirm-button {
    flex: 1 1 0;
    min-width: 0;
    background-color: var(--color-ink-900);
    color: var(--color-parchment-100);
    border: 1px solid var(--color-ink-900);
    padding: 0.75em 1em;
    border-radius: 2px;
    cursor: pointer;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.78em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: background 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
  }

  .cancel-button:hover:not(:disabled),
  .back-button:hover:not(:disabled) {
    background: rgba(26, 32, 48, 0.06);
  }

  .next-button:hover:not(:disabled),
  .confirm-button:hover:not(:disabled) {
    background-color: var(--color-ink-700);
  }
  
  .next-button:disabled,
  .confirm-button:disabled,
  .cancel-button:disabled,
  .back-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  .spinner {
    display: inline-block;
    width: 1em;
    height: 1em;
    border: 0.2em solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
    margin-right: 0.5em;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .selected-race-display {
    text-align: center;
    margin-bottom: 1em;
  }
  
  .selected-race-display h3 {
    color: var(--color-ink-900);
    font-family: var(--font-display);
    font-size: 1.3em;
    letter-spacing: 0.04em;
    margin: 0.2em 0 0 0;
  }

  .name-input-container {
    margin: 1em 0;
    text-align: center;
    padding: 0 1em;
  }

  .field-label {
    display: block;
    text-align: left;
    max-width: 400px;
    margin: 0.9em auto 0.3em;
    font-family: var(--font-display);
    font-size: 0.72em;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-ink-700);
  }
  .field-label:first-child { margin-top: 0; }

  .name-input-container input {
    width: 100%;
    max-width: 400px;
    padding: 0.75em 0.9em;
    font-size: 1em;
    background: var(--color-parchment-200);
    border: 1px solid var(--color-parchment-shadow);
    border-radius: 2px;
    color: var(--color-ink-900);
    font-family: var(--font-body);
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .name-input-container input:focus {
    outline: none;
    border-color: var(--color-ink-900);
    background: var(--color-parchment-100);
  }

  .name-input-container input.error {
    border-color: var(--color-wax-red);
    background: rgba(154, 51, 32, 0.06);
  }

  .input-error {
    color: var(--color-wax-red);
    font-family: var(--font-editorial);
    font-style: italic;
    font-size: 0.85em;
    margin-top: 0.5em;
  }
  
  @media (max-width: 768px) {
    .join-confirmation {
      padding: 1.2em;
      width: 95%;
    }
    
    .step-title {
      font-size: 1.2em;
      margin-bottom: 0.8em;
      flex-direction: column;
      gap: 0.2em;
    }
    
    .race-header-info {
      margin-left: 0;
    }
    
    :global(.confirmation-race-icon.header) {
      width: 1.3em;
      height: 1.3em;
    }
    
    .race-selection {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.8em;
    }

    .race-option h3 {
      font-size: 0.9em;
    }

    .race-selection .race-description {
      display: none;
    }

    .race-option {
      padding: 0.6em;
    }
    
    :global(.confirmation-race-icon) {
      width: 2.2em;
      height: 2.2em;
    }

    :global(.confirmation-race-icon.large) {
      width: 3.5em;
      height: 3.5em;
    }
  }
</style>
