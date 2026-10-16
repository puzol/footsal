import { ROD } from "./constants.js"

const ROD_CODES = ["Digit1", "Digit2", "Digit3"]

export function createInput(canvas) {
  const held = new Map()
  const active = []
  let charge = null
  let locked = false
  let space = false

  const api = {
    get locked() {
      return locked
    },
    get space() {
      return space
    },
    get active() {
      return active.map((code) => ROD_CODES.indexOf(code))
    },
    chargeState,
    onActive: () => {},
    onSlide: () => {},
    onTilt: () => {},
    onSwing: () => {},
    onReset: () => {},
  }

  function emitActive() {
    api.onActive(api.active)
  }

  function press(code, time) {
    if (!ROD_CODES.includes(code) || held.has(code)) return
    held.set(code, time)
    if (active.includes(code)) return
    if (active.length >= 2) active.shift()
    active.push(code)
    emitActive()
  }

  function release(code) {
    if (!held.has(code)) return
    held.delete(code)
    const index = active.indexOf(code)
    if (index >= 0) active.splice(index, 1)
    if (active.length < 2) {
      let best = null
      let bestTime = -1
      for (const [heldCode, heldTime] of held) {
        if (active.includes(heldCode)) continue
        if (heldTime > bestTime) {
          bestTime = heldTime
          best = heldCode
        }
      }
      if (best) active.push(best)
    }
    emitActive()
  }

  function chargeState() {
    if (!charge) return null
    const amount = Math.min((performance.now() - charge.t0) / 1000 / ROD.chargeTime, 1)
    const backpass = charge.button === 2
    return {
      backpass,
      power: backpass ? amount * ROD.backpassScale : amount,
      cap: backpass ? ROD.backpassScale : 1,
    }
  }

  function beginCharge(button) {
    if (charge || (button !== 0 && button !== 2)) return
    charge = { button, t0: performance.now() }
  }

  function endCharge(button) {
    if (!charge || charge.button !== button) return
    const state = chargeState()
    charge = null
    if (locked && state) api.onSwing(state.power, !state.backpass)
  }

  canvas.addEventListener("mousedown", (event) => {
    if (!locked) {
      if (event.button === 0) canvas.requestPointerLock()
      return
    }
    beginCharge(event.button)
  })

  window.addEventListener("mouseup", (event) => endCharge(event.button))

  window.addEventListener("mousemove", (event) => {
    if (!locked) return
    if (event.movementY) api.onSlide(-event.movementY * ROD.slidePerPx)
  })

  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!locked) return
      event.preventDefault()
      let dy = event.deltaY
      if (event.deltaMode === 1) dy *= 16
      if (event.deltaMode === 2) dy *= window.innerHeight
      api.onTilt((-dy / 100) * ROD.tiltPerNotch)
    },
    { passive: false },
  )

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault()
      space = true
      return
    }
    if (event.repeat) return
    if (event.code === "KeyR") {
      api.onReset()
      return
    }
    press(event.code, performance.now())
  })

  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") space = false
    release(event.code)
  })

  window.addEventListener("blur", () => {
    for (const code of [...held.keys()]) release(code)
    charge = null
    space = false
  })

  document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === canvas
    if (!locked) charge = null
  })

  window.addEventListener("contextmenu", (event) => event.preventDefault())

  return api
}
