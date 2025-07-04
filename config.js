// Game Configuration
// Modify these values to adjust game balance and behavior

const GAME_CONFIG = {
    // Starting values
    STARTING_COINS: 100,
    STARTING_MILK: 0,
    STARTING_DAY: 1,

    // Season settings
    SEASON_LENGTH: 10,
    // These arrays will be overridden by environment.json
    SEASONS: [
        { name: 'Spring', emoji: '🌱', cropGrowthMultiplier: 1.1, happinessMultiplier: 1 },
        { name: 'Summer', emoji: '☀️', cropGrowthMultiplier: 1.0, happinessMultiplier: 1.1 },
        { name: 'Autumn', emoji: '🍂', cropGrowthMultiplier: 0.9, happinessMultiplier: 1 },
        { name: 'Winter', emoji: '❄️', cropGrowthMultiplier: 0.8, happinessMultiplier: 0.9 }
    ],

    // Daily weather settings
    WEATHER_TYPES: [ // overridden by environment.json
        { name: 'Clear', emoji: '☀️', cropGrowthModifier: 1, tempOffset: 0 },
        { name: 'Rain Storm', emoji: '🌧️', cropGrowthModifier: 0.8, tempOffset: -4 },
        { name: 'Drought', emoji: '🔥', cropGrowthModifier: 1.3, tempOffset: 5 }
    ],
    WEATHER_CHANGE_CHANCE: 0.3,

    // Minigame settings
    MINIGAME_DURATION: 15000, // 15 seconds
    BASE_TARGET_SCORE: 80,
    TARGET_SCORE_INCREASE_PER_DAY: 15,
    PERFECT_SCORE_MULTIPLIER: 1.5,

    // Reward ranges
    MILK_REWARD_MIN: 10,
    MILK_REWARD_MAX: 30,
    COIN_REWARD_MIN: 15,
    COIN_REWARD_MAX: 35,
    PERFECT_BONUS_MILK: 20,
    PERFECT_BONUS_COINS: 25,

    // Penalty settings
    FAILURE_COIN_LOSS_MIN: 3,
    FAILURE_COIN_LOSS_MAX: 10,

    // Crop settings
    CROP_SLOTS: 12,
    CROP_UPDATE_INTERVAL: 1000, // 1 second

    // Pest system settings
    PESTS: {
        check_interval: 10000, // how often to attempt spawning pests
        spawn_chance: 0.1,    // chance per planted crop each check
        duration: 10000,      // time allowed to clear pests
        // Reduced penalty so pests are less destructive
        yield_penalty: 0.25   // 25% yield reduction if not cleared
    },

    // Upgrade settings
    // Defaults overridden by upgrades.json
    UPGRADES: {
        pitchfork: {
            tolerance_bonus_per_level: 0.3,
            coin_bonus_per_level: 10
        },
        metronome: {
            speed_bonus_per_level: 0.3
        },
        barn: {
            milk_multiplier_per_level: 1
        },
        cowbell: {
            happiness_threshold: 0.2, // Higher chance of starting happy
            happiness_bonus: 40 // Starting happiness level minimum
        }
    },

    // Timing tolerances for rhythm game
    RHYTHM_TOLERANCES: { // overridden by upgrades.json
        perfect: 30, // pixels
        good: 80,
        okay: 120
    },

    // Point values for rhythm hits
    RHYTHM_POINTS: {
        perfect: 25,
        good: 12,
        okay: 8,
        special_note_multiplier: 2
    },

    // Combo system
    COMBO: {
        bonus_threshold: 5, // Combo hits needed for bonus
        bonus_points_per_threshold: 3
    },

    // Auto-save settings
    AUTO_SAVE_INTERVAL: 120000, // 2 minutes

    // Achievement thresholds
    ACHIEVEMENTS: {
        milk_master: 500,
        coin_collector: 2000,
        veteran_farmer_days: 10,
        happiness_guru_min_cows: 6
    },

    // Special note spawn chance
    SPECIAL_NOTE_CHANCE: 0.2, // 20% chance

    // Happiness system
    HAPPINESS: {
        default_chance: 0.25, // 25% chance to start happy
        level_min: 1,
        level_max: 100,
        success_bonus: 20,
        failure_penalty: 10,
        // Mood decreases by about 3% of the current value every hour
        decay_rate_percent: 0.03
    },

    HAPPINESS_UPDATE_INTERVAL: 3600000, // 1 hour

    // UI settings
    TOAST_DURATION: 3000, // 3 seconds
    ACHIEVEMENT_POPUP_DURATION: 4000, // 4 seconds
    
    // Vibration patterns (if supported)
    VIBRATION: {
        tap: 50,
        success: [100, 50, 100],
        perfect: [200, 100, 200, 100, 200],
        failure: 300,
        achievement: [500, 200, 500, 200, 500],
        plant: 50,
        harvest: [200, 100, 200],
        harvest_all: [100, 50, 100, 50, 100],
        day_advance: [300, 100, 300],
        upgrade: [200, 100, 200]
    },

    // Debug settings
    DEBUG: {
        enabled: true,
        log_saves: true,
        log_unlocks: true,
        log_achievements: true
    }
};

