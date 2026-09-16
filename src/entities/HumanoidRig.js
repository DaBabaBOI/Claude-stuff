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
const UPPER_ARM = 0.37;
const FOREARM = ARM_LENGTH - UPPER_ARM;
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

/**
 * An arm with an elbow: shoulder -> upper arm -> elbow -> forearm -> hand.
 *
 *     shoulder ●
 *              │ upper arm (0.37)
 *        elbow ●
 *               ╲ forearm (0.33)
 *                ● hand socket
 *
 * Both joints keep the project's convention — the limb hangs down its own local
 * -Y — so the existing FK poses still address the shoulder exactly as before,
 * and the elbow is one extra rotation on top.
 */
function buildArm(upperGeometry, foreGeometry, material) {
  const shoulder = limb(upperGeometry, material, UPPER_ARM);
  shoulder.rotation.order = 'YXZ';

  const elbow = limb(foreGeometry, material, FOREARM);
  elbow.position.y = -UPPER_ARM;
  shoulder.add(elbow);

  const hand = new THREE.Object3D();
  hand.position.y = -FOREARM - 0.02;
  elbow.add(hand);

  return { shoulder, elbow, hand };
}

/**
 * Two-bone IK: point an arm so its hand lands on `target`.
 *
 *              elbow
 *               ●
 *        l1   ╱   ╲  l2
 *           ╱       ╲
 *  shoulder ●─── d ───● target
 *
 * The triangle gives both angles by the law of cosines: the elbow's interior
 * angle from (l1, l2, d), and how far the upper arm lifts off the straight line
 * to the target. The pole vector decides which way the elbow points — down and
 * out for a bow arm, up and back for a draw arm — since the triangle alone
 * leaves the arm free to spin around the shoulder-to-target axis.
 */
const _ikTarget = new THREE.Vector3();
const _ikDir = new THREE.Vector3();
const _ikAxis = new THREE.Vector3();
const _ikUpper = new THREE.Vector3();
const _ikX = new THREE.Vector3();
const _ikY = new THREE.Vector3();
const _ikZ = new THREE.Vector3();
const _ikBasis = new THREE.Matrix4();
const _ikQuat = new THREE.Quaternion();

/** Hand targets in body space, and which way each elbow points. */
const BOW_HAND = new THREE.Vector3();
const DRAW_HAND = new THREE.Vector3();
const BOW_POLE = new THREE.Vector3(0, -1, -0.2).normalize();   // elbow down/out
const DRAW_POLE = new THREE.Vector3(0, 0.55, 0.85).normalize(); // elbow up/back
/**
 * The IK frame's X axis is the elbow's bend axis, which points wherever the
 * pole vector puts it — fine for the arm, wrong for the weapon in the hand.
 * This rolls the HAND rather than the arm: rolling the shoulder frame instead
 * would flip the elbow's bend axis and break the IK chain, which is exactly
 * what happened the first time.
 */
const BOW_ROLL = 0;

