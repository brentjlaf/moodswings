// Game data containers
let cropTypes = {};
let shopData = {};
let rhythmPatterns = {};
let achievementsData = {};
let cowData = [];
let secretCows = [];

// Data loading system
async function loadGameData() {
    try {
        console.log('Loading game data...');
        
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
                description: crop.description
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
    day: 1,
    totalScore: 0,
    cows: [],
    lockedCows: [],
    crops: [],
    upgrades: {},
    effects: {}, // Effect system for upgrades
    dailyStats: {
        happiest: null,
        milkProduced: 0,
        coinsEarned: 0,
        perfectScores: 0,
        totalGames: 0
    },
    achievements: [], // Array of earned achievement IDs
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
        playedAtMidnight: false
    },
    perfectStreakRecord: 0,
    activeCropTimers: [],
    playerID: null,
    lastSaved: null,
    gameVersion: "2.1" // Updated version for achievement system
};


// FIX: Helper function to safely deduct coins
function deductCoins(amount, context = 'purchase') {
    if (gameState.coins < amount) {
        showToast(`Not enough coins for ${context}!`, 'failure');
        return false;
    }
    gameState.coins = Math.max(0, gameState.coins - amount);
    return true;
}

// NEW: Helper function to safely deduct milk
function deductMilk(amount, context = 'purchase') {
    if (gameState.milk < amount) {
        showToast(`Not enough milk for ${context}!`, 'failure');
        return false;
    }
    gameState.milk = Math.max(0, gameState.milk - amount);
    return true;
}

// FIX: Clear all crop timers to prevent memory leaks
function clearAllCropTimers() {
    gameState.activeCropTimers.forEach(timerId => {
        clearTimeout(timerId);
    });
    gameState.activeCropTimers = [];
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
        default:
            return true;
    }
}

// Get available crops based on unlock conditions
function getAvailableCrops() {
    return Object.keys(cropTypes).filter(cropId => {
        const crop = cropTypes[cropId];
        return checkCropUnlockCondition(crop);
    });
}

