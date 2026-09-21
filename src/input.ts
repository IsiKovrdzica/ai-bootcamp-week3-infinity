import type { PlayerInput } from './game'

type Control = 'left' | 'right' | 'start'

export function controlForKey(key: string): Control | null {
  if (key === 'ArrowLeft' || key.toLowerCase() === 'a') return 'left'
  if (key === 'ArrowRight' || key.toLowerCase() === 'd') return 'right'
  if (key === ' ') return 'start'
  return null
}

export class InputController {
  private leftPressed = false
  private rightPressed = false
  private startRequested = false

  constructor(target: Window) {
    target.addEventListener('keydown', (event) => {
      const control = controlForKey(event.key)
      if (control === null) return
      event.preventDefault()
      if (control === 'left') this.leftPressed = true
      if (control === 'right') this.rightPressed = true
      if (control === 'start') this.startRequested = true
    })

    target.addEventListener('keyup', (event) => {
      const control = controlForKey(event.key)
      if (control === null) return
      event.preventDefault()
      if (control === 'left') this.leftPressed = false
      if (control === 'right') this.rightPressed = false
    })

    target.addEventListener('blur', () => {
      this.leftPressed = false
      this.rightPressed = false
    })
  }

  read(): PlayerInput {
    const move = this.leftPressed === this.rightPressed ? 0 : this.leftPressed ? -1 : 1
    const input: PlayerInput = { move, start: this.startRequested }
    this.startRequested = false
    return input
  }
}
