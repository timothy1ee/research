# Snake Game Development Notes

## Goal
Create a classic snake game that is playable in a web browser.

## Approach
- Build using HTML5 Canvas for rendering
- Use vanilla JavaScript for game logic
- Keep it simple with a single HTML file containing all code
- Implement classic snake mechanics: movement, food collection, growth, collision detection

## Progress

### Initial Setup
- Created project folder: `snake-game/`
- Planning to create a browser-based snake game using HTML5 Canvas

### Implementation Plan
1. Set up HTML structure with canvas element
2. Implement game state management (snake position, food, score)
3. Handle keyboard input for snake direction
4. Game loop with rendering and updates
5. Collision detection (walls and self)
6. Score tracking and game over handling

### Implementation Complete

Created `index.html` with the following features:

**Core Mechanics:**
- Snake moves continuously in current direction
- Arrow keys or WASD for directional control
- Food spawns randomly, avoiding snake body
- Snake grows when eating food
- Game ends on wall or self collision

**Visual Features:**
- Dark theme with gradient background
- Subtle grid overlay on canvas
- Snake with gradient coloring (head to tail)
- Eyes on snake head that follow direction
- Rounded rectangle snake segments
- Circular red food pellet
- Clean, modern UI with score display

**Game Features:**
- Score tracking (+10 per food)
- High score persistence via localStorage
- Pause functionality (Space bar)
- Game over screen with restart button
- Speed increases as snake grows

**Technical Notes:**
- Used HTML5 Canvas for all rendering
- Game loop via setInterval (adjusts for speed)
- Prevented 180-degree turns (can't reverse into self)
- Food spawn excludes snake-occupied positions