// Data loaded from external JSON files
let FARM_TIPS = [];
let FALLBACK_SPEEDS = {};
let DEFAULT_INSTRUCTIONS = {};

async function loadConfigData() {
    try {
        const [envRes, upRes, tipsRes, rhythmRes] = await Promise.all([
            fetch('environment.json'),
            fetch('upgrades.json'),
            fetch('farm-tips.json'),
            fetch('rhythm-defaults.json')
        ]);

        const envData = await envRes.json();
        const upgradeData = await upRes.json();
        const tipsData = await tipsRes.json();
        const rhythmData = await rhythmRes.json();

        if (envData.seasons) GAME_CONFIG.SEASONS = envData.seasons;
        if (envData.weatherTypes) GAME_CONFIG.WEATHER_TYPES = envData.weatherTypes;

        if (upgradeData.upgrades) GAME_CONFIG.UPGRADES = upgradeData.upgrades;
        if (upgradeData.rhythmTolerances) GAME_CONFIG.RHYTHM_TOLERANCES = upgradeData.rhythmTolerances;

        FARM_TIPS = tipsData.tips || [];
        FALLBACK_SPEEDS = rhythmData.fallbackSpeeds || {};
        DEFAULT_INSTRUCTIONS = rhythmData.instructions || {};

        return true;
    } catch (err) {
        console.error('Failed to load config files:', err);
        // Use existing defaults already defined above
        FARM_TIPS = [
            "Plant rainbow crops for maximum profit!",
            "Keep all your cows happy for bonus rewards!",
            "Upgrades make rhythm games easier to win!",
            "Perfect scores unlock secret cows!",
            "Harvest crops regularly to keep earning!",
            "Each cow has their own rhythm style!",
            "The neon pink barn doubles milk production!",
            "Golden cowbell makes cows start happier each day!",
            "Build combos in rhythm games for bonus points!",
            "Secret cows have special unlock conditions!",
            "Auto-save keeps your progress safe!",
            "Watch the unlock progress in the stats tab!",
            "Try different rhythm strategies for each cow!",
            "Timing gets easier with pitchfork upgrades!"
        ];
        FALLBACK_SPEEDS = {
            pitch: 1500, rapid: 800, smooth: 2000, battle: 1000,
            slow: 2500, rock: 1200, cosmic: 1800, pop: 1100, electronic: 900
        };
        DEFAULT_INSTRUCTIONS = {
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
        return false;
    }
}

// Export config for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GAME_CONFIG,
        FARM_TIPS,
        FALLBACK_SPEEDS,
        DEFAULT_INSTRUCTIONS,
        loadConfigData
    };
}
