import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];

    // Shared geometries and materials for zero-allocation performance
    this.sparkleGeo = new THREE.BufferGeometry();
    const count = 300;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    this.sparkleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.sparkleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.sparkleGeo, pMat);
    this.scene.add(this.points);

    // Initialize particle pool
    for (let i = 0; i < count; i++) {
      this.particles.push({
        active: false,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        r: 1, g: 0.8, b: 0,
        life: 0,
        maxLife: 1
      });
    }
  }

  emit(type, position, count = 10) {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = position.x + (Math.random() - 0.5) * 0.4;
        p.y = position.y + (Math.random() - 0.5) * 0.4;
        p.z = position.z + (Math.random() - 0.5) * 0.4;

        if (type === 'coin') {
          // Golden sparkle explosion
          p.vx = (Math.random() - 0.5) * 8;
          p.vy = Math.random() * 8 + 2;
          p.vz = (Math.random() - 0.5) * 8;
          p.r = 1.0;
          p.g = 0.85;
          p.b = 0.1;
          p.life = 0.45;
          p.maxLife = 0.45;
        } else if (type === 'jetpack') {
          // Fire and smoke trailing behind
          p.vx = (Math.random() - 0.5) * 1.5;
          p.vy = -Math.random() * 4 - 2;
          p.vz = Math.random() * 6 + 12; // shoots backward
          p.r = 1.0;
          p.g = Math.random() * 0.6 + 0.2;
          p.b = 0.05;
          p.life = 0.35;
          p.maxLife = 0.35;
        } else if (type === 'dust') {
          // Slide dust
          p.vx = (Math.random() - 0.5) * 4;
          p.vy = Math.random() * 2 + 0.5;
          p.vz = Math.random() * 5 + 3;
          p.r = 0.8;
          p.g = 0.8;
          p.b = 0.8;
          p.life = 0.3;
          p.maxLife = 0.3;
        }
        spawned++;
      }
    }
  }

  update(delta) {
    const posAttr = this.sparkleGeo.attributes.position;
    const colAttr = this.sparkleGeo.attributes.color;
    const pArr = posAttr.array;
    const cArr = colAttr.array;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const idx = i * 3;
      if (p.active) {
        p.life -= delta;
        if (p.life <= 0) {
          p.active = false;
          pArr[idx + 1] = -9999;
          continue;
        }

        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;
        p.vy -= 9.8 * delta; // Gravity

        pArr[idx] = p.x;
        pArr[idx + 1] = p.y;
        pArr[idx + 2] = p.z;

        const alpha = p.life / p.maxLife;
        cArr[idx] = p.r * alpha;
        cArr[idx + 1] = p.g * alpha;
        cArr[idx + 2] = p.b * alpha;
      } else {
        pArr[idx + 1] = -9999;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }
}
