import './data.js';
import './ui.js';
import './achievements.js';

window.loadGameData().then(() => {
    window.initializeGame();
    window.startPestChecks();
});
