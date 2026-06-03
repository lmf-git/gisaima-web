<script>
  import Close from '../icons/Close.svelte';
  import Chevron from '../icons/Chevron.svelte';
  import { signUp } from '../../lib/stores/user';
  
  const { onClose, animatingOut = false } = $props();
  
  // Form state
  let email = $state('');
  let password = $state('');
  let usePassword = $state(false);
  let isSubmitting = $state(false);
  let error = $state(null);
  let success = $state(false);
  let successMessage = $state('');
  
  // Handle form submission
  async function handleUpgrade(e) {
    e.preventDefault();
    error = null;
    isSubmitting = true;
    
    try {
      // Call user upgrade function
      const result = await signUp(email, usePassword ? password : null, true);
      
      if (result.success) {
        success = true;
        // Show different success message for passwordless vs password
        if (result.emailLink) {
          successMessage = `A sign-in link has been sent to ${email}. Please check your email to complete account upgrade.`;
        } else {
          successMessage = 'Account upgraded successfully! You can now log in using your email and password.';
        }
        setTimeout(() => {
          onClose?.();
        }, 3000);
      } else {
        error = result.error;
      }
    } catch (err) {
      error = err.message || 'An unexpected error occurred';
    } finally {
      isSubmitting = false;
    }
  }
  
  // Toggle password visibility
  function togglePassword() {
    usePassword = !usePassword;
    if (!usePassword) {
      password = '';
    }
  }
</script>

<!-- Add backdrop that covers the full screen -->
<div class={`warning-backdrop ${animatingOut ? 'animate-out' : 'animate-in'}`}>
</div>

