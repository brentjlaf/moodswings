# Moo-d Swings: Farmyard Follies

Moo-d Swings is a lightweight rhythm and farming game designed for touch devices. Each cow offers a unique rhythm challenge while crops and upgrades provide ongoing progression. All content is defined in easy to edit JSON files.

## File Structure
```
index.html            Main page
styles.css            Styling and animations
scripts.js            Core game logic
config.js             Game configuration
cows.json             Cow data
crops.json            Crop data
shop.json             Shop items
rhythm-patterns.json  Rhythm game patterns
```

## Quick Start
1. Clone or download this repository.
2. Run a static server in the project directory:
   ```bash
   python3 -m http.server
   ```
3. Open `http://localhost:8000` in your browser and play.

## Editing Content
Modify the JSON files to add new cows, crops, shop items or rhythm patterns. Refresh the page to load your changes.

## Basic Gameplay
- Tap a cow to play its rhythm game and earn rewards.
- Plant and harvest crops for additional income.
- Spend coins or milk on upgrades in the shop.
- Unlock more content as you progress through the days.

The game automatically saves progress and works in modern browsers with JavaScript enabled.
