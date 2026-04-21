import cv2
import mediapipe as mp
import numpy as np

class HandTracker:
    # MediaPipe hand landmark indices
    THUMB_TIP = 4
    INDEX_TIP = 8
    MIDDLE_TIP = 12
    RING_TIP = 16
    PINKY_TIP = 20

    INDEX_MCP = 5
    MIDDLE_MCP = 9

    # Finger tip and pip pairs for checking if finger is up
    FINGER_TIPS = [8, 12, 16, 20]
    FINGER_PIPS = [6, 10, 14, 18]

    def __init__(self, max_hands=1, detection_confidence=0.7, tracking_confidence=0.7):
        self.mp_hands = mp.solutions.hands
        self.mp_draw = mp.solutions.drawing_utils
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=max_hands,
            min_detection_confidence=detection_confidence,
            min_tracking_confidence=tracking_confidence,
        )

    def process_frame(self, frame):
        """Process a BGR frame and return hand landmark data."""
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb)
        return results

    def get_landmark_positions(self, frame, results):
        """Extract landmark positions as pixel coordinates."""
        h, w, _ = frame.shape
        landmarks = []
        if results.multi_hand_landmarks:
            for hand_lm in results.multi_hand_landmarks:
                hand_points = []
                for idx, lm in enumerate(hand_lm.landmark):
                    px, py = int(lm.x * w), int(lm.y * h)
                    hand_points.append({"id": idx, "x": lm.x, "y": lm.y, "px": px, "py": py})
                landmarks.append(hand_points)
        return landmarks

    def fingers_up(self, hand_landmarks):
        """Determine which fingers are raised. Returns list of 5 booleans [thumb, index, middle, ring, pinky]."""
        if not hand_landmarks:
            return [False] * 5

        tips = hand_landmarks
        fingers = []

        # Thumb: compare x of tip vs ip (works for right hand; mirror for left)
        if tips[self.THUMB_TIP]["x"] < tips[self.THUMB_TIP - 1]["x"]:
            fingers.append(True)
        else:
            fingers.append(False)

        # Other 4 fingers: tip y < pip y means finger is up (y is inverted in image)
        for tip_id, pip_id in zip(self.FINGER_TIPS, self.FINGER_PIPS):
            if tips[tip_id]["y"] < tips[pip_id]["y"]:
                fingers.append(True)
            else:
                fingers.append(False)

        return fingers

    def get_index_finger_pos(self, hand_landmarks):
        """Get normalized index finger tip position."""
        if not hand_landmarks:
            return None
        return {
            "x": hand_landmarks[self.INDEX_TIP]["x"],
            "y": hand_landmarks[self.INDEX_TIP]["y"],
        }

    def get_pinch_distance(self, hand_landmarks):
        """Get distance between thumb tip and index finger tip (normalized)."""
        if not hand_landmarks:
            return 1.0
        thumb = hand_landmarks[self.THUMB_TIP]
        index = hand_landmarks[self.INDEX_TIP]
        dist = np.sqrt((thumb["x"] - index["x"]) ** 2 + (thumb["y"] - index["y"]) ** 2)
        return dist

    def draw_landmarks_on_frame(self, frame, results):
        """Draw hand landmarks on the frame for preview."""
        if results.multi_hand_landmarks:
            for hand_lm in results.multi_hand_landmarks:
                self.mp_draw.draw_landmarks(
                    frame, hand_lm, self.mp_hands.HAND_CONNECTIONS
                )
        return frame

    def release(self):
        self.hands.close()
