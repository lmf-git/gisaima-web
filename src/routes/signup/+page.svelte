<script>
    import { signUp, signInAnonymously } from '$lib/stores/user';
    import { goto } from '$app/navigation';
    import { user, loading as userLoading } from '$lib/stores/user';
    import { browser } from '$app/environment';
    
    // Convert all variables to use $state
    let email = $state('');
    let password = $state('');
    let confirmPassword = $state('');
    let passwordMode = $state(false);  // Default to passwordless sign-in
    let error = $state(null);
    let loading = $state(false);
    let success = $state(false);
    let successMessage = $state('');
    
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
        
        if (passwordMode && password !== confirmPassword) {
            error = "Passwords don't match";
            return;
        }
        
        loading = true;
        const result = await signUp(email, passwordMode ? password : null);
        loading = false;
        
        if (result.success) {
            if (result.emailLink) {
                success = true;
                successMessage = `A sign-in link has been sent to ${email}. Please check your email to complete your registration.`;
            } else {
                goto('/worlds');
            }
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
    
    const togglePasswordMode = () => {
        passwordMode = !passwordMode;
        if (!passwordMode) {
            password = '';
            confirmPassword = '';
        }
    };
</script>

{#if $userLoading || $user === null}
    <div class="signup-container">
        <h1>Join Gisaima</h1>
        
        {#if error}
            <div class="error">{ error }</div>
        {/if}
        
        {#if success}
            <div class="success">
                <p>{ successMessage }</p>
                <p class="sub-message">Check your inbox and spam folder for the sign-in link.</p>
            </div>
        {:else}
            <form onsubmit={handleSubmit}>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input 
                        type="email" 
                        id="email" 
                        bind:value={email} 
                        required
                        placeholder="your.email@example.com"
                    />
                </div>
                
                <div class="auth-toggle">
                    <div class="toggle-buttons">
                        <button 
                            type="button"
                            class="toggle-button" 
                            class:active={!passwordMode}
                            onclick={() => togglePasswordMode()}
                            disabled={loading}
                        >
                            Passwordless
                        </button>
                        <button 
                            type="button"
                            class="toggle-button" 
                            class:active={passwordMode}
                            onclick={() => togglePasswordMode()}
                            disabled={loading}
                        >
                            With Password
                        </button>
                    </div>
                    <small class="help-text">
                        {passwordMode
                            ? 'You will sign in with email and password.'
                            : 'You will receive a secure login link via email when signing in.'}
                    </small>
                </div>
                
                {#if passwordMode}
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            bind:value={password} 
                            required={passwordMode}
                            minlength="6"
                            placeholder="Minimum 6 characters"
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password</label>
                        <input 
                            type="password" 
                            id="confirmPassword" 
                            bind:value={confirmPassword} 
                            required={passwordMode}
                            placeholder="Re-enter your password"
                        />
                    </div>
                {/if}
                
                <button type="submit" class="primary" disabled={loading || !email || (passwordMode && (!password || password.length < 6 || password !== confirmPassword))}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>
            </form>
            
            <div class="separator">
                <span>or</span>
            </div>
            
            <button type="button" class="secondary" onclick={handleAnonymousLogin} disabled={loading}>
                {loading ? 'Logging in...' : 'Continue as Guest'}
            </button>
        {/if}
        
        <p class="login-link">Already have an account? <a href="/login">Login</a></p>
    </div>
{:else}
    <div class="redirecting-message">
        <p>You are already logged in. Redirecting...</p>
    </div>
{/if}

<style>
    .signup-container {
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

    .form-group { margin-bottom: 1.4em; }

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

    .help-text {
        display: block;
        margin-top: 0.4em;
        color: var(--color-ink-500);
        font-family: var(--font-editorial);
        font-style: italic;
        font-size: 0.85em;
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

    .login-link {
        text-align: center;
        margin-top: 1.5em;
        font-family: var(--font-editorial);
        font-style: italic;
        color: var(--color-ink-500);
    }

    a {
        color: var(--color-wax-red);
        text-decoration: none;
        font-family: var(--font-display);
        font-size: 0.85em;
        letter-spacing: 0.06em;
        font-style: normal;
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

    @media (max-width: 480px) {
        .signup-container {
            width: calc(100% - 2em);
            padding: 1.25em;
            margin: 5em 1em 1em; /* Adjusted margin for mobile */
            box-sizing: border-box;
        }
        
        h1 {
            font-size: 1.5em;
            margin-bottom: 1em;
        }

        .form-group {
            margin-bottom: 1em;
        }

        button {
            padding: 0.6em;
            font-size: 1em;
        }

        .separator {
            margin: 1em 0;
        }

        .help-text {
            font-size: 0.8em;
        }
    }

    .separator {
        display: flex;
        align-items: center;
        text-align: center;
        margin: 1.5em 0;
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
        margin-top: 0;
    }
    button.secondary:hover { background: var(--color-parchment-200); }

    button:disabled { opacity: 0.55; cursor: not-allowed; }

    .auth-toggle { margin-bottom: 1.5em; }

    .toggle-buttons {
        display: flex;
        border: 1px solid var(--color-ink-900);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 0.5em;
    }

    .toggle-button {
        flex: 1;
        padding: 0.6em;
        background: transparent;
        border: none;
        border-right: 1px solid var(--color-ink-900);
        color: var(--color-ink-700);
        font-family: var(--font-display);
        font-size: 0.7em;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        margin: 0;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
    }

    .toggle-button:last-child { border-right: none; }

    .toggle-button.active {
        background-color: var(--color-ink-900);
        color: var(--color-parchment-100);
    }

    .toggle-button:hover:not(.active):not(:disabled) {
        background-color: var(--color-parchment-200);
    }

    .success {
        background-color: rgba(63, 90, 78, 0.12);
        color: var(--color-sage-deep);
        padding: 1em;
        margin-bottom: 1.5em;
        border-left: 3px solid var(--color-sage-deep);
        text-align: center;
        font-family: var(--font-editorial);
        font-style: italic;
    }

    .success p { margin: 0; }
    .success .sub-message { font-size: 0.9em; margin-top: 0.5em; opacity: 0.8; }

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
</style>
