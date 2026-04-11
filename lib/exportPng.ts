import { toPng } from 'html-to-image'

/**
 * Captures the React Flow canvas and downloads it as a PNG.
 * Looks for the .react-flow element in the DOM.
 */
export async function exportArchitecturePng(filename: string): Promise<void> {
  const el = document.querySelector<HTMLElement>('.react-flow')
  if (!el) return

  const dataUrl = await toPng(el, {
    backgroundColor: '#020b0f',
    pixelRatio: 2,
    // Exclude the Controls and MiniMap overlays from the capture
    filter: (node) => {
      if (node instanceof HTMLElement) {
        if (node.classList.contains('react-flow__controls')) return false
        if (node.classList.contains('react-flow__minimap')) return false
        if (node.classList.contains('react-flow__attribution')) return false
      }
      return true
    },
  })

  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${filename}.png`
  a.click()
}
