import * as THREE from 'three';
import { clamp, damp, lerp } from '../mathUtils.js';

/**
 * HumanoidRig — the "skeleton" of the skeleton phase.
 *
 * Primitive blockout body, parented to a single root node that the movement
 * code owns. Nothing outside this file knows what the character is made of, so
 * swapping in a rigged GLTF later means rewriting only this class.
 *
 *                      ○ head            sockets
 *                    ╭───╮               ├─ handSocket  (right hand, active weapon)
 *     shoulderL ●────┤   ├────● shoulderR└─ backSocket  (stowed weapon)
 *               │    │   │    │
 *               │    ╰─┬─╯    │              root ──► body ──► hips ──► legs
 *              arm    hips    arm                        ├──► torso / head
 *                    ╱   ╲                               └──► shoulders ──► arms
 *                  leg   leg
 *
 * Every joint is a Group whose mesh is translated so the Group sits at the
 * joint itself — rotating the Group therefore swings the limb from the
 * shoulder/hip rather than around its own middle.
 */

const HIP_Y = 0.8;
const LEG_LENGTH = 0.8;
const SHOULDER_Y = 1.42;
const ARM_LENGTH = 0.7;
const TORSO_Y = 1.15;

export const RIG_STATES = /** @type {const} */ ([
  'idle',
  'walk',
  'attack-melee',
  'attack-claw',
  'draw-ranged',
  'attack-ranged',
  'hit',
  'death',
]);

function limb(geometry, material, length) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;

/**
 * Grip tilts for the hand socket, in radians away from "in line with the arm".
 * Carrying: blade angled forward so the tip clears the ground while the arm
 * hangs down. Slashing: nearly in line with the arm, so the blade traces the
 * same horizontal arc the damage cone uses.
 */
const GRIP_CARRY = 1.0;
const GRIP_SLASH = 0.0;
const GRIP_BOW = 0.35;

