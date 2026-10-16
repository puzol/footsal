import * as CANNON from "cannon-es"

function material(name, friction, restitution) {
  const mat = new CANNON.Material(name)
  mat.friction = friction
  mat.restitution = restitution
  return mat
}

export function createWorld() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })
  world.broadphase = new CANNON.SAPBroadphase(world)
  world.allowSleep = true
  world.solver.iterations = 20

  const mats = {
    table: material("table", 0.45, 0.45),
    rail: material("rail", 0.2, 0.85),
    ball: material("ball", 1, 0.65),
    leg: material("leg", 1.1, 0.7),
    head: material("head", 0.08, 0.55),
  }

  const stiff = {
    contactEquationStiffness: 1e7,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e7,
    frictionEquationRelaxation: 3,
  }

  world.addContactMaterial(new CANNON.ContactMaterial(mats.ball, mats.table, stiff))
  world.addContactMaterial(new CANNON.ContactMaterial(mats.ball, mats.rail, stiff))
  world.addContactMaterial(new CANNON.ContactMaterial(mats.ball, mats.leg, stiff))
  world.addContactMaterial(new CANNON.ContactMaterial(mats.ball, mats.head, stiff))

  return { world, mats }
}

const AXIS_X = new CANNON.Vec3(1, 0, 0)

export function holdKinematic(body) {
  body.type = CANNON.Body.KINEMATIC
  body.allowSleep = false
  body.updateMassProperties()
  body.integrate = function integrateAuthored() {
    this.previousPosition.copy(this.position)
    this.previousQuaternion.copy(this.quaternion)
    this.aabbNeedsUpdate = true
  }
  return body
}

export function setBoxPose(body, x, y, z, angle, angleVel, dt, prev) {
  const vx = (x - prev.x) / dt
  const vy = (y - prev.y) / dt
  const vz = (z - prev.z) / dt
  body.velocity.set(vx, vy, vz)
  body.angularVelocity.set(angleVel, 0, 0)
  body.position.set(x, y, z)
  body.quaternion.setFromAxisAngle(AXIS_X, angle)
  body.updateAABB()
  prev.x = x
  prev.y = y
  prev.z = z
}

export { CANNON, AXIS_X }
