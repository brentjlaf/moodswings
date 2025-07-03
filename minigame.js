let currentMinigame = {
    cowIndex: -1,
    score: 0,
    target: 100,
    noteInterval: null,
    countdownInterval: null,
    timeLeft: 15,
    gameActive: false,
    combo: 0,
    maxCombo: 0
};

// Default colors for hit feedback. These may be overridden by rhythmPatterns.hitColors
const DEFAULT_HIT_COLORS = {
    perfect: '#00FF00',
    good: '#FFFF00',
    okay: '#FF8C00',
    miss: '#FF0000'
};

// Colors for hit feedback.
const HIT_COLORS = {
    perfect: '#00FF00',
    good: '#FFFF00',
    okay: '#FF8C00',
    miss: '#FF0000'
};

function getHitColor(type) {
    if (rhythmPatterns.hitColors && rhythmPatterns.hitColors[type]) {
        return rhythmPatterns.hitColors[type];
    }
    return DEFAULT_HIT_COLORS[type];
}


function getRandomGameType() {
    const types = rhythmPatterns.rhythmTypes ? Object.keys(rhythmPatterns.rhythmTypes) : [];
    if (types.length === 0) return 'smooth';
    return types[Math.floor(Math.random() * types.length)];
}

function startRhythmGame(cowIndex) {
    currentMinigame.cowIndex = cowIndex;
    currentMinigame.score = 0;
    currentMinigame.combo = 0;
    currentMinigame.maxCombo = 0;

    const cow = gameState.cows[cowIndex];
    const mood = cow.moodValue || cow.happinessLevel;
    currentMinigame.target = Math.max(20, Math.round(mood * 2));

    currentMinigame.gameActive = true;
    currentMinigame.timeLeft = 15;

    document.getElementById('currentScore').textContent = '0';
    document.getElementById('targetScore').textContent = currentMinigame.target;
    const countdownEl = document.getElementById('countdownClock');
    if (countdownEl) countdownEl.textContent = currentMinigame.timeLeft;

    const speed = getGameSpeed(cow.currentGameType || cow.gameType);

    clearNotes();

    clearInterval(currentMinigame.countdownInterval);
    currentMinigame.countdownInterval = setInterval(() => {
        currentMinigame.timeLeft--;
        if (countdownEl) countdownEl.textContent = Math.max(0, currentMinigame.timeLeft);
        if (currentMinigame.timeLeft <= 0) {
            clearInterval(currentMinigame.countdownInterval);
        }
    }, 1000);

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

    // Randomize note size and speed
    const size = Math.floor(Math.random() * 30) + 30; // 30-60px
    const duration = 2000 + Math.random() * 2000; // 2-4 seconds
    note.style.width = size + 'px';
    note.style.height = size + 'px';
    note.style.top = (80 - size) / 2 + 'px';
    note.style.animation = `moveNote ${duration}ms linear`;
    
    // Determine note type based on pattern data
    const cow = gameState.cows[currentMinigame.cowIndex];
    let noteType = 'normal';
    
    const type = cow.currentGameType || cow.gameType;
    if (rhythmPatterns.rhythmTypes && rhythmPatterns.rhythmTypes[type]) {
        const patternData = rhythmPatterns.rhythmTypes[type];
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
            // Visual feedback for missing a note
            note.style.background = getHitColor('miss');
            note.style.background = HIT_COLORS.miss;
            setTimeout(() => {
                if (note.parentNode) note.parentNode.removeChild(note);
            }, 200);
            // Miss penalty
            currentMinigame.combo = 0;
        }
    }, duration);
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

    const maxDistance = 120 * baseTolerance;
    const accuracyRatio = Math.max(0, 1 - distance / maxDistance);
    points = Math.round(basePoints * accuracyRatio);

    if (distance < 40 * baseTolerance) {
        hitQuality = 'perfect';
        currentMinigame.combo++;
        note.style.background = getHitColor('perfect');
        note.style.background = HIT_COLORS.perfect;
        if (navigator.vibrate) navigator.vibrate(50);
    } else if (distance < 80 * baseTolerance) {
        hitQuality = 'good';
        currentMinigame.combo++;
        note.style.background = getHitColor('good');
        note.style.background = HIT_COLORS.good;
        if (navigator.vibrate) navigator.vibrate(30);
    } else if (distance < 120 * baseTolerance) {
        hitQuality = 'okay';
        currentMinigame.combo = Math.max(0, currentMinigame.combo - 1);
        note.style.background = getHitColor('okay');
    } else {
        currentMinigame.combo = 0;
        hitQuality = 'miss';
        note.style.background = getHitColor('miss');
        note.style.background = HIT_COLORS.miss;
        points = 0;
    }
    
    // Apply combo bonus
    if (currentMinigame.combo > 5) {
        points += Math.floor(currentMinigame.combo / 5) * 5;
    }
    
    // Apply coin bonus effects
    if (gameState.effects && hitQuality !== 'miss') {
        if (gameState.effects.coinBonus) {
            points += gameState.effects.coinBonus;
        }
        if (gameState.effects.coinBonusPercent) {
            points = Math.floor(points * (1 + gameState.effects.coinBonusPercent));
        }
    }
    
    currentMinigame.score += points;
    currentMinigame.maxCombo = Math.max(currentMinigame.maxCombo, currentMinigame.combo);

    // Ensure displayed score never shows decimals
    const displayScore = Math.floor(currentMinigame.score);
    document.getElementById('currentScore').textContent = displayScore;

    if (points > 0) {
        showFloatingText(`+${points}!`, noteRect.left, noteRect.top);
    }

    if (currentMinigame.combo >= 3 && hitQuality !== 'miss') {
        showComboPopup(currentMinigame.combo);
    }

    if (currentMinigame.score >= currentMinigame.target && currentMinigame.gameActive) {
        // Remove the note first for visual feedback before ending the game
        note.remove();
        endMinigame();
        return;
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

function showComboPopup(combo) {
    const popup = document.createElement('div');
    popup.textContent = `Combo x${combo}!`;
    popup.className = 'floating-text';
    popup.style.left = '50%';
    popup.style.top = '80px';
    popup.style.transform = 'translateX(-50%)';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1000);
}

