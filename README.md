# ?? Moo-d Swings: Farmyard Follies

A mobile-optimized rhythm game where you manage a farm of musical cows, each with their own unique personality and rhythm game style!

**?? NEW: Phase 1 Data-Driven Systems Implemented!**

## ?? File Structure

```
moo-d-swings/
+-- index.html              # Main HTML structure  
+-- styles.css              # All CSS styling and animations
+-- scripts.js              # Game logic and functionality
+-- config.js               # Game configuration
+-- cows.json               # Cow data and unlock conditions
+-- crops.json              # ? NEW: Easy crop management
+-- shop.json               # ? NEW: Easy shop expansion
+-- rhythm-patterns.json    # ? NEW: Custom rhythm games
+-- README.md               # This file
```

## ?? Quick Start

1. **Download all files** to the same directory
2. **Open `index.html`** in a web browser
3. **Start playing!** The game works best on mobile devices but also runs on desktop

## 💻 Development Setup

Running a local server avoids browser restrictions when loading the JSON data used by the game.

1. Clone this repository or download the project files.
2. Start a simple static server in the project directory:

```bash
python3 -m http.server
```

3. Visit `http://localhost:8000` and start playing.
4. Modify `cows.json`, `crops.json` and other files, then refresh to see changes.

## ? **NEW: Easy Content Addition**

### **Add New Crops** (No coding required!)
Edit `crops.json` and add:
```json
{
    "id": "magical_berry",
    "name": "Magical Berry",
    "emoji": "??",
    "cost": 60,
    "value": 120,
    "growTime": 55000,
    "rarity": "rare",
    "unlockCondition": {"type": "day", "target": 4},
    "description": "Enchanted and profitable!"
}
```

### **Add New Shop Items** (Just edit JSON!)
Edit `shop.json` and add:
```json
{
    "id": "rainbow_fence",
    "name": "Rainbow Fence", 
    "description": "Increases farm happiness!",
    "icon": "??",
    "category": "decorations",
    "cost": 300,
    "effects": {"happiness_boost": true},
    "unlockCondition": {"type": "totalCoins", "target": 800}
}
```

### **Crop Rarity System**
- **Common** (Green): Basic crops
- **Uncommon** (Blue): Better rewards
- **Rare** (Purple): Great rewards, unlock requirements
- **Epic** (Gold): Glowing effects, excellent rewards  
- **Legendary** (Pink): Animated glow, amazing rewards

## ?? How to Play

### Basic Gameplay
- **Tap cow cards** to start rhythm minigames
- **Hit notes** when they cross the center marker
- **Keep cows happy** to earn milk and coins
- **Plant crops** to generate additional income
- **Buy upgrades** to make rhythm games easier
- **Spend milk or coins** on special items in the shop

### Game Tabs
- **?? COWS**: Interact with your cows and play rhythm games
- **?? FARM**: Plant and harvest crops for income
- **?? SHOP**: Buy upgrades organized by category
  - ?? **Farm Tools**: Rhythm improvements
  - ?? **Buildings**: Production bonuses
  - ?? **Decorations**: Happiness boosts
  - ?? **Consumables**: Temporary effects
- **?? STATS**: View achievements, save/load game, and debug tools

### Unlocking New Content
- **Regular Cows**: Unlock by reaching certain days, earning coins/milk
- **Secret Cows**: Unlock with perfect scores and special achievements
- **Crops**: Unlock based on progress (days, coins, milk, perfect scores)
- **Shop Items**: Progressive unlocks based on achievements

## ?? Technical Features

### Data-Driven Systems ? NEW
- **Easy crop addition** via JSON editing
- **Flexible shop system** with categories and effects
- **Pattern-based rhythm games** with multiple note types
- **Automatic unlock systems** for progressive content

### Mobile Optimization
- **Touch-friendly interface** with large buttons
- **Haptic feedback** support (if device supports it)
- **Responsive design** that works on various screen sizes
- **Optimized scrolling** and touch interactions

### Save System
- **Auto-save** every 2 minutes and when leaving the page
- **Export/Import** game data as JSON files
- **Device fingerprinting** for unique player identification
- **Persistent progress** across sessions

### Performance
- **Memory leak prevention** with proper timer cleanup
- **Efficient rendering** with minimal DOM manipulation
- **Smooth animations** using CSS transforms
- **Optimized asset loading** with version caching

## ?? Rhythm Game Types

Each cow has a unique rhythm style:
- **Smooth**: Gentle, relaxed timing
- **Rock**: High-energy, fast-paced
- **Pitch**: Precise timing required
- **Rapid**: Lightning-fast note spawning
- **Battle**: Strategic defense gameplay
- **Slow**: Meditative, deliberate timing
- **Cosmic**: Ethereal, spacey rhythms
- **Electronic**: Bass-heavy, synthetic beats
- **Pop**: Catchy, upbeat melodies

## ?? Achievements

- **Milk Master**: Produce 500+ total milk
- **Coin Collector**: Earn 2000+ total coins
- **Veteran Farmer**: Survive 10 days
- **Happiness Guru**: Make all cows happy simultaneously

## ??? Content Creation Guide

### Adding Crops
1. Open `crops.json`
2. Add new crop object to the "crops" array
3. Set unlock conditions, rarity, and rewards
4. Refresh game - crop appears automatically!

### Adding Shop Items  
1. Open `shop.json`
2. Add new item to appropriate category
3. Define effects and unlock conditions
4. Item appears in shop when conditions met!

### Adding Rhythm Patterns
1. Open `rhythm-patterns.json`
2. Define new rhythm type with patterns
3. Set note types and special effects
4. Assign to cows in `cows.json`

### Effect Types Available
- `rhythm_tolerance`: Easier timing windows
- `milk_multiplier`: Multiply milk production  
- `coin_bonus`: Extra coins per game
- `crop_speed_boost`: Faster crop growth
- `happiness_boost`: Cows start happier

## ?? Styling Features

- **Modern gradient backgrounds** with vibrant colors
- **Smooth animations** and hover effects
- **Responsive grid layouts** for different screen sizes
- **Rarity-based styling** for crops and items
- **Custom button styles** with tactile feedback
- **Floating animations** for visual feedback
- **Achievement popups** with celebration effects

## ?? Debug Tools

Access debug features in the Stats tab:
- **Check Unlock Status**: View current progress toward unlocking content
- **Force Unlock Check**: Manually trigger unlock condition checks
- **Export Save Data**: Download complete game state as JSON
- **Import Save Data**: Load game state from JSON file

## ?? Mobile Features

- **Touch controls** optimized for rhythm gameplay
- **Vibration feedback** for enhanced experience
- **Responsive design** that adapts to screen orientation
- **iOS/Android compatibility** with proper meta tags
- **App-like experience** with full-screen support

## ?? Game Balance

- **Progressive difficulty**: Target scores increase with each day
- **Upgrade benefits**: Meaningful improvements to gameplay
- **Risk/reward**: Balance between coin investment and returns
- **Achievement progression**: Satisfying unlock conditions
- **Rarity system**: Clear progression from common to legendary

## ?? Future Phases

### **Phase 2 (Coming Soon):**
- Quest system with daily/weekly challenges
- Advanced statistics and analytics  
- Theme system for visual customization

### **Phase 3 (Planned):**
- Multiplayer features and leaderboards
- Performance optimizations
- Advanced game mechanics (weather, seasons)

---

**Enjoy farming with musical cows!** ????

*Note: The game automatically saves progress and works best in modern browsers with JavaScript enabled.*

**?? Ready to add your own content? Check out the Phase 1 Setup Guide for detailed instructions!**