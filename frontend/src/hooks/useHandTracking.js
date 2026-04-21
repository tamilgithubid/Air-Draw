import { useState, useEffect, useRef, useCallback } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

const THUMB_TIP = 4
const THUMB_IP = 3
const INDEX_TIP = 8
const INDEX_PIP = 6
const INDEX_MCP = 5
const MIDDLE_TIP = 12
const MIDDLE_PIP = 10
const MIDDLE_MCP = 9
const RING_TIP = 16
const RING_PIP = 14
const PINKY_TIP = 20
const PINKY_PIP = 18

const FINGER_TIPS = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]
const FINGER_PIPS = [INDEX_PIP, MIDDLE_PIP, RING_PIP, PINKY_PIP]

// Exponential moving average for smooth tracking
class PointSmoother {
  constructor(alpha = 0.45) {
    this.alpha = alpha
    this.prev = null
  }
  smooth(pt) {
    if (!this.prev) { this.prev = pt; return pt }
    const smoothed = {
      x: this.alpha * pt.x + (1 - this.alpha) * this.prev.x,
      y: this.alpha * pt.y + (1 - this.alpha) * this.prev.y,
    }
    this.prev = smoothed
    return smoothed
  }
  reset() { this.prev = null }
}

// Gesture stability: require gesture to be consistent for N frames
class GestureStabilizer {
  constructor(requiredFrames = 3) {
    this.requiredFrames = requiredFrames
    this.currentGesture = 'none'
    this.pendingGesture = 'none'
    this.frameCount = 0
  }
  update(rawGesture) {
    if (rawGesture === this.pendingGesture) {
      this.frameCount++
    } else {
      this.pendingGesture = rawGesture
      this.frameCount = 1
    }
    if (this.frameCount >= this.requiredFrames) {
      this.currentGesture = this.pendingGesture
    }
    return this.currentGesture
  }
  reset() {
    this.currentGesture = 'none'
    this.pendingGesture = 'none'
    this.frameCount = 0
  }
}

