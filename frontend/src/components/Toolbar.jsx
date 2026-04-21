import { motion } from 'framer-motion'
import {
  FiEdit3, FiMinus, FiSquare, FiCircle, FiTriangle,
  FiTrash2, FiCornerUpLeft, FiDownload, FiCamera, FiCameraOff,
  FiZap
} from 'react-icons/fi'
import { useDrawing } from '../context/DrawingContext'

const tools = [
  { id: 'freehand', icon: FiEdit3, label: 'Freehand' },
  { id: 'line', icon: FiMinus, label: 'Line' },
  { id: 'rectangle', icon: FiSquare, label: 'Rectangle' },
  { id: 'circle', icon: FiCircle, label: 'Circle' },
  { id: 'triangle', icon: FiTriangle, label: 'Triangle' },
  { id: 'eraser', icon: FiZap, label: 'Eraser' },
]

const colors = [
  '#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#f97316', '#ffffff', '#64748b',
]

const brushSizes = [2, 4, 6, 8, 12]

export default function Toolbar({ onClear, onUndo, onSave }) {
  const { state, dispatch } = useDrawing()

  const ToolButton = ({ active, onClick, title, children, danger, success }) => (
    <motion.button
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        width: 42,
        height: 42,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: active ? '#6366f1' : 'transparent',
        color: active ? '#fff' : danger ? '#ef4444' : success ? '#10b981' : '#94a3b8',
        boxShadow: active ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
      }}
    >
      {children}
    </motion.button>
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: 12,
      backgroundColor: 'rgba(15,23,42,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16,
      backdropFilter: 'blur(20px)',
      width: 66,
      flexShrink: 0,
      overflowY: 'auto',
    }}>
      {/* Tools */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', marginBottom: 4 }}>Tools</span>
        {tools.map((tool) => (
          <ToolButton
            key={tool.id}
            active={state.tool === tool.id}
            onClick={() => dispatch({ type: 'SET_TOOL', payload: tool.id })}
            title={tool.label}
          >
            <tool.icon size={16} />
          </ToolButton>
        ))}
      </div>

      <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

      {/* Colors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', marginBottom: 4 }}>Color</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {colors.map((color) => (
            <motion.button
              key={color}
              onClick={() => dispatch({ type: 'SET_COLOR', payload: color })}
              whileHover={{ scale: 1.3 }}
              whileTap={{ scale: 0.8 }}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: color,
                border: 'none',
                cursor: 'pointer',
                outline: state.color === color ? `2px solid ${color}` : 'none',
                outlineOffset: 3,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

      {/* Brush Size */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', marginBottom: 4 }}>Size</span>
        {brushSizes.map((size) => (
          <motion.button
            key={size}
            onClick={() => dispatch({ type: 'SET_BRUSH_SIZE', payload: size })}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 42,
              height: 28,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: state.brushSize === size ? '#334155' : 'transparent',
            }}
          >
            <div style={{
              width: size + 2,
              height: size + 2,
              borderRadius: '50%',
              backgroundColor: '#f8fafc',
            }} />
          </motion.button>
        ))}
      </div>

      <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        <ToolButton onClick={onUndo} title="Undo"><FiCornerUpLeft size={16} /></ToolButton>
        <ToolButton onClick={onClear} title="Clear All" danger><FiTrash2 size={16} /></ToolButton>
        <ToolButton onClick={onSave} title="Save Image" success><FiDownload size={16} /></ToolButton>
        <ToolButton
          active={state.showWebcam}
          onClick={() => dispatch({ type: 'TOGGLE_WEBCAM' })}
          title="Toggle Webcam"
        >
          {state.showWebcam ? <FiCamera size={16} /> : <FiCameraOff size={16} />}
        </ToolButton>
      </div>
    </div>
  )
}
