import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiHelpCircle } from 'react-icons/fi'
import { useState } from 'react'

const sections = [
  {
    title: 'Drawing Gestures',
    items: [
      { icon: '☝️', name: 'Index finger up', action: 'Draw', color: '#818cf8' },
      { icon: '✌️', name: 'Index + Middle up', action: 'Move (no draw)', color: '#8b5cf6' },
      { icon: '🤏', name: 'Pinch thumb + index', action: 'Stop drawing', color: '#f59e0b' },
      { icon: '✋', name: 'All fingers open', action: 'Eraser mode', color: '#ef4444' },
      { icon: '✊', name: 'Fist', action: 'Pause tracking', color: '#64748b' },
    ],
  },
  {
    title: 'Control Gestures',
    items: [
      { icon: '🤞', name: 'Cross index + middle', action: 'Clear board', color: '#f59e0b' },
      { icon: '👍', name: 'Thumbs up (home)', action: 'Select Teacher', color: '#10b981' },
      { icon: '🤟', name: 'Three fingers up', action: 'Toggle webcam', color: '#06b6d4' },
    ],
  },
  {
    title: 'Voice Commands',
    items: [
      { icon: '🎤', name: '"Draw a red circle"', action: 'Draws shape', color: '#818cf8' },
      { icon: '✍️', name: '"Write hello world"', action: 'Writes text', color: '#ec4899' },
      { icon: '🏠', name: '"Go home" / "Go back"', action: 'Navigate home', color: '#f59e0b' },
      { icon: '🎨', name: '"Color blue" / "Bigger"', action: 'Change settings', color: '#10b981' },
      { icon: '🗑️', name: '"Clear" / "Undo" / "Save"', action: 'Board actions', color: '#ef4444' },
      { icon: '📹', name: '"Show/hide webcam"', action: 'Webcam control', color: '#06b6d4' },
      { icon: '📐', name: '"Auto-correct on/off"', action: 'Shape correction', color: '#8b5cf6' },
      { icon: '🖥️', name: '"Fullscreen"', action: 'Toggle fullscreen', color: '#64748b' },
    ],
  },
]

export default function GestureGuide() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          position: 'fixed', bottom: 16, left: 16, zIndex: 30,
          width: 40, height: 40, borderRadius: '50%',
          backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#94a3b8', cursor: 'pointer',
        }}
      >
        <FiHelpCircle size={20} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 40,
                backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              }}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              style={{
                position: 'fixed', top: 60, left: 16, bottom: 16, zIndex: 50,
                width: 320, padding: 20, borderRadius: 16,
                backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Controls Guide</h3>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <FiX size={18} />
                </button>
              </div>

              {sections.map((section) => (
                <div key={section.title} style={{ marginBottom: 20 }}>
                  <h4 style={{
                    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1,
                    color: '#64748b', marginBottom: 10, margin: 0, paddingBottom: 6,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    {section.title}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {section.items.map((item) => (
                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 500, color: item.color, margin: 0 }}>{item.name}</p>
                          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{item.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: '#64748b' }}>
                Mouse/touch drawing works as fallback. Click the mic button to enable voice.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