export function useHandTracking() {
  const [isReady, setIsReady] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [gesture, setGesture] = useState('none')
  const [indexPosition, setIndexPosition] = useState(null)
  const [landmarks, setLandmarks] = useState(null)
  const [error, setError] = useState(null)
  const [previewDataUrl, setPreviewDataUrl] = useState(null)
  const [fps, setFps] = useState(0)

  const handLandmarkerRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)
  const canvasPreviewRef = useRef(null)
  const smootherRef = useRef(new PointSmoother(0.5))
  const gestureStabilizerRef = useRef(new GestureStabilizer(3))
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() })

  const init = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      })

      setIsReady(true)
    } catch (err) {
      setError('Failed to initialize hand tracking: ' + err.message)
    }
  }, [])

  const startTracking = useCallback(async () => {
    if (!handLandmarkerRef.current) await init()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user', frameRate: { ideal: 30 } },
      })
      streamRef.current = stream

      const video = document.createElement('video')
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      video.setAttribute('autoplay', 'true')
      await video.play()
      videoRef.current = video

      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 240
      canvasPreviewRef.current = canvas

      smootherRef.current.reset()
      gestureStabilizerRef.current.reset()
      setIsTracking(true)
      detectLoop()
    } catch (err) {
      setError('Camera access denied. Please allow camera access and reload.')
    }
  }, [init])

  const stopTracking = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    videoRef.current = null
    streamRef.current = null
    animFrameRef.current = null
    smootherRef.current.reset()
    gestureStabilizerRef.current.reset()
    setIsTracking(false)
    setGesture('none')
    setIndexPosition(null)
    setLandmarks(null)
    setPreviewDataUrl(null)
  }, [])

  const detectLoop = useCallback(() => {
    const detect = () => {
      const video = videoRef.current
      const landmarker = handLandmarkerRef.current
      if (!video || !landmarker || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      // FPS counter
      const fpsRef = fpsCounterRef.current
      fpsRef.frames++
      const now = performance.now()
      if (now - fpsRef.lastTime > 1000) {
        setFps(fpsRef.frames)
        fpsRef.frames = 0
        fpsRef.lastTime = now
      }

      const result = landmarker.detectForVideo(video, now)

      if (result.landmarks && result.landmarks.length > 0) {
        const hand = result.landmarks[0]
        setLandmarks(hand)

        // Smooth the index finger position
        const rawPos = { x: 1 - hand[INDEX_TIP].x, y: hand[INDEX_TIP].y }
        const smoothed = smootherRef.current.smooth(rawPos)
        setIndexPosition(smoothed)

        // Detect gesture with stabilization
        const fingers = getFingersUp(hand)
        const rawGesture = classifyGesture(fingers, hand)
        const stableGesture = gestureStabilizerRef.current.update(rawGesture)
        setGesture(stableGesture)
      } else {
        setGesture('none')
        setIndexPosition(null)
        setLandmarks(null)
        smootherRef.current.reset()
      }

      // Preview
      const canvas = canvasPreviewRef.current
      if (canvas && video) {
        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
        ctx.restore()

        if (result.landmarks && result.landmarks.length > 0) {
          drawHandOverlay(ctx, result.landmarks[0], canvas.width, canvas.height)
        }

        setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.5))
      }

      animFrameRef.current = requestAnimationFrame(detect)
    }

    animFrameRef.current = requestAnimationFrame(detect)
  }, [])

  function drawHandOverlay(ctx, hand, w, h) {
    // Draw connections
    const connections = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [5,9],[9,10],[10,11],[11,12],
      [9,13],[13,14],[14,15],[15,16],
      [13,17],[17,18],[18,19],[19,20],[0,17],
    ]
    ctx.strokeStyle = 'rgba(99,102,241,0.6)'
    ctx.lineWidth = 1.5
    for (const [a, b] of connections) {
      ctx.beginPath()
      ctx.moveTo((1 - hand[a].x) * w, hand[a].y * h)
      ctx.lineTo((1 - hand[b].x) * w, hand[b].y * h)
      ctx.stroke()
    }

    // Draw landmarks
    hand.forEach((lm, i) => {
      const x = (1 - lm.x) * w, y = lm.y * h
      ctx.beginPath()
      ctx.arc(x, y, i === INDEX_TIP ? 6 : 3, 0, Math.PI * 2)
      ctx.fillStyle = i === INDEX_TIP ? '#10b981' : '#818cf8'
      ctx.fill()
    })
  }

  function getFingersUp(hand) {
    const fingers = []
    // Thumb
    fingers.push(hand[THUMB_TIP].x > hand[THUMB_IP].x)
    // Index, middle, ring, pinky
    for (let i = 0; i < FINGER_TIPS.length; i++) {
      fingers.push(hand[FINGER_TIPS[i]].y < hand[FINGER_PIPS[i]].y)
    }
    return fingers
  }

  function classifyGesture(fingers, hand) {
    const [thumb, index, middle, ring, pinky] = fingers

    // --- Crossed fingers: index and middle cross each other ---
    // When fingers are crossed, the index tip moves to the other side of the middle finger
    const indexTip = hand[INDEX_TIP]
    const middleTip = hand[MIDDLE_TIP]
    const indexMcp = hand[INDEX_MCP]
    const middleMcp = hand[MIDDLE_MCP]

    if (index && middle && !ring && !pinky) {
      // Normal: index tip is to the left of middle tip (from hand's perspective)
      // Crossed: index tip crosses over to the right of middle tip
      const mcpDx = middleMcp.x - indexMcp.x // baseline direction
      const tipDx = middleTip.x - indexTip.x  // tip direction
      // If tipDx has opposite sign from mcpDx, fingers are crossed
      if (mcpDx * tipDx < 0 && Math.abs(tipDx) > 0.01) {
        return 'crossed'
      }
    }

    // Pinch
    const pinchDist = Math.hypot(
      hand[THUMB_TIP].x - hand[INDEX_TIP].x,
      hand[THUMB_TIP].y - hand[INDEX_TIP].y
    )
    if (pinchDist < 0.055) return 'pinch'

    // Thumbs up: only thumb up, all others down
    if (thumb && !index && !middle && !ring && !pinky) {
      // Verify thumb is pointing up (tip above IP joint)
      if (hand[THUMB_TIP].y < hand[THUMB_IP].y - 0.03) {
        return 'thumbsup'
      }
    }

    // Three fingers (index + middle + ring, no pinky) = toggle webcam
    if (index && middle && ring && !pinky) return 'three_fingers'

    // Only index = draw
    if (index && !middle && !ring && !pinky) return 'draw'

    // Index + middle = move
    if (index && middle && !ring && !pinky) return 'move'

    // All open = erase
    if (thumb && index && middle && ring && pinky) return 'open'

    // Fist
    if (!thumb && !index && !middle && !ring && !pinky) return 'fist'

    return 'none'
  }

  useEffect(() => {
    return () => stopTracking()
  }, [stopTracking])

  return {
    isReady, isTracking, gesture, indexPosition, landmarks,
    error, previewDataUrl, fps, init, startTracking, stopTracking,
  }
}
