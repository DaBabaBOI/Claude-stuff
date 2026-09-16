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
  // Inner group carries the art's own orientation, so a socket is free to
  // rotate the outer group without erasing it. Canted rather than upright:
  // from a locked top-down camera an upright bow reads as a single line.
  const art = new THREE.Group();
  art.rotation.x = -0.6;
  art.position.y = -0.1; // riser sits just past the grip, along -Y
  group.add(art);

  const bow = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.028, 6, 14, Math.PI * 0.9),
    WOOD
  );
  bow.rotation.z = Math.PI * 0.55;
  bow.rotation.y = Math.PI / 2;
  bow.castShadow = true;
  art.add(bow);

  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.72, 4), STRING);
  cord.position.z = 0.12;
  art.add(cord);

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
