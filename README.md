# Moo-d Swings: Farmyard Follies

Moo-d Swings is a lightweight rhythm and farming game designed for touch devices. Each cow offers a unique rhythm challenge while crops and upgrades provide ongoing progression. All content is defined in easy to edit JSON files.

## File Structure
```
 index.php             Main page
 styles.css            Styling and animations
 js/                   JavaScript modules
   data.js            Data loading and state management
   ui.js              UI rendering and game flow
   achievements.js    Achievement system
   rhythm.js          Rhythm gameplay
   config.js          Game configuration
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
2. Run the PHP built-in server in the project directory:
   ```bash
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser and play.

## Editing Content
Modify the JSON files to add new cows, crops, shop items or rhythm patterns. You can also tweak the environment, upgrade values and rhythm defaults without touching the code. Refresh the page to load your changes.
## Basic Gameplay
- Tap a cow to play a randomly selected rhythm game and earn rewards.
- Plant and harvest crops for additional income.
- Spend coins or milk on upgrades in the shop.
- Unlock more content as you progress through the days.
- Keeping cows at full happiness for a while will level them up.
- Cows retire once they reach level 10.
- Seasons follow the real-world date, changing crop growth speed and cow mood.
 - Weather shifts throughout the day and displays the current temperature.
- The header displays the current local time so you know what part of the day the farm is themed for.

### Automation Upgrades
Certain shop upgrades provide automation:
- **Auto Sprinkler** instantly waters planted crops each hour, finishing their growth.
- **Milk Processor** converts all stored milk into coins at the start of each day using its conversion rate.

- **Pest Control** keeps pests away from your fields. The basic version lasts five minutes and
  upgraded ones extend the duration up to thirty minutes. Activating another
  while one is already running extends the remaining time rather than starting
  a separate timer.

### Consumables
Single-use boosts like Energy Drinks or Super Fertilizer can only be purchased one at a time.
Activate them when needed, and improved versions offer stronger or longer effects.

The game automatically saves progress and works in modern browsers with JavaScript enabled.

## Server Leaderboard
Saves are sent to the server and stored centrally. Visit `leaderboard.php` to see
the highest XP totals from all players.

## Color Palette
Below is the full palette used throughout the game. Each color has a specific purpose and mood to help keep the visuals cohesive.

### Neutrals (Cow Patterns & Backgrounds)
- **Cow White** `#FFFFFF` – pure white for cow bodies and clean UI areas.
- **Cow Black** `#000000` – deep black for spots and bold outlines.
- **Cream** `#FFF5E5` – warm off‑white for soft backgrounds and Jersey cows.
- **Cloud Gray** `#D3D3D3` – neutral gray for subtle UI elements and shadows.
- **Dirt Brown** `#8B5E3C` – earthy tone for soil, wood and grounding accents.

### Farm Environment
- **Pasture Green** `#6A994E` – lush grass for fields and meadows.
- **Hay Yellow** `#E1C699` – golden hay bales and autumn warmth.
- **Barn Red** `#B23A48` – classic barns and farm buildings.
- **Sky Blue** `#87CEEB` – bright daytime skies and cool highlights.
- **Earth Brown** `#A65E2E` – sturdy fence posts and tree bark.

### Accents & Highlights
- **Primary Teal** `#2D7D7D` – main call‑to‑action buttons and highlights.
- **Dark Teal** `#1E5A5A` – hover states and deep shadows.
- **Light Teal** `#4A9999` – subtle highlights and secondary buttons.
- **Accent Pink** `#E91E63` – celebratory moments and rewards.
- **Sunflower Yellow** `#FFD700` – coins, stars and achievements.
- **Wildflower Purple** `#8A2BE2` – rare items and magical effects.
- **Orange Accent** `#FFA500` – energetic warnings and action cues.

### UI & HUD
- **Soft Beige** `#F5F5DC` – comfortable menu backgrounds and panels.
- **Muted Blue** `#5D8CAE` – secondary buttons and borders.
- **Grass Green** `#A3D977` – success messages and health bars.
- **Pastel Mint** `#98FF98` – gentle highlights and selected states.

These colors were chosen to feel playful and pastoral while remaining readable on small screens.

