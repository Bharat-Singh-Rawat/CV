# Ion Source Theme - Ph.D. Portfolio 

<img width="1863" height="784" alt="image" src="https://github.com/user-attachments/assets/2518a0e5-211f-4fb3-b050-4dceb50f4d7a" />

This project features a CRT-style interface, audio-reactive visualizations, parallax effects, and an integrated music jukebox system.

## Overview

This is a personal portfolio website designed with a unique **plasma/ion source visual theme**.

### 🎨 Design & Aesthetics
- **Ion Source Theme**: Plasma cyan, vacuum black, and phosphor green color scheme inspired by particle physics
- **CRT Monitor Effect**: Video overlay introduction with retro computer aesthetics
- **Responsive Design**: Mobile-friendly with touch support and smooth scrolling
- **Parallax Scrolling**: Dynamic depth effects using parallax transformations

### 🎵 Audio System (Jukebox)
- **22-track Playlist**: Curated international music collection including:
  - Indian classical (Bhairav, Kalawati, Malkauns, Yaman)
  - Spanish and Latin music
  - Russian pop tracks
  - Jazz and contemporary hits
- **Shuffle Mode**: Randomized playback
- **Random Start**: Begins with a random track on load
- **Responsive Audio Controls**: Integration with the visual interface

### 📊 Audio Visualization
- **Real-time Frequency Analysis**: Web Audio API-powered frequency visualizer
- **Dynamic Canvas Rendering**: Audio-reactive 30px canvas display
- **FFT Analysis**: 64-point FFT for compact, responsive visualization
- **Integrated UI**: Seamlessly embedded in the jukebox interface

### 🎬 Interactive Elements
- **Video Introduction**: Full-screen intro video with fade-out transition
- **Smooth Animations**: CSS transitions and cubic-bezier timing functions
- **Touch-optimized**: `touch-action: pan-y` for better mobile experience

## File Structure

```
CV-repo/
├── index.html              # Main HTML structure and styling
├── README.md               # This file
├── js/
│   ├── jukebox.js          # Audio player and playlist management
│   ├── parallax.js         # Background magnetic-grid + parallax effects
│   └── visualizer.js       # Web Audio API frequency visualizer
└── assets/
    ├── audio/              # 22-track jukebox playlist (track1..22.mp3)
    ├── video/              # IonSource.mp4 intro + Intro.mp4
    └── cv/
        └── Bharat_Rawat_CV.pdf   # Downloadable PDF dossier
```

## Technologies Used

- **HTML5**: Semantic markup, media integration
- **CSS3**: Custom properties, animations, responsive design
- **JavaScript**: Vanilla JS (ES6+)
  - Web Audio API for audio analysis
  - Canvas API for visualization
  - DOM manipulation and event handling

## Color Palette

The theme uses a custom color scheme defined in CSS variables:

| Variable | Color | Purpose |
|----------|-------|---------|
| `--plasma-cyan` | `#00ffff` | Primary accent, current beam |
| `--vacuum-black` | `#020205` | Background |
| `--magnet-north` | `#ff3e3e` | Accent (North pole) |
| `--magnet-south` | `#3e66ff` | Accent (South pole) |
| `--phosphor-green` | `#00ff41` | Secondary accent |
| `--warning-orange` | `#ffae00` | Warning/alert color |
| `--extraction-purple` | `#bc13fe` | Tertiary accent |
| `--electron-gold` | `#fff176` | Highlight |

## Font

- **Primary Font**: Fira Code (monospace) - gives a technical, code-like aesthetic

## Getting Started

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Ensure all JavaScript files and media assets are in the same directory
4. Interact with the jukebox to start playing music and see the visualizer in action

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

**Note**: Web Audio API support required for visualizer functionality.

## Media Assets

The project expects the following media files in `assets/`:
- `assets/audio/track1.mp3` through `track22.mp3` — playlist audio
- `assets/video/IonSource.mp4` — CRT intro overlay
- `assets/video/Intro.mp4` — secondary intro clip
- `assets/cv/Bharat_Rawat_CV.pdf` — downloadable CV linked from the hero card

## Future Enhancements

- [ ] Add more interactive canvas visualizers
- [ ] Implement playlist management UI
- [ ] Add keyboard shortcuts
- [ ] Create theme customization options
- [ ] Add social media links and CV download
- [ ] Implement project showcase section

## Author

**Bharat Singh Rawat, Ph.D.**

## License

This project is part of a personal portfolio and is not publicly licensed.

---

*Created with scientific aesthetics and interactive web technologies* ⚛️✨
