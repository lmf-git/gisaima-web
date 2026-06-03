<script>
    import SignOut from './icons/SignOut.svelte';
    import { theme, toggleTheme } from '$lib/stores/theme.js';

    // Props - add class property
    const { onClose, currentPath, user, signOut, animatingOut = false, class: className = '' } = $props();
</script>

<!-- Add backdrop that covers the full screen -->
<div
    class={`menu-backdrop ${animatingOut ? 'animate-out' : 'animate-in'}`}
    onclick={onClose}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
    role="button"
    tabindex="-1"
    aria-label="Close menu"
>
</div>

<div class={`mobile-menu ${className}`}>
    <div class={`mobile-menu-header ${animatingOut ? 'animate-out' : 'animate-item'}`}
         style={animatingOut ? 'animation-delay: 0.2s;' : ''}>
        <h2>Menu</h2>
    </div>

    <nav class="mobile-nav">
        {#if currentPath !== '/'}
            <a href="/"
               onclick={onClose}
               class={animatingOut ? 'animate-out' : 'animate-item'}
               class:active={currentPath === '/'}
               style={animatingOut ? 'animation-delay: 0.15s;' : ''}
            >Home</a>
        {/if}

        {#if currentPath !== '/guide'}
            <a href="/guide"
               onclick={onClose}
               class={animatingOut ? 'animate-out' : 'animate-item'}
               class:active={currentPath === '/guide'}
               style={animatingOut ? 'animation-delay: 0.125s;' : ''}
            >Guide</a>
        {/if}

        <!-- Only show worlds link if user is logged in -->
        {#if user && currentPath !== '/worlds'}
            <a href="/worlds"
               onclick={onClose}
               class={animatingOut ? 'animate-out' : 'animate-item'}
               class:active={currentPath === '/worlds'}
               style={animatingOut ? 'animation-delay: 0.1s;' : ''}
            >Worlds</a>
        {/if}
    </nav>

    <div class={`mobile-auth ${animatingOut ? 'animate-out' : 'animate-item'}`}
         style={animatingOut ? 'animation-delay: 0s;' : ''}>
        <!-- Theme switch — available to everyone, signed in or not. -->
        <button class="mobile-theme" onclick={toggleTheme} aria-label="Toggle light or dark theme">
            {#if $theme === 'dark'}
                <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="4.5" />
                    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
                </svg>
                <span>Light mode</span>
            {:else}
                <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
                <span>Dark mode</span>
            {/if}
        </button>

        {#if user}
            <div class="mobile-user-info">
                <p>Signed in as:</p>
                <p class="user-email">{user.isAnonymous ? 'Guest' : (user.displayName || user.email)}</p>
            </div>
            <button class="mobile-signout" onclick={signOut}>
                <SignOut size="1.2em" extraClass="icon-signout" />
                <span>Sign Out</span>
            </button>
        {:else}
            <div class="auth-buttons">
                <a href="/login" onclick={onClose} class="login">Log In</a>
                <a href="/signup" onclick={onClose} class="signup">Sign Up</a>
            </div>
        {/if}
    </div>
</div>

<style>
    .mobile-menu {
        position: absolute; /* Position absolutely */
        top: 100%; /* Position below header */
        left: 1rem; /* Spacing from left edge */
        right: 1rem; /* Spacing from right edge */
        max-width: 500px; /* Limit the maximum width */
        margin: 0 auto; /* Center the menu */
        box-sizing: border-box; /* Include padding in width */
        background-color: var(--color-panel-bg);
        border: 0.075em solid var(--color-panel-border);
        border-top: none;
        border-bottom-left-radius: 2px;
        border-bottom-right-radius: 2px;
        box-shadow: 0 0.625em 1.875em var(--color-shadow);
        padding: 1.5em;
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 60px);
        overflow-y: auto;
        z-index: 100; /* Ensure proper z-index */
        color: var(--color-text);
    }

    .mobile-menu-header {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 1.5em;
        padding-bottom: 1em;
        border-bottom: 0.075em solid var(--color-panel-border);
    }

    .mobile-menu-header h2 {
        color: var(--color-heading);
        margin: 0;
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 0.9em;
        letter-spacing: 0.22em;
        text-transform: uppercase;
    }

    .mobile-nav {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
        margin-bottom: 1.5em;
    }

    .mobile-nav a {
        color: var(--color-text-secondary);
        text-decoration: none;
        font-size: 1em;
        padding: 0.85em 0.75em;
        border-radius: 2px;
        transition: color 0.2s ease, background-color 0.2s ease;
        font-family: var(--font-display);
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        text-align: center;
    }

    .mobile-nav a:hover,
    .mobile-nav a.active {
        color: var(--color-bright-accent);
        background-color: var(--color-button-secondary);
    }

    .mobile-auth {
        margin-top: auto;
        padding-top: 1.5em;
        border-top: 0.075em solid var(--color-panel-border);
        display: flex;
        flex-direction: column;
        gap: 1em;
    }

    .mobile-theme {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6em;
        padding: 0.8em;
        background: transparent;
        color: var(--color-text-secondary);
        border: 0.075em solid var(--color-panel-border);
        border-radius: 2px;
        font-family: var(--font-display);
        font-size: 0.72em;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        cursor: pointer;
        transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
    }
    .mobile-theme:hover {
        color: var(--color-heading);
        border-color: var(--color-heading);
        background: var(--color-button-secondary);
    }
    .mobile-theme svg { flex-shrink: 0; }

    .mobile-user-info {
        text-align: center;
        font-family: var(--font-body);
    }
    .mobile-user-info p { margin: 0; color: var(--color-text-secondary); font-size: 0.95em; }

    .user-email {
        color: var(--color-bright-accent);
        font-weight: 600;
        margin-top: 0.25em;
        word-break: break-all;
        font-family: var(--font-mono);
        font-size: 0.9em;
    }

    .mobile-signout {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5em;
        padding: 0.8em;
        background-color: transparent;
        color: var(--color-link);
        border: 0.075em solid var(--color-panel-border);
        border-radius: 2px;
        font-family: var(--font-display);
        font-size: 0.72em;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        cursor: pointer;
        transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
    }

    .mobile-signout:hover {
        color: var(--color-bright-accent);
        border-color: var(--color-bright-accent);
        background-color: var(--color-button-secondary);
    }

    .auth-buttons {
        display: flex;
        flex-direction: column;
        gap: 0.75em;
    }

    .auth-buttons .login,
    .auth-buttons .signup {
        width: 100%;
        padding: 0.85em;
        text-align: center;
        text-decoration: none;
        border-radius: 2px;
        font-family: var(--font-display);
        font-size: 0.78em;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        transition: all 0.2s ease;
    }

    .auth-buttons .login {
        color: var(--color-heading);
        border: 0.075em solid var(--color-heading);
        background-color: transparent;
    }

    .auth-buttons .signup {
        background-color: var(--color-button-primary);
        color: var(--color-background);
        border: 0.075em solid var(--color-button-primary);
    }

    .auth-buttons .login:hover,
    .auth-buttons .signup:hover {
        transform: translateY(-0.125em);
        box-shadow: 0 0.25em 0.5em var(--color-shadow);
    }

    :global(.mobile-signout .icon-signout) {
        color: currentColor;
        fill: currentColor;
        stroke: currentColor;
    }

    /* Animation for individual menu items */
    .animate-item {
        opacity: 0;
        transform: translateY(10px);
        animation: fadeIn 0.3s ease forwards;
    }

    .animate-out {
        opacity: 1;
        transform: translateY(0);
        animation: fadeOut 0.3s ease forwards;
    }

    .mobile-nav a.animate-item:nth-child(1) {
        animation-delay: 0.1s;
    }

    .mobile-nav a.animate-item:nth-child(2) {
        animation-delay: 0.15s;
    }

    .mobile-auth.animate-item {
        animation-delay: 0.2s;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(10px);
        }
    }

    /* Add backdrop styling */
    .menu-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--color-backdrop, rgba(10, 25, 47, 0.55));
        backdrop-filter: blur(2px);
        z-index: 99; /* Below menu but above other content */
        cursor: pointer;
    }

    /* Animation for backdrop */
    .menu-backdrop.animate-in {
        opacity: 0;
        animation: backdropFadeIn 0.3s ease forwards;
    }

    .menu-backdrop.animate-out {
        opacity: 1;
        animation: backdropFadeOut 0.3s ease forwards;
    }

    @keyframes backdropFadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes backdropFadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
</style>
