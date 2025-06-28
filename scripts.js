let gameState = {
    coins: 100,
    milk: 0,
    day: 1,
    totalScore: 0,
    cows: [],
    lockedCows: [],
    crops: [],
    upgrades: {
        pitchfork: 0,
        metronome: 0,
        barn: 0,
        cowbell: 0
    },
    dailyStats: {
        happiest: null,
        milkProduced: 0,
        coinsEarned: 0,
        perfectScores: 0,
        totalGames: 0
    },
    achievements: [],
    totalMilkProduced: 0,
    totalCoinsEarned: 0,
    totalPerfectScores: 0, // FIX: Added persistent perfect score counter
    perfectStreakRecord: 0,
    activeCropTimers: [], // FIX: Track crop timers to prevent memory leaks
    playerID: null, // Unique device identifier
    lastSaved: null, // Timestamp of last save
    gameVersion: "1.0" // For future compatibility
};

// Generate unique device fingerprint for save identification
function generateDeviceID() {
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
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return 'player_' + Math.abs(hash).toString(36);
}

// Save/Load System
function saveGameState() {
    try {
        gameState.playerID = gameState.playerID || generateDeviceID();
        gameState.lastSaved = new Date().toISOString();
        
        // Create clean save data (remove active timers and runtime data)
        const saveData = {
            ...gameState,
            activeCropTimers: [], // Don't save active timers
            crops: gameState.crops.map(crop => ({
                ...crop,
                timerId: null // Don't save timer IDs
            }))
        };
        
        const saveString = JSON.stringify(saveData, null, 2);
        
        // Try to save to localStorage (won't work in Claude.ai but will work when deployed)
        try {
            localStorage.setItem(`moo_d_swings_${gameState.playerID}`, saveString);
            console.log('Game saved to localStorage');
        } catch (e) {
            console.log('localStorage not available (normal in Claude.ai environment)');
        }
        
        return saveData;
    } catch (error) {
        console.error('Error saving game:', error);
        showToast('Error saving game!', 'failure');
        return null;
    }
}

function loadGameState() {
    try {
        const playerID = generateDeviceID();
        const savedData = localStorage.getItem(`moo_d_swings_${playerID}`);
        
        if (savedData) {
            const loadedState = JSON.parse(savedData);
            
            // Validate the save data
            if (loadedState.gameVersion && loadedState.playerID) {
                // Merge loaded state with current state, preserving structure
                Object.keys(gameState).forEach(key => {
                    if (loadedState[key] !== undefined) {
                        gameState[key] = loadedState[key];
                    }
                });
                
                // Ensure playerID is set
                gameState.playerID = playerID;
                
                // Clear any active timers from the loaded state
                gameState.activeCropTimers = [];
                gameState.crops.forEach(crop => {
                    crop.timerId = null;
                });
                
                console.log('Game loaded from localStorage');
                showToast(`Welcome back, ${playerID}! Game loaded.`, 'success');
                return true;
            }
        }
        
        // No save found, initialize new game
        gameState.playerID = playerID;
        console.log(`New player: ${playerID}`);
        return false;
    } catch (error) {
        console.error('Error loading game:', error);
        gameState.playerID = generateDeviceID();
        return false;
    }
}

