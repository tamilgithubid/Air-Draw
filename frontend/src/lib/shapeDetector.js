/**
 * Smart shape detection and auto-correction.
 * Analyzes freehand points and snaps to perfect geometric shapes.
 */

export function detectAndCorrectShape(stroke) {
  if (!stroke || stroke.tool !== 'freehand' || !stroke.points || stroke.points.length < 8) {
    return null
  }

  const pts = stroke.points
  const simplified = simplifyPoints(pts, 0.005)
  if (simplified.length < 5) return null

  // Try to detect shapes in order of specificity
  const circle = detectCircle(simplified)
  if (circle) return buildCircleStroke(circle, stroke)

  const rect = detectRectangle(simplified)
  if (rect) return buildRectStroke(rect, stroke)

  const triangle = detectTriangle(simplified)
  if (triangle) return buildTriangleStroke(triangle, stroke)

  const line = detectLine(simplified)
  if (line) return buildLineStroke(line, stroke)

  return null
}

// Ramer-Douglas-Peucker point simplification
function simplifyPoints(pts, epsilon) {
  if (pts.length < 3) return pts

  let maxDist = 0
  let maxIdx = 0
  const first = pts[0]
  const last = pts[pts.length - 1]

  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpendicularDistance(pts[i], first, last)
    if (d > maxDist) {
      maxDist = d
      maxIdx = i
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPoints(pts.slice(0, maxIdx + 1), epsilon)
    const right = simplifyPoints(pts.slice(maxIdx), epsilon)
    return [...left.slice(0, -1), ...right]
  }

  return [first, last]
}

function perpendicularDistance(pt, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y)

  let t = ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))

  const projX = lineStart.x + t * dx
  const projY = lineStart.y + t * dy
  return Math.hypot(pt.x - projX, pt.y - projY)
}

// --- Circle Detection ---
function detectCircle(pts) {
  // Compute centroid
  let cx = 0, cy = 0
  for (const p of pts) { cx += p.x; cy += p.y }
  cx /= pts.length
  cy /= pts.length

  // Compute average radius and variance
  const radii = pts.map((p) => Math.hypot(p.x - cx, p.y - cy))
  const avgR = radii.reduce((a, b) => a + b, 0) / radii.length
  const variance = radii.reduce((sum, r) => sum + (r - avgR) ** 2, 0) / radii.length
  const stdDev = Math.sqrt(variance)

  // Check if path is closed (start ~= end)
  const closeDist = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y)
  const isClosed = closeDist < avgR * 1.2

  // Circle: low radius variance + closed path
  const coefficient = stdDev / avgR
  if (coefficient < 0.25 && isClosed) {
    return { cx, cy, rx: avgR, ry: avgR, confidence: 1 - coefficient }
  }

  // Ellipse: check with separate x/y radii
  const radiiX = pts.map((p) => Math.abs(p.x - cx))
  const radiiY = pts.map((p) => Math.abs(p.y - cy))
  const avgRx = radiiX.reduce((a, b) => a + b, 0) / radiiX.length
  const avgRy = radiiY.reduce((a, b) => a + b, 0) / radiiY.length

  if (isClosed && avgRx > 0.01 && avgRy > 0.01) {
    // Check how well points fit an ellipse
    const ellipseErrors = pts.map((p) => {
      const nx = (p.x - cx) / avgRx
      const ny = (p.y - cy) / avgRy
      return Math.abs(nx * nx + ny * ny - 1)
    })
    const avgError = ellipseErrors.reduce((a, b) => a + b, 0) / ellipseErrors.length
    if (avgError < 0.5) {
      return { cx, cy, rx: avgRx, ry: avgRy, confidence: 1 - avgError }
    }
  }

  return null
}

// --- Line Detection ---
function detectLine(pts) {
  if (pts.length < 3) return null

  const first = pts[0]
  const last = pts[pts.length - 1]
  const lineLen = Math.hypot(last.x - first.x, last.y - first.y)
  if (lineLen < 0.03) return null

  // Check max perpendicular deviation
  let maxDev = 0
  for (const p of pts) {
    const d = perpendicularDistance(p, first, last)
    if (d > maxDev) maxDev = d
  }

  const ratio = maxDev / lineLen
  if (ratio < 0.08) {
    return { start: first, end: last, confidence: 1 - ratio * 5 }
  }

  return null
}

