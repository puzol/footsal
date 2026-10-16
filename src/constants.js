export const FIXED_DT = 1 / 180

export const TABLE = {
  width: 0.58,
  length: 1.0,
  halfW: 0.29,
  halfL: 0.5,
  railH: 0.036,
  railT: 0.022,
  goalHalf: 0.115,
  goalOuter: 0.68,
}

export const BALL = {
  radius: 0.0175,
  mass: 0.02,
  kickoffSpeed: 0.4,
  maxSpeed: 12,
  linearDamping: 0.18,
  angularDamping: 0.22,
}

export const ROD = {
  y: 0.07,
  radius: 0.0055,
  length: 0.86,
  tiltPerNotch: (8 * Math.PI) / 180,
  slidePerPx: 0.00135,
  maxSlideSpeed: 1.8,
  // Negativan kut oko X nosi naše noge prema +Z, protivničkom golu.
  shotAngleSign: -1,
  maxOmega: 78,
  swingTime: 0.055,
  returnRate: 16,
  chargeTime: 0.75,
  backpassScale: 0.5,
}

export const FIGURE = {
  leg: { x: 0.03, y: 0.046, z: 0.018, cy: -0.029, cz: 0.011 },
  head: { x: 0.034, y: 0.032, z: 0.02, cy: 0.02, cz: -0.005 },
}

export const MAGNET = {
  range: 0.0175,
  accel: 60,
  stick: 0.34,
  frictionGap: 0.007,
  frictionDamp: 0.5,
  catchSpeed: 1.15,
  catchAlign: 0.62,
  wallBand: 0.016,
  wallBoost: 0.7,
}

// S lijeva na desno: golman A, napad B, vezni A, vezni B, napad A, golman B.
export const OURS = [
  { key: "1", z: -0.458, xs: [0] },
  { key: "2", z: -0.09, xs: [-0.13, 0, 0.13] },
  { key: "3", z: 0.27, xs: [-0.09, 0.09] },
]

export const THEIRS = [
  { z: -0.27, xs: [-0.09, 0.09] },
  { z: 0.09, xs: [-0.13, 0, 0.13] },
  { z: 0.458, xs: [0] },
]

export const AI = {
  interval: 0.2,
  shootChance: 0.15,
  passPower: 0.28,
  shootPower: 0.58,
  lane: 0.065,
}
