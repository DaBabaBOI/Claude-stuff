import * as THREE from 'three';

/**
 * Blockout weapon props. Each returns a Group whose origin is the grip, so it
 * can be parented straight onto a rig socket with no offset fiddling. Swapping
 * in real art later means changing only this file.
 *
 * IMPORTANT ORIENTATION RULE: the hand socket sits at the END of the arm, and
 * the arm's local -Y runs down the limb, away from the shoulder. So a weapon
 * must be built extending along -Y — building it along +Y sends the blade back
 * up through the character's own forearm.
 *
 *        shoulder ●
 *                 │  arm (local -Y)
 *                 │
 *          hand   ◆ handSocket  (origin = the grip)
 *                 │
 *                 ▼  blade continues along -Y
 */

const STEEL = new THREE.MeshStandardMaterial({ color: 0xc9d2dc, roughness: 0.35, metalness: 0.6 });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.9 });
const STRING = new THREE.MeshStandardMaterial({ color: 0xe6e2d3, roughness: 0.7 });
const LEATHER = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.95 });
const IRON = new THREE.MeshStandardMaterial({ color: 0x8e9299, roughness: 0.45, metalness: 0.7 });
const IRON_DARK = new THREE.MeshStandardMaterial({ color: 0x4d5158, roughness: 0.6, metalness: 0.5 });

/** Arrows: brown shaft, white head and fletching. Shared by the nocked arrow
 *  on the bow and by every arrow in flight, so they always match. */
const ARROW_SHAFT = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.85 });
const ARROW_WHITE = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.6 });

const ARROW_LENGTH = 0.82;
let arrowParts = null;

/** Geometry is built once and shared; only the meshes are per-arrow. */
function arrowGeometry() {
  if (arrowParts) return arrowParts;
  const shaft = new THREE.CylinderGeometry(0.018, 0.018, ARROW_LENGTH, 6);
  const head = new THREE.ConeGeometry(0.045, 0.16, 6);
  const fletch = new THREE.BoxGeometry(0.005, 0.11, 0.1);

  // Everything points along local -Z, so an arrow in flight can be aimed with
  // mesh.lookAt() and the nocked arrow with a single rotation.
  shaft.rotateX(-Math.PI / 2);
  head.rotateX(-Math.PI / 2);
  head.translate(0, 0, -ARROW_LENGTH / 2 - 0.06);
  fletch.translate(0, 0, ARROW_LENGTH / 2 - 0.06);

  arrowParts = { shaft, head, fletch };
  return arrowParts;
}

/**
 * One arrow: brown shaft, white head, three white fletches at the tail.
 * Used both as the nocked arrow on a drawn bow and as the projectile in flight.
 */
export function createArrowModel() {
  const { shaft, head, fletch } = arrowGeometry();
  const group = new THREE.Group();

  const shaftMesh = new THREE.Mesh(shaft, ARROW_SHAFT);
  shaftMesh.castShadow = true;
  group.add(shaftMesh);
  group.add(new THREE.Mesh(head, ARROW_WHITE));

  for (let i = 0; i < 3; i++) {
    const vane = new THREE.Mesh(fletch, ARROW_WHITE);
    vane.rotation.z = (i / 3) * Math.PI * 2;
    group.add(vane);
  }
  return group;
}

function createSword() {
  const group = new THREE.Group();

  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), STEEL);
  pommel.position.y = 0.1;
  group.add(pommel);

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 6), WOOD);
  grip.position.y = 0.02;
  group.add(grip);

  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.08), STEEL);
  guard.position.y = -0.09;
  group.add(guard);

  // Blade runs along -Y: away from the fist, never back through the arm.
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.85, 0.025), STEEL);
  blade.position.y = -0.55;
  blade.castShadow = true;
  group.add(blade);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), STEEL);
  tip.position.y = -1.05;
  tip.rotation.x = Math.PI;
  group.add(tip);

  return group;
}

/**
 * Bow proportions. A real longbow is about 1.7 m tall and drawn about 0.7 m —
 * roughly 0.4 of its height. The first version was 0.84 m tall with a 0.77 m
 * draw, a ratio of 0.9, so the string came back further than the bow was tall
 * and the draw hand ended up outside the bow's frame entirely. That is what
 * made it look like the archer was gripping the limb instead of the string.
 */
/**
 * The riser is an arc of a circle, and the arc's DEPTH decides where the
 * undrawn string sits:
 *
 *     brace height = radius * (1 - cos(half the arc))
 *
 * A 162-degree arc — nearly a half circle — put the resting string 0.52 m
 * behind the grip, which is as far back as the hand draws it. The draw hand
 * landed on the already-resting string, so nothing looked pulled. Real bows
 * are a shallow curve with a brace height around a quarter of a metre.
 *
 *     ╭─╮  162 deg: string way back here   ╭   90 deg: string just behind
 *     │ │  ║                               │   ║  the grip, room to draw
 *     ╰─╯  ║                               ╰   ║
 */
const BOW_RADIUS = 0.85;          // arc radius, not the bow's height
const BOW_ARC = Math.PI / 2;      // 90 degrees: a shallow, bow-shaped curve
const TIP_ANGLE = BOW_ARC / 2;
/** Tip to tip: about 1.2 m. */
export const BOW_SPAN = 2 * BOW_RADIUS * Math.sin(TIP_ANGLE);
/** How far the resting string sits behind the grip: about 0.25 m. */
export const BOW_BRACE = BOW_RADIUS * (1 - Math.cos(TIP_ANGLE));

function createBow() {
  const group = new THREE.Group();

  /**
   * Bow orientation, worked out in SOCKET space rather than by eye.
   *
   * The hand socket hangs off the end of the arm, so with the bow arm extended
   * the socket's axes land like this:
   *
   *     socket -Y  ->  the way the arrow flies (straight down the arm)
   *     socket +Y  ->  back toward the archer
   *     socket ±Z  ->  up and down (the limb axis)
   *
   * So: limbs span Z, the riser bulges along -Y (away from the archer), and the
   * string is a chord on the +Y side, nearest the face.
   */
  const art = new THREE.Group();
  art.position.y = BOW_RADIUS; // grip sits at the riser's middle, i.e. the socket
  art.rotation.y = 0.14;       // a slight deliberate cant, off a level hand
  group.add(art);

  const riser = new THREE.Mesh(
    new THREE.TorusGeometry(BOW_RADIUS, 0.028, 6, 18, BOW_ARC),
    WOOD
  );
  riser.rotation.y = Math.PI / 2; // ring plane XY -> ZY
  riser.rotation.x = Math.PI;     // arc midpoint to -Y, tips toward +-Z
  riser.castShadow = true;
  art.add(riser);

  // --- the string ----------------------------------------------------------
  // Two segments running from each limb tip to a shared nocking point, so the
  // string bends into a V around the draw hand rather than staying a straight
  // cylinder the hand merely passes near.
  //
  //        tip ●
  //             ╲
  //              ●── nock (follows the draw hand exactly)
  //             ╱
  //        tip ●
  const tipZ = BOW_RADIUS * Math.sin(TIP_ANGLE);
  const tipY = -BOW_RADIUS * Math.cos(TIP_ANGLE);
  const TIP_TOP = new THREE.Vector3(0, tipY, tipZ);
  const TIP_BOTTOM = new THREE.Vector3(0, tipY, -tipZ);
  const restNock = new THREE.Vector3(0, tipY, 0);

  const segmentGeometry = new THREE.CylinderGeometry(0.009, 0.009, 1, 4);
  const segments = [new THREE.Mesh(segmentGeometry, STRING), new THREE.Mesh(segmentGeometry, STRING)];
  for (const segment of segments) art.add(segment);

  const nockedArrow = createArrowModel();
  nockedArrow.visible = false;
  art.add(nockedArrow);

  /**
   * The grip, in the bow's own space: the middle of the riser, which sits at
   * the hand socket. The nocked arrow runs from the string THROUGH this point,
   * because that is what the arrow rests on.
   *
   *      nock ●
   *            ╲___ arrow lies along this line ___
   *             ╲                                 ╲
   *              ● grip                            ▶ tip, past the riser
   *
   * Pointing the arrow straight down the bow's axis instead leaves it floating
   * beside the bow, since the draw hand is off to one side of the centreline.
   */
  const GRIP = new THREE.Vector3(0, -BOW_RADIUS, 0);
  const ARROW_FORWARD = new THREE.Vector3(0, 0, -1); // the model's own nose

  const _up = new THREE.Vector3(0, 1, 0);
  const _dir = new THREE.Vector3();
  const _mid = new THREE.Vector3();
  const _nock = new THREE.Vector3();
  const _shaft = new THREE.Vector3();

  function stretch(mesh, from, to) {
    _dir.subVectors(to, from);
    const length = _dir.length() || 0.0001;
    _mid.addVectors(from, to).multiplyScalar(0.5);
    mesh.position.copy(_mid);
    mesh.scale.set(1, length, 1);
    mesh.quaternion.setFromUnitVectors(_up, _dir.divideScalar(length));
  }

  /**
   * Put the nocking point wherever the draw hand is — exactly, in all three
   * axes. Flattening it onto the bow's plane looked tidier but left a visible
   * gap between the hand and the string, which is the whole thing this is for.
   * @param {THREE.Vector3|null} worldPoint the draw hand, or null for at rest
   * @param {number} drawAmount 0..1, only used to show the nocked arrow
   */
  group.setNock = (worldPoint, drawAmount = 0) => {
    if (worldPoint) {
      art.updateWorldMatrix(true, false);
      _nock.copy(worldPoint);
      art.worldToLocal(_nock);
      // Never let the hand push the string forward through the riser.
      _nock.y = Math.max(_nock.y, tipY);
    } else {
      _nock.copy(restNock);
    }

    stretch(segments[0], TIP_TOP, _nock);
    stretch(segments[1], TIP_BOTTOM, _nock);

    if (!group.userData.nockWorld) group.userData.nockWorld = new THREE.Vector3();
    group.userData.nockWorld.copy(_nock);
    art.localToWorld(group.userData.nockWorld);

    nockedArrow.visible = drawAmount > 0.02;
    if (nockedArrow.visible) {
      // Tail on the string, aimed through the grip so the shaft lies across
      // the riser the way a real arrow rests on the bow.
      _shaft.subVectors(GRIP, _nock);
      if (_shaft.lengthSq() < 1e-6) _shaft.set(0, -1, 0);
      _shaft.normalize();
      nockedArrow.quaternion.setFromUnitVectors(ARROW_FORWARD, _shaft);
      nockedArrow.position.copy(_nock).addScaledVector(_shaft, ARROW_LENGTH / 2);
    }
  };

  group.setNock(null, 0);
  return group;
}

/**
 * A quiver of arrows for the back, built from fletched tails only — from
 * behind a character that is all you would see anyway, and 12 full arrows is a
 * lot of geometry for something over your shoulder.
 *
 * `setCount(n)` shows the first n, so the quiver visibly empties as you shoot.
 */
export function createQuiver(capacity = 12) {
  const group = new THREE.Group();

  const holder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.09, 0.42, 8, 1, true),
    LEATHER
  );
  holder.position.y = -0.1;
  holder.castShadow = true;
  group.add(holder);

  const shaft = new THREE.CylinderGeometry(0.014, 0.014, 0.44, 4);
  const vane = new THREE.BoxGeometry(0.004, 0.09, 0.055);
  vane.translate(0, 0.16, 0);

  const arrows = [];
  for (let i = 0; i < capacity; i++) {
    // Pack them in a loose spiral so the bundle reads as many arrows, not a
    // tidy grid.
    const angle = (i / capacity) * Math.PI * 2 * 1.6;
    const radius = 0.028 + (i % 3) * 0.022;
    const arrow = new THREE.Group();
    arrow.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
    arrow.rotation.z = Math.cos(angle) * 0.07;
    arrow.rotation.x = Math.sin(angle) * 0.07;

    const stick = new THREE.Mesh(shaft, ARROW_SHAFT);
    arrow.add(stick);
    for (let v = 0; v < 2; v++) {
      const fletch = new THREE.Mesh(vane, ARROW_WHITE);
      fletch.rotation.y = v * (Math.PI / 2);
      arrow.add(fletch);
    }
    group.add(arrow);
    arrows.push(arrow);
  }

  /** Show the first `count` arrows; the rest are spent. */
  group.setCount = (count) => {
    for (let i = 0; i < arrows.length; i++) arrows[i].visible = i < count;
  };
  group.setCount(capacity);

  return group;
}

/**
 * A bundle of arrows lying on the ground, waiting to be picked up. Tied at the
 * middle and fanned, so it reads as loot rather than as spent ammunition.
 */
export function createArrowBundle(count = 5) {
  const group = new THREE.Group();

  const shaft = new THREE.CylinderGeometry(0.016, 0.016, 0.7, 5);
  const head = new THREE.ConeGeometry(0.035, 0.12, 5);
  head.translate(0, 0.41, 0);

  for (let i = 0; i < count; i++) {
    const arrow = new THREE.Group();
    arrow.rotation.z = Math.PI / 2;
    arrow.rotation.y = (i / count) * 0.9 - 0.45;
    arrow.position.y = 0.06 + (i % 2) * 0.03;
    arrow.add(new THREE.Mesh(shaft, ARROW_SHAFT));
    arrow.add(new THREE.Mesh(head, ARROW_WHITE));
    group.add(arrow);
  }

  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.016, 5, 10), LEATHER);
  tie.rotation.y = Math.PI / 2;
  tie.position.y = 0.09;
  group.add(tie);

  return group;
}

/**
 * Blockout armour: a chest plate and a helmet that sit over the existing body,
 * slightly larger than the parts underneath so they read as worn rather than
 * as a recolour.
 */
export function createArmour({ helmet = true, chest = true } = {}) {
  const group = new THREE.Group();

  if (chest) {
    const plate = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.4, 4, 12), IRON);
    plate.position.y = 1.16;
    plate.castShadow = true;
    group.add(plate);

    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 6, 12), IRON_DARK);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.86;
    group.add(belt);
  }

  if (helmet) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
      IRON
    );
    cap.position.y = 1.79;
    cap.castShadow = true;
    group.add(cap);

    const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), IRON_DARK);
    nasal.position.set(0, 1.74, -0.2);
    group.add(nasal);
  }

  return group;
}

const BUILDERS = { sword: createSword, bow: createBow };

export function createWeaponModel(name) {
  const build = BUILDERS[name];
  if (!build) {
    // Unknown model: a plain box is better than a crash while blocking out.
    const fallback = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), STEEL);
    const group = new THREE.Group();
    group.add(fallback);
    return group;
  }
  return build();
}
