import { useCallback, useEffect, useState, useRef } from 'react'
import { DrawingProvider, useDrawing } from './context/DrawingContext'
import { useWebSocket } from './hooks/useWebSocket'
import { useHandTracking } from './hooks/useHandTracking'
import { useVoiceInput } from './hooks/useVoiceInput'
import Header from './components/Header'
import RoleSelector from './components/RoleSelector'
import SessionPanel from './components/SessionPanel'
import DrawingCanvas from './components/DrawingCanvas'
import Toolbar from './components/Toolbar'
import WebcamPreview from './components/WebcamPreview'
import GestureGuide from './components/GestureGuide'
import VoicePanel from './components/VoicePanel'

function DrawingApp() {
  const { state, dispatch } = useDrawing()
  const handTracking = useHandTracking()
  const [lastVoiceCommand, setLastVoiceCommand] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [autoCorrectOn, setAutoCorrectOn] = useState(true)
  const gestureActionRef = useRef(null) // prevent repeated gesture triggers
  const gestureTimerRef = useRef(null)

  // Start hand tracking as soon as app loads (even on landing page for gesture nav)
  useEffect(() => {
    if (!handTracking.isTracking) {
      handTracking.startTracking()
    }
  }, [])

  // Sync hand tracking to context
  useEffect(() => {
    dispatch({ type: 'SET_CONNECTED', payload: handTracking.isTracking })
  }, [handTracking.isTracking, dispatch])

  useEffect(() => {
    dispatch({ type: 'SET_GESTURE', payload: handTracking.gesture })
  }, [handTracking.gesture, dispatch])

  useEffect(() => {
    dispatch({ type: 'SET_INDEX_POSITION', payload: handTracking.indexPosition })
  }, [handTracking.indexPosition, dispatch])

  useEffect(() => {
    if (handTracking.previewDataUrl) {
      dispatch({ type: 'SET_WEBCAM_FRAME', payload: handTracking.previewDataUrl })
    }
  }, [handTracking.previewDataUrl, dispatch])

  useEffect(() => {
    if (handTracking.landmarks) {
      dispatch({ type: 'SET_HAND_LANDMARKS', payload: handTracking.landmarks })
    }
  }, [handTracking.landmarks, dispatch])

  // ==================== GESTURE NAVIGATION ====================
  useEffect(() => {
    const gesture = handTracking.gesture
    if (gesture === gestureActionRef.current) return // already handled

    // Thumbs up on landing page = select Teacher
    if (gesture === 'thumbsup' && !state.role) {
      gestureActionRef.current = gesture
      clearTimeout(gestureTimerRef.current)
      gestureTimerRef.current = setTimeout(() => { gestureActionRef.current = null }, 2000)

      const id = Math.random().toString(36).substring(2, 8).toUpperCase()
      dispatch({ type: 'SET_ROLE', payload: 'teacher' })
      dispatch({ type: 'SET_SESSION', payload: id })
      showFeedback('Teacher mode activated (thumbs up)')
      return
    }

    // Three fingers = toggle webcam (anywhere)
    if (gesture === 'three_fingers') {
      gestureActionRef.current = gesture
      clearTimeout(gestureTimerRef.current)
      gestureTimerRef.current = setTimeout(() => { gestureActionRef.current = null }, 1500)
      dispatch({ type: 'TOGGLE_WEBCAM' })
      showFeedback('Webcam toggled')
      return
    }

    // Fist held on drawing page = go back to home (only if no strokes)
    // This is handled via voice instead to prevent accidental navigation

    // Reset action ref when gesture changes
    if (gesture !== gestureActionRef.current) {
      gestureActionRef.current = null
    }
  }, [handTracking.gesture, state.role, dispatch])

  // ==================== SESSION WEBSOCKET ====================
  const handleSessionMessage = useCallback((data) => {
    if (data.type === 'draw' && data.stroke) {
      dispatch({ type: 'ADD_STROKE', payload: data.stroke })
    } else if (data.type === 'clear') {
      dispatch({ type: 'CLEAR' })
    } else if (data.type === 'undo') {
      dispatch({ type: 'UNDO' })
    } else if (data.type === 'init' && data.drawings) {
      data.drawings.forEach((d) => {
        if (d.stroke) dispatch({ type: 'ADD_STROKE', payload: d.stroke })
      })
    }
  }, [dispatch])

  const sessionWs = useWebSocket(
    state.sessionId ? `ws://localhost:8000/ws/session/${state.sessionId}` : null,
    { onMessage: handleSessionMessage, autoConnect: !!state.sessionId }
  )

  // ==================== VOICE COMMAND HANDLER ====================
  const handleVoiceCommand = useCallback((cmd) => {
    let feedback = ''

    switch (cmd.action) {
      // --- Navigation ---
      case 'nav_home':
        dispatch({ type: 'SET_ROLE', payload: null })
        dispatch({ type: 'SET_SESSION', payload: null })
        dispatch({ type: 'CLEAR' })
        feedback = 'Back to home'
        break

      case 'nav_teacher': {
        const id = Math.random().toString(36).substring(2, 8).toUpperCase()
        dispatch({ type: 'SET_ROLE', payload: 'teacher' })
        dispatch({ type: 'SET_SESSION', payload: id })
        feedback = `Teacher mode - Room: ${id}`
        break
      }

      case 'nav_student':
        // This triggers the join UI — we can't auto-join without a code
        dispatch({ type: 'SET_ROLE', payload: null }) // show role selector
        feedback = 'Select student mode and enter room code'
        break

      case 'nav_create_session': {
        const id = Math.random().toString(36).substring(2, 8).toUpperCase()
        dispatch({ type: 'SET_ROLE', payload: 'teacher' })
        dispatch({ type: 'SET_SESSION', payload: id })
        feedback = `Session created: ${id}`
        break
      }

      case 'nav_join_session':
        if (cmd.code) {
          dispatch({ type: 'SET_ROLE', payload: 'student' })
          dispatch({ type: 'SET_SESSION', payload: cmd.code })
          feedback = `Joined session: ${cmd.code}`
        } else {
          feedback = 'Say "join session" followed by the room code'
        }
        break

      // --- Board ---
      case 'clear':
        dispatch({ type: 'CLEAR' })
        sessionWs.sendMessage({ type: 'clear' })
        feedback = 'Board cleared'
        break

      case 'undo':
        dispatch({ type: 'UNDO' })
        sessionWs.sendMessage({ type: 'undo' })
        feedback = 'Undo'
        break

      case 'save':
        handleSave()
        feedback = 'Image saved'
        break

      // --- Webcam ---
      case 'webcam_on':
        if (!state.showWebcam) dispatch({ type: 'TOGGLE_WEBCAM' })
        feedback = 'Webcam on'
        break
      case 'webcam_off':
        if (state.showWebcam) dispatch({ type: 'TOGGLE_WEBCAM' })
        feedback = 'Webcam off'
        break
      case 'webcam_toggle':
        dispatch({ type: 'TOGGLE_WEBCAM' })
        feedback = 'Webcam toggled'
        break

      // --- Auto-correct ---
      case 'autocorrect_on':
        setAutoCorrectOn(true)
        feedback = 'Auto-correct enabled'
        break
      case 'autocorrect_off':
        setAutoCorrectOn(false)
        feedback = 'Auto-correct disabled'
        break
      case 'autocorrect_toggle':
        setAutoCorrectOn((v) => !v)
        feedback = 'Auto-correct toggled'
        break

      // --- Voice ---
      case 'voice_stop':
        voice.stopListening()
        feedback = 'Voice stopped'
        break

      // --- Help ---
      case 'show_help':
        setShowHelp((v) => !v)
        feedback = 'Help toggled'
        break

      // --- Fullscreen ---
      case 'fullscreen':
        document.documentElement.requestFullscreen?.()
        feedback = 'Fullscreen'
        break
      case 'exit_fullscreen':
        document.exitFullscreen?.()
        feedback = 'Exited fullscreen'
        break

      // --- Color ---
      case 'color':
        dispatch({ type: 'SET_COLOR', payload: cmd.value })
        feedback = 'Color changed'
        break

      // --- Size ---
      case 'size':
        dispatch({ type: 'SET_BRUSH_SIZE', payload: Math.max(1, Math.min(20, cmd.value)) })
        feedback = `Size: ${cmd.value}`
        break
      case 'size_adjust': {
        const s = Math.max(1, Math.min(20, state.brushSize + cmd.value))
        dispatch({ type: 'SET_BRUSH_SIZE', payload: s })
        feedback = `Size: ${s}`
        break
      }

      // --- Tool ---
      case 'tool':
        dispatch({ type: 'SET_TOOL', payload: cmd.value })
        feedback = `Tool: ${cmd.value}`
        break

      // --- Draw shape ---
      case 'draw_shape':
        drawShapeByVoice(cmd)
        feedback = `Drew ${cmd.shape}`
        break

      // --- Write text ---
      case 'write_text':
        writeTextByVoice(cmd)
        feedback = `Wrote: "${cmd.text}"`
        break

      default:
        return
    }

    showFeedback(feedback)
  }, [dispatch, state.brushSize, state.showWebcam, sessionWs])

  const showFeedback = (text) => {
    setLastVoiceCommand(text)
    setTimeout(() => setLastVoiceCommand(null), 2500)
  }

  // Draw shape
  const drawShapeByVoice = (cmd) => {
    const color = cmd.color || state.color
    const cx = 0.5, cy = 0.5
    const sz = cmd.size === 'large' ? 0.2 : cmd.size === 'small' ? 0.08 : 0.14
    let stroke

    switch (cmd.shape) {
      case 'circle':
        stroke = { tool: 'circle', color, size: state.brushSize, points: [{ x: cx - sz, y: cy - sz }, { x: cx + sz, y: cy + sz }], voiceGenerated: true }
        break
      case 'rectangle':
        stroke = { tool: 'rectangle', color, size: state.brushSize, points: [{ x: cx - sz * 1.3, y: cy - sz }, { x: cx + sz * 1.3, y: cy + sz }], voiceGenerated: true }
        break
      case 'triangle':
        stroke = { tool: 'triangle', color, size: state.brushSize, points: [{ x: cx - sz, y: cy - sz }, { x: cx + sz, y: cy + sz }], voiceGenerated: true }
        break
      case 'line':
        stroke = { tool: 'line', color, size: state.brushSize, points: [{ x: cx - sz * 1.5, y: cy }, { x: cx + sz * 1.5, y: cy }], voiceGenerated: true }
        break
      case 'star':
        stroke = buildStarStroke(cx, cy, sz, color, state.brushSize)
        break
      case 'heart':
        stroke = buildHeartStroke(cx, cy, sz, color, state.brushSize)
        break
      case 'arrow':
        stroke = buildArrowStroke(cx, cy, sz, color, state.brushSize)
        break
      case 'diamond':
        stroke = { tool: 'diamond', color, size: state.brushSize, points: [
          { x: cx, y: cy - sz }, { x: cx + sz, y: cy }, { x: cx, y: cy + sz }, { x: cx - sz, y: cy }, { x: cx, y: cy - sz },
        ], voiceGenerated: true }
        break
      default: return
    }

    if (stroke) {
      dispatch({ type: 'ADD_STROKE', payload: stroke })
      if (sessionWs) sessionWs.sendMessage({ type: 'draw', stroke })
    }
  }

  function buildStarStroke(cx, cy, size, color, brushSize) {
    const points = []
    for (let i = 0; i < 11; i++) {
      const angle = (i * Math.PI * 2) / 10 - Math.PI / 2
      const r = i % 2 === 0 ? size : size * 0.45
      points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r })
    }
    points.push(points[0])
    return { tool: 'star', color, size: brushSize, points, voiceGenerated: true }
  }

  function buildHeartStroke(cx, cy, size, color, brushSize) {
    const points = []
    for (let i = 0; i <= 30; i++) {
      const t = (i / 30) * Math.PI * 2
      const x = cx + size * 0.8 * (16 * Math.sin(t) ** 3) / 16
      const y = cy - size * 0.8 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16
      points.push({ x, y })
    }
    return { tool: 'heart', color, size: brushSize, points, voiceGenerated: true }
  }

  function buildArrowStroke(cx, cy, size, color, brushSize) {
    const points = [
      { x: cx - size * 1.5, y: cy },
      { x: cx + size, y: cy },
      { x: cx + size * 0.5, y: cy - size * 0.5 },
      { x: cx + size, y: cy },
      { x: cx + size * 0.5, y: cy + size * 0.5 },
    ]
    return { tool: 'arrow', color, size: brushSize, points, voiceGenerated: true }
  }

  const writeTextByVoice = (cmd) => {
    const stroke = {
      tool: 'text', text: cmd.text, color: cmd.color || state.color,
      fontSize: cmd.fontSize || 28, position: { x: 0.5, y: 0.5 },
      points: [{ x: 0.5, y: 0.5 }], voiceGenerated: true,
    }
    dispatch({ type: 'ADD_STROKE', payload: stroke })
    if (sessionWs) sessionWs.sendMessage({ type: 'draw', stroke })
  }

  const voice = useVoiceInput({ onCommand: handleVoiceCommand })

  const handleClear = () => {
    dispatch({ type: 'CLEAR' })
    sessionWs.sendMessage({ type: 'clear' })
  }

  const handleUndo = () => {
    dispatch({ type: 'UNDO' })
    sessionWs.sendMessage({ type: 'undo' })
  }

  const handleSave = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const link = document.createElement('a')
      link.download = `airdraw-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }

  const handleGoHome = () => {
    dispatch({ type: 'SET_ROLE', payload: null })
    dispatch({ type: 'SET_SESSION', payload: null })
    dispatch({ type: 'CLEAR' })
  }

  // Landing page
  if (!state.role) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <RoleSelector />
        <VoicePanel
          isListening={voice.isListening}
          transcript={voice.transcript}
          interimText={voice.interimText}
          error={voice.error}
          onToggle={voice.toggleListening}
          lastCommand={lastVoiceCommand}
        />
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header onGoHome={handleGoHome} />
      <SessionPanel />

      {handTracking.error && (
        <div style={{
          padding: '10px 24px', backgroundColor: 'rgba(239,68,68,0.15)',
          borderBottom: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5',
          fontSize: 13, textAlign: 'center',
        }}>
          {handTracking.error}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', gap: 12, padding: 12, minHeight: 0 }}>
        <Toolbar onClear={handleClear} onUndo={handleUndo} onSave={handleSave} />

        <div style={{ flex: 1, position: 'relative', display: 'flex', minHeight: 0 }}>
          <DrawingCanvas sessionWs={sessionWs} autoCorrectProp={autoCorrectOn} />
          <WebcamPreview />
        </div>
      </div>

      <GestureGuide />
      <VoicePanel
        isListening={voice.isListening}
        transcript={voice.transcript}
        interimText={voice.interimText}
        error={voice.error}
        onToggle={voice.toggleListening}
        lastCommand={lastVoiceCommand}
      />
    </div>
  )
}

export default function App() {
  return (
    <DrawingProvider>
      <DrawingApp />
    </DrawingProvider>
  )
}
