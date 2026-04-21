import { motion } from 'framer-motion'
import { FiCopy, FiCheck, FiUsers } from 'react-icons/fi'
import { useState } from 'react'
import { useDrawing } from '../context/DrawingContext'

export default function SessionPanel() {
  const { state } = useDrawing()
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    if (state.sessionId) {
      await navigator.clipboard.writeText(state.sessionId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!state.sessionId) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 24px',
        backgroundColor: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8' }}>
        <FiUsers size={14} />
        <span>Session:</span>
      </div>

      <button
        onClick={copyCode}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 8,
          backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer', color: '#818cf8',
          fontFamily: 'monospace', fontSize: 14, fontWeight: 700, letterSpacing: 3,
        }}
      >
        {state.sessionId}
        {copied ? <FiCheck size={14} style={{ color: '#10b981' }} /> : <FiCopy size={14} style={{ color: '#94a3b8' }} />}
      </button>

      {state.role === 'teacher' && (
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          Share this code with your students
        </span>
      )}
    </motion.div>
  )
}
