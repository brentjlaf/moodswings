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

let gameState = {
    coins: 100,
    milk: 0,
    xp: 0,
    day: 1,
    totalScore: 0,
    cows: [],
    lockedCows: [],
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
function renderShop() {
    const categoriesContainer = document.querySelector('#shopCategories');
    if (!categoriesContainer || !shopData.categories) return;

    categoriesContainer.innerHTML = '';

    shopData.categories.forEach(category => {
        // Get all items for this category
        const categoryItems = shopData.items.filter(item => item.category === category.id);
        if (categoryItems.length === 0) return;

        const section = document.createElement('div');
        section.className = 'shop-category-section';

        // Add category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'shop-category-header';
        categoryHeader.innerHTML = `
            <h3 class="shop-category-title">
                ${category.name}
            </h3>
            <p class="shop-category-desc">${category.description}</p>
        `;
        section.appendChild(categoryHeader);

        const itemGrid = document.createElement('div');
        itemGrid.className = 'shop-grid';

        categoryItems.forEach(item => {
            const unlocked = checkShopUnlockCondition(item);
            const shopItem = document.createElement('div');
            shopItem.className = 'shop-item' + (unlocked ? '' : ' shop-item-locked');

            const isOwned = gameState.upgrades[item.id] >= (item.maxLevel || 1);
            const currency = item.currency || 'coins';
            const cost = getItemCost(item);
            const canAfford = currency === 'coins'
                ? gameState.coins >= cost
                : gameState.milk >= cost;
            const buttonText = isOwned ? 'OWNED' : (canAfford ? 'BUY' : 'TOO EXPENSIVE');
            const buttonClass = isOwned ? 'owned' : (canAfford ? 'available' : 'expensive');

            if (unlocked) {
                shopItem.innerHTML = `
                    <div class="item-icon">${item.icon}</div>
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-description">${item.description}</div>
                        ${getItemEffectText(item) ? `<div class="item-effects">${getItemEffectText(item)}</div>` : ''}
                        <div class="item-price">
                            ${currency === 'coins' ? `💰 ${cost} coins` : `🥛 ${cost} milk`}
                        </div>
                        ${item.maxLevel > 1 ? `<div class="item-level">Owned: ${gameState.upgrades[item.id] || 0}/${item.maxLevel}</div>` : ''}
                    </div>
                    <button class="shop-btn ${buttonClass}"
                            onclick="buyUpgrade('${item.id}')"
                            ${isOwned || !canAfford ? 'disabled' : ''}>
                        ${buttonText}
                    </button>
                `;
            } else {
                const unlockText = getShopUnlockText(item);
                shopItem.innerHTML = `
                    <div class="item-icon">${item.icon}</div>
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-description">${item.description}</div>
                        ${getItemEffectText(item) ? `<div class="item-effects">${getItemEffectText(item)}</div>` : ''}
                        <div class="locked-item-text">${unlockText}</div>
                    </div>
                    <button class="shop-btn" disabled>LOCKED</button>
                `;
            }

            itemGrid.appendChild(shopItem);
        });

        section.appendChild(itemGrid);
        categoriesContainer.appendChild(section);
    });
}

// Build human readable text for shop item unlock requirements
function getShopUnlockText(item) {
    if (!item.unlockCondition) return '';

    const condition = item.unlockCondition;
    switch (condition.type) {
        case 'day':
            return `Reach day ${condition.target}`;
        case 'totalMilk':
            return `Produce ${condition.target} milk`;
        case 'totalCoins':
            return `Earn ${condition.target} coins`;
        case 'perfectScores':
            return `Get ${condition.target} perfect scores`;
        case 'upgrade': {
            const prereq = shopData.items?.find(i => i.id === condition.target);
            return prereq ? `Requires ${prereq.name}` : `Requires upgrade ${condition.target}`;
        }
        default:
            return '';
    }
}

// Build human readable text for crop unlock requirements
function getCropUnlockText(crop) {
    if (crop.eventOnly && crop.eventOnly === 'meteor_shower') {
        return 'Available during meteor showers';
    }
    if (!crop.unlockCondition) return 'Unlocked by default';

    const condition = crop.unlockCondition;
    switch (condition.type) {
        case 'day':
            return `Reach day ${condition.target}`;
        case 'totalMilk':
            return `Produce ${condition.target} milk`;
        case 'totalCoins':
            return `Earn ${condition.target} coins`;
        case 'perfectScores':
            return `Get ${condition.target} perfect scores`;
        case 'upgrade': {
            const prereq = shopData.items?.find(i => i.id === condition.target);
            return prereq ? `Requires ${prereq.name}` : `Requires upgrade ${condition.target}`;
        }
        default:
            return '';
    }
}

// Build descriptive text from an item's effects using shopData.effectDescriptions
function getItemEffectText(item) {
    if (!item.effects || !shopData.effectDescriptions) return '';

    const descs = shopData.effectDescriptions;
    const lines = [];

    Object.keys(item.effects).forEach(type => {
        if (type === 'duration' || type === 'duration_minutes') return;
        let template = descs[type];
        if (!template) return;

        const value = item.effects[type];

        if (type === 'unlock_crop' && typeof value === 'string') {
            lines.push(`Unlocks ${value} for planting`);
            return;
        }

        if (template.includes('X')) {
            template = template.replace('X', value);
        }

        lines.push(template);
    });

    if (item.effects.duration_minutes) {
        let template = descs['duration_minutes'] || 'Effect lasts for X minutes';
        template = template.replace('X', item.effects.duration_minutes);
        lines.push(template);
    } else if (item.effects.duration) {
        let minutes = Math.round(item.effects.duration / 60000);
        let template = descs['duration_minutes'] || 'Effect lasts for X minutes';
        template = template.replace('X', minutes);
        lines.push(template);
    }

    return lines.join('<br>');
}

// Flexible upgrade buying system
function buyUpgrade(itemId) {
    const item = shopData.items.find(i => i.id === itemId);
    if (!item) {
        showToast('Invalid item!', 'failure');
        return;
    }
    
    const currentLevel = gameState.upgrades[itemId] || 0;
    if (currentLevel >= item.maxLevel) {
        showToast('Already owned!', 'info');
        return;
    }
    
    const currency = item.currency || 'coins';
    const cost = getItemCost(item);
    const paid = currency === 'coins'
        ? deductCoins(cost, item.name)
        : deductMilk(cost, item.name);
    if (!paid) {
        return;
    }
    
    // Apply upgrade
    gameState.upgrades[itemId] = currentLevel + 1;
    
    // Track purchase for achievements
    gameState.stats.upgradesPurchased++;
    
    // Apply effects
    applyUpgradeEffects(item);

    gameState.xp++;
    updateDisplay();
    renderShop();
    showToast(`Purchased: ${item.name}!`, 'success');
    checkAchievements(); // Check for new achievements
    
    // Auto-save after purchase
    saveGameState();
    updateSaveInfo();
    
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
}

// Flexible effect application system
function applyUpgradeEffects(item) {
    if (!item.effects) return;

    const duration = item.effects.duration
        ? item.effects.duration
        : (item.effects.duration_minutes
            ? item.effects.duration_minutes * 60000
            : 0);

    Object.keys(item.effects).forEach(effectType => {
        if (effectType === 'duration' || effectType === 'duration_minutes') return;
        const effectValue = item.effects[effectType];
        let appliedValue = effectValue;
        
        switch (effectType) {
            case 'rhythm_tolerance':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.rhythmTolerance = (gameState.effects.rhythmTolerance || 0) + effectValue;
                break;

            case 'rhythm_tolerance_boost':
                if (!gameState.effects) gameState.effects = {};
                appliedValue = effectValue / 100;
                gameState.effects.rhythmTolerance = (gameState.effects.rhythmTolerance || 0) + appliedValue;
                break;
                
            case 'milk_multiplier':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.milkMultiplier = effectValue;
                break;

            case 'milk_production_multiplier':
                if (!gameState.effects) gameState.effects = {};
                appliedValue = effectValue / 100;
                gameState.effects.milkProductionMultiplier = (gameState.effects.milkProductionMultiplier || 1) * appliedValue;
                break;
                
            case 'coin_bonus':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.coinBonus = (gameState.effects.coinBonus || 0) + effectValue;
                break;

            case 'coin_bonus_percent':
                if (!gameState.effects) gameState.effects = {};
                appliedValue = effectValue / 100;
                gameState.effects.coinBonusPercent = (gameState.effects.coinBonusPercent || 0) + appliedValue;
                break;
                
            case 'happiness_boost':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.happinessBoost = effectValue;
                const boost = typeof effectValue === 'number' ? effectValue : 20;
                gameState.cows.forEach(cow => {
                    cow.happinessLevel = Math.min(
                        GAME_CONFIG.HAPPINESS.level_max,
                        cow.happinessLevel + boost
                    );
                    refreshCowMood(cow);
                });
                break;

            case 'happiness_bonus':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.happinessBonus = effectValue;
                gameState.cows.forEach(cow => {
                    cow.happinessLevel = Math.min(
                        GAME_CONFIG.HAPPINESS.level_max,
                        cow.happinessLevel * (1 + effectValue)
                    );
                    refreshCowMood(cow);
                });
                break;

            case 'happiness_boost_percent':
                if (!gameState.effects) gameState.effects = {};
                appliedValue = effectValue / 100;
                gameState.effects.happinessBoostPercent = (gameState.effects.happinessBoostPercent || 0) + appliedValue;
                gameState.cows.forEach(cow => {
                    cow.happinessLevel = Math.min(
                        GAME_CONFIG.HAPPINESS.level_max,
                        cow.happinessLevel * (1 + appliedValue)
                    );
                    refreshCowMood(cow);
                });
                break;
                
            case 'rhythm_speed_bonus':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.rhythmSpeedBonus = (gameState.effects.rhythmSpeedBonus || 0) + effectValue;
                break;
                
            case 'crop_speed_boost':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.cropSpeedBoost = effectValue;
                break;

            case 'crop_growth_speed':
                if (!gameState.effects) gameState.effects = {};
                appliedValue = effectValue / 100;
                gameState.effects.cropGrowthSpeed = (gameState.effects.cropGrowthSpeed || 0) + appliedValue;
                break;

            case 'action_speed_boost':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.actionSpeedBoost = (gameState.effects.actionSpeedBoost || 0) + effectValue;
                break;

            case 'extra_milk_per_click':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.extraMilkPerClick = (gameState.effects.extraMilkPerClick || 0) + effectValue;
                break;

            case 'milk_yield_bonus':
                if (!gameState.effects) gameState.effects = {};
                appliedValue = effectValue / 100;
                gameState.effects.milkYieldBonus = (gameState.effects.milkYieldBonus || 0) + appliedValue;
                break;

            case 'crop_yield_boost':
            case 'crop_yield_bonus': // alias used by some items
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.cropYieldBoost = (gameState.effects.cropYieldBoost || 0) + effectValue;
                break;

            case 'extra_crop_slots':
                addCropSlots(effectValue);
                break;


            case 'unlock_crop':
                if (!gameState.unlockedCrops) gameState.unlockedCrops = {};
                gameState.unlockedCrops[effectValue] = true;
                break;

            case 'auto_milk_conversion':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.autoMilkConversion = true;
                break;

            case 'conversion_rate':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.milkConversionRate = effectValue;
                break;

            case 'pest_protection':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.pestProtection = true;
                clearAllPests();
                break;

            default:
                console.log(`Unknown effect type: ${effectType}`);
        }

        if (duration) {
            startTimedEffect(item, effectType, appliedValue, duration);
        }
    });
}

function updateSaveInfo() {
    const playerIDEl = document.getElementById('playerID');
    const lastSavedEl = document.getElementById('lastSaved');
    const playerNameEl = document.getElementById('playerNameLabel');
    const usernameInput = document.getElementById('usernameInput');
    
    if (playerIDEl) {
        playerIDEl.textContent = gameState.playerID || 'Not set';
    }

    if (playerNameEl) {
        playerNameEl.textContent = gameState.username || 'Unnamed';
    }

    if (usernameInput) {
        usernameInput.value = gameState.username || '';
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

function switchTab(tabName, evt) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    evt.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active', 'tab-transition');
    });
    const newTab = document.getElementById(tabName + 'Tab');
    newTab.classList.add('active');
    // Force reflow to restart animation
    void newTab.offsetWidth;
    newTab.classList.add('tab-transition');

    if (tabName === 'stats') {
        updateStatsChart();
        updateAchievements();
        clearNewAchievementFlags();
    }
    
    // Reset scroll position for new tab
    const wrapper = document.querySelector('.tab-content-wrapper');
    if (wrapper) wrapper.scrollTop = 0;
    
    // Haptic feedback if supported
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function buildCow(cow) {
    if (!cow) {
        console.error('buildCow called with invalid cow:', cow);
        return null;
    }

    const { locked, ...base } = cow;  // drop any existing lock flag

    // Split the 0–100 moodValue range into equal segments so each mood gets its own bucket
    const segmentSize = 100 / base.moods.length;
    const reversedIndex = base.moods.length - 1 -
        Math.floor(base.moodValue / segmentSize);
    const moodIndex = Math.max(
        0,
        Math.min(base.moods.length - 1, reversedIndex)
    );
    const currentMood = base.moods[moodIndex];

    return {
        ...base,
        locked: false,               // always start unlocked
        level: base.level || 1,
        currentMood,
        moodValue: base.moodValue,   // preserve the original value
        isHappy: base.moodValue >= 70, // happy threshold at 70
        lastPlayed: null,
        happinessLevel: base.moodValue, // mirror moodValue
        lastHappinessUpdate: Date.now(),
        fullHappySince: base.moodValue >= GAME_CONFIG.HAPPINESS.level_max ? Date.now() : null
    };
}

function updateUsername() {
    const input = document.getElementById('usernameInput');
    if (!input) return;
    const name = input.value.trim();
    if (!name || !/^[A-Za-z0-9]+$/.test(name)) {
        showToast('Name must contain only letters and numbers.', 'error');
        return;
    }
    gameState.username = name;
    gameState.playerID = name;
    saveGameState();
    updateSaveInfo();
    showToast('Username updated!', 'success');
    const overlay = document.getElementById('usernameOverlay');
    if (overlay) overlay.style.display = 'none';
}

function promptForUsername() {
    const overlay = document.getElementById('usernameOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        const input = document.getElementById('usernameInput');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}


function generateCows() {
    if (gameState.cows.length === 0 && gameState.lockedCows.length === 0) {
        // Initialize with first cow unlocked and rest locked
        if (cowData.length === 0) {
            console.error('No cow data loaded');
            return;
        }

        const [firstCow, ...others] = cowData;
        const starterCow = buildCow(firstCow);
        if (starterCow) {
            gameState.cows = [starterCow];
        }
        gameState.lockedCows = others.map(cow => ({ ...cow, locked: true }));
        gameState.lockedCows.push(...secretCows.map(c => ({ ...c, locked: true })));
        
        // Immediately check for any that should be unlocked based on starting conditions
        checkAllCowUnlocks();
    } else {
        // Preserve existing cow state between days
        gameState.cows = gameState.cows.map(cow => ({ ...cow }));
    }
    renderCows();
}

function getUnlockText(cow) {
    if (!cow.unlockCondition) return 'Unlock requirement unknown';
    if (cow.unlockCondition === 'perfectScores') {
        return `Get ${cow.unlockTarget} perfect scores (${gameState.stats.totalPerfectScores}/${cow.unlockTarget})`;
    }
    if (cow.unlockCondition === 'totalMilk') {
        return `Produce ${cow.unlockTarget} milk (${gameState.stats.totalMilkProduced}/${cow.unlockTarget})`;
    }
    if (cow.unlockCondition === 'totalCoins') {
        return `Earn ${cow.unlockTarget} coins (${gameState.stats.totalCoinsEarned}/${cow.unlockTarget})`;
    }
    if (cow.unlockCondition === 'day') {
        return `Reach day ${cow.unlockTarget} (${gameState.day}/${cow.unlockTarget})`;
    }
    if (cow.unlockCondition === 'achievement') {
        const ach = achievementsData.achievements?.find(a => a.id === cow.unlockTarget);
        return ach ? `Earn the \"${ach.name}\" achievement` : `Unlock achievement ${cow.unlockTarget}`;
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

        const happinessColor    = cow.isHappy ? '#A3D977' : '#E91E63';
        const heartIcon         = cow.isHappy ? '💚' : '💔';
        const moodClass         = cow.isHappy ? 'cow-mood cow-mood-happy' : 'cow-mood cow-mood-sad';
        const moodValueDisplay  = Math.floor(cow.moodValue);

        const isMaxHappy = cow.happinessLevel >= 100;
        const buttonText = !cow.isHappy
            ? 'Cheer Up!'
            : isMaxHappy
                ? 'Max Happy!'
                : 'Keep Happy!';
        const disabledAttr = isMaxHappy ? 'disabled' : '';

        const levelHours = (GAME_CONFIG.HAPPINESS.level_up_hours || 12) * 3600000;
        let levelProgress = 0;
        let levelTimer = '';
        if (cow.fullHappySince) {
            const elapsed = Date.now() - cow.fullHappySince;
            levelProgress = Math.min(100, Math.round((elapsed / levelHours) * 100));
            const remaining = Math.max(0, levelHours - elapsed);
            levelTimer = formatTime(Math.ceil(remaining / 1000));
        }

        cowCard.innerHTML = `
            <div class="cow-icon">${cow.emoji}</div>
            <div class="cow-name">${cow.name}</div>
            <div class="cow-level">Lv ${cow.level || 1}</div>
            <div class="level-timer">${levelTimer}</div>
            <div class="level-progress"><div class="level-progress-bar" style="width:${levelProgress}%;"></div></div>
            <div class="${moodClass}">
                ${heartIcon} ${cow.currentMood} (${moodValueDisplay})
            </div>
            <button class="mood-button" onclick="startMinigame(${idx})" ${disabledAttr}>
                ${buttonText}
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
            <div class="locked-cow-text">
                ${unlockText}
            </div>
        `;
        grid.appendChild(cowCard);
    });

    renderFarmMap();
}

// Reduce each cow's happiness over time
// Helper to sync mood-related fields after changing happiness
function refreshCowMood(cow) {
    cow.moodValue = cow.happinessLevel;
    const segmentSize = 100 / cow.moods.length;
    const reversedIndex = cow.moods.length - 1 -
        Math.floor(cow.moodValue / segmentSize);
    const moodIndex = Math.max(
        0,
        Math.min(cow.moods.length - 1, reversedIndex)
    );
    cow.currentMood = cow.moods[moodIndex];
    cow.isHappy = cow.moodValue >= 70;
    cow.lastHappinessUpdate = Date.now();

    if (cow.happinessLevel >= GAME_CONFIG.HAPPINESS.level_max) {
        if (!cow.fullHappySince) {
            cow.fullHappySince = Date.now();
        }
    } else {
        cow.fullHappySince = null;
    }

    checkCowLevelUp(cow);
}

function updateCowHappiness(cow) {
    const now = Date.now();
    if (cow.happinessLevel >= GAME_CONFIG.HAPPINESS.level_max) {
        cow.lastHappinessUpdate = now;
        return;
    }
    const hours = (now - (cow.lastHappinessUpdate || now)) / 3600000;
    if (hours <= 0) return;
    const graceMs = (GAME_CONFIG.HAPPINESS.full_happy_grace_minutes || 0) * 60000;
    if (cow.fullHappySince && (now - cow.fullHappySince) < graceMs) {
        cow.lastHappinessUpdate = now;
        return;
    }

    const rate = GAME_CONFIG.HAPPINESS.decay_rate_percent;
    const decayAmount = cow.happinessLevel * rate * hours;
    cow.happinessLevel = Math.max(
        GAME_CONFIG.HAPPINESS.level_min,
        cow.happinessLevel - decayAmount
    );
    refreshCowMood(cow);
}

function updateAllCowHappiness() {
    gameState.cows.forEach(updateCowHappiness);
    renderCows();
}

function checkCowLevelUp(cow) {
    if (!cow.fullHappySince) return;

    const elapsed = Date.now() - cow.fullHappySince;
    const hoursRequired = (GAME_CONFIG.HAPPINESS.level_up_hours || 12) * 3600000;
    if (elapsed < hoursRequired) return;

    const type = cow.currentGameType || cow.gameType;
    const data = rhythmPatterns.rhythmTypes && rhythmPatterns.rhythmTypes[type];
    if (!data || !data.patterns) return;

    const maxLevel = data.patterns.length;
    const prevLevel = cow.level || 1;
    if (prevLevel >= maxLevel) return;

    cow.level = prevLevel + 1;
    cow.fullHappySince = null;
    // Reset mood after leveling up so players must cheer the cow again
    cow.happinessLevel = 25;
    refreshCowMood(cow);
    showToast(`🐮 ${cow.name} reached Lv ${cow.level}!`, 'success');
}


function applyCowbellThreshold() {
    if (!gameState.upgrades || !gameState.upgrades.cowbell) return;
    const cowbellCfg = GAME_CONFIG.UPGRADES && GAME_CONFIG.UPGRADES.cowbell;
    if (!cowbellCfg) return;
    const threshold = cowbellCfg.happiness_threshold || 0;
    const bonus     = cowbellCfg.happiness_bonus || 0;
    gameState.cows.forEach(cow => {
        if (Math.random() < threshold) {
            cow.happinessLevel = Math.max(cow.happinessLevel, bonus);
            refreshCowMood(cow);
        }
    });
}

function initializeCrops() {
    gameState.crops = [];
    for (let i = 0; i < GAME_CONFIG.CROP_SLOTS; i++) {
        gameState.crops.push({
            id: i,
            type: null,
            plantedAt: null,
            readyAt: null,
            isReady: false,
            timerId: null, // FIX: Track timer ID
            hasPest: false,
            pestTimerId: null,
            pestExpiresAt: null,
            pestPenalty: false
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
            const growTime = crop.growTime || cropData.growTime;
            const timeLeft = crop.readyAt ? Math.max(0, crop.readyAt - Date.now()) : 0;
            const progress = Math.min(100, Math.round(((growTime - timeLeft) / growTime) * 100));
            crop.remainingTime = timeLeft;

            if (crop.isReady) {
                cropSlot.innerHTML = `
                    <div class="crop-emoji">${cropData.emoji}</div>
                    <div class="growth-progress"><div class="growth-bar" style="width:${progress}%;"></div></div>
                `;
            } else {
                const seconds = Math.ceil(timeLeft / 1000);
                cropSlot.innerHTML = `
                    <div class="crop-emoji">🌱</div>
                    <div class="growth-timer">${formatTime(seconds)}</div>
                    <div class="growth-progress"><div class="growth-bar" style="width:${progress}%;"></div></div>
                `;
            }

            if (crop.hasPest) {
                const pest = document.createElement('div');
                pest.className = 'pest-icon';
                const timeLeftPest = Math.max(0, crop.pestExpiresAt - Date.now());
                const secondsPest = Math.ceil(timeLeftPest / 1000);
                pest.innerHTML = `🐛 <span class="pest-timer">${formatTime(secondsPest)}</span>`;
                pest.onclick = (e) => { e.stopPropagation(); clearPest(index); };
                cropSlot.appendChild(pest);
            }
        } else {
            cropSlot.innerHTML = '<div class="crop-slot-empty">➕</div>';
        }

        grid.appendChild(cropSlot);
    });

    renderFarmMap();
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
        gameState.coins = Math.max(0, gameState.coins + cropData.cost); // Refund coins
        return;
    }
    
    const season = getCurrentSeason();
    const weather = getCurrentWeather();
    emptySlot.type = type;
    emptySlot.plantedAt = Date.now();
    emptySlot.growTime = cropData.growTime * (season.cropGrowthMultiplier || 1) * (weather.cropGrowthModifier || 1);
    emptySlot.readyAt = Date.now() + emptySlot.growTime;
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
    }, emptySlot.growTime);
    
    gameState.activeCropTimers.push(emptySlot.timerId);
    
    gameState.xp++;
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
    let reward = cropData.value;
    if (crop.pestPenalty || crop.hasPest) {
        reward = Math.floor(reward * (1 - GAME_CONFIG.PESTS.yield_penalty));
    }
    gameState.coins = Math.max(0, gameState.coins + reward);
    gameState.dailyStats.coinsEarned += reward;
    gameState.stats.totalCoinsEarned += reward;
    
    // Track achievement stats
    gameState.stats.cropsHarvested++;
    if (!gameState.stats.cropTypesHarvested[crop.type]) {
        gameState.stats.cropTypesHarvested[crop.type] = 0;
    }
    gameState.stats.cropTypesHarvested[crop.type]++;
    recordHarvestTimestamp();
    
    // FIX: Clear timer if it exists
    if (crop.timerId) {
        clearTimeout(crop.timerId);
        const timerIndex = gameState.activeCropTimers.indexOf(crop.timerId);
        if (timerIndex > -1) {
            gameState.activeCropTimers.splice(timerIndex, 1);
        }
    }
    
    if (crop.pestTimerId) {
        clearTimeout(crop.pestTimerId);
        crop.pestTimerId = null;
    }

    crop.type = null;
    crop.plantedAt = null;
    crop.readyAt = null;
    crop.growTime = null;
    crop.isReady = false;
    crop.timerId = null;
    crop.hasPest = false;
    crop.pestExpiresAt = null;
    crop.pestPenalty = false;
    
    gameState.xp++;
    updateDisplay();
    renderCrops();
    checkAchievements(); // Check for new achievements
    if (reward < cropData.value) {
        showToast(`Harvested ${cropData.name} (pest damage)! +${reward} coins!`, 'failure');
    } else {
        showToast(`Harvested ${cropData.name}! +${reward} coins!`, 'success');
    }
}