export class HumanoidRig {
  /**
   * @param {{ skin?: number, cloth?: number, accent?: number, scale?: number }} options
   */
  constructor({ skin = 0xe8c39e, cloth = 0x4f7ac7, accent = 0x2f3d57, scale = 1 } = {}) {
    // Per-rig material clones so a hit flash on one character never tints another.
    this.materials = {
      skin: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75 }),
      cloth: new THREE.MeshStandardMaterial({ color: cloth, roughness: 0.85 }),
      accent: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.8 }),
    };

    this.root = new THREE.Group();
    this.root.scale.setScalar(scale);

    this.body = new THREE.Group();
    this.root.add(this.body);

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.45, 4, 12),
      this.materials.cloth
    );
    torso.position.y = TORSO_Y;
    torso.castShadow = true;
    this.body.add(torso);
    this.torso = torso;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 16, 12),
      this.materials.skin
    );
    head.position.y = 1.78;
    head.castShadow = true;
    this.body.add(head);
    this.head = head;

    // A nose-like wedge so you can always tell which way the character faces.
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.06, 0.12),
      this.materials.accent
    );
    brow.position.set(0, 1.79, -0.18);
    this.body.add(brow);
    this.brow = brow;

    const armGeometry = new THREE.CylinderGeometry(0.085, 0.075, ARM_LENGTH, 8);
    const legGeometry = new THREE.CylinderGeometry(0.11, 0.095, LEG_LENGTH, 8);

    this.shoulderL = limb(armGeometry, this.materials.skin, ARM_LENGTH);
    this.shoulderL.position.set(-0.34, SHOULDER_Y, 0);
    this.shoulderR = limb(armGeometry, this.materials.skin, ARM_LENGTH);
    this.shoulderR.position.set(0.34, SHOULDER_Y, 0);
    // YXZ: rotation.y is applied last, so it sweeps the arm horizontally around
    // the body no matter how far the arm is already raised. With the default
    // XYZ order a "horizontal" slash would tip as the arm lifted.
    //   rotation.x  raise forward (+) / back (-)
    //   rotation.y  sweep left (+) / right (-)
    //   rotation.z  push out to the side
    this.shoulderL.rotation.order = 'YXZ';
    this.shoulderR.rotation.order = 'YXZ';
    this.body.add(this.shoulderL, this.shoulderR);

    this.hipL = limb(legGeometry, this.materials.accent, LEG_LENGTH);
    this.hipL.position.set(-0.15, HIP_Y, 0);
    this.hipR = limb(legGeometry, this.materials.accent, LEG_LENGTH);
    this.hipR.position.set(0.15, HIP_Y, 0);
    this.body.add(this.hipL, this.hipR);

    // --- Attachment points. Swap what is parented here, never the rig. ---
    this.handSocket = new THREE.Object3D();
    this.handSocket.position.set(0, -ARM_LENGTH - 0.02, 0);
    this.handSocket.rotation.x = GRIP_CARRY;
    this.shoulderR.add(this.handSocket);

    this.backSocket = new THREE.Object3D();
    // Slung diagonally: grip at the lower right of the back, weapon extending
    // up and to the left. Pushed clear of the torso so nothing intersects it.
    this.backSocket.position.set(0.14, TORSO_Y - 0.12, 0.34);
    this.backSocket.rotation.set(-0.3, 0, -2.5);
    this.backSocket.scale.setScalar(0.8);
    this.body.add(this.backSocket);

    this.walkPhase = 0;
    this.flash = 0;
    /** Grip tilt of the held weapon, damped between poses. */
    this.gripTilt = GRIP_CARRY;
    this._baseEmissive = new THREE.Color(0x000000);
  }

  /** Hide the head so it does not fill the screen in first person. */
  setHeadVisible(visible) {
    this.head.visible = visible;
    this.brow.visible = visible;
  }

  /** Flash the whole body white for a moment (hit feedback at blockout). */
  triggerFlash(amount = 1) {
    this.flash = amount;
  }

  /**
   * @param {number} dt
   * @param {{
   *   time: number,
   *   state: typeof RIG_STATES[number],
   *   moveSpeed01?: number,
   *   attackProgress?: number,
   *   attackKind?: 'sword'|'bow',
   *   hitProgress?: number,
   *   deathProgress?: number,
   * }} params
   */
  update(dt, params) {
    const {
      time,
      state,
      moveSpeed01 = 0,
      attackProgress = 0,
      attackKind = 'sword',
      drawAmount = 0,
      hitProgress = 1,
      deathProgress = 0,
    } = params;

    // ---- Layer 1: locomotion (idle / walk) -------------------------------
    this.walkPhase += dt * (6 + moveSpeed01 * 5);
    const swing = Math.sin(this.walkPhase) * moveSpeed01;

    let targetLegL = swing * 0.75;
    let targetLegR = -swing * 0.75;
    let targetArmLX = -swing * 0.5;
    let targetArmRX = swing * 0.5;
    let targetArmLZ = 0.11;
    let targetArmRZ = -0.11;
    let bob = Math.abs(Math.sin(this.walkPhase)) * 0.05 * moveSpeed01;
    let lean = 0.07 * moveSpeed01;
    let twist = 0;

    if (moveSpeed01 < 0.02) {
      const breathe = Math.sin(time * 1.8);
      targetLegL = 0;
      targetLegR = 0;
      targetArmLX = breathe * 0.06;
      targetArmRX = breathe * 0.06;
      bob = breathe * 0.015;
      lean = 0;
    }

    // ---- Layer 2: attacks override the arms ------------------------------
    let targetArmRY = 0;
    let targetGrip = GRIP_CARRY;

    if (state === 'attack-melee') {
      // A HORIZONTAL slash, because the damage shape is a horizontal cone:
      // the arm lifts to shoulder height, then sweeps right -> left across the
      // front through the same +-50 degrees the hit test uses.
      const p = clamp(attackProgress, 0, 1);
      targetGrip = GRIP_SLASH;
      if (p < 0.35) {
        const u = easeIn(p / 0.35);            // windup: coil back over the right
        targetArmRX = lerp(targetArmRX, 1.2, u);
        targetArmRY = lerp(0, -1.0, u);
        targetArmRZ = lerp(targetArmRZ, -0.15, u);
        twist = lerp(0, -0.42, u);
      } else if (p < 0.6) {
        const u = easeOut((p - 0.35) / 0.25);  // active: the slash itself
        targetArmRX = lerp(1.2, 1.5, u);   // arm level at shoulder height
        targetArmRY = lerp(-1.0, 1.0, u);  // the 100-degree sweep itself
        targetArmRZ = -0.15;
        twist = lerp(-0.42, 0.5, u);
      } else {
        const u = easeOut((p - 0.6) / 0.4);    // recovery: settle back
        targetArmRX = lerp(1.5, targetArmRX, u);
        targetArmRY = lerp(1.0, 0, u);
        targetArmRZ = lerp(-0.15, targetArmRZ, u);
        twist = lerp(0.5, 0, u);
        targetGrip = lerp(GRIP_SLASH, GRIP_CARRY, u);
      }
      targetArmLX = lerp(targetArmLX, 0.45, 0.6);
    } else if (state === 'attack-claw') {
      // Unarmed double-arm swipe: both arms rear back overhead, then chop down.
      const p = clamp(attackProgress, 0, 1);
      if (p < 0.55) {
        const u = easeIn(p / 0.55);            // slow, telegraphed windup
        targetArmLX = lerp(targetArmLX, 2.5, u);
        targetArmRX = lerp(targetArmRX, 2.5, u);
        targetArmLZ = lerp(targetArmLZ, 0.35, u);
        targetArmRZ = lerp(targetArmRZ, -0.35, u);
        lean = lerp(lean, -0.25, u);
      } else {
        const u = easeOut((p - 0.55) / 0.45);  // fast chop down
        targetArmLX = lerp(2.5, 0.9, u);
        targetArmRX = lerp(2.5, 0.9, u);
        targetArmLZ = lerp(0.35, 0.15, u);
        targetArmRZ = lerp(-0.35, -0.15, u);
        lean = lerp(-0.25, 0.3, u);
      }
    } else if (state === 'draw-ranged') {
      // Held pose while the string is being pulled: bow arm out, draw hand
      // travelling back to the ear as `drawAmount` climbs. This is the whole
      // tell for a charged shot — yours and a skeleton's alike.
      targetGrip = GRIP_BOW;
      targetArmRX = 1.45;
      targetArmRZ = -0.05;
      targetArmRY = -0.12;
      // The draw hand travels BACK to the ear as the string is pulled. Moving
      // it forward instead is the classic backwards-bow mistake: it reads as
      // pushing the string away from you.
      targetArmLX = lerp(1.4, 0.4, drawAmount);
      targetArmLZ = lerp(-0.15, -0.75, drawAmount);
      twist = lerp(0.1, 0.34, drawAmount);
    } else if (state === 'attack-ranged') {
      const p = clamp(attackProgress, 0, 1);
      // Bow arm extended FORWARD (positive rotation.x); the draw hand snaps
      // back on release and pulls the next arrow.
      targetGrip = GRIP_BOW;
      targetArmRX = 1.45;
      targetArmRZ = -0.05;
      targetArmRY = -0.12;
      if (p < 0.3) {
        const u = p / 0.3;                     // follow-through past the ear
        targetArmLX = lerp(0.4, 0.15, u);
        targetArmLZ = lerp(-0.75, -0.85, u);
      } else {
        const u = easeOut((p - 0.3) / 0.7);    // hand comes back to the bow
        targetArmLX = lerp(0.15, 1.4, u);
        targetArmLZ = lerp(-0.85, -0.15, u);
      }
      twist = 0.22;
    }

    const smoothing = state.startsWith('attack') || state === 'draw-ranged' ? 0.0005 : 0.002;
    this.hipL.rotation.x = damp(this.hipL.rotation.x, targetLegL, smoothing, dt);
    this.hipR.rotation.x = damp(this.hipR.rotation.x, targetLegR, smoothing, dt);
    this.shoulderL.rotation.x = damp(this.shoulderL.rotation.x, targetArmLX, smoothing, dt);
    this.shoulderR.rotation.x = damp(this.shoulderR.rotation.x, targetArmRX, smoothing, dt);
    this.shoulderL.rotation.z = damp(this.shoulderL.rotation.z, targetArmLZ, smoothing, dt);
    this.shoulderR.rotation.z = damp(this.shoulderR.rotation.z, targetArmRZ, smoothing, dt);
    this.shoulderR.rotation.y = damp(this.shoulderR.rotation.y, targetArmRY, smoothing, dt);

    this.gripTilt = damp(this.gripTilt, targetGrip, smoothing, dt);
    this.handSocket.rotation.x = this.gripTilt;

    // ---- Layer 3: hit reaction (additive stagger) ------------------------
    // Sin curve: snaps into the recoil and eases back out, so a hit reads even
    // when the character is mid-attack.
    let recoil = 0;
    if (hitProgress < 1) {
      const shock = Math.sin(clamp(hitProgress, 0, 1) * Math.PI);
      recoil = shock * 0.45;
      this.shoulderL.rotation.z -= shock * 0.5;
      this.shoulderR.rotation.z += shock * 0.5;
      this.shoulderL.rotation.x -= shock * 0.3;
      this.shoulderR.rotation.x -= shock * 0.3;
    }

    this.body.position.y = bob;
    this.body.rotation.x = lean + recoil;
    this.body.rotation.y = twist;

    // ---- Layer 4: death overrides everything -----------------------------
    if (state === 'death') {
      const p = easeOut(clamp(deathProgress, 0, 1));
      this.root.rotation.x = (Math.PI / 2) * p;
      this.body.position.y = bob - 0.1 * p;
    } else if (this.root.rotation.x !== 0) {
      this.root.rotation.x = 0;
    }

    // ---- Flash ------------------------------------------------------------
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 6);
      const v = this.flash * 0.9;
      for (const material of Object.values(this.materials)) {
        material.emissive.setRGB(v, v * 0.55, v * 0.45);
      }
    }
  }

  /** Reset joints so a respawned character does not inherit a death pose. */
  reset() {
    this.root.rotation.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
    for (const joint of [this.shoulderL, this.shoulderR, this.hipL, this.hipR]) {
      joint.rotation.set(0, 0, 0);
    }
    this.gripTilt = GRIP_CARRY;
    this.handSocket.rotation.x = GRIP_CARRY;
    this.flash = 0;
    for (const material of Object.values(this.materials)) {
      material.emissive.setRGB(0, 0, 0);
    }
  }
}
