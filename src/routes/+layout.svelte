<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { user, signOut, loading as userLoading, guestConversionDue } from '$lib/stores/user';
    import { browser } from '$app/environment';
    import { headerRevealed, HEADER_REVEAL_MS } from '$lib/stores/ui.js';
    import Logo from '../components/Logo.svelte';
    import SignOut from '../components/icons/SignOut.svelte';
    import XIcon from '../components/icons/XIcon.svelte';
    import DiscordIcon from '../components/icons/DiscordIcon.svelte';
    import GitHubIcon from '../components/icons/GitHubIcon.svelte'; 
    import { isAuthReady, game } from '../lib/stores/game.js';
    import HamburgerIcon from '../components/icons/HamburgerIcon.svelte';
    import { theme, toggleTheme } from '$lib/stores/theme.js';
    import Stamp from '../components/ui/Stamp.svelte';

    // Routes that read from / write to a specific world. The world-context
    // strip surfaces under the layout header on each of these so the player
    // never loses track of which realm they're acting inside.
    const WORLD_SCOPED_PREFIXES = [
        '/rankings', '/trade', '/house',
        '/ransoms', '/trails', '/currency', '/banks', '/cosmetics',
        '/wealth', '/deaths', '/scouting', '/chronicle', '/reports', '/profile',
        '/settlement', '/pending', '/characters', '/items', '/friends'
    ];

    const { children } = $props();

    // State
    let mobileMenuOpen = $state(false);
    let menuAnimatingOut = $state(false);
    let logoAnimatingOut = $state(false);
    let showGuestWarning = $state(false);
    let guestWarningAnimatingOut = $state(false);
    let hasShownGuestWarning = $state(false);
    
    // Computed values for conditional rendering
    const isHomePage = $derived($page.url?.pathname === '/');
    const isMapPage = $derived($page.url?.pathname === '/map');
    const isLoginPage = $derived($page.url?.pathname === '/login');
    const isSignupPage = $derived($page.url?.pathname === '/signup');
    const isGuidePage = $derived($page.url?.pathname === '/guide');
    const isWorldScopedPage = $derived(
        WORLD_SCOPED_PREFIXES.some((p) => $page.url?.pathname?.startsWith(p))
    );
    // The dossier (WorldContextBar) is the unified top chrome across the
    // whole world-bound surface: every world-scoped route AND the map.
    const showDossier = $derived(isMapPage || isWorldScopedPage);
    
    function toggleMobileMenu() {
        if (mobileMenuOpen) {
            // Start close animation
            menuAnimatingOut = true;
            logoAnimatingOut = true;
            
            // Hide logo more quickly (after 150ms)
            setTimeout(() => {
                logoAnimatingOut = false;
            }, 150);
            
            // Remove menu after animation completes with additional time for staggered items
            setTimeout(() => {
                mobileMenuOpen = false;
                menuAnimatingOut = false;
            }, 500); // Extended to account for staggered animations
        } else {
            mobileMenuOpen = true;
        }
    }
    
    function closeMobileMenu() {
        if (mobileMenuOpen) {
            menuAnimatingOut = true;
            logoAnimatingOut = true;
            
            // Hide logo more quickly
            setTimeout(() => {
                logoAnimatingOut = false;
            }, 150);
            
            // Match the delay in toggleMobileMenu
            setTimeout(() => {
                mobileMenuOpen = false;
                menuAnimatingOut = false;
            }, 500); 
        }
    }

    // Derived state for UI loading conditions
    const headerLoading = $derived($userLoading || !$isAuthReady);

    // Conditionally-rendered chrome is dynamically imported so its JS + (render-
    // blocking) CSS stay off the home page's critical path. Each chunk is fetched
    // only the first time its trigger condition becomes true:
    //   • MobileMenu       — when the mobile menu is opened
    //   • GuestWarning     — for returning guests due a conversion nudge
    //   • WorldContextBar  } the world dossier — only on the map and world-scoped
    //   • LeftRail         } routes, never on the marketing site
    let MobileMenu = $state(null);
    let GuestWarning = $state(null);
    let WorldContextBar = $state(null);
    let LeftRail = $state(null);

    $effect(() => {
        if ((mobileMenuOpen || menuAnimatingOut) && !MobileMenu)
            import('../components/MobileMenu.svelte').then((m) => (MobileMenu = m.default));
    });
    $effect(() => {
        if (showDossier) {
            if (!WorldContextBar)
                import('../components/features/WorldContextBar.svelte').then((m) => (WorldContextBar = m.default));
            if (!LeftRail)
                import('../components/map/foundation/LeftRail.svelte').then((m) => (LeftRail = m.default));
        }
    });
    $effect(() => {
        if ((showGuestWarning || guestWarningAnimatingOut) && $user?.isGuest && !GuestWarning)
            import('../components/features/GuestWarning.svelte').then((m) => (GuestWarning = m.default));
    });

    // `worldKey` can be restored from localStorage before (or without) the
    // player ever having joined that world, so it's not enough on its own to
    // show the "return to map" pill. Only treat a world as the player's current
    // realm once it appears in their fetched joinedWorlds list.
    const hasCurrentWorld = $derived(
        !!$game?.worldKey &&
        Array.isArray($game?.joinedWorlds) &&
        $game.joinedWorlds.includes($game.worldKey)
    );

    // The header runs its staggered reveal once on first mount of the layout
    // (the layout persists across client-side navigation). Mark it done so
    // pages can skip the header offset on every subsequent navigation.
    onMount(() => {
        const t = setTimeout(() => headerRevealed.set(true), HEADER_REVEAL_MS);
        return () => clearTimeout(t);
    });

    // Nudge guests to convert once per day they return. The "should I prompt
    // today?" decision is made server-side (`guestConversionDue`, backed by
    // `lastConversionPrompt` on the user doc) so it survives localStorage loss
    // and can't be gamed by clearing the browser.
    $effect(() => {
        if (!browser) return;
        if (
            $user?.isGuest && $guestConversionDue && !hasShownGuestWarning &&
            !isMapPage && !isLoginPage && !isSignupPage
        ) {
            // Wait a bit before showing the warning to avoid overwhelming new users
            setTimeout(() => showGuestWarning = true, 3000);
        }
    });

    function closeGuestWarning() {
        guestWarningAnimatingOut = true;

        // Server already stamped today's prompt; clear the in-session flag so it
        // doesn't reopen until the next day's /auth/me marks it due again.
        hasShownGuestWarning = true;
        guestConversionDue.set(false);

        setTimeout(() => {
            showGuestWarning = false;
            guestWarningAnimatingOut = false;
        }, 300);
    }
</script>

