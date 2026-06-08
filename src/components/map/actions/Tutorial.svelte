<script>
  import { onMount } from 'svelte';
  import { ACHIEVEMENTS } from 'gisaima-shared/definitions/ACHIEVEMENTS.js';
  import { currentPlayer } from '../../../lib/stores/game.js';
  import { targetStore } from '../../../lib/stores/map.js';
  import Trophy from '../../icons/Trophy.svelte';

  const {
    onClose = () => {},
    onOpenAchievements = () => {},
  } = $props();

  // Steps: each describes one tutorial beat.
  // `selector` targets a DOM element to spotlight; null = centred card only.
  // `achievement` links to an ACHIEVEMENTS key to show unlock status and is the
  // primary signal that an interactive step is complete.
  // `wheelAction` (the action's aria-label in the wheel) turns the step into an
  // interactive beat: the player must open the action wheel on their tile and
  // pick that action. The tutorial waits for the action to take effect instead
  // of offering Next.
  const STEPS = [
    {
      id: 'welcome',
      title: 'Welcome to Gisaima',
      body: 'An open-world strategy MMO with procedurally generated maps, territory control, and real-time interaction. This guide walks you through the first things to try.',
      selector: null,
      achievement: null,
    },
    {
      id: 'center-tile',
      title: 'Your Position',
      body: 'The highlighted tile in the centre of the map is where you are. Tap or click it to open the action wheel and choose what to do here.',
      selector: '.tile.center',
      achievement: null,
    },
    {
      id: 'mobilise',
      title: 'Mobilise a Group',
      body: 'Mobilise gathers units into a travelling group. Groups are how you explore and expand.',
      selector: '.tile.center',
      wheelAction: 'Mobilise',
      achievement: 'mobilised',
    },
    {
      id: 'movement',
      title: 'Draw a Path',
      body: 'With a group mobilised, Move lets you draw a path across the map and send them off.',
      selector: '.tile.center',
      wheelAction: 'Move',
      achievement: 'first_steps',
    },
    {
      id: 'gather',
      title: 'Gather Resources',
      body: 'Gather collects resources from the terrain around your group. Resources power everything.',
      selector: '.tile.center',
      wheelAction: 'Gather',
      achievement: 'first_gather',
    },
    {
      id: 'recruit',
      title: 'Recruit Units',
      body: 'Recruiting happens at a spawn structure — move your group back onto your spawn first, then Recruit adds units to your roster. More units means stronger groups.',
      selector: '.tile.center',
      wheelAction: 'Recruit',
      achievement: 'first_recruit',
    },
    {
      id: 'craft',
      title: 'Craft Items',
      body: 'At a workshop, Craft creates items that boost your characters and units.',
      selector: '.tile.center',
      wheelAction: 'Craft',
      achievement: 'first_craft',
    },
    {
      id: 'chat',
      title: 'Talk to Others',
      body: 'Use the chat button in the top right to send messages to other players in this world. Alliances are often forged in conversation.',
      selector: '[aria-label="Open chat"], .chat-button, [aria-label="Show chat"]',
      achievement: 'first_message',
    },
    {
      id: 'combat',
      title: 'Enter Combat',
      body: 'Move a group onto a tile occupied by enemies to start a battle. Open the wheel and choose Attack when an enemy shares your tile.',
      selector: '.tile.center',
      wheelAction: 'Attack',
      achievement: 'first_attack',
    },
    {
      id: 'achievements',
      title: 'Track Your Progress',
      body: 'Open the Achievements panel to see everything you\'ve unlocked and what to try next. Good luck — the world is waiting.',
      selector: '.achievements-button, [aria-label="Show achievements"]',
      achievement: null,
    },
  ];

  // The open action wheel (Peek.svelte) renders as `.peek-container`; each action
  // sector carries `aria-label="<Label>"`. These let us detect wheel state and
  // spotlight the exact action a step asks for.
  const WHEEL_SELECTOR = '.peek-container';
  // Path-drawing mode toggles `.map.path-drawing` on the map root.
  const PATH_DRAWING_SELECTOR = '.map.path-drawing';
  const wheelActionSelector = (label) => `${WHEEL_SELECTOR} [aria-label="${label}"]`;

  // Dossier action panel currently open, read from its topbar title. Lets a step
  // say "configuring…" while the action's panel is up and the wheel has closed.
  const DOSSIER_TITLE_SELECTOR = '.ds-topbar-action';
  // wheelAction → dossier panel title (see PANEL_TITLES in TileDossier.svelte).
  const DOSSIER_TITLE_FOR = {
    Mobilise: 'Mobilise',
    Move: 'Move Group',
    Gather: 'Gather',
    Recruit: 'Recruit',
    Craft: 'Crafting',
    Attack: 'Attack',
  };

  const totalSteps = STEPS.length;

  const savedStep = typeof localStorage !== 'undefined'
    ? parseInt(localStorage.getItem('tutorial-step') || '0', 10)
    : 0;

  let stepIndex = $state(Math.min(savedStep, totalSteps - 1));
  let spotlightRect = $state(null);
  // Live DOM-derived state, refreshed by the poll below.
  let wheelOpen = $state(false);
  let pathDrawing = $state(false);
  let dossierTitle = $state('');

  const step = $derived(STEPS[stepIndex]);
  const playerAchievements = $derived($currentPlayer?.achievements || {});
  const stepAchievement = $derived(
    step.achievement ? ACHIEVEMENTS[step.achievement] : null
  );
  const stepUnlocked = $derived(
    step.achievement ? !!playerAchievements[step.achievement] : false
  );

  // ─── Live group state at the player's tile ───
  // Drives the "wait for your group…" cues and the progress-based advancement so
  // the tutorial reflects what is actually happening on the map.
  const myGroups = $derived.by(() => {
    const t = $targetStore;
    const pid = $currentPlayer?.id;
    if (!t?.groups || !pid) return [];
    return t.groups.filter(g => g.owner === pid);
  });
  const hasIdleGroup = $derived(myGroups.some(g => g.status === 'idle'));
  const hasMobilising = $derived(myGroups.some(g => g.status === 'mobilizing'));
  const hasGathering = $derived(myGroups.some(g => g.status === 'gathering'));
  // Structure on the current tile — Recruit and Craft can only be done while
  // standing on one, so the cue must send the player back to it.
  const tileStructure = $derived($targetStore?.structure ?? null);
  const onSpawn = $derived(tileStructure?.type === 'spawn');
  const onStructure = $derived(!!tileStructure);

  // Interactive steps wait for the player to perform the action rather than
  // showing a Next button.
  const isInteractive = $derived(!!step.wheelAction);
  // Whether the dossier panel for this step's action is currently open.
  const panelOpenForStep = $derived(
    isInteractive &&
    !!DOSSIER_TITLE_FOR[step.wheelAction] &&
    dossierTitle === DOSSIER_TITLE_FOR[step.wheelAction]
  );

  // The live call-to-action shown beneath the step body for interactive steps.
  // It reads real game state so the player is never told to do something the
  // game won't yet allow (e.g. Move before a group has finished mobilising).
  const stepCue = $derived.by(() => {
    if (!isInteractive) return null;
    const action = step.wheelAction;

    if (step.id === 'mobilise') {
      if (hasMobilising) return 'Mobilising your group… hold on.';
    }

    if (step.id === 'movement') {
      if (pathDrawing) return 'Draw a path across the map, then confirm to send your group.';
      if (hasMobilising && !hasIdleGroup) return 'Your group is still mobilising — wait until it is ready.';
      if (!hasIdleGroup) return 'Wait for your group to be ready to move.';
    }

    if (step.id === 'gather') {
      if (hasGathering) return 'Gathering resources… hold on.';
      if (!hasIdleGroup) return 'Wait for your group to finish moving, then act on its tile.';
    }

    // Recruit and Craft only work on a structure tile. After moving off to
    // gather you'll have left the spawn, so steer the player back first.
    if (step.id === 'recruit' && !onSpawn) {
      return 'Move your group back onto your spawn structure, then open the wheel to Recruit.';
    }
    if (step.id === 'craft' && !onStructure) {
      return 'Stand on a structure (a spawn or workshop), then open the wheel to Craft.';
    }

    if (panelOpenForStep) return `Confirm in the ${action} panel to continue.`;
    if (wheelOpen) return `Choose ${action} from the wheel.`;
    return `Tap the highlighted tile to open the action wheel, then choose ${action}.`;
  });

  // True when the cue is telling the player to wait for the game rather than act
  // (so it can be styled as a calm hold instead of an action prompt).
  const cueWaiting = $derived.by(() => {
    if (!isInteractive) return false;
    if (hasMobilising || hasGathering) return true;
    // Move/Gather both need an idle group on the tile; while there isn't one the
    // cue is a "wait for your group" message (path-drawing excepted — that's an
    // active prompt).
    if ((step.id === 'movement' && !pathDrawing) || step.id === 'gather') return !hasIdleGroup;
    return false;
  });

  function resolveSelector(selector) {
    if (!selector) return null;
    const parts = selector.split(',').map(s => s.trim());
    for (const s of parts) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  // For interactive steps the spotlight target depends on wheel state: the tile
  // until the wheel opens, then the specific action sector inside it.
  function currentSelector() {
    if (isInteractive && wheelOpen) {
      const sel = wheelActionSelector(step.wheelAction);
      if (document.querySelector(sel)) return sel;
    }
    return step.selector;
  }

  function updateSpotlight() {
    // Keep DOM-derived flags in sync each pass.
    wheelOpen = !!document.querySelector(WHEEL_SELECTOR);
    pathDrawing = !!document.querySelector(PATH_DRAWING_SELECTOR);
    dossierTitle = document.querySelector(DOSSIER_TITLE_SELECTOR)?.textContent?.trim() || '';

    const selector = currentSelector();
    const el = selector ? resolveSelector(selector) : null;
    if (!el) {
      spotlightRect = null;
      return;
    }
    const r = el.getBoundingClientRect();
    const PAD = 8;
    spotlightRect = {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    };
  }

  // A step is "already done" when its linked achievement is unlocked — the
  // player has performed that action before. Such steps are skipped.
  function isStepDone(i) {
    const a = STEPS[i]?.achievement;
    return !!(a && playerAchievements[a]);
  }
  // First step at or after `start` the player hasn't already completed. Never
  // skips past the final step.
  function firstUnfinishedFrom(start) {
    let i = Math.max(0, Math.min(start, totalSteps - 1));
    while (i < totalSteps - 1 && isStepDone(i)) i++;
    return i;
  }

  function goTo(index) {
    stepIndex = Math.max(0, Math.min(index, totalSteps - 1));
    localStorage.setItem('tutorial-step', String(stepIndex));
    // Reset per-step progress tracking.
    sawPathDrawing = false;
    updateSpotlight();
  }

  function next() {
    if (stepIndex < totalSteps - 1) goTo(firstUnfinishedFrom(stepIndex + 1));
    else finish();
  }

  // Advance after the player completes the action a step asked for. A short delay
  // lets the wheel close and any action panel settle before the card moves on.
  let advanceTimer = null;
  function advanceFromAction() {
    if (advanceTimer) return;
    advanceTimer = setTimeout(() => {
      advanceTimer = null;
      next();
    }, 600);
  }

  function finish() {
    localStorage.setItem('tutorial-state', 'closed');
    onClose();
  }

  function skip() {
    finish();
  }

  function openAchievements() {
    finish();
    onOpenAchievements();
  }

  // ─── Spotlight refresh + state polling ───
  let rafId = null;
  function scheduleSpotlight() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => { updateSpotlight(); rafId = null; });
  }

  let pollId = null;

  onMount(() => {
    updateSpotlight();
    window.addEventListener('resize', scheduleSpotlight);
    // Poll so wheel open/close, path-drawing and action-sector positions (driven
    // by map interactions outside this component) keep the card and spotlight in
    // sync.
    pollId = setInterval(scheduleSpotlight, 150);
    return () => {
      window.removeEventListener('resize', scheduleSpotlight);
      if (pollId) clearInterval(pollId);
      if (rafId) cancelAnimationFrame(rafId);
      if (advanceTimer) clearTimeout(advanceTimer);
    };
  });

  $effect(() => {
    // Re-spotlight when step changes (after DOM settles).
    void stepIndex;
    scheduleSpotlight();
  });

  // ─── Advancement ───
  // Primary signal: the linked achievement unlocking (covers async completions
  // such as a move resolving on a server tick).
  $effect(() => {
    if (isInteractive && stepUnlocked) advanceFromAction();
  });

  // Fallback progress signals read from live game state, so steps still advance
  // promptly even before the matching achievement is granted.
  let sawPathDrawing = false;
  $effect(() => {
    if (!isInteractive) return;
    if (step.id === 'mobilise' && hasMobilising) {
      // A group is forming — the player has mobilised.
      advanceFromAction();
    } else if (step.id === 'movement') {
      // Remember that path drawing started; once it ends and the group has left
      // the tile (no longer idle here), the move was committed.
      if (pathDrawing) sawPathDrawing = true;
      else if (sawPathDrawing && !hasIdleGroup) advanceFromAction();
    } else if (step.id === 'gather' && hasGathering) {
      advanceFromAction();
    }
  });

  // On first load (once achievements are known), jump past any opening steps the
  // player has already completed in a prior session, so returning players aren't
  // walked back through actions they know.
  let didInitSkip = false;
  $effect(() => {
    void playerAchievements;
    if (didInitSkip || !$currentPlayer) return;
    didInitSkip = true;
    const target = firstUnfinishedFrom(stepIndex);
    if (target !== stepIndex) goTo(target);
  });

  // The spotlight overlay and the floating card both portal to <body> so no
  // ancestor's transform/overflow can clip them. Scoped styles still apply
  // because the elements keep their Svelte classes.
  function portal(node) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }
