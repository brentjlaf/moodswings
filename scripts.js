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
            fetch('rhythm-patterns.json?v=1.2'),
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
        fastestWin: Infinity,
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
    const shopGrid = document.querySelector('.shop-grid');
    if (!shopGrid || !shopData.categories) return;
    
    shopGrid.innerHTML = '';
    
    shopData.categories.forEach(category => {
        // Get items for this category that are unlocked
        const categoryItems = shopData.items.filter(item => 
            item.category === category.id && checkShopUnlockCondition(item)
        );
        
        if (categoryItems.length === 0) return;
        
        // Add category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'shop-category-header';
        categoryHeader.innerHTML = `
            <h3 class="shop-category-title">
                ${category.name}
            </h3>
            <p class="shop-category-desc">${category.description}</p>
        `;
        shopGrid.appendChild(categoryHeader);
        
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
            
            shopGrid.appendChild(shopItem);
        });
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
    const { locked, ...base } = cow;  // drop any existing lock flag

    // Split the 0–100 moodValue range into equal segments so each mood gets its own bucket
    const segmentSize = 100 / base.moods.length;
    const moodIndex = Math.min(
        base.moods.length - 1,
        Math.floor(base.moodValue / segmentSize)
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
        const [firstCow, ...others] = cowData;
        gameState.cows = [buildCow(firstCow)];
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

        cowCard.innerHTML = `
            <div class="cow-icon">${cow.emoji}</div>
            <div class="cow-name">${cow.name}</div>
            <div class="${moodClass}">
                ${heartIcon} ${cow.currentMood} (${moodValueDisplay})
            </div>
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
            <div class="locked-cow-text">
                ${unlockText}
            </div>
        `;
        grid.appendChild(cowCard);
    });
}

