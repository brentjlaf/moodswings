# 🐄 Moo-d Swings: Farmyard Follies

A mobile-optimized rhythm game where you manage a farm of musical cows, each with their own unique personality and rhythm game style!

## 📁 File Structure

```
moo-d-swings/
├── index.html          # Main HTML structure
├── styles.css          # All CSS styling and animations
├── scripts.js          # Game logic and functionality
├── cows.json           # Cow data and unlock conditions
└── README.md           # This file
```

## 🚀 Quick Start

1. **Download all files** to the same directory
2. **Open `index.html`** in a web browser
3. **Start playing!** The game works best on mobile devices but also runs on desktop

## 🎮 How to Play

### Basic Gameplay
- **Tap cow cards** to start rhythm minigames
- **Hit notes** when they cross the center marker
- **Keep cows happy** to earn milk and coins
- **Plant crops** to generate additional income
- **Buy upgrades** to make rhythm games easier

### Game Tabs
- **🐮 COWS**: Interact with your cows and play rhythm games
- **🌱 FARM**: Plant and harvest crops for income
- **🛒 SHOP**: Buy upgrades to improve your performance
- **📊 STATS**: View achievements, save/load game, and debug tools

### Unlocking New Cows
- **Regular Cows**: Unlock by reaching certain days, earning coins/milk
- **Secret Cows**: Unlock with perfect scores and special achievements

## 🔧 Technical Features

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

## 🎵 Rhythm Game Types

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

## 🏆 Achievements

- **Milk Master**: Produce 500+ total milk
- **Coin Collector**: Earn 2000+ total coins
- **Veteran Farmer**: Survive 10 days
- **Happiness Guru**: Make all cows happy simultaneously

## 🛠️ Development Notes

### File Organization
- **`index.html`**: Clean structure with minimal inline styles
- **`styles.css`**: All visual styling, animations, and responsive design
- **`scripts.js`**: Complete game logic, save system, and minigames
- **`cows.json`**: Easily editable cow data and unlock conditions

### Customization
- **Add new cows**: Edit `cows.json` with new cow objects
- **Modify styling**: Update `styles.css` for visual changes
- **Add features**: Extend `scripts.js` with new functionality
- **Adjust balance**: Tweak values in the game state and cow data

### Browser Compatibility
- **Modern browsers**: Full feature support
- **Mobile browsers**: Optimized touch interactions
- **localStorage**: Falls back gracefully if not available
- **Offline play**: Works without internet after initial load

## 🎨 Styling Features

- **Modern gradient backgrounds** with vibrant colors
- **Smooth animations** and hover effects
- **Responsive grid layouts** for different screen sizes
- **Custom button styles** with tactile feedback
- **Floating animations** for visual feedback
- **Achievement popups** with celebration effects

## 🐛 Debug Tools

Access debug features in the Stats tab:
- **Check Unlock Status**: View current progress toward unlocking cows
- **Force Unlock Check**: Manually trigger unlock condition checks
- **Export Save Data**: Download complete game state as JSON
- **Import Save Data**: Load game state from JSON file

## 📱 Mobile Features

- **Touch controls** optimized for rhythm gameplay
- **Vibration feedback** for enhanced experience
- **Responsive design** that adapts to screen orientation
- **iOS/Android compatibility** with proper meta tags
- **App-like experience** with full-screen support

## 🎯 Game Balance

- **Progressive difficulty**: Target scores increase with each day
- **Upgrade benefits**: Meaningful improvements to gameplay
- **Risk/reward**: Balance between coin investment and returns
- **Achievement progression**: Satisfying unlock conditions

---

**Enjoy farming with musical cows!** 🐄🎵

*Note: The game automatically saves progress and works best in modern browsers with JavaScript enabled.*