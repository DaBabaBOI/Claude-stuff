import * as THREE from 'three';

/**
 * Blockout weapon props. Each returns a Group whose origin is the grip, so it
 * can be parented straight onto a rig socket with no offset fiddling. Swapping
 * in real art later means changing only this file.
 */

const STEEL = new THREE.MeshStandardMaterial({ color: 0xc9d2dc, roughness: 0.35, metalness: 0.6 });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.9 });
const STRING = new THREE.MeshStandardMaterial({ color: 0xe6e2d3, roughness: 0.7 });

function createSword() {
  const group = new THREE.Group();

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), WOOD);
  grip.position.y = -0.08;
  group.add(grip);

  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.08), STEEL);
  guard.position.y = 0.04;
  group.add(guard);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.95, 0.03), STEEL);
  blade.position.y = 0.52;
  blade.castShadow = true;
  group.add(blade);

  // Held point-down-ish from the hand socket; the swing pose does the rest.
  group.rotation.set(0, 0, 0);
  return group;
}

function createBow() {
  const group = new THREE.Group();

  const limbGeometry = new THREE.TorusGeometry(0.42, 0.028, 6, 14, Math.PI * 0.9);
  const bow = new THREE.Mesh(limbGeometry, WOOD);
  bow.rotation.z = Math.PI * 0.55;
  bow.rotation.y = Math.PI / 2;
  bow.castShadow = true;
  group.add(bow);

  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.72, 4), STRING);
  cord.position.z = 0.12;
  group.add(cord);

  // Canted rather than upright: from a locked top-down camera an upright bow
  // reads as a single line.
  group.rotation.x = -0.6;
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