<div class={`app ${isMapPage ? 'map' : ''} ${isHomePage ? 'home' : ''} ${isWorldScopedPage ? 'world-scoped' : ''}`}>
    <!-- The website chrome (logo / nav / auth) is hidden on:
           - the map page itself (it has its own HUD)
           - world-scoped routes (the WorldContextBar provides realm nav and the
             player is "inside" the world there, not browsing the marketing site). -->
    {#if !isMapPage && !isWorldScopedPage}
    <header class="header">
        <div class="logo">
            <a href="/" aria-label="Gisaima Home">
                <Logo extraClass="nav-logo" />
            </a>
        </div>

            <nav class="nav">
                <div class="links">
                    {#if !isGuidePage}
                        <a href="/guide" class:active={$page.url.pathname === '/guide'}>Guide</a>
                    {/if}
                    {#if $user && $page.url.pathname !== '/worlds' && !headerLoading}
                        <a href="/worlds" class:active={$page.url.pathname === '/worlds'}>Worlds</a>
                    {/if}
                </div>
            </nav>

            {#if $user && hasCurrentWorld && !headerLoading && !isWorldScopedPage}
                <a class="return-map-pill" href="/map" title={`Return to ${$game.worldKey}`}>
                    <Stamp kind="compass" size={13} />
                    <span class="text"><span class="pill-resume">Resume</span><span class="pill-map">Map</span> · <em>{$game.worldKey}</em></span>
                </a>
            {/if}
            
            <div class="auth" class:loading={headerLoading}>
                {#if !headerLoading}
                    {#if $user}
                        <div class="greeting">Hello, {$user.isAnonymous ? 'Guest' : ($user.displayName || $user.email.split('@')[0])}</div>
                        <!-- Removed sign out button from here -->
                    {:else}
                        <!-- Only show login link if not on login page and not on home page -->
                        {#if !isLoginPage && !isHomePage}
                            <a href="/login" class="login">Log In</a>
                        {/if}
                        
                        <!-- Only show signup link if not on signup page and not on home page -->
                        {#if !isSignupPage && !isHomePage}
                            <a href="/signup" class="signup">Sign Up</a>
                        {/if}
                    {/if}
                {/if}
            </div>

        <button class="mobile-menu-toggle" aria-label="Toggle Menu" onclick={toggleMobileMenu}>
            <HamburgerIcon
                size="2em"
                extraClass="hamburger-icon"
                active={mobileMenuOpen}
            />
        </button>

        {#if (mobileMenuOpen || menuAnimatingOut) && MobileMenu}
            <MobileMenu
                onClose={closeMobileMenu}
                currentPath={$page.url.pathname}
                user={$user}
                signOut={signOut}
                animatingOut={menuAnimatingOut}
                class={menuAnimatingOut ? 'animate-out' : 'animate-in'}
            />
        {/if}
    </header>
    {/if}

    <main class="main-content">
        {#if showDossier}
            {#if LeftRail}<LeftRail />{/if}
            {#if WorldContextBar}<WorldContextBar />{/if}
        {/if}
        {@render children?.()}
    </main>
    
    <!-- Shared site footer everywhere except the map (which has its own HUD). -->
    {#if !isMapPage}
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-section branding">
                    <div class="brand">
                        <a href="/" class="footer-logo" aria-label="Gisaima Home">
                            <Logo extraClass="footer-logo-icon" />
                        </a>
                        <h2 class="footer-title">isaima Realm</h2>
                    </div>
                    <p class="footer-tagline">Hardcore territory control. Free forever.</p>
                    <button
                        class="theme-toggle"
                        onclick={toggleTheme}
                        aria-label="Toggle light or dark theme"
                        title="Toggle light/dark theme"
                    >
                        {#if $theme === 'dark'}
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="4.5" />
                                <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
                            </svg>
                            <span>Light mode</span>
                        {:else}
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                            </svg>
                            <span>Dark mode</span>
                        {/if}
                    </button>
                </div>
                
                <div class="footer-nav">
                    <div class="footer-section">
                        <h3>Navigation</h3>
                        <div class="footer-links">
                            <a href="/">Home</a>
                            <a href="/guide">Guide</a>
                            {#if $user}
                                <a href="/worlds">Worlds</a>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="footer-section">
                        <h3>Account</h3>
                        <div class="footer-links">
                            {#if $user}
                                <button class="footer-signout social-link" onclick={signOut}>
                                    <SignOut size="16px" extraClass="social-icon" />
                                    <span>Sign Out</span>
                                </button>
                            {:else}
                                <a href="/login">Log In</a>
                                <a href="/signup">Sign Up</a>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="footer-section">
                        <h3>Socials</h3>
                        <div class="footer-links">
                            <a href="https://x.com/GisaimaGame" target="_blank" rel="noopener noreferrer" class="social-link">
                                <XIcon size="16px" extraClass="social-icon" />
                                <span>X (Twitter)</span>
                            </a>
                            <a href="https://discord.gg/ugmRXWNXbA" target="_blank" rel="noopener noreferrer" class="social-link">
                                <DiscordIcon size="18px" extraClass="social-icon" />
                                <span>Discord</span>
                            </a>
                            <a href="https://github.com/lmf-git/gisaima" target="_blank" rel="noopener noreferrer" class="social-link">
                                <GitHubIcon size="18px" extraClass="social-icon" />
                                <span>GitHub</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="footer-bottom">
                <p>&copy; {new Date().getFullYear()} Gisaima. All Knights Declared.</p>
            </div>
        </footer>
    {/if}

    <!-- Add the Guest Warning component -->
    {#if (showGuestWarning || guestWarningAnimatingOut) && $user?.isGuest && GuestWarning}
        <GuestWarning
            onClose={closeGuestWarning}
            animatingOut={guestWarningAnimatingOut}
        />
    {/if}
</div>

<style>

    @font-face {
        font-family: 'Cinzel';
        font-style: normal;
        font-weight: 400 900;
        font-display: swap;
        src: url('/fonts/cinzel.woff2') format('woff2'),
             url('/fonts/cinzel.ttf') format('truetype');
    }

    @font-face {
        font-family: 'EB Garamond';
        font-style: normal;
        font-weight: 400 800;
        font-display: swap;
        src: url('/fonts/ebgaramond.woff2') format('woff2'),
             url('/fonts/ebgaramond.ttf') format('truetype');
    }

    @font-face {
        font-family: 'EB Garamond';
        font-style: italic;
        font-weight: 400 800;
        font-display: swap;
        src: url('/fonts/ebgaramond-italic.woff2') format('woff2'),
             url('/fonts/ebgaramond-italic.ttf') format('truetype');
    }

    @font-face {
        font-family: 'IM Fell English';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url('/fonts/imfellenglish.woff2') format('woff2'),
             url('/fonts/imfellenglish.ttf') format('truetype');
    }

    @font-face {
        font-family: 'IM Fell English';
        font-style: italic;
        font-weight: 400;
        font-display: swap;
        src: url('/fonts/imfellenglish-italic.woff2') format('woff2'),
             url('/fonts/imfellenglish-italic.ttf') format('truetype');
    }

    @font-face {
        font-family: 'JetBrains Mono';
        font-style: normal;
        font-weight: 100 800;
        font-display: swap;
        src: url('/fonts/jetbrainsmono.woff2') format('woff2'),
             url('/fonts/jetbrainsmono.ttf') format('truetype');
    }

    @font-face {
        font-family: 'JetBrains Mono';
        font-style: italic;
        font-weight: 100 800;
        font-display: swap;
        src: url('/fonts/jetbrainsmono-italic.woff2') format('woff2'),
             url('/fonts/jetbrainsmono-italic.ttf') format('truetype');
    }

    :global(*) {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        scrollbar-width: none;       /* Firefox */
        -ms-overflow-style: none;    /* IE / old Edge */
    }
    :global(*::-webkit-scrollbar) {  /* WebKit / Blink */
        width: 0;
        height: 0;
        display: none;
    }
    
    :global(:root) {
        /* Parchment & Ink */
        --color-parchment-100: #fbf6e7;
        --color-parchment-200: #f5ecd1;
        --color-parchment-300: #ecdfb6;
        --color-parchment-400: #d9c89a;
        --color-ink-300: #7d7b6f;
        --color-ink-400: #646678;
        --color-ink-500: #4b5267;
        --color-ink-700: #2d3548;
        --color-ink-900: #1a2030;
        --color-ink-1000: #0e1320;
        --color-sage: #6f8c7a;
        --color-sage-deep: #3f5a4e;
        --color-sage-pale: #b8c9b3;

        /* Heraldic Accents */
        --color-vermilion: #9a3320;
        --color-vermilion-2: #c14a2f;
        --color-wax-red: #5b1a1f;
        --color-aged-gold: #b08d4a;
        --color-gold-pale: #d4b170;
        --color-teal-deep: #16393f;

        /* Semantic mappings — default to parchment (light) context.
           Routes that use dark backgrounds (`.app.map`, `.app.home`) override
           these below so old components still read correctly on dark. */
        --color-background: var(--color-parchment-200);
        --color-background-gradient-start: var(--color-parchment-100);
        --color-background-gradient-end: var(--color-parchment-300);
        --color-text-primary: var(--color-ink-900);
        --color-text-secondary: var(--color-ink-500);
        --color-text: var(--color-ink-900);
        --color-heading: var(--color-ink-900);
        --color-subheading: var(--color-ink-500);
        --color-panel-bg: var(--color-parchment-100);
        --color-panel-border: rgba(26, 32, 48, 0.2);
        --color-card-bg: var(--color-parchment-100);
        --color-card-border: rgba(26, 32, 48, 0.2);
        --color-link: var(--color-wax-red);
        --color-link-hover: var(--color-vermilion-2);
        --color-shadow: rgba(0, 0, 0, 0.15);
        --color-button: var(--color-ink-900);
        --color-button-hover: var(--color-ink-700);
        --color-button-primary: var(--color-ink-900);
        --color-button-primary-hover: var(--color-ink-700);
        --color-button-secondary: var(--color-parchment-200);
        --color-button-secondary-hover: var(--color-parchment-300);
        --color-pale-green: var(--color-sage-deep);
        --color-muted-teal: var(--color-ink-700);

        /* Game-chrome surface tokens — drive the dark HUD shell: the map/home
           pages, the dossier bar, the side rail / mobile tab bar, the tile
           dossier and every action modal. Built on the parchment/ink ladder so
           the whole game surface follows the light/dark toggle (these surfaces
           were previously hardcoded dark and ignored the theme). Light values
           here; the dark block overrides the literal-rgba ones below. */
        --chrome-bg: var(--color-parchment-100);
        --chrome-panel-a: var(--color-parchment-100);
        --chrome-panel-b: var(--color-parchment-200);
        --chrome-card: var(--color-parchment-200);
        --chrome-card-strong: var(--color-parchment-300);
        --chrome-text: var(--color-ink-900);
        --chrome-text-dim: var(--color-ink-500);
        /* Was ink-300 (≈#7d7b6f) — too low-contrast on parchment for the
           achievements/guide secondary text. Bumped to a darker mid rung; the
           dark theme redefines the ink ladder so it stays readable there too. */
        --chrome-text-faint: var(--color-ink-400);
        --chrome-gold: var(--color-aged-gold);
        --chrome-border: rgba(26, 32, 48, 0.18);
        --chrome-border-strong: rgba(26, 32, 48, 0.3);
        --chrome-gold-border: rgba(176, 141, 74, 0.5);
        --chrome-gold-soft: rgba(176, 141, 74, 0.12);
        --chrome-hairline: rgba(26, 32, 48, 0.1);
        --chrome-field-bg: rgba(26, 32, 48, 0.05);
        --chrome-field-border: rgba(26, 32, 48, 0.16);
        --chrome-backdrop: rgba(20, 26, 38, 0.5);
        --chrome-shadow: rgba(0, 0, 0, 0.18);

        /* Legacy aliases — old variable names still referenced across components.
           Kept pointing at sensible palette colors so the visual remains coherent. */
        --color-dark-navy: var(--color-ink-1000);
        --color-dark-blue: var(--color-ink-900);
        --color-bright-accent: var(--color-wax-red);
        --color-accent-dark: var(--color-sage-deep);
        --color-muted-accent: var(--color-ink-300);

        /* Typography */
        --font-display: 'Cinzel', serif;
        --font-heading: 'Cinzel', serif;
        --font-body: 'EB Garamond', serif;
        --font-editorial: 'IM Fell English', serif;
        --font-mono: 'JetBrains Mono', monospace;

        /* Terrain — from design spec */
        --color-terrain-water: #8fb6c2;
        --color-terrain-shore: #c8d6c8;
        --color-terrain-grass: #bdc78a;
        --color-terrain-dry: #cac281;
        --color-terrain-forest: #7a9a64;
        --color-terrain-forest-deep: #5a7848;
        --color-terrain-hill: #a89567;

        /* Biome colors */
        /* Water biomes */
        --color-biome-ocean: #0066cc;
        --color-biome-deep-ocean: #000080;
        --color-biome-abyssal-ocean: #000033;
        --color-biome-ocean-trench: #00004d;
        
        /* River biomes */
        --color-biome-wide-river: #4a91d6;
        --color-biome-river: #689ad3;
        --color-biome-rocky-river: #75a5d1;
        --color-biome-mountain-stream: #8fbbde;
        --color-biome-stream: #a3c7e8;
        --color-biome-highland-stream: #a8cbe9;
        --color-biome-tributary: #8bb5dd;
        --color-biome-creek: #b5d5ed;
        
        /* Wetland biomes */
        --color-biome-riverbank: #82a67d;
        --color-biome-flood-plain: #789f6a;
        --color-biome-riverine-forest: #2e593f;
        --color-biome-wetland: #517d46;
        --color-biome-lakeshore: #6a9b5e;
        --color-biome-swamp: #2f4d2a;
        --color-biome-marsh: #3d6d38;
        --color-biome-bog: #4f5d40;
        
        /* Beach biomes */
        --color-biome-sandy-beach: #f5e6c9;
        --color-biome-pebble-beach: #d9c8a5;
        --color-biome-rocky-shore: #9e9e83;
        
        /* Mountain biomes */
        --color-biome-snow-cap: #ffffff;
        --color-biome-alpine: #e0e0e0;
        --color-biome-mountain: #7d7d7d;
        --color-biome-dry-mountain: #8b6b4c;
        --color-biome-desert-mountains: #9c6b4f;
        
        /* Highland biomes */
        --color-biome-glacier: #c9eeff;
        --color-biome-highland-forest: #1d6d53;
        --color-biome-highland: #5d784c;
        --color-biome-rocky-highland: #787c60;
        --color-biome-mesa: #9e6b54;
        
        /* Forest biomes */
        --color-biome-tropical-rainforest: #0e6e1e;
        --color-biome-temperate-forest: #147235;
        --color-biome-woodland: #448d37;
        
        /* Grassland biomes */
        --color-biome-shrubland: #8d9c4c;
        --color-biome-grassland: #68a246;
        --color-biome-plains: #7db356;
        --color-biome-savanna: #c4b257;
        --color-biome-dry-plains: #c3be6a;
        
        /* Arid biomes */
        --color-biome-badlands: #9c7450;
        --color-biome-desert-scrub: #d1ba70;
        --color-biome-desert: #e3d59e;
        
        /* Volcanic biomes */
        --color-biome-active-volcano: #FF4400;
        --color-biome-lava-flow: #FF6600;
        --color-biome-volcanic-rock: #783C28;
        --color-biome-volcanic-soil: #9A5D42;

        /* Terrain — extras from reference */
        --color-terrain-mountain: #6e6353;
        --color-terrain-snow: #e8e4d2;
        --color-parchment-shadow: #b9a576;

        /* Paper grain — reference token */
        --paper-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.15 0 0 0 0 0.1 0 0 0 0 0.05 0 0 0 0.07 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
    }

    /* Dark theme — the whole content site is driven by the parchment (surface)
       and ink (text) scales, so inverting just those two ladders re-themes
       every page that uses the tokens. A handful of accent/border aliases are
       brightened so they stay legible on dark surfaces. Toggled from the footer
       via the `data-theme` attribute on <html>. */
    :global(html[data-theme='dark']) {
        --color-parchment-100: #161b27;
        --color-parchment-200: #1d2330;
        --color-parchment-300: #28303f;
        --color-parchment-400: #36404f;
        --color-parchment-shadow: #3d485c;

        --color-ink-300: #8b91a1;
        --color-ink-400: #9ba1b0;
        --color-ink-500: #aab0bf;
        --color-ink-700: #d7d2c0;
        --color-ink-900: #f3eeda;
        --color-ink-1000: #ffffff;

        /* Reads as a warm dark page rather than the bright parchment gradient. */
        --color-background: #11151f;
        --color-background-gradient-start: #161b27;
        --color-background-gradient-end: #11151f;

        /* Accents/links brightened for contrast on the dark surfaces. */
        --color-wax-red: #c14a2f;
        --color-link: var(--color-vermilion-2);
        --color-link-hover: var(--color-gold-pale);
        --color-bright-accent: #c14a2f;

        /* Hairline borders were dark ink on paper; flip to light translucency. */
        --color-panel-border: rgba(255, 255, 255, 0.14);
        --color-card-border: rgba(255, 255, 255, 0.14);
        --color-shadow: rgba(0, 0, 0, 0.5);

        --paper-noise: none;

        /* Dark game-chrome surface. The text tokens (--chrome-text*) are
           ladder-based and already flip via the inverted ink scale above, so
           only the panel fills and the literal-rgba borders/fields need dark
           values here. */
        --chrome-bg: rgba(14, 19, 32, 0.96);
        --chrome-panel-a: rgba(14, 19, 32, 0.96);
        --chrome-panel-b: rgba(20, 24, 40, 0.96);
        --chrome-card: rgba(26, 32, 48, 0.7);
        --chrome-card-strong: rgba(26, 32, 48, 0.85);
        --chrome-gold: var(--color-gold-pale);
        --chrome-border: rgba(255, 255, 255, 0.08);
        --chrome-border-strong: rgba(176, 141, 74, 0.3);
        --chrome-gold-border: rgba(176, 141, 74, 0.5);
        --chrome-gold-soft: rgba(176, 141, 74, 0.18);
        --chrome-hairline: rgba(255, 255, 255, 0.07);
        --chrome-field-bg: rgba(255, 255, 255, 0.06);
        --chrome-field-border: rgba(255, 255, 255, 0.14);
        --chrome-backdrop: rgba(0, 0, 0, 0.6);
        --chrome-shadow: rgba(0, 0, 0, 0.5);
    }

    /* ── Reference utility classes ───────────────────────────── */
    :global(.parchment) {
        background:
            radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.45), transparent 55%),
            radial-gradient(ellipse at 70% 90%, rgba(120,80,30,.18), transparent 60%),
            radial-gradient(ellipse at 50% 50%, var(--color-parchment-200), var(--color-parchment-300) 80%, var(--color-parchment-400));
        position: relative;
        color: var(--color-ink-900);
    }
    :global(.parchment::after) {
        content: "";
        position: absolute; inset: 0;
        background-image: var(--paper-noise);
        opacity: .55;
        pointer-events: none;
        mix-blend-mode: multiply;
    }
    /* The home page's backdrop. Now theme-aware: the base linear gradient uses
       the theme background tokens (light parchment / dark ink) with a subtle
       sage + shadow wash that reads on both. */
    :global(.parchment-dark) {
        background:
            radial-gradient(ellipse at 30% 20%, rgba(80,110,90,.12), transparent 55%),
            radial-gradient(ellipse at 70% 90%, rgba(0,0,0,.10), transparent 65%),
            linear-gradient(180deg, var(--color-background-gradient-start) 0%, var(--color-background-gradient-end) 100%);
        color: var(--chrome-text);
    }
    :global(.rule-deco) {
        height: 0.9em;
        background:
            linear-gradient(to right, transparent, var(--color-ink-900) 20%, var(--color-ink-900) 80%, transparent) center / 100% 0.075em no-repeat,
            radial-gradient(circle at 50% 50%, var(--color-ink-900) 0.15em, transparent 0.18em) center / 0.55em 0.55em no-repeat;
    }
    :global(.eyebrow) {
        font-family: var(--font-display);
        font-weight: 600;
        letter-spacing: .22em;
        text-transform: uppercase;
        font-size: 0.7em;
        color: var(--color-ink-700);
    }
    :global(.page-flourish) {
        display: block;
        margin: 0.5em auto 1.25em;
        color: var(--color-ink-900);
    }
    
    :global(body) {
        background: var(--color-parchment-200);
        color: var(--color-ink-900);
        font-family: var(--font-body);
        font-weight: 400;
        line-height: 1.5;
    }

    :global(h1), :global(h2), :global(h3), :global(h4), :global(h5), :global(h6) {
        font-family: var(--font-display);
        color: var(--color-ink-900);
        letter-spacing: .04em;
    }

    :global(a) {
        color: var(--color-wax-red);
    }
    :global(a:hover) {
        color: var(--color-vermilion-2);
    }

    /* IM Fell English — lore, descriptions, flavour text */
    :global(.structure-description),
    :global(.feature-description),
    :global(.race-description),
    :global(.achievement-description),
    :global(.recipe-description),
    :global(.unit-description),
    :global(.item-description),
    :global(.spawn-description),
    :global(.tribe-desc),
    :global(.tribe-item-desc),
    :global(.footer-tagline),
    :global(.section-subtitle) {
        font-family: var(--font-editorial);
    }

    /* JetBrains Mono — coordinates, counters, timers */
    :global(.coordinates),
    :global(.coord),
    :global(.timer),
    :global(.counter),
    :global(.currency),
    :global(.tick-value),
    :global(.world-tick) {
        font-family: var(--font-mono, monospace);
    }

    :global(html) {
        height: 100%;
        background: var(--color-parchment-200);
    }

    :global(body) {
        height: 100%;
    }

    .app {
        display: flex;
        flex-direction: column;
        min-height: 100%;
        position: relative;
        background:
            radial-gradient(ellipse at 30% 15%, rgba(255,255,255,.4), transparent 55%),
            radial-gradient(ellipse at 70% 95%, rgba(120,80,30,.15), transparent 60%),
            radial-gradient(ellipse at 50% 50%, var(--color-parchment-200), var(--color-parchment-300) 80%, var(--color-parchment-400));
        color: var(--color-ink-900);
    }

    .app::after {
        content: "";
        position: fixed; inset: 0;
        background-image: var(--paper-noise);
        opacity: .35;
        pointer-events: none;
        mix-blend-mode: multiply;
        z-index: 1;
    }

    .app.map {
        background: linear-gradient(to bottom,
                   var(--color-background-gradient-start),
                   var(--color-background-gradient-end));
        color: var(--color-text);
    }

    .app.map::after,
    .app.home::after {
        display: none;
    }

    .app.home {
        background: linear-gradient(to bottom,
                   var(--color-background-gradient-start),
                   var(--color-background-gradient-end));
        color: var(--chrome-text);
    }

    /* Map HUD chrome — applies the reference aesthetic to the dark map shell.
       Targets generic panel/button/badge patterns used by existing map components
       so they pick up parchment-edged ink panels, aged-gold accents, and Cinzel
       eyebrows without each component being rewritten. */
    :global(.app.map.app.map .action-menu),
    :global(.app.map.app.map .actions-menu),
    :global(.app.map.app.map .details-panel),
    :global(.app.map.app.map .overview-panel),
    :global(.app.map.app.map .build-menu),
    :global(.app.map.app.map .build-modal),
    :global(.app.map.app.map .build-status),
    :global(.app.map.app.map .details-modal),
    :global(.app.map.app.map .crafting-menu),
    :global(.app.map.app.map .crafting-modal),
    :global(.app.map.app.map .recruitment-menu),
    :global(.app.map.app.map .recruitment-modal),
    :global(.app.map.app.map .mobilise-menu),
    :global(.app.map.app.map .mobilise-modal),
    :global(.app.map.app.map .demobilise-menu),
    :global(.app.map.app.map .demobilise-modal),
    :global(.app.map.app.map .attack-menu),
    :global(.app.map.app.map .attack-modal),
    :global(.app.map.app.map .join-battle-menu),
    :global(.app.map.app.map .join-battle-modal),
    :global(.app.map.app.map .move-menu),
    :global(.app.map.app.map .move-modal),
    :global(.app.map.app.map .gather-menu),
    :global(.app.map.app.map .gather-modal),
    :global(.app.map.app.map .spawn-menu),
    :global(.app.map.app.map .group-status-menu),
    :global(.app.map.app.map .unit-details-menu),
    :global(.app.map.app.map .structure-overview-menu),
    :global(.app.map.app.map .structure-overview),
    :global(.app.map.app.map .tutorial-menu),
    :global(.app.map.app.map .modal),
    :global(.app.map.app.map .panel) {
        background: linear-gradient(180deg, var(--chrome-panel-a), var(--chrome-panel-b));
        border: 0.075em solid var(--chrome-gold-border);
        border-radius: 0;
        box-shadow: 0 30px 80px var(--chrome-shadow), inset 0 1px 0 var(--chrome-gold-soft);
        color: var(--chrome-text);
        backdrop-filter: blur(0.4em);
    }
    :global(.app.map.app.map h1),
    :global(.app.map.app.map h2),
    :global(.app.map.app.map h3),
    :global(.app.map.app.map h4) {
        font-family: var(--font-display);
        color: var(--chrome-text);
        letter-spacing: 0.06em;
    }
    :global(.app.map.app.map .eyebrow),
    :global(.app.map.app.map .label),
    :global(.app.map.app.map .section-label) {
        font-family: var(--font-display);
        font-size: 0.7em;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--chrome-gold);
    }
    :global(.app.map.app.map button.primary) {
        background: var(--color-aged-gold);
        color: var(--color-ink-900);
        border: 0.075em solid var(--color-aged-gold);
        font-family: var(--font-display);
        letter-spacing: 0.15em;
        text-transform: uppercase;
        border-radius: 0;
    }
    :global(.app.map.app.map button.primary:hover) {
        background: var(--color-gold-pale);
    }
    :global(.app.map.app.map button.secondary) {
        background: transparent;
        color: var(--chrome-text);
        border: 0.075em solid var(--chrome-gold-border);
        font-family: var(--font-display);
        letter-spacing: 0.15em;
        text-transform: uppercase;
        border-radius: 0;
    }
    :global(.app.map.app.map button.secondary:hover) {
        border-color: var(--color-gold-pale);
        background: var(--chrome-gold-soft);
    }
    :global(.app.map.app.map .coordinates),
    :global(.app.map.app.map .coord),
    :global(.app.map.app.map .timer),
    :global(.app.map.app.map .tick-value) {
        color: var(--chrome-gold);
    }

    /* Common modal chrome — headers, close, content, button rows, errors. */
    :global(.app.map.app.map .modal-header) {
        background: var(--chrome-gold-soft);
        border-bottom: 0.075em solid var(--chrome-gold-border);
        padding: 0.85em 1.1em;
        text-shadow: none;
    }
    :global(.app.map.app.map .modal-header h2),
    :global(.app.map.app.map h2),
    :global(.app.map.app.map h3) {
        color: var(--chrome-text);
        text-shadow: none;
    }
    :global(.app.map.app.map .content) {
        color: var(--chrome-text);
        text-shadow: none;
    }
    :global(.app.map.app.map .close-btn),
    :global(.app.map.app.map .cancel-btn) {
        color: var(--chrome-text);
        background: transparent;
        border: 0.075em solid var(--chrome-gold-border);
        border-radius: 0;
    }
    :global(.app.map.app.map .close-btn:hover),
    :global(.app.map.app.map .cancel-btn:hover) {
        background: var(--chrome-gold-soft);
        border-color: var(--color-gold-pale);
        color: var(--chrome-gold);
    }
    :global(.app.map.app.map .button-row),
    :global(.app.map.app.map .modal-actions),
    :global(.app.map.app.map .action-buttons) {
        border-top: 0.075em solid var(--chrome-gold-soft);
        padding-top: 0.8em;
    }
    :global(.app.map.app.map .mobilise-btn),
    :global(.app.map.app.map .build-btn),
    :global(.app.map.app.map .recruit-btn),
    :global(.app.map.app.map .craft-btn),
    :global(.app.map.app.map .move-btn),
    :global(.app.map.app.map .attack-btn),
    :global(.app.map.app.map .gather-btn),
    :global(.app.map.app.map .join-battle-btn),
    :global(.app.map.app.map .confirm-btn),
    :global(.app.map.app.map .submit-btn) {
        background: var(--color-aged-gold);
        color: var(--color-ink-900);
        border: 0.075em solid var(--color-aged-gold);
        border-radius: 0;
        font-family: var(--font-display);
        font-weight: 600;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        text-shadow: none;
    }
    :global(.app.map.app.map .mobilise-btn:hover),
    :global(.app.map.app.map .build-btn:hover),
    :global(.app.map.app.map .recruit-btn:hover),
    :global(.app.map.app.map .craft-btn:hover),
    :global(.app.map.app.map .move-btn:hover),
    :global(.app.map.app.map .attack-btn:hover),
    :global(.app.map.app.map .gather-btn:hover),
    :global(.app.map.app.map .join-battle-btn:hover),
    :global(.app.map.app.map .confirm-btn:hover),
    :global(.app.map.app.map .submit-btn:hover) {
        background: var(--color-gold-pale);
        border-color: var(--color-gold-pale);
    }
    :global(.app.map.app.map .mobilise-error),
    :global(.app.map.app.map .error-message),
    :global(.app.map.app.map .form-error) {
        background: rgba(154, 51, 32, 0.15);
        border-left: 0.22em solid var(--color-vermilion);
        color: #f8d4cc;
        text-shadow: none;
        border-radius: 0;
    }
    :global(.app.map.app.map .mobilise-success),
    :global(.app.map.app.map .success-message) {
        background: rgba(63, 90, 78, 0.18);
        border-left: 0.22em solid var(--color-sage);
        color: #cfe4d4;
        text-shadow: none;
        border-radius: 0;
    }
    :global(.app.map.app.map .next-tick-time),
    :global(.app.map.app.map .tick-info) {
        color: var(--chrome-gold);
        font-family: var(--font-mono);
    }
    /* Section dividers + sub-headers commonly used inside action panels. */
    :global(.app.map.app.map .section-title),
    :global(.app.map.app.map .panel-title),
    :global(.app.map.app.map .group-title),
    :global(.app.map.app.map .row-header) {
        font-family: var(--font-display);
        font-size: 0.72em;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--chrome-gold);
        text-shadow: none;
    }
    :global(.app.map.app.map .divider),
    :global(.app.map.app.map hr) {
        border: none;
        height: 1px;
        background: var(--chrome-gold-soft);
        margin: 0.7em 0;
    }

    /* Generic list rows and table cells. */
    :global(.app.map.app.map .row),
    :global(.app.map.app.map .list-row),
    :global(.app.map.app.map tr) {
        border-color: var(--chrome-gold-soft);
    }
    :global(.app.map.app.map table) { width: 100%; border-collapse: collapse; }
    :global(.app.map.app.map th) {
        font-family: var(--font-display);
        font-size: 0.65em;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--chrome-gold);
        border-bottom: 0.075em solid var(--chrome-gold-border);
        padding: 0.45em 0.6em;
        text-align: left;
        background: transparent;
        text-shadow: none;
    }
    :global(.app.map.app.map td) {
        padding: 0.4em 0.6em;
        border-bottom: 0.075em solid var(--chrome-gold-soft);
        color: var(--chrome-text);
        text-shadow: none;
    }

    /* Badges that show counts (recruit queues, gather progress, etc.). */
    :global(.app.map.app.map .badge),
    :global(.app.map.app.map .pill),
    :global(.app.map.app.map .count-tag),
    :global(.app.map.app.map .tag) {
        font-family: var(--font-mono);
        font-size: 0.72em;
        background: var(--chrome-gold-soft);
        color: var(--chrome-gold);
        border: 0.075em solid var(--chrome-gold-border);
        border-radius: 0;
        padding: 0.15em 0.5em;
        text-shadow: none;
    }

    /* Progress bars used across recruit / craft / build status displays. */
    :global(.app.map.app.map .progress),
    :global(.app.map.app.map .progress-bar) {
        background: var(--chrome-field-bg);
        border: 0.075em solid var(--chrome-gold-soft);
        border-radius: 0;
        height: 6px;
        overflow: hidden;
    }
    :global(.app.map.app.map .progress > div),
    :global(.app.map.app.map .progress-fill) {
        background: linear-gradient(90deg, var(--color-aged-gold), var(--color-gold-pale));
        height: 100%;
    }

    /* Tabs commonly used by Overview-like multi-section panels. */
    :global(.app.map.app.map .tabs),
    :global(.app.map.app.map .tab-bar) {
        display: flex;
        gap: 0;
        border-bottom: 0.075em solid var(--chrome-gold-border);
        background: transparent;
    }
    :global(.app.map.app.map .tab),
    :global(.app.map.app.map .tab-bar button) {
        font-family: var(--font-display);
        font-size: 0.7em;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        background: transparent;
        border: none;
        color: var(--chrome-text-dim);
        padding: 0.7em 1em;
        cursor: pointer;
        border-bottom: 0.15em solid transparent;
        margin-bottom: -1px;
        text-shadow: none;
    }
    :global(.app.map.app.map .tab:hover),
    :global(.app.map.app.map .tab-bar button:hover) {
        color: var(--chrome-text);
    }
    :global(.app.map.app.map .tab.active),
    :global(.app.map.app.map .tab-bar button.active) {
        color: var(--chrome-gold);
        border-bottom-color: var(--color-aged-gold);
    }

    :global(.app.map.app.map .unit-card),
    :global(.app.map.app.map .recipe-card),
    :global(.app.map.app.map .build-option),
    :global(.app.map.app.map .structure-card) {
        background: var(--chrome-card);
        border: 0.075em solid var(--chrome-gold-soft);
        border-radius: 0;
        color: var(--chrome-text);
        text-shadow: none;
    }
    :global(.app.map.app.map .unit-card.selected),
    :global(.app.map.app.map .recipe-card.selected),
    :global(.app.map.app.map .build-option.selected),
    :global(.app.map.app.map .structure-card.selected) {
        border-color: var(--color-gold-pale);
        box-shadow: inset 0 0 0 1px var(--color-aged-gold);
    }

    /* Mobile pass — taken from the reference mobile.jsx layout. At narrow
       widths every action menu becomes a thumb-reachable bottom sheet,
       primary action buttons stretch to full width, and the top header
       collapses so the map gets the most pixels. */
    @media (max-width: 700px) {
        :global(.app.map.app.map .game-header-nav) {
            top: 0.35em;
            font-size: 0.82em;
        }
        :global(.app.map.app.map .game-header-nav .header-link) {
            padding: 0.55em 0.65em;
            letter-spacing: 0.13em;
        }
        /* Generic bottom-sheet dock: every action panel hosted in
           `.map-action-host` (a stable wrapper around action menus,
           irrespective of inner modal class) is pinned to the bottom edge.
           This avoids per-class enumeration and catches future panels for
           free. */
        :global(.app.map.app.map .map-action-host > *),
        :global(.app.map.app.map .map-action-host > * > .modal-container),
        :global(.app.map.app.map .map-action-host > * > [class$="-modal"]),
        :global(.app.map.app.map .map-action-host > * > [class$="-menu"]) {
            position: fixed;
            top: auto;
            left: 0;
            right: 0;
            bottom: 3.5em;
            transform: none;
            width: 100%;
            max-width: 100%;
            max-height: 80vh;
            border-radius: 1em 1em 0 0;
            border-bottom: none;
            box-shadow: 0 -1em 3em rgba(0, 0, 0, 0.55);
            animation: mobileSheetUp 0.25s ease-out;
        }
        @keyframes mobileSheetUp {
            from { transform: translateY(100%); opacity: 0.5; }
            to   { transform: translateY(0);     opacity: 1; }
        }
        :global(.app.map.app.map .mobilise-btn),
        :global(.app.map.app.map .build-btn),
        :global(.app.map.app.map .recruit-btn),
        :global(.app.map.app.map .craft-btn),
        :global(.app.map.app.map .move-btn),
        :global(.app.map.app.map .attack-btn),
        :global(.app.map.app.map .gather-btn),
        :global(.app.map.app.map .join-battle-btn),
        :global(.app.map.app.map .confirm-btn),
        :global(.app.map.app.map .submit-btn) {
            width: 100%;
            padding: 1em 1.2em;
        }
    }

    /* The map/home shells used to force a dark palette regardless of theme.
       They now derive from the chrome tokens, so generic map components that
       read these semantic tokens follow the light/dark toggle for free. */
    .app.map, .app.home {
        --color-background: var(--chrome-bg);
        --color-text-primary: var(--chrome-text);
        --color-text-secondary: var(--chrome-text-dim);
        --color-text: var(--chrome-text);
        --color-heading: var(--chrome-gold);
        --color-subheading: var(--chrome-text-dim);
        --color-panel-bg: var(--chrome-card-strong);
        --color-panel-border: var(--chrome-gold-border);
        --color-card-bg: var(--chrome-card-strong);
        --color-card-border: var(--chrome-gold-border);
        --color-link: var(--chrome-gold);
        --color-link-hover: var(--color-aged-gold);
        --color-shadow: var(--chrome-shadow);
        --color-button-primary: var(--color-aged-gold);
        --color-button-primary-hover: var(--color-gold-pale);
        --color-button-secondary: var(--chrome-card);
        --color-button-secondary-hover: var(--chrome-card-strong);
        --color-pale-green: var(--chrome-gold);
        --color-muted-teal: var(--color-aged-gold);
        --color-bright-accent: var(--color-aged-gold);
    }

    .app.map {
        height: 100%;
        min-height: unset;
        overflow: hidden;
    }

    .app.map .main-content {
        height: 100%;
        min-height: 0;
        overflow: hidden;
    }

    /* Main content area with padding for absolute header */
    .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        /* Add styles to prevent stretching of child login/signup forms */
        align-items: stretch;
        justify-content: flex-start;
        min-height: calc(100vh - 6em); /* Account for header and footer */
    }
    
    /* Special handling for login/signup pages */
    :global(.login-container),
    :global(.signup-container) {
        align-self: center;
    }

    /* Position header as absolute for all pages */
    .header {
        display: flex;
        align-items: center;
        padding: 1em 2em;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 100;
        height: 6em;
        width: 100%;
    }

    /* Each header element fades in + slides down on load, staggered left → right
       so the logo, nav and auth controls cascade rather than appearing at once.
       Slow + a leading delay so labels aren't revealed before font-display: swap
       has had a chance to resolve the display/body fonts. */
    .header > * {
        animation: header-reveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .header > *:nth-child(1) { animation-delay: 150ms; }
    .header > *:nth-child(2) { animation-delay: 250ms; }
    .header > *:nth-child(3) { animation-delay: 350ms; }
    .header > *:nth-child(4) { animation-delay: 450ms; }
    .header > *:nth-child(5) { animation-delay: 550ms; }
    /* Last element starts at 550ms + 900ms duration ≈ 1450ms total — kept in
       sync with HEADER_REVEAL_MS so page content reveals only after the header
       has finished (not mid-cascade). */

    @keyframes header-reveal {
        from { opacity: 0; transform: translateY(-1.2em); }
        to   { opacity: 1; transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
        .header > * { animation: none; }
    }

    .map .header {
        width: auto;
    }

    /* Logo styling — reveal is handled by the staggered `.header > *` rule. */
    .logo {
        display: flex;
        align-items: center;
    }

    .logo a {
        display: flex;
        align-items: center;
        text-decoration: none;
    }

    /* Target the logo component directly in the header using stronger specificity */
    .header .logo :global(.nav-logo) {
        width: 40px;
        height: 40px;
    }

    /* Navigation styling */
    .nav {
        display: flex;
        margin-right: auto; /* Changed from 2em to auto to push other elements to the right */
        margin-left: 3em;
    }

    .links {
        display: flex;
        gap: 2.5em; /* Increased from 1.5em to 2.5em */
    }

    /* World-scoped routes: the layout header is hidden. WorldContextBar sits
       fixed at top:0 (~3.5em). LeftRail occupies left:0 (5em wide).
       Shift page content so it doesn't hide under either chrome element. */
    .app.world-scoped .main-content {
        padding-left: 5em;
        padding-top: 3.5em;
    }
    @media (max-width: 700px) {
        .app.world-scoped .main-content {
            padding-left: 0;
            padding-top: 3.5em;
            /* LeftRail becomes a fixed 52px bottom tab bar on mobile — reserve
               space so page content (and its own bottom padding) clears it. */
            padding-bottom: 52px;
        }
    }

    /* World-scoped page content already clears the dossier bar via main-content
       padding-top. Trim the per-page padding-top so content doesn't double-offset. */
    :global(.app.world-scoped .page) {
        padding-top: 1.5em !important;
    }
    @media (max-width: 700px) {
        :global(.app.world-scoped .page) {
            padding-top: 1em !important;
        }
    }

    /* "Return to map" pill — surfaces the active world id on every page so
       the player always has a one-click route back to the active realm.
       Lives outside .nav so it stays visible on mobile too (the .nav block
       is display:none under 769px). */
    .return-map-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35em;
        padding: 0.45em 0.85em 0.45em 0.65em;
        margin-right: 1.6em;
        background: var(--color-ink-900);
        color: var(--color-parchment-100);
        border: 0.075em solid var(--color-ink-900);
        border-radius: 0.15em;
        font-family: var(--font-display);
        font-size: 0.78em;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        text-decoration: none;
        transition: background 0.15s ease, border-color 0.15s ease;
        white-space: nowrap;
    }
    .return-map-pill:hover {
        background: var(--color-wax-red);
        border-color: var(--color-wax-red);
        color: var(--color-parchment-100);
    }
    .return-map-pill :global(svg) {
        flex-shrink: 0;
        opacity: 0.9;
    }
    .return-map-pill .text em {
        font-family: var(--font-mono);
        font-style: normal;
        font-size: 0.85em;
        letter-spacing: 0.04em;
        opacity: 0.85;
        margin-left: 0.25em;
        text-transform: none;
    }
    .home .return-map-pill, .map .return-map-pill {
        background: var(--color-aged-gold);
        color: var(--color-ink-900);
        border-color: var(--color-aged-gold);
    }
    .home .return-map-pill:hover, .map .return-map-pill:hover {
        background: var(--color-gold-pale);
        border-color: var(--color-gold-pale);
        color: var(--color-ink-900);
    }
    @media (max-width: 768px) {
        .return-map-pill {
            padding: 0.35em 0.55em;
            font-size: 0.7em;
            margin-right: 0;
        }
        .return-map-pill .text em { display: none; }
        .return-map-pill .pill-map { display: none; }
        .return-map-pill .pill-resume { display: inline; }
    }
    @media (min-width: 769px) {
        .return-map-pill .pill-resume { display: none; }
        .return-map-pill .pill-map { display: inline; }
    }

    .links a {
        color: var(--color-ink-700);
        text-decoration: none;
        font-family: var(--font-display);
        font-size: 0.85em;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        transition: color 0.2s ease;
        position: relative;
        padding: 0.3em 0;
    }

    .map .links a,
    .home .links a {
        color: rgba(232, 228, 210, 0.75);
    }

    .links a:hover,
    .links a.active {
        color: var(--color-wax-red);
    }

    .map .links a:hover,
    .map .links a.active,
    .home .links a:hover,
    .home .links a.active {
        color: var(--color-gold-pale);
    }

    .links a::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 0;
        height: 1px;
        background-color: var(--color-wax-red);
        transition: width 0.3s ease;
    }

    .map .links a::after,
    .home .links a::after {
        background-color: var(--color-gold-pale);
    }

    .links a:hover::after,
    .links a.active::after {
        width: 100%;
    }

    /* Auth container styling */
    .auth {
        display: none; /* Hidden by default on mobile */
        align-items: center;
        gap: 1.5em; /* Increased from 1em to 1.5em */
        height: 2.5em; /* Add minimum height to prevent layout shifting */
        transition: opacity 0.3s ease; /* Smooth transition for loading state */
        min-width: 8em; /* Ensure minimum width for auth area */
        justify-content: flex-end;
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .auth:not(.loading) {
        opacity: 1;
    }

    .greeting {
        font-family: var(--font-mono);
        font-size: 0.8em;
        color: var(--color-ink-700);
        letter-spacing: 0.05em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 16em;
        order: -1;
    }

    .map .greeting,
    .home .greeting {
        color: var(--color-gold-pale);
    }

    .login, .signup {
        padding: 0.55em 1em;
        font-family: var(--font-display);
        font-size: 0.78em;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        text-decoration: none;
        border-radius: 2px;
        transition: all 0.2s ease;
    }

    .login {
        color: var(--color-ink-900);
        border: 0.075em solid var(--color-ink-900);
        background: transparent;
    }

    .signup {
        background-color: var(--color-ink-900);
        color: var(--color-parchment-100);
        border: 0.075em solid var(--color-ink-900);
    }

    .map .login,
    .home .login {
        color: var(--color-parchment-100);
        border: 0.075em solid rgba(251, 246, 231, 0.5);
        background: transparent;
    }

    .map .signup,
    .home .signup {
        background-color: var(--color-aged-gold);
        color: var(--color-ink-900);
        border: 0.075em solid var(--color-aged-gold);
    }
    
    .login:hover {
        background: rgba(26, 32, 48, 0.06);
    }

    .signup:hover {
        background-color: var(--color-ink-700);
        border-color: var(--color-ink-700);
        color: var(--color-parchment-100);
    }

    /* Dark-context hovers (map / home) */
    .map .login:hover, .home .login:hover {
        background: rgba(251, 246, 231, 0.08);
        border-color: var(--color-gold-pale);
        color: var(--color-gold-pale);
    }

    .map .signup:hover, .home .signup:hover {
        background-color: var(--color-gold-pale);
        border-color: var(--color-gold-pale);
        color: var(--color-ink-900);
    }

    /* Common button styles - make more specific with child selector */
    :global(.button) > * {
        padding: 0.4em 1em;
        cursor: pointer;
        background-color: var(--color-button);
        color: var(--color-text);
        border: 0.0625em solid rgba(193, 19, 22, 0.3);
        border-radius: 0.25em;
        transition: all 0.2s ease;
        font-size: 1.1em;
        font-weight: 500;
        box-shadow: 0 0.0625em 0.1875em var(--color-shadow);
        text-decoration: none;
        display: inline-block;
    }
    
    :global(.button):hover {
        background-color: var(--color-button-hover);
        transform: translateY(-0.125em);
        box-shadow: 0 0.1875em 0.3125em var(--color-shadow);
    }

    :global(.button).primary {
        background-color: var(--color-button-primary);
        border: none;
    }
    
    :global(.button).primary:hover {
        background-color: var(--color-button-primary-hover);
    }
    
    :global(.button).secondary {
        background-color: var(--color-button-secondary);
        color: var(--color-text);
        border: none;
    }
    
    :global(.button).secondary:hover {
        background-color: var(--color-button-secondary-hover);
    }
    
    /* Responsive image styling with child selectors */
    :global(.screenshot-container) {
        width: 100%;
        max-height: 80vh;
        overflow: hidden;
        border-radius: 0.5em;
        margin: 1em 0;
        box-shadow: 0 0.3em 1em var(--color-shadow);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .header {
            padding: 0.8em 1.5em; /* Increased horizontal padding from 1em to 1.5em */
            justify-content: space-between; /* Ensure good spacing in mobile view */
        }
        
        .logo {
            flex: 1;
        }
        
        /* Remove the mobile-menu-toggle style since it's now handled above */
        
        .nav {
            display: none; /* Hide on mobile */
        }
        
        .mobile-menu-toggle {
            margin-left: 0.5em;
        }
    }

    /* Show auth section only on larger screens */
    @media (min-width: 769px) {
        .auth {
            display: flex; /* Show auth section on desktop */
        }
    }

    /* Mobile Menu Toggle Button - Updated CSS */
    .mobile-menu-toggle {
        display: flex; /* Show by default */
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        cursor: pointer;
        z-index: 110;
        padding: 0.5em;
        margin-left: 2em;
    }
    
    /* Hide menu toggle on larger screens */
    @media (min-width: 769px) {
        .mobile-menu-toggle {
            display: none;
        }
    }

    /* Remove the hamburger styles since they're now in the component */

    :global(.icon-pale-green) {
        color: var(--color-pale-green);
        fill: var(--color-pale-green);
        stroke: var(--color-pale-green);
    }
    
    :global(.hamburger-icon span) {
        background-color: var(--color-heading);
    }

    /* Animation for mobile menu - moved from container to component */
    :global(.mobile-menu.animate-in) {
        animation-name: slideDown;
        animation-duration: 0.3s;
        animation-fill-mode: forwards;
    }
    
    :global(.mobile-menu.animate-out) {
        animation-name: slideUp;
        animation-duration: 0.3s;
        animation-fill-mode: forwards;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }

    /* Footer styles — parchment, ink-on-paper */
    .footer {
        margin-top: auto;
        padding: 2em 0 1em;
        background-color: var(--color-parchment-300);
        border-top: 0.075em solid var(--color-ink-900);
        position: relative;
        z-index: 2;
        color: var(--color-ink-900);
    }
    
    .footer-content {
        width: 90%;
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        padding-bottom: 2em;
    }
    
    .footer-section {
        margin-bottom: 2em;
    }
    
    .footer-nav {
        display: flex;
        justify-content: flex-end;
        gap: 3.5em; /* Increased from 2.5em to 3.5em for more spacing between categories */
        flex-wrap: wrap;
        /* Default layout is columns for mobile first approach */
        flex-direction: column;
    }
    
    .footer-section.branding {
        flex: 0 0 40%;
        max-width: 400px;
        padding-right: 2em;
    }
    
    .footer-section h3 {
        color: var(--color-wax-red);
        font-family: var(--font-display);
        font-weight: 600;
        margin-bottom: 1em;
        font-size: 0.7em;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        text-align: left;
    }
    
    /* Update the footer title and logo to be properly aligned with brand container */
    .brand {
        display: flex;
        align-items: center;
        margin-bottom: 1em;
    }
    
    .footer-logo {
        display: inline-flex;
        align-items: center;
        text-decoration: none;
        margin: 0; /* Remove margins */
    }
    
    .footer-logo :global(.footer-logo-icon) {
        width: 40px;
        height: 40px;
    }
    
    .footer-title {
        font-size: 1.6em;
        letter-spacing: 0.12em;
        color: var(--color-ink-900);
        font-weight: 600;
        font-family: var(--font-display);
        margin: 0;
    }

    .footer-tagline {
        color: var(--color-ink-500);
        font-family: var(--font-editorial);
        font-style: italic;
        margin-bottom: 1em;
    }

    .theme-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.5em;
        background: transparent;
        border: 1px solid var(--color-panel-border);
        border-radius: 2px;
        color: var(--color-ink-700);
        padding: 0.5em 0.9em;
        font-family: var(--font-display);
        font-size: 0.66rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .theme-toggle:hover {
        color: var(--color-ink-900);
        border-color: var(--color-ink-900);
        background: var(--color-parchment-200);
    }
    .theme-toggle svg { flex-shrink: 0; }

    .footer-links {
        display: flex;
        flex-direction: column;
        gap: 0.8em;
        text-align: left;
    }
    
    .social-link {
        display: flex;
        align-items: center;
        gap: 0.5em;
    }
    
    .social-icon {
        color: var(--color-ink-700);
        transition: color 0.2s ease;
    }

    .footer-links a, .footer-signout {
        color: var(--color-ink-700);
        text-decoration: none;
        transition: color 0.2s ease;
        font-family: var(--font-body);
        font-size: 1em;
        display: inline-block;
    }

    .footer-links a:hover, .footer-signout:hover {
        color: var(--color-wax-red);
    }
    
    .footer-signout {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        text-align: left;
        font-family: var(--font-body);
        width: 100%;
    }
    
    :global(.footer-signout .social-icon) {
        color: var(--color-ink-700);
        transition: color 0.2s ease;
    }

    .footer-signout:hover :global(.social-icon) {
        color: var(--color-wax-red);
    }

    .footer-bottom {
        padding-top: 1em;
        text-align: center;
        font-family: var(--font-mono);
        font-size: 0.7em;
        letter-spacing: 0.1em;
        color: var(--color-ink-500);
        border-top: 0.075em solid rgba(26, 32, 48, 0.18);
    }
    
    @media (max-width: 768px) {
        .footer-content {
            flex-direction: column;
            text-align: center;
        }
        
        .footer-nav {
            justify-content: center;
            gap: 1.5em;
            /* Explicitly set column direction on mobile */
            flex-direction: column;
        }
        
        .footer-section.branding {
            flex: 1 1 100%;
            max-width: none;
            padding-right: 0;
            margin-bottom: 2em;
        }
        
        .footer-section h3 {
            text-align: center;
        }
        
        .footer-links {
            align-items: center;
        }
        
        .footer-signout {
            text-align: center;
            justify-content: center;
        }
        
        .brand {
            justify-content: center; /* Center the brand on mobile */
        }
        
        :global(.screenshot-container) {
            border-radius: 0.25em;
            max-height: 50vh;
        }
        
        .social-link {
            justify-content: center;
        }
    }
    
    /* Desktop layout for footer nav */
    @media (min-width: 769px) {
        .footer-nav {
            flex-direction: row; /* Change to horizontal layout on desktop */
            align-items: flex-start; /* Align items to the top in the row */
        }
    }
</style>