import { createContext, useContext, useReducer } from 'react'

const DrawingContext = createContext(null)

const initialState = {
  role: null, // 'teacher' | 'student'
  sessionId: null,
  tool: 'freehand', // 'freehand' | 'line' | 'rectangle' | 'circle' | 'triangle' | 'eraser'
  color: '#6366f1',
  brushSize: 3,
  isDrawing: false,
  isConnected: false,
  gesture: 'none',
  strokes: [],
  currentStroke: null,
  showWebcam: true,
  webcamFrame: null,
  handLandmarks: null,
  indexPosition: null,
}

function drawingReducer(state, action) {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.payload }
    case 'SET_SESSION':
      return { ...state, sessionId: action.payload }
    case 'SET_TOOL':
      return { ...state, tool: action.payload }
    case 'SET_COLOR':
      return { ...state, color: action.payload }
    case 'SET_BRUSH_SIZE':
      return { ...state, brushSize: action.payload }
    case 'SET_DRAWING':
      return { ...state, isDrawing: action.payload }
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload }
    case 'SET_GESTURE':
      return { ...state, gesture: action.payload }
    case 'ADD_STROKE':
      return { ...state, strokes: [...state.strokes, action.payload] }
    case 'SET_CURRENT_STROKE':
      return { ...state, currentStroke: action.payload }
    case 'UNDO':
      return { ...state, strokes: state.strokes.slice(0, -1) }
    case 'CLEAR':
      return { ...state, strokes: [], currentStroke: null }
    case 'SET_STROKES':
      return { ...state, strokes: action.payload }
    case 'TOGGLE_WEBCAM':
      return { ...state, showWebcam: !state.showWebcam }
    case 'SET_WEBCAM_FRAME':
      return { ...state, webcamFrame: action.payload }
    case 'SET_HAND_LANDMARKS':
      return { ...state, handLandmarks: action.payload }
    case 'SET_INDEX_POSITION':
      return { ...state, indexPosition: action.payload }
    default:
      return state
  }
}

export function DrawingProvider({ children }) {
  const [state, dispatch] = useReducer(drawingReducer, initialState)
  return (
    <DrawingContext.Provider value={{ state, dispatch }}>
      {children}
    </DrawingContext.Provider>
  )
}

export function useDrawing() {
  const context = useContext(DrawingContext)
  if (!context) throw new Error('useDrawing must be used within DrawingProvider')
  return context
}