// Dynamic crop button generation with rarity styling
function generateCropButtons() {
    const container = document.querySelector('.plant-controls');
    if (!container) return;
    
    const availableCrops = getAvailableCrops();
    
    container.innerHTML = availableCrops.map(cropId => {
        const crop = cropTypes[cropId];
        const rarityClass = crop.rarity ? `crop-${crop.rarity}` : '';
        
        return `
            <button class="plant-btn ${rarityClass}" onclick="plantCrop('${cropId}')" title="${crop.description || ''}">
                ${crop.emoji}<br />${crop.name}<br>
                <span class="crop-cost">${crop.cost} coins</span>
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
        // Get items for this category that are unlocked
        const categoryItems = shopData.items.filter(item =>
            item.category === category.id && checkShopUnlockCondition(item)
        );

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

        // Add items for this category
        categoryItems.forEach(item => {
            const shopItem = document.createElement('div');
            shopItem.className = 'shop-item';
            
            const isOwned = gameState.upgrades[item.id] >= (item.maxLevel || 1);
            const currency = item.currency || 'coins';
            const cost = item.cost;
            const canAfford = currency === 'coins'
                ? gameState.coins >= cost
                : gameState.milk >= cost;
            const buttonText = isOwned ? 'OWNED' : (canAfford ? 'BUY' : 'TOO EXPENSIVE');
            const buttonClass = isOwned ? 'owned' : (canAfford ? 'available' : 'expensive');
            
            shopItem.innerHTML = `
                <div class="item-icon">${item.icon}</div>
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-description">${item.description}</div>
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
            
            itemGrid.appendChild(shopItem);
        });

        section.appendChild(itemGrid);
        categoriesContainer.appendChild(section);
    });
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
    const paid = currency === 'coins'
        ? deductCoins(item.cost, item.name)
        : deductMilk(item.cost, item.name);
    if (!paid) {
        return;
    }
    
    // Apply upgrade
    gameState.upgrades[itemId] = currentLevel + 1;
    
    // Track purchase for achievements
    gameState.stats.upgradesPurchased++;
    
    // Apply effects
    applyUpgradeEffects(item);
    
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
    
    Object.keys(item.effects).forEach(effectType => {
        const effectValue = item.effects[effectType];
        
        switch (effectType) {
            case 'rhythm_tolerance':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.rhythmTolerance = (gameState.effects.rhythmTolerance || 0) + effectValue;
                break;
                
            case 'milk_multiplier':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.milkMultiplier = effectValue;
                break;
                
            case 'coin_bonus':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.coinBonus = (gameState.effects.coinBonus || 0) + effectValue;
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
                
            case 'rhythm_speed_bonus':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.rhythmSpeedBonus = (gameState.effects.rhythmSpeedBonus || 0) + effectValue;
                break;
                
            case 'crop_speed_boost':
                if (!gameState.effects) gameState.effects = {};
                gameState.effects.cropSpeedBoost = effectValue;
                // Apply temporary effect if it has duration
                if (item.effects.duration) {
                    setTimeout(() => {
                        gameState.effects.cropSpeedBoost = 0;
                        showToast('Fertilizer effect has worn off!', 'info');
                    }, item.effects.duration);
                }
                break;
                
            default:
                console.log(`Unknown effect type: ${effectType}`);
        }
    });
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
        currentMood,
        moodValue: base.moodValue,   // preserve the original value
        isHappy: base.moodValue >= 70, // happy threshold at 70
        lastPlayed: null,
        happinessLevel: base.moodValue, // mirror moodValue
        lastHappinessUpdate: Date.now()
    };
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

        const happinessColor    = cow.isHappy ? '#32CD32' : '#FF6B6B';
        const heartIcon         = cow.isHappy ? '💚' : '💔';
        const moodClass         = cow.isHappy ? 'cow-mood cow-mood-happy' : 'cow-mood cow-mood-sad';
        const moodValueDisplay  = Math.round(cow.moodValue);

        const isMaxHappy = cow.happinessLevel >= 100;
        const buttonText = !cow.isHappy
            ? 'Cheer Up!'
            : isMaxHappy
                ? 'Max Happy!'
                : 'Keep Happy!';
        const disabledAttr = isMaxHappy ? 'disabled' : '';

        cowCard.innerHTML = `
            <div class="cow-icon">${cow.emoji}</div>
            <div class="cow-name">${cow.name}</div>
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
}

function updateCowHappiness(cow) {
    const now = Date.now();
    const hours = (now - (cow.lastHappinessUpdate || now)) / 3600000;
    if (hours <= 0) return;
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
            const growTime = cropData.growTime;
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
                    <div class="growth-timer">${seconds}s</div>
                    <div class="growth-progress"><div class="growth-bar" style="width:${progress}%;"></div></div>
                `;
            }
        } else {
            cropSlot.innerHTML = '<div class="crop-slot-empty">➕</div>';
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
    gameState.stats.totalCoinsEarned += cropData.value;
    
    // Track achievement stats
    gameState.stats.cropsHarvested++;
    if (!gameState.stats.cropTypesHarvested[crop.type]) {
        gameState.stats.cropTypesHarvested[crop.type] = 0;
    }
    gameState.stats.cropTypesHarvested[crop.type]++;
    
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
    
    updateDisplay();
    renderCrops();
    checkAchievements(); // Check for new achievements
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
            
            // Track achievement stats
            gameState.stats.cropsHarvested++;
            if (!gameState.stats.cropTypesHarvested[crop.type]) {
                gameState.stats.cropTypesHarvested[crop.type] = 0;
            }
            gameState.stats.cropTypesHarvested[crop.type]++;
            
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
    gameState.day++;
    gameState.dailyStats = {
        happiest: null,
        milkProduced: 0,
        coinsEarned: 0,
        perfectScores: 0,
        totalGames: 0
    };

    updateAllCowHappiness();
    generateCows();
    
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
                <p class="bulletin-stat">💰 Coins: ${gameState.dailyStats.coinsEarned}</p>
                <p class="bulletin-stat">🎯 Perfect Scores: ${gameState.dailyStats.perfectScores}</p>
                <p class="bulletin-stat">🏆 Total Perfects: ${gameState.stats.totalPerfectScores}</p>
            </div>
        </div>
        <div class="unlock-progress-box">
            <h4 class="unlock-progress-title">
                🔓 UNLOCK PROGRESS
            </h4>
            <p class="unlock-progress-stat">Total Milk: ${gameState.stats.totalMilkProduced} | Total Coins: ${gameState.stats.totalCoinsEarned}</p>
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
        } else if (cow.unlockCondition === 'day' && gameState.day >= cow.unlockTarget) {
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
            newAchievements.push(achievement);
            awardAchievement(achievement);
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
        gameState.coins += reward.coins;
        console.log(`Achievement reward: +${reward.coins} coins`);
    }
    
    // Award milk
    if (reward.milk) {
        gameState.milk += reward.milk;
        gameState.stats.totalMilkProduced += reward.milk;
        console.log(`Achievement reward: +${reward.milk} milk`);
    }
    
    // Apply special effects
    if (reward.special_effect) {
        applyAchievementEffect(reward.special_effect);
    }
    
    console.log(`Achievement unlocked: ${achievement.name}`);
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

