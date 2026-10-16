import * as THREE from "three"
import { FIGURE, OURS, ROD, TABLE, THEIRS } from "./constants.js"
import { CANNON, holdKinematic, setBoxPose } from "./world.js"

const VERT = `
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const FRAG = `
  varying vec3 vNormal;
  varying vec3 vWorld;
  uniform vec3 uColor;
  uniform vec3 uLight;
  uniform vec3 uRim;
  uniform float uActive;
  void main() {
    vec3 n = normalize(vNormal);
    float lambert = 0.3 + 0.7 * max(dot(n, normalize(uLight)), 0.0);
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.15);
    vec3 color = uColor * lambert + uRim * rim * uActive;
    gl_FragColor = vec4(color, 1.0);
  }
`

function playerMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uLight: { value: new THREE.Vector3(-0.35, 0.86, 0.28).normalize() },
      uRim: { value: new THREE.Color(0xffc56d) },
      uActive: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  })
}

function slideLimit(xs) {
  const reach = TABLE.halfW - TABLE.railT - FIGURE.leg.x / 2
  return reach - Math.max(...xs.map((x) => Math.abs(x)))
}

export function createRods(scene, world, mats) {
  const rods = []
  const legs = []

  function addTeam(layout, team) {
    const footSign = team === "ours" ? 1 : -1
    const bodyColor = team === "ours" ? 0x3c78e8 : 0xd24b4b
    const legColor = team === "ours" ? 0x2457b0 : 0x9a3030
    for (const spec of layout) {
      const rod = {
        team,
        key: spec.key ?? "",
        z: spec.z,
        xs: spec.xs,
        slide: 0,
        slideTarget: 0,
        slideVel: 0,
        angle: 0,
        angleVel: 0,
        rest: 0,
        swing: null,
        active: false,
        footSign,
        forwardSign: team === "ours" ? ROD.shotAngleSign : -ROD.shotAngleSign,
        receive: false,
        cup: false,
        separated: false,
        limit: slideLimit(spec.xs),
        materials: [],
        group: new THREE.Group(),
        parts: [],
      }
      rod.group.position.set(0, ROD.y, spec.z)
      scene.add(rod.group)

      const handleSide = team === "ours" ? -1 : 1
      const barMat = playerMaterial(0x9aa3ad)
      const gripMat = playerMaterial(team === "ours" ? 0x1d4f91 : 0x2a2a2a)
      rod.materials.push(barMat, gripMat)
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(ROD.radius, ROD.radius, ROD.length, 10),
        barMat,
      )
      bar.rotation.z = Math.PI / 2
      bar.position.x = handleSide * 0.14
      rod.group.add(bar)

      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.07, 8), gripMat)
      grip.rotation.z = Math.PI / 2
      grip.position.x = handleSide * (0.14 + ROD.length / 2 - 0.04)
      rod.group.add(grip)

      const headMat = playerMaterial(bodyColor)
      const legMat = playerMaterial(legColor)
      rod.materials.push(headMat, legMat)

      for (const localX of spec.xs) {
        const head = new THREE.Mesh(
          new THREE.BoxGeometry(FIGURE.head.x, FIGURE.head.y, FIGURE.head.z),
          headMat,
        )
        head.position.set(localX, FIGURE.head.cy, FIGURE.head.cz * footSign)
        rod.group.add(head)

        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(FIGURE.leg.x, FIGURE.leg.y, FIGURE.leg.z),
          legMat,
        )
        leg.position.set(localX, FIGURE.leg.cy, FIGURE.leg.cz * footSign)
        rod.group.add(leg)

        rod.parts.push(
          makePart(world, mats.head, rod, localX, FIGURE.head.cy, FIGURE.head.cz * footSign, FIGURE.head, "head"),
          makePart(world, mats.leg, rod, localX, FIGURE.leg.cy, FIGURE.leg.cz * footSign, FIGURE.leg, "leg"),
        )
      }

      for (const part of rod.parts) {
        if (part.kind === "leg") legs.push(part)
      }
      rods.push(rod)
    }
  }

  addTeam(OURS, "ours")
  addTeam(THEIRS, "theirs")

  function setActive(indices) {
    const ours = rods.filter((rod) => rod.team === "ours")
    ours.forEach((rod, index) => {
      rod.active = indices.includes(index)
      const flag = rod.active ? 1 : 0
      for (const material of rod.materials) material.uniforms.uActive.value = flag
    })
  }

  function slide(delta) {
    for (const rod of rods) {
      if (!rod.active) continue
      rod.slideTarget = clamp(rod.slideTarget + delta, -rod.limit, rod.limit)
    }
  }

  function tilt(delta) {
    for (const rod of rods) {
      if (!rod.active) continue
      rod.rest += delta
      if (!rod.swing) rod.angle = rod.rest
    }
  }

  function swingRod(rod, power, forward, ballBody) {
    if (!rod || rod.swing || power <= 0) return
    if (!forward && ballBody && !footInFront(rod, rod.angle, ballBody)) {
      const dir = -rod.forwardSign
      const speed = ROD.maxOmega * Math.max(power, ROD.backpassScale * 0.35)
      rod.swing = {
        mode: "backpass",
        omega: dir * speed,
        goal: angleInFront(rod, dir, ballBody),
        returning: false,
      }
      return
    }
    const sign = (forward ? 1 : -1) * rod.forwardSign
    rod.swing = {
      mode: "shot",
      forward,
      omega: sign * ROD.maxOmega * power,
      timeLeft: ROD.swingTime,
      returning: false,
    }
  }

  function gather(rod, ballBody) {
    if (!rod || !ballBody || rod.swing || footInFront(rod, rod.angle, ballBody)) return
    const dir = -rod.forwardSign
    rod.receive = true
    rod.cup = false
    rod.separated = false
    rod.swing = {
      mode: "gather",
      omega: dir * 11,
      goal: angleInFront(rod, dir, ballBody),
      returning: false,
    }
  }

  function startSwing(power, forward, ballBody) {
    for (const rod of rods) {
      if (!rod.active) continue
      swingRod(rod, power, forward, ballBody)
    }
  }

  function integrate(dt) {
    for (const rod of rods) {
      const room = ROD.maxSlideSpeed * dt
      const delta = clamp(rod.slideTarget - rod.slide, -room, room)
      rod.slideVel = delta / dt
      rod.slide += delta

      if (!rod.swing) {
        rod.angle = rod.rest
        rod.angleVel = 0
      } else if (rod.swing.mode === "backpass" || rod.swing.mode === "gather") {
        const next = rod.angle + rod.swing.omega * dt
        const dir = Math.sign(rod.swing.omega) || 1
        const reached = dir > 0 ? next >= rod.swing.goal : next <= rod.swing.goal
        if (reached) {
          const cupped = rod.swing.mode === "gather"
          rod.angle = rod.swing.goal
          rod.rest = rod.swing.goal
          rod.angleVel = 0
          rod.swing = null
          if (cupped) rod.cup = true
        } else {
          rod.angle = next
          rod.angleVel = rod.swing.omega
        }
      } else if (!rod.swing.returning) {
        const previous = rod.angle
        rod.angle += rod.swing.omega * dt
        rod.angleVel = (rod.angle - previous) / dt
        rod.swing.timeLeft -= dt
        if (rod.swing.timeLeft <= 0) {
          rod.swing.returning = true
          if (rod.swing.forward) rod.rest = nearestUpright(rod.angle)
        }
      } else {
        const previous = rod.angle
        const k = 1 - Math.exp(-ROD.returnRate * dt)
        rod.angle += (rod.rest - rod.angle) * k
        rod.angleVel = (rod.angle - previous) / dt
        if (Math.abs(rod.angle - rod.rest) < 0.012) {
          rod.angle = rod.rest
          rod.angleVel = 0
          rod.swing = null
        }
      }

      rod.group.position.x = rod.slide
      rod.group.rotation.x = rod.angle
    }
  }

  function writeBodies(dt) {
    for (const rod of rods) {
      const collide = !(
        rod.swing && (rod.swing.returning || rod.swing.mode === "backpass" || rod.swing.mode === "gather")
        || rod.cup
      )
      for (const part of rod.parts) {
        const offset = part.offset.clone().applyAxisAngle(part.axis, rod.angle)
        const x = rod.slide + part.localX
        const y = ROD.y + offset.y
        const z = rod.z + offset.z
        part.body.collisionResponse = collide
        setBoxPose(part.body, x, y, z, rod.angle, rod.angleVel, dt, part.prev)
      }
    }
  }

  return {
    rods,
    legs,
    setActive,
    slide,
    tilt,
    startSwing,
    swingRod,
    gather,
    footInFront: (rod, ballBody) => footInFront(rod, rod.angle, ballBody),
    integrate,
    writeBodies,
  }
}

function makePart(world, material, rod, localX, cy, cz, size, kind) {
  const body = holdKinematic(new CANNON.Body({ mass: 0, material, type: CANNON.Body.KINEMATIC }))
  body.addShape(new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)))
  body.position.set(localX, ROD.y + cy, rod.z + cz)
  world.addBody(body)
  return {
    kind,
    rod,
    localX,
    half: new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2),
    offset: new THREE.Vector3(0, cy, cz),
    axis: new THREE.Vector3(1, 0, 0),
    prev: { x: body.position.x, y: body.position.y, z: body.position.z },
    body,
  }
}

function nearestUpright(angle) {
  const turn = Math.PI * 2
  return Math.round(angle / turn) * turn
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function tipOffset(rod, angle) {
  const y0 = FIGURE.leg.cy - FIGURE.leg.y / 2
  const z0 = FIGURE.leg.cz * rod.footSign
  return {
    y: y0 * Math.cos(angle) - z0 * Math.sin(angle),
    z: y0 * Math.sin(angle) + z0 * Math.cos(angle),
  }
}

function ballSide(rod, ballBody) {
  const dz = ballBody.position.z - rod.z
  if (Math.abs(dz) > 0.008) return Math.sign(dz)
  return rod.footSign
}

function footInFront(rod, angle, ballBody) {
  const side = ballSide(rod, ballBody)
  const footZ = rod.z + tipOffset(rod, angle).z
  return (footZ - ballBody.position.z) * side > 0.012
}

function angleInFront(rod, dir, ballBody) {
  const side = ballSide(rod, ballBody)
  const step = 0.06
  let best = null
  for (let traveled = step; traveled <= Math.PI * 2 + 0.001; traveled += step) {
    const angle = rod.angle + dir * traveled
    const tip = tipOffset(rod, angle)
    const past = (rod.z + tip.z - ballBody.position.z) * side
    const footY = ROD.y + tip.y
    if (past > 0.012 && (!best || footY < best.footY)) best = { angle, footY }
  }
  if (best) return best.angle

  let far = { past: -Infinity, angle: rod.angle + dir * Math.PI }
  for (let traveled = step; traveled <= Math.PI * 2 + 0.001; traveled += step) {
    const angle = rod.angle + dir * traveled
    const past = (rod.z + tipOffset(rod, angle).z - ballBody.position.z) * side
    if (past > far.past) far = { past, angle }
  }
  return far.angle
}
