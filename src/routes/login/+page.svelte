<script>
    import { signIn, signInAnonymously } from '$lib/stores/user';
    import { goto } from '$app/navigation';
    import { user, loading as userLoading } from '$lib/stores/user';
    import { browser } from '$app/environment';
    
    // Convert variables to use $state
    let email = $state('');
    let password = $state('');
    let error = $state(null);
    let loading = $state(false);
    // Add effect to redirect authenticated users
    $effect(() => {
        if (browser && !$userLoading && $user) {
            // User is already authenticated, redirect to worlds page
            goto('/worlds');
        }
    });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        error = null;
        loading = true;
        
        const result = await signIn(email, password);
        
        loading = false;
        if (result.success) {
            goto('/worlds');
        } else {
            error = result.error;
        }
    };
    
    const handleAnonymousLogin = async () => {
        error = null;
        loading = true;
        
        const result = await signInAnonymously();
        
        loading = false;
        if (result.success) {
            goto('/worlds');
        } else {
            error = result.error;
        }
    };


</script>

{#if $userLoading || $user === null}
    <div class="login-container">
        <h1>Login to Gisaima</h1>
        
        {#if error}
            <div class="error">{error}</div>
        {/if}
        
        <form onsubmit={handleSubmit}>
            <div class="form-group">
                <label for="email">Email</label>
                <input 
                    type="email" 
                    id="email" 
                    bind:value={email} 
                    required
                />
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    bind:value={password} 
                    required
                />
            </div>
            
            <button type="submit" class="primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
            </button>
        </form>
        
        <div class="separator">
            <span>or</span>
        </div>

        <button type="button" class="secondary" onclick={handleAnonymousLogin} disabled={loading}>
            {loading ? 'Logging in...' : 'Continue as Guest'}
        </button>
        
        <p class="signup-link">Don't have an account? <a href="/signup">Sign Up</a></p>
    </div>
{:else}
    <div class="redirecting-message">
        <p>You are already logged in. Redirecting...</p>
    </div>
{/if}

<style>
    .login-container {
        max-width: 26em;
        width: 100%;
        padding: 2.5em;
        background-color: var(--color-parchment-100);
        border: 1px solid var(--color-ink-900);
        box-shadow: 0 1em 3em rgba(0, 0, 0, 0.15);
        color: var(--color-ink-900);
        margin: 7em auto 2em;
        position: relative;
        z-index: 2;
    }

    h1 {
        margin: 0 0 1.5em;
        text-align: center;
        color: var(--color-ink-900);
        font-size: 1.8em;
        font-family: var(--font-display);
        font-weight: 600;
        letter-spacing: 0.06em;
    }

    .form-group {
        margin-bottom: 1.4em;
    }

    label {
        display: block;
        margin-bottom: 0.4em;
        font-family: var(--font-display);
        font-size: 0.7em;
        font-weight: 600;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--color-ink-700);
    }

    input {
        width: 100%;
        padding: 0.7em 0.85em;
        background: var(--color-parchment-200);
        color: var(--color-ink-900);
        border: 1px solid var(--color-parchment-shadow);
        border-radius: 2px;
        font-size: 1em;
        font-family: var(--font-body);
        transition: border-color 0.2s ease;
    }

    input:focus {
        outline: none;
        border-color: var(--color-ink-900);
        background: var(--color-parchment-100);
    }

    button {
        width: 100%;
        padding: 0.8em;
        background-color: var(--color-ink-900);
        color: var(--color-parchment-100);
        border: 1px solid var(--color-ink-900);
        border-radius: 2px;
        font-size: 0.85em;
        font-family: var(--font-display);
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        cursor: pointer;
        margin-top: 1em;
        transition: background 0.2s ease;
    }

    button:hover { background-color: var(--color-ink-700); }

    .signup-link {
        text-align: center;
        margin-top: 1.5em;
        font-family: var(--font-editorial);
        font-style: italic;
        color: var(--color-ink-500);
    }

    a {
        color: var(--color-wax-red);
        text-decoration: none;
        font-style: normal;
        font-family: var(--font-display);
        font-size: 0.85em;
        letter-spacing: 0.06em;
    }

    a:hover { color: var(--color-vermilion-2); }

    .error {
        background-color: rgba(154, 51, 32, 0.12);
        color: var(--color-wax-red);
        padding: 0.75em;
        margin-bottom: 1.4em;
        border-left: 3px solid var(--color-wax-red);
        font-family: var(--font-editorial);
        font-style: italic;
    }

    .redirecting-message {
        max-width: 26em;
        width: 100%;
        padding: 2.5em;
        text-align: center;
        color: var(--color-ink-700);
        font-family: var(--font-editorial);
        font-style: italic;
        margin: 8em auto 0;
    }

    .separator {
        display: flex;
        align-items: center;
        text-align: center;
        margin: 1.5em 0;
        width: 100%;
    }

    .separator::before,
    .separator::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid rgba(26, 32, 48, 0.18);
    }

    .separator span {
        padding: 0 0.9em;
        font-family: var(--font-display);
        font-size: 0.7em;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--color-ink-500);
    }

    button.secondary {
        background-color: transparent;
        border: 1px solid var(--color-ink-900);
        color: var(--color-ink-900);
    }
    button.secondary:hover {
        background: var(--color-parchment-200);
    }

    button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    @media (max-width: 480px) {
        .login-container {
            width: calc(100% - 2em);
            padding: 1.5em;
            margin: 6em 1em 1em;
            box-sizing: border-box;
        }
        h1 { font-size: 1.5em; margin-bottom: 1em; }
    }
</style>
