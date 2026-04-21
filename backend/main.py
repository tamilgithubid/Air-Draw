import asyncio
import base64
import json
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from hand_tracker import HandTracker

app = FastAPI(title="AirDraw Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active sessions: session_id -> set of websockets
sessions: dict[str, dict] = {}
# Store drawing data per session
session_drawings: dict[str, list] = {}


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


@app.websocket("/ws/hand-tracking")
async def hand_tracking_endpoint(websocket: WebSocket):
    """WebSocket endpoint that captures webcam, tracks hands, and streams data."""
    await websocket.accept()

    tracker = HandTracker(max_hands=1, detection_confidence=0.7, tracking_confidence=0.7)
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        await websocket.send_json({"error": "Cannot access webcam"})
        await websocket.close()
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.01)
                continue

            # Mirror the frame for natural interaction
            frame = cv2.flip(frame, 1)

            # Process hand tracking
            results = tracker.process_frame(frame)
            landmarks = tracker.get_landmark_positions(frame, results)

            # Build response data
            data = {
                "type": "tracking",
                "hands": [],
                "frame": None,
            }

            if landmarks:
                for hand_lm in landmarks:
                    fingers = tracker.fingers_up(hand_lm)
                    index_pos = tracker.get_index_finger_pos(hand_lm)
                    pinch_dist = tracker.get_pinch_distance(hand_lm)

                    # Determine gesture
                    gesture = "none"
                    if fingers[1] and not fingers[2] and not fingers[3] and not fingers[4]:
                        gesture = "draw"  # Only index finger up
                    elif fingers[1] and fingers[2] and not fingers[3] and not fingers[4]:
                        gesture = "move"  # Index + middle up (navigation)
                    elif pinch_dist < 0.05:
                        gesture = "pinch"  # Thumb + index pinch (select/stop)
                    elif all(fingers):
                        gesture = "open"  # All fingers open (erase mode)
                    elif not any(fingers):
                        gesture = "fist"  # Fist (pause)

                    hand_data = {
                        "index_pos": index_pos,
                        "fingers": fingers,
                        "gesture": gesture,
                        "pinch_distance": pinch_dist,
                        "landmarks": [{"x": p["x"], "y": p["y"]} for p in hand_lm],
                    }
                    data["hands"].append(hand_data)

            # Encode frame as base64 JPEG for webcam preview
            preview = tracker.draw_landmarks_on_frame(frame.copy(), results)
            _, buffer = cv2.imencode(".jpg", preview, [cv2.IMWRITE_JPEG_QUALITY, 60])
            frame_b64 = base64.b64encode(buffer).decode("utf-8")
            data["frame"] = frame_b64

            try:
                await websocket.send_json(data)
            except Exception:
                break

            # Check for incoming messages (e.g., settings changes)
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                config = json.loads(msg)
                if "detection_confidence" in config:
                    tracker.release()
                    tracker = HandTracker(
                        max_hands=config.get("max_hands", 1),
                        detection_confidence=config.get("detection_confidence", 0.7),
                        tracking_confidence=config.get("tracking_confidence", 0.7),
                    )
            except (asyncio.TimeoutError, Exception):
                pass

            await asyncio.sleep(0.016)  # ~60fps cap

    except WebSocketDisconnect:
        pass
    finally:
        cap.release()
        tracker.release()


@app.websocket("/ws/session/{session_id}")
async def session_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket for shared drawing sessions between teacher and students."""
    await manager.connect(websocket)

    if session_id not in sessions:
        sessions[session_id] = {"connections": set(), "drawings": []}
    sessions[session_id]["connections"].add(websocket)

    # Send existing drawings to newly connected client
    try:
        await websocket.send_json({
            "type": "init",
            "drawings": sessions[session_id]["drawings"],
        })
    except Exception:
        pass

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "draw":
                sessions[session_id]["drawings"].append(data)
                # Broadcast to all other connections in the session
                for conn in sessions[session_id]["connections"]:
                    if conn != websocket:
                        try:
                            await conn.send_json(data)
                        except Exception:
                            pass

            elif data.get("type") == "clear":
                sessions[session_id]["drawings"] = []
                for conn in sessions[session_id]["connections"]:
                    if conn != websocket:
                        try:
                            await conn.send_json({"type": "clear"})
                        except Exception:
                            pass

            elif data.get("type") == "undo":
                if sessions[session_id]["drawings"]:
                    sessions[session_id]["drawings"].pop()
                for conn in sessions[session_id]["connections"]:
                    if conn != websocket:
                        try:
                            await conn.send_json({"type": "undo"})
                        except Exception:
                            pass

    except WebSocketDisconnect:
        sessions[session_id]["connections"].discard(websocket)
        manager.disconnect(websocket)
        if not sessions[session_id]["connections"]:
            del sessions[session_id]


@app.get("/health")
async def health():
    return {"status": "ok", "message": "AirDraw backend running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