// --- Rectangle Detection ---
function detectRectangle(pts) {
  const corners = findCorners(pts, 4)
  if (!corners || corners.length !== 4) return null

  // Check if closed
  const closeDist = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y)
  if (closeDist > 0.1) return null

  // Check angles are ~90 degrees
  const angles = []
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    const c = corners[(i + 2) % 4]
    const angle = getAngle(a, b, c)
    angles.push(angle)
  }

  const avgAngleDev = angles.reduce((sum, a) => sum + Math.abs(a - 90), 0) / 4
  if (avgAngleDev < 25) {
    // Compute bounding box from corners
    const xs = corners.map((c) => c.x)
    const ys = corners.map((c) => c.y)
    return {
      x: Math.min(...xs), y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
      confidence: 1 - avgAngleDev / 25,
    }
  }

  return null
}

// --- Triangle Detection ---
function detectTriangle(pts) {
  const corners = findCorners(pts, 3)
  if (!corners || corners.length !== 3) return null

  const closeDist = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y)
  if (closeDist > 0.12) return null

  // Check that angles sum to ~180
  const a1 = getAngle(corners[2], corners[0], corners[1])
  const a2 = getAngle(corners[0], corners[1], corners[2])
  const a3 = getAngle(corners[1], corners[2], corners[0])
  const sum = a1 + a2 + a3

  if (Math.abs(sum - 180) < 30 && a1 > 15 && a2 > 15 && a3 > 15) {
    return { points: corners, confidence: 1 - Math.abs(sum - 180) / 30 }
  }

  return null
}

// --- Helpers ---
function findCorners(pts, targetCount) {
  // Find points with highest curvature
  if (pts.length < targetCount + 2) return null

  const curvatures = []
  const step = Math.max(1, Math.floor(pts.length / 30))

  for (let i = step; i < pts.length - step; i++) {
    const prev = pts[i - step]
    const curr = pts[i]
    const next = pts[i + step]
    const angle = getAngle(prev, curr, next)
    curvatures.push({ index: i, angle, point: curr })
  }

  // Sort by sharpest angle (smallest = sharpest turn)
  curvatures.sort((a, b) => a.angle - b.angle)

  // Pick corners that are far enough apart
  const corners = []
  const minDist = 0.04

  for (const c of curvatures) {
    if (corners.length >= targetCount) break
    const tooClose = corners.some((existing) =>
      Math.hypot(existing.x - c.point.x, existing.y - c.point.y) < minDist
    )
    if (!tooClose && c.angle < 150) {
      corners.push(c.point)
    }
  }

  if (corners.length === targetCount) {
    // Sort corners by angle from centroid for consistent ordering
    const cx = corners.reduce((s, p) => s + p.x, 0) / corners.length
    const cy = corners.reduce((s, p) => s + p.y, 0) / corners.length
    corners.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))
    return corners
  }

  return null
}

function getAngle(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y }
  const v2 = { x: c.x - b.x, y: c.y - b.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const cross = v1.x * v2.y - v1.y * v2.x
  const angle = Math.atan2(Math.abs(cross), dot) * (180 / Math.PI)
  return angle
}

// --- Build corrected strokes ---
function buildCircleStroke(circle, original) {
  return {
    ...original,
    tool: 'circle',
    points: [
      { x: circle.cx - circle.rx, y: circle.cy - circle.ry },
      { x: circle.cx + circle.rx, y: circle.cy + circle.ry },
    ],
    autoCorrected: true,
    shapeType: 'circle',
    confidence: circle.confidence,
  }
}

function buildRectStroke(rect, original) {
  return {
    ...original,
    tool: 'rectangle',
    points: [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.w, y: rect.y + rect.h },
    ],
    autoCorrected: true,
    shapeType: 'rectangle',
    confidence: rect.confidence,
  }
}

function buildTriangleStroke(tri, original) {
  return {
    ...original,
    tool: 'triangle',
    points: [tri.points[0], tri.points[2]], // top and bottom-right approximation
    autoCorrected: true,
    shapeType: 'triangle',
    confidence: tri.confidence,
  }
}

function buildLineStroke(line, original) {
  return {
    ...original,
    tool: 'line',
    points: [line.start, line.end],
    autoCorrected: true,
    shapeType: 'line',
    confidence: line.confidence,
  }
}

/**
 * Smooth a set of points using a moving average.
 */
export function smoothPoints(pts, windowSize = 3) {
  if (pts.length < windowSize) return pts
  const smoothed = []
  const half = Math.floor(windowSize / 2)

  for (let i = 0; i < pts.length; i++) {
    let sx = 0, sy = 0, count = 0
    for (let j = Math.max(0, i - half); j <= Math.min(pts.length - 1, i + half); j++) {
      sx += pts[j].x
      sy += pts[j].y
      count++
    }
    smoothed.push({ x: sx / count, y: sy / count })
  }

  return smoothed
}