function exportGameData() {
    const saveData = saveGameState();
    if (!saveData) return;
    
    const blob = new Blob([JSON.stringify(saveData, null, 2)], {
        type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moo_d_swings_save_${saveData.playerID}_day${saveData.day}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Game data exported!', 'success');
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
                    
                    // Reinitialize the game with loaded data
                    generateCows();
                    renderCrops();
                    updateDisplay();
                    updateBulletin();
                    updateAchievements();
                    
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
        clearAllCropTimers();
        
        // Reset to initial state
        gameState = {
            coins: 100,
            milk: 0,
            day: 1,
            totalScore: 0,
            cows: [],
            lockedCows: [],
            crops: [],
            upgrades: {
                pitchfork: 0,
                metronome: 0,
                barn: 0,
                cowbell: 0
            },
            dailyStats: {
                happiest: null,
                milkProduced: 0,
                coinsEarned: 0,
                perfectScores: 0,
                totalGames: 0
            },
            achievements: [],
            totalMilkProduced: 0,
            totalCoinsEarned: 0,
            totalPerfectScores: 0,
            perfectStreakRecord: 0,
            activeCropTimers: [],
            playerID: generateDeviceID(),
            lastSaved: null,
            gameVersion: "1.0"
        };
        
        // Clear localStorage
        try {
            localStorage.removeItem(`moo_d_swings_${gameState.playerID}`);
        } catch (e) {
            console.log('localStorage not available');
        }
        
        // Restart the game
        initializeGame();
        showToast('Game reset! Starting fresh.', 'success');
    }
}

// Auto-save functionality
function setupAutoSave() {
    // Auto-save every 2 minutes
    setInterval(() => {
        saveGameState();
    }, 120000);
    
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

const cropTypes = {
    carrot: { emoji: '🥕', icon: 'carrot', cost: 10, value: 20, growTime: 30000, name: 'Carrot' },
    corn: { emoji: '🌽', icon: 'corn', cost: 25, value: 45, growTime: 45000, name: 'Corn' },
    rainbow: { emoji: '🌈', icon: 'rainbow', cost: 50, value: 100, growTime: 60000, name: 'Rainbow Crop' }
};

const upgradeConfigs = {
    pitchfork: [
        { id: 'pitchforkBtn', cost: 100, name: 'Better Pitchfork - Easier rhythm games!' },
        { id: 'pitchfork2Btn', cost: 400, name: 'Super Pitchfork - Huge timing window!' }
    ],
    metronome: [
        { id: 'metronomeBtn', cost: 150, name: 'Metronome - Perfect timing assistance!' },
        { id: 'metronome2Btn', cost: 600, name: 'AI Metronome - Auto-adjusting beats!' }
    ],
    barn: [
        { id: 'barnBtn', cost: 300, name: 'Neon Pink Barn - Double milk production!' },
        { id: 'barn2Btn', cost: 1000, name: 'Starlight Barn - Triple milk production!' }
    ],
    cowbell: [
        { id: 'cowbellBtn', cost: 500, name: 'Golden Cowbell - All cows start happier!' }
    ]
};

let cowData = [];
let secretCows = [];

// fetch and then bootstrap game
fetch('cows.json?v=moo3.5')
  .then(res => res.json())
  .then(data => {
    cowData     = data.cowData;
    secretCows  = data.secretCows;
    initializeGame();
  })
  .catch(err => console.error('Failed to load cows.json', err));

// FIX: Helper function to safely deduct coins
function deductCoins(amount, context = 'purchase') {
    if (gameState.coins < amount) {
        showToast(`Not enough coins for ${context}!`, 'failure');
        return false;
    }
    gameState.coins = Math.max(0, gameState.coins - amount);
    return true;
}

// FIX: Clear all crop timers to prevent memory leaks
function clearAllCropTimers() {
    gameState.activeCropTimers.forEach(timerId => {
        clearTimeout(timerId);
    });
    gameState.activeCropTimers = [];
}

// Mobile-optimized game functions
function initializeGame() {
    // Try to load saved game first
    const loadedSave = loadGameState();
    
    if (!loadedSave) {
        // New game - initialize everything
        generateCows();
        initializeCrops();
    } else {
        // Loaded game - reinitialize display elements
        generateCows(); // This will use existing cow data
        renderCrops(); // This will use existing crop data
        
        // Restart any crop timers that should still be running
        gameState.crops.forEach(crop => {
            if (crop.type && !crop.isReady && crop.readyAt) {
                const timeLeft = crop.readyAt - Date.now();
                if (timeLeft > 0) {
                    const cropData = cropTypes[crop.type];
                    crop.timerId = setTimeout(() => {
                        if (crop.type && !crop.isReady) {
                            crop.isReady = true;
                            renderCrops();
                            showToast(`${cropData.name} is ready to harvest! 🌾`, 'success');
                        }
                    }, timeLeft);
                    gameState.activeCropTimers.push(crop.timerId);
                } else {
                    // Crop should already be ready
                    crop.isReady = true;
                }
            }
        });
    }
    
    updateDisplay();
    updateBulletin();
    updateAchievements();
    updateShopButtons();
    updateSaveInfo();
    
    // Setup auto-save system
    setupAutoSave();
}

function updateSaveInfo() {
    const playerIDEl = document.getElementById('playerID');
    const lastSavedEl = document.getElementById('lastSaved');
    
    if (playerIDEl) {
        playerIDEl.textContent = gameState.playerID || 'Not set';
    }
    
    if (lastSavedEl) {
        if (gameState.lastSaved) {
            const saveDate = new Date(gameState.lastSaved);
            lastSavedEl.textContent = saveDate.toLocaleTimeString();
        } else {
            lastSavedEl.textContent = 'Never';
        }
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Reset scroll position for new tab
    const wrapper = document.querySelector('.tab-content-wrapper');
    if (wrapper) wrapper.scrollTop = 0;
    
    // Haptic feedback if supported
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function buildCow(cow) {
    const { locked, ...base } = cow;  // remove existing lock state
    return {
        ...base,
        locked: false,                  // ensure unlocked
        currentMood: base.moods[Math.floor(Math.random() * base.moods.length)],
        currentDemand: base.demands[Math.floor(Math.random() * base.demands.length)],
        isHappy: Math.random() > 0.3,
        lastPlayed: null,
        happinessLevel: Math.floor(Math.random() * 100) + 1
    };
}

function generateCows() {
    if (gameState.cows.length === 0 && gameState.lockedCows.length === 0) {
        // Initialize with first cow unlocked and rest locked
        const [firstCow, ...others] = cowData;
        gameState.cows = [buildCow(firstCow)];
        gameState.lockedCows = others.map(cow => ({ ...cow, locked: true }));
        gameState.lockedCows.push(...secretCows.map(c => ({ ...c, locked: true })));
        
        // Immediately check for any that should be unlocked based on starting conditions
        checkAllCowUnlocks();
    } else {
        // Regenerate mood for existing cows
        gameState.cows = gameState.cows.map(buildCow);
    }
    renderCows();
}

function getUnlockText(cow) {
    if (!cow.unlockCondition) return 'Unlock requirement unknown';
    if (cow.unlockCondition === 'perfectScores') {
        return `Get ${cow.unlockTarget} perfect scores (${gameState.totalPerfectScores}/${cow.unlockTarget})`;
    }
    if (cow.unlockCondition === 'totalMilk') {
        return `Produce ${cow.unlockTarget} milk (${gameState.totalMilkProduced}/${cow.unlockTarget})`;
    }
    if (cow.unlockCondition === 'totalCoins') {
        return `Earn ${cow.unlockTarget} coins (${gameState.totalCoinsEarned}/${cow.unlockTarget})`;
    }
    if (cow.unlockCondition === 'day') {
        return `Reach day ${cow.unlockTarget} (${gameState.day}/${cow.unlockTarget})`;
    }
    return 'Unlock requirement unknown';
}

function renderCows() {
    const grid = document.getElementById('cowsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    // Unlocked cows first
    gameState.cows.forEach((cow, idx) => {
        const cowCard = document.createElement('div');
        cowCard.className = 'cow-card';

        if (secretCows.some(sc => sc.name === cow.name)) {
            cowCard.classList.add('secret-cow-unlock');
        }

        const happinessColor = cow.isHappy ? '#32CD32' : '#FF6B6B';
        const heartIcon      = cow.isHappy ? '💚' : '💔';

        cowCard.innerHTML = `
            <div class="cow-icon">${cow.emoji}</div>
            <div class="cow-name">${cow.name}</div>
            <div class="cow-mood" style="color: ${happinessColor};">
                ${heartIcon} ${cow.currentMood} (${cow.moodValue})
            </div>
            <div class="cow-demand">"${cow.currentDemand}"</div>
            <button class="mood-button" onclick="startMinigame(${idx})">
                ${cow.isHappy ? 'Keep Happy!' : 'Cheer Up!'}
            </button>
        `;
        grid.appendChild(cowCard);
    });

    // Locked cows
    gameState.lockedCows.forEach(cow => {
        const cowCard = document.createElement('div');
        cowCard.className = 'cow-card locked-cow';
        const unlockText = getUnlockText(cow);

        cowCard.title = unlockText;
        cowCard.innerHTML = `
            <div class="cow-icon">🔒</div>
            <div class="cow-name">${cow.name} - Locked</div>
            <div style="font-size: 0.7em; color: #999; margin-top: 5px;">
                ${unlockText}
            </div>
        `;
        grid.appendChild(cowCard);
    });
}

function initializeCrops() {
    gameState.crops = [];
    for (let i = 0; i < 12; i++) {
        gameState.crops.push({
            id: i,
            type: null,
            plantedAt: null,
            readyAt: null,
            isReady: false,
            timerId: null // FIX: Track timer ID
        });
    }
    renderCrops();
}

function renderCrops() {
    const grid = document.getElementById('cropsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    gameState.crops.forEach((crop, index) => {
        const cropSlot = document.createElement('div');
        cropSlot.className = 'crop-slot';
        cropSlot.onclick = () => handleCropClick(index);
        
        if (crop.type) {
            const cropData = cropTypes[crop.type];
            cropSlot.classList.add(crop.isReady ? 'crop-ready' : 'crop-planted');
            
            if (crop.isReady) {
                cropSlot.innerHTML = `<div class="crop-emoji">${cropData.emoji}</div>`;
            } else {
                const timeLeft = Math.max(0, crop.readyAt - Date.now());
                const seconds = Math.ceil(timeLeft / 1000);
                cropSlot.innerHTML = `
                    <div class="crop-emoji">🌱</div>
                    <div class="growth-timer">${seconds}s</div>
                `;
            }
        } else {
            cropSlot.innerHTML = '<div style="color: #8B4513; font-size: 1.5em;">➕</div>';
        }
        
        grid.appendChild(cropSlot);
    });
}

function handleCropClick(index) {
    const crop = gameState.crops[index];
    
    if (crop.isReady) {
        harvestCrop(index);
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    } else if (!crop.type) {
        showToast("Use the plant buttons below to grow crops!", 'info');
    }
}

function plantCrop(type) {
    const cropData = cropTypes[type];
    
    // FIX: Use safe coin deduction
    if (!deductCoins(cropData.cost, `planting ${cropData.name}`)) {
        return;
    }
    
    const emptySlot = gameState.crops.find(crop => !crop.type);
    if (!emptySlot) {
        showToast("No empty crop slots! Harvest some crops first.", 'failure');
        gameState.coins += cropData.cost; // Refund coins
        return;
    }
    
    emptySlot.type = type;
    emptySlot.plantedAt = Date.now();
    emptySlot.readyAt = Date.now() + cropData.growTime;
    emptySlot.isReady = false;
    
    // FIX: Store timer ID and add safety check
    emptySlot.timerId = setTimeout(() => {
        if (emptySlot.type === type && !emptySlot.isReady) { // Safety check
            emptySlot.isReady = true;
            renderCrops();
            showToast(`${cropData.name} is ready to harvest! 🌾`, 'success');
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
        }
    }, cropData.growTime);
    
    gameState.activeCropTimers.push(emptySlot.timerId);
    
    updateDisplay();
    renderCrops();
    showToast(`Planted ${cropData.name}!`, 'success');
    
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function harvestCrop(index) {
    const crop = gameState.crops[index];
    if (!crop.isReady) return;
    
    const cropData = cropTypes[crop.type];
    gameState.coins += cropData.value;
    gameState.dailyStats.coinsEarned += cropData.value;
    gameState.totalCoinsEarned += cropData.value;
    
    // FIX: Clear timer if it exists
    if (crop.timerId) {
        clearTimeout(crop.timerId);
        const timerIndex = gameState.activeCropTimers.indexOf(crop.timerId);
        if (timerIndex > -1) {
            gameState.activeCropTimers.splice(timerIndex, 1);
        }
    }
    
    crop.type = null;
    crop.plantedAt = null;
    crop.readyAt = null;
    crop.isReady = false;
    crop.timerId = null;
    
    updateDisplay(); // This now includes unlock check
    renderCrops();
    checkAchievements();
    showToast(`Harvested ${cropData.name}! +${cropData.value} coins!`, 'success');
}

function harvestAll() {
    let harvested = 0;
    let totalValue = 0;
    
    gameState.crops.forEach((crop) => {
        if (crop.isReady) {
            const cropData = cropTypes[crop.type];
            totalValue += cropData.value;
            harvested++;
            
            // FIX: Clear timer if it exists
            if (crop.timerId) {
                clearTimeout(crop.timerId);
                const timerIndex = gameState.activeCropTimers.indexOf(crop.timerId);
                if (timerIndex > -1) {
                    gameState.activeCropTimers.splice(timerIndex, 1);
                }
            }
            
            crop.type = null;
            crop.plantedAt = null;
            crop.readyAt = null;
            crop.isReady = false;
            crop.timerId = null;
        }
    });
    
    if (harvested > 0) {
        gameState.coins += totalValue;
        gameState.dailyStats.coinsEarned += totalValue;
        gameState.totalCoinsEarned += totalValue;
        updateDisplay(); // This now includes unlock check
        renderCrops();
        checkAchievements();
        showToast(`Harvested ${harvested} crops! +${totalValue} coins!`, 'success');
        
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 100]);
        }
    } else {
        showToast("No crops ready to harvest!", 'info');
    }
}

function updateShopButtons() {
    Object.keys(upgradeConfigs).forEach(type => {
        upgradeConfigs[type].forEach((info, index) => {
            const btn = document.getElementById(info.id);
            if (!btn) return;
            const levelOwned = gameState.upgrades[type];
            const levelRequired = index + 1;

            if (levelOwned >= levelRequired) {
                btn.textContent = 'OWNED';
                btn.disabled = true;
                btn.style.background = 'linear-gradient(145deg, #32CD32, #228B22)';
            } else if (levelRequired > levelOwned + 1) {
                btn.textContent = 'LOCKED';
                btn.disabled = true;
                btn.style.background = 'linear-gradient(145deg, #999, #777)';
            } else if (gameState.coins < info.cost) {
                btn.textContent = 'BUY';
                btn.disabled = true;
                btn.style.background = 'linear-gradient(145deg, #999, #777)';
            } else {
                btn.textContent = 'BUY';
                btn.disabled = false;
                btn.style.background = 'linear-gradient(145deg, #32CD32, #228B22)';
            }
        });
    });
}

function buyUpgrade(type, level) {
    level = level || 1;
    const info = upgradeConfigs[type][level - 1];

    if (!info) {
        showToast('Invalid upgrade!', 'failure');
        return;
    }

    if (gameState.upgrades[type] >= level) {
        showToast('You already own this upgrade!', 'info');
        return;
    }

    if (level > gameState.upgrades[type] + 1) {
        showToast('Purchase previous levels first!', 'failure');
        return;
    }

    // FIX: Use safe coin deduction
    if (!deductCoins(info.cost, info.name)) {
        return;
    }

    gameState.upgrades[type] = level;

    updateDisplay();
    updateShopButtons();
    showToast(`Purchased: ${info.name}`, 'success');
    checkAchievements();
    
    // Auto-save after purchase
    saveGameState();
    updateSaveInfo();

    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
}

function nextDay() {
    gameState.day++;
    gameState.dailyStats = {
        happiest: null,
        milkProduced: 0,
        coinsEarned: 0,
        perfectScores: 0,
        totalGames: 0
    };
    
    generateCows();
    
    // Apply cowbell upgrade
    if (gameState.upgrades.cowbell > 0) {
        gameState.cows.forEach(cow => {
            cow.isHappy = Math.random() > 0.2; // Higher chance of happiness
            cow.happinessLevel = Math.floor(Math.random() * 50) + 51; // Start with higher happiness
        });
    }
    
    // FIXED: Always check unlocks when day advances
    checkAllCowUnlocks();
    
    updateBulletin();
    updateDisplay();
    
    // Auto-save after advancing day
    saveGameState();
    updateSaveInfo();
    
    showToast(`🌅 Day ${gameState.day} begins! Your cows have new moods!`, 'success');
    
    if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
    }
}

function updateBulletin() {
    const bulletin = document.getElementById('bulletinBoard');
    if (!bulletin) return;
    
    const happyCows = gameState.cows.filter(cow => cow.isHappy);
    const totalCows = gameState.cows.length;
    
    bulletin.innerHTML = `
        <div style="margin-bottom: 12px;">
            <h3 style="color: #8B4513; margin-bottom: 8px; font-family: 'Montserrat', sans-serif;  font-size: 1.1em; font-weight: 700;">
                📋 DAILY FARM REPORT - DAY ${gameState.day}
            </h3>
            <p style="font-weight: 800; color: #654321; margin: 4px 0;"><strong>Happy Cows:</strong> ${happyCows.length}/${totalCows}</p>
            <p style="font-weight: 800; color: #654321; margin: 4px 0;"><strong>Milk Produced:</strong> ${gameState.dailyStats.milkProduced}</p>
            <p style="font-weight: 800; color: #654321; margin: 4px 0;"><strong>Coins Earned:</strong> ${gameState.dailyStats.coinsEarned}</p>
            <p style="font-weight: 800; color: #654321; margin: 4px 0;"><strong>Perfect Scores:</strong> ${gameState.dailyStats.perfectScores}</p>
            <p style="font-weight: 800; color: #654321; margin: 4px 0;"><strong>Total Perfects:</strong> ${gameState.totalPerfectScores}</p>
        </div>
        <div style="margin-bottom: 12px; padding: 8px; background: linear-gradient(145deg, #87CEEB, #ADD8E6); border-radius: 8px; border: 2px solid #4169E1;">
            <h4 style="color: #191970; margin-bottom: 4px; font-weight: 800; font-size: 0.9em; font-family: 'Montserrat', sans-serif;">
                🔓 UNLOCK PROGRESS
            </h4>
            <p style="color: #191970; font-weight: 700; font-size: 0.7em;">Total Milk: ${gameState.totalMilkProduced} | Total Coins: ${gameState.totalCoinsEarned}</p>
            <p style="color: #191970; font-weight: 700; font-size: 0.7em;">Perfect Scores: ${gameState.totalPerfectScores} | Day: ${gameState.day}</p>
            <p style="color: #191970; font-weight: 700; font-size: 0.7em;">Locked Cows: ${gameState.lockedCows.length}</p>
        </div>
        ${gameState.dailyStats.happiest ? `
        <div style="margin-bottom: 12px; padding: 8px; background: linear-gradient(145deg, #D4941E, #B8860B); border-radius: 8px; border: 2px solid #8B4513;">
            <h4 style="color: #F5E6D3; margin-bottom: 4px; font-weight: 800;  font-size: 0.9em; font-family: 'Montserrat', sans-serif;">
                👑 COW OF THE DAY
            </h4>
            <p style="color: #F5E6D3; font-weight: 700; font-size: 0.8em;">${gameState.dailyStats.happiest} was the happiest cow today!</p>
        </div>
        ` : ''}
        <div style="padding: 8px; background: linear-gradient(145deg, #E6A853, #D4941E); border-radius: 8px; border: 2px solid #8B4513;">
            <h4 style="color: #F5E6D3; margin-bottom: 4px; font-weight: 800;  font-size: 0.9em; font-family: 'Montserrat', sans-serif;">
                💡 FARM TIP
            </h4>
            <p style="color: #F5E6D3; font-weight: 700; font-size: 0.8em;">${getFarmTip()}</p>
        </div>
    `;
}

function getFarmTip() {
    const tips = [
        "Plant rainbow crops for maximum profit!",
        "Keep all your cows happy for bonus rewards!",
        "Upgrades make rhythm games easier to win!",
        "Perfect scores unlock secret cows!",
        "Harvest crops regularly to keep earning!",
        "Each cow has their own rhythm style!",
        "The neon pink barn doubles milk production!",
        "Golden cowbell makes cows start happier each day!",
        "Build combos in rhythm games for bonus points!",
        "Secret cows have special unlock conditions!"
    ];
    return tips[Math.floor(Math.random() * tips.length)];
}

// FIXED: Combined unlock check function that handles both regular and secret cows
function checkAllCowUnlocks() {
    let anyUnlocked = false;
    
    // Check all locked cows (both regular and secret)
    for (let i = gameState.lockedCows.length - 1; i >= 0; i--) {
        const cow = gameState.lockedCows[i];
        let unlocked = false;
        
        // Check unlock conditions
        if (cow.unlockCondition === 'totalMilk' && gameState.totalMilkProduced >= cow.unlockTarget) {
            unlocked = true;
        } else if (cow.unlockCondition === 'totalCoins' && gameState.totalCoinsEarned >= cow.unlockTarget) {
            unlocked = true;
        } else if (cow.unlockCondition === 'day' && gameState.day >= cow.unlockTarget) {
            unlocked = true;
        } else if (cow.unlockCondition === 'perfectScores' && gameState.totalPerfectScores >= cow.unlockTarget) {
            unlocked = true;
        }

        if (unlocked) {
            const newCow = buildCow(cow);
            gameState.lockedCows.splice(i, 1);
            gameState.cows.push(newCow);
            
            // Check if it's a secret cow
            const isSecret = secretCows.find(sc => sc.name === cow.name);
            if (isSecret) {
                showAchievement(`🎉 Secret Cow Unlocked!`, `${cow.name} has joined your herd!`);
                showToast(`🌟 SECRET COW UNLOCKED: ${cow.name}!`, 'success');
            } else {
                showAchievement(`🐮 New Cow Unlocked!`, `${cow.name} has joined your herd!`);
                showToast(`🐄 NEW COW: ${cow.name} joined your farm!`, 'success');
            }
            
            anyUnlocked = true;
        }
    }
    
    if (anyUnlocked) {
        renderCows();
        updateBulletin();
    }
}

// Legacy functions for backward compatibility
function checkCowUnlocks() {
    checkAllCowUnlocks();
}

function checkSecretCowUnlocks() {
    checkAllCowUnlocks();
}

function checkAchievements() {
    const newAchievements = [];
    
    if (gameState.totalMilkProduced >= 500 && !gameState.achievements.includes('milk_master')) {
        gameState.achievements.push('milk_master');
        newAchievements.push({title: '🥛 Milk Master!', desc: 'Produced 500+ total milk!'});
    }
    
    if (gameState.totalCoinsEarned >= 2000 && !gameState.achievements.includes('coin_collector')) {
        gameState.achievements.push('coin_collector');
        newAchievements.push({title: '💰 Coin Collector!', desc: 'Earned 2000+ total coins!'});
    }
    
    if (gameState.day >= 10 && !gameState.achievements.includes('veteran_farmer')) {
        gameState.achievements.push('veteran_farmer');
        newAchievements.push({title: '🌾 Veteran Farmer!', desc: 'Survived 10 days on the farm!'});
    }
    
    // FIX: Add safety check to prevent division by zero
    const allCowsHappy = gameState.cows.length > 0 && gameState.cows.every(cow => cow.isHappy);
    if (allCowsHappy && gameState.cows.length >= 6 && !gameState.achievements.includes('happiness_guru')) {
        gameState.achievements.push('happiness_guru');
        newAchievements.push({title: '😊 Happiness Guru!', desc: 'Made all cows happy at once!'});
    }
    
    newAchievements.forEach(achievement => {
        showAchievement(achievement.title, achievement.desc);
    });
    
    updateAchievements();
    updateShopButtons();
}

function updateAchievements() {
    const achievementsList = document.getElementById('achievementsList');
    if (!achievementsList) return;
    
    if (gameState.achievements.length === 0) {
        achievementsList.innerHTML = `
            <p style="color: #666; font-style: italic; text-align: center;">
                🎯 No achievements yet - keep playing to unlock them!
            </p>
        `;
        return;
    }
    
    const achievementData = {
        all_upgrades: {icon: '🔧', name: 'Master Farmer', desc: 'Purchased all basic upgrades'},
        milk_master: {icon: '🥛', name: 'Milk Master', desc: 'Produced 500+ total milk'},
        coin_collector: {icon: '💰', name: 'Coin Collector', desc: 'Earned 2000+ total coins'},
        veteran_farmer: {icon: '📅', name: 'Veteran Farmer', desc: 'Survived 10 days'},
        happiness_guru: {icon: '💚', name: 'Happiness Guru', desc: 'Made all cows happy at once'}
    };
    
    achievementsList.innerHTML = gameState.achievements.map(achievementId => {
        const achievement = achievementData[achievementId];
        return `
            <div style="display: flex; align-items: center; gap: 10px; margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.3); border-radius: 8px;">
                <div style="font-size: 1.5em;">${achievement.icon}</div>
                <div>
                    <div style="font-weight: bold; color: #4169E1;">${achievement.name}</div>
                    <div style="font-size: 0.8em; color: #666;">${achievement.desc}</div>
                </div>
            </div>
        `;
    }).join('');
}

function showAchievement(title, description) {
    const achievement = document.getElementById('achievementPopup');
    if (!achievement) return;
    
    achievement.innerHTML = `
        <div class="achievement-title">${title}</div>
        <div style="font-size: 0.9em;">${description}</div>
    `;
    
    achievement.style.display = 'block';
    
    setTimeout(() => {
        achievement.style.display = 'none';
    }, 4000);
    
    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500]);
    }
}