function harvestAll() {
    let harvested = 0;
    let totalValue = 0;
    
    gameState.crops.forEach((crop) => {
        if (crop.isReady) {
            const cropData = cropTypes[crop.type];
            let reward = cropData.value;
            if (crop.pestPenalty || crop.hasPest) {
                reward = Math.floor(reward * (1 - GAME_CONFIG.PESTS.yield_penalty));
            }
            totalValue += reward;
            harvested++;
            
            // Track achievement stats
            gameState.stats.cropsHarvested++;
            if (!gameState.stats.cropTypesHarvested[crop.type]) {
                gameState.stats.cropTypesHarvested[crop.type] = 0;
            }
            gameState.stats.cropTypesHarvested[crop.type]++;
            recordHarvestTimestamp();

            gameState.xp++;
            
            // FIX: Clear timer if it exists
            if (crop.timerId) {
                clearTimeout(crop.timerId);
                const timerIndex = gameState.activeCropTimers.indexOf(crop.timerId);
                if (timerIndex > -1) {
                    gameState.activeCropTimers.splice(timerIndex, 1);
                }
            }
            if (crop.pestTimerId) {
                clearTimeout(crop.pestTimerId);
                crop.pestTimerId = null;
            }

            crop.type = null;
            crop.plantedAt = null;
            crop.readyAt = null;
            crop.growTime = null;
            crop.isReady = false;
            crop.timerId = null;
            crop.hasPest = false;
            crop.pestExpiresAt = null;
            crop.pestPenalty = false;
        }
    });
    
    if (harvested > 0) {
        gameState.coins = Math.max(0, gameState.coins + totalValue);
        gameState.dailyStats.coinsEarned += totalValue;
        gameState.stats.totalCoinsEarned += totalValue;
        updateDisplay();
        renderCrops();
        checkAchievements(); // Check for new achievements
        showToast(`Harvested ${harvested} crops! +${totalValue} coins!`, 'success');
        
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 100]);
        }
    } else {
        showToast("No crops ready to harvest!", 'info');
    }
}

