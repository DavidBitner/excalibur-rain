⚔️ Excalibur Rain

Excalibur Rain is a browser-based physics stacking game built with vanilla JavaScript. It utilizes Matter.js for rigid body simulation and the HTML5 Canvas API for high-performance rendering.

The project demonstrates the implementation of procedural terrain generation, complex collision detection, and custom rendering pipelines without the use of heavy game engines or external asset dependencies.
🎮 Live Demo

Play the Game
✨ Key Features

    Physics-Based Gameplay: Utilizes rigid body dynamics where friction, density, and center of mass determine the stability of the stack.

    Procedural Terrain: The floating island is generated dynamically using Simplex Noise, ensuring a unique topology for every session.

    Custom Rendering Engine: All visuals (swords, terrain, particle effects) are drawn programmatically via the Canvas API. No image assets are loaded, ensuring fast load times.

    Collision Logic: Custom collision filtering allows swords to "stick" to the ground based on impact angle and velocity, simulating penetration mechanics.

    Performance: Optimized game loop running at 60 FPS using requestAnimationFrame.

🛠️ Tech Stack

    Core: HTML5, CSS3, Vanilla JavaScript (ES6+).

    Physics Engine: Matter.js (2D rigid body physics).

    Math/Algorithms: Simplex-Noise (Terrain generation).

    Rendering: HTML5 Canvas Context 2D.

🚀 Getting Started

Since this project uses no build tools or bundlers (Webpack/Vite), it can be run instantly in any modern browser.
Prerequisites

    A modern web browser (Chrome, Firefox, Edge, Safari).

Installation

    Clone the repository
    Bash

    git clone https://github.com/YOUR_USERNAME/excalibur-rain.git

    Navigate to the project directory
    Bash

    cd excalibur-rain

    Run the project

        Simply open index.html in your browser.

        Recommended: Use a local server (like VS Code's "Live Server" extension) to avoid CORS issues if you expand the project later.

🧩 Architecture

The codebase is contained within main.js but follows a modular structure for maintainability:

    Configuration (CONFIG): Centralized object for tuning game balance (gravity, friction, island size) and visual styles.

    WorldGenerator: Handles the procedural generation of the island geometry using noise algorithms and polygon mapping.

    Physics Engine: Manages the Matter.js world, including specific collision events (e.g., the "sticking" mechanic when a sword hits the ground vertically).

    Renderer: A custom draw loop that translates physics body coordinates into visual Canvas paths (gradients, shadows, shapes).

    Game State: Manages scoring, lives, high score persistence (localStorage), and UI updates.

🕹️ Controls

    Mouse Click: Spawn a sword at the cursor's X position.

    Objective: Stack as many swords as possible on the floating island.

    Game Over: Occurs if you run out of lives (lives are lost when swords fall into the void).

📄 License

This project is open source and available under the MIT License.
👤 Author

[David Bitner]

    Portfolio: [https://davidbitner.github.io/resume/]

    GitHub: @DavidBitner