// Mobile-optimized minigame functions
function startMinigame(cowIndex) {
    if (cowIndex >= gameState.cows.length) return; // FIX: Safety check
    
    const cow = gameState.cows[cowIndex];
    const overlay = document.getElementById('minigameOverlay');
    const title = document.getElementById('minigameTitle');
    const instructions = document.getElementById('minigameInstructions');
    
    if (!overlay || !title || !instructions) return;
    
    title.innerHTML = `${cow.emoji} ${cow.name}'s ${cow.gameType.toUpperCase()} Challenge!`;
    instructions.textContent = getGameInstructions(cow.gameType);
    
    overlay.style.display = 'block';
    startRhythmGame(cowIndex);
    
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
}

function getGameInstructions(gameType) {
    const instructions = {
        pitch: "Tap when notes cross the center! Match the diva's perfect pitch!",
        rapid: "Rapid TAP to rev the engine! Don't let it stall!",
        smooth: "Gentle taps for a smooth serenade!",
        battle: "TAP to parry grass attacks! Defend the pasture!",
        slow: "Slow, deliberate taps for melancholy mood!",
        rock: "Rock out with the rhythm! Feel the groove!",
        cosmic: "TAP in cosmic harmony with the universe!",
        pop: "Hit those pop beats with perfect timing!",
        electronic: "Drop the bass with electronic beats!"
    };
    return instructions[gameType] || "Follow the rhythm and make your cow happy!";
}

