import { motion } from 'framer-motion'
import { FiEdit3, FiWifi, FiWifiOff, FiHome } from 'react-icons/fi'
import { useDrawing } from '../context/DrawingContext'

export default function Header({ onGoHome }) {
  const { state } = useDrawing()

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      backgroundColor: 'rgba(15,23,42,0.9)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {state.role && onGoHome && (
          <motion.button
            onClick={onGoHome}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', cursor: 'pointer',
            }}
            title="Go Home"
          >
            <FiHome size={16} />
          </motion.button>
        )}
        <motion.div
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <FiEdit3 style={{ width: 20, height: 20, color: 'white' }} />
        </motion.div>
        <div>
          <motion.h1
            style={{
              fontSize: 20, fontWeight: 700, margin: 0, lineHeight: 1.2,
              background: 'linear-gradient(to right, #818cf8, #ec4899, #8b5cf6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            AirDraw
          </motion.h1>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
            Draw with your fingers in the air
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {state.role && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 11,
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1,
              backgroundColor: state.role === 'teacher' ? 'rgba(99,102,241,0.15)' : 'rgba(236,72,153,0.15)',
              color: state.role === 'teacher' ? '#818cf8' : '#ec4899',
              border: `1px solid ${state.role === 'teacher' ? 'rgba(99,102,241,0.3)' : 'rgba(236,72,153,0.3)'}`,
            }}
          >
            {state.role}
          </motion.span>
        )}

        {state.sessionId && (
          <span style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 11,
            backgroundColor: '#334155', color: '#94a3b8',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            Room: {state.sessionId}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {state.isConnected ? (
            <FiWifi style={{ width: 16, height: 16, color: '#10b981' }} />
          ) : (
            <FiWifiOff style={{ width: 16, height: 16, color: '#ef4444' }} />
          )}
          <span style={{
            fontSize: 12, fontWeight: 500,
            color: state.isConnected ? '#10b981' : '#ef4444',
          }}>
            {state.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </header>
  )
}