<div class={`guest-warning ${animatingOut ? 'animate-out' : 'animate-in'}`}>
  <div class="warning-header">
    <h2>Convert Account</h2>
    <button class="close-btn" aria-label="Close dialog" onclick={onClose}>
      <Close size="2.2em" extraClass="close-icon-light" />
    </button>
  </div>
  
  <div class="warning-content">
    {#if success}
      <div class="success-message">
        <p>{successMessage}</p>
      </div>
    {:else}
      <div class="warning-message">
        <p>You're currently using a temporary guest account that will be deleted after 30 days of inactivity. To save your progress, please provide your email address.</p>
      </div>
      
      {#if error}
        <div class="error-message">
          {error}
        </div>
      {/if}
      
      <form onsubmit={handleUpgrade} class="upgrade-form">
        <div class="form-group">
          <label for="email">Email Address</label>
          <input 
            type="email" 
            id="email" 
            bind:value={email}
            required
            placeholder="your.email@example.com"
            disabled={isSubmitting}
          />
        </div>
        
        <div class="password-option">
          <button
            type="button"
            class="password-toggle-btn"
            onclick={togglePassword}>
            <span>Set a password (optional)</span>
            <Chevron size="0.9em" direction={usePassword ? 'down' : 'right'} />
          </button>
        </div>
        
        {#if usePassword}
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              bind:value={password}
              required={usePassword}
              placeholder="Minimum 6 characters"
              disabled={isSubmitting}
            />
          </div>
        {/if}
        
        <div class="form-actions">
          <button type="button" class="later-btn" onclick={onClose} disabled={isSubmitting}>
            Later
          </button>
          <button type="submit" class="upgrade-btn" disabled={isSubmitting || (usePassword && (!password || password.length < 6)) || !email}>
            {#if isSubmitting}
              <div class="spinner"></div>
              Saving...
            {:else}
              Save
            {/if}
          </button>
        </div>
      </form>
      
      <p class="note">You can continue using the app as a guest for now and upgrade later.</p>
    {/if}
  </div>
</div>

<style>
  .warning-backdrop {
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

  .guest-warning {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 30em;
    max-height: 90vh;
    overflow-y: auto;
    background: var(--color-parchment-100);
    border: 1px solid var(--color-ink-900);
    border-radius: 0;
    box-shadow: 0 2em 5em rgba(0, 0, 0, 0.35);
    padding: 1.8em 2em;
    z-index: 1000;
    color: var(--color-ink-900);
    font-family: var(--font-body);
  }

  .warning-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5em;
    padding-bottom: 1em;
    border-bottom: 1px solid var(--color-parchment-shadow);
  }

  .warning-header h2 {
    color: var(--color-ink-900);
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.04em;
    font-size: 1.5em;
  }

  .close-btn {
    height: 3em;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--color-ink-900);
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s ease;
    padding: 0;
  }

  .close-btn:hover {
    opacity: 1;
  }

  .close-btn > :global(.close-icon-light) {
    color: var(--color-ink-900);
    stroke: var(--color-ink-900);
  }

  .warning-content {
    display: flex;
    flex-direction: column;
    gap: 1.2em;
  }

  .warning-message p {
    margin: 0 0 0.8em 0;
    line-height: 1.5;
  }

  .success-message {
    text-align: center;
    background: rgba(111, 140, 122, 0.12);
    padding: 1em;
    border-radius: 2px;
    border: 1px solid var(--color-sage);
  }

  .success-message p {
    margin: 0;
    color: var(--color-sage-deep);
    font-weight: 600;
  }

  .error-message {
    background-color: rgba(154, 51, 32, 0.08);
    color: var(--color-wax-red);
    padding: 0.75em;
    border-radius: 2px;
    margin: 0.5em 0;
    border: 1px solid var(--color-vermilion);
    font-family: var(--font-editorial);
    font-style: italic;
  }

  .upgrade-form {
    display: flex;
    flex-direction: column;
    gap: 1em;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .form-group label {
    font-family: var(--font-display);
    font-size: 0.72em;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-ink-700);
  }

  .form-group input {
    padding: 0.75em 0.9em;
    background: var(--color-parchment-200);
    color: var(--color-ink-900);
    border: 1px solid var(--color-parchment-shadow);
    border-radius: 2px;
    font-size: 1em;
    font-family: var(--font-body);
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--color-ink-900);
    background: var(--color-parchment-100);
  }

  .password-option {
    display: flex;
    align-items: center;
    margin: 0.5em 0;
  }

  .password-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    background: none;
    border: none;
    padding: 0;
    color: var(--color-wax-red);
    font-family: var(--font-editorial);
    font-style: italic;
    font-size: inherit;
    cursor: pointer;
    text-align: left;
  }

  .password-toggle-btn :global(.chevron-icon) {
    flex-shrink: 0;
  }

  .password-toggle-btn:hover {
    text-decoration: underline;
  }

  .password-toggle-btn:focus {
    outline: 1px dotted var(--color-wax-red);
    outline-offset: 2px;
  }

  .form-actions {
    display: flex;
    justify-content: space-between;
    gap: 1em;
    margin-top: 0.5em;
  }

  .later-btn,
  .upgrade-btn {
    padding: 0.75em 1.5em;
    border-radius: 2px;
    cursor: pointer;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.78em;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    transition: background 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
  }

  .later-btn {
    background: transparent;
    color: var(--color-ink-900);
    border: 1px solid var(--color-ink-900);
  }

  .upgrade-btn {
    background-color: var(--color-ink-900);
    color: var(--color-parchment-100);
    border: 1px solid var(--color-ink-900);
  }

  .later-btn:hover:not(:disabled) {
    background: rgba(26, 32, 48, 0.06);
  }

  .upgrade-btn:hover:not(:disabled) {
    background-color: var(--color-ink-700);
  }

  .upgrade-btn:disabled,
  .later-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .note {
    font-size: 0.85em;
    text-align: center;
    color: var(--color-ink-500);
    font-family: var(--font-editorial);
    font-style: italic;
    margin-top: 0.5em;
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
  
  /* Animation classes */
  .animate-in {
    animation: fadeIn 0.3s ease forwards;
  }
  
  .animate-out {
    animation: fadeOut 0.3s ease forwards;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  
  /* Mobile adjustments */
  @media (max-width: 768px) {
    .guest-warning {
      padding: 1.5em;
      width: 95%;
      max-height: 90vh;
      overflow-y: auto;
    }
    
    .warning-header h2 {
      font-size: 1.2em;
    }
  }
</style>
