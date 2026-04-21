import { useRef, useEffect, useCallback, useState } from 'react'
import { useDrawing } from '../context/DrawingContext'
import { detectAndCorrectShape, smoothPoints } from '../lib/shapeDetector'

export default function DrawingCanvas({ sessionWs, autoCorrectProp = true }) {
  const canvasRef = useRef(null)
  const { state, dispatch } = useDrawing()
  const isDrawingRef = useRef(false)
  const [autoCorrect, setAutoCorrect] = useState(true)

  // Sync auto-correct from parent
  useEffect(() => { setAutoCorrect(autoCorrectProp) }, [autoCorrectProp])
  const [lastCorrected, setLastCorrected] = useState(null) // flash feedback

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
    }

    state.strokes.forEach((s) => drawStroke(ctx, s, canvas))
    if (state.currentStroke) drawStroke(ctx, state.currentStroke, canvas)

    ctx.globalCompositeOperation = 'source-over'

    // Cursor for hand tracking
    if (state.indexPosition && state.gesture !== 'none' && state.gesture !== 'fist') {
      const x = state.indexPosition.x * canvas.width
      const y = state.indexPosition.y * canvas.height
      const isErasing = state.gesture === 'open' || state.tool === 'eraser'
      const isCrossed = state.gesture === 'crossed'
      const cursorSize = isErasing ? state.brushSize * 3 + 6 : state.brushSize + 4

      // Outer ring
      ctx.beginPath()
      ctx.arc(x, y, cursorSize, 0, Math.PI * 2)
      ctx.strokeStyle = isCrossed ? '#f59e0b' : isErasing ? '#ef4444' :
        state.gesture === 'draw' ? state.color : 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Inner dot
      if (state.gesture === 'draw' || state.gesture === 'open') {
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fillStyle = isErasing ? '#ef4444' : state.color
        ctx.fill()
      }

      // Crossed fingers X indicator
      if (isCrossed) {
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 3
        const s = 12
        ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.stroke()
      }
    }

    // Auto-correct flash feedback
    if (lastCorrected) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [state.strokes, state.currentStroke, state.indexPosition, state.gesture, state.color, state.brushSize, state.tool, lastCorrected])

  function drawStroke(ctx, stroke, canvas) {
    if (!stroke?.points?.length) return

    // Handle text rendering
    if (stroke.tool === 'text' && stroke.text) {
      ctx.globalCompositeOperation = 'source-over'
      ctx.shadowBlur = 0
      const fontSize = stroke.fontSize || 28
      ctx.font = `bold ${fontSize}px 'Inter', system-ui, sans-serif`
      ctx.fillStyle = stroke.color || '#f8fafc'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Subtle text shadow
      ctx.shadowColor = stroke.color || '#6366f1'
      ctx.shadowBlur = 8
      ctx.fillText(stroke.text, stroke.position.x * canvas.width, stroke.position.y * canvas.height)
      ctx.shadowBlur = 0
      return
    }

    // Handle polygon shapes (star, heart, arrow, diamond)
    if (['star', 'heart', 'arrow', 'diamond'].includes(stroke.tool) && stroke.points.length > 2) {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = stroke.color || '#6366f1'
      ctx.lineWidth = stroke.size || 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (stroke.voiceGenerated) {
        ctx.shadowColor = stroke.color || '#6366f1'
        ctx.shadowBlur = 6
      }
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.shadowBlur = 0
      return
    }

    const isEraser = stroke.tool === 'eraser'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = isEraser ? '#0f172a' : (stroke.color || '#6366f1')
    ctx.lineWidth = isEraser ? (stroke.size || 3) * 6 : (stroke.size || 3)

    // Auto-corrected strokes get a subtle glow
    if (stroke.autoCorrected) {
      ctx.shadowColor = stroke.color || '#6366f1'
      ctx.shadowBlur = 6
    } else {
      ctx.shadowBlur = 0
    }

    const pts = stroke.points
    switch (stroke.tool) {
      case 'freehand':
      case 'eraser': {
        const smoothed = stroke.tool === 'freehand' ? smoothPoints(pts, 5) : pts
        ctx.beginPath()
        if (smoothed.length === 1) {
          ctx.arc(smoothed[0].x * canvas.width, smoothed[0].y * canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2)
          ctx.fillStyle = ctx.strokeStyle; ctx.fill()
        } else {
          ctx.moveTo(smoothed[0].x * canvas.width, smoothed[0].y * canvas.height)
          for (let i = 1; i < smoothed.length; i++) {
            const mx = (smoothed[i - 1].x + smoothed[i].x) / 2 * canvas.width
            const my = (smoothed[i - 1].y + smoothed[i].y) / 2 * canvas.height
            ctx.quadraticCurveTo(smoothed[i - 1].x * canvas.width, smoothed[i - 1].y * canvas.height, mx, my)
          }
          ctx.stroke()
        }
        break
      }
      case 'line': {
        if (pts.length >= 2) {
          ctx.beginPath()
          ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height)
          ctx.lineTo(pts[pts.length - 1].x * canvas.width, pts[pts.length - 1].y * canvas.height)
          ctx.stroke()
        }
        break
      }
      case 'rectangle': {
        if (pts.length >= 2) {
          const s = pts[0], e = pts[pts.length - 1]
          ctx.beginPath()
          ctx.rect(s.x * canvas.width, s.y * canvas.height, (e.x - s.x) * canvas.width, (e.y - s.y) * canvas.height)
          ctx.stroke()
        }
        break
      }
      case 'circle': {
        if (pts.length >= 2) {
          const s = pts[0], e = pts[pts.length - 1]
          ctx.beginPath()
          ctx.ellipse(
            (s.x + e.x) / 2 * canvas.width, (s.y + e.y) / 2 * canvas.height,
            Math.abs(e.x - s.x) / 2 * canvas.width, Math.abs(e.y - s.y) / 2 * canvas.height,
            0, 0, Math.PI * 2
          )
          ctx.stroke()
        }
        break
      }
      case 'triangle': {
        if (pts.length >= 2) {
          const s = pts[0], e = pts[pts.length - 1]
          ctx.beginPath()
          ctx.moveTo((s.x + e.x) / 2 * canvas.width, s.y * canvas.height)
          ctx.lineTo(s.x * canvas.width, e.y * canvas.height)
          ctx.lineTo(e.x * canvas.width, e.y * canvas.height)
          ctx.closePath(); ctx.stroke()
        }
        break
      }
    }
    ctx.shadowBlur = 0
  }

  // Finalize a stroke: auto-correct shape if enabled
  const finalizeStroke = useCallback((stroke) => {
    let finalStroke = stroke

    if (autoCorrect && stroke.tool === 'freehand') {
      const corrected = detectAndCorrectShape(stroke)
      if (corrected) {
        finalStroke = corrected
        setLastCorrected(corrected.shapeType)
        setTimeout(() => setLastCorrected(null), 400)
      }
    }

    dispatch({ type: 'ADD_STROKE', payload: finalStroke })
    dispatch({ type: 'SET_CURRENT_STROKE', payload: null })
    if (sessionWs) sessionWs.sendMessage({ type: 'draw', stroke: finalStroke })
  }, [autoCorrect, dispatch, sessionWs])

  // Get effective tool from gesture
  const getActiveTool = () => {
    if (state.gesture === 'open') return 'eraser'
    return state.tool
  }

  // Hand tracking gesture handler
  useEffect(() => {
    if (!state.indexPosition) return
    const pos = state.indexPosition

    // Crossed fingers = clear board
    if (state.gesture === 'crossed') {
      if (state.strokes.length > 0) {
        dispatch({ type: 'CLEAR' })
        if (sessionWs) sessionWs.sendMessage({ type: 'clear' })
      }
      if (isDrawingRef.current) {
        dispatch({ type: 'SET_CURRENT_STROKE', payload: null })
        isDrawingRef.current = false
      }
      return
    }

    const shouldDraw = state.gesture === 'draw' || state.gesture === 'open'
    const activeTool = getActiveTool()

    if (shouldDraw) {
      if (!isDrawingRef.current) {
        isDrawingRef.current = true
        dispatch({
          type: 'SET_CURRENT_STROKE',
          payload: { tool: activeTool, color: state.color, size: state.brushSize, points: [{ x: pos.x, y: pos.y }] },
        })
      } else if (state.currentStroke) {
        dispatch({
          type: 'SET_CURRENT_STROKE',
          payload: { ...state.currentStroke, points: [...state.currentStroke.points, { x: pos.x, y: pos.y }] },
        })
      }
    } else {
      if (isDrawingRef.current && state.currentStroke) {
        finalizeStroke({ ...state.currentStroke })
      }
      isDrawingRef.current = false
    }
  }, [state.indexPosition, state.gesture])

  // Mouse handlers
  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / canvas.width, y: (e.clientY - rect.top) / canvas.height }
  }

  const handleMouseDown = (e) => {
    isDrawingRef.current = true
    const pos = getPos(e)
    dispatch({
      type: 'SET_CURRENT_STROKE',
      payload: { tool: state.tool, color: state.color, size: state.brushSize, points: [pos] },
    })
  }

  const handleMouseMove = (e) => {
    if (!isDrawingRef.current || !state.currentStroke) return
    dispatch({
      type: 'SET_CURRENT_STROKE',
      payload: { ...state.currentStroke, points: [...state.currentStroke.points, getPos(e)] },
    })
  }

  const handleMouseUp = () => {
    if (isDrawingRef.current && state.currentStroke) {
      finalizeStroke({ ...state.currentStroke })
    }
    isDrawingRef.current = false
  }

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = canvas.parentElement
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      redrawCanvas()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [redrawCanvas])

  // Render loop
  useEffect(() => {
    let id
    const loop = () => { redrawCanvas(); id = requestAnimationFrame(loop) }
    loop()
    return () => cancelAnimationFrame(id)
  }, [redrawCanvas])

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)',
      backgroundColor: '#0f172a', position: 'relative', minHeight: 0,
    }}>
      <canvas
        ref={canvasRef}
        style={{ flex: 1, display: 'block', cursor: state.tool === 'eraser' ? 'cell' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Auto-correct feedback toast */}
      {lastCorrected && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 20px', borderRadius: 12,
          backgroundColor: 'rgba(16,185,129,0.9)', color: 'white',
          fontSize: 13, fontWeight: 600, zIndex: 10,
          boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
          animation: 'fadeIn 0.2s ease',
        }}>
          Auto-corrected to {lastCorrected}
        </div>
      )}

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', backgroundColor: 'rgba(15,23,42,0.9)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: 12, color: '#94a3b8', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: state.tool === 'eraser' ? '#ef4444' : state.color,
            }} />
            {state.tool}
          </span>
          <span>Size: {state.brushSize}px</span>
          <span>Strokes: {state.strokes.length}</span>

          {/* Auto-correct toggle */}
          <button
            onClick={() => setAutoCorrect(!autoCorrect)}
            style={{
              padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              border: '1px solid', cursor: 'pointer',
              backgroundColor: autoCorrect ? 'rgba(16,185,129,0.15)' : 'transparent',
              borderColor: autoCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)',
              color: autoCorrect ? '#10b981' : '#64748b',
            }}
          >
            {autoCorrect ? 'Auto-correct ON' : 'Auto-correct OFF'}
          </button>
        </div>

        {state.gesture !== 'none' && (
          <span style={{
            fontWeight: 500,
            color: state.gesture === 'open' ? '#ef4444' :
              state.gesture === 'crossed' ? '#f59e0b' : '#818cf8',
          }}>
            {state.gesture === 'open' ? 'Erasing' :
             state.gesture === 'crossed' ? 'Clearing board...' :
             `Gesture: ${state.gesture}`}
          </span>
        )}
      </div>
    </div>
  )
}
