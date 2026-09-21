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
const THIGH = 0.42;
const SHIN = LEG_LENGTH - THIGH;
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
function buildArm(upperGeometry, foreGeometry, material, jointGeometry, handGeometry) {
  const shoulder = limb(upperGeometry, material, UPPER_ARM);
  shoulder.rotation.order = 'YXZ';

  // A ball at each joint. Without one, a rotated limb leaves a wedge of empty
  // space at the shoulder and the body reads as disconnected parts — which is
  // most of what made the blockout look uncanny.
  const shoulderBall = new THREE.Mesh(jointGeometry, material);
  shoulderBall.castShadow = true;
  shoulder.add(shoulderBall);

  const elbow = limb(foreGeometry, material, FOREARM);
  elbow.position.y = -UPPER_ARM;
  shoulder.add(elbow);

  const elbowBall = new THREE.Mesh(jointGeometry, material);
  elbowBall.scale.setScalar(0.82);
  elbowBall.castShadow = true;
  elbow.add(elbowBall);

  const hand = new THREE.Object3D();
  hand.position.y = -FOREARM - 0.02;
  elbow.add(hand);

  const fist = new THREE.Mesh(handGeometry, material);
  fist.castShadow = true;
  hand.add(fist);

  return { shoulder, elbow, hand };
}

function buildLeg(thighGeometry, shinGeometry, material, jointGeometry, footGeometry) {
  const hip = limb(thighGeometry, material, THIGH);
  const hipBall = new THREE.Mesh(jointGeometry, material);
  hipBall.castShadow = true;
  hip.add(hipBall);

  const knee = limb(shinGeometry, material, SHIN);
  knee.position.y = -THIGH;
  hip.add(knee);

  const kneeBall = new THREE.Mesh(jointGeometry, material);
  kneeBall.scale.setScalar(0.85);
  knee.add(kneeBall);

  const foot = new THREE.Mesh(footGeometry, material);
  foot.position.set(0, -SHIN + 0.04, -0.07);
  foot.castShadow = true;
  knee.add(foot);

  return { hip, knee };
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

const _bowUp = new THREE.Vector3(0, 1, 0);
const _bowFlight = new THREE.Vector3();
const _bowGrip = new THREE.Vector3();
const _bowX = new THREE.Vector3();
const _bowY = new THREE.Vector3();
const _bowZ = new THREE.Vector3();
const _bowBasis = new THREE.Matrix4();
const _bowQuat = new THREE.Quaternion();
const _bowSocketQuat = new THREE.Quaternion();

/** Hand targets in body space, and which way each elbow points. */
const BOW_HAND = new THREE.Vector3();
const DRAW_HAND = new THREE.Vector3();
const BOW_POLE = new THREE.Vector3(0, -1, -0.2).normalize();   // elbow down/out
const DRAW_POLE = new THREE.Vector3(0.3, 0.5, 1).normalize(); // elbow back, up, slightly out
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

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.14, 8),
      this.materials.skin
    );
    neck.position.y = 1.62;
    this.body.add(neck);
    this.neck = neck;

    /**
     * A face, rather than the dark visor bar this used to have. Two eyes read
     * as a character; a horizontal slab reads as a blindfolded mannequin, which
     * is exactly how it looked.
     */
    const brow = new THREE.Group();
    const eyeGeometry = new THREE.SphereGeometry(0.038, 8, 6);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.3 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(side * 0.075, 1.8, -0.163);
      brow.add(eye);
    }
    const browLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.028, 0.05),
      this.materials.accent
    );
    browLine.position.set(0, 1.858, -0.155);
    browLine.rotation.x = -0.25;
    brow.add(browLine);
    this.body.add(brow);
    this.brow = brow;

    const upperGeometry = new THREE.CylinderGeometry(0.088, 0.078, UPPER_ARM, 10);
    const foreGeometry = new THREE.CylinderGeometry(0.075, 0.066, FOREARM, 10);
    const thighGeometry = new THREE.CylinderGeometry(0.12, 0.105, THIGH, 10);
    const shinGeometry = new THREE.CylinderGeometry(0.1, 0.085, SHIN, 10);
    const armJoint = new THREE.SphereGeometry(0.092, 10, 8);
    const legJoint = new THREE.SphereGeometry(0.115, 10, 8);
    const handGeometry = new THREE.SphereGeometry(0.082, 8, 7);
    const footGeometry = new THREE.BoxGeometry(0.17, 0.1, 0.28);

    const armL = buildArm(upperGeometry, foreGeometry, this.materials.skin, armJoint, handGeometry);
    const armR = buildArm(upperGeometry, foreGeometry, this.materials.skin, armJoint, handGeometry);
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

    const legL = buildLeg(thighGeometry, shinGeometry, this.materials.accent, legJoint, footGeometry);
    const legR = buildLeg(thighGeometry, shinGeometry, this.materials.accent, legJoint, footGeometry);
    this.hipL = legL.hip;
    this.hipL.position.set(-0.15, HIP_Y, 0);
    this.hipR = legR.hip;
    this.hipR.position.set(0.15, HIP_Y, 0);
    this.kneeL = legL.knee;
    this.kneeR = legR.knee;
    this.body.add(this.hipL, this.hipR);

    /**
     * --- Attachment points. Swap what is parented here, never the rig. ---
     *
     * The bow goes in the OFF hand, like a real archer holds one, and is drawn
     * with the main hand. Holding the bow in the main hand meant the draw hand
     * had to reach across the chest to find the string, which is where the
     * pose looked wrong.
     *
     *     main hand (right)  sword, and the hand on the string when shooting
     *     off hand  (left)   the bow
     */
    this.handSocket = armR.hand;      // main hand
    this.offHandSocket = armL.hand;   // off hand
    this.drawHandSocket = armR.hand;  // the hand on the string
    this.handSocket.rotation.x = GRIP_CARRY;

    this.backSocket = new THREE.Object3D();
    // Slung diagonally: grip at the lower right of the back, weapon extending
    // up and to the left. Pushed clear of the torso so nothing intersects it.
    this.backSocket.position.set(0.16, TORSO_Y - 0.05, 0.33);
    this.backSocket.rotation.set(-0.22, 0, -2.45);
    // Stowed gear is scaled well down: at full size a 1.2 m bow slung on the
    // back reads as a spear sticking through the character.
    this.backSocket.scale.setScalar(0.45);

    // Quiver rides the other shoulder so it never fights the stowed weapon.
    this.quiverSocket = new THREE.Object3D();
    this.quiverSocket.position.set(-0.16, TORSO_Y + 0.22, 0.2);
    this.quiverSocket.rotation.set(-0.34, 0, 0.42);
    this.quiverSocket.scale.setScalar(0.82);
    this.body.add(this.quiverSocket);
    this.body.add(this.backSocket);

    this.walkPhase = 0;
    this.flash = 0;
    this.glow = null;
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

  /**
   * What is actually being held, as opposed to what happens to be first in the
   * socket's child list — the hands have fist meshes of their own now, so
   * indexing children[0] picks up a hand and silently stops the bow working.
   */
  get heldBow() {
    return this.offHandSocket.children.find((child) => typeof child.setNock === 'function') ?? null;
  }

  /** The weapon in the main hand, if any (the fist is not a weapon). */
  get heldWeapon() {
    return this.handSocket.children.find((child) => child.userData?.isWeapon) ?? null;
  }

  /**
   * Orient the bow so its face squares up to the arrow, standing upright.
   *
   * Left alone, the bow inherits the hand's orientation — and the hand's roll
   * comes from the IK, whose X axis is the elbow's bend axis. That has nothing
   * to do with which way is up (it left the bow leaning 21 degrees) or with
   * where the arrow goes (the arrow runs hand-to-grip, about 19 degrees off the
   * forearm), so the bow ended up skewed to both.
   *
   * Instead the bow is given its own orientation outright:
   *
   *     local -Y  ->  along the arrow, nock to grip
   *     local +Z  ->  tip to tip, as close to world up as that leaves it
   *
   * The grip sits at the socket's origin, so rotating the bow this way pivots
   * it about the hand and never pulls it out of the archer's grasp. The model's
   * own cant is then applied on top of a known-square starting point.
   */
  alignBow(drawHandWorld) {
    const bow = this.heldBow;
    if (!bow) return;

    this.offHandSocket.updateWorldMatrix(true, false);
    this.offHandSocket.getWorldPosition(_bowGrip);

    _bowFlight.subVectors(_bowGrip, drawHandWorld);
    if (_bowFlight.lengthSq() < 1e-6) return;
    _bowFlight.normalize();

    _bowY.copy(_bowFlight).negate(); // local +Y points back at the archer
    _bowZ.copy(_bowUp).addScaledVector(_bowY, -_bowUp.dot(_bowY));
    if (_bowZ.lengthSq() < 1e-6) return; // shooting straight up or down
    _bowZ.normalize();
    _bowX.crossVectors(_bowY, _bowZ).normalize();

    _bowBasis.makeBasis(_bowX, _bowY, _bowZ);
    _bowQuat.setFromRotationMatrix(_bowBasis);

    // The socket already carries a rotation; cancel it so the bow ends up with
    // the world orientation just built.
    this.offHandSocket.getWorldQuaternion(_bowSocketQuat);
    bow.quaternion.copy(_bowSocketQuat.invert()).multiply(_bowQuat);
  }

  /**
   * Hold a colour on the whole body until cleared — the visual tell for an
   * ability that lasts longer than a frame. Unlike triggerFlash this does not
   * decay, so "I am invulnerable right now" reads for exactly as long as it is
   * true.
   */
  setGlow(r, g, b) {
    this.glow = { r, g, b };
    for (const material of Object.values(this.materials)) material.emissive.setRGB(r, g, b);
  }

  clearGlow() {
    this.glow = null;
    for (const material of Object.values(this.materials)) material.emissive.setRGB(0, 0, 0);
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
    // Carry angle is the held weapon's business, not one constant for everything.
    let targetGrip = this.heldWeapon?.userData?.carryTilt ?? GRIP_CARRY;
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
        targetGrip = lerp(GRIP_SLASH, targetGrip, u);
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
      // Barely any twist while drawing. The hand targets below are in BODY
      // space, so twisting the torso rotates the whole arrow line with it — at
      // 0.34 rad that alone threw the arrow 19 degrees off the way you aim.
      twist = lerp(0.02, 0.07, clamp(pull, 0, 1));

      /**
       * Both hands sit close to the body's centre line, one in front of the
       * other, because the ARROW LINE runs between them — and that line is what
       * the arrow points along.
       *
       *        aim ◀─────────────────────
       *             ● grip      ● nock          hands nearly in line: the
       *                                         arrow points where you aim
       *
       *             ●  grip                     hands off to one side: the
       *                      ● nock             arrow points 49° wide, which
       *                                         is what this looked like
       *
       * A real archer stands side-on to the target, which puts the bow hand
       * and the anchor on the aim line naturally. This character always faces
       * its target square-on, so the pose has to do that work instead.
       */
      BOW_HAND.set(-0.05, 1.54, -0.66);
      DRAW_HAND.set(
        lerp(-0.06, -0.02, pull),
        lerp(1.5, 1.55, pull),
        lerp(-0.42, -0.13, pull)
      );

      solveArmIK(this.shoulderL, this.elbowL, UPPER_ARM, FOREARM, BOW_HAND, BOW_POLE);
      solveArmIK(this.shoulderR, this.elbowR, UPPER_ARM, FOREARM, DRAW_HAND, DRAW_POLE);
      // Published so tooling can check the hands actually reached them without
      // duplicating the numbers somewhere they can go stale.
      this.ikTargets.bow.copy(BOW_HAND);
      this.ikTargets.draw.copy(DRAW_HAND);
      ikHandled = true;
    }

    const smoothing = state.startsWith('attack') || state === 'draw-ranged' ? 0.0005 : 0.002;
    this.hipL.rotation.x = damp(this.hipL.rotation.x, targetLegL, smoothing, dt);
    this.hipR.rotation.x = damp(this.hipR.rotation.x, targetLegR, smoothing, dt);
    // Knees only bend one way, and mostly on the back swing.
    this.kneeL.rotation.x = damp(this.kneeL.rotation.x, Math.max(0, -targetLegL) * 0.9 + 0.06, smoothing, dt);
    this.kneeR.rotation.x = damp(this.kneeR.rotation.x, Math.max(0, -targetLegR) * 0.9 + 0.06, smoothing, dt);

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
    const held = this.heldBow;
    if (held) {
      const drawing = state === 'draw-ranged';
      if (drawing) {
        this.drawHandSocket.getWorldPosition(this._drawHandWorld);
        this.alignBow(this._drawHandWorld);
        held.setNock(this._drawHandWorld, drawAmount);
      } else {
        // Not drawing: the bow just sits in the hand, so hand it back its own
        // orientation rather than leaving it frozen at the last aim.
        held.quaternion.identity();
        held.setNock(null, 0);
      }
    }

    // ---- Flash ------------------------------------------------------------
    if (this.glow) {
      // A held glow outranks the hit flash: it is saying something still true.
      for (const material of Object.values(this.materials)) {
        material.emissive.setRGB(this.glow.r, this.glow.g, this.glow.b);
      }
    } else if (this.flash > 0) {
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
    for (const joint of [this.shoulderL, this.shoulderR, this.hipL, this.hipR, this.kneeL, this.kneeR]) {
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
