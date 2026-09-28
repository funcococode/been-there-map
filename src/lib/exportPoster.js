import sansUrl from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url'
import monoUrl from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url'

// An SVG drawn into a canvas can't see the page's fonts, so we embed them.
let fontCss
async function embeddedFonts() {
  if (fontCss) return fontCss
  const toData = async (url) => {
    const buf = await (await fetch(url)).blob()
    return new Promise((res) => {
      const r = new FileReader()
      r.onload = () => res(r.result)
      r.readAsDataURL(buf)
    })
  }
  const [sans, mono] = await Promise.all([toData(sansUrl), toData(monoUrl)])
  fontCss = `
    @font-face { font-family: 'Geist Variable'; font-weight: 100 900; src: url(${sans}) format('woff2'); }
    @font-face { font-family: 'Geist Mono Variable'; font-weight: 100 900; src: url(${mono}) format('woff2'); }`
  return fontCss
}

/** Poster <svg> element → PNG Blob (scale 2 = 2160px wide). */
export async function posterToPng(svgEl, scale = 2) {
  const clone = svgEl.cloneNode(true)
  clone.removeAttribute('style')
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = await embeddedFonts()
  clone.insertBefore(style, clone.firstChild)
  const w = +clone.getAttribute('width')
  const h = +clone.getAttribute('height')

  const xml = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.decoding = 'sync'
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = rej
      img.src = url
    })
    // give the embedded fonts a beat to apply inside the image (Safari)
    await new Promise((r) => setTimeout(r, 60))
    const canvas = document.createElement('canvas')
    canvas.width = w * scale
    canvas.height = h * scale
    const c = canvas.getContext('2d')
    c.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise((res) => canvas.toBlob(res, 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function download(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** Native share sheet with the image when the device supports it. */
export async function shareImage(blob, filename, text) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text })
    return true
  }
  return false
}
