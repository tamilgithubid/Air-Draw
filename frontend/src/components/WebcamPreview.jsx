import { motion } from 'framer-motion'
import { FiMaximize2, FiMinimize2, FiX } from 'react-icons/fi'
import { useState } from 'react'
import { useDrawing } from '../context/DrawingContext'

export default function WebcamPreview() {
  const { state, dispatch } = useDrawing()
  const [isExpanded, setIsExpanded] = useState(false)

  if (!state.showWebcam || !state.webcamFrame) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      drag
      dragMomentum={false}
      style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 20,
        borderRadius: 16, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.15)',
        backgroundColor: '#0f172a', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        width: isExpanded ? 320 : 200,
        height: isExpanded ? 240 : 150,
        cursor: 'grab',
      }}
    >
      <img
        src={state.webcamFrame}
        alt="Webcam"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {state.gesture && state.gesture !== 'none' && (
        <div style={{
          position: 'absolute', top: 8, left: 8,
          padding: '4px 10px', borderRadius: 8,
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          fontSize: 11, fontWeight: 600, color: 'white',
        }}>
          {state.gesture === 'draw' && 'Drawing'}
          {state.gesture === 'move' && 'Moving'}
          {state.gesture === 'pinch' && 'Pinch'}
          {state.gesture === 'open' && 'Erasing'}
          {state.gesture === 'fist' && 'Paused'}
        </div>
      )}

      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: 24, height: 24, borderRadius: 6,
            backgroundColor: 'rgba(0,0,0,0.6)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', cursor: 'pointer',
          }}
        >
          {isExpanded ? <FiMinimize2 size={12} /> : <FiMaximize2 size={12} />}
        </button>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_WEBCAM' })}
          style={{
            width: 24, height: 24, borderRadius: 6,
            backgroundColor: 'rgba(0,0,0,0.6)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', cursor: 'pointer',
          }}
        >
          <FiX size={12} />
        </button>
      </div>
    </motion.div>
  )
}