let currentMinigame = {
    cowIndex: -1,
    score: 0,
    target: 100,
    noteInterval: null,
    gameActive: false,
    combo: 0,
    maxCombo: 0
};

function startRhythmGame(cowIndex) {
    currentMinigame.cowIndex = cowIndex;
    currentMinigame.score = 0;
    currentMinigame.combo = 0;
    currentMinigame.maxCombo = 0;
    currentMinigame.target = 80 + (gameState.day * 15);
    currentMinigame.gameActive = true;
    
    document.getElementById('currentScore').textContent = '0';
    document.getElementById('targetScore').textContent = currentMinigame.target;
    document.getElementById('comboCount').textContent = '0';
    
    const cow = gameState.cows[cowIndex];
    const speed = getGameSpeed(cow.gameType);
    
    clearNotes();
    
    currentMinigame.noteInterval = setInterval(() => {
        if (currentMinigame.gameActive) {
            spawnNote();
        }
    }, speed);
    
    setTimeout(() => {
        if (currentMinigame.gameActive) {
            endMinigame();
        }
    }, 15000);
}

function getGameSpeed(gameType) {
    const speeds = {
        pitch: 1500,
        rapid: 800,
        smooth: 2000,
        battle: 1000,
        slow: 2500,
        rock: 1200,
        cosmic: 1800,
        pop: 1100,
        electronic: 900
    };
    
    let speed = speeds[gameType] || 1200;
    
    if (gameState.upgrades.metronome > 0) {
        speed *= 1 + gameState.upgrades.metronome * 0.3;
    }
    
    return speed;
}