function updateAchievements() {
    const achievementsList = document.getElementById('achievementsList');
    if (!achievementsList) return;
    
    if (gameState.achievements.length === 0) {
        achievementsList.innerHTML = `
            <p class="no-achievements-text">
                🎯 No achievements yet - keep playing to unlock them!
            </p>
        `;
        return;
    }
    
    // Group achievements by category
    const categorizedAchievements = {};
    achievementsData.categories?.forEach(category => {
        categorizedAchievements[category.id] = {
            info: category,
            achievements: []
        };
    });
    
    // Sort earned achievements into categories
    gameState.achievements.forEach(achievementId => {
        const achievement = achievementsData.achievements?.find(a => a.id === achievementId);
        if (achievement && categorizedAchievements[achievement.category]) {
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
            const rarityStyle = achievementsData.rarityStyles?.[rarity] || 
                               { color: '#90EE90', border: '#32CD32' };
            
            html += `
                <div class="achievement-item achievement-item-${rarity}">
                    <div class="achievement-item-icon">${achievement.icon}</div>
                    <div class="achievement-item-info">
                        <div class="achievement-item-name">${achievement.name}</div>
                        <div class="achievement-item-desc">${achievement.description}</div>
                        <div class="achievement-item-reward">${formatAchievementReward(achievement.reward)}</div>
                    </div>
                    <div class="achievement-item-rarity">${rarity}</div>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    achievementsList.innerHTML = html;
}

// Enhanced rhythm game instructions using pattern data
function getGameInstructions(gameType) {
    if (rhythmPatterns.rhythmTypes && rhythmPatterns.rhythmTypes[gameType]) {
        return rhythmPatterns.rhythmTypes[gameType].instructions;
    }
    
    // Fallback to default instructions
    const defaultInstructions = {
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
    return defaultInstructions[gameType] || "Follow the rhythm and make your cow happy!";
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
            playedAtMidnight: false
        };
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
function initializeGame() {
    // Migrate old save data to new format
    migrateGameState();
    
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
    }

    // Apply any happiness decay since last session
    updateAllCowHappiness();
    
    // Initialize new data-driven systems
    generateCropButtons();
    renderShop();
    
    updateDisplay();
    updateBulletin();
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

            const growTime = cropTypes[crop.type].growTime;
            const progress = Math.min(100, Math.round(((growTime - Math.max(0, timeLeft)) / growTime) * 100));

            const slot = cropSlots[index];
            if (slot) {
                const timerEl = slot.querySelector('.growth-timer');
                if (timerEl) timerEl.textContent = `${Math.ceil(Math.max(0, timeLeft) / 1000)}s`;
                const barEl = slot.querySelector('.growth-bar');
                if (barEl) barEl.style.width = `${progress}%`;
            }
        } else {
            const slot = cropSlots[index];
            if (slot) {
                const barEl = slot.querySelector('.growth-bar');
                if (barEl) barEl.style.width = '100%';
            }
        }
    });

    if (needsUpdate) {
        renderCrops();
    }
}, GAME_CONFIG.CROP_UPDATE_INTERVAL);
