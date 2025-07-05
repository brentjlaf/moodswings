// Generate unique device fingerprint for save identification
const PLAYER_ID_KEY = 'farmGamePlayerID';

function generateDeviceID() {
    const existing = localStorage.getItem(PLAYER_ID_KEY);
    if (existing) {
        return existing;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);

    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        canvas.toDataURL()
    ].join('|');

    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    const id = 'player_' + Math.abs(hash).toString(36);
    localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
}

// Save/Load System
// key under which we’ll store everything in localStorage
const SAVE_KEY = 'farmGameSave';

function saveGameState() {
  try {
    gameState.playerID = gameState.playerID || generateDeviceID();
    gameState.lastSaved = new Date().toISOString();

    // Strip out runtime-only props
    const saveData = {
      ...gameState,
      activeCropTimers: [],
      crops: gameState.crops.map(c => ({ ...c, timerId: null, pestTimerId: null })),
      activeEffects: gameState.activeEffects.map(e => ({
        id: e.id,
        itemId: e.itemId,
        itemName: e.itemName,
        effectType: e.effectType,
        value: e.value,
        expiresAt: e.expiresAt
      }))
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    console.log('Game saved to localStorage');
    // Update local leaderboard with latest stats
    updateLocalLeaderboard(saveData);
    updateSaveInfo();
    return saveData;
  } catch (err) {
    console.error('Error saving game:', err);
    showToast('Error saving game!', 'failure');
    return null;
  }
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) throw 'no save found';
    const saved = JSON.parse(raw);

    if (saved.gameVersion && saved.playerID) {
      // Merge saved into current state
      Object.keys(gameState).forEach(k => {
        if (saved[k] !== undefined) gameState[k] = saved[k];
      });
      gameState.playerID = saved.playerID;
      gameState.activeCropTimers = [];
      gameState.crops.forEach(c => c.timerId = null);
      gameState.activeEffects = saved.activeEffects || [];
      gameState.activeEffects.forEach(e => e.timerId = null);

      console.log('Game loaded from localStorage');
      const name = gameState.username || gameState.playerID;
      showToast(`Welcome back, ${name}!`, 'success');
      updateSaveInfo();
      return true;
    }
    throw 'invalid format';
  } catch {
    console.log('Starting new game (no valid save)');
    return false;
  }
}


function importGameData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const loadedState = JSON.parse(e.target.result);
                
                if (loadedState.gameVersion && loadedState.playerID) {
                    // Clear existing timers
                    clearAllCropTimers();
                    
                    // Load the state
                    Object.keys(gameState).forEach(key => {
                        if (loadedState[key] !== undefined) {
                            gameState[key] = loadedState[key];
                        }
                    });
                    
                    // Reset runtime data
                    gameState.activeCropTimers = [];
                    gameState.crops.forEach(crop => {
                        crop.timerId = null;
                    });
                    gameState.activeEffects = loadedState.activeEffects || [];
                    gameState.activeEffects.forEach(e => e.timerId = null);
                    
                    // Reinitialize the game with loaded data
                    generateCows();
                    renderCrops();
                    updateDisplay();
                    updateBulletin();
                    updateAchievements();
                    restartEffectTimers();

                    showToast(`Game loaded! Welcome back, Day ${gameState.day}!`, 'success');
                } else {
                    showToast('Invalid save file format!', 'failure');
                }
            } catch (error) {
                console.error('Error importing game:', error);
                showToast('Error loading save file!', 'failure');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

function resetGameData() {
    if (confirm('Are you sure you want to reset all game data? This cannot be undone!')) {
        const oldId = gameState.playerID;
        clearAllCropTimers();

        // Remove player entry from leaderboard
        try {
            const key = 'leaderboardData';
            const raw = localStorage.getItem(key);
            if (raw) {
                const data = JSON.parse(raw);
                data.players = data.players.filter(p => p.id !== oldId);
                localStorage.setItem(key, JSON.stringify(data));
            }
        } catch (err) {
            console.error('Error removing from leaderboard', err);
        }

        // Remove any saved data so a fresh game starts on reload
        localStorage.removeItem(SAVE_KEY);

        // Reset properties of existing gameState object instead of reassigning
        Object.keys(gameState).forEach(key => delete gameState[key]);
        
        // Set the initial values
        Object.assign(gameState, {
            coins: 100,
            milk: 0,
            xp: 0,
            day: 1,
            totalScore: 0,
            cows: [],
            lockedCows: [],
            crops: [],
            upgrades: {},
            effects: {},
            dailyMilkTotals: [],
            dailyCoinTotals: [],
            dailyStats: {
                happiest: null,
                milkProduced: 0,
                coinsEarned: 0,
                perfectScores: 0,
                totalGames: 0
            },
            achievements: [],
            claimedAchievements: [],
            unclaimedAchievements: [],
            stats: {
                totalMilkProduced: 0,
                totalCoinsEarned: 0,
                totalPerfectScores: 0,
                cropsHarvested: 0,
                cropTypesHarvested: {},
                cowsHappy: 0,
                maxCombo: 0,
                perfectStreak: 0,
                currentPerfectStreak: 0,
                upgradesPurchased: 0,
                secretCowsUnlocked: 0,
                playedAtMidnight: false,
                harvestTimestamps: []
            },
            perfectStreakRecord: 0,
            activeCropTimers: [],
            activeEffects: [],
            currentSeasonIndex: 0,
            currentWeatherIndex: 0,
            username: '',
            playerID: '',
            lastSaved: null,
            gameVersion: "2.1"
        });
        
        // Clear memory backup
        delete window.gameDataBackup;
        
        // Restart the game
        initializeGame();
        showToast('Game reset! Starting fresh.', 'success');
    }
}

// Update leaderboard stored in localStorage with latest save info
function updateLocalLeaderboard(state) {
    try {
        const key = 'leaderboardData';
        const raw = localStorage.getItem(key);
        const data = raw ? JSON.parse(raw) : { players: [] };

        const name = state.username || state.playerID;
        let entry = data.players.find(p => p.id === state.playerID);
        if (entry) {
            entry.name = name;
            entry.xp = state.xp;
            entry.days = state.day;
        } else {
            data.players.push({ id: state.playerID, name, xp: state.xp, days: state.day });
        }

        data.players.sort((a, b) => b.xp - a.xp);
        localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
        console.error('Error updating leaderboard', err);
    }
}

// Auto-save functionality
function setupAutoSave() {
    // Auto-save according to settings
    setInterval(() => {
        saveGameState();
    }, GAME_CONFIG.AUTO_SAVE_INTERVAL);
    
    // Save when page is about to unload
    window.addEventListener('beforeunload', () => {
        saveGameState();
    });
    
    // Save when page becomes hidden (mobile switching apps)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveGameState();
        }
    });
}