function spawnNote() {
    const rhythmBar = document.getElementById('rhythmBar');
    if (!rhythmBar) return;
    
    const note = document.createElement('div');
    note.className = 'rhythm-note';
    note.style.left = '-60px';
    
    // Add special note types for variety
    if (Math.random() < 0.2) {
        note.style.background = '#FF69B4'; // Special pink note worth more points
        note.classList.add('special-note');
    }
    
    note.addEventListener('touchstart', (e) => {
        e.preventDefault();
        hitNote(note);
    });
    
    note.addEventListener('click', (e) => {
        e.preventDefault();
        hitNote(note);
    });
    
    rhythmBar.appendChild(note);
    
    setTimeout(() => {
        if (note.parentNode) {
            note.parentNode.removeChild(note);
            // Miss penalty
            currentMinigame.combo = 0;
            document.getElementById('comboCount').textContent = currentMinigame.combo;
        }
    }, 3000);
}

function hitNote(note) {
    if (!note) return; // FIX: Safety check
    
    const noteRect = note.getBoundingClientRect();
    const marker = document.querySelector('.rhythm-marker');
    if (!marker) return;
    
    const markerRect = marker.getBoundingClientRect();
    const distance = Math.abs(noteRect.left + noteRect.width/2 - markerRect.left - markerRect.width/2);
    
    let points = 0;
    const tolerance = 1.2 + gameState.upgrades.pitchfork * 0.6;
    const isSpecialNote = note.classList.contains('special-note');
    const bonusMultiplier = isSpecialNote ? 2 : 1;
    
    if (distance < 40 * tolerance) {
        points = 25 * bonusMultiplier;
        currentMinigame.combo++;
        note.style.background = '#00FF00';
        showFloatingText(`+${points}!`, noteRect.left, noteRect.top);
        if (navigator.vibrate) navigator.vibrate(50);
    } else if (distance < 80 * tolerance) {
        points = 15 * bonusMultiplier;
        currentMinigame.combo++;
        note.style.background = '#FFFF00';
        showFloatingText(`+${points}!`, noteRect.left, noteRect.top);
        if (navigator.vibrate) navigator.vibrate(30);
    } else if (distance < 120 * tolerance) {
        points = 8 * bonusMultiplier;
        currentMinigame.combo = Math.max(0, currentMinigame.combo - 1);
        note.style.background = '#FF8C00';
        showFloatingText(`+${points}!`, noteRect.left, noteRect.top);
    } else {
        currentMinigame.combo = 0;
    }
    
    // Combo bonus
    if (currentMinigame.combo > 5) {
        points += Math.floor(currentMinigame.combo / 5) * 5;
    }
    
    currentMinigame.score += points;
    currentMinigame.maxCombo = Math.max(currentMinigame.maxCombo, currentMinigame.combo);
    
    document.getElementById('currentScore').textContent = currentMinigame.score;
    document.getElementById('comboCount').textContent = currentMinigame.combo;
    
    note.remove();
}

