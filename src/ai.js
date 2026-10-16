import { AI, TABLE } from "./constants.js"

export function createAi(rods, ball) {
  let timer = 0

  function update(dt) {
    timer += dt
    if (timer < AI.interval) return
    timer = 0
    decide()
  }

  function decide() {
    const ballX = ball.body.position.x
    const ballZ = ball.body.position.z
    const actor = actorFor(ballZ)
    for (const rod of rods.rods) {
      if (rod.team !== "theirs" || rod === actor) continue
      if (rod.swing?.mode !== "gather") {
        rod.receive = false
        rod.cup = false
      }
    }
    if (!actor) return

    if (actor.swing?.mode === "gather") {
      actor.receive = true
      align(actor, ballX)
      return
    }
    if (actor.swing) return

    if (actor.cup) {
      actor.receive = true
      align(actor, ballX)
      const dx = Math.abs(closestLocal(actor, ballX) + actor.slide - ballX)
      const dz = Math.abs(actor.z - ballZ)
      if (dx > 0.045 || dz > 0.06) return
    } else {
      const behind = (ballZ - actor.z) * -actor.forwardSign < -0.008
      const near = Math.abs(actor.z - ballZ) < 0.075 && Math.abs(closestLocal(actor, ballX) + actor.slide - ballX) < 0.05
      if (behind && Math.abs(actor.z - ballZ) < 0.08 && !rods.footInFront(actor, ball.body)) {
        align(actor, ballX)
        actor.receive = true
        if (near) rods.gather(actor, ball.body)
        return
      }
      actor.receive = false
      if (!canStrike(actor, ballX, ballZ)) {
        align(actor, ballX)
        return
      }
    }

    const blocker = playerOnGoalPath(ballX, ballZ, actor)
    if (!blocker) {
      if (actor.cup && actor.separated) {
        actor.cup = false
        actor.receive = false
      }
      return
    }

    actor.cup = false
    actor.receive = false
    const roll = Math.random()
    if (roll < AI.shootChance) {
      rods.swingRod(actor, AI.shootPower, true, ball.body)
      return
    }
    if (roll < AI.shootChance + (1 - AI.shootChance) / 2) {
      rods.swingRod(actor, AI.passPower, true, ball.body)
      return
    }
    dodge(actor, ballX, blocker.x)
  }

  function actorFor(ballZ) {
    const theirs = rods.rods.filter((rod) => rod.team === "theirs")
    let behindRod = null
    let behindDist = Infinity
    for (const rod of theirs) {
      const behind = (ballZ - rod.z) * -rod.forwardSign < -0.008
      const dz = Math.abs(rod.z - ballZ)
      if (!behind || dz > 0.08 || dz >= behindDist) continue
      behindDist = dz
      behindRod = rod
    }
    if (behindRod) return behindRod
    return rodBehindBall(ballZ)
  }

  function rodBehindBall(ballZ) {
    const theirs = rods.rods.filter((rod) => rod.team === "theirs")
    let behind = null
    let behindDist = Infinity
    let nearest = theirs[0]
    let nearestDist = Infinity
    for (const rod of theirs) {
      const dz = Math.abs(rod.z - ballZ)
      if (dz < nearestDist) {
        nearestDist = dz
        nearest = rod
      }
      const dist = rod.z - ballZ
      if (dist < -0.04) continue
      if (dist < behindDist) {
        behindDist = dist
        behind = rod
      }
    }
    return behind ?? nearest
  }

  function playerOnGoalPath(ballX, ballZ, actor) {
    const goalZ = -TABLE.halfL
    let found = null
    for (const rod of rods.rods) {
      if (rod === actor) continue
      if (rod.z >= ballZ - 0.02 || rod.z <= goalZ) continue
      for (const localX of rod.xs) {
        const x = localX + rod.slide
        if (Math.abs(x - ballX) > AI.lane) continue
        if (!found || rod.z > found.z) found = { x, z: rod.z }
      }
    }
    return found
  }

  function canStrike(rod, ballX, ballZ) {
    const dx = Math.abs(closestLocal(rod, ballX) + rod.slide - ballX)
    const dz = Math.abs(rod.z - ballZ)
    if (dx > 0.04 || dz > 0.05) return false
    const inFront = (ballZ - rod.z) * -rod.forwardSign > 0.006
    return inFront || rods.footInFront(rod, ball.body)
  }

  function align(rod, ballX) {
    const local = closestLocal(rod, ballX)
    rod.slideTarget = clamp(ballX - local, -rod.limit, rod.limit)
  }

  function dodge(rod, ballX, blockerX) {
    const local = closestLocal(rod, ballX)
    const dir = ballX >= blockerX ? 1 : -1
    let target = clamp(ballX + dir * 0.08 - local, -rod.limit, rod.limit)
    if (Math.abs(target - rod.slideTarget) < 0.015) {
      target = clamp(ballX - dir * 0.08 - local, -rod.limit, rod.limit)
    }
    rod.slideTarget = target
  }

  return { update }
}

function closestLocal(rod, ballX) {
  return rod.xs.reduce((best, localX) =>
    Math.abs(localX + rod.slide - ballX) < Math.abs(best + rod.slide - ballX) ? localX : best,
  )
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
