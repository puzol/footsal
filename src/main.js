import * as THREE from "three"
import { createAi } from "./ai.js"
import { createBall } from "./ball.js"
import { FIXED_DT } from "./constants.js"
import { createInput } from "./input.js"
import { createRods } from "./rods.js"
import { createTable } from "./table.js"
import { createWorld } from "./world.js"

const canvas = document.querySelector("#view")
const help = document.querySelector("#help")
const scoreEl = document.querySelector("#score")
const statusEl = document.querySelector("#status")
const meter = document.querySelector("#meter")
const meterFill = document.querySelector("#meter-fill")

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x17191d)
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 30)
camera.position.set(-1.18, 0.96, 0.02)
camera.lookAt(0, 0.02, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.62))
const sun = new THREE.DirectionalLight(0xffffff, 1.25)
sun.position.set(-0.85, 1.6, 0.35)
scene.add(sun)

const { world, mats } = createWorld()
createTable(scene, world, mats)
const rods = createRods(scene, world, mats)
const ball = createBall(scene, world, mats, rods.legs)

const ai = createAi(rods, ball)

const input = createInput(canvas)
input.onActive = (indices) => rods.setActive(indices)
input.onSlide = (delta) => rods.slide(delta)
input.onTilt = (delta) => rods.tilt(delta)
input.onSwing = (power, forward) => rods.startSwing(power, forward, ball.body)
input.onReset = () => ball.kickoff()

function tick(dt) {
  ai.update(dt)
  rods.integrate(dt)
  rods.writeBodies(dt)
  ball.affect(dt, input.space)
  world.step(dt)
  ball.clampSpeed()
  ball.zones()
  ball.syncMesh()
}

let last = performance.now()
let acc = 0

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  acc += dt
  let steps = 0
  while (acc >= FIXED_DT && steps < 8) {
    tick(FIXED_DT)
    acc -= FIXED_DT
    steps += 1
  }
  paintHud()
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

function paintHud() {
  const active = rods.rods.filter((rod) => rod.active).map((rod) => rod.key)
  help.textContent = input.locked
    ? "1 2 3 drži šipku · miš gore–dolje kliza · scroll nagib · razmaknica prijem · lijevi šut · desni backpass · R nova lopta · Esc miš"
    : "Klikni na stol. 1 2 3 drži šipku, miš gore–dolje je klizanje, scroll je nagib, razmaknica je prijem."
  scoreEl.textContent = `Mi ${ball.score.mi}  —  ${ball.score.oni} Oni`
  const speed = ball.body.velocity.length()
  const activeLabel = active.length ? active.join(" ") : "—"
  const magnetLabel = ball.state.magnet ? "da" : ball.state.rebuff ? "odbitak" : "ne"
  statusEl.textContent = `šipke ${activeLabel}   brzina ${speed.toFixed(2)}   magnet ${magnetLabel}   ${ball.state.last}`

  const charge = input.chargeState()
  meter.classList.toggle("on", Boolean(charge))
  meterFill.style.width = charge ? `${charge.power * 100}%` : "0%"
  meterFill.style.background = charge?.backpass ? "#7eb6ff" : "#f0f0f0"
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

window.__footsal = {
  world,
  rods,
  ball,
  input,
  step: tick,
  placeBall: (x, y, z, vx, vy, vz) => ball.place(x, y, z, vx, vy, vz),
  state: () => ({
    score: { ...ball.score },
    last: ball.state.last,
    magnet: ball.state.magnet,
    pos: ball.body.position.clone(),
    vel: ball.body.velocity.clone(),
    active: rods.rods.filter((rod) => rod.active).map((rod) => rod.key),
    rods: rods.rods
      .filter((rod) => rod.team === "ours")
      .map((rod) => ({
        key: rod.key,
        slide: rod.slide,
        angle: rod.angle,
        swinging: Boolean(rod.swing),
      })),
  }),
}

requestAnimationFrame(frame)
