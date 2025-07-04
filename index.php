<?php $serverTime=time(); ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<title>Moo-d Swings: Farmyard Follies</title>
<link rel="stylesheet" href="styles.css?v=moo1.01">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-1RGGXKCNB6"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-1RGGXKCNB6');
  </script>
<?php
$env = json_decode(file_get_contents(__DIR__ . "/environment.json"), true);
$month = date("n");
$seasonIndex = intval(floor(($month % 12) / 3));
$weatherIndex = rand(0, count($env["weatherTypes"]) - 1);
?>
<script>
window.SERVER_TIME = <?php echo $serverTime * 1000; ?>;
window.SERVER_SEASON = <?php echo $seasonIndex; ?>;
window.SERVER_WEATHER = <?php echo $weatherIndex; ?>;
</script>
</head>
<body>
<div class="mobile-container"> 
  <header class="page-header">
    <span class="logo">&#x1F404; MOO-D SWINGS</span>
    <div class="header-buttons">
      <button id="menuButton" class="menu-button">&#9776;</button>
    </div>
  </header>
  <!-- Game Header -->
  <div class="game-header">
    <div class="header-content">

      <div class="primary-stats">
        <div class="primary-stat coins-stat">
          <span class="stat-icon">&#x1F4B0;</span>
          <span class="stat-value" id="coins">100</span>
          <div class="stat-label">Coins</div>
        </div>
        <div class="primary-stat">
          <span class="stat-icon">&#x1F95B;</span>
          <span class="stat-value" id="milk">0</span>
          <div class="stat-label">Milk</div>
        </div>
        <div class="primary-stat mood-stat">
          <span class="stat-icon">&#x1F60A;</span>
          <span class="stat-value" id="happiness"></span>
          <div class="stat-label">Mood</div>
        </div>
        <div class="primary-stat">
          <span class="stat-icon">⭐</span>
          <span class="stat-value" id="xp">0</span>
          <div class="stat-label">XP</div>
        </div>
        <div class="primary-stat">
          <span class="stat-icon">&#x1F4C5;</span>
          <span class="stat-value" id="day">1</span>
          <div class="stat-label">Day</div>
        </div>
      </div>

      <div class="secondary-stats">
        <div class="secondary-stat">
          <span class="stat-icon">&#x1F331;</span>
          <span class="stat-value" id="seasonDisplay"></span>
          <div class="stat-label">Season</div>
        </div>
        <div class="secondary-stat">
          <span class="stat-icon">⛅</span>
          <span class="stat-value" id="weatherDisplay"></span>
          <div class="stat-label">Weather / Temp</div>
        </div>
        <div class="secondary-stat">
          <span class="stat-icon">&#x1F552;</span>
          <span class="stat-value" id="timeDisplay"></span>
          <div class="stat-label">Time</div>
        </div>
      </div>

      <div id="effectTimers" class="effect-timers"></div>
    </div>
  </div>
  
  <!-- Tab Navigation -->
  <div class="main-content">
    <div class="section-tabs">
      <button class="tab-btn active" onclick="switchTab('cows', event)">&#x1F42E; COWS</button>
      <button class="tab-btn" onclick="switchTab('farm', event)">&#x1F331; CROPS</button>
      <button class="tab-btn" onclick="switchTab('shop', event)">&#x1F6D2; SHOP</button>
      <button class="tab-btn" onclick="switchTab('stats', event)">&#x1F69C; FARM</button>
    </div>
    <div class="tab-content-wrapper"> 
      <!-- Cows Tab -->
      <div id="cowsTab" class="tab-content active">
        <div class="cows-grid grid-container" id="cowsGrid">
          <!-- Cows will be generated here -->
        </div>
      </div>
      
      <!-- Farm Tab -->
      <div id="farmTab" class="tab-content">
        <div class="crops-section">
          <h3 class="section-title section-title-brown">&#x1F33E; CROP FIELDS &#x1F33E;</h3>
          <div class="crops-grid grid-container" id="cropsGrid">
            <!-- Crops will be generated here --> 
          </div>
          <div class="plant-controls">
            <!-- Crop buttons will be generated dynamically -->
          </div>
        </div>
        <div class="action-buttons">
          <button class="action-btn harvest" onclick="harvestAll()"><i class="fa-solid fa-seedling btn-icon"></i>Harvest All</button>
        </div>
        <canvas id="farmMap"></canvas>
      </div>
      
      <!-- Shop Tab -->
      <div id="shopTab" class="tab-content">
        <div id="shopCategories" class="shop-categories">
          <!-- Shop items will be generated dynamically -->
        </div>
      </div>
      
      <!-- Stats Tab -->
      <div id="statsTab" class="tab-content">
        <div id="bulletinBoard" class="bulletin-board">
          <!-- Daily stats will be shown here -->
        </div>
        <div class="stats-chart-container">
          <canvas id="statsChart"></canvas>
        </div>
        <div class="achievements-container">
          <h3 class="section-title section-title-blue">&#x1F3C6; ACHIEVEMENTS &#x1F3C6;</h3>
          <div id="achievementsList"> 
            <!-- Achievements will be displayed here --> 
          </div>
        </div>
      </div>
    </div>
    <div class="next-day-bar">
      <button class="action-btn" onclick="nextDay()"><i class="fa-solid fa-sun btn-icon"></i>Next Day</button>
    </div>
  </div>