</script>

<!-- Spotlight overlay — portaled to <body> so nothing can clip it -->
<div class="tutorial-overlay" use:portal aria-hidden="true">
  <!-- Dark backdrop with spotlight hole via SVG mask -->
  <svg class="backdrop">
    <defs>
      <mask id="spotlight-mask">
        <!-- White = show backdrop (dark), black = hide backdrop (reveal) -->
        <rect width="100%" height="100%" fill="white" />
        {#if spotlightRect}
          <rect
            x={spotlightRect.left}
            y={spotlightRect.top}
            width={spotlightRect.width}
            height={spotlightRect.height}
            rx="4"
            fill="black"
          />
        {/if}
      </mask>
    </defs>
    <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#spotlight-mask)" />
  </svg>

  {#if spotlightRect}
    <!-- Visible border around spotlight target -->
    <div
      class="spotlight-border"
      style="top:{spotlightRect.top}px;left:{spotlightRect.left}px;width:{spotlightRect.width}px;height:{spotlightRect.height}px"
    ></div>
  {/if}
</div>

<!-- Instruction card — floats above the map, persists across action panels -->
<div
  class="tutorial-card"
  use:portal
  role="dialog"
  aria-label="Interactive tutorial"
  onkeydown={e => { if (e.key === 'Escape') skip(); else if (e.key === 'ArrowRight' && !isInteractive) next(); }}
  tabindex="-1"
>
    <div class="card-progress">
      {#each STEPS as _, i}
        <span
          class="progress-dot"
          class:active={i === stepIndex}
          class:done={i < stepIndex}
          aria-hidden="true"
        ></span>
      {/each}
    </div>

    <div class="card-body">
      <h2 class="card-title">{step.title}</h2>
      <p class="card-text">{step.body}</p>

      {#if stepCue}
        <p class="card-cue" class:waiting={cueWaiting} class:on-wheel={wheelOpen}>{stepCue}</p>
      {/if}

      {#if stepAchievement}
        <div class="card-achievement" class:unlocked={stepUnlocked}>
          <span class="ach-icon-wrap">
            {#if stepUnlocked}
              <Trophy extraClass="ach-icon-svg" />
            {:else}
              <span class="ach-lock-glyph">?</span>
            {/if}
          </span>
          <span class="ach-label">
            {stepUnlocked ? stepAchievement.title + ' — Unlocked' : stepAchievement.title}
          </span>
        </div>
      {/if}
    </div>

    <div class="card-actions">
      <div class="card-nav">
        {#if isInteractive}
          <!-- Interactive steps complete by doing, not by pressing Next. -->
          <span class="nav-waiting" aria-live="polite">Waiting for you…</span>
        {:else if stepIndex < totalSteps - 1}
          <button class="nav-btn primary" onclick={next} aria-label="Next step">
            Next ›
          </button>
        {:else}
          <button class="nav-btn primary" onclick={openAchievements} aria-label="View achievements">
            View Achievements
          </button>
        {/if}
      </div>
      <button class="skip-btn" onclick={skip}>Skip tutorial</button>
    </div>
</div>

<style>
  .tutorial-overlay {
    position: fixed;
    inset: 0;
    /* Above the map and action wheel (z-index 800) so they dim, but below the
       TileDossier (z-index 1100) so docked action panels stay bright. */
    z-index: 1050;
    /* Click-through: the player can still open the wheel and pick actions. */
    pointer-events: none;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .spotlight-border {
    position: fixed;
    border: 2px solid var(--chrome-gold, #b08d4a);
    border-radius: 4px;
    box-shadow: 0 0 0 1px rgba(176,141,74,0.3), 0 0 12px 2px rgba(176,141,74,0.25);
    pointer-events: none;
    transition: top 0.18s ease, left 0.18s ease, width 0.18s ease, height 0.18s ease;
    animation: pulse-border 2s ease-in-out infinite;
    z-index: 1051;
  }

  @keyframes pulse-border {
    0%, 100% { box-shadow: 0 0 0 1px rgba(176,141,74,0.3), 0 0 10px 2px rgba(176,141,74,0.2); }
    50%       { box-shadow: 0 0 0 1px rgba(176,141,74,0.5), 0 0 18px 4px rgba(176,141,74,0.4); }
  }

  /* ── Card ── (floats over the map, bottom-left on desktop) */
  .tutorial-card {
    position: fixed;
    left: 1em;
    bottom: 1em;
    width: min(22em, calc(100vw - 2em));
    /* Above the dossier (1100) so the guide is always visible while action
       panels open and close beside it. */
    z-index: 1200;
    background: var(--chrome-bg, #141820);
    border: 1px solid var(--chrome-gold-border, #5a4520);
    border-radius: 6px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    color: var(--chrome-text, #e8e0cc);
    font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
    display: flex;
    flex-direction: column;
    gap: 0;
    pointer-events: auto;
  }
  .tutorial-card:focus { outline: none; }

  /* On narrow screens dock the card to the top so the bottom stays free for the
     dossier / on-screen controls. */
  @media (max-width: 768px) {
    .tutorial-card {
      left: 0.5em;
      right: 0.5em;
      bottom: auto;
      top: 4.5em;
      width: auto;
    }
  }

  /* Progress dots */
  .card-progress {
    display: flex;
    gap: 0.4em;
    padding: 0.7em 0.9em 0.4em;
    align-items: center;
  }

  .progress-dot {
    width: 0.55em;
    height: 0.55em;
    border-radius: 50%;
    background: var(--chrome-text-faint, #4a4030);
    flex-shrink: 0;
    transition: background 0.15s, transform 0.15s;
  }
  .progress-dot.done { background: var(--chrome-gold-border, #5a4520); }
  .progress-dot.active {
    background: var(--chrome-gold, #b08d4a);
    transform: scale(1.3);
  }

  /* Card body */
  .card-body {
    padding: 0.5em 0.9em 0.7em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .card-title {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.82em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--chrome-gold, #b08d4a);
    margin: 0;
  }

  .card-text {
    font-family: var(--font-editorial, serif);
    font-style: italic;
    font-size: 0.78em;
    line-height: 1.5;
    color: var(--chrome-text-dim, #a09070);
    margin: 0;
  }

  /* Live call-to-action for interactive steps */
  .card-cue {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.7em;
    letter-spacing: 0.06em;
    line-height: 1.4;
    color: var(--chrome-text, #e8e0cc);
    margin: 0;
    padding: 0.4em 0.6em;
    background: var(--chrome-gold-soft, #2a2010);
    border-left: 2px solid var(--chrome-gold, #b08d4a);
  }
  .card-cue.on-wheel {
    border-left-color: var(--color-gold-pale, #d4b170);
    animation: cue-pulse 1.4s ease-in-out infinite;
  }
  /* When waiting on the game (mobilising / moving / gathering) the cue reads as
     a calm hold rather than an action prompt. */
  .card-cue.waiting {
    border-left-color: var(--chrome-text-faint, #4a4030);
    color: var(--chrome-text-dim, #a09070);
    animation: none;
    background: var(--chrome-card, #1a1e28);
  }
  @keyframes cue-pulse {
    0%, 100% { background: var(--chrome-gold-soft, #2a2010); }
    50%      { background: var(--chrome-gold-border, #5a4520); }
  }

  /* Achievement badge */
  .card-achievement {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.35em 0.6em;
    background: var(--chrome-card, #1a1e28);
    border: 1px solid var(--chrome-gold-soft, #2a2010);
    opacity: 0.65;
    transition: opacity 0.2s, border-color 0.2s;
  }
  .card-achievement.unlocked {
    opacity: 1;
    border-color: var(--chrome-gold, #b08d4a);
  }

  .ach-icon-wrap {
    width: 1.4em;
    height: 1.4em;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--chrome-gold, #b08d4a);
    flex-shrink: 0;
  }
  :global(.ach-icon-svg) {
    width: 1.1em;
    height: 1.1em;
  }
  .ach-lock-glyph {
    font-family: var(--font-display, serif);
    font-size: 0.75em;
    color: var(--chrome-text-faint, #4a4030);
  }
  .ach-label {
    font-family: var(--font-mono, monospace);
    font-size: 0.65em;
    letter-spacing: 0.08em;
    color: var(--chrome-text-dim, #a09070);
  }
  .card-achievement.unlocked .ach-label { color: var(--chrome-gold, #b08d4a); }

  /* Card actions */
  .card-actions {
    border-top: 1px solid var(--chrome-hairline, #252830);
    padding: 0.6em 0.9em;
    display: flex;
    flex-direction: column;
    gap: 0.4em;
  }

  .card-nav {
    display: flex;
    gap: 0.5em;
  }

  .nav-btn {
    flex: 1;
    padding: 0.4em 0.6em;
    background: var(--chrome-field-bg, #1a1e28);
    border: 1px solid var(--chrome-field-border, #2a2e38);
    color: var(--chrome-text-dim, #a09070);
    font-family: var(--font-display, serif);
    font-size: 0.65em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .nav-btn.primary {
    background: var(--color-aged-gold, #b08d4a);
    border-color: var(--color-aged-gold, #b08d4a);
    color: var(--color-ink-900, #0e1320);
  }
  .nav-btn.primary:hover {
    background: var(--color-gold-pale, #d4b170);
    border-color: var(--color-gold-pale, #d4b170);
    color: var(--color-ink-900, #0e1320);
  }

  .nav-waiting {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono, monospace);
    font-size: 0.6em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--chrome-gold, #b08d4a);
    animation: waiting-fade 1.4s ease-in-out infinite;
  }
  @keyframes waiting-fade {
    0%, 100% { opacity: 0.45; }
    50%      { opacity: 1; }
  }

  .skip-btn {
    background: none;
    border: none;
    color: var(--chrome-text-faint, #4a4030);
    font-family: var(--font-mono, monospace);
    font-size: 0.6em;
    letter-spacing: 0.08em;
    cursor: pointer;
    text-align: center;
    padding: 0.1em;
    transition: color 0.12s;
  }
  .skip-btn:hover { color: var(--chrome-text-dim, #a09070); }
</style>