// Reduce each cow's happiness over time
function updateCowHappiness(cow) {
    const now = Date.now();
    const hours = (now - (cow.lastHappinessUpdate || now)) / 3600000;
    if (hours <= 0) return;
    const min = GAME_CONFIG.HAPPINESS.decay_rate_min;
    const max = GAME_CONFIG.HAPPINESS.decay_rate_max;
    const decayPerHour = Math.random() * (max - min) + min;
    const decayAmount = decayPerHour * hours;
    cow.happinessLevel = Math.max(GAME_CONFIG.HAPPINESS.level_min,
        cow.happinessLevel - decayAmount);
    cow.moodValue = cow.happinessLevel;
    const segmentSize = 100 / cow.moods.length;
    const moodIndex = Math.min(cow.moods.length - 1,
        Math.floor(cow.moodValue / segmentSize));
    cow.currentMood = cow.moods[moodIndex];
    cow.isHappy = cow.moodValue >= 70;
    cow.lastHappinessUpdate = now;
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
                📋 DAILY FARM REPORT - DAY ${gameState.day}
            </h3>
            <p class="bulletin-stat"><strong>Happy Cows:</strong> ${happyCows.length}/${totalCows}</p>
            <p class="bulletin-stat"><strong>Milk Produced:</strong> ${gameState.dailyStats.milkProduced}</p>
            <p class="bulletin-stat"><strong>Coins Earned:</strong> ${gameState.dailyStats.coinsEarned}</p>
            <p class="bulletin-stat"><strong>Perfect Scores:</strong> ${gameState.dailyStats.perfectScores}</p>
            <p class="bulletin-stat"><strong>Total Perfects:</strong> ${gameState.stats.totalPerfectScores}</p>
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
            
        case 'fastWin':
            return stats.fastestWin <= condition.target;
            
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
    const cow = gameState.cows[cowIndex];
    currentMinigame.target =
        GAME_CONFIG.BASE_TARGET_SCORE +
        (gameState.day * GAME_CONFIG.TARGET_SCORE_INCREASE_PER_DAY) +
        Math.floor(cow.happinessLevel * GAME_CONFIG.TARGET_SCORE_HAPPINESS_FACTOR);
    currentMinigame.gameActive = true;

    document.getElementById('currentScore').textContent = '0';
    document.getElementById('targetScore').textContent = currentMinigame.target;
    document.getElementById('comboCount').textContent = '0';

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

// Enhanced speed calculation using pattern data and effects
function getGameSpeed(gameType) {
    let baseSpeed = 1200; // Default speed
    
    // Use pattern data if available
    if (rhythmPatterns.rhythmTypes && rhythmPatterns.rhythmTypes[gameType]) {
        baseSpeed = rhythmPatterns.rhythmTypes[gameType].baseSpeed;
    } else {
        // Fallback speeds
        const fallbackSpeeds = {
            pitch: 1500, rapid: 800, smooth: 2000, battle: 1000,
            slow: 2500, rock: 1200, cosmic: 1800, pop: 1100, electronic: 900
        };
        baseSpeed = fallbackSpeeds[gameType] || 1200;
    }
    
    // Apply upgrade effects
    if (gameState.effects && gameState.effects.rhythmSpeedBonus) {
        baseSpeed *= (1 + gameState.effects.rhythmSpeedBonus);
    }
    
    return baseSpeed;
}

// Enhanced note spawning with pattern support
function spawnNote() {
    const rhythmBar = document.getElementById('rhythmBar');
    if (!rhythmBar) return;
    
    const note = document.createElement('div');
    note.className = 'rhythm-note';
    note.style.left = '-60px';
    
    // Determine note type based on pattern data
    const cow = gameState.cows[currentMinigame.cowIndex];
    let noteType = 'normal';
    
    if (rhythmPatterns.rhythmTypes && rhythmPatterns.rhythmTypes[cow.gameType]) {
        const patternData = rhythmPatterns.rhythmTypes[cow.gameType];
        if (patternData.noteTypes && patternData.noteTypes.length > 0) {
            noteType = patternData.noteTypes[Math.floor(Math.random() * patternData.noteTypes.length)];
        }
        
        // Check for special notes
        const specialChance = patternData.specialNoteChance || 0.2;
        if (Math.random() < specialChance && patternData.noteTypes.includes('special')) {
            noteType = 'special';
        }
    } else {
        // Fallback to original special note logic
        if (Math.random() < 0.2) {
            noteType = 'special';
        }
    }
    
    // Apply note styling based on type
    if (rhythmPatterns.noteStyles && rhythmPatterns.noteStyles[noteType]) {
        const style = rhythmPatterns.noteStyles[noteType];
        note.style.background = style.color;
        note.style.borderColor = style.border;
        note.setAttribute('data-note-type', noteType);
        note.setAttribute('data-points', style.points);
    } else {
        // Fallback styling
        if (noteType === 'special') {
            note.style.background = '#FF69B4';
            note.classList.add('special-note');
        }
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

// Enhanced hit detection with new tolerance system
function hitNote(note) {
    if (!note) return;
    
    const noteRect = note.getBoundingClientRect();
    const marker = document.querySelector('.rhythm-marker');
    if (!marker) return;
    
    const markerRect = marker.getBoundingClientRect();
    const distance = Math.abs(noteRect.left + noteRect.width/2 - markerRect.left - markerRect.width/2);
    
    // Get base tolerance and apply effects
    let baseTolerance = 1.2;
    if (gameState.effects && gameState.effects.rhythmTolerance) {
        baseTolerance += gameState.effects.rhythmTolerance;
    }
    
    // Get note-specific points
    const noteType = note.getAttribute('data-note-type') || 'normal';
    const basePoints = parseInt(note.getAttribute('data-points')) || 25;
    
    let points = 0;
    let hitQuality = 'miss';
    
    if (distance < 40 * baseTolerance) {
        points = basePoints;
        hitQuality = 'perfect';
        currentMinigame.combo++;
        note.style.background = '#00FF00';
        if (navigator.vibrate) navigator.vibrate(50);
    } else if (distance < 80 * baseTolerance) {
        points = Math.floor(basePoints * 0.7);
        hitQuality = 'good';
        currentMinigame.combo++;
        note.style.background = '#FFFF00';
        if (navigator.vibrate) navigator.vibrate(30);
    } else if (distance < 120 * baseTolerance) {
        points = Math.floor(basePoints * 0.4);
        hitQuality = 'okay';
        currentMinigame.combo = Math.max(0, currentMinigame.combo - 1);
        note.style.background = '#FF8C00';
    } else {
        currentMinigame.combo = 0;
        hitQuality = 'miss';
    }
    
    // Apply combo bonus
    if (currentMinigame.combo > 5) {
        points += Math.floor(currentMinigame.combo / 5) * 5;
    }
    
    // Apply coin bonus effects
    if (gameState.effects && gameState.effects.coinBonus && hitQuality !== 'miss') {
        points += gameState.effects.coinBonus;
    }
    
    currentMinigame.score += points;
    currentMinigame.maxCombo = Math.max(currentMinigame.maxCombo, currentMinigame.combo);
    
    document.getElementById('currentScore').textContent = currentMinigame.score;
    document.getElementById('comboCount').textContent = currentMinigame.combo;
    
    if (points > 0) {
        showFloatingText(`+${points}!`, noteRect.left, noteRect.top);
    }
    
    note.remove();
}

function showFloatingText(text, x, y) {
    const floatingText = document.createElement('div');
    floatingText.textContent = text;
    floatingText.className = 'floating-text';
    floatingText.style.position = 'fixed';
    floatingText.style.left = x + 'px';
    floatingText.style.top = y + 'px';
    
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
    
// --- INSERT MOOD-BUMP HERE -------------------------------
  // Decide how much to adjust moodValue
  const moodDelta = success ? 10 : -10;
  // Clamp between 0 and 100
  cow.moodValue = Math.max(0, Math.min(100, cow.moodValue + moodDelta));

  // Recompute currentMood & happiness flags
  const segmentSize = 100 / cow.moods.length;
  const moodIndex   = Math.min(
    cow.moods.length - 1,
    Math.floor(cow.moodValue / segmentSize)
  );
  cow.currentMood    = cow.moods[moodIndex];
  cow.happinessLevel = cow.moodValue;
  cow.isHappy        = cow.moodValue >= 70;
  // ---------------------------------------------------------

    gameState.dailyStats.totalGames++;
    
    // Track combo achievement
    gameState.stats.maxCombo = Math.max(gameState.stats.maxCombo, currentMinigame.maxCombo);
    
    if (success) {
        // Reward amounts scale with the cow's current mood rather than random ranges
        const moodFactor = cow.moodValue / 100;
        let milkReward = Math.floor(
            GAME_CONFIG.MILK_REWARD_MIN +
            moodFactor * (GAME_CONFIG.MILK_REWARD_MAX - GAME_CONFIG.MILK_REWARD_MIN)
        );
        let coinReward = Math.floor(
            GAME_CONFIG.COIN_REWARD_MIN +
            moodFactor * (GAME_CONFIG.COIN_REWARD_MAX - GAME_CONFIG.COIN_REWARD_MIN)
        );
        
        // Track cow happiness for achievements
        if (!cow.isHappy) {
            gameState.stats.cowsHappy++;
        }
        
        // Apply effect-based upgrade bonuses
        if (gameState.effects.milkMultiplier) {
            milkReward *= gameState.effects.milkMultiplier;
        }
        if (gameState.effects.coinBonus) {
            coinReward += gameState.effects.coinBonus;
        }
        
        // Apply achievement effect bonuses
        if (gameState.effects.achievements) {
            if (gameState.effects.achievements.milkBoost) {
                milkReward = Math.floor(milkReward * gameState.effects.achievements.milkBoost);
            }
            if (gameState.effects.achievements.coinBoost) {
                coinReward = Math.floor(coinReward * gameState.effects.achievements.coinBoost);
            }
        }
        
        // Combo bonus
        if (currentMinigame.maxCombo >= 10) {
            milkReward += 10;
            coinReward += 15;
        }
        
        const isPerfect = currentMinigame.score >= currentMinigame.target * 1.4;
        if (isPerfect) {
            gameState.dailyStats.perfectScores++;
            gameState.stats.totalPerfectScores++;
            gameState.stats.currentPerfectStreak++;
            gameState.stats.perfectStreak = Math.max(gameState.stats.perfectStreak, gameState.stats.currentPerfectStreak);
            
            milkReward += 25;
            coinReward += 35;
            showToast(`🎉 PERFECT! ${cow.name} is ecstatic!\n+${milkReward} milk, +${coinReward} coins!\nMax Combo: ${currentMinigame.maxCombo}`, 'success');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        } else {
            gameState.stats.currentPerfectStreak = 0; // Reset streak
            showToast(`🎉 Success! ${cow.name} is happy!\n+${milkReward} milk, +${coinReward} coins!\nMax Combo: ${currentMinigame.maxCombo}`, 'success');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
        
        gameState.milk += milkReward;
        gameState.coins += coinReward;
        gameState.dailyStats.milkProduced += milkReward;
        gameState.dailyStats.coinsEarned += coinReward;
        gameState.dailyStats.happiest = cow.name;
        gameState.stats.totalMilkProduced += milkReward;
        gameState.stats.totalCoinsEarned += coinReward;
        cow.isHappy = true;
        cow.happinessLevel = Math.min(100, cow.happinessLevel + 20);
        
        // Track fast win achievement (game completed in under target time)
        const gameStartTime = Date.now() - 15000; // Game lasts 15 seconds
        const actualGameTime = Date.now() - gameStartTime;
        if (actualGameTime < gameState.stats.fastestWin) {
            gameState.stats.fastestWin = actualGameTime;
        }
    } else {
        gameState.stats.currentPerfectStreak = 0; // Reset streak on failure
        const coinLoss = Math.floor(Math.random() * 8) + 3;
        gameState.coins = Math.max(0, gameState.coins - coinLoss);
        cow.isHappy = false;
        cow.happinessLevel = Math.max(1, cow.happinessLevel - 10);
        
        showToast(`😤 ${cow.name} is not impressed! -${coinLoss} coins.\nMax Combo: ${currentMinigame.maxCombo}`, 'failure');
        if (navigator.vibrate) navigator.vibrate(300);
    }
    
    updateDisplay();
    updateBulletin();
    renderCows();
    checkAchievements(); // Check for new achievements
    
    // Auto-save after minigame
    if (success || gameState.stats.totalPerfectScores > 0) {
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
            fastestWin: Infinity,
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


// Mobile touch controls for minigame - using DOMContentLoaded to avoid timing issues
document.addEventListener('DOMContentLoaded', function() {
    const tapBtn = document.getElementById('tapBtn');
    
    if (tapBtn) {
        tapBtn.addEventListener('touchstart', (e) => {
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
}, GAME_CONFIG.CROP_UPDATE_INTERVAL);
