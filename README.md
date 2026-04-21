# AirDraw - Draw with Your Fingers in the Air

A real-time hand tracking drawing application for teachers and students. Draw shapes on a virtual canvas using your index finger tracked via webcam, powered by MediaPipe AI.

## Features

- **Hand Gesture Drawing** - Draw using your index finger via webcam (MediaPipe)
- **Voice Commands** - Say "draw a red circle", "write hello", "clear", "undo", etc.
- **Smart Shape Auto-Correction** - Freehand drawings snap to perfect circles, rectangles, triangles
- **Teacher/Student Sessions** - Create rooms, share codes, draw collaboratively
- **Multiple Shape Tools** - Freehand, line, rectangle, circle, triangle, eraser
- **Voice-Drawn Shapes** - Heart, star, arrow, diamond via voice
- **Gesture Controls** - Thumbs up, crossed fingers, three-finger toggle, and more

## Gesture Guide

| Gesture | Action |
|---------|--------|
| Index finger up | Draw |
| Index + Middle up | Move cursor |
| Cross index + middle | Clear board |
| Pinch thumb + index | Stop drawing |
| Open hand | Eraser |
| Thumbs up (home) | Select Teacher |
| Three fingers | Toggle webcam |
| Fist | Pause |

## Tech Stack

- **Backend**: Python, FastAPI, MediaPipe, OpenCV, WebSockets
- **Frontend**: React, Vite, Tailwind CSS v4, Framer Motion, React Icons
- **Hand Tracking**: MediaPipe Tasks Vision (browser-side)
- **Voice**: Web Speech API
- **Containerization**: Docker, Docker Compose

## Quick Start

### Docker (Recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## Voice Commands

| Command | Action |
|---------|--------|
| "Draw a red circle" | Draws a circle |
| "Write hello world" | Writes text |
| "Go home" | Navigate to landing |
| "Color blue" | Change color |
| "Clear" / "Undo" / "Save" | Board actions |
| "Fullscreen" | Toggle fullscreen |
| "Auto-correct on/off" | Shape correction |

## License

MIT
