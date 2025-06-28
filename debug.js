// Export functions for debugging (browser console access)
window.debugGame = {
    gameState,
    checkAchievements,
    forceUnlockCheck: () => {
        const beforeCount = gameState.cows.length;
        checkAllCowUnlocks();
        const afterCount = gameState.cows.length;
        const unlocked = afterCount - beforeCount;
        
        if (unlocked > 0) {
            showToast(`🎉 Unlocked ${unlocked} cow(s)!`, 'success');
        } else {
            showToast(`No cows ready to unlock yet.`, 'info');
        }
    },
    debugUnlockSystem: () => {
        let debugInfo = `🔍 UNLOCK DEBUG INFO:\n\n`;
        debugInfo += `📊 Current Stats:\n`;
        debugInfo += `• Day: ${gameState.day}\n`;
        debugInfo += `• Total Milk: ${gameState.stats.totalMilkProduced}\n`;
        debugInfo += `• Total Coins: ${gameState.stats.totalCoinsEarned}\n`;
        debugInfo += `• Total Perfect Scores: ${gameState.stats.totalPerfectScores}\n\n`;
        
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
};

function getCurrentStatValue(condition) {
    switch(condition) {
        case 'day': return gameState.day;
        case 'totalMilk': return gameState.stats.totalMilkProduced;
        case 'totalCoins': return gameState.stats.totalCoinsEarned;
        case 'perfectScores': return gameState.stats.totalPerfectScores;
        default: return 0;
    }
}

// Debug functions to help troubleshoot unlock system
function debugUnlockSystem() {
    window.debugGame.debugUnlockSystem();
}

function forceUnlockCheck() {
    window.debugGame.forceUnlockCheck();
}

