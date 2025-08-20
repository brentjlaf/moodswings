// Game data containers
let cropTypes = {};
let shopData = {};
let rhythmPatterns = {};
let achievementsData = {};
let cowData = [];
let secretCows = [];
let statsChart;

// Data loading system
async function loadGameData() {
    try {
        console.log('Loading game data...');

        // Load configuration overrides first
        await loadConfigData();

        // Load all JSON data files
        const [cowsResponse, cropsResponse, shopResponse, rhythmResponse, achievementsResponse] = await Promise.all([
            fetch('cows.json?v=moo3.5'),
            fetch('crops.json?v=1.2'),
            fetch('shop.json?v=1.2'), 
            fetch('rhythm-patterns.json?v=1.3'),
            fetch('achievements.json?v=1.2')
        ]);

        // Parse JSON data
        const cowsData = await cowsResponse.json();
        const cropsData = await cropsResponse.json();
        shopData = await shopResponse.json();
        rhythmPatterns = await rhythmResponse.json();
        achievementsData = await achievementsResponse.json();

        // Process cow data
        cowData = cowsData.cowData;
        secretCows = cowsData.secretCows;

        // Convert crops array to lookup object for backward compatibility
        cropTypes = {};
        cropsData.crops.forEach(crop => {
            cropTypes[crop.id] = {
                emoji: crop.emoji,
                icon: crop.id,
                cost: crop.cost,
                value: crop.value,
                growTime: crop.growTime,
                name: crop.name,
                rarity: crop.rarity,
                unlockCondition: crop.unlockCondition,
                description: crop.description,
                eventOnly: crop.eventOnly
            };
        });

        console.log('Game data loaded successfully!');
        return true;
    } catch (error) {
        console.error('Failed to load game data:', error);
        showToast('Failed to load game data! Using defaults.', 'failure');
        
        // Fallback to minimal data
        cropTypes = {
            carrot: { emoji: '🥕', icon: 'carrot', cost: 10, value: 20, growTime: 30000, name: 'Carrot', rarity: 'common' }
        };
        shopData = { categories: [], items: [] };
        rhythmPatterns = { rhythmTypes: {} };
        achievementsData = { categories: [], achievements: [] };
        return false;
    }
}

const BANNED_WORDS = ['badword', 'curse', 'darn', 'poop'];

function containsBadWord(name) {
    const lowered = name.toLowerCase();
    return BANNED_WORDS.some(w => lowered.includes(w));
}

let gameState = {
    coins: 100,
    milk: 0,
    xp: 0,
    day: 1,
    totalScore: 0,
    cows: [],
    lockedCows: [],
    retiredCows: [],
    crops: [],
    upgrades: {},
    effects: {}, // Effect system for upgrades
    dailyMilkTotals: [],
    dailyCoinTotals: [],
    dailyStats: {
        happiest: null,
        milkProduced: 0,
        coinsEarned: 0,
        perfectScores: 0,
        totalGames: 0
    },
    achievements: [], // Array of earned achievement IDs
    claimedAchievements: [], // Rewards already collected
    unclaimedAchievements: [], // Earned achievements awaiting reward
    // Enhanced achievement tracking
    stats: {
        totalMilkProduced: 0,
        totalCoinsEarned: 0,
        totalPerfectScores: 0,
        cropsHarvested: 0,
        cropTypesHarvested: {}, // Track specific crop types
        cowsHappy: 0,
        maxCombo: 0,
        perfectStreak: 0,
        currentPerfectStreak: 0,
        upgradesPurchased: 0,
        secretCowsUnlocked: 0,
        playedAtMidnight: false,
        // NEW: Track timestamps of recent harvests for speedHarvest achievements
        harvestTimestamps: []
      },
    perfectStreakRecord: 0,
    activeCropTimers: [],
    activeEffects: [],
    isMeteorShower: false,
    currentSeasonIndex: 0,
    currentWeatherIndex: 0,
    currentTemperature: 0,
    username: '',
    playerID: null,
    lastSaved: null,
    gameVersion: "2.1" // Updated version for achievement system
};


// FIX: Helper function to safely deduct coins
function deductCoins(amount, context = 'purchase') {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        console.warn(`Invalid coin deduction: ${amount}`);
        return false;
    }
    if (gameState.coins < amount) {
        showToast(`Not enough coins for ${context}!`, 'failure');
        return false;
    }
    gameState.coins = Math.max(0, gameState.coins - amount);
    return true;
}

// NEW: Helper function to safely deduct milk
function deductMilk(amount, context = 'purchase') {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        console.warn(`Invalid milk deduction: ${amount}`);
        return false;
    }
    if (gameState.milk < amount) {
        showToast(`Not enough milk for ${context}!`, 'failure');
        return false;
    }
    gameState.milk = Math.max(0, gameState.milk - amount);
    return true;
}

