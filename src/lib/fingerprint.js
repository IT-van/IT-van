// Lightweight browser fingerprint (no external deps)
// Combines multiple browser signals into a stable ID

export async function getFingerprint() {
  const cached = sessionStorage.getItem('nx_fp')
  if (cached) return cached

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.platform || '',
    // Canvas fingerprint
    await getCanvasFingerprint(),
    // WebGL renderer
    getWebGLFingerprint(),
  ]

  const raw = components.join('|||')
  const hash = await sha256(raw)

  sessionStorage.setItem('nx_fp', hash)
  return hash
}

async function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('Nexus 🔮', 2, 15)
    return canvas.toDataURL().slice(-50)
  } catch {
    return 'no-canvas'
  }
}

function getWebGLFingerprint() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    if (!gl) return 'no-webgl'
    const renderer = gl.getParameter(gl.RENDERER)
    const vendor = gl.getParameter(gl.VENDOR)
    return `${vendor}::${renderer}`
  } catch {
    return 'no-webgl'
  }
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
