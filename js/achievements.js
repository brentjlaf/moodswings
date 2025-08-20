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

Object.assign(window, {
    checkAchievementCondition,
    checkAchievements,
    awardAchievement,
    claimAchievementReward,
    applyAchievementEffect,
    showAchievementUnlock,
    getAchievementProgress,
    updateAchievements,
    clearNewAchievementFlags,
});
