# Luis Fernandes | Personal Portfolio

Personal portfolio website showcasing my projects, skills, and background as a Front-End Developer and Computer Science student.

## Overview

This project is a modern single-page portfolio built with semantic HTML, modular CSS, and vanilla JavaScript.  
It includes smooth section-based navigation, animated content, and an interactive **Destroy Mode** easter egg experience.

## Highlights

- Responsive portfolio layout for desktop and mobile
- Project cards with details and modal interactions
- Skills and education sections in clean card-based UI
- Contact section with direct links and form layout
- Custom animations and transitions for a premium feel
- Hidden interactive **Destroy Mode** game layer

## Destroy Mode (AI-assisted)

The **Destroy Mode** gameplay system and VFX were built with AI-assisted development, including:

- Hit detection and destroyable areas
- Combo-driven feedback and HUD interactions
- Laser/impact effects, particles, fire/explosion styling
- Dynamic page feedback (flashes, shake, damage states)
- Ongoing balancing and visual polish iterations

## Tech Stack

- HTML5
- CSS3 (organized by section in `/styles`)
- JavaScript (vanilla)
- GSAP (for animation support)

## Project Structure

```text
Portfolio/
├── index.html
├── style.css                  # CSS import manifest
├── styles/                    # Sectioned CSS files
├── scripts/
│   ├── script.js
│   ├── destroy-mode.js
│   └── gsap.js
├── img/
├── assets/
└── README.md
```

## Run Locally

1. Clone the repository.
2. Open the project folder.
3. Run with any local static server (recommended), or open `index.html` directly.

Example with VS Code Live Server:

1. Open the folder in VS Code.
2. Right-click `index.html`.
3. Click `Open with Live Server`.

## Notes

- CSS is split into modular section files for easier maintenance.
- `style.css` is kept as a single entry point using `@import`.
- This is a personal portfolio project and continuously evolves with new features and polish.

## Author

**Luis Fernandes**  
Front-End Developer | CS Student