function endMinigame() {
    currentMinigame.gameActive = false;
    clearInterval(currentMinigame.noteInterval);
    clearInterval(currentMinigame.countdownInterval);
    clearNotes();

    // Reveal the close button now that the game has ended
    const closeBtn = document.querySelector('.close-minigame');
    if (closeBtn) closeBtn.style.display = 'block';
    
    // FIX: Safety check
    if (currentMinigame.cowIndex >= gameState.cows.length) return;
    
    const cow = gameState.cows[currentMinigame.cowIndex];
    const success = currentMinigame.score >= currentMinigame.target;
    let resultMessage = '';
    
// --- INSERT MOOD-BUMP HERE -------------------------------
  // Adjust mood based on how well or poorly the minigame went
  const resultDelta = currentMinigame.score - currentMinigame.target;
  // Translate score difference into a mood change, capped to keep swings reasonable
  let moodDelta = Math.round(resultDelta / 5);
  moodDelta = Math.max(-20, Math.min(20, moodDelta));
  cow.moodValue = Math.max(0, Math.min(100, cow.moodValue + moodDelta));

  // Recompute currentMood & happiness flags
  const segmentSize = 100 / cow.moods.length;
  const reversedIndex = cow.moods.length - 1 -
    Math.floor(cow.moodValue / segmentSize);
  const moodIndex = Math.max(
    0,
    Math.min(cow.moods.length - 1, reversedIndex)
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
        if (gameState.effects.milkYieldBonus) {
            milkReward = Math.floor(milkReward * (1 + gameState.effects.milkYieldBonus / 100));
        }
        if (gameState.effects.coinBonus) {
            coinReward += gameState.effects.coinBonus;
        }
        if (gameState.effects.coinBonusPercent) {
            coinReward = Math.floor(coinReward * (1 + gameState.effects.coinBonusPercent));
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

            milkReward += 20;
            coinReward += 25;
            resultMessage = `🎉 PERFECT! ${cow.name} is ecstatic!<br>+${milkReward} milk, +${coinReward} coins!<br>Max Combo: ${currentMinigame.maxCombo}`;
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        } else {
            gameState.stats.currentPerfectStreak = 0; // Reset streak
            resultMessage = `🎉 Success! ${cow.name} is happy!<br>+${milkReward} milk, +${coinReward} coins!<br>Max Combo: ${currentMinigame.maxCombo}`;
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }

        // Ensure coin reward is a whole number
        coinReward = Math.round(coinReward);

        gameState.milk = Math.max(0, gameState.milk + milkReward);
        gameState.coins = Math.max(0, gameState.coins + coinReward);
        gameState.dailyStats.milkProduced += milkReward;
        gameState.dailyStats.coinsEarned += coinReward;
        gameState.dailyStats.happiest = cow.name;
        gameState.stats.totalMilkProduced += milkReward;
        gameState.stats.totalCoinsEarned += coinReward;
        cow.isHappy = true;
        cow.happinessLevel = Math.min(100, cow.happinessLevel + 20);

    } else {
        gameState.stats.currentPerfectStreak = 0; // Reset streak on failure
        const coinLoss = Math.floor(Math.random() * 8) + 3;
        gameState.coins = Math.max(0, gameState.coins - coinLoss);
        cow.isHappy = false;
        cow.happinessLevel = Math.max(1, cow.happinessLevel - 10);

        resultMessage = `😤 ${cow.name} is not impressed!<br>-${coinLoss} coins.<br>Max Combo: ${currentMinigame.maxCombo}`;
        if (navigator.vibrate) navigator.vibrate(300);
    }

    // Synchronize mood stats and reset happiness timer
    if (typeof refreshCowMood === 'function') {
        refreshCowMood(cow);
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

    showMinigameResult(resultMessage);
}

function clearNotes() {
    const notes = document.querySelectorAll('.rhythm-note');
    notes.forEach(note => note.remove());
}

function showMinigameResult(message) {
    const popup = document.getElementById('minigameResultPopup');
    if (!popup) return;

    popup.innerHTML = `
        <div class="result-text">${message}</div>
        <button class="close-minigame" onclick="closeMinigame()">&#x274C; CLOSE</button>
    `;
    popup.style.display = 'block';
}

function closeResultPopup() {
    const popup = document.getElementById('minigameResultPopup');
    if (popup) popup.style.display = 'none';
}

function closeMinigame() {
    if (currentMinigame.gameActive) {
        endMinigame();
    }
    const overlay = document.getElementById('minigameOverlay');
    if (overlay) overlay.style.display = 'none';
    closeResultPopup();

    // Ensure any mood changes are reflected once the overlay closes
    updateDisplay();
    updateBulletin();
    renderCows();
}

// Mobile-optimized minigame functions
function startMinigame(cowIndex) {
    if (cowIndex >= gameState.cows.length) return; // FIX: Safety check

    const cow = gameState.cows[cowIndex];
    cow.currentGameType = getRandomGameType();
    const overlay = document.getElementById('minigameOverlay');
    const title = document.getElementById('minigameTitle');
    const instructions = document.getElementById('minigameInstructions');
    
    if (!overlay || !title || !instructions) return;

    title.innerHTML = `${cow.emoji} ${cow.name}'s ${cow.currentGameType.toUpperCase()} Challenge!`;
    instructions.textContent = getGameInstructions(cow.currentGameType);


    // Hide the close button until the game is finished
    const closeBtn = document.querySelector('.close-minigame');
    if (closeBtn) closeBtn.style.display = 'none';

    overlay.style.display = 'block';
    startRhythmGame(cowIndex);
    
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
}

// Ensure the minigame function is available globally for inline event handlers
window.startMinigame = startMinigame;
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
