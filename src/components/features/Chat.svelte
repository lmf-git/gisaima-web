<script>
  import { onDestroy, onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { chatStore, messages, initializeChat, sendMessage, markAllAsRead, getMessageTime } from '../../lib/stores/chat.js';
  import { game } from '../../lib/stores/game.js';
  import { user } from '../../lib/stores/user.js';
  import { diplomacy, getMyTribe } from '../../lib/stores/diplomacy.js';
  import { apiGet } from '../../lib/api.js';
  import Close from '../icons/Close.svelte';
  
  // Props using Svelte 5 runes syntax
  const { 
    closing = false, 
    onClose = () => {},
    onMouseEnter = () => {} 
  } = $props();

  // State variables using runes
  let chatInput = $state('');
  let chatContainer = $state(null);
  let messagesContainer = $state(null);

  // Filter state: 'all' | 'monsters' | 'players' | 'house' | 'tribe' | 'mine'
  let activeFilter = $state('all');

  // House roster for this world (members[].uid). Tribes come from the diplomacy
  // store. Both drive the House/Tribe membership filters below.
  let houses = $state([]);

  // Constants
  const MAX_MESSAGE_LENGTH = 200;
  const VISIBLE_MESSAGES_LIMIT = 50;

  // Cleanup function
  let cleanup = $state(() => {});

  const currentUid = $derived($user?.uid);

  // All messages from store
  let displayMessages = $derived($messages || []);

  // The current player's house/tribe co-members, as uid sets. Null when the
  // player belongs to none — the matching filter is then hidden entirely.
  const houseMemberUids = $derived.by(() => {
    const uid = currentUid;
    if (!uid) return null;
    const mine = houses.find(h => (h.members || []).some(m => m.uid === uid));
    return mine ? new Set((mine.members || []).map(m => m.uid)) : null;
  });
  const tribeMemberUids = $derived.by(() => {
    const uid = currentUid;
    if (!uid) return null;
    const mine = getMyTribe($diplomacy.tribes, uid);
    return mine ? new Set((mine.members || []).map(m => m.uid)) : null;
  });

  // Filtered messages based on activeFilter
  const filteredMessages = $derived((() => {
    const msgs = displayMessages;
    const uid = currentUid;
    if (activeFilter === 'all') return msgs;
    if (activeFilter === 'monsters') return msgs.filter(m => m.category === 'monster');
    if (activeFilter === 'players') return msgs.filter(m =>
      m.category !== 'monster' &&
      (m.category === 'player' || m.type === 'system' || m.type === 'user')
    );
    if (activeFilter === 'house') return houseMemberUids
      ? msgs.filter(m => m.userId && houseMemberUids.has(m.userId)) : msgs;
    if (activeFilter === 'tribe') return tribeMemberUids
      ? msgs.filter(m => m.userId && tribeMemberUids.has(m.userId)) : msgs;
    if (activeFilter === 'mine') return msgs.filter(m => uid && m.userId === uid);
    return msgs;
  })());

  // Visible messages (limited for performance)
  const visibleMessages = $derived(
    filteredMessages.length > VISIBLE_MESSAGES_LIMIT
      ? filteredMessages.slice(-VISIBLE_MESSAGES_LIMIT)
      : filteredMessages
  );

  // Derived values using runes
  const isLoading = $derived($chatStore.loading);
  const hasError = $derived($chatStore.error);
  const worldKey = $derived($game.worldKey);
  const messagesVisible = $derived(displayMessages.length > 0);
  
  // Track state for scroll behavior
  let messageCount = $state(0);
  let shouldScrollToBottom = $state(true);
  let lastProcessedCount = $state(0);

  // House/Tribe buttons appear only when the player is a member of one.
  const filters = $derived([
    { id: 'all',      label: 'All' },
    { id: 'monsters', label: 'Monsters' },
    { id: 'players',  label: 'Players' },
    ...(houseMemberUids ? [{ id: 'house', label: 'House' }] : []),
    ...(tribeMemberUids ? [{ id: 'tribe', label: 'Tribe' }] : []),
    { id: 'mine',     label: 'Mine' },
  ]);

  // If the active filter disappears (e.g. left the house), fall back to All.
  $effect(() => {
    if (!filters.some(f => f.id === activeFilter)) activeFilter = 'all';
  });

  // Effect to setup chat when world changes
  $effect(() => {
    if (worldKey) {
      cleanup = initializeChat(worldKey);
    }
    return () => cleanup();
  });

  // Load house roster + tribes so the membership filters have data.
  $effect(() => {
    if (!worldKey) return;
    diplomacy.fetchTribes(worldKey);
    apiGet(`/worlds/${encodeURIComponent(worldKey)}/houses`)
      .then(r => { houses = Array.isArray(r) ? r : []; })
      .catch(() => { houses = []; });
  });

  // Scroll to bottom when filter changes
  $effect(() => {
    activeFilter; // track dependency
    if (messagesContainer) {
      requestAnimationFrame(() => {
        if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
    }
  });

  // Handle form submission. The "Communicator" achievement is granted
  // server-side when the message is posted (see api/routes/chat.js).
  function handleSubmit(event) {
    event.preventDefault();

    if (!chatInput.trim()) return;

    shouldScrollToBottom = true;
    sendMessage(chatInput);
    chatInput = '';
  }

  function closeChat() {
    onClose();
  }

  function handleMouseEnter() {
    onMouseEnter();
  }
  
  // Detect scroll position to decide if we should auto-scroll
  function handleScroll() {
    if (!messagesContainer) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    
    // If we're close to the bottom, auto-scroll on new messages
    shouldScrollToBottom = scrollBottom < 50;
  }
  
  // Track message count changes for auto-scroll
  $effect(() => {
    const newCount = visibleMessages.length;
    if (newCount !== messageCount) {
      messageCount = newCount;
    }
  });
  
  // Optimize scroll behavior
  $effect(() => {
    if (!messagesContainer) return;
    
    if (messageCount > lastProcessedCount && shouldScrollToBottom) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          lastProcessedCount = messageCount;
        }
      });
    }
  });
  
  // Mark messages as read when visible and not loading
  $effect(() => {
    if (messagesVisible && !isLoading && messagesContainer) {
      markAllAsRead();
    }
  });
  
  // Handle window resizing
  function handleResize() {
    if (chatContainer) {
      const windowHeight = window.innerHeight;
      const maxHeight = windowHeight * 0.5;
      chatContainer.style.maxHeight = `${maxHeight}px`;
    }
  }
  
  // Setup on mount
  $effect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    
    setTimeout(() => {
      const inputElement = document.getElementById('chat-input');
      if (inputElement) {
        inputElement.focus();
      }
    }, 100);
    
    // Cleanup on destroy
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
</script>

