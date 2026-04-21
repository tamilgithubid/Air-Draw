import { useState, useRef, useCallback, useEffect } from 'react'

export function useVoiceInput({ onCommand }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState(null)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef(null)
  const onCommandRef = useRef(onCommand)
  onCommandRef.current = onCommand

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      setError('Speech recognition not supported. Use Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      setInterimText(interim)
      if (final) {
        setTranscript(final)
        const command = parseCommand(final.trim().toLowerCase())
        if (command) onCommandRef.current?.(command)
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setError(`Speech error: ${event.error}`)
    }

    recognition.onend = () => {
      if (recognitionRef.current?._shouldListen) {
        try { recognition.start() } catch {}
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !supported) return
    try {
      recognitionRef.current._shouldListen = true
      recognitionRef.current.start()
      setIsListening(true)
      setError(null)
      setTranscript('')
      setInterimText('')
    } catch {}
  }, [supported])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    recognitionRef.current._shouldListen = false
    recognitionRef.current.stop()
    setIsListening(false)
    setInterimText('')
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) stopListening()
    else startListening()
  }, [isListening, startListening, stopListening])

  return {
    isListening, transcript, interimText, error, supported,
    startListening, stopListening, toggleListening,
  }
}

// ==================== COMMAND PARSER ====================

function parseCommand(text) {
  const clean = text
    .replace(/\b(please|can you|could you|i want to|i'd like to|let's|now|okay|hey|hi)\b/g, '')
    .replace(/\b(a |an |the )\b/g, '')
    .trim()

  // ---- NAVIGATION ----
  if (/\b(go back|go home|back to home|home page|main page|main menu|go to home|exit|leave|logout|log out)\b/.test(clean)) {
    return { action: 'nav_home' }
  }
  if (/\b(i am|i'm|select|choose|be)\b.*\b(teacher|instructor|professor)\b/.test(clean) || /\bteacher\b/.test(clean) && /\b(mode|select|start|create)\b/.test(clean)) {
    return { action: 'nav_teacher' }
  }
  if (/\b(i am|i'm|select|choose|be)\b.*\b(student|learner|pupil)\b/.test(clean) || /\bstudent\b/.test(clean) && /\b(mode|select|join)\b/.test(clean)) {
    return { action: 'nav_student' }
  }
  if (/\b(create|start|new)\b.*\b(session|room|class|board)\b/.test(clean)) {
    return { action: 'nav_create_session' }
  }
  const joinMatch = clean.match(/\b(?:join|enter|connect)\b.*\b(?:session|room|class|code)?\b\s*([a-z0-9]{4,8})?/i)
  if (joinMatch) {
    return { action: 'nav_join_session', code: joinMatch[1]?.toUpperCase() || null }
  }

  // ---- BOARD ACTIONS ----
  if (/\b(clear|clean|erase all|reset|wipe|clear all|clear board|clean board)\b/.test(clean)) {
    return { action: 'clear' }
  }
  if (/\b(undo|go back one|remove last|take back|step back)\b/.test(clean)) {
    return { action: 'undo' }
  }
  if (/\b(save|download|export|capture|screenshot)\b/.test(clean)) {
    return { action: 'save' }
  }

  // ---- WEBCAM ----
  if (/\b(show|open|enable|turn on)\b.*\b(webcam|camera|cam|video)\b/.test(clean)) {
    return { action: 'webcam_on' }
  }
  if (/\b(hide|close|disable|turn off)\b.*\b(webcam|camera|cam|video)\b/.test(clean)) {
    return { action: 'webcam_off' }
  }
  if (/\b(toggle)\b.*\b(webcam|camera|cam)\b/.test(clean)) {
    return { action: 'webcam_toggle' }
  }

  // ---- AUTO-CORRECT ----
  if (/\b(auto.?correct|smart.?shape|shape.?correct)\b.*\b(on|enable|start|activate)\b/.test(clean)) {
    return { action: 'autocorrect_on' }
  }
  if (/\b(auto.?correct|smart.?shape|shape.?correct)\b.*\b(off|disable|stop|deactivate)\b/.test(clean)) {
    return { action: 'autocorrect_off' }
  }
  if (/\b(toggle|switch)\b.*\b(auto.?correct|smart.?shape)\b/.test(clean)) {
    return { action: 'autocorrect_toggle' }
  }

  // ---- VOICE CONTROL ----
  if (/\b(stop listening|stop voice|mute|shut up|silence|quiet)\b/.test(clean)) {
    return { action: 'voice_stop' }
  }

  // ---- HELP ----
  if (/\b(help|what can i say|commands|show help|guide|instructions)\b/.test(clean)) {
    return { action: 'show_help' }
  }

  // ---- FULLSCREEN ----
  if (/\b(fullscreen|full screen|maximize)\b/.test(clean)) {
    return { action: 'fullscreen' }
  }
  if (/\b(exit fullscreen|exit full screen|minimize|windowed)\b/.test(clean)) {
    return { action: 'exit_fullscreen' }
  }

  // ---- COLOR ----
  const colorMatch = clean.match(/\b(?:change |set |switch |make )?(?:color |colour )?(?:to )?(red|blue|green|yellow|orange|purple|violet|pink|white|black|cyan|gray|grey|indigo)\b/)
  if (colorMatch) {
    return { action: 'color', value: mapColor(colorMatch[1]) }
  }

  // ---- BRUSH SIZE ----
  const sizeMatch = clean.match(/\b(?:brush |pen |stroke )?(?:size |width |thickness )?(?:to )?(\d+)\b/)
  if (sizeMatch && /\b(size|width|thickness|brush|pen|stroke)\b/.test(clean)) {
    return { action: 'size', value: parseInt(sizeMatch[1]) }
  }
  if (/\b(thicker|bigger|larger|increase size)\b/.test(clean)) return { action: 'size_adjust', value: 2 }
  if (/\b(thinner|smaller|decrease size|reduce)\b/.test(clean)) return { action: 'size_adjust', value: -2 }

  // ---- TOOL ----
  if (/\b(freehand|free hand|pen|pencil|draw free)\b/.test(clean)) return { action: 'tool', value: 'freehand' }
  if (/\b(eraser|erase mode|rubber)\b/.test(clean)) return { action: 'tool', value: 'eraser' }
  if (/\b(line tool|straight line|line mode)\b/.test(clean)) return { action: 'tool', value: 'line' }
  if (/\b(rectangle tool|rect mode|rectangle mode)\b/.test(clean)) return { action: 'tool', value: 'rectangle' }
  if (/\b(circle tool|circle mode|ellipse)\b/.test(clean)) return { action: 'tool', value: 'circle' }
  if (/\b(triangle tool|triangle mode)\b/.test(clean)) return { action: 'tool', value: 'triangle' }

  // ---- DRAW SHAPES ----
  if (/\bdraw\b.*\bcircle\b/.test(clean)) {
    return { action: 'draw_shape', shape: 'circle', color: extractColor(clean), size: extractSize(clean) }
  }
  if (/\bdraw\b.*\b(rectangle|square|box|rect)\b/.test(clean)) {
    return { action: 'draw_shape', shape: 'rectangle', color: extractColor(clean), size: extractSize(clean) }
  }
  if (/\bdraw\b.*\btriangle\b/.test(clean)) {
    return { action: 'draw_shape', shape: 'triangle', color: extractColor(clean), size: extractSize(clean) }
  }
  if (/\bdraw\b.*\bline\b/.test(clean)) {
    return { action: 'draw_shape', shape: 'line', color: extractColor(clean) }
  }
  if (/\bdraw\b.*\bstar\b/.test(clean)) {
    return { action: 'draw_shape', shape: 'star', color: extractColor(clean), size: extractSize(clean) }
  }
  if (/\bdraw\b.*\b(heart|love)\b/.test(clean)) {
    return { action: 'draw_shape', shape: 'heart', color: extractColor(clean) || '#ef4444', size: extractSize(clean) }
  }
  if (/\bdraw\b.*\b(arrow|pointer)\b/.test(clean)) {
    return { action: 'draw_shape', shape: 'arrow', color: extractColor(clean), size: extractSize(clean) }
  }
  if (/\bdraw\b.*\b(diamond|rhombus)\b/.test(clean)) {
    return { action: 'draw_shape', shape: 'diamond', color: extractColor(clean), size: extractSize(clean) }
  }

  // ---- WRITE TEXT ----
  const writeMatch = clean.match(/\b(?:write|type|text|put|add text|say|print)\b\s*(.+)/)
  if (writeMatch && writeMatch[1]) {
    const color = extractColor(clean)
    const textContent = writeMatch[1]
      .replace(/\b(in |with |using |color )?(red|blue|green|yellow|orange|purple|violet|pink|white|black|cyan|indigo)\b/g, '')
      .replace(/\b(big|small|large|medium|tiny|huge)\b/g, '')
      .trim()
    if (textContent) {
      return { action: 'write_text', text: textContent, color, fontSize: extractTextSize(clean) }
    }
  }

  return null
}

function extractColor(text) {
  const match = text.match(/\b(red|blue|green|yellow|orange|purple|violet|pink|white|black|cyan|gray|grey|indigo)\b/)
  return match ? mapColor(match[1]) : null
}

function extractSize(text) {
  if (/\b(big|large|huge)\b/.test(text)) return 'large'
  if (/\b(small|tiny|little)\b/.test(text)) return 'small'
  return 'medium'
}

function extractTextSize(text) {
  if (/\b(big|large|huge)\b/.test(text)) return 48
  if (/\b(small|tiny|little)\b/.test(text)) return 18
  return 28
}

function mapColor(name) {
  const map = {
    red: '#ef4444', blue: '#3b82f6', green: '#10b981', yellow: '#f59e0b',
    orange: '#f97316', purple: '#8b5cf6', violet: '#8b5cf6', pink: '#ec4899',
    white: '#ffffff', black: '#1e293b', cyan: '#06b6d4', gray: '#64748b',
    grey: '#64748b', indigo: '#6366f1',
  }
  return map[name] || '#6366f1'
}
