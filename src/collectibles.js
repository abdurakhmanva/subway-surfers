import * as THREE from 'three';

export class CollectiblesManager {
  constructor(scene) {
    this.scene = scene;
    this.coins = [];
    this.powerups = [];

    // Shared Materials & Geometries
    this.coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16);
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x443300
    });

    // Inner rim geometry for coin
    this.coinRimGeo = new THREE.TorusGeometry(0.32, 0.05, 8, 16);
    this.coinRimMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      metalness: 0.9,
      roughness: 0.2
    });

    // Powerup Geometries & Materials
    this.magnetMat = new THREE.MeshStandardMaterial({ color: 0xff2222, metalness: 0.6, roughness: 0.3 });
    this.magnetTipMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    this.sneakerMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, metalness: 0.4, roughness: 0.4 });
    this.jetpackMat = new THREE.MeshStandardMaterial({ color: 0xff9900, metalness: 0.7, roughness: 0.2 });
    this.multMat = new THREE.MeshStandardMaterial({ color: 0xaa00ff, metalness: 0.7, roughness: 0.2, emissive: 0x220044 });
  }

  createCoinMesh() {
    const group = new THREE.Group();
    const disk = new THREE.Mesh(this.coinGeo, this.coinMat);
    disk.rotation.x = Math.PI / 2;
    disk.castShadow = true;
    group.add(disk);

    const rim = new THREE.Mesh(this.coinRimGeo, this.coinRimMat);
    rim.position.z = 0.06;
    const rim2 = rim.clone();
    rim2.position.z = -0.06;
    group.add(rim, rim2);

    return group;
  }

  createMagnetMesh() {
    const group = new THREE.Group();
    // Horseshoe U-shape
    const arcGeo = new THREE.TorusGeometry(0.4, 0.12, 8, 16, Math.PI);
    const arc = new THREE.Mesh(arcGeo, this.magnetMat);
    arc.rotation.z = Math.PI;
    group.add(arc);

    const tipGeo = new THREE.BoxGeometry(0.24, 0.28, 0.24);
    const tip1 = new THREE.Mesh(tipGeo, this.magnetTipMat);
    tip1.position.set(-0.4, 0.15, 0);
    const tip2 = new THREE.Mesh(tipGeo, this.magnetTipMat);
    tip2.position.set(0.4, 0.15, 0);
    group.add(tip1, tip2);

    group.scale.set(0.9, 0.9, 0.9);
    return group;
  }

  createSneakersMesh() {
    const group = new THREE.Group();
    const bootGeo = new THREE.BoxGeometry(0.35, 0.35, 0.7);
    const boot = new THREE.Mesh(bootGeo, this.sneakerMat);
    boot.castShadow = true;

    // Wing on side
    const wingGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0, 0,
      -0.4, 0.3, -0.2,
      -0.4, -0.1, -0.1
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(-0.18, 0.1, 0);
    group.add(boot, wing);
    group.scale.set(0.9, 0.9, 0.9);
    return group;
  }

  createJetpackMesh() {
    const group = new THREE.Group();
    const cylGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 12);
    const t1 = new THREE.Mesh(cylGeo, this.jetpackMat);
    t1.position.x = -0.25;
    const t2 = new THREE.Mesh(cylGeo, this.jetpackMat);
    t2.position.x = 0.25;

    const coneGeo = new THREE.ConeGeometry(0.18, 0.3, 12);
    const c1 = new THREE.Mesh(coneGeo, this.magnetMat);
    c1.position.set(-0.25, 0.55, 0);
    const c2 = new THREE.Mesh(coneGeo, this.magnetMat);
    c2.position.set(0.25, 0.55, 0);

    group.add(t1, t2, c1, c2);
    group.scale.set(0.9, 0.9, 0.9);
    return group;
  }

  createMultiplierMesh() {
    const group = new THREE.Group();
    const starGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 6);
    const star = new THREE.Mesh(starGeo, this.multMat);
    star.rotation.x = Math.PI / 2;
    group.add(star);
    group.scale.set(0.9, 0.9, 0.9);
    return group;
  }

  spawnCoin(x, y, z) {
    const mesh = this.createCoinMesh();
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    const coin = {
      mesh,
      collected: false,
      initialY: y,
      bobOffset: Math.random() * Math.PI * 2
    };
    this.coins.push(coin);
    return coin;
  }

  spawnPowerup(type, x, y, z) {
    let mesh;
    if (type === 'magnet') mesh = this.createMagnetMesh();
    else if (type === 'sneakers') mesh = this.createSneakersMesh();
    else if (type === 'jetpack') mesh = this.createJetpackMesh();
    else mesh = this.createMultiplierMesh();

    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const powerup = {
      type,
      mesh,
      collected: false,
      initialY: y,
      bobOffset: Math.random() * Math.PI * 2
    };
    this.powerups.push(powerup);
    return powerup;
  }

  update(delta, playerPos, magnetActive = false, onCoinCollect, onPowerupCollect) {
    const time = Date.now() * 0.004;

    // 1. Update Coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];

      // Remove coins far behind player
      if (c.mesh.position.z > playerPos.z + 15 || c.collected) {
        this.scene.remove(c.mesh);
        this.coins.splice(i, 1);
        continue;
      }

      // Coin rotation
      c.mesh.rotation.y += delta * 4;

      // Magnet attraction
      const dx = playerPos.x - c.mesh.position.x;
      const dy = (playerPos.y + 0.9) - c.mesh.position.y;
      const dz = playerPos.z - c.mesh.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (magnetActive && distSq < 35 * 35 && distSq > 0.01) {
        const pullSpeed = 40 * delta;
        c.mesh.position.x += dx * pullSpeed * 0.2;
        c.mesh.position.y += dy * pullSpeed * 0.2;
        c.mesh.position.z += dz * pullSpeed * 0.2;
      }

      // Pickup collision check (radius ~ 1.2 units)
      if (distSq < 2.0 && !c.collected) {
        c.collected = true;
        if (onCoinCollect) onCoinCollect(c.mesh.position);
      }
    }

    // 2. Update Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];

      if (p.mesh.position.z > playerPos.z + 15 || p.collected) {
        this.scene.remove(p.mesh);
        this.powerups.splice(i, 1);
        continue;
      }

      // Hover and rotate
      p.mesh.rotation.y += delta * 3;
      p.mesh.position.y = p.initialY + Math.sin(time + p.bobOffset) * 0.25;

      const dx = playerPos.x - p.mesh.position.x;
      const dy = (playerPos.y + 0.9) - p.mesh.position.y;
      const dz = playerPos.z - p.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 1.6 && !p.collected) {
        p.collected = true;
        if (onPowerupCollect) onPowerupCollect(p.type, p.mesh.position);
      }
    }
  }

  clearAll() {
    this.coins.forEach(c => this.scene.remove(c.mesh));
    this.powerups.forEach(p => this.scene.remove(p.mesh));
    this.coins = [];
    this.powerups = [];
  }
}