</div>

<!-- Slide-out Menu -->
<div id="sideMenu" class="side-menu">
  <button id="closeMenu" class="close-menu">&times;</button>

  <div class="menu-section leaderboard-container">
    <a href="leaderboard.php" class="about-link action-btn">View Leaderboard</a>
  </div>
  <div class="menu-section about-container">
    <a href="about.php" class="about-link action-btn">About &amp; FAQ</a>
  </div>
  <div class="menu-section save-system-container">
    <h3 class="section-title section-title-green">&#x1F4BE; SAVE SYSTEM &#x1F4BE;</h3>
    <div class="save-info-text">
      Player ID: <span id="playerID" class="save-info-label"></span><br>
      Username: <span id="playerNameLabel" class="save-info-label"></span><br>
      Last Saved: <span id="lastSaved" class="save-info-label">Never</span>
    </div>
    <div class="save-button-grid">
      <button onclick="saveGameState(); showToast('Game saved!', 'success'); updateSaveInfo();" class="action-btn save-button-save">&#x1F4BE; Save</button>
      <button onclick="resetGameData()" class="action-btn save-button-reset">&#x1F5D1;&#xFE0F; Reset</button>
    </div>
    <div class="save-help-text">Auto-saves every 2 minutes and when you leave.</div>
  </div>

  <div class="menu-section debug-container">
    <h3 class="section-title section-title-purple">&#x1F527; DEBUG TOOLS &#x1F527;</h3>
    <button onclick="debugUnlockSystem()" class="action-btn debug-button-pink">&#x1F50D; Check Unlock Status</button>
    <button onclick="forceUnlockCheck()" class="action-btn debug-button-green">&#x1F513; Force Unlock Check</button>
  </div>



</div>

<!-- Mobile Minigame Overlay -->
<div class="minigame-overlay" id="minigameOverlay">
  <div class="minigame-container">
    <div class="minigame-header">
      <div class="header-text">
        <h2 class="minigame-title" id="minigameTitle">Cow Challenge</h2>
        <p class="minigame-instructions" id="minigameInstructions">Get ready to play!</p>
      </div>
      <div class="countdown-wrapper">
        <svg class="countdown-ring" width="70" height="70">
          <circle class="ring-bg" cx="35" cy="35" r="32"></circle>
          <circle class="ring-progress" id="countdownRing" cx="35" cy="35" r="32"></circle>
        </svg>
        <div class="countdown-clock" id="countdownClock">15s</div>
      </div>
    </div>
      <div class="rhythm-game">
        <div class="score-area container">
          <div class="score-bar">
            <div class="score-fill" id="scoreFill"></div>
            <div class="score-numbers"><span id="currentScore">0</span>/<span id="targetScore">100</span></div>
          </div>
        </div>
        <div class="rhythm-bar" id="rhythmBar">
          <div class="rhythm-marker"></div>
        </div>
      <div class="mobile-controls">
        <button class="control-btn" id="tapBtn">&#x1F446;<br>TAP</button>
      </div>
      </div>
  </div>
</div>

<!-- Username Overlay -->
<div class="username-overlay" id="usernameOverlay">
  <div class="username-container">
    <h2 class="username-title">Enter Your Name</h2>
    <input type="text" id="usernameInput" class="username-input" placeholder="Your name">
    <button class="username-submit" onclick="updateUsername()">Start Game</button>
  </div>
</div>

<!-- Reset Confirmation Overlay -->
<div class="reset-overlay" id="resetOverlay">
  <div class="reset-container">
    <h2 class="reset-title">Reset Game?</h2>
    <p class="reset-text">All progress will be lost.</p>
    <div class="reset-buttons">
      <button class="reset-confirm" onclick="confirmResetGameData()">Reset</button>
      <button class="reset-cancel" onclick="hideResetOverlay()">Cancel</button>
    </div>
  </div>
</div>

<!-- Mobile Toast Messages -->
<div class="toast-message" id="toastMessage"></div>
<div class="achievement-popup" id="achievementPopup"></div>
<div class="result-popup" id="minigameResultPopup"></div>
<div class="meteor-overlay" id="meteorShowerOverlay"></div>
<div class="rain-overlay" id="rainOverlay"></div>
<div class="firefly-overlay" id="fireflyOverlay"></div>
<audio id="meteorSound" src="sounds/meteor.mp3" preload="auto"></audio>

<!-- Scroll to Top Button -->
<button id="scrollTopBtn">&#x25B2;</button>

<script src="config.js?v=moo1.01"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="saveLoad.js?v=moo1.01"></script>
<script src="scripts.js?v=moo1.01"></script>
<script src="minigame.js?v=moo1.01"></script>
<script src="debug.js?v=moo1.01"></script>
</body>
</html>