// NEW: Helper to record harvest timestamps (keeps last 5 minutes)
function recordHarvestTimestamp() {
    const now = Date.now();
    const timestamps = gameState.stats.harvestTimestamps;
    timestamps.push(now);
    const cutoff = now - 300000; // 5 minutes
    gameState.stats.harvestTimestamps = timestamps.filter(ts => ts >= cutoff);
}

// FIX: Clear all crop timers to prevent memory leaks
function clearAllCropTimers() {
    gameState.activeCropTimers.forEach(timerId => {
        clearTimeout(timerId);
    });
    gameState.activeCropTimers = [];
    gameState.crops.forEach(crop => {
        if (crop.pestTimerId) {
            clearTimeout(crop.pestTimerId);
            crop.pestTimerId = null;
        }
        crop.hasPest = false;
        crop.pestExpiresAt = null;
        crop.pestPenalty = false;
    });
}

function addCropSlots(amount) {
    for (let i = 0; i < amount; i++) {
        const id = gameState.crops.length;
        gameState.crops.push({
            id: id,
            type: null,
            plantedAt: null,
            readyAt: null,
            isReady: false,
            timerId: null,
            hasPest: false,
            pestTimerId: null,
            pestExpiresAt: null,
            pestPenalty: false
        });
    }
    renderCrops();
}

