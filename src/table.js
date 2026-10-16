import * as THREE from "three"
import { TABLE } from "./constants.js"
import { CANNON } from "./world.js"

function addStatic(scene, world, meshMat, physMat, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), meshMat)
  mesh.position.set(x, y, z)
  scene.add(mesh)

  const body = new CANNON.Body({ mass: 0, material: physMat })
  body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)))
  body.position.set(x, y, z)
  world.addBody(body)
  return mesh
}

export function createTable(scene, world, mats) {
  const wood = new THREE.MeshLambertMaterial({ color: 0x8a5a32 })
  const cloth = new THREE.MeshLambertMaterial({ color: 0x1f7a45 })
  const line = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 })
  const goal = new THREE.MeshLambertMaterial({ color: 0xd8c27a })
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x14171b })

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.03
  scene.add(ground)

  addStatic(
    scene,
    world,
    cloth,
    mats.table,
    0,
    -0.02,
    0,
    TABLE.width,
    0.04,
    TABLE.length,
  )

  const innerX = TABLE.halfW - TABLE.railT
  const railY = TABLE.railH / 2
  addStatic(
    scene,
    world,
    wood,
    mats.rail,
    innerX + TABLE.railT / 2,
    railY,
    0,
    TABLE.railT,
    TABLE.railH,
    TABLE.length,
  )
  addStatic(
    scene,
    world,
    wood,
    mats.rail,
    -(innerX + TABLE.railT / 2),
    railY,
    0,
    TABLE.railT,
    TABLE.railH,
    TABLE.length,
  )

  const endZ = TABLE.halfL - TABLE.railT / 2
  const sideW = TABLE.halfW - TABLE.goalHalf
  for (const z of [endZ, -endZ]) {
    addStatic(
      scene,
      world,
      wood,
      mats.rail,
      -(TABLE.goalHalf + sideW / 2),
      railY,
      z,
      sideW,
      TABLE.railH,
      TABLE.railT,
    )
    addStatic(
      scene,
      world,
      wood,
      mats.rail,
      TABLE.goalHalf + sideW / 2,
      railY,
      z,
      sideW,
      TABLE.railH,
      TABLE.railT,
    )
  }

  const mark = (w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), line)
    mesh.position.set(x, y, z)
    scene.add(mesh)
  }
  mark(TABLE.width - 0.08, 0.002, 0.008, 0, 0.002, 0)
  mark(0.008, 0.002, TABLE.length - 0.08, 0, 0.002, 0)

  for (const z of [TABLE.halfL + 0.08, -(TABLE.halfL + 0.08)]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(TABLE.goalHalf * 2, 0.008, 0.14), goal)
    pad.position.set(0, -0.012, z)
    scene.add(pad)
  }
}
