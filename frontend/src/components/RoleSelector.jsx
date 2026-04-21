import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiUsers, FiBookOpen, FiArrowRight, FiHash } from 'react-icons/fi'
import { useDrawing } from '../context/DrawingContext'

export default function RoleSelector() {
  const { dispatch } = useDrawing()
  const [showJoin, setShowJoin] = useState(false)
  const [sessionCode, setSessionCode] = useState('')

  const handleTeacher = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase()
    dispatch({ type: 'SET_ROLE', payload: 'teacher' })
    dispatch({ type: 'SET_SESSION', payload: id })
  }

  const handleJoinSession = () => {
    if (sessionCode.trim()) {
      dispatch({ type: 'SET_ROLE', payload: 'student' })
      dispatch({ type: 'SET_SESSION', payload: sessionCode.trim().toUpperCase() })
    }
  }

  const cardStyle = {
    padding: 32, borderRadius: 20, textAlign: 'left', cursor: 'pointer',
    backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
    transition: 'all 0.3s', position: 'relative', overflow: 'hidden',
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ maxWidth: 800, width: '100%' }}>
        {/* Hero */}
        <motion.div
          style={{ textAlign: 'center', marginBottom: 64 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 20,
              backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              color: '#818cf8', fontSize: 13, marginBottom: 24,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            Powered by MediaPipe Hand Tracking
          </motion.div>

          <h1 style={{ fontSize: 56, fontWeight: 800, marginBottom: 16 }}>
            <span style={{
              background: 'linear-gradient(to right, #818cf8, #ec4899, #8b5cf6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              AirDraw
            </span>
          </h1>
          <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Draw shapes in the air using your index finger. Perfect for interactive
            classroom sessions between teachers and students.
          </p>
        </motion.div>

        {!showJoin ? (
          <motion.div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 600, margin: '0 auto' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Teacher */}
            <motion.button
              onClick={handleTeacher}
              style={cardStyle}
              whileHover={{ scale: 1.03, y: -6, borderColor: 'rgba(99,102,241,0.5)' }}
              whileTap={{ scale: 0.98 }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                backgroundColor: 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <FiBookOpen style={{ width: 28, height: 28, color: '#818cf8' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#f8fafc', marginBottom: 8 }}>I'm a Teacher</h3>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
                Create a new drawing session and share the room code with your students.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#818cf8', fontSize: 14, fontWeight: 500 }}>
                Create Session <FiArrowRight />
              </div>
            </motion.button>

            {/* Student */}
            <motion.button
              onClick={() => setShowJoin(true)}
              style={cardStyle}
              whileHover={{ scale: 1.03, y: -6, borderColor: 'rgba(236,72,153,0.5)' }}
              whileTap={{ scale: 0.98 }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                backgroundColor: 'rgba(236,72,153,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <FiUsers style={{ width: 28, height: 28, color: '#ec4899' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#f8fafc', marginBottom: 8 }}>I'm a Student</h3>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
                Join an existing drawing session using the room code from your teacher.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ec4899', fontSize: 14, fontWeight: 500 }}>
                Join Session <FiArrowRight />
              </div>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            style={{ maxWidth: 420, margin: '0 auto' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div style={{
              padding: 32, borderRadius: 20,
              backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: '#f8fafc' }}>Join a Session</h3>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <FiHash style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  width: 20, height: 20, color: '#94a3b8',
                }} />
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
                  placeholder="Enter room code"
                  maxLength={6}
                  autoFocus
                  style={{
                    width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12,
                    backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f8fafc', fontSize: 18, letterSpacing: 4, fontFamily: 'monospace',
                    textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowJoin(false)}
                  style={{
                    flex: 1, padding: 14, borderRadius: 12, fontSize: 14,
                    border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent',
                    color: '#94a3b8', cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <motion.button
                  onClick={handleJoinSession}
                  disabled={!sessionCode.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    flex: 1, padding: 14, borderRadius: 12, fontSize: 14, fontWeight: 600,
                    border: 'none', color: 'white', cursor: sessionCode.trim() ? 'pointer' : 'not-allowed',
                    background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                    opacity: sessionCode.trim() ? 1 : 0.4,
                  }}
                >
                  Join
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Features */}
        <motion.div
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
            marginTop: 64, maxWidth: 600, margin: '64px auto 0',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[
            { label: 'Real-time Tracking', desc: 'MediaPipe AI' },
            { label: 'Shape Drawing', desc: 'Lines, Circles & more' },
            { label: 'Collaboration', desc: 'Live sessions' },
          ].map((item) => (
            <div key={item.label} style={{
              textAlign: 'center', padding: 16, borderRadius: 12,
              backgroundColor: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc' }}>{item.label}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
