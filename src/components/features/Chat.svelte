<script>
  import { onDestroy, onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { chatStore, messages, initializeChat, sendMessage, markAllAsRead, getMessageTime } from '../../lib/stores/chat.js';
  import { game, hasAchievement, savePlayerAchievement } from '../../lib/stores/game.js';
  import { user } from '../../lib/stores/user.js';
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

  // Filter state: 'all' | 'monsters' | 'players' | 'mine'
  let activeFilter = $state('all');

  // Constants
  const MAX_MESSAGE_LENGTH = 200;
  const VISIBLE_MESSAGES_LIMIT = 50;

  // Cleanup function
  let cleanup = $state(() => {});

  const currentUid = $derived($user?.uid);

  // All messages from store
  let displayMessages = $derived($messages || []);

  // Filtered messages based on activeFilter
  const filteredMessages = $derived((() => {
    const msgs = displayMessages;
    const uid = currentUid;
    if (activeFilter === 'all') return msgs;
    if (activeFilter === 'monsters') return msgs.filter(m => m.category === 'monster');
    if (activeFilter === 'players') return msgs.filter(m =>
      m.category === 'player' || m.type === 'system' || m.type === 'user'
    );
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

  const filters = [
    { id: 'all',      label: 'All' },
    { id: 'monsters', label: 'Monsters' },
    { id: 'players',  label: 'Players' },
    { id: 'mine',     label: 'Mine' },
  ];

  // Effect to setup chat when world changes
  $effect(() => {
    if (worldKey) {
      cleanup = initializeChat(worldKey);
    }
    return () => cleanup();
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

  // Handle form submission with achievement tracking
  function handleSubmit(event) {
    event.preventDefault();

    if (!chatInput.trim()) return;

    shouldScrollToBottom = true;
    sendMessage(chatInput);
    unlockFirstMessageAchievement();
    chatInput = '';
  }

  // Function to unlock the first message achievement
  async function unlockFirstMessageAchievement() {
    const worldId = $game.worldKey;
    if (!worldId || !$user) return;

    // Check if the user already has the achievement
    const hasFirstMessageAchievement = hasAchievement(worldId, 'first_message');
    
    // If not, unlock it
    if (!hasFirstMessageAchievement) {
      console.log('Unlocking first_message achievement');
      try {
        await savePlayerAchievement(worldId, 'first_message', true);
      } catch (error) {
        console.error('Error saving first_message achievement:', error);
      }
    }
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

        <div
          class="chat-message"
          class:system-message={isSystem && !isMonster}
          class:event-message={isEvent && !isMonster}
          class:monster-message={isMonster}
          class:player-message={isUser}
          data-timestamp={message.timestamp}
        >
          {#if isUser}
            <span class="message-user">{message.userName || 'Anonymous'}:</span>
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
    background-color: rgba(255, 255, 255, 0.85);
    border-radius: 0.5rem;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    overflow: hidden;
    box-shadow: 0 0.2em 1em rgba(0, 0, 0, 0.1);
    text-shadow: 0 0 0.15em rgba(255, 255, 255, 0.7);
    color: rgba(0, 0, 0, 0.8);
    border: 0.05em solid rgba(255, 255, 255, 0.2);
    width: min(400px, 90vw);
    max-height: 50vh;
  }
  
  .chat-container.closing {
    opacity: 0;
    transform: translateY(20px);
    pointer-events: none;
    transition: opacity 300ms ease, transform 300ms ease;
  }
  
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background-color: rgba(0, 0, 0, 0.05);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    font-family: var(--font-heading);
    flex-shrink: 0;
  }
  
  .chat-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.8);
  }
  
  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(0, 0, 0, 0.6);
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-button:hover {
    color: rgba(0, 0, 0, 0.9);
  }
  
  .chat-filters {
    display: flex;
    gap: 0.25rem;
    padding: 0.3rem 0.5rem;
    background-color: rgba(0, 0, 0, 0.04);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .filter-btn {
    font-size: 0.72rem;
    padding: 0.15rem 0.55rem;
    border-radius: 0.9rem;
    border: 1px solid rgba(0, 0, 0, 0.18);
    background: rgba(255, 255, 255, 0.6);
    color: rgba(0, 0, 0, 0.65);
    cursor: pointer;
    font-family: var(--font-body);
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }

  .filter-btn:hover {
    background: rgba(0, 0, 0, 0.08);
    color: rgba(0, 0, 0, 0.85);
  }

  .filter-btn.active {
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    border-color: transparent;
  }

  .chat-messages {
    padding: 0.5rem;
    overflow-y: auto;
    flex: 1;
    max-height: 300px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .chat-input-form {
    display: flex;
    padding: 0.5rem;
    gap: 0.5rem;
    background-color: rgba(0, 0, 0, 0.05);
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }
  
  .chat-input-form input {
    flex: 1;
    padding: 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid rgba(0, 0, 0, 0.2);
    background-color: rgba(255, 255, 255, 0.8);
    color: rgba(0, 0, 0, 0.8);
  }
  
  .chat-input-form button {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    border: none;
    background-color: #4a7dca;
    color: white;
    cursor: pointer;
  }
  
  .chat-input-form button:hover:not(:disabled) {
    background-color: #5a8dda;
  }
  
  .chat-input-form button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Messages styling */
  .chat-message {
    padding: 0.5rem;
    border-radius: 0.25rem;
    background-color: rgba(255, 255, 255, 0.5);
    word-break: break-word;
    position: relative;
    animation: fadeIn 0.2s ease;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .system-message {
    background-color: rgba(200, 200, 255, 0.5);
    font-style: italic;
    border: 1px solid rgba(100, 100, 255, 0.3);
  }
  
  .event-message {
    background-color: rgba(255, 200, 200, 0.5);
    border: 1px solid rgba(255, 100, 100, 0.3);
  }

  .monster-message {
    background-color: rgba(255, 160, 60, 0.18);
    border: 1px solid rgba(200, 100, 0, 0.3);
    color: rgba(120, 50, 0, 0.9);
  }
  
  .player-message {
    background-color: rgba(200, 255, 200, 0.5);
    border: 1px solid rgba(100, 255, 100, 0.3);
  }
  
  .error {
    background-color: rgba(255, 200, 200, 0.5);
    border: 1px solid rgba(255, 100, 100, 0.3);
    color: #c62828;
  }
  
  .message-user {
    font-weight: bold;
    margin-right: 0.5rem;
    color: rgba(0, 0, 0, 0.85);
  }
  
  .message-text {
    display: inline;
    color: rgba(0, 0, 0, 0.8);
  }
  
  .message-time {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.5);
    margin-left: 0.5rem;
    white-space: nowrap;
  }
  
  .location-button {
    background: rgba(0, 0, 0, 0.1);
    border: none;
    border-radius: 0.25rem;
    padding: 0.1rem 0.3rem;
    font-size: 0.8rem;
    cursor: pointer;
    margin-left: 0.3rem;
    color: rgba(0, 0, 0, 0.7);
  }
  
  .location-button:hover {
    background: rgba(0, 0, 0, 0.2);
    color: rgba(0, 0, 0, 0.9);
  }
  
  :global(.close-icon) {
    width: 1.2rem;
    height: 1.2rem;
  }
  
  /* Responsive design */
  @media (max-width: 600px) {
    .chat-container {
      width: 85vw;
      max-height: 40vh;
    }
    
    .chat-messages {
      max-height: 200px;
    }
  }
</style>