function showFloatingText(text, x, y) {
    const floatingText = document.createElement('div');
    floatingText.textContent = text;
    floatingText.style.position = 'fixed';
    floatingText.style.left = x + 'px';
    floatingText.style.top = y + 'px';
    floatingText.style.color = '#00FF00';
    floatingText.style.fontWeight = 'bold';
    floatingText.style.fontSize = '1.2em';
    floatingText.style.pointerEvents = 'none';
    floatingText.style.zIndex = '1003';
    floatingText.style.animation = 'floatUp 1s ease-out forwards';
    
    document.body.appendChild(floatingText);
    
    setTimeout(() => floatingText.remove(), 1000);
}

function endMinigame() {
    currentMinigame.gameActive = false;
    clearInterval(currentMinigame.noteInterval);
    clearNotes();
    
    // FIX: Safety check
    if (currentMinigame.cowIndex >= gameState.cows.length) return;
    
    const cow = gameState.cows[currentMinigame.cowIndex];
    const success = currentMinigame.score >= currentMinigame.target;
    
    gameState.dailyStats.totalGames++;
    
    if (success) {
        let milkReward = Math.floor(Math.random() * 20) + 15;
        let coinReward = Math.floor(Math.random() * 25) + 25;
        
        // Apply upgrade bonuses
        if (gameState.upgrades.barn > 0) milkReward *= 1 + gameState.upgrades.barn;
        if (gameState.upgrades.pitchfork > 0) coinReward += 15 * gameState.upgrades.pitchfork;
        
        // Combo bonus
        if (currentMinigame.maxCombo >= 10) {
            milkReward += 10;
            coinReward += 15;
        }
        
        if (currentMinigame.score >= currentMinigame.target * 1.4) {
            gameState.dailyStats.perfectScores++;
            gameState.totalPerfectScores++; // FIX: Update persistent counter
            milkReward += 25;
            coinReward += 35;
            showToast(`🎉 PERFECT! ${cow.name} is ecstatic!\n+${milkReward} milk, +${coinReward} coins!\nMax Combo: ${currentMinigame.maxCombo}`, 'success');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        } else {
            showToast(`🎉 Success! ${cow.name} is happy!\n+${milkReward} milk, +${coinReward} coins!\nMax Combo: ${currentMinigame.maxCombo}`, 'success');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
        
        gameState.milk += milkReward;
        gameState.coins += coinReward;
        gameState.dailyStats.milkProduced += milkReward;
        gameState.dailyStats.coinsEarned += coinReward;
        gameState.dailyStats.happiest = cow.name;
        gameState.totalMilkProduced += milkReward;
        gameState.totalCoinsEarned += coinReward;
        cow.isHappy = true;
        cow.happinessLevel = Math.min(100, cow.happinessLevel + 20);
    } else {
        const coinLoss = Math.floor(Math.random() * 8) + 3;
        gameState.coins = Math.max(0, gameState.coins - coinLoss);
        cow.isHappy = false;
        cow.happinessLevel = Math.max(1, cow.happinessLevel - 10);
        
        showToast(`😤 ${cow.name} is not impressed! -${coinLoss} coins.\nMax Combo: ${currentMinigame.maxCombo}`, 'failure');
        if (navigator.vibrate) navigator.vibrate(300);
    }
    
    updateDisplay(); // This now includes unlock check
    updateBulletin();
    renderCows();
    checkAchievements();
    
    // Auto-save after minigame
    if (success || gameState.totalPerfectScores > 0) {
        saveGameState();
        updateSaveInfo();
    }
}

function clearNotes() {
    const notes = document.querySelectorAll('.rhythm-note');
    notes.forEach(note => note.remove());
}

function closeMinigame() {
    if (currentMinigame.gameActive) {
        endMinigame();
    }
    const overlay = document.getElementById('minigameOverlay');
    if (overlay) overlay.style.display = 'none';
}

function showToast(text, type) {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;
    
    toast.textContent = text;
    
    if (type === 'success') {
        toast.style.background = 'linear-gradient(145deg, #98FB98, #90EE90)';
        toast.style.color = '#2F5F2F';
    } else if (type === 'failure') {
        toast.style.background = 'linear-gradient(145deg, #FFB6C1, #FFA0B4)';
        toast.style.color = '#8B0000';
    } else {
        toast.style.background = 'linear-gradient(145deg, #87CEEB, #ADD8E6)';
        toast.style.color = '#191970';
    }
    
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function updateDisplay() {
    const coinsEl = document.getElementById('coins');
    const milkEl  = document.getElementById('milk');
    const dayEl   = document.getElementById('day');
    const moodEl  = document.getElementById('happiness');

    // Update header stats
    if (coinsEl) coinsEl.textContent = gameState.coins;
    if (milkEl)  milkEl.textContent  = gameState.milk;
    if (dayEl)   dayEl.textContent   = gameState.day;

    // → NEW: average happiness across all unlocked cows
    if (moodEl) {
        const herd = gameState.cows;
        if (herd.length > 0) {
            const total = herd.reduce((sum, c) => sum + c.happinessLevel, 0);
            moodEl.textContent = Math.round(total / herd.length);
        } else {
            moodEl.textContent = '0';
        }
    }

    // → NEW: auto-unlock cows whose conditions are now met
    checkAllCowUnlocks();

    // Refresh shop buttons, etc.
    updateShopButtons();
}

// Mobile touch controls for minigame
document.getElementById('tapBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (currentMinigame.gameActive) {
        const notes = document.querySelectorAll('.rhythm-note');
        if (notes.length > 0) {
            const marker = document.querySelector('.rhythm-marker');
            if (!marker) return;
            
            const markerRect = marker.getBoundingClientRect();
            
            let closestNote = null;
            let closestDistance = Infinity;
            
            notes.forEach(note => {
                const noteRect = note.getBoundingClientRect();
                const distance = Math.abs(noteRect.left + noteRect.width/2 - markerRect.left - markerRect.width/2);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestNote = note;
                }
            });
            
            if (closestNote && closestDistance < 150) {
                hitNote(closestNote);
            }
        }
    }
});

