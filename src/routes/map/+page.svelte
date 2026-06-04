<script>
    import { apiPost } from '../../lib/api.js';
    import { get } from 'svelte/store';
    import { onMount, onDestroy } from 'svelte'; // Add this import

    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    import { user, isAuthReady } from '../../lib/stores/user.js'; 
    
    import {
      game,
      currentPlayer,
      getWorldInfo,
      setCurrentWorld,
      clearCurrentWorld,
      subscribeToWorldInfo
    } from "../../lib/stores/game.js";
    
    import {
        map,
        ready,
        targetStore,
        initialize,
        moveTarget,
        cleanup,
        isInternalUrlChange,
        setHighlighted,
        coordinates,
        hasTileContent,
        entities,
        currentPlayerPosition,
        initialEntitiesLoaded,
        loadTargetFromLocalStorage,
        clearSavedTargetPosition
    } from "../../lib/stores/map.js";
    
    import { unreadMessages } from "../../lib/stores/chat.js";

    import Chat from '../../components/features/Chat.svelte';
    import AchievementUnlocked from '../../components/features/feedback/AchievementUnlocked.svelte';
    import Notices from '../../components/features/feedback//Notices.svelte';
    import NextWorldTick from '../../components/features/feedback//NextWorldTick.svelte';

    import Grid from '../../components/map/foundation/Grid.svelte';
    import Axes from '../../components/map/foundation/Axes.svelte';
    import Legend from '../../components/map/foundation/Legend.svelte';
    import Minimap from '../../components/map/foundation/Minimap.svelte';
    import Recenter from '../../components/map/foundation/Recenter.svelte';
    import FollowPlayer from '../../components/map/foundation/FollowPlayer.svelte';
    
    import Overview from '../../components/map/actions/Overview.svelte';
    import SpawnMenu from '../../components/map/actions/SpawnMenu.svelte';
    import Tutorial from '../../components/map/actions/Tutorial.svelte';
    import Map from '../../components/icons/Map.svelte';
    import Close from '../../components/icons/Close.svelte';
    import Spyglass from '../../components/icons/Spyglass.svelte';
    import AchievementIcon from '../../components/icons/Trophy.svelte';
    import BirdActive from '../../components/icons/BirdActive.svelte';
    import Bird from '../../components/icons/Bird.svelte';
    import BoundIcon from '../../components/icons/BoundIcon.svelte';
    import UnboundIcon from '../../components/icons/UnboundIcon.svelte';
    import Info from '../../components/icons/Info.svelte';
    import Logo from '../../components/Logo.svelte';
    // GameHeader / NextTickChip / TopResourceBar all moved into the layout
    // WorldContextBar (dossier). The LeftRail handles navigation cells and
    // the on-tile HUDs stay here.
    import TileDossier from '../../components/map/foundation/TileDossier.svelte';
    import { reports, unreadReports } from '../../lib/stores/reports.js';
    import { diplomacy } from '../../lib/stores/diplomacy.js';
    
    
    const DEBUG_MODE = true;
    const debugLog = (...args) => DEBUG_MODE && console.log(...args);

    let dossierPanel = $state(null); // active action panel in TileDossier, null = closed
    const isTutorialVisible = $derived(dossierPanel === 'help');
    let detailed = $state(false);   // kept for legacy follow-player check
    let selectedUnit = $state(null);
    let loading = $state(true);
    let error = $state(null);
    // Reports / Diplomacy / Rankings are dedicated routes — see GameHeader.
    // Local toggle state kept (default false) only so any legacy references
    // remain referenced; the panels themselves are gone.
    let showReports    = $state(false);
    let showDiplomacy  = $state(false);
    let showRankings   = $state(false);
    
    let urlProcessingComplete = $state(false);
    let playerPositionSet = $state(false); // New flag to track if player position has been set
    let isPathDrawingMode = $state(false);
    let followPlayerPosition = $state(true); // Add new state to control position following
    let lastKnownPlayerPosition = $state(null); // Track the last known player position

    // Keep the overlay up until the map is ready AND the first batch of chunk
    // data has loaded, so terrain, structures and players appear together rather
    // than the entities popping in on top of already-visible tiles.
    const combinedLoading = $derived(
        loading || $game.worldLoading || !$isAuthReady || ($ready && !$initialEntitiesLoaded)
    );
    
    const isDragging = $derived($map.isDragging);
    
    let isProcessingClick = false;


    let pathDrawingGroup = $state(null);
    let currentPath = $state([]);

    let modalState = $state({
        type: null,
        data: null,
        visible: false
    });

    // Building sub-tile placement mode
    let buildingPlacementMode = $state(false);
    let pendingBuildingData = $state(null);
    let allowedSubCells = $state(null);

    const isAnyModalOpen = $derived(
        buildingPlacementMode ||
        !$game?.player?.alive ||
        dossierPanel !== null ||
        isTutorialVisible
    );

    let showMinimap = $state(false); // Changed from true to false - default closed
    let showEntities = $state(false);
    let showChat = $state(false);
    let showAchievements = $state(false);

    let initialized = $state(false);
    let initializationRetries = $state(0);
    const MAX_INIT_RETRIES = 3;
    
    let lastActivePanel = $state('none'); // 'none', 'details', 'overview', 'chat', 'achievements'
    let shouldShowAchievementsAfterSpawn = $state(false); // New state to track if achievements should show after spawn
    let tutorialAutoShown = $state(false); // Track whether the tutorial was auto-opened this session

    const unreadCount = $derived($unreadMessages);

    const spawnMenuVisible = $derived(!$game?.player?.alive);

    let peekOpen = $state(false);
    let peekTile = $state(null);
    let openPeekTrigger = $state(0);
    
    function handlePanelHover(panelType) {
        if (panelType && ((panelType === 'chat' && showChat) || 
                        (panelType === 'achievements' && showAchievements) || 
                        (panelType === 'details' && detailed) || 
                        (panelType === 'overview' && showEntities) ||
                        (modalState.visible && modalState.type === panelType))) {
            console.log(`Setting active panel to: ${panelType}`);
            lastActivePanel = panelType;
        }
    }

    // Handle keyboard events for all panels
    function handleKeyDown(event) {
        if (event.key === 'Escape') {
            // Handle only one panel at a time, in order of priority
            if (dossierPanel !== null) {
                dossierPanel = null;
                event.preventDefault();
                event.stopPropagation();
                return;
            } else if (lastActivePanel === 'chat' && showChat) {
                showChat = false;
                event.preventDefault();
                event.stopPropagation();
            } else if (lastActivePanel === 'achievements' && showAchievements) {
                showAchievements = false;
                event.preventDefault();
                event.stopPropagation();
            } else if (lastActivePanel === 'details' && detailed) {
                detailed = false;
                event.preventDefault();
                event.stopPropagation();
            } else if (lastActivePanel === 'overview' && showEntities) {
                toggleEntities();
                event.preventDefault();
                event.stopPropagation();
            } else {
                // If no specific panel is active or the last active is closed,
                // close any open panel in a consistent order (only one)
                // Only check panels that are actually open
                if (showChat) {
                    showChat = false;
                    event.preventDefault();
                    event.stopPropagation();
                } else if (showAchievements) {
                    showAchievements = false;
                    event.preventDefault();
                    event.stopPropagation();
                } else if (detailed) {
                    detailed = false;
                    event.preventDefault();
                    event.stopPropagation();
                } else if (showEntities) {
                    toggleEntities();
                    event.preventDefault();
                    event.stopPropagation();
                }
                // Don't do anything if no panels are open
            }
        }
    }

    // Add new effect to handle showing achievements after spawn
    $effect(() => {
        // Check if player just spawned (alive changed from false to true)
        if ($game?.player?.alive && shouldShowAchievementsAfterSpawn) {
            console.log('Player spawned, checking if achievements should show');
            // Check if achievements aren't manually closed in localStorage
            const achievementsClosed = localStorage.getItem('achievements_closed') === 'true';
            if (!achievementsClosed) {
                showChat = false;
                dossierPanel = 'achievements';
                console.log('Showing achievements after spawn');
            } else {
                console.log('Achievements closed by user preference, not showing after spawn');
            }
            shouldShowAchievementsAfterSpawn = false; // Reset for next time
        }
    });

    // Add function to handle spawn completion
    function handleSpawnComplete() {
        console.log('Spawn complete, flagging achievements to show');
        shouldShowAchievementsAfterSpawn = true;
    }

    function parseUrlCoordinates() {
        if (!browser || !page) return null;
        
        const url = get(page).url;
        const x = url.searchParams.get('x');
        const y = url.searchParams.get('y');
        
        if (x !== null && y !== null) {
            const parsedX = parseInt(x, 10);
            const parsedY = parseInt(y, 10);
            
            if (!isNaN(parsedX) && !isNaN(parsedY)) {
                return { x: parsedX, y: parsedY };
            }
        }
        
        return null;
    }
    
    if (browser) {
        window.addEventListener('popstate', () => {
            if (isInternalUrlChange()) return;
            urlProcessingComplete = false;
        });
    }
    
    $effect(() => {
        if (!browser || !$ready || urlProcessingComplete) return;

        // URL coordinates always win
        const coords = parseUrlCoordinates();
        if (coords) {
            debugLog(`Applying URL coordinates: ${coords.x},${coords.y}`);
            moveTarget(coords.x, coords.y);
            urlProcessingComplete = true;
            return;
        }

        // Read follow preference from localStorage directly to avoid timing races
        const savedFollow = localStorage.getItem('follow_player_position');
        const isFollowing = savedFollow !== null ? savedFollow === 'true' : true;

        if (!isFollowing && $game.worldKey) {
            // Follow is OFF — restore last manually targeted position
            const savedPos = loadTargetFromLocalStorage($game.worldKey);
            if (savedPos) {
                debugLog(`Restoring saved target position: ${savedPos.x},${savedPos.y}`);
                moveTarget(savedPos.x, savedPos.y);
                urlProcessingComplete = true;
                return;
            }
        }

        // Follow is ON, or no saved position — go to player if available
        if ($currentPlayerPosition) {
            moveTarget($currentPlayerPosition.x, $currentPlayerPosition.y);
            playerPositionSet = true;
        }

        urlProcessingComplete = true;
    });

    // Wait for player position to load asynchronously, then apply it if following
    $effect(() => {
        if (!browser || !$ready || playerPositionSet) return;

        const coords = parseUrlCoordinates();
        if (coords) return;

        const savedFollow = localStorage.getItem('follow_player_position');
        const isFollowing = savedFollow !== null ? savedFollow === 'true' : true;

        if (isFollowing && $currentPlayerPosition) {
            moveTarget($currentPlayerPosition.x, $currentPlayerPosition.y);
            playerPositionSet = true;
        }
    });

    $effect(() => {
        if ($game.worldKey && $game.worlds[$game.worldKey]) {
            const worldData = $game.worlds[$game.worldKey];
            console.log(`World data for ${$game.worldKey}:`, {
                hasSeed: worldData.seed !== undefined,
                seedType: typeof worldData.seed,
                seedValue: worldData.seed,
                hasCenter: !!worldData.center,
            });
        }
    });

    onMount(() => {
        if (browser) {
            document.body.classList.add('map-page-active');
            document.documentElement.classList.add('map-page-active');
        }
    })
    onDestroy(() => {
        if (browser) {
            document.body.classList.remove('map-page-active');
            document.documentElement.classList.remove('map-page-active');
            cleanup();
        }
    });
    
    $effect(() => {
        if (initialized || !browser) return;
        
        debugLog("Map initialization starting, checking dependencies...");
        
        
        if (!$isAuthReady) {
            debugLog("Auth not ready yet, waiting...");
            return;
        }
        
        // First check: user must be logged in - KEEP THIS CHECK
        if (!$user) {
            debugLog("User not authenticated, redirecting to login page");
            const currentUrl = get(page).url.pathname + get(page).url.search;
            goto(`/login?redirect=${encodeURIComponent(currentUrl)}`);
            return;
        }
        
        if (!$game.initialized) {
            debugLog("Game store not ready yet, waiting...");
            return;
        }
        
        debugLog("Auth and game store are ready, proceeding with map initialization");
        
        const url = get(page).url;
        const worldIdFromUrl = url.searchParams.get('world');
        const currentWorldId = $game.worldKey;
        
        let worldToUse;
        
        if (worldIdFromUrl) {
            worldToUse = worldIdFromUrl;
            debugLog(`Using world ID from URL: ${worldToUse}`);
            
            // REMOVED world membership check - now handled in SpawnMenu

            if (worldToUse !== currentWorldId) {
                debugLog(`Setting current world from URL: ${worldToUse} (was: ${currentWorldId})`);
                setCurrentWorld(worldToUse);
            }
        } else if (currentWorldId) {
            worldToUse = currentWorldId;
            debugLog(`Using current world from store: ${worldToUse}`);
            
            // REMOVED world membership check - now handled in SpawnMenu
        } else {
            console.error('No world ID available from URL or game store');
            goto('/worlds');
            return;
        }
        
        initialized = true;
        
        ensureWorldDataLoaded(worldToUse).then(success => {
            if (success) {
                debugLog("World data loaded successfully, proceeding with map initialization");
                // After loading world data, explicitly subscribe to world info updates
                if (worldToUse) {
                    subscribeToWorldInfo(worldToUse);
                }
                checkAndInitializeMap();
            } else {
                console.error("Failed to load world data, cannot initialize map");
                error = "Failed to load world data";
                loading = false;
            }
        });

    });

    $effect(() => {
        // Auto-show help panel once per session on first visit (tutorial not yet dismissed).
        // Using a flag avoids re-subscribing to dossierPanel, which would cause the panel
        // to reopen immediately when the close button sets dossierPanel = null.
        if ($ready && $game?.player?.alive && browser && !tutorialAutoShown) {
            if (localStorage.getItem('tutorial-state') !== 'closed') {
                tutorialAutoShown = true;
                dossierPanel = 'help';
            }
        }
    });

    $effect(() => {
        if (browser) {
            const handleChatLocationClick = (event) => {
                const { x, y } = event.detail;
                if (typeof x === 'number' && typeof y === 'number') {
                    console.log(`Navigating to chat location: ${x},${y}`);
                    // Remove URL update for chat location clicks
                    moveTarget(x, y, false);
                    
                    const clickedTile = $coordinates.find(c => c.x === x && c.y === y);
                    
                    if (clickedTile && hasTileContent(clickedTile)) {
                        setHighlighted(x, y);
                        dossierPanel = 'details';
                    }
                }
            };
            
            window.addEventListener('goto-location', handleChatLocationClick);
            
            return () => {
                window.removeEventListener('goto-location', handleChatLocationClick);
            };
        }
    });

    $effect(() => {
        if (spawnMenuVisible && showAchievements) {
            showAchievements = false;
        }
    });

    $effect(() => {
      if (browser && initialized) {
        const savedChatState = localStorage.getItem('chat');
        const savedAchievementsState = localStorage.getItem('achievements');
        const achievementsClosed = localStorage.getItem('achievements_closed') === 'true';
        
        // Add handling for minimap and overview states
        const savedMinimapState = localStorage.getItem('minimap');
        const savedOverviewState = localStorage.getItem('overview');
        const savedFollow = localStorage.getItem('follow_player_position');
        
        // Set minimap state based on localStorage (default to false if not set)
        showMinimap = savedMinimapState === 'true';
        
        // Set overview/entities state based on localStorage (default to false if not set)
        showEntities = savedOverviewState === 'true'; // Changed to only show if explicitly true

        // Set follow player position state based on localStorage
        if (savedFollow !== null) {
          followPlayerPosition = savedFollow === 'true';
        }

        // First handle achievements since it has higher priority
        if (savedAchievementsState === 'true' && !achievementsClosed) {
          showChat = false;
          // achievements now lives in the dossier; don't auto-open on load
          return; // Exit early to avoid further changes
        }
        
        // If achievements isn't open, then handle chat - Default to false unless explicitly true
        showChat = savedChatState === 'true';
      }
    });

    $effect(() => {
        if ($game?.player?.alive && isTutorialVisible) {
            // Close achievements and details when tutorial becomes visible
            showAchievements = false;
            detailed = false;
        }
    });

    $effect(() => {
        // Close chat if tutorial becomes visible
        if (isTutorialVisible && showChat) {
            showChat = false;
        }
    });

    $effect(() => {
      if (!browser || !$ready || !$currentPlayerPosition) return;

      const currentPosition = $currentPlayerPosition;

      // Store initial position
      if (!lastKnownPlayerPosition) {
        lastKnownPlayerPosition = { ...currentPosition };
        return;
      }

      // Check if position actually changed
      if (currentPosition.x !== lastKnownPlayerPosition.x ||
          currentPosition.y !== lastKnownPlayerPosition.y) {

        // Update the stored position
        lastKnownPlayerPosition = { ...currentPosition };

        // Only move the map if auto-follow is enabled AND no dossier panel is open
        if (followPlayerPosition && dossierPanel === null) {
          moveTarget(currentPosition.x, currentPosition.y);
        }
      }
    });

    function showModal(options) {
        if (!options) return;

        console.log('Opening modal:', options.type, options.data);

        if (options.type === 'add-building') return;

        // Don't close details panel for inspect, recruitment, or craft modals
        // since these are considered "detail" type views
        if (['mobilise', 'move', 'gather', 'demobilise', 'joinBattle', 'attack', 'build'].includes(options.type)) {
            if (detailed) {
                toggleDetailsModal(false);
            }
        }

        lastActivePanel = options.type;

        modalState = {
            type: options.type,
            data: options.data,
            visible: true
        };
    }

    async function handleBuildRequest(buildData) {
        closeModal();

        // Walls cover the whole tile — no subgrid placement step
        if (buildData.structureType === 'wall') {
            try {
                const result = await apiPost('/actions/buildStructure', {
                    worldId: $game.worldKey,
                    groupId: buildData.groupId,
                    tileX: buildData.tileX,
                    tileY: buildData.tileY,
                    structureType: buildData.structureType,
                    structureName: buildData.structureName
                });
                if (result.success) {
                    const tileKey = `${buildData.tileX},${buildData.tileY}`;
                    entities.update(current => {
                        const tileGroups = current.groups[tileKey];
                        if (!tileGroups) return current;
                        return { ...current, groups: { ...current.groups, [tileKey]: tileGroups.map(g => g.id === buildData.groupId ? { ...g, status: 'building' } : g) } };
                    });
                }
            } catch (e) { console.error('Error building wall:', e); }
            return;
        }

        let allowed = null;
        if (buildData.requiresWaterEdge) {
            const coords = get(coordinates);
            const { tileX, tileY } = buildData;
            const WATER_EDGES = [
                { dx: 0, dy: -1, cells: [0, 1, 2] },
                { dx: 0, dy:  1, cells: [6, 7, 8] },
                { dx: -1, dy: 0, cells: [0, 3, 6] },
                { dx:  1, dy: 0, cells: [2, 5, 8] },
            ];
            const allowedSet = new Set();
            for (const { dx, dy, cells } of WATER_EDGES) {
                const n = coords.find(c => c.x === tileX + dx && c.y === tileY + dy);
                if (n && (n.biome?.water || n.riverValue > 0.2 || n.lakeValue > 0.2)) {
                    cells.forEach(i => allowedSet.add(i));
                }
            }
            allowed = allowedSet.size > 0 ? allowedSet : null;
        }

        allowedSubCells = allowed;
        pendingBuildingData = buildData;
        buildingPlacementMode = true;
    }

    async function handleSubCellSelect(subCellIndex) {
        buildingPlacementMode = false;
        allowedSubCells = null;

        if (subCellIndex === null) {
            pendingBuildingData = null;
            return;
        }

        const data = pendingBuildingData;
        pendingBuildingData = null;

        const subRow = Math.floor(subCellIndex / 3);
        const subCol = subCellIndex % 3;

        try {
            const result = await apiPost('/actions/buildStructure', {
                worldId: $game.worldKey,
                groupId: data.groupId,
                tileX: data.tileX,
                tileY: data.tileY,
                structureType: data.structureType,
                structureName: data.structureName,
                subCell: subCellIndex,
                subRow,
                subCol
            });

            if (result.success) {
                const tileKey = `${data.tileX},${data.tileY}`;
                entities.update(current => {
                    const tileGroups = current.groups[tileKey];
                    if (!tileGroups) return current;
                    return {
                        ...current,
                        groups: {
                            ...current.groups,
                            [tileKey]: tileGroups.map(g =>
                                g.id === data.groupId ? { ...g, status: 'building' } : g
                            )
                        }
                    };
                });
            }
        } catch (error) {
            console.error('Error starting building:', error);
        }
    }

    function closeModal() {
        modalState.visible = false;
        
        setTimeout(() => {
            modalState.type = null;
            modalState.data = null;
        }, 300);
    }

    function toggleDetailsModal(show) {
        const wasDetailed = detailed;
        detailed = show === undefined ? !detailed : show;
        
        // If we're opening the details panel, close any open modals
        if (detailed && !wasDetailed && modalState.visible) {
            closeModal();
        }
        
        // Always update lastActivePanel when opening details
        if (detailed) {
            lastActivePanel = 'details';
        }
    }

    async function ensureWorldDataLoaded(worldId) {
        if (!worldId) return false;
        
        if ($game.worlds[worldId]?.seed !== undefined) {
            debugLog(`World data already available for ${worldId}`);
            return true;
        }
        
        debugLog(`World data not available for ${worldId}, actively loading it...`);
        try {
            loading = true;
            const worldData = await getWorldInfo(worldId);
            if (worldData?.seed !== undefined) {
                debugLog(`Successfully loaded world data for ${worldId}, seed: ${worldData.seed}`);
                return true;
            } else if (!worldData) {
                clearCurrentWorld();
                goto('/worlds');
                return false;
            } else {
                console.error(`Failed to load required world data for ${worldId}`);
                error = "Failed to load world data - seed missing";
                return false;
            }
        } catch (err) {
            if (err.status === 404) {
                clearCurrentWorld();
                goto('/worlds');
                return false;
            }
            console.error(`Error loading world data for ${worldId}:`, err);
            error = `Error loading world: ${err.message || err}`;
            return false;
        } finally {
            loading = false;
        }
    }

    function checkAndInitializeMap() {
        if (!browser || !$game.worldKey || !$user) {
            console.error('Cannot initialize map yet: missing browser context, worldId or user');
            return;
        }
        
        const worldData = $game.worlds[$game.worldKey];
        
        debugLog(`Initializing map for world: ${$game.worldKey}, seed available: ${worldData?.seed !== undefined}`);
        
        if (initializationRetries >= MAX_INIT_RETRIES) {
            console.error(`Failed to initialize map after ${MAX_INIT_RETRIES} attempts`);
            loading = false;
            error = `Failed to initialize map after ${MAX_INIT_RETRIES} attempts`;
            return;
        }
        
        initializationRetries++;
        
        if ($ready && $map.world === $game.worldKey) {
            console.log('Map already initialized with correct world');
            loading = false;
            return;
        }
        
        if (!worldData || worldData.seed === undefined) {
            console.error(`Required world data missing for ${$game.worldKey}, can't initialize map`);
            error = "Missing required world data (seed)";
            loading = false;
            return;
        }
        
        try {
            if (typeof worldData.seed !== 'number' && typeof worldData.seed !== 'string') {
                console.error(`Invalid seed type for world ${$game.worldKey}:`, typeof worldData.seed);
                error = `Invalid seed data: ${typeof worldData.seed}`;
                loading = false;
                return;
            }
            
            debugLog('Initializing map with world data:', {
                worldId: $game.worldKey,
                seed: worldData.seed,
                seedType: typeof worldData.seed,
                hasCenter: !!worldData.center
            });
            
            const initialX = parseInt($page.url.searchParams.get('x')) || undefined;
            const initialY = parseInt($page.url.searchParams.get('y')) || undefined;
            
            // Get player's last location if available
            const playerLocation = $game.player?.lastLocation || null;
            if (playerLocation) {
                debugLog(`Player's last location: ${playerLocation.x},${playerLocation.y}`);
            }
            
            initialize({
                seed: worldData.seed,
                worldId: $game.worldKey,
                initialX,
                initialY,
                playerLocation  // Pass player location to initialize function
            });
            
            loading = false;
            reports.fetch($game.worldKey);
            diplomacy.fetchTribes($game.worldKey);
        } catch (err) {
            console.error('Error initializing map:', err);
            loading = false;
            error = `Error initializing map: ${err.message}`;
        }
    }
    
    // GameHeader now navigates to /chronicle, /diplomacy, /rankings instead
    // of toggling on-map popups; these stubs remain so any older code path
    // that still references them is a no-op rather than an error.
    function toggleReports()    { showReports    = false; }
    function toggleDiplomacy()  { showDiplomacy  = false; }
    function toggleRankings()   { showRankings   = false; }

    function toggleMinimap() {
      if (!$game?.player?.alive || isTutorialVisible) {
        return;
      }
      
      showMinimap = !showMinimap;
      if (browser) {
        localStorage.setItem('minimap', showMinimap.toString());
      }
    }

    function toggleEntities() {
      if (!$game?.player?.alive || isTutorialVisible) {
        return;
      }
      
      showEntities = !showEntities;
      if (showEntities) {
        lastActivePanel = 'overview';
      }
      if (browser) {
        localStorage.setItem('overview', showEntities.toString());
      }
    }

    function toggleChat() {
      if (!$game?.player?.alive || isTutorialVisible) {
        return;
      }
      
      // If chat is currently closed and we're about to open it
      if (!showChat) {
        // Always close achievements when opening chat
        showAchievements = false;
        showChat = true;
      } else {
        // Simply close chat if it's already open
        showChat = false;
      }
      
      // Set as active panel when opened
      if (showChat) {
        lastActivePanel = 'chat';
      }
      
      if (browser) {
        localStorage.setItem('chat', showChat.toString());
      }
    }

    function toggleAchievements() {
      if (!$game?.player?.alive || isTutorialVisible || spawnMenuVisible) {
        return;
      }
      if (dossierPanel === 'achievements') {
        dossierPanel = null;
      } else {
        dossierPanel = 'achievements';
        showAchievements = false;
      }
    }

    function toggleTutorial() {
      dossierPanel = dossierPanel === 'help' ? null : 'help';
    }

    function openAchievementsFromTutorial() {
        if (!$game?.player?.alive) return;
        dossierPanel = 'achievements';
        localStorage.removeItem('achievements_closed');
    }

    // Updated to handle Peek actions
    function handleGridClick(coords) {
        if (!$game?.player?.alive) return;

        // Check if this is a path confirmation action
        if (coords && coords.confirmPath === true) {
            confirmPathDrawing(currentPath);
            return;
        }
        
        // Handle undo path action
        if (coords && coords.undoPath === true) {
            undoLastPathPoint();
            return;
        }

        // Check if this is a Peek action
        if (coords && coords.action) {
            // Ensure we're passing the complete data when handling a Peek action
            handlePeekAction(coords.action, coords);
            return;
        }

        // Simple debounce
        if (isProcessingClick) return;
        isProcessingClick = true;

        // If we're in path drawing mode and have coordinates, add them to the path
        if (isPathDrawingMode && coords && coords.x !== undefined && coords.y !== undefined) {
            // Add the point to the path
            handlePathPoint(coords);
            
            // Reset debounce flag with short timeout for responsiveness in drawing mode
            setTimeout(() => {
                isProcessingClick = false;
            }, 100);
            return;
        }

        // Regular grid click handling (not in path drawing mode)
        if (coords) {
            // Always close peek if it's open
            if (peekOpen) {
                console.log('Closing previously open Peek');
                peekOpen = false;
                peekTile = null;
            }

            // If the dossier is open, any tile click should close it and open the
            // wheel menu for the clicked tile.
            if (dossierPanel !== null) {
                dossierPanel = null;
                moveTarget(coords.x, coords.y, true);
                // Defer so the dossier-close flows through modalOpen before Grid opens Peek.
                setTimeout(() => {
                    openPeekTrigger++;
                }, 50);
                isProcessingClick = false;
                return;
            }

            // Always move to the clicked location, regardless of peek state
            moveTarget(coords.x, coords.y, true);

            // Find the clicked tile
            const clickedTile = $coordinates.find(
                c => c.x === coords.x && c.y === coords.y
            );

            // Only show peek if:
            // 1. The tile has content
            // 2. We're not in path drawing mode
            // 3. It's not the same tile we just closed peek for
            // 4. It's not the center tile
            if (clickedTile &&
                hasTileContent(clickedTile) &&
                !isPathDrawingMode &&
                (!peekTile || peekTile.x !== clickedTile.x || peekTile.y !== clickedTile.y) &&
                !(clickedTile.x === $map.target.x && clickedTile.y === $map.target.y)) {

                setTimeout(() => {
                    peekTile = clickedTile;
                    peekOpen = true;
                }, 50);
            }
        }

        // Reset debounce flag
        setTimeout(() => {
            isProcessingClick = false;
        }, 200); // Reduced from 300ms to 200ms for better responsiveness
    }

    // Add the missing function to handle path points
    function handlePathPoint(point) {
      if (!isPathDrawingMode) {
        console.log('Not in path drawing mode, ignoring point');
        return;
      }
      
      console.log('Page: Adding path point:', point);
      
      // If this is the first point, just add it
      if (currentPath.length === 0) {
        currentPath = [...currentPath, point];
        return;
      }
      
      const lastPoint = currentPath[currentPath.length - 1];
      const dx = Math.abs(point.x - lastPoint.x);
      const dy = Math.abs(point.y - lastPoint.y);
      
      // If points are adjacent, just add the new point
      if (dx <= 1 && dy <= 1) {
        currentPath = [...currentPath, point];
        return;
      }
      
      // For distant points, use Bresenham's line algorithm to interpolate
      console.log('Interpolating path between', lastPoint, 'and', point);
      
      const interpolatedPoints = interpolatePath(lastPoint, point);
      currentPath = [...currentPath, ...interpolatedPoints];
    }

    // Helper function to interpolate points using Bresenham's line algorithm
    function interpolatePath(start, end) {
      const points = [];
      let x = start.x;
      let y = start.y;
      
      const dx = Math.abs(end.x - start.x);
      const dy = Math.abs(end.y - start.y);
      const sx = start.x < end.x ? 1 : -1;
      const sy = start.y < end.y ? 1 : -1;
      let err = dx - dy;
      
      // Skip the first point as it's already in the path
      while (x !== end.x || y !== end.y) {
        const e2 = err * 2;
        
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
        
        // Add intermediate point to the result
        points.push({ x, y });
      }
      
      return points;
    }

    // Route Peek wheel actions into the right-rail TileDossier
    function handlePeekAction(actionId, actionData) {
      if (!actionData || actionData.x === undefined) {
        console.error('No valid action data for peek action');
        return;
      }

      setHighlighted(actionData.x, actionData.y);

      // 'move' with a single eligible group skips the dialog entirely
      if (actionId === 'move') {
        const playerId = get(currentPlayer)?.id;
        const eligible = (actionData.tile?.groups ?? []).filter(
          g => g.owner === playerId && g.status === 'idle'
        );
        if (eligible.length === 1) {
          startPathDrawing({ ...eligible[0], startPoint: { x: actionData.x, y: actionData.y } });
          return;
        }
      }

      // All other actions open the dossier with the matching panel
      dossierPanel = actionId;
    }

    // Add a function to handle removing the last path point
    function undoLastPathPoint() {
        console.log('Undoing last path point');
        if (currentPath.length > 0) {
            // Remove the last point from the path
            currentPath = currentPath.slice(0, -1);
        }
    }

    // Function to start path drawing mode with the selected group
    function startPathDrawing(groupData) {
      console.log('Starting path drawing mode with group:', groupData);
      
      // Store the group we're drawing a path for
      pathDrawingGroup = groupData;
      
      // Reset the current path
      currentPath = [];
      
      // If we have a start point, add it as the first point in the path
      if (groupData?.startPoint) {
        console.log('Adding initial point from group start location:', groupData.startPoint);
        currentPath = [groupData.startPoint];
      }
      
      // Enable path drawing mode
      isPathDrawingMode = true;
    }
    
    // Function to handle cancellation of path drawing
    function handlePathDrawingCancel() {
        console.log('Path drawing cancelled');
        isPathDrawingMode = false;
        pathDrawingGroup = null;
        currentPath = [];
    }
    
    // Function to confirm the path that was drawn
    function confirmPathDrawing(path) {
        if (!pathDrawingGroup || path.length < 2) {
            console.log('Cannot confirm path: missing group data or path too short');
            return;
        }
        
        console.log('Path confirmed:', path);
        console.log('For group:', pathDrawingGroup);
        
        // Exit path drawing mode immediately to improve UX
        isPathDrawingMode = false;

        // Get the first and last points of the path
        const startPoint = path[0];
        const endPoint = path[path.length - 1];

        apiPost('/actions/moveGroup', {
            groupId: pathDrawingGroup.id,
            fromX: startPoint.x,
            fromY: startPoint.y,
            toX: endPoint.x,
            toY: endPoint.y,
            path: path,
            worldId: $game.worldKey
        })
        .then((result) => {
            console.log('Group movement initiated successfully:', result);

            // Optimistically update the entity store so move lines appear immediately
            if (result.path && pathDrawingGroup) {
                const groupId = pathDrawingGroup.id;
                const startKey = `${startPoint.x},${startPoint.y}`;
                const steps = result.path.length - 1;
                const tickMs = steps > 0 ? Math.round(result.estimatedTimeMs / steps) : 60000;
                const nextMoveTime = Date.now() + tickMs;
                entities.update(current => {
                    const tileGroups = current.groups[startKey];
                    if (!tileGroups) return current;
                    return {
                        ...current,
                        groups: {
                            ...current.groups,
                            [startKey]: tileGroups.map(g =>
                                g.id === groupId
                                    ? { ...g, status: 'moving', movementPath: result.path, pathIndex: 0, nextMoveTime }
                                    : g
                            )
                        }
                    };
                });
            }
        })
        .catch((error) => {
            console.error('Error moving group:', error);
        })
        .finally(() => {
            pathDrawingGroup = null;
            currentPath = [];
        });
    }

    // Add a function to toggle position following
    function toggleFollowPlayerPosition() {
      followPlayerPosition = !followPlayerPosition;
      if (followPlayerPosition && $currentPlayerPosition) {
        moveTarget($currentPlayerPosition.x, $currentPlayerPosition.y);
      }
      if (browser) {
        localStorage.setItem('follow_player_position', followPlayerPosition.toString());
      }
    }

    // Simplify to just toggle followPlayerPosition
    function handleManualPositionChange() {
      if (followPlayerPosition) {
        followPlayerPosition = false;
        if (browser) {
            localStorage.setItem('follow_player_position', 'false');
        }
        console.log('Manual position change detected, disabling auto-follow');
      }
    }

    // Add state for showing notices
    let showNotices = $state(true);

    // Function to handle follow state changes from the FollowPlayer component
    function handleFollowToggle(isFollowing) {
        followPlayerPosition = isFollowing;
        if (browser) {
            localStorage.setItem('follow_player_position', isFollowing.toString());
        }
        if (isFollowing) {
            // Clear any stale saved position so refresh always goes to the
            // player rather than a previously jumped-to coordinate.
            if ($game.worldKey) clearSavedTargetPosition($game.worldKey);
            if ($currentPlayerPosition) {
                moveTarget($currentPlayerPosition.x, $currentPlayerPosition.y);
            }
        }
    }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="map" class:dragging={isDragging} class:path-drawing={isPathDrawingMode} class:spawn-menu-open={!$game?.player?.alive} class:dossier-open={dossierPanel !== null}>
    {#if combinedLoading}
        <div class="loading-overlay">
            <div class="loading-logo">
                <Logo extraClass="animated-logo" />
            </div>
            <div class="loading-message">
                {#if !$isAuthReady}
                    Loading user data...
                {:else if !$game.initialized}
                    Initializing game data...
                {:else if $game.worldLoading}
                    Loading world data...
                {:else if !$ready}
                    Initializing map...
                {:else if !$initialEntitiesLoaded}
                    Loading terrain and structures...
                {:else}
                    Preparing world...
                {/if}
            </div>
        </div>
    {:else if error || $game.error}
        <div class="error-overlay">
            <h3>Error</h3>
            <p>{error || $game.error}</p>
            <button onclick={() => goto('/worlds')}>Go to Worlds</button>
        </div>
    {:else}
        <Grid
            detailed={detailed}
            onClick={handleGridClick}
            isPathDrawingMode={isPathDrawingMode}
            onAddPathPoint={handlePathPoint}
            onUndoPoint={undoLastPathPoint}
            customPathPoints={currentPath}
            modalOpen={isAnyModalOpen}
            openPeekTrigger={openPeekTrigger}
            pathDrawingGroup={pathDrawingGroup}
            buildingPlacementMode={buildingPlacementMode}
            allowedSubCells={allowedSubCells}
            onSubCellSelect={handleSubCellSelect}
            onClose={() => {
                if (isPathDrawingMode) handlePathDrawingCancel();
            }}
        />

        {#if $ready}
            <Axes />
        {/if}

        {#if showMinimap}
            <Minimap />
        {/if}
        

        <!-- Right-side toggle cluster — entities, follow, chat, achievements, minimap, help.
             When chat is opened the remaining toggles relocate to `.controls-middle-right`
             so they don't sit on top of the chat panel. -->
        <div class="controls-right">
            <button
                class="control-button entity-button"
                class:active={showEntities}
                onclick={toggleEntities}
                aria-label={showEntities ? "Hide entities" : "Show entities"}
                disabled={!$game?.player?.alive || isTutorialVisible}>
                <Spyglass extraClass="button-icon" />
            </button>

            <FollowPlayer
                disabled={!$game?.player?.alive || isTutorialVisible}
                onFollowToggle={handleFollowToggle}
            />

            {#if !showChat && $game?.player?.alive && !isTutorialVisible}
                <button
                    class="control-button chat-button"
                    onclick={toggleChat}
                    aria-label="Show chat">
                    {#if unreadCount > 0}
                        <BirdActive extraClass="button-icon" />
                        <span class="message-badge">{unreadCount}</span>
                    {:else}
                        <Bird extraClass="button-icon" />
                    {/if}
                </button>
            {/if}

            {#if $game?.player?.alive && !isTutorialVisible && !spawnMenuVisible}
                <button
                    class="control-button achievements-button"
                    class:active={dossierPanel === 'achievements'}
                    onclick={toggleAchievements}
                    aria-label={dossierPanel === 'achievements' ? 'Close achievements' : 'Show achievements'}>
                    <AchievementIcon extraClass="button-icon" />
                </button>
            {/if}

            <button
                class="control-button minimap-button"
                onclick={toggleMinimap}
                aria-label={showMinimap ? "Hide minimap" : "Show minimap"}
                disabled={!$game?.player?.alive || isTutorialVisible}>
                {#if showMinimap}
                    <Close size="1.2em" extraClass="close-icon-dark" />
                {:else}
                    <Map extraClass="button-icon" />
                {/if}
            </button>

            {#if !isTutorialVisible}
                <button
                    class="control-button help-button"
                    class:active={isTutorialVisible}
                    onclick={toggleTutorial}
                    aria-label={isTutorialVisible ? 'Close help' : 'Show help'}
                    disabled={!$game?.player?.alive}>
                    <Info extraClass="button-icon" />
                </button>
            {/if}
        </div>

        {#if showChat && $game?.player?.alive && !isTutorialVisible}
            <div class="controls-middle-right">
                <button
                    class="control-button entity-button"
                    class:active={showEntities}
                    onclick={toggleEntities}
                    aria-label={showEntities ? "Hide entities" : "Show entities"}
                    disabled={!$game?.player?.alive || isTutorialVisible}>
                    <Spyglass extraClass="button-icon" />
                </button>
                <FollowPlayer
                    disabled={!$game?.player?.alive || isTutorialVisible}
                    onFollowToggle={handleFollowToggle}
                />
                <button
                    class="control-button achievements-button"
                    class:active={dossierPanel === 'achievements'}
                    onclick={toggleAchievements}
                    aria-label={dossierPanel === 'achievements' ? 'Close achievements' : 'Show achievements'}>
                    <AchievementIcon extraClass="button-icon" />
                </button>
                <button
                    class="control-button minimap-button"
                    onclick={toggleMinimap}
                    aria-label={showMinimap ? "Hide minimap" : "Show minimap"}
                    disabled={!$game?.player?.alive || isTutorialVisible}>
                    {#if showMinimap}
                        <Close size="1.2em" extraClass="close-icon-dark" />
                    {:else}
                        <Map extraClass="button-icon" />
                    {/if}
                </button>
                <button
                    class="control-button help-button"
                    class:active={isTutorialVisible}
                    onclick={toggleTutorial}
                    aria-label={isTutorialVisible ? 'Close help' : 'Show help'}
                    disabled={!$game?.player?.alive}>
                    <Info extraClass="button-icon" />
                </button>
            </div>
        {/if}


        {#if $ready && $game?.player?.alive}
            <Recenter />
        {/if}
        
        {#if ($user && $game.playerLoaded && !$game.player?.alive)}
            <SpawnMenu onSpawnComplete={handleSpawnComplete} />
        {/if}

        <AchievementUnlocked />

        {#if isTutorialVisible}
            <Tutorial
                onClose={() => { dossierPanel = null; }}
                onOpenAchievements={openAchievementsFromTutorial}
            />
        {/if}

        <!-- Modals -->

        {#if $ready && $game?.player?.alive}
            <div class="chat-wrapper" 
                class:visible={showChat && !isTutorialVisible} 
                class:active={lastActivePanel === 'chat'}
                onmouseenter={() => handlePanelHover('chat')}
                role="region"
                aria-label="Chat panel container"
            >
                {#if showChat && !isTutorialVisible}
                    <Chat 
                        isActive={lastActivePanel === 'chat'} 
                        closing={!showChat}
                        onClose={toggleChat} 
                        onMouseEnter={() => handlePanelHover('chat')}
                    />
                {/if}
            </div>

            <!-- Reports / Diplomacy / Rankings are dedicated routes now
                 (/chronicle, /diplomacy, /rankings) — see GameHeader. The
                 old in-map popups have been removed. -->

            {#if showNotices && !isTutorialVisible}
                <Notices maxNotices={3} />
            {/if}
        {/if}
        
        {#if showEntities}
            <div class="map-action-host"><Overview
              isActive={lastActivePanel === 'overview'}
              onShowStructure={({ x, y }) => {
                setHighlighted(x, y);
                moveTarget(x, y, false);
                dossierPanel = 'inspect';
                if (window.innerWidth < 768) toggleEntities();
              }}
              onClose={() => toggleEntities()}
              onMouseEnter={() => handlePanelHover('overview')}
            /></div>
        {/if}

        {#if $ready && !isPathDrawingMode && !isTutorialVisible && dossierPanel === null}
            <Legend
                x={$targetStore.x}
                y={$targetStore.y}
                openDetails={() => {
                    setHighlighted($targetStore.x, $targetStore.y);
                    dossierPanel = 'details';
                }}
            />
        {/if}

        <!-- Right-rail dossier — shows tile info + action panels, opens on Peek action selection -->
        {#if $ready && $game?.player?.alive}
            <TileDossier
                panel={dossierPanel}
                onClose={() => { dossierPanel = null; }}
                onSwitchPanel={(p) => { dossierPanel = p; }}
                onStartPathDrawing={startPathDrawing}
                onBuildRequest={handleBuildRequest}
            />
        {/if}
    {/if}
</div>

<style>
    .map {
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .map.dragging {
        touch-action: none;
    }
    
    .map.path-drawing {
        cursor: crosshair !important;
        box-shadow: inset 0 0 0 4px rgba(255, 255, 0, 0.5);
    }
    
    .map.spawn-menu-open {
        pointer-events: none; /* Disable pointer events on the map when spawn menu is open */
    }
    
    .map.spawn-menu-open :global(.spawn-menu-wrapper) {
        pointer-events: all; /* Allow pointer events on the spawn menu itself */
    }
    
    :global(html.map-page-active),
    :global(body.map-page-active) {
        height: 100%;
        overflow: hidden;
        overscroll-behavior: none;
        touch-action: none;
    }

    .loading-overlay,
    .error-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        z-index: 1000;
    }
    
    .loading-logo {
        width: 5em;
        height: 5em;
        margin-bottom: 1rem;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    :global(.animated-logo) {
        width: 100%;
        height: 100%;
        animation: pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse {
        0% {
            opacity: 0.6;
            transform: scale(0.95);
        }
        50% {
            opacity: 1;
            transform: scale(1.05);
        }
        100% {
            opacity: 0.6;
            transform: scale(0.95);
        }
    }

    .loading-message {
        font-size: 1.1em;
        text-align: center;
    }
    
    .error-overlay button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #4A90E2;
        color: white;
        border: none;
        border-radius: 0.25em;
        cursor: pointer;
    }

    .controls-right {
        position: fixed;
        bottom: calc(2em + env(safe-area-inset-bottom));
        right: 3em;
        z-index: 1001;
        display: flex;
        gap: 0.5em;
    }
    
    .controls-middle-right {
        position: fixed;
        right: 1em;
        top: 44%;
        z-index: 1001;
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    }

    /* Reference HudA chrome — every map control button reads as an
       ink-translucent pill with gold-pale icons and aged-gold hover. */
    .control-button {
        min-width: 2em;
        height: 2em;
        background-color: var(--chrome-panel-a);
        border: 0.075em solid var(--chrome-gold-border);
        border-radius: 0;
        color: var(--chrome-gold);
        padding: 0.3em 0.8em;
        font-family: var(--font-display);
        font-size: 0.9em;
        font-weight: 600;
        letter-spacing: 0.16em;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        text-shadow: none;
        transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        backdrop-filter: blur(0.5em);
        -webkit-backdrop-filter: blur(0.5em);
        opacity: 0;
        transform: translateY(-1em);
        animation: fadeInButton 0.7s ease-out 0.5s forwards;
    }

    .control-button:hover:not(:disabled) {
        background-color: var(--chrome-gold-soft);
        border-color: var(--chrome-gold);
        color: var(--chrome-text);
    }

    .control-button.active {
        background-color: var(--chrome-gold-soft);
        border-color: var(--chrome-gold);
        color: var(--chrome-gold);
    }

    .control-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    @keyframes fadeInButton {
        0% {
            opacity: 0;
            transform: translateY(-1em);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* Stagger the toggle reveal so the cluster cascades in rather than popping
       all at once. Each direct child of the cluster is itself a control button
       (FollowPlayer's root element is its button), so we can delay by position.
       :global is needed to reach the button rendered by the FollowPlayer
       child component, which doesn't carry this file's scope hash. */
    .controls-right > :global(:nth-child(1)),
    .controls-middle-right > :global(:nth-child(1)) { animation-delay: 0.10s; }
    .controls-right > :global(:nth-child(2)),
    .controls-middle-right > :global(:nth-child(2)) { animation-delay: 0.18s; }
    .controls-right > :global(:nth-child(3)),
    .controls-middle-right > :global(:nth-child(3)) { animation-delay: 0.26s; }
    .controls-right > :global(:nth-child(4)),
    .controls-middle-right > :global(:nth-child(4)) { animation-delay: 0.34s; }
    .controls-right > :global(:nth-child(5)),
    .controls-middle-right > :global(:nth-child(5)) { animation-delay: 0.42s; }
    .controls-right > :global(:nth-child(6)),
    .controls-middle-right > :global(:nth-child(6)) { animation-delay: 0.50s; }

    .control-button:focus-visible {
        outline: 0.15em solid var(--color-aged-gold, #b08d4a);
        outline-offset: 0.1em;
    }

    :global(.button-icon) {
        height: 1.2em;
        width: 1.2em;
    }
    :global(.close-icon-dark) {
        fill: currentColor;
        stroke: currentColor;
    }

    .minimap-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.3em;
        min-width: 2em;
        width: 2em;
    }

    .minimap-button :global(.close-icon-dark) {
        height: 1.2em;
        width: 1.2em;
    }

    .entity-button {
        padding: 0.3em;
        min-width: 2em;
        width: 2em;
    }

    .chat-button,
    .achievements-button {
        position: relative;
        padding: 0.3em;
        min-width: 2em;
        width: 2em;
        height: 2em;
        border-radius: 0;          /* match reference square pills */
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .message-badge {
        position: absolute;
        top: -0.5em;
        right: -0.5em;
        background: var(--color-wax-red, #5b1a1f);
        color: var(--color-parchment-100, #fbf6e7);
        border-radius: 0;
        padding: 0.1em 0.45em;
        font-family: var(--font-mono);
        font-size: 0.7em;
        min-width: 1.4em;
        text-align: center;
        border: 0.075em solid var(--color-aged-gold, #b08d4a);
    }

    /* Unified z-index system for the remaining map panels (chat, achievements
       and the action-menu host). Reports/Diplomacy/Rankings live on their own
       routes and are no longer wrapped here. */
    .chat-wrapper,
    :global(.modal-container),
    :global(.overview-container) {
        position: fixed;
        z-index: 1500;
        transition: opacity 300ms ease, z-index 0s linear;
    }

    .chat-wrapper.visible {
        opacity: 1;
        pointer-events: all;
        display: block;
    }

    .chat-wrapper:not(.visible) {
        opacity: 0;
        pointer-events: none;
        transition: opacity 300ms ease, z-index 0s linear 300ms;
    }

    .chat-wrapper.active,
    :global(.modal-container.active),
    :global(.overview-container.active) {
        z-index: 1600;
    }

    :global(.minimap-container) {
        z-index: 1000;
    }

    .chat-wrapper {
        bottom: calc(1em + env(safe-area-inset-bottom));
        right: 1em;
        opacity: 0;
    }

    .help-button {
        padding: 0.3em;
        width: 2em;
        height: 2em;
    }

    /* On desktop shift controls to clear the 28em dossier when it's open */
    @media (min-width: 900px) {
        .map.dossier-open .controls-right { right: calc(28em + 0.75em); }
        .map.dossier-open .controls-middle-right { right: calc(28em + 0.5em); }
    }

    /* On mobile the LeftRail becomes a 52px bottom tab bar; lift the right-hand
       toggle cluster above it so the two don't overlap. */
    @media (max-width: 700px) {
        .controls-right {
            bottom: calc(52px + 1em + env(safe-area-inset-bottom));
            right: 1em;
        }
    }
</style>