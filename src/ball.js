import * as THREE from "three"
import { BALL, MAGNET, ROD, TABLE } from "./constants.js"
import { CANNON } from "./world.js"

const ballPoint = new CANNON.Vec3()
const localPoint = new CANNON.Vec3()
const clampedPoint = new CANNON.Vec3()
const closestPoint = new CANNON.Vec3()

export function createBall(scene, world, mats, legs) {
  const texture = ballTexture()
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(BALL.radius, 24, 16),
    new THREE.MeshLambertMaterial({ map: texture, color: 0xffffff }),
  )
  scene.add(mesh)

  const body = new CANNON.Body({
    mass: BALL.mass,
    material: mats.ball,
    linearDamping: BALL.linearDamping,
    angularDamping: BALL.angularDamping,
    allowSleep: true,
  })
  body.addShape(new CANNON.Sphere(BALL.radius))
  world.addBody(body)

  const score = { mi: 0, oni: 0 }
  const state = {
    magnet: false,
    touchingLeg: false,
    last: "kickoff",
    dir: 1,
  }

  function kickoff(reason) {
    const dir = Math.random() < 0.5 ? -1 : 1
    body.position.set(0, BALL.radius + 0.03, 0)
    body.velocity.set(0, 0, dir * BALL.kickoffSpeed)
    body.angularVelocity.set(0, 0, 0)
    body.wakeUp()
    state.dir = dir
    const arrow = dir > 0 ? "→" : "←"
    state.last = reason ? `${reason} · kickoff ${arrow}` : `kickoff ${arrow}`
    syncMesh()
  }

  function place(x, y, z, vx = 0, vy = 0, vz = 0) {
    body.position.set(x, y, z)
    body.velocity.set(vx, vy, vz)
    body.angularVelocity.set(0, 0, 0)
    body.wakeUp()
    syncMesh()
  }

  function affect(dt, receiveHeld) {
    state.magnet = false
    state.rebuff = false
    state.touchingLeg = false
    ballPoint.copy(body.position)

    for (const leg of legs) {
      const info = gapToLeg(leg)
      if (!info) continue
      if (info.gap < MAGNET.frictionGap) state.touchingLeg = true

      const rod = leg.rod
      const gathering = rod.receive && (rod.swing?.mode === "gather" || rod.cup)
      const holding = (rod.active && receiveHeld) || gathering || (rod.receive && !rod.swing)
      const boost = wallBoost(body.position)
      const range = MAGNET.range * (gathering ? 1.35 : 1) * (1 + (boost - 1) * 0.55)
      const inReach = info.gap < range && info.gap > -BALL.radius
      if ((rod.swing && !gathering) || !holding || !inReach) continue

      const vel = pointVelocity(rod, info.closest)
      const speed = Math.hypot(
        body.velocity.x - vel.x,
        body.velocity.y - vel.y,
        body.velocity.z - vel.z,
      )
      const align = footAlign(rod.angle, info.dir)
      const alignMin = gathering ? 0.28 : MAGNET.catchAlign
      const speedMax = gathering ? MAGNET.catchSpeed * 1.8 : MAGNET.catchSpeed
      const onWall = boost > 1.15
      if (speed > speedMax || (!onWall && align < alignMin)) {
        state.rebuff = true
        continue
      }

      const t = info.gap > 0 ? 1 - info.gap / range : 1
      const pull = boost
      const seat = gathering ? 0.22 : 1
      if (info.gap > 0) {
        const accel = MAGNET.accel * pull * t * t
        body.velocity.x += info.dir.x * accel * dt
        body.velocity.y += info.dir.y * accel * dt
        body.velocity.z += info.dir.z * accel * dt
      }
      const damp = MAGNET.frictionDamp * pull * seat * t
      body.velocity.x += (vel.x - body.velocity.x) * damp
      body.velocity.z += (vel.z - body.velocity.z) * damp
      body.velocity.y += (vel.y - body.velocity.y) * damp * 0.35
      const stick = MAGNET.stick * pull * seat * t
      body.velocity.x += (vel.x - body.velocity.x) * stick
      body.velocity.z += (vel.z - body.velocity.z) * stick * 0.55
      const dx = rod.slide + leg.localX - body.position.x
      body.velocity.x += dx * 8 * pull * (gathering ? 0.45 : 1)
      if (info.gap > 0.003) rod.separated = true
      state.magnet = true
      body.wakeUp()
    }
  }

  function clampSpeed() {
    const speed = body.velocity.length()
    if (speed > BALL.maxSpeed) body.velocity.scale(BALL.maxSpeed / speed, body.velocity)
  }

  function zones() {
    const x = body.position.x
    const y = body.position.y
    const z = body.position.z
    const inMouth = Math.abs(x) < TABLE.goalHalf && y < 0.12 && y > -0.08
    if (inMouth && z > TABLE.halfL && z < TABLE.goalOuter) {
      score.mi += 1
      kickoff("gol mi")
      return "gol"
    }
    if (inMouth && z < -TABLE.halfL && z > -TABLE.goalOuter) {
      score.oni += 1
      kickoff("gol oni")
      return "gol"
    }

    const onTable = Math.abs(x) < TABLE.halfW + 0.03 && Math.abs(z) < TABLE.halfL + 0.03 && y > -0.05
    if (!onTable || y < -0.08) {
      kickoff("aut")
      return "aut"
    }
    return null
  }

  function syncMesh() {
    mesh.position.set(body.position.x, body.position.y, body.position.z)
    mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
  }

  function gapToLeg(leg) {
    leg.body.pointToLocalFrame(ballPoint, localPoint)
    closestOnBox(localPoint, leg.half, clampedPoint)
    leg.body.pointToWorldFrame(clampedPoint, closestPoint)
    const dx = closestPoint.x - ballPoint.x
    const dy = closestPoint.y - ballPoint.y
    const dz = closestPoint.z - ballPoint.z
    const dist = Math.hypot(dx, dy, dz)
    if (dist > 0.12) return null
    const gap = dist - BALL.radius
    const inv = dist > 1e-6 ? 1 / dist : 0
    return {
      gap,
      closest: { x: closestPoint.x, y: closestPoint.y, z: closestPoint.z },
      dir: { x: dx * inv, y: dy * inv, z: dz * inv },
    }
  }

  kickoff()

  return { body, mesh, score, state, kickoff, place, affect, clampSpeed, zones, syncMesh }
}

function wallBoost(position) {
  const side = TABLE.halfW - TABLE.railT - Math.abs(position.x) - BALL.radius
  const end = TABLE.halfL - TABLE.railT - Math.abs(position.z) - BALL.radius
  const clear = Math.min(side, end)
  if (clear >= MAGNET.wallBand) return 1
  const t = (MAGNET.wallBand - Math.max(clear, 0)) / MAGNET.wallBand
  return 1 + t * MAGNET.wallBoost
}

function footAlign(angle, dirTowardFoot) {
  const ny = -Math.sin(angle)
  const nz = Math.cos(angle)
  const yz = Math.hypot(dirTowardFoot.y, dirTowardFoot.z)
  const full = Math.hypot(dirTowardFoot.x, yz)
  if (full < 1e-4 || yz < 1e-4) return 0
  const facing = Math.abs((ny * dirTowardFoot.y + nz * dirTowardFoot.z) / yz)
  return facing * (yz / full)
}

function pointVelocity(rod, point) {
  const ry = point.y - ROD.y
  const rz = point.z - rod.z
  const w = rod.angleVel
  return { x: rod.slideVel, y: -w * rz, z: w * ry }
}

function closestOnBox(local, half, out) {
  const inside =
    Math.abs(local.x) <= half.x && Math.abs(local.y) <= half.y && Math.abs(local.z) <= half.z
  if (!inside) {
    out.x = clamp(local.x, -half.x, half.x)
    out.y = clamp(local.y, -half.y, half.y)
    out.z = clamp(local.z, -half.z, half.z)
    return
  }
  const dx = half.x - Math.abs(local.x)
  const dy = half.y - Math.abs(local.y)
  const dz = half.z - Math.abs(local.z)
  out.x = local.x
  out.y = local.y
  out.z = local.z
  if (dx <= dy && dx <= dz) out.x = Math.sign(local.x || 1) * half.x
  else if (dy <= dz) out.y = Math.sign(local.y || 1) * half.y
  else out.z = Math.sign(local.z || 1) * half.z
}

function ballTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#f3efe6"
  ctx.fillRect(0, 0, 64, 64)
  ctx.strokeStyle = "#222"
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(32, 32, 16, 0, Math.PI * 2)
  ctx.stroke()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
