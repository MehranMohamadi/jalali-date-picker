import { describe, expect, it } from 'vitest'
import { avatarCrop } from '../playground/utils/avatarCrop'

describe('avatar crop bounds', () => {
  it('centers portrait and landscape images without stretching', () => {
    expect(avatarCrop(800, 400, 1, 50, 50)).toEqual({ x: 200, y: 0, size: 400 })
    expect(avatarCrop(400, 800, 1, 50, 50)).toEqual({ x: 0, y: 200, size: 400 })
  })

  it('keeps the crop within the image at each corner and zoom level', () => {
    for (const [width, height] of [[100, 500], [500, 100], [300, 300]]) {
      for (const zoom of [1, 2, 4]) {
        for (const horizontal of [0, 50, 100]) {
          for (const vertical of [0, 50, 100]) {
            const crop = avatarCrop(width, height, zoom, horizontal, vertical)
            expect(crop.x).toBeGreaterThanOrEqual(0)
            expect(crop.y).toBeGreaterThanOrEqual(0)
            expect(crop.x + crop.size).toBeLessThanOrEqual(width)
            expect(crop.y + crop.size).toBeLessThanOrEqual(height)
          }
        }
      }
    }
  })

  it('clamps controls and rejects invalid image dimensions', () => {
    expect(avatarCrop(400, 800, 0, -10, 110)).toEqual({ x: 0, y: 400, size: 400 })
    expect(() => avatarCrop(0, 800, 1, 50, 50)).toThrow()
    expect(() => avatarCrop(400, NaN, 1, 50, 50)).toThrow()
  })
})
