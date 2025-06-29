// Game Configuration
// Modify these values to adjust game balance and behavior

const GAME_CONFIG = {
    // Starting values
    STARTING_COINS: 100,
    STARTING_MILK: 0,
    STARTING_DAY: 1,

    // Minigame settings
    MINIGAME_DURATION: 15000, // 15 seconds
    BASE_TARGET_SCORE: 80,
    TARGET_SCORE_INCREASE_PER_DAY: 15,
    PERFECT_SCORE_MULTIPLIER: 1.4,

    // Reward ranges
    MILK_REWARD_MIN: 15,
    MILK_REWARD_MAX: 35,
    COIN_REWARD_MIN: 25,
    COIN_REWARD_MAX: 50,
    PERFECT_BONUS_MILK: 25,
    PERFECT_BONUS_COINS: 35,

    // Penalty settings
    FAILURE_COIN_LOSS_MIN: 3,
    FAILURE_COIN_LOSS_MAX: 10,

    // Crop settings
    CROP_SLOTS: 12,
    CROP_UPDATE_INTERVAL: 1000, // 1 second

    // Upgrade settings
    UPGRADES: {
        pitchfork: {
            tolerance_bonus_per_level: 0.6,
            coin_bonus_per_level: 15
        },
        metronome: {
            speed_bonus_per_level: 0.3
        },
        barn: {
            milk_multiplier_per_level: 1
        },
        cowbell: {
            happiness_threshold: 0.2, // Higher chance of starting happy
            happiness_bonus: 51 // Starting happiness level minimum
        }
    },

    // Timing tolerances for rhythm game
    RHYTHM_TOLERANCES: {
        perfect: 40, // pixels
        good: 80,
        okay: 120
    },

    // Point values for rhythm hits
    RHYTHM_POINTS: {
        perfect: 25,
        good: 15,
        okay: 8,
        special_note_multiplier: 2
    },

    // Combo system
    COMBO: {
        bonus_threshold: 5, // Combo hits needed for bonus
        bonus_points_per_threshold: 5
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
        default_chance: 0.3, // 30% chance to start happy
        level_min: 1,
        level_max: 100,
        success_bonus: 20,
        failure_penalty: 10,
        decay_rate_min: 5, // Mood loss per hour (min)
        decay_rate_max: 7  // Mood loss per hour (max)
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

// Speeds and instructions were previously defined here but now come from
// rhythm-patterns.json, so these constants have been removed.

// Farm tips that appear in the bulletin
const FARM_TIPS = [
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

// Export config for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GAME_CONFIG, FARM_TIPS };
}