<div 
  class="chat-container"
  class:closing={closing}
  bind:this={chatContainer}
  onmouseenter={handleMouseEnter}
  transition:fade={{ duration: 200 }}
  role="region"
  aria-labelledby="chat-heading"
>
  <div class="chat-header">
    <h3 id="chat-heading">Chat</h3>
    <button class="close-button" onclick={closeChat} aria-label="Close chat">
      <Close extraClass="close-icon" />
    </button>
  </div>

  <div class="chat-filters" role="group" aria-label="Filter messages">
    {#each filters as f}
      <button
        class="filter-btn"
        class:active={activeFilter === f.id}
        onclick={() => { activeFilter = f.id; }}
        aria-pressed={activeFilter === f.id}
      >{f.label}</button>
    {/each}
  </div>

  <div
    class="chat-messages"
    bind:this={messagesContainer}
    onscroll={handleScroll}
  >
    {#if isLoading}
      <div class="chat-message system-message">
        <span class="message-text">Loading messages...</span>
      </div>
    {:else if hasError}
      <div class="chat-message system-message error">
        <span class="message-text">Error: {$chatStore.error}</span>
      </div>
    {:else if visibleMessages.length === 0}
      <div class="chat-message system-message">
        <span class="message-text">{displayMessages.length === 0 ? 'No messages yet.' : 'No messages match this filter.'}</span>
      </div>
    {:else}
      {#each visibleMessages as message (message.id)}
        {@const isUser = message.type === 'user'}
        {@const isSystem = message.type === 'system'}
        {@const isEvent = message.type === 'event'}
        {@const isMonster = message.category === 'monster'}
        {@const isOwn = isUser && message.userId === currentUid}

        <div
          class="chat-message"
          class:system-message={isSystem && !isMonster}
          class:event-message={isEvent && !isMonster}
          class:monster-message={isMonster}
          class:player-message={isUser && !isOwn}
          class:own-message={isOwn}
          data-timestamp={message.timestamp}
        >
          {#if isUser}
            <span class="message-user" class:own-name={isOwn}>{isOwn ? 'You' : (message.userName || 'Anonymous')}:</span>
          {/if}
          <span class="message-text">{message.text}</span>
          <span class="message-time">{getMessageTime(message.timestamp)}</span>

          {#if message.location}
            <button
              class="location-button"
              onclick={() => {
                const event = new CustomEvent('goto-location', {
                  detail: { x: message.location.x, y: message.location.y }
                });
                window.dispatchEvent(event);
              }}
            >
              @{message.location.x},{message.location.y}
            </button>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
  
  <form class="chat-input-form" onsubmit={handleSubmit}>
    <input
      type="text"
      id="chat-input"
      bind:value={chatInput}
      maxlength={MAX_MESSAGE_LENGTH}
      placeholder="Type a message..."
      aria-label="Chat message"
    />
    <button type="submit" disabled={!chatInput.trim()}>Send</button>
  </form>
</div>

<style>
  .chat-container {
    display: flex;
    flex-direction: column;
    background: linear-gradient(160deg, var(--chrome-panel-a) 0%, var(--chrome-panel-b) 100%);
    border: 0.075em solid var(--chrome-gold-border);
    backdrop-filter: blur(0.5em);
    -webkit-backdrop-filter: blur(0.5em);
    overflow: hidden;
    box-shadow: 0 0.5em 2.5em var(--chrome-shadow);
    color: var(--chrome-text);
    font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
    width: min(380px, 90vw);
    max-height: 52vh;
  }

  .chat-container.closing {
    opacity: 0;
    transform: translateY(1em);
    pointer-events: none;
    transition: opacity 220ms ease, transform 220ms ease;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6em 0.9em;
    background: var(--chrome-gold-soft);
    border-bottom: 0.075em solid var(--chrome-hairline);
    flex-shrink: 0;
  }

  .chat-header h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 0.72em;
    font-weight: 400;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--chrome-gold);
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--chrome-text-dim);
    padding: 0.35em;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.12s;
  }
  .close-button:hover { color: var(--chrome-text); }

  .chat-filters {
    display: flex;
    gap: 0.3em;
    padding: 0.35em 0.7em;
    background: var(--chrome-field-bg);
    border-bottom: 0.075em solid var(--chrome-hairline);
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .filter-btn {
    font-family: var(--font-display);
    font-size: 0.62em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 0.2em 0.6em;
    border: 0.075em solid var(--chrome-gold-border);
    background: transparent;
    color: var(--chrome-text-dim);
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
  }
  .filter-btn:hover {
    background: var(--chrome-gold-soft);
    color: var(--chrome-text);
    border-color: var(--chrome-gold-border);
  }
  .filter-btn.active {
    background: var(--chrome-gold-soft);
    color: var(--chrome-gold);
    border-color: var(--chrome-gold);
  }

  .chat-messages {
    padding: 0.5em 0.7em;
    overflow-y: auto;
    flex: 1;
    max-height: 280px;
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    scrollbar-width: none;
  }

  /* WebKit (Chrome/Safari) ignores scrollbar-width; style the scrollbar
     explicitly so it matches the dossier chrome instead of the OS default. */
  .chat-messages::-webkit-scrollbar {
    width: 0.4em;
  }
  .chat-messages::-webkit-scrollbar-track {
    background: transparent;
  }
  .chat-messages::-webkit-scrollbar-thumb {
    background: var(--chrome-gold-border);
    border-radius: 0;
  }
  .chat-messages::-webkit-scrollbar-thumb:hover {
    background: var(--chrome-gold);
  }

  .chat-input-form {
    display: flex;
    padding: 0.5em 0.7em;
    gap: 0.4em;
    background: var(--chrome-gold-soft);
    border-top: 0.075em solid var(--chrome-hairline);
    flex-shrink: 0;
  }

  .chat-input-form input {
    flex: 1;
    padding: 0.4em 0.6em;
    border: 0.075em solid var(--chrome-gold-border);
    background: var(--chrome-field-bg);
    color: var(--chrome-text);
    font-family: var(--font-ui);
    font-size: 0.85em;
    outline: none;
  }
  .chat-input-form input:focus {
    border-color: var(--color-aged-gold, #b08d4a);
  }

  .chat-input-form button {
    padding: 0.4em 0.9em;
    border: 0.075em solid var(--color-aged-gold, #b08d4a);
    background: var(--color-aged-gold, #b08d4a);
    color: var(--color-ink-900, #0e1320);
    font-family: var(--font-display);
    font-size: 0.65em;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.12s;
  }
  .chat-input-form button:hover:not(:disabled) {
    background: var(--color-gold-pale, #d4b170);
    border-color: var(--color-gold-pale);
  }
  .chat-input-form button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Message rows */
  .chat-message {
    padding: 0.35em 0.5em;
    background: var(--chrome-card);
    border: 0.04em solid var(--chrome-hairline);
    word-break: break-word;
    position: relative;
    animation: fadeIn 0.18s ease;
    font-size: 0.84em;
    line-height: 1.45;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(3px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .system-message {
    background: var(--chrome-gold-soft);
    border-color: var(--chrome-hairline);
    font-style: italic;
  }

  .event-message {
    background: rgba(139,32,32,0.1);
    border-color: rgba(139,32,32,0.2);
  }

  .monster-message {
    background: rgba(180,90,20,0.1);
    border-color: rgba(180,90,20,0.25);
    color: var(--color-gold-pale);
  }

  .player-message {
    background: rgba(60,110,60,0.08);
    border-color: rgba(80,140,80,0.18);
  }

  .own-message {
    background: var(--chrome-gold-soft);
    border-color: var(--chrome-gold-border);
    border-left: 2px solid var(--chrome-gold);
  }

  .own-name {
    color: var(--chrome-gold);
  }

  .error {
    background: rgba(139,32,32,0.12);
    border-color: rgba(139,32,32,0.3);
    color: var(--color-wax-red);
  }

  .message-user {
    font-weight: 600;
    margin-right: 0.4em;
    color: var(--chrome-gold);
  }

  .message-text {
    display: inline;
    color: var(--chrome-text);
  }

  .message-time {
    font-family: var(--font-mono);
    font-size: 0.72em;
    color: rgba(232,228,210,0.35);
    margin-left: 0.4em;
    white-space: nowrap;
  }

  .location-button {
    background: rgba(176,141,74,0.1);
    border: 0.075em solid rgba(176,141,74,0.25);
    padding: 0.1em 0.35em;
    font-size: 0.78em;
    cursor: pointer;
    margin-left: 0.3em;
    color: var(--color-aged-gold, #b08d4a);
    transition: background 0.12s;
  }
  .location-button:hover {
    background: rgba(176,141,74,0.2);
    color: var(--color-gold-pale);
  }

  :global(.close-icon) {
    width: 1.7em;
    height: 1.7em;
  }

  @media (max-width: 600px) {
    /* Bump the base font so the whole (em-relative) panel scales up, widen it
       to nearly fill the viewport, and give it more vertical room. */
    .chat-container {
      font-size: 1.2em;
      width: 94vw;
      max-height: 52vh;
    }
    .chat-messages  { max-height: 46vh; }
    /* Extra readability bump for the message body text itself. */
    .chat-message { font-size: 0.95em; }
  }
</style>
