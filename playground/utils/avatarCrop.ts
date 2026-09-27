export function avatarCrop(width: number, height: number, zoom: number, horizontal: number, vertical: number) {
  if (![width, height, zoom, horizontal, vertical].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new Error('Invalid image crop')
  }
  const size = Math.min(width, height) / Math.max(1, Math.min(zoom, 4))
  return {
    x: (width - size) * Math.max(0, Math.min(horizontal, 100)) / 100,
    y: (height - size) * Math.max(0, Math.min(vertical, 100)) / 100,
    size,
  }
}