function nextDay() {
    // Record the day's totals before resetting
    gameState.dailyMilkTotals.push(gameState.dailyStats.milkProduced);
    gameState.dailyCoinTotals.push(gameState.dailyStats.coinsEarned);
    gameState.day++;
    updateSeason();
    updateWeather();
    gameState.dailyStats = {
        happiest: null,
        milkProduced: 0,
        coinsEarned: 0,
        perfectScores: 0,
        totalGames: 0
    };

    // Automation effects
    convertMilkToCoins();

    updateAllCowHappiness();
    generateCows();
    applyCowbellThreshold();
    
    // Update crop buttons for new unlocks
    generateCropButtons();
    
    // FIXED: Always check unlocks when day advances
    checkAllCowUnlocks();
    
    updateBulletin();
    updateDisplay();
    renderShop(); // Update shop for new unlocks
    
    // Auto-save after advancing day
    saveGameState();
    updateSaveInfo();

    showToast(`🌅 Day ${gameState.day} begins! Your cows have new moods!`, 'success');

    updateStatsChart();

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
        <div class="bulletin-container">
            <h3 class="bulletin-title">
                📋 FARM BULLETIN - DAY ${gameState.day}
            </h3>
            <div class="bulletin-stats-grid">
                <p class="bulletin-stat">😀 Happy Cows: ${happyCows.length}/${totalCows}</p>
                <p class="bulletin-stat">🥛 Milk: ${gameState.dailyStats.milkProduced}</p>
                <p class="bulletin-stat">💰 Coins: ${Math.floor(gameState.dailyStats.coinsEarned)}</p>
                <p class="bulletin-stat">🎯 Perfect Scores: ${gameState.dailyStats.perfectScores}</p>
                <p class="bulletin-stat">🏆 Total Perfects: ${gameState.stats.totalPerfectScores}</p>
            </div>
        </div>
        <div class="unlock-progress-box">
            <h4 class="unlock-progress-title">
                🔓 UNLOCK PROGRESS
            </h4>
            <p class="unlock-progress-stat">Total Milk: ${gameState.stats.totalMilkProduced} | Total Coins: ${Math.floor(gameState.stats.totalCoinsEarned)}</p>
            <p class="unlock-progress-stat">Perfect Scores: ${gameState.stats.totalPerfectScores} | Day: ${gameState.day}</p>
            <p class="unlock-progress-stat">Locked Cows: ${gameState.lockedCows.length}</p>
        </div>
        ${gameState.dailyStats.happiest ? `
        <div class="cow-of-day-box">
            <h4 class="cow-of-day-title">
                👑 COW OF THE DAY
            </h4>
            <p class="cow-of-day-text">${gameState.dailyStats.happiest} was the happiest cow today!</p>
        </div>
        ` : ''}
        <div class="farm-tip-box">
            <h4 class="farm-tip-title">
                💡 FARM TIP
            </h4>
            <p class="farm-tip-text">${getFarmTip()}</p>
        </div>
    `;
}

function getFarmTip() {
    return FARM_TIPS[Math.floor(Math.random() * FARM_TIPS.length)];
}

function spawnPest(index) {
    const crop = gameState.crops[index];
    if (!crop || !crop.type || crop.hasPest) return;
    crop.hasPest = true;
    crop.pestPenalty = false;
    crop.pestExpiresAt = Date.now() + GAME_CONFIG.PESTS.duration;
    crop.pestTimerId = setTimeout(() => pestExpired(index), GAME_CONFIG.PESTS.duration);
    showToast('🐛 Pests are attacking! Tap to clear them.', 'failure');
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
    renderCrops();
}

function clearPest(index) {
    const crop = gameState.crops[index];
    if (!crop || !crop.hasPest) return;
    if (crop.pestTimerId) {
        clearTimeout(crop.pestTimerId);
        crop.pestTimerId = null;
    }
    crop.hasPest = false;
    crop.pestExpiresAt = null;
    crop.pestPenalty = false;
    renderCrops();
}

function clearAllPests() {
    gameState.crops.forEach((crop, idx) => {
        if (crop.hasPest) {
            clearPest(idx);
        }
    });
}

function pestExpired(index) {
    const crop = gameState.crops[index];
    if (!crop || !crop.hasPest) return;
    crop.hasPest = false;
    crop.pestTimerId = null;
    crop.pestPenalty = true;
    crop.pestExpiresAt = null;
    renderCrops();
}

function startPestChecks() {
    setInterval(() => {
        if (gameState.effects.pestProtection) return;
        gameState.crops.forEach((crop, idx) => {
            if (!crop.type || crop.hasPest) return;
            if (Math.random() < GAME_CONFIG.PESTS.spawn_chance) {
                spawnPest(idx);
            }
        });
    }, GAME_CONFIG.PESTS.check_interval);
}


function convertMilkToCoins() {
    if (!gameState.effects.autoMilkConversion) return;
    const rate = gameState.effects.milkConversionRate || 1; // milk needed per coin
    const milk = gameState.milk;
    if (milk <= 0) return;

    const coins = milk / rate;
    gameState.milk = 0; // all milk is processed at day end
    gameState.coins = Math.max(0, gameState.coins + coins);
    gameState.dailyStats.coinsEarned += coins;
    gameState.stats.totalCoinsEarned += coins;
    showToast(`Processed milk into ${Math.floor(coins)} coins!`, 'success');
    updateDisplay();
}

function updateStatsChart() {
    const labels = gameState.dailyMilkTotals.map((_, i) => `Day ${i + 1}`);

    if (!statsChart) {
        const ctx = document.getElementById('statsChart');
        if (!ctx) return;
        statsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Milk',
                        data: gameState.dailyMilkTotals,
                        borderColor: '#5D8CAE',
                        backgroundColor: 'rgba(93,140,174,0.2)',
                        tension: 0.2
                    },
                    {
                        label: 'Coins',
                        data: gameState.dailyCoinTotals,
                        borderColor: '#FFD700',
                        backgroundColor: 'rgba(255,215,0,0.2)',
                        tension: 0.2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } else {
        statsChart.data.labels = labels;
        statsChart.data.datasets[0].data = gameState.dailyMilkTotals;
        statsChart.data.datasets[1].data = gameState.dailyCoinTotals;
        statsChart.update();
    }
}

function renderFarmMap() {
    const canvas = document.getElementById('farmMap');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const cols = 4;
    const rows = 3;
    const padding = 8;
    const cellW = (width - padding * 2) / cols;
    const cellH = (height - padding * 2) / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = padding + c * cellW;
            const y = padding + r * cellH;
            ctx.fillStyle = '#A65E2E';
            ctx.fillRect(x, y, cellW - 2, cellH - 2);
            ctx.strokeStyle = '#A65E2E';
            ctx.strokeRect(x, y, cellW - 2, cellH - 2);

            const index = r * cols + c;
            const crop = gameState.crops[index];
            if (crop && crop.type) {
                const emoji = crop.isReady ? cropTypes[crop.type].emoji : '🌱';
                ctx.font = Math.floor(Math.min(cellW, cellH) * 0.6) + 'px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(emoji, x + cellW / 2, y + cellH / 2);
            }
        }
    }

    const cowSpacing = width / (gameState.cows.length + 1);
    ctx.font = Math.floor(cellH * 0.7) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    gameState.cows.forEach((cow, i) => {
        const x = cowSpacing * (i + 1);
        const y = height - padding - cellH * 0.3;
        ctx.fillText(cow.emoji, x, y);
    });
}

// FIXED: Combined unlock check function that handles both regular and secret cows
function checkAllCowUnlocks() {
    let anyUnlocked = false;
    
    // Check all locked cows (both regular and secret)
    for (let i = gameState.lockedCows.length - 1; i >= 0; i--) {
        const cow = gameState.lockedCows[i];
        let unlocked = false;
        
        // Check unlock conditions
        if (cow.unlockCondition === 'totalMilk' && gameState.stats.totalMilkProduced >= cow.unlockTarget) {
            unlocked = true;
        } else if (cow.unlockCondition === 'totalCoins' && gameState.stats.totalCoinsEarned >= cow.unlockTarget) {
            unlocked = true;
        } else if (cow.unlockCondition === 'day' && gameState.day >= (cow.unlockTarget || 1)) {
            unlocked = true;
        } else if (cow.unlockCondition === 'achievement' && gameState.achievements.includes(cow.unlockTarget)) {
            unlocked = true;
        } else if (cow.unlockCondition === 'perfectScores' && gameState.stats.totalPerfectScores >= cow.unlockTarget) {
            unlocked = true;
        }

        if (unlocked) {
            const newCow = buildCow(cow);
            gameState.lockedCows.splice(i, 1);
            gameState.cows.push(newCow);
            
            // Check if it's a secret cow
            const isSecret = secretCows.find(sc => sc.name === cow.name);
            if (isSecret) {
                gameState.stats.secretCowsUnlocked++;
                showAchievement(`🎉 Secret Cow Unlocked!`, `${cow.name} has joined your herd!`);
                showToast(`🌟 SECRET COW UNLOCKED: ${cow.name}!`, 'success');
            } else {
                showAchievement(`🐮 New Cow Unlocked!`, `${cow.name} has joined your herd!`);
                showToast(`🐮 NEW COW: ${cow.name} joined your farm!`, 'success');
            }
            
            anyUnlocked = true;
        }
    }
    
    if (anyUnlocked) {
        renderCows();
        updateBulletin();
        checkAchievements(); // Check for cow-related achievements
    }
}

// Achievement system
function checkAchievementCondition(achievement) {
    const condition = achievement.condition;
    const stats = gameState.stats;
    
    switch (condition.type) {
        case 'totalMilk':
            return stats.totalMilkProduced >= condition.target;
            
        case 'totalCoins':
            return stats.totalCoinsEarned >= condition.target;
            
        case 'perfectScores':
            return stats.totalPerfectScores >= condition.target;
            
        case 'cropsHarvested':
            return stats.cropsHarvested >= condition.target;
            
        case 'cropTypeHarvested':
            const cropCount = stats.cropTypesHarvested[condition.cropType] || 0;
            return cropCount >= condition.target;
            
        case 'cowsHappy':
            return stats.cowsHappy >= condition.target;
            
        case 'cowsUnlocked':
            return gameState.cows.length >= condition.target;
            
        case 'allCowsHappy':
            const allHappy = gameState.cows.length >= (condition.minimumCows || 1) && 
                           gameState.cows.every(cow => cow.isHappy);
            return allHappy;
            
        case 'secretCowsUnlocked':
            return stats.secretCowsUnlocked >= condition.target;
            
        case 'day':
            return gameState.day >= condition.target;
            
        case 'maxCombo':
            return stats.maxCombo >= condition.target;
            
        case 'perfectStreak':
            return stats.perfectStreak >= condition.target;
            
        case 'upgradesPurchased':
            return stats.upgradesPurchased >= condition.target;

        case 'timeOfDay':
            if (condition.target === 'midnight') {
                const hour = new Date().getHours();
                return hour >= 0 && hour < 6;
            }
            return false;

        case 'speedHarvest': {
            const cutoff = Date.now() - (condition.timeLimit * 1000);
            const count = stats.harvestTimestamps.filter(ts => ts >= cutoff).length;
            return count >= condition.target;
        }

        case 'achievementsCompleted':
            return gameState.achievements.length >= condition.target;

        default:
            console.warn(`Unknown achievement condition: ${condition.type}`);
            return false;
    }
}

function checkAchievements() {
    if (!achievementsData.achievements) return;
    
    const newAchievements = [];
    
    achievementsData.achievements.forEach(achievement => {
        // Skip if already earned
        if (gameState.achievements.includes(achievement.id)) return;
        
        // Check if condition is met
        if (checkAchievementCondition(achievement)) {
            gameState.achievements.push(achievement.id);
            achievement.new = true; // mark as newly unlocked
            newAchievements.push(achievement);
            if (achievement.reward) {
                if (!gameState.unclaimedAchievements.includes(achievement.id)) {
                    gameState.unclaimedAchievements.push(achievement.id);
                }
            }
        }
    });
    
    // Display new achievements
    newAchievements.forEach(achievement => {
        showAchievementUnlock(achievement);
    });
    
    updateAchievements();
}

function awardAchievement(achievement) {
    if (!achievement.reward) return;
    
    const reward = achievement.reward;
    
    // Award coins
    if (reward.coins) {
        gameState.coins = Math.max(0, gameState.coins + reward.coins);
        console.log(`Achievement reward: +${reward.coins} coins`);
    }
    
    // Award milk
    if (reward.milk) {
        gameState.milk = Math.max(0, gameState.milk + reward.milk);
        gameState.stats.totalMilkProduced += reward.milk;
        console.log(`Achievement reward: +${reward.milk} milk`);
    }
    
    // Apply special effects
    if (reward.special_effect) {
        applyAchievementEffect(reward.special_effect);
    }

    console.log(`Achievement unlocked: ${achievement.name}`);
    checkAllCowUnlocks();
}

function claimAchievementReward(achievementId) {
    const achievement = achievementsData.achievements.find(a => a.id === achievementId);
    if (!achievement) return;
    if (!gameState.achievements.includes(achievementId)) return;
    if (gameState.claimedAchievements.includes(achievementId)) return;

    awardAchievement(achievement);
    gameState.claimedAchievements.push(achievementId);

    const idx = gameState.unclaimedAchievements.indexOf(achievementId);
    if (idx !== -1) gameState.unclaimedAchievements.splice(idx, 1);

    updateDisplay();
    updateAchievements();
    saveGameState();
    showToast(`Reward collected for ${achievement.name}!`, 'success');
}

function applyAchievementEffect(effectType) {
    if (!gameState.effects.achievements) {
        gameState.effects.achievements = {};
    }
    
    switch (effectType) {
        case 'milk_boost_permanent':
            gameState.effects.achievements.milkBoost = 1.2;
            break;
            
        case 'coin_boost_permanent':
            gameState.effects.achievements.coinBoost = 1.15;
            break;
            
        case 'crop_growth_boost':
            gameState.effects.achievements.cropGrowthBoost = 1.25;
            break;
            
        case 'rhythm_tolerance_boost':
            gameState.effects.achievements.rhythmToleranceBoost = 0.3;
            break;
            
        case 'happiness_aura':
            gameState.effects.achievements.happinessAura = true;
            break;
            
        case 'perfectionist_aura':
            gameState.effects.achievements.perfectionistAura = true;
            break;
            
        case 'legend_status':
            gameState.effects.achievements.legendStatus = true;
            break;
            
        default:
            console.log(`Unknown achievement effect: ${effectType}`);
    }
}

function showAchievementUnlock(achievement) {
    const popup = document.getElementById('achievementPopup');
    if (!popup) return;
    
    const rarity = achievement.rarity || 'common';
    const rarityStyle = achievementsData.rarityStyles[rarity];
    
    popup.className = `achievement-popup achievement-${rarity}`;
    popup.innerHTML = `
        <button class="close-achievement" onclick="closeAchievementPopup()">&#x274C;</button>
        <div class="achievement-title">Achievement Unlocked!</div>
        <div class="achievement-icon-name">
            ${achievement.icon} ${achievement.name}
        </div>
        <div class="achievement-desc">
            ${achievement.description}
        </div>
        <div class="achievement-reward">
            ${achievement.reward?.message || 'Well done!'}
        </div>
    `;
    
    popup.style.display = 'block';

    setTimeout(() => {
        popup.style.display = 'none';
    }, 5000);
    
    if (navigator.vibrate) {
        // Different vibration patterns based on rarity
        const vibrationPatterns = {
            common: [100],
            uncommon: [100, 50, 100],
            rare: [200, 100, 200],
            epic: [300, 100, 300, 100, 300],
            legendary: [500, 200, 500, 200, 500, 200, 500]
        };
        navigator.vibrate(vibrationPatterns[rarity] || [100]);
    }
}

function closeAchievementPopup() {
    const popup = document.getElementById('achievementPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

function formatAchievementReward(reward) {
    if (!reward) return '';
    const parts = [];
    if (reward.coins) parts.push(`+${reward.coins} coins`);
    if (reward.milk) parts.push(`+${reward.milk} milk`);
    if (reward.special_effect) {
        const effectNames = {
            milk_boost_permanent: 'Permanent milk boost',
            coin_boost_permanent: 'Permanent coin boost',
            crop_growth_boost: 'Faster crop growth',
            rhythm_tolerance_boost: 'Easier rhythm timing',
            happiness_aura: 'Happiness aura',
            perfectionist_aura: 'Perfectionist aura',
            legend_status: 'Legend status'
        };
        parts.push(effectNames[reward.special_effect] || reward.special_effect.replace(/_/g, ' '));
    }
    if (parts.length === 0 && reward.message) {
        parts.push(reward.message);
    }
    return parts.join(', ');
}

// Calculate progress towards an achievement condition
function getAchievementProgress(achievement) {
    const condition = achievement.condition || {};
    const stats = gameState.stats;
    let current = 0;
    let target = condition.target || 1;

    switch (condition.type) {
        case 'totalMilk':
            current = stats.totalMilkProduced;
            break;
        case 'totalCoins':
            current = stats.totalCoinsEarned;
            break;
        case 'perfectScores':
            current = stats.totalPerfectScores;
            break;
        case 'cropsHarvested':
            current = stats.cropsHarvested;
            break;
        case 'cropTypeHarvested':
            current = stats.cropTypesHarvested[condition.cropType] || 0;
            break;
        case 'cowsHappy':
            current = stats.cowsHappy;
            break;
        case 'cowsUnlocked':
            current = gameState.cows.length;
            break;
        case 'allCowsHappy':
            current = (gameState.cows.length >= (condition.minimumCows || 1) &&
                       gameState.cows.every(cow => cow.isHappy)) ? target : 0;
            break;
        case 'secretCowsUnlocked':
            current = stats.secretCowsUnlocked;
            break;
        case 'day':
            current = gameState.day;
            break;
        case 'maxCombo':
            current = stats.maxCombo;
            break;
        case 'perfectStreak':
            current = stats.perfectStreak;
            break;
        case 'upgradesPurchased':
            current = stats.upgradesPurchased;
            break;
        case 'timeOfDay':
            current = stats.playedAtMidnight ? 1 : 0;
            target = 1;
            break;
        case 'speedHarvest':
            current = stats.harvestTimestamps.filter(ts => ts >= Date.now() - (condition.timeLimit * 1000)).length;
            break;
        case 'achievementsCompleted':
            current = gameState.achievements.length;
            break;
        default:
            current = 0;
    }

    const percent = Math.min(100, Math.round((current / target) * 100));
    return { current, target, percent };
}

function updateAchievements() {
    const achievementsList = document.getElementById('achievementsList');
    if (!achievementsList) return;

    if (!achievementsData.achievements) {
        achievementsList.innerHTML = '';
        return;
    }

    // Group all achievements by category
    const categorizedAchievements = {};
    achievementsData.categories?.forEach(category => {
        categorizedAchievements[category.id] = {
            info: category,
            achievements: []
        };
    });

    // Place achievements into their categories
    achievementsData.achievements.forEach(achievement => {
        if (categorizedAchievements[achievement.category]) {
            categorizedAchievements[achievement.category].achievements.push(achievement);
        }
    });

    let html = '';
    Object.values(categorizedAchievements).forEach(category => {
        if (category.achievements.length === 0) return;

        html += `
            <div class="achievement-category">
                <h4 class="achievement-category-title">
                    ${category.info.name}
                </h4>
        `;

        category.achievements.forEach(achievement => {
            const rarity = achievement.rarity || 'common';
            const progress = getAchievementProgress(achievement);
            const earned = gameState.achievements.includes(achievement.id);
            const claimable = earned && achievement.reward && !gameState.claimedAchievements.includes(achievement.id);

            html += `
                <div class="achievement-item achievement-item-${rarity}${earned ? '' : ' achievement-item-locked'}">
                    <div class="achievement-item-icon">${achievement.icon}</div>
                    <div class="achievement-item-info">
                        <div class="achievement-item-name">${achievement.name}${achievement.new ? ' <span class="new-badge">NEW</span>' : ''}</div>
                        <div class="achievement-item-desc">${achievement.description}</div>
                        <div class="achievement-item-reward">${formatAchievementReward(achievement.reward)}</div>
                        <div class="achievement-item-progress">
                            <div class="achievement-progress-bar" style="width:${progress.percent}%"></div>
                        </div>
                        <div class="achievement-progress-text">${progress.current}/${progress.target} (${progress.percent}%)</div>
                        ${claimable ? `<button class="claim-reward-btn" onclick="claimAchievementReward('${achievement.id}')">Collect</button>` : ''}
                    </div>
                    <div class="achievement-item-rarity">${rarity}${earned ? '' : ' (Locked)'}</div>
                </div>
            `;
        });

        html += '</div>';
    });

    achievementsList.innerHTML = html;
}

function clearNewAchievementFlags() {
    if (!achievementsData.achievements) return;
    achievementsData.achievements.forEach(a => {
        if (a.new) {
            delete a.new;
        }
    });
}

// Enhanced rhythm game instructions using pattern data
function getGameInstructions(gameType) {
    if (rhythmPatterns.rhythmTypes && rhythmPatterns.rhythmTypes[gameType]) {
        return rhythmPatterns.rhythmTypes[gameType].instructions;
    }
    
    // Fallback to instructions loaded from rhythm-defaults.json
    return DEFAULT_INSTRUCTIONS[gameType] || "Follow the rhythm and make your cow happy!";
}


function showToast(text, type) {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;
    
    toast.textContent = text;
    
    toast.classList.remove('toast-success', 'toast-failure', 'toast-info');
    if (type === 'success') {
        toast.classList.add('toast-success');
    } else if (type === 'failure') {
        toast.classList.add('toast-failure');
    } else {
        toast.classList.add('toast-info');
    }
    
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function startTimedEffect(item, effectType, value, duration) {
    const maxDuration = 30 * 60 * 1000; // 30 minutes cap
    const finalDuration = Math.min(duration, maxDuration);

    // Only allow a single pest protection effect. If one is already
    // active, extend its duration instead of creating a second timer.
    if (effectType === 'pest_protection') {
        const existing = gameState.activeEffects.find(e => e.effectType === 'pest_protection');
        if (existing) {
            const remaining = Math.max(0, existing.expiresAt - Date.now());
            const newDuration = Math.min(remaining + finalDuration, maxDuration);
            clearTimeout(existing.timerId);
            existing.expiresAt = Date.now() + newDuration;
            existing.timerId = setTimeout(() => {
                removeTimedEffect(existing.id);
            }, newDuration);
            renderEffectTimers();
            return;
        }
    }

    const effectId = `${item.id}_${effectType}`;
    const expiresAt = Date.now() + finalDuration;
    const timerId = setTimeout(() => {
        removeTimedEffect(effectId);
    }, finalDuration);
    gameState.activeEffects.push({
        id: effectId,
        itemId: item.id,
        itemName: item.name,
        icon: item.icon,
        effectType,
        value,
        expiresAt,
        timerId
    });
    renderEffectTimers();
}

function removeTimedEffect(effectId) {
    const index = gameState.activeEffects.findIndex(e => e.id === effectId);
    if (index === -1) return;
    const effect = gameState.activeEffects[index];
    switch (effect.effectType) {
        case 'coin_bonus':
            gameState.effects.coinBonus = (gameState.effects.coinBonus || 0) - effect.value;
            break;
        case 'coin_bonus_percent':
            gameState.effects.coinBonusPercent = (gameState.effects.coinBonusPercent || 0) - effect.value;
            break;
        case 'crop_speed_boost':
            gameState.effects.cropSpeedBoost = 0;
            break;
        case 'crop_growth_speed':
            gameState.effects.cropGrowthSpeed = (gameState.effects.cropGrowthSpeed || 0) - effect.value;
            break;
        case 'action_speed_boost':
            gameState.effects.actionSpeedBoost = (gameState.effects.actionSpeedBoost || 0) - effect.value;
            break;
        case 'extra_milk_per_click':
            gameState.effects.extraMilkPerClick = (gameState.effects.extraMilkPerClick || 0) - effect.value;
            break;
        case 'milk_yield_bonus':
            gameState.effects.milkYieldBonus = (gameState.effects.milkYieldBonus || 0) - effect.value;
            break;
        case 'happiness_boost':
            gameState.effects.happinessBoost = 0;
            break;
        case 'happiness_boost_percent':
            gameState.effects.happinessBoostPercent = (gameState.effects.happinessBoostPercent || 0) - effect.value;
            break;
        case 'crop_yield_boost':
            gameState.effects.cropYieldBoost = (gameState.effects.cropYieldBoost || 0) - effect.value;
            break;
        case 'milk_production_multiplier':
            gameState.effects.milkProductionMultiplier = (gameState.effects.milkProductionMultiplier || 1) / effect.value;
            break;
        case 'rhythm_tolerance_boost':
            gameState.effects.rhythmTolerance = (gameState.effects.rhythmTolerance || 0) - effect.value;
            break;
        case 'unlock_crop':
            if (gameState.unlockedCrops) delete gameState.unlockedCrops[effect.value];
            break;
        case 'pest_protection':
            // Only disable pest protection if no other active effects remain
            const stillActive = gameState.activeEffects.some(e =>
                e.effectType === 'pest_protection' && e.id !== effect.id);
            if (!stillActive) {
                gameState.effects.pestProtection = false;
            }
            break;
    }
    clearTimeout(effect.timerId);
    gameState.activeEffects.splice(index, 1);

    if (effect.itemId && gameState.upgrades[effect.itemId] > 0) {
        gameState.upgrades[effect.itemId]--;
        if (gameState.upgrades[effect.itemId] < 0) gameState.upgrades[effect.itemId] = 0;
        renderShop();
    }

    showToast(`${effect.itemName} effect has worn off!`, 'info');
    renderEffectTimers();
}

function renderEffectTimers() {
    const container = document.getElementById('effectTimers');
    if (!container) return;
    const now = Date.now();
    container.innerHTML = '';
    gameState.activeEffects.forEach(effect => {
        const remaining = Math.max(0, effect.expiresAt - now);
        if (remaining <= 0) {
            removeTimedEffect(effect.id);
            return;
        }
        const div = document.createElement('div');
        div.className = 'effect-timer';

        const iconEl = document.createElement('img');
        iconEl.className = 'effect-icon';
        if (effect.icon) iconEl.dataset.icon = effect.icon;
        iconEl.alt = effect.itemName;
        div.appendChild(iconEl);

        div.appendChild(document.createTextNode(` ${effect.itemName} ${formatTime(Math.ceil(remaining / 1000))}`));
        container.appendChild(div);
    });
}

function restartEffectTimers() {
    const now = Date.now();

    // Merge any duplicate pest protection effects on load
    const pestEffects = gameState.activeEffects.filter(e => e.effectType === 'pest_protection');
    if (pestEffects.length > 1) {
        const longest = pestEffects.reduce((a, b) => a.expiresAt > b.expiresAt ? a : b);
        gameState.activeEffects = gameState.activeEffects.filter(e => e.effectType !== 'pest_protection');
        gameState.activeEffects.push(longest);
    }

    gameState.activeEffects.forEach(effect => {
        const remaining = effect.expiresAt - now;
        if (remaining > 0) {
            effect.timerId = setTimeout(() => {
                removeTimedEffect(effect.id);
            }, remaining);
        } else {
            effect.timerId = setTimeout(() => {
                removeTimedEffect(effect.id);
            }, 0);
        }
    });
    renderEffectTimers();
}

// --- Meteor Shower Event System ---
function maybeTriggerMeteorShower() {
    const hour = new Date().getHours();
    if ((hour >= 20 || hour < 6) && !gameState.isMeteorShower) {
        if (Math.random() < 0.02) { // 2% chance each check
            startMeteorShower();
        }
    }
}

function startMeteorShower() {
    if (gameState.isMeteorShower) return;
    gameState.isMeteorShower = true;
    const overlay = document.getElementById('meteorShowerOverlay');
    if (overlay) {
        setupMeteorOverlay();
        overlay.style.display = 'block';
    }
    const audio = document.getElementById('meteorSound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
    generateCropButtons();
    showToast('🌠 Meteor shower! Cosmic crops available!', 'info');
    setTimeout(endMeteorShower, 30000); // lasts 30 seconds
}

function endMeteorShower() {
    if (!gameState.isMeteorShower) return;
    gameState.isMeteorShower = false;
    const overlay = document.getElementById('meteorShowerOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    }
    generateCropButtons();
}

// --- Weather Visual Effects ---
function setupRainOverlay() {
    const overlay = document.getElementById('rainOverlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    for (let i = 0; i < 40; i++) {
        const drop = document.createElement('div');
        drop.className = 'raindrop';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.animationDuration = (0.5 + Math.random()) + 's';
        drop.style.animationDelay = (-Math.random() * 2) + 's';
        overlay.appendChild(drop);
    }
}

function setupFireflyOverlay() {
    const overlay = document.getElementById('fireflyOverlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const fly = document.createElement('div');
        fly.className = 'firefly';
        fly.style.left = Math.random() * 100 + '%';
        fly.style.top = Math.random() * 100 + '%';
        fly.style.animationDuration = (3 + Math.random() * 2) + 's';
        fly.style.animationDelay = Math.random() * 3 + 's';
        overlay.appendChild(fly);
    }
}

function setupMeteorOverlay() {
    const overlay = document.getElementById('meteorShowerOverlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const comet = document.createElement('div');
        comet.className = 'comet';
        comet.style.left = Math.random() * 100 + '%';
        comet.style.top = Math.random() * 100 + '%';
        comet.style.animationDuration = (1 + Math.random()).toFixed(2) + 's';
        comet.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
        overlay.appendChild(comet);
    }
}

function updateWeatherEffects() {
    const rainOverlay = document.getElementById('rainOverlay');
    const fireflyOverlay = document.getElementById('fireflyOverlay');
    if (rainOverlay) {
        const isRain = getCurrentWeather().name === 'Rain Storm';
        rainOverlay.style.display = isRain ? 'block' : 'none';
    }
    if (fireflyOverlay) {
        const isNight = document.body.classList.contains('night');
        fireflyOverlay.style.display = isNight ? 'block' : 'none';
    }
}

function updateDisplay() {
    const coinsEl = document.getElementById('coins');
    const milkEl  = document.getElementById('milk');
    const xpEl    = document.getElementById('xp');
    const dayEl   = document.getElementById('day');
    const moodEl  = document.getElementById('happiness');
    const seasonEl = document.getElementById('seasonDisplay');
    const weatherEl = document.getElementById('weatherDisplay');

    // Update header stats
    if (coinsEl) coinsEl.textContent = Math.floor(gameState.coins);
    if (milkEl)  milkEl.textContent  = gameState.milk;
    if (xpEl)    xpEl.textContent    = gameState.xp;
    if (dayEl)   dayEl.textContent   = gameState.day;

    if (seasonEl) {
        const season = getCurrentSeason();
        seasonEl.textContent = `${season.emoji} ${season.name}`.trim();
    }
    if (weatherEl) {
        const weather = getCurrentWeather();
        weatherEl.textContent = `${weather.emoji} ${weather.name} ${gameState.currentTemperature}°C`.trim();
    }

    updateWeatherEffects();

    // → NEW: average happiness across all unlocked cows
    if (moodEl) {
        const herd = gameState.cows;
        if (herd.length > 0) {
            const total = herd.reduce((sum, c) => sum + c.happinessLevel, 0);
            moodEl.textContent = Math.floor(total / herd.length);
        } else {
            moodEl.textContent = '0';
        }
    }

    // → NEW: auto-unlock cows whose conditions are now met
    checkAllCowUnlocks();

    // Refresh shop buttons, etc.
    renderShop();

    // Ensure cow grid reflects latest mood values
    renderCows();
}

// Backward compatibility function to migrate old saves
function migrateGameState() {
    // Initialize stats object if it doesn't exist
    if (!gameState.stats) {
        gameState.stats = {
            totalMilkProduced: gameState.totalMilkProduced || 0,
            totalCoinsEarned: gameState.totalCoinsEarned || 0,
            totalPerfectScores: gameState.totalPerfectScores || 0,
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
    };
    }
    // Ensure new fields exist when migrating older saves
    if (!gameState.stats.harvestTimestamps) {
        gameState.stats.harvestTimestamps = [];
    }

    if (!gameState.dailyMilkTotals) {
        gameState.dailyMilkTotals = [];
    }
    if (!gameState.dailyCoinTotals) {
        gameState.dailyCoinTotals = [];
    }

    if (!gameState.claimedAchievements) {
        gameState.claimedAchievements = [];
    }
    if (!gameState.unclaimedAchievements) {
        gameState.unclaimedAchievements = [];
    }

    if (gameState.xp === undefined) {
        gameState.xp = 0;
    }

    if (gameState.currentSeasonIndex === undefined) {
        gameState.currentSeasonIndex = 0;
    }
    if (gameState.currentWeatherIndex === undefined) {
        gameState.currentWeatherIndex = 0;
    }
    
    // Migrate old fields to new stats structure
    if (gameState.totalMilkProduced !== undefined) {
        gameState.stats.totalMilkProduced = gameState.totalMilkProduced;
        delete gameState.totalMilkProduced;
    }
    
    if (gameState.totalCoinsEarned !== undefined) {
        gameState.stats.totalCoinsEarned = gameState.totalCoinsEarned;
        delete gameState.totalCoinsEarned;
    }
    
    if (gameState.totalPerfectScores !== undefined) {
        gameState.stats.totalPerfectScores = gameState.totalPerfectScores;
        delete gameState.totalPerfectScores;
    }

    // Ensure cows have level property
    if (Array.isArray(gameState.cows)) {
        gameState.cows.forEach(c => {
            if (c.level === undefined) c.level = 1;
        });
    }
    if (Array.isArray(gameState.lockedCows)) {
        gameState.lockedCows.forEach(c => {
            if (c.level === undefined) c.level = 1;
        });
    }
    
    // Initialize effects object if it doesn't exist
    if (!gameState.effects) {
        gameState.effects = {};
    }
    
    // Count existing upgrades for achievement tracking
    if (gameState.upgrades && gameState.stats.upgradesPurchased === 0) {
        gameState.stats.upgradesPurchased = Object.values(gameState.upgrades).reduce((total, level) => total + level, 0);
    }
    
    // Check for midnight play
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) {
        gameState.stats.playedAtMidnight = true;
    }
    
    console.log('Game state migrated to new achievement system');
}

// Mobile-optimized game functions
async function initializeGame() {
    // Migrate old save data to new format
    migrateGameState();
    
    // Try to load saved game first
    const loadedSave = await loadGameState();
    migrateGameState();

    if (!loadedSave) {
        // New game - ask for username and initialize everything
        promptForUsername();
        generateCows();
        initializeCrops();
        updateSeason();
        updateWeather(true);
    } else {
        // Loaded game - ask for username if missing and reinitialize display elements
        if (!gameState.username || !gameState.playerID) {
            promptForUsername();
        }
        // Loaded game - reinitialize display elements
        generateCows(); // This will use existing cow data
        renderCrops(); // This will use existing crop data
        
        // Restart any crop timers that should still be running
        gameState.crops.forEach(crop => {
            if (crop.type && !crop.isReady && crop.readyAt) {
                const timeLeft = crop.readyAt - Date.now();
                if (timeLeft > 0) {
                    const cropData = cropTypes[crop.type];
                    if (cropData) {
                        crop.timerId = setTimeout(() => {
                            if (crop.type && !crop.isReady) {
                                crop.isReady = true;
                                renderCrops();
                                showToast(`${cropData.name} is ready to harvest! 🌾`, 'success');
                            }
                        }, timeLeft);
                        gameState.activeCropTimers.push(crop.timerId);
                    }
                } else {
                    // Crop should already be ready
                    crop.isReady = true;
                }
            }
        });
        updateSeason();
        updateWeather(true);
    }

    restartEffectTimers();

    // Apply any happiness decay since last session
    updateAllCowHappiness();
    applyCowbellThreshold();
    
    // Initialize new data-driven systems
    generateCropButtons();
    renderShop();

    setupRainOverlay();
    setupFireflyOverlay();
    setupMeteorOverlay();
    updateWeatherEffects();

    updateDisplay();
    updateBulletin();
    updateStatsChart();
    updateAchievements();
    updateSaveInfo();
    
    // Check achievements on startup (for achievements that might already be earned)
    checkAchievements();
    
    // Setup auto-save system
    setupAutoSave();

    // Periodically decay cow happiness
    setInterval(() => {
        updateAllCowHappiness();
        updateDisplay();
    }, GAME_CONFIG.HAPPINESS_UPDATE_INTERVAL);

    // Check for meteor showers at night
    maybeTriggerMeteorShower();
    setInterval(maybeTriggerMeteorShower, 60000);

    console.log('Game initialized with data-driven systems and achievements!');
}

// FIXED: Backward compatibility achievement function with safe emoji removal
function showAchievement(title, description) {
    // Safely remove emoji characters by replacing them with empty string
    const cleanTitle = title.replace(/[\u{1F300}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    
    showAchievementUnlock({
        name: cleanTitle,
        description: description,
        icon: '',
        rarity: 'common',
        reward: { message: description }
    });
}

// Initialize game when data is loaded
loadGameData().then(() => {
    initializeGame();
    startPestChecks();
});



// Auto-update crop timers
setInterval(() => {
    let needsUpdate = false;
    const cropSlots = document.querySelectorAll('#cropsGrid .crop-slot');
    gameState.crops.forEach((crop, index) => {
        if (!crop.type) return;

        if (!crop.isReady) {
            const timeLeft = crop.readyAt - Date.now();
            if (timeLeft <= 0) {
                crop.isReady = true;
                needsUpdate = true;
            }

            const growTime = crop.growTime || cropTypes[crop.type].growTime;
            const progress = Math.min(100, Math.round(((growTime - Math.max(0, timeLeft)) / growTime) * 100));

            const slot = cropSlots[index];
            if (slot) {
                const timerEl = slot.querySelector('.growth-timer');
                if (timerEl) timerEl.textContent = formatTime(Math.ceil(Math.max(0, timeLeft) / 1000));
                const barEl = slot.querySelector('.growth-bar');
                if (barEl) barEl.style.width = `${progress}%`;
                if (crop.hasPest) {
                    const pestTimer = slot.querySelector('.pest-timer');
                    if (pestTimer) pestTimer.textContent = formatTime(Math.ceil(Math.max(0, crop.pestExpiresAt - Date.now()) / 1000));
                }
            }
        } else {
            const slot = cropSlots[index];
            if (slot) {
                const barEl = slot.querySelector('.growth-bar');
                if (barEl) barEl.style.width = '100%';
                if (crop.hasPest) {
                    const pestTimer = slot.querySelector('.pest-timer');
                    if (pestTimer) pestTimer.textContent = formatTime(Math.ceil(Math.max(0, crop.pestExpiresAt - Date.now()) / 1000));
                }
            }
        }
    });

    if (needsUpdate) {
        renderCrops();
    }
}, GAME_CONFIG.CROP_UPDATE_INTERVAL);

// Update active effect timers every second
setInterval(renderEffectTimers, 1000);

function updateCowLevelTimers() {
    const cards = document.querySelectorAll('#cowsGrid .cow-card');
    const levelHours = (GAME_CONFIG.HAPPINESS.level_up_hours || 12) * 3600000;
    let leveledUp = false;
    gameState.cows.forEach((cow, idx) => {
        const card = cards[idx];
        if (!card) return;
        const barEl = card.querySelector('.level-progress-bar');
        const timerEl = card.querySelector('.level-timer');
        if (barEl && timerEl) {
            if (cow.fullHappySince) {
                const elapsed = Date.now() - cow.fullHappySince;
                const remaining = Math.max(0, levelHours - elapsed);
                const progress = Math.min(100, (elapsed / levelHours) * 100);
                barEl.style.width = `${progress}%`;
                timerEl.textContent = formatTime(Math.ceil(remaining / 1000));

                if (elapsed >= levelHours) {
                    const prevLevel = cow.level;
                    checkCowLevelUp(cow);
                    if (cow.level !== prevLevel) {
                        leveledUp = true;
                    }
                }
            } else {
                barEl.style.width = '0%';
                timerEl.textContent = '';
            }
        }
    });

    if (leveledUp) {
        renderCows();
    }
}

setInterval(updateCowLevelTimers, 1000);

// Update time-of-day theme based on real-world time
function updateTimeTheme() {
    const now = new Date();
    const hour = now.getHours();
    let theme = 'day';
    if (hour >= 5 && hour < 8) {
        theme = 'dawn';
    } else if (hour >= 8 && hour < 18) {
        theme = 'day';
    } else if (hour >= 18 && hour < 21) {
        theme = 'dusk';
    } else {
        theme = 'night';
    }
    const root = document.body;
    root.classList.remove('dawn', 'day', 'dusk', 'night');
    root.classList.add(theme);

    const header = document.querySelector('.game-header');
    if (header) {
        header.classList.remove('dawn', 'day', 'dusk', 'night');
        header.classList.add(theme);
    }

    const timeEl = document.getElementById('timeDisplay');
    if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    updateWeather();
    updateWeatherEffects();
}

// Apply the theme immediately and then align updates to the start of each minute
updateTimeTheme();
const now = new Date();
const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
setTimeout(() => {
    updateTimeTheme();
    setInterval(updateTimeTheme, 60 * 1000);
}, delay);

// Keep the time display in sync with the device clock
function updateClock() {
    const timeEl = document.getElementById('timeDisplay');
    if (timeEl) {
        const current = new Date();
        timeEl.textContent = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}
updateClock();
setInterval(updateClock, 1000);

// Scroll to top button functionality
const scrollTopBtn = document.getElementById('scrollTopBtn');
if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            scrollTopBtn.style.display = 'block';
        } else {
            scrollTopBtn.style.display = 'none';
        }
    });
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Slide-out menu functionality
const menuButton = document.getElementById('menuButton');
const sideMenu = document.getElementById('sideMenu');
const closeMenu = document.getElementById('closeMenu');
if (menuButton && sideMenu && closeMenu) {
    menuButton.addEventListener('click', () => sideMenu.classList.add('open'));
    closeMenu.addEventListener('click', () => sideMenu.classList.remove('open'));
}