function solveArmIK(shoulder, elbow, l1, l2, targetLocal, pole) {
  _ikTarget.copy(targetLocal).sub(shoulder.position);
  let d = _ikTarget.length();
  if (d < 1e-4) return;

  // Never fully straight and never folded flat: both are singular, and a
  // locked-straight arm looks like a mannequin.
  d = clamp(d, Math.abs(l1 - l2) + 0.02, l1 + l2 - 0.01);
  _ikDir.copy(_ikTarget).normalize();

  const elbowInterior = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
  const lift = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));

  // Bend plane: perpendicular to both the target direction and the pole.
  _ikAxis.crossVectors(_ikDir, pole);
  if (_ikAxis.lengthSq() < 1e-6) _ikAxis.set(1, 0, 0);
  _ikAxis.normalize();

  _ikUpper.copy(_ikDir).applyAxisAngle(_ikAxis, -lift).normalize();

  // Build the shoulder's frame: local -Y down the upper arm, local X on the
  // bend axis so the elbow's rotation.x bends inside that plane.
  _ikY.copy(_ikUpper).multiplyScalar(-1);
  _ikX.copy(_ikAxis);
  _ikZ.crossVectors(_ikX, _ikY).normalize();
  _ikX.crossVectors(_ikY, _ikZ).normalize();
  _ikBasis.makeBasis(_ikX, _ikY, _ikZ);
  _ikQuat.setFromRotationMatrix(_ikBasis);

  shoulder.quaternion.copy(_ikQuat);
  elbow.rotation.set(Math.PI - elbowInterior, 0, 0);
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
// With IK the bow arm is already horizontal and pointing where you aim, so the
// bow wants to sit straight in line with the forearm — any tilt just angles the
// arrow at the floor.
const GRIP_BOW = 0;

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

    const upperGeometry = new THREE.CylinderGeometry(0.088, 0.078, UPPER_ARM, 8);
    const foreGeometry = new THREE.CylinderGeometry(0.075, 0.066, FOREARM, 8);
    const legGeometry = new THREE.CylinderGeometry(0.11, 0.095, LEG_LENGTH, 8);

    const armL = buildArm(upperGeometry, foreGeometry, this.materials.skin);
    const armR = buildArm(upperGeometry, foreGeometry, this.materials.skin);
    this.shoulderL = armL.shoulder;
    this.elbowL = armL.elbow;
    this.shoulderL.position.set(-0.34, SHOULDER_Y, 0);
    this.shoulderR = armR.shoulder;
    this.elbowR = armR.elbow;
    this.shoulderR.position.set(0.34, SHOULDER_Y, 0);
    // Shoulders use Euler order YXZ (set in buildArm): rotation.y is applied
    // last, so it sweeps the arm horizontally around the body no matter how far
    // the arm is already raised. Under the default XYZ a "horizontal" slash
    // tips over as the arm lifts.
    //   rotation.x  raise forward (+) / back (-)
    //   rotation.y  sweep left (+) / right (-)
    //   rotation.z  push out to the side
    this.body.add(this.shoulderL, this.shoulderR);

    this.hipL = limb(legGeometry, this.materials.accent, LEG_LENGTH);
    this.hipL.position.set(-0.15, HIP_Y, 0);
    this.hipR = limb(legGeometry, this.materials.accent, LEG_LENGTH);
    this.hipR.position.set(0.15, HIP_Y, 0);
    this.body.add(this.hipL, this.hipR);

    // --- Attachment points. Swap what is parented here, never the rig. ---
    this.handSocket = armR.hand;
    this.handSocket.rotation.x = GRIP_CARRY;

    // Draw hand: not a weapon mount, but the string has to be gripped by
    // something, so the bow model is told where this point is each frame.
    this.drawHandSocket = armL.hand;

    this.backSocket = new THREE.Object3D();
    // Slung diagonally: grip at the lower right of the back, weapon extending
    // up and to the left. Pushed clear of the torso so nothing intersects it.
    this.backSocket.position.set(0.14, TORSO_Y - 0.12, 0.34);
    this.backSocket.rotation.set(-0.3, 0, -2.5);
    this.backSocket.scale.setScalar(0.8);

    // Quiver rides the other shoulder so it never fights the stowed weapon.
    this.quiverSocket = new THREE.Object3D();
    this.quiverSocket.position.set(-0.16, TORSO_Y + 0.22, 0.2);
    this.quiverSocket.rotation.set(-0.34, 0, 0.42);
    this.quiverSocket.scale.setScalar(0.82);
    this.body.add(this.quiverSocket);
    this.body.add(this.backSocket);

    this.walkPhase = 0;
    this.flash = 0;
    this._drawHandWorld = new THREE.Vector3();
    /** Last hand targets the bow poses asked the IK for, in body space. */
    this.ikTargets = { bow: new THREE.Vector3(), draw: new THREE.Vector3() };
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
    // Elbows: a little bend at rest, more when coiled, straight on a follow
    // through. FK poses carry a bend value; the bow poses use IK instead.
    let targetElbowL = 0.25 + Math.abs(swing) * 0.25;
    let targetElbowR = 0.25 + Math.abs(swing) * 0.25;
    let ikHandled = false;

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
        targetElbowR = lerp(0.25, 1.15, u);    // blade cocked back by the ear
        twist = lerp(0, -0.42, u);
      } else if (p < 0.6) {
        const u = easeOut((p - 0.35) / 0.25);  // active: the slash itself
        targetArmRX = lerp(1.2, 1.5, u);   // arm level at shoulder height
        targetArmRY = lerp(-1.0, 1.0, u);  // the 100-degree sweep itself
        targetArmRZ = -0.15;
        targetElbowR = lerp(1.15, 0.08, u);    // extends through the cut
        twist = lerp(-0.42, 0.5, u);
      } else {
        const u = easeOut((p - 0.6) / 0.4);    // recovery: settle back
        targetArmRX = lerp(1.5, targetArmRX, u);
        targetArmRY = lerp(1.0, 0, u);
        targetArmRZ = lerp(-0.15, targetArmRZ, u);
        twist = lerp(0.5, 0, u);
        targetElbowR = lerp(0.08, 0.25, u);
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
        targetElbowL = lerp(0.25, 1.0, u);     // claws drawn back over the head
        targetElbowR = lerp(0.25, 1.0, u);
        lean = lerp(lean, -0.25, u);
      } else {
        const u = easeOut((p - 0.55) / 0.45);  // fast chop down
        targetArmLX = lerp(2.5, 0.9, u);
        targetArmRX = lerp(2.5, 0.9, u);
        targetArmLZ = lerp(0.35, 0.15, u);
        targetArmRZ = lerp(-0.35, -0.15, u);
        targetElbowL = lerp(1.0, 0.12, u);     // swipe lands with arms extended
        targetElbowR = lerp(1.0, 0.12, u);
        lean = lerp(-0.25, 0.3, u);
      }
    } else if (state === 'draw-ranged' || state === 'attack-ranged') {
      /**
       * Bow poses are IK: both hands are placed in body space and the arms are
       * solved to reach them. That is what lets the draw hand sit exactly on
       * the string, and it gives the draw arm a real bent elbow instead of one
       * rigid reach across the chest.
       *
       *   bow hand    out front, arm nearly straight
       *   draw hand   travels from beside the bow back to the anchor at the
       *               cheek as `drawAmount` climbs; the elbow swings up and
       *               back (pole vector), which is the shape of a real draw
       */
      const drawing = state === 'draw-ranged';
      const p = clamp(attackProgress, 0, 1);
      // On release the hand snaps back past the anchor, then returns to the bow.
      const pull = drawing ? drawAmount : p < 0.3 ? 1.1 : lerp(1.1, 0, easeOut((p - 0.3) / 0.7));

      targetGrip = GRIP_BOW;
      twist = lerp(0.1, 0.34, clamp(pull, 0, 1));

      BOW_HAND.set(0.3, 1.45, -0.7);
      // Draw length is what sells it: about 0.55 m back from the grip, against
      // a bow 1.24 m tall. At rest the draw hand sits on the string right by
      // the bow, which is what nocking an arrow looks like.
      DRAW_HAND.set(
        lerp(0.3, 0.25, pull),
        lerp(1.46, 1.53, pull),
        lerp(-0.56, -0.17, pull)
      );

      solveArmIK(this.shoulderR, this.elbowR, UPPER_ARM, FOREARM, BOW_HAND, BOW_POLE);
      solveArmIK(this.shoulderL, this.elbowL, UPPER_ARM, FOREARM, DRAW_HAND, DRAW_POLE);
      // Published so tooling can check the hands actually reached them without
      // duplicating the numbers somewhere they can go stale.
      this.ikTargets.bow.copy(BOW_HAND);
      this.ikTargets.draw.copy(DRAW_HAND);
      ikHandled = true;
    }

    const smoothing = state.startsWith('attack') || state === 'draw-ranged' ? 0.0005 : 0.002;
    this.hipL.rotation.x = damp(this.hipL.rotation.x, targetLegL, smoothing, dt);
    this.hipR.rotation.x = damp(this.hipR.rotation.x, targetLegR, smoothing, dt);

    if (!ikHandled) {
      this.shoulderL.rotation.x = damp(this.shoulderL.rotation.x, targetArmLX, smoothing, dt);
      this.shoulderR.rotation.x = damp(this.shoulderR.rotation.x, targetArmRX, smoothing, dt);
      this.shoulderL.rotation.z = damp(this.shoulderL.rotation.z, targetArmLZ, smoothing, dt);
      this.shoulderR.rotation.z = damp(this.shoulderR.rotation.z, targetArmRZ, smoothing, dt);
      this.shoulderR.rotation.y = damp(this.shoulderR.rotation.y, targetArmRY, smoothing, dt);
      this.shoulderL.rotation.y = damp(this.shoulderL.rotation.y, 0, smoothing, dt);
      this.elbowL.rotation.x = damp(this.elbowL.rotation.x, targetElbowL, smoothing, dt);
      this.elbowR.rotation.x = damp(this.elbowR.rotation.x, targetElbowR, smoothing, dt);
    }

    this.gripTilt = damp(this.gripTilt, targetGrip, smoothing, dt);
    this.handSocket.rotation.x = this.gripTilt;
    this.handSocket.rotation.y = damp(
      this.handSocket.rotation.y,
      ikHandled ? BOW_ROLL : 0,
      smoothing,
      dt
    );

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

    // ---- Bowstring ---------------------------------------------------------
    // The held bow, if it has a string, gets told where the draw hand actually
    // is, so the string bends around the hand instead of the hand hovering
    // near a straight cylinder.
    const held = this.handSocket.children[0];
    if (held?.setNock) {
      const drawing = state === 'draw-ranged';
      if (drawing) {
        this.drawHandSocket.getWorldPosition(this._drawHandWorld);
        held.setNock(this._drawHandWorld, drawAmount);
      } else {
        held.setNock(null, 0);
      }
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
