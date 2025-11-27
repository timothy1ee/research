# Snake Game

A classic snake game built with HTML5 Canvas and vanilla JavaScript.

## How to Play

1. Open `index.html` in any modern web browser
2. Use **Arrow Keys** or **WASD** to control the snake's direction
3. Eat the red food to grow and score points
4. Avoid hitting the walls or your own tail
5. Press **Space** to pause/unpause the game

## Features

- **Classic Gameplay**: The timeless snake mechanics we all know and love
- **Smooth Controls**: Responsive keyboard input with both arrow keys and WASD support
- **Progressive Difficulty**: Speed increases as your snake grows longer
- **Score Tracking**: Current score displayed during gameplay
- **High Score**: Persisted to localStorage so your best score survives browser refreshes
- **Pause Function**: Take a break without losing your progress
- **Modern Visuals**: Clean dark theme with gradient snake coloring and animated eyes

## Technical Details

- **Rendering**: HTML5 Canvas API
- **Grid Size**: 20x20 cells on a 400x400 pixel canvas
- **Initial Speed**: 150ms per frame (gets faster as you score)
- **Scoring**: +10 points per food item

## Files

- `index.html` - Complete game (HTML, CSS, and JavaScript in one file)
- `notes.md` - Development notes and implementation details
- `README.md` - This file

## Browser Compatibility

Works in all modern browsers that support HTML5 Canvas:
- Chrome
- Firefox
- Safari
- Edge

## Screenshot

To see the game in action, simply open `index.html` in your browser!
