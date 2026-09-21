import { describe, expect, it } from 'vitest'
import { controlForKey } from './input'

describe('controlForKey', () => {
  it.each(['ArrowLeft', 'a', 'A'])(
    'maps %s to left movement',
    (key) => {
      expect(controlForKey(key)).toBe('left')
    },
  )

  it.each(['ArrowRight', 'd', 'D'])(
    'maps %s to right movement',
    (key) => {
      expect(controlForKey(key)).toBe('right')
    },
  )

  it('maps Space and ignores unrelated keys', () => {
    expect(controlForKey(' ')).toBe('start')
    expect(controlForKey('Enter')).toBeNull()
  })
})