function getItemCost(item) {
    if (item.id === 'crop_slot') {
        const level = gameState.upgrades[item.id] || 0;
        return 10000 + Math.floor(level / 3) * 5000;
    }
    return item.cost;
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandomIndex(options) {
    const total = options.reduce((sum, o) => sum + o.weight, 0);
    let r = Math.random() * total;
    for (const opt of options) {
        if (r < opt.weight) return opt.index;
        r -= opt.weight;
    }
    return options[0].index;
}

// Format a duration in seconds as "1h 3m 25s" / "3m 25s" / "25s"
function formatTime(seconds) {
    seconds = Math.max(0, Math.ceil(seconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

// Expose globally for use in other scripts
window.formatTime = formatTime;

function getBaseTemperature(hour) {
    if (hour >= 5 && hour < 8) {
        return randomBetween(10, 15);
    } else if (hour >= 8 && hour < 18) {
        return randomBetween(20, 30);
    } else if (hour >= 18 && hour < 21) {
        return randomBetween(15, 22);
    }
    return randomBetween(5, 10);
}

function chooseWeatherForHour(hour) {
    if (hour >= 8 && hour < 18) {
        return weightedRandomIndex([
            { index: 0, weight: 0.6 },
            { index: 1, weight: 0.2 },
            { index: 2, weight: 0.2 }
        ]);
    } else if (hour >= 5 && hour < 8) {
        return weightedRandomIndex([
            { index: 0, weight: 0.5 },
            { index: 1, weight: 0.4 },
            { index: 2, weight: 0.1 }
        ]);
    } else if (hour >= 18 && hour < 21) {
        return weightedRandomIndex([
            { index: 0, weight: 0.5 },
            { index: 1, weight: 0.3 },
            { index: 2, weight: 0.2 }
        ]);
    }
    return weightedRandomIndex([
        { index: 0, weight: 0.4 },
        { index: 1, weight: 0.5 },
        { index: 2, weight: 0.1 }
    ]);
}

function getCurrentSeason() {
    if (!GAME_CONFIG.SEASONS) {
        // Seasons were removed from the config; return neutral defaults
        return { name: '', emoji: '', cropGrowthMultiplier: 1, happinessMultiplier: 1 };
    }
    return GAME_CONFIG.SEASONS[gameState.currentSeasonIndex];
}

function updateSeason() {
    // If seasons are not defined, skip all seasonal logic
    if (!GAME_CONFIG.SEASONS) {
        return;
    }

    const month = new Date().getMonth() + 1; // 1-12
    let index;
    if (month >= 3 && month <= 5) {
        index = 0; // Spring
    } else if (month >= 6 && month <= 8) {
        index = 1; // Summer
    } else if (month >= 9 && month <= 11) {
        index = 2; // Autumn
    } else {
        index = 3; // Winter
    }
    const seasonChanged = index !== gameState.currentSeasonIndex;
    if (seasonChanged) {
        gameState.currentSeasonIndex = index;
        const season = getCurrentSeason();
        gameState.cows.forEach(cow => {
            if (cow.happinessLevel < GAME_CONFIG.HAPPINESS.level_max) {
                cow.happinessLevel = Math.min(
                    GAME_CONFIG.HAPPINESS.level_max,
                    cow.happinessLevel * (season.happinessMultiplier || 1)
                );
            }
            refreshCowMood(cow);
        });
        if (season.name) {
            showToast(`${season.emoji} ${season.name} begins!`, 'info');
        }
        updateDisplay();
    }

    const body = document.body;
    if (body && GAME_CONFIG.SEASONS) {
        const current = GAME_CONFIG.SEASONS[index];
        body.classList.remove('season-spring', 'season-summer', 'season-autumn', 'season-winter');
        if (current && current.name) {
            body.classList.add('season-' + current.name.toLowerCase());
        }
    }
}

function getCurrentWeather() {
    if (!GAME_CONFIG.WEATHER_TYPES) {
        return { name: '', emoji: '', cropGrowthModifier: 1 };
    }
    return GAME_CONFIG.WEATHER_TYPES[gameState.currentWeatherIndex];
}

function updateWeather(force = false) {
    if (!GAME_CONFIG.WEATHER_TYPES) return;

    const hour = new Date().getHours();

    if (force || Math.random() < (GAME_CONFIG.WEATHER_CHANGE_CHANCE || 0)) {
        const index = chooseWeatherForHour(hour);
        if (force || index !== gameState.currentWeatherIndex) {
            gameState.currentWeatherIndex = index;
            const weather = getCurrentWeather();
            gameState.currentTemperature = getBaseTemperature(hour) + (weather.tempOffset || 0);
            let effectMsg = 'normal crop growth';
            if (weather.cropGrowthModifier < 1) effectMsg = 'faster crop growth';
            if (weather.cropGrowthModifier > 1) effectMsg = 'slower crop growth';
            showToast(`${weather.emoji} ${weather.name}! ${gameState.currentTemperature}°C ${effectMsg}!`, 'info');
            updateDisplay();
            updateWeatherEffects();
        }
    } else if (gameState.currentTemperature === 0) {
        const weather = getCurrentWeather();
        gameState.currentTemperature = getBaseTemperature(hour) + (weather.tempOffset || 0);
    }
}

// Crop unlock condition checking
function checkCropUnlockCondition(crop) {
    if (!crop.unlockCondition) return true;
    
    const condition = crop.unlockCondition;
    switch (condition.type) {
        case 'day':
            return gameState.day >= condition.target;
        case 'totalMilk':
            return gameState.stats.totalMilkProduced >= condition.target;
        case 'totalCoins':
            return gameState.stats.totalCoinsEarned >= condition.target;
        case 'perfectScores':
            return gameState.stats.totalPerfectScores >= condition.target;
        case 'upgrade':
            return gameState.upgrades[condition.target] > 0;
        default:
            return true;
    }
}

// Get available crops based on unlock conditions
function isCropUnlocked(crop) {
    if (crop.eventOnly && crop.eventOnly === 'meteor_shower' && !gameState.isMeteorShower) {
        return false;
    }
    return checkCropUnlockCondition(crop);
}

// Dynamic crop button generation with rarity styling
function generateCropButtons() {
    const container = document.querySelector('.plant-controls');
    if (!container) return;
    
    const allCrops = Object.keys(cropTypes);

    container.innerHTML = allCrops.map(cropId => {
        const crop = cropTypes[cropId];
        const unlocked = isCropUnlocked(crop);
        const rarityClass = crop.rarity ? `crop-${crop.rarity}` : '';
        const titleText = unlocked
            ? `${crop.description ? crop.description + ' - ' : ''}Reward: ${crop.value} coins`
            : getCropUnlockText(crop);

        if (unlocked) {
            return `
                <button class="plant-btn ${rarityClass}" onclick="plantCrop('${cropId}')" title="${titleText}">
                    ${crop.emoji}<br />${crop.name}<br>
                    <span class="crop-cost">${crop.cost} coins</span>
                    ${crop.rarity ? `<span class="crop-rarity">${crop.rarity}</span>` : ''}
                </button>
            `;
        }
        return `
            <button class="plant-btn locked-crop ${rarityClass}" disabled title="${titleText}">
                🔒<br />${crop.name}<br>
                <span class="locked-crop-info">${getCropUnlockText(crop)}</span>
                ${crop.rarity ? `<span class="crop-rarity">${crop.rarity}</span>` : ''}
            </button>
        `;
    }).join('');
}

// Shop unlock condition checking
function checkShopUnlockCondition(item) {
    if (!item.unlockCondition) return true;
    
    const condition = item.unlockCondition;
    switch (condition.type) {
        case 'day':
            return gameState.day >= condition.target;
        case 'totalMilk':
            return gameState.stats.totalMilkProduced >= condition.target;
        case 'totalCoins':
            return gameState.stats.totalCoinsEarned >= condition.target;
        case 'perfectScores':
            return gameState.stats.totalPerfectScores >= condition.target;
        case 'upgrade':
            return gameState.upgrades[condition.target] > 0;
        default:
            return true;
    }
}

// Dynamic shop rendering with categories

Object.assign(window, {
    cropTypes,
    shopData,
    rhythmPatterns,
    achievementsData,
    cowData,
    secretCows,
    loadGameData,
    gameState,
    deductCoins,
    deductMilk,
    recordHarvestTimestamp,
    clearAllCropTimers,
    addCropSlots,
    getItemUnlockStatus,
});