document.getElementById('holdBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (currentMinigame.gameActive) {
        const notes = document.querySelectorAll('.rhythm-note');
        if (notes.length > 0) {
            const marker = document.querySelector('.rhythm-marker');
            if (!marker) return;
            
            const markerRect = marker.getBoundingClientRect();
            
            notes.forEach(note => {
                const noteRect = note.getBoundingClientRect();
                const distance = Math.abs(noteRect.left + noteRect.width/2 - markerRect.left - markerRect.width/2);
                
                if (distance < 120) {
                    hitNote(note);
                }
            });
        }
    }
});

// Auto-update crop timers
setInterval(() => {
    let needsUpdate = false;
    gameState.crops.forEach(crop => {
        if (crop.type && !crop.isReady && Date.now() >= crop.readyAt) {
            crop.isReady = true;
            needsUpdate = true;
        }
    });
    
    if (needsUpdate) {
        renderCrops();
    }
}, 1000);

// Debug functions to help troubleshoot unlock system
function debugUnlockSystem() {
    let debugInfo = `🔍 UNLOCK DEBUG INFO:\n\n`;
    debugInfo += `📊 Current Stats:\n`;
    debugInfo += `• Day: ${gameState.day}\n`;
    debugInfo += `• Total Milk: ${gameState.totalMilkProduced}\n`;
    debugInfo += `• Total Coins: ${gameState.totalCoinsEarned}\n`;
    debugInfo += `• Total Perfect Scores: ${gameState.totalPerfectScores}\n\n`;
    
    debugInfo += `🐮 Cow Status:\n`;
    debugInfo += `• Unlocked Cows: ${gameState.cows.length}\n`;
    debugInfo += `• Locked Cows: ${gameState.lockedCows.length}\n\n`;
    
    debugInfo += `🔒 Locked Cow Requirements:\n`;
    gameState.lockedCows.forEach(cow => {
        debugInfo += `• ${cow.name}: ${cow.unlockCondition} ${cow.unlockTarget}\n`;
        const currentValue = getCurrentStatValue(cow.unlockCondition);
        debugInfo += `  Current: ${currentValue}/${cow.unlockTarget} ${currentValue >= cow.unlockTarget ? '✅' : '❌'}\n`;
    });
    
    showToast(debugInfo, 'info');
    console.log(debugInfo);
}

function getCurrentStatValue(condition) {
    switch(condition) {
        case 'day': return gameState.day;
        case 'totalMilk': return gameState.totalMilkProduced;
        case 'totalCoins': return gameState.totalCoinsEarned;
        case 'perfectScores': return gameState.totalPerfectScores;
        default: return 0;
    }
}

function forceUnlockCheck() {
    const beforeCount = gameState.cows.length;
    checkAllCowUnlocks();
    const afterCount = gameState.cows.length;
    const unlocked = afterCount - beforeCount;
    
    if (unlocked > 0) {
        showToast(`🎉 Unlocked ${unlocked} cow(s)!`, 'success');
    } else {
        showToast(`No cows ready to unlock yet.`, 'info');
    }
}

// Initialize the mobile game
initializeGame();