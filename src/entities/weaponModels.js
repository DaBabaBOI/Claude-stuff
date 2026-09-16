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
   * string is a chord on the +Y side, nearest the face. Building it the other
   * way round is what made the bow read backwards — the string ended up out
   * front, pointing at the target.
   */
  const art = new THREE.Group();
  art.position.y = 0.42;  // grip sits at the riser's middle, i.e. the socket
  art.rotation.y = 0.45;  // canted, so it is not a single line from top-down
  group.add(art);

  const riser = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.028, 6, 16, Math.PI * 0.9),
    WOOD
  );
  riser.rotation.y = Math.PI / 2; // ring plane XY -> ZY
  riser.rotation.x = Math.PI;     // arc midpoint to -Y, tips toward +-Z
  riser.castShadow = true;
  art.add(riser);

  // --- the string ----------------------------------------------------------
  // Two segments running from each limb tip to a shared nocking point, so the
  // string bends into a V around whatever the draw hand is doing rather than
  // staying a straight cylinder the hand merely passes near.
  //
  //        tip ●
  //             ╲
  //              ●── nock (follows the draw hand)
  //             ╱
  //        tip ●
  const TIP_TOP = new THREE.Vector3(0, -0.065, 0.415);
  const TIP_BOTTOM = new THREE.Vector3(0, -0.065, -0.415);
  const restNock = new THREE.Vector3(0, -0.065, 0);

  const segmentGeometry = new THREE.CylinderGeometry(0.008, 0.008, 1, 4);
  const segments = [new THREE.Mesh(segmentGeometry, STRING), new THREE.Mesh(segmentGeometry, STRING)];
  for (const segment of segments) art.add(segment);

  const nockedArrow = createArrowModel();
  nockedArrow.rotation.x = -Math.PI / 2; // -Z becomes -Y: down the flight axis
  nockedArrow.visible = false;
  art.add(nockedArrow);

  const _up = new THREE.Vector3(0, 1, 0);
  const _dir = new THREE.Vector3();
  const _mid = new THREE.Vector3();
  const _nock = new THREE.Vector3();

  function stretch(mesh, from, to) {
    _dir.subVectors(to, from);
    const length = _dir.length() || 0.0001;
    _mid.addVectors(from, to).multiplyScalar(0.5);
    mesh.position.copy(_mid);
    mesh.scale.set(1, length, 1);
    mesh.quaternion.setFromUnitVectors(_up, _dir.divideScalar(length));
  }

  /**
   * Put the nocking point wherever the draw hand is.
   * @param {THREE.Vector3|null} worldPoint the draw hand, or null for at rest
   * @param {number} drawAmount 0..1, only used to show the nocked arrow
   */
  group.setNock = (worldPoint, drawAmount = 0) => {
    if (worldPoint) {
      art.updateWorldMatrix(true, false);
      _nock.copy(worldPoint);
      art.worldToLocal(_nock);
      // Flatten onto the bow's plane so the V does not skew out sideways, and
      // never let the hand push the string forward through the riser. Beyond
      // that the nock goes exactly where the hand is.
      _nock.x = 0;
      _nock.y = Math.max(_nock.y, -0.065);
    } else {
      _nock.copy(restNock);
    }

    stretch(segments[0], TIP_TOP, _nock);
    stretch(segments[1], TIP_BOTTOM, _nock);
    // Where the string actually ended up, in world space — the draw hand
    // should be sitting on this point.
    if (!group.userData.nockWorld) group.userData.nockWorld = new THREE.Vector3();
    group.userData.nockWorld.copy(_nock);
    art.localToWorld(group.userData.nockWorld);

    nockedArrow.visible = drawAmount > 0.02;
    if (nockedArrow.visible) {
      // Tail at the string, pointing down the flight axis (-Y).
      nockedArrow.position.set(0, _nock.y - ARROW_LENGTH / 2, _nock.z);
    }
  };

  group.setNock(null, 0);
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
