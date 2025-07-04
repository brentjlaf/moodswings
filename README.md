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
environment.json      Seasons and weather
upgrades.json         Upgrade tuning and rhythm tolerances
farm-tips.json        Bulletin tips
rhythm-defaults.json  Fallback speeds and instructions
```

## Quick Start
1. Clone or download this repository.
2. Run a static server in the project directory:
   ```bash
   python3 -m http.server
   ```
3. Open `http://localhost:8000` in your browser and play.

## Editing Content
Modify the JSON files to add new cows, crops, shop items or rhythm patterns. You can also tweak the environment, upgrade values and rhythm defaults without touching the code. Refresh the page to load your changes.
## Basic Gameplay
- Tap a cow to play a randomly selected rhythm game and earn rewards.
- Plant and harvest crops for additional income.
- Spend coins or milk on upgrades in the shop.
- Unlock more content as you progress through the days.
 - Seasons follow the real-world date, changing crop growth speed and cow mood.
 - Weather shifts throughout the day and displays the current temperature.
- The header displays the current local time so you know what part of the day the farm is themed for.

### Automation Upgrades
Certain shop upgrades provide automation:
- **Auto Sprinkler** instantly waters planted crops each hour, finishing their growth.
- **Milk Processor** converts all stored milk into coins at the start of each day using its conversion rate.
- **Pest Control** keeps pests away from your fields for five minutes. You can stock up to 100 of them.

The game automatically saves progress and works in modern browsers with JavaScript enabled.

