import { motion, AnimatePresence } from 'framer-motion'
import { FiMic, FiMicOff } from 'react-icons/fi'

export default function VoicePanel({ isListening, transcript, interimText, error, onToggle, lastCommand }) {
  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 30,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
    }}>
      {/* Command feedback */}
      <AnimatePresence>
        {lastCommand && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            style={{
              padding: '8px 16px', borderRadius: 12,
              backgroundColor: 'rgba(99,102,241,0.9)', color: 'white',
              fontSize: 13, fontWeight: 500, maxWidth: 280,
              boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
            }}
          >
            {lastCommand}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript display */}
      <AnimatePresence>
        {isListening && (transcript || interimText) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              padding: '10px 16px', borderRadius: 12,
              backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
              maxWidth: 300, fontSize: 13, color: '#f8fafc',
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            }}
          >
            {transcript && <p style={{ margin: 0, marginBottom: interimText ? 4 : 0 }}>{transcript}</p>}
            {interimText && <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic' }}>{interimText}...</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div style={{
          padding: '6px 12px', borderRadius: 8,
          backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          fontSize: 11, color: '#fca5a5', maxWidth: 250,
        }}>
          {error}
        </div>
      )}

      {/* Mic button */}
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: 52, height: 52, borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: isListening ? '#ef4444' : '#6366f1',
          color: 'white',
          boxShadow: isListening
            ? '0 0 0 4px rgba(239,68,68,0.2), 0 4px 20px rgba(239,68,68,0.4)'
            : '0 4px 20px rgba(99,102,241,0.3)',
          position: 'relative',
        }}
      >
        {isListening ? <FiMicOff size={22} /> : <FiMic size={22} />}

        {/* Pulse animation when listening */}
        {isListening && (
          <>
            <span style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              border: '2px solid rgba(239,68,68,0.4)',
              animation: 'voicePulse 1.5s ease-out infinite',
            }} />
            <span style={{
              position: 'absolute', inset: -10, borderRadius: '50%',
              border: '2px solid rgba(239,68,68,0.2)',
              animation: 'voicePulse 1.5s ease-out infinite 0.3s',
            }} />
          </>
        )}
      </motion.button>

      <style>{`
        @keyframes voicePulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
