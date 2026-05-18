<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { handleEmailLink } from '$lib/stores/user';
  import { browser } from '$app/environment';
  
  let processing = $state(true);
  let error = $state(null);
  let email = $state('');
  
  onMount(async () => {
    if (browser) {
      try {
        processing = true;
        const result = await handleEmailLink();
        
        if (result.success) {
          // Redirect to worlds page instead of home page
          goto('/worlds');
        } else if (result.needsEmail) {
          processing = false;
          error = result.error;
        } else if (result.notEmailLink) {
          // Not an email sign-in link, redirect to home
          goto('/');
        } else {
          processing = false;
          error = result.error || 'Failed to sign in. Please try again.';
        }
      } catch (err) {
        processing = false;
        error = err.message || 'An unexpected error occurred';
        console.error('Error handling email link:', err);
      }
    }
  });
  
  async function handleSubmitEmail() {
    if (!email) {
      error = 'Please enter your email address';
      return;
    }
    
    try {
      processing = true;
      const result = await handleEmailLink(email);
      
      if (result.success) {
        // Redirect to worlds page instead of home page
        goto('/worlds');
      } else {
        processing = false;
        error = result.error || 'Failed to sign in. Please try again.';
      }
    } catch (err) {
      processing = false;
      error = err.message || 'An unexpected error occurred';
    }
  }
</script>

<div class="email-action-page">
  <div class="email-action-container">
    <h1>Email Sign In</h1>
    
    {#if processing}
      <div class="processing">
        <div class="spinner"></div>
        <p>Processing your sign-in link...</p>
      </div>
    {:else if error}
      <div class="error-container">
        <p class="error">{error}</p>
        
        {#if error.includes('Email not found')}
          <div class="email-form">
            <p>Please enter the email you used to request the sign-in link:</p>
            <div class="form-group">
              <input 
                type="email" 
                placeholder="Your email address" 
                bind:value={email} 
              />
            </div>
            <button onclick={handleSubmitEmail}>Continue</button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .email-action-page {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 6em);
    padding: 6em 0 2em;
  }

  .email-action-container {
    max-width: 26em;
    width: 100%;
    padding: 2.5em;
    background-color: var(--color-parchment-100);
    border: 1px solid var(--color-ink-900);
    border-radius: 0;
    box-shadow: 0 1em 3em rgba(0, 0, 0, 0.15);
    color: var(--color-ink-900);
    margin: 0 1em;
    text-align: center;
  }

  h1 {
    margin: 0 0 1.4em;
    color: var(--color-ink-900);
    font-size: 1.7em;
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  .processing { display: flex; flex-direction: column; align-items: center; gap: 1em; }

  .spinner {
    width: 2.4em;
    height: 2.4em;
    border: 0.2em solid rgba(26, 32, 48, 0.15);
    border-radius: 50%;
    border-top: 0.2em solid var(--color-wax-red);
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error {
    color: var(--color-wax-red);
    background-color: rgba(154, 51, 32, 0.08);
    padding: 0.75em 1em;
    border-radius: 0;
    margin-bottom: 1.4em;
    border-left: 3px solid var(--color-wax-red);
    font-family: var(--font-editorial);
    font-style: italic;
    text-align: left;
  }

  .email-form { margin-top: 1.5em; }
  .form-group { margin-bottom: 1.4em; text-align: left; }

  input {
    width: 100%;
    padding: 0.7em 0.85em;
    background: var(--color-parchment-200);
    color: var(--color-ink-900);
    border: 1px solid var(--color-parchment-shadow);
    border-radius: 2px;
    font-size: 1em;
    font-family: var(--font-body);
    margin-top: 0.4em;
    transition: border-color 0.15s ease;
  }
  input:focus { outline: none; border-color: var(--color-ink-900); background: var(--color-parchment-100); }

  button {
    padding: 0.8em;
    background-color: var(--color-ink-900);
    color: var(--color-parchment-100);
    border: 1px solid var(--color-ink-900);
    border-radius: 2px;
    font-size: 0.85em;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s ease;
    font-family: var(--font-display);
    width: 100%;
  }
  button:hover { background-color: var(--color-ink-700); }
</style>
