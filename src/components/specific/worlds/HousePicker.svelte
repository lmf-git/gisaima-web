<script>
  import { onMount } from 'svelte';
  import { apiGet } from '$lib/api.js';

  // `selection` is the picker's output, bound by the parent:
  //   { mode: 'none' }              — no house
  //   { mode: 'join',  houseId }    — request to join an existing house (needs approval)
  //   { mode: 'found', houseName }  — found a new house (immediate)
  // It is null while the current choice is incomplete/invalid.
  let {
    worldId,
    selection = $bindable(null),
    disabled = false,
  } = $props();

  let houses = $state([]);
  let loading = $state(true);
  let mode = $state('none');        // 'none' | 'join' | 'found'
  let search = $state('');
  let selectedHouseId = $state(null);
  let newName = $state('');

  onMount(async () => {
    try {
      houses = (await apiGet(`/worlds/${encodeURIComponent(worldId)}/houses`)) || [];
    } catch {
      houses = [];
    }
    loading = false;
  });

  const filtered = $derived(
    houses.filter(h => h.name.toLowerCase().includes(search.trim().toLowerCase()))
  );

  const nameError = $derived.by(() => {
    if (mode !== 'found') return '';
    const n = newName.trim();
    if (n.length === 0) return '';
    if (n.length < 2) return 'House name must be at least 2 characters';
    if (n.length > 24) return 'House name must be less than 24 characters';
    return '';
  });

  // Reflect the current choice into the bound `selection`.
  $effect(() => {
    if (mode === 'none') {
      selection = { mode: 'none' };
    } else if (mode === 'found') {
      const n = newName.trim();
      selection = (n.length >= 2 && n.length <= 24) ? { mode: 'found', houseName: n } : null;
    } else {
      selection = selectedHouseId ? { mode: 'join', houseId: selectedHouseId } : null;
    }
  });

  function setMode(next) {
    if (disabled) return;
    mode = next;
  }
</script>

<div class="house-picker">
  <div class="mode-toggle" role="tablist">
    <button
      type="button"
      class="mode-tab"
      class:active={mode === 'none'}
      onclick={() => setMode('none')}
      {disabled}
      role="tab"
      aria-selected={mode === 'none'}
    >
      No house
    </button>
    <button
      type="button"
      class="mode-tab"
      class:active={mode === 'join'}
      onclick={() => setMode('join')}
      disabled={disabled || houses.length === 0}
      role="tab"
      aria-selected={mode === 'join'}
    >
      Join a house
    </button>
    <button
      type="button"
      class="mode-tab"
      class:active={mode === 'found'}
      onclick={() => setMode('found')}
      disabled={disabled}
      role="tab"
      aria-selected={mode === 'found'}
    >
      Found a new house
    </button>
  </div>

  {#if mode === 'none'}
    <p class="picker-note">
      Walk alone for now. You can found a house or ask to join one at any time.
    </p>
  {:else if mode === 'join'}
    {#if loading}
      <p class="picker-note">Reading the rolls…</p>
    {:else if houses.length === 0}
      <p class="picker-note">No houses exist yet — found the first.</p>
    {:else}
      <p class="picker-note">Joining a house needs the founder's approval — your request is sent for review.</p>
      {#if houses.length > 6}
        <input
          type="text"
          class="house-search"
          placeholder="Search houses"
          bind:value={search}
          {disabled}
        />
      {/if}
      <ul class="house-list">
        {#each filtered as house (house._id)}
          <li>
            <button
              type="button"
              class="house-row"
              class:selected={selectedHouseId === house._id}
              class:current={house.isMember}
              onclick={() => !house.isMember && !house.requested && (selectedHouseId = house._id)}
              disabled={disabled || house.isMember || house.requested}
              aria-pressed={selectedHouseId === house._id}
            >
              <span class="house-row-name">{house.name}</span>
              <span class="house-row-meta">
                {house.memberCount} {house.memberCount === 1 ? 'member' : 'members'}
                {#if house.isMember}<em> · current</em>{:else if house.requested}<em> · requested</em>{/if}
              </span>
            </button>
          </li>
        {/each}
        {#if filtered.length === 0}
          <li class="picker-note">No houses match "{search}".</li>
        {/if}
      </ul>
    {/if}
  {:else}
    <input
      type="text"
      class="house-name-input"
      class:error={nameError}
      placeholder="Name your house"
      bind:value={newName}
      maxlength="24"
      {disabled}
    />
    {#if nameError}
      <div class="input-error">{nameError}</div>
    {/if}
  {/if}
</div>

<style>
  .house-picker {
    text-align: left;
    max-width: 400px;
    margin: 0 auto;
    width: 100%;
  }

  .mode-toggle {
    display: flex;
    gap: 0;
    margin-bottom: 0.8em;
    border: 1px solid var(--color-parchment-shadow);
    border-radius: 2px;
    overflow: hidden;
  }

  .mode-tab {
    flex: 1;
    background: var(--color-parchment-200);
    border: none;
    padding: 0.6em 0.5em;
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 0.68em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-ink-700);
    transition: background 0.15s ease, color 0.15s ease;
  }
  .mode-tab + .mode-tab { border-left: 1px solid var(--color-parchment-shadow); }
  .mode-tab.active {
    background: var(--color-ink-900);
    color: var(--color-parchment-100);
  }
  .mode-tab:disabled { opacity: 0.5; cursor: not-allowed; }

  .house-search,
  .house-name-input {
    width: 100%;
    padding: 0.7em 0.9em;
    font-size: 1em;
    background: var(--color-parchment-200);
    border: 1px solid var(--color-parchment-shadow);
    border-radius: 2px;
    color: var(--color-ink-900);
    font-family: var(--font-body);
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .house-search { margin-bottom: 0.6em; }
  .house-search:focus,
  .house-name-input:focus {
    outline: none;
    border-color: var(--color-ink-900);
    background: var(--color-parchment-100);
  }
  .house-name-input.error {
    border-color: var(--color-wax-red);
    background: rgba(154, 51, 32, 0.06);
  }

  .house-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 14em;
    overflow-y: auto;
    border: 1px solid var(--color-parchment-shadow);
    border-radius: 2px;
  }

  .house-row {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15em;
    background: var(--color-parchment-100);
    border: none;
    border-bottom: 1px solid rgba(26, 32, 48, 0.12);
    padding: 0.7em 0.9em;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s ease;
  }
  .house-row:hover:not(:disabled) { background: var(--color-parchment-200); }
  .house-row.selected {
    background: var(--color-parchment-200);
    box-shadow: inset 3px 0 0 var(--color-wax-red);
  }
  .house-row:last-child { border-bottom: none; }
  .house-row:disabled { opacity: 0.6; cursor: not-allowed; }

  .house-row-name {
    font-family: var(--font-display);
    font-size: 1em;
    letter-spacing: 0.02em;
    color: var(--color-ink-900);
  }
  .house-row.selected .house-row-name { color: var(--color-wax-red); }
  .house-row-meta {
    font-family: var(--font-mono);
    font-size: 0.7em;
    letter-spacing: 0.06em;
    color: var(--color-ink-500);
  }
  .house-row-meta em { font-style: normal; color: var(--color-wax-red); }

  .picker-note {
    font-family: var(--font-editorial);
    font-style: italic;
    color: var(--color-ink-500);
    font-size: 0.9em;
    margin: 0.4em 0;
    padding: 0.4em 0.2em;
  }

  .input-error {
    color: var(--color-wax-red);
    font-family: var(--font-editorial);
    font-style: italic;
    font-size: 0.85em;
    margin-top: 0.5em;
  }
</style>
