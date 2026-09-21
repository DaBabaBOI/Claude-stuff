import * as THREE from 'three';
import { createWeaponModel, tintWeaponModel } from './weaponModels.js';
import { ARCHETYPES, RARITIES, getWeaponEntry } from '../combat/weapons.config.js';

/**
 * WeaponDrop — loot on the floor.
 *
 * Unlike an arrow bundle, this is not collected by walking over it: stepping on
 * a weapon should never swap out the one you are winning a fight with. You have
 * to press the pickup key, and the HUD tells you what it is and how it compares
 * first.
 *
 * The rarity ring on the ground is the read-at-a-distance signal — you should
 * be able to tell a legendary from a rusted one across the arena without
 * walking over to check.
 */
export class WeaponDrop {
  constructor({ scene, position, weaponId }) {
    this.scene = scene;
    this.weaponId = weaponId;
    this.entry = getWeaponEntry(weaponId);
    this.archetype = ARCHETYPES[this.entry.archetype];
    this.rarity = RARITIES[this.entry.rarity];

    this.position = position.clone();
    this.position.y = 0;
    this.radius = 1.2;
    this.age = Math.random() * Math.PI * 2;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    const model = createWeaponModel(this.archetype.model);
    // Rare and up glow; common gear stays plain so the glow means something.
    if (this.rarity.order >= 2) tintWeaponModel(model, this.rarity.colour, 0.35);
    model.position.y = 1.0;
    model.rotation.z = Math.PI; // hang it point-up, the way loot reads
    // Loot reads at a glance, so it is shown smaller than it is in hand — a
    // full-size scythe or longbow standing on the floor swamps the arena.
    model.scale.setScalar(0.72);
    this.model = model;
    this.group.add(model);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.62, 24),
      new THREE.MeshBasicMaterial({
        color: this.rarity.colour,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    this.ring = ring;
    this.group.add(ring);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.42, 2.4, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: this.rarity.colour,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.position.y = 1.2;
    this.group.add(beam);

    scene.add(this.group);
  }

  get name() {
    return this.entry.name;
  }

  update(dt) {
    this.age += dt;
    this.model.rotation.y += dt * 1.1;
    this.model.position.y = 1.0 + Math.sin(this.age * 1.8) * 0.09;
    this.ring.scale.setScalar(1 + Math.sin(this.age * 2.2) * 0.06);
  }

  inRange(player) {
    return (
      Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z) <=
      this.radius + player.radius
    );
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
