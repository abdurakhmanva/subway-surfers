import * as THREE from 'three';

export const LANE_WIDTH = 3.2;
export const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];

export class WorldManager {
  constructor(scene, collectiblesManager) {
    this.scene = scene;
    this.collectibles = collectiblesManager;

    this.chunkLength = 60;
    this.visibleChunks = 7;
    this.chunks = [];
    this.nextChunkZ = 0;

    this.obstacles = [];
    this.movingTrains = [];
    this.ramps = [];

    this.initSharedMaterials();
  }

  initSharedMaterials() {
    // Ground & track materials
    this.groundMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 });
    this.railMat = new THREE.MeshStandardMaterial({ color: 0x99a0a8, metalness: 0.85, roughness: 0.2 });
    this.sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.8 });

    // Walls & Scenery
    this.wallMat = new THREE.MeshStandardMaterial({ color: 0x7c4e38, roughness: 0.85 }); // Red brick
    this.wallTrimMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 });
    this.metalGantryMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.7, roughness: 0.3 });

    // Train materials
    this.trainBodyMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4, metalness: 0.3 }); // Red subway
    this.trainRoofMat = new THREE.MeshStandardMaterial({ color: 0x44444c, roughness: 0.7 });
    this.trainWindowMat = new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.1, metalness: 0.9 });
    this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });

    // Barrier materials
    this.hazardMat = new THREE.MeshStandardMaterial({ color: 0xf5b000, roughness: 0.4 });
    this.stripeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    this.barrierPostMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6, roughness: 0.4 });

    // Ramp material
    this.rampMat = new THREE.MeshStandardMaterial({ color: 0x885533, roughness: 0.6 });

    // Skyline buildings
    this.buildingMat = new THREE.MeshStandardMaterial({ color: 0x1e2530, roughness: 0.9 });
  }

  initWorld() {
    // Generate initial track chunks
    for (let i = 0; i < this.visibleChunks; i++) {
      const isIntro = i < 2; // First 2 chunks have no obstacles so player starts smoothly
      this.generateChunk(isIntro);
    }
  }

  generateChunk(isIntro = false) {
    const chunkZ = this.nextChunkZ;
    const chunkGroup = new THREE.Group();
    chunkGroup.position.z = chunkZ;

    // 1. Ground Ballast & Track Bed
    const groundGeo = new THREE.PlaneGeometry(16, this.chunkLength);
    const ground = new THREE.Mesh(groundGeo, this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -this.chunkLength / 2);
    ground.receiveShadow = true;
    chunkGroup.add(ground);

    // 2. Sleepers and Steel Rails for each lane
    LANES.forEach(laneX => {
      // 2 Steel Rails
      const railGeo = new THREE.BoxGeometry(0.12, 0.16, this.chunkLength);
      const leftRail = new THREE.Mesh(railGeo, this.railMat);
      leftRail.position.set(laneX - 0.75, 0.08, -this.chunkLength / 2);
      const rightRail = new THREE.Mesh(railGeo, this.railMat);
      rightRail.position.set(laneX + 0.75, 0.08, -this.chunkLength / 2);
      chunkGroup.add(leftRail, rightRail);

      // Wooden Sleepers along chunk
      const sleeperCount = Math.floor(this.chunkLength / 1.6);
      for (let s = 0; s < sleeperCount; s++) {
        const sleeperZ = -s * 1.6 - 0.8;
        const sleeperGeo = new THREE.BoxGeometry(2.0, 0.08, 0.35);
        const sleeper = new THREE.Mesh(sleeperGeo, this.sleeperMat);
        sleeper.position.set(laneX, 0.04, sleeperZ);
        chunkGroup.add(sleeper);
      }
    });

    // 3. Side Walls (Left and Right)
    const wallHeight = 8;
    const wallGeo = new THREE.BoxGeometry(1.2, wallHeight, this.chunkLength);

    const leftWall = new THREE.Mesh(wallGeo, this.wallMat);
    leftWall.position.set(-8.6, wallHeight / 2, -this.chunkLength / 2);
    leftWall.receiveShadow = true;

    const rightWall = new THREE.Mesh(wallGeo, this.wallMat);
    rightWall.position.set(8.6, wallHeight / 2, -this.chunkLength / 2);
    rightWall.receiveShadow = true;

    // Wall top trim
    const trimGeo = new THREE.BoxGeometry(1.6, 0.5, this.chunkLength);
    const leftTrim = new THREE.Mesh(trimGeo, this.wallTrimMat);
    leftTrim.position.set(-8.6, wallHeight + 0.25, -this.chunkLength / 2);
    const rightTrim = new THREE.Mesh(trimGeo, this.wallTrimMat);
    rightTrim.position.set(8.6, wallHeight + 0.25, -this.chunkLength / 2);

    chunkGroup.add(leftWall, rightWall, leftTrim, rightTrim);

    // 4. Overhead Gantry Arch & Cables
    const gantry = this.createGantryArch();
    gantry.position.set(0, 0, -this.chunkLength / 2);
    chunkGroup.add(gantry);

    // 5. Distant City Skyline Buildings
    this.addSkylineBuildings(chunkGroup);

    this.scene.add(chunkGroup);

    const chunkData = {
      group: chunkGroup,
      zStart: chunkZ,
      zEnd: chunkZ - this.chunkLength
    };
    this.chunks.push(chunkData);

    // 6. Spawn Obstacles and Collectibles in this chunk
    if (!isIntro) {
      this.populateChunkContent(chunkZ);
    }

    this.nextChunkZ -= this.chunkLength;
  }

  createGantryArch() {
    const group = new THREE.Group();
    const height = 6.5;
    const span = 17;

    // Left & Right Pillars
    const pillarGeo = new THREE.BoxGeometry(0.5, height, 0.5);
    const leftPillar = new THREE.Mesh(pillarGeo, this.metalGantryMat);
    leftPillar.position.set(-span / 2 + 0.5, height / 2, 0);

    const rightPillar = new THREE.Mesh(pillarGeo, this.metalGantryMat);
    rightPillar.position.set(span / 2 - 0.5, height / 2, 0);

    // Top Crossbeam
    const beamGeo = new THREE.BoxGeometry(span, 0.5, 0.5);
    const crossbeam = new THREE.Mesh(beamGeo, this.metalGantryMat);
    crossbeam.position.set(0, height, 0);

    group.add(leftPillar, rightPillar, crossbeam);

    // Signal lights for each lane
    LANES.forEach(lx => {
      const sigBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.35), this.stripeMat);
      sigBox.position.set(lx, height - 0.45, 0);
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: Math.random() > 0.4 ? 0x00ff44 : 0xff2222 })
      );
      light.position.set(0, -0.15, 0.18);
      sigBox.add(light);
      group.add(sigBox);
    });

    return group;
  }

  addSkylineBuildings(chunkGroup) {
    const sides = [-20, 20];
    sides.forEach(sideX => {
      const count = 3;
      for (let b = 0; b < count; b++) {
        const bHeight = 18 + Math.random() * 25;
        const bWidth = 8 + Math.random() * 6;
        const bDepth = 12 + Math.random() * 8;
        const bZ = -b * 18 - 10;

        const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
        const building = new THREE.Mesh(bGeo, this.buildingMat);
        building.position.set(sideX + (sideX > 0 ? 8 : -8), bHeight / 2 - 2, bZ);
        chunkGroup.add(building);
      }
    });
  }

  populateChunkContent(chunkZ) {
    // Choose chunk pattern to ensure playability (at least 1 open lane always!)
    const patterns = ['TRAIN_RAMP', 'MOVING_TRAIN', 'HURDLES_AND_SLIDES', 'DOUBLE_TRAIN', 'POWERUP_BONANZA'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    const laneIndices = [0, 1, 2]; // 0: Left, 1: Center, 2: Right
    // Shuffle lanes
    laneIndices.sort(() => Math.random() - 0.5);

    if (pattern === 'TRAIN_RAMP') {
      // 1 Lane: Static train with ramp!
      const trainLane = LANES[laneIndices[0]];
      const zPos = chunkZ - 30;
      this.spawnTrain(trainLane, zPos, true); // true = with ramp!

      // Coins on top of the train!
      for (let c = 0; c < 5; c++) {
        this.collectibles.spawnCoin(trainLane, 4.4, zPos - c * 3 + 6);
      }

      // 2nd Lane: Low hurdle
      const hurdleLane = LANES[laneIndices[1]];
      this.spawnHurdle(hurdleLane, chunkZ - 20);
      // Coins jumping over hurdle
      this.spawnCoinArc(hurdleLane, chunkZ - 20);

      // 3rd Lane: Open with powerup
      const openLane = LANES[laneIndices[2]];
      if (Math.random() < 0.4) {
        this.spawnRandomPowerup(openLane, chunkZ - 35);
      } else {
        this.spawnCoinLine(openLane, chunkZ - 15, 6);
      }

    } else if (pattern === 'MOVING_TRAIN') {
      // 1 Lane: Moving train rushing at player!
      const movingLane = LANES[laneIndices[0]];
      this.spawnMovingTrain(movingLane, chunkZ - 50);

      // 2nd Lane: Slide barrier
      const slideLane = LANES[laneIndices[1]];
      this.spawnSlideBarrier(slideLane, chunkZ - 25);
      this.spawnCoinLine(slideLane, chunkZ - 15, 4);

      // 3rd Lane: Open lane with coin line
      const openLane = LANES[laneIndices[2]];
      this.spawnCoinLine(openLane, chunkZ - 20, 7);

    } else if (pattern === 'HURDLES_AND_SLIDES') {
      // Lane 1: Low hurdle
      this.spawnHurdle(LANES[laneIndices[0]], chunkZ - 15);
      this.spawnCoinArc(LANES[laneIndices[0]], chunkZ - 15);

      // Lane 2: Slide barrier
      this.spawnSlideBarrier(LANES[laneIndices[1]], chunkZ - 35);

      // Lane 3: Low hurdle at different Z
      this.spawnHurdle(LANES[laneIndices[2]], chunkZ - 45);

      // Powerup in the open section
      this.spawnRandomPowerup(LANES[laneIndices[1]], chunkZ - 15);

    } else if (pattern === 'DOUBLE_TRAIN') {
      // 2 static trains, 1 open lane in between
      this.spawnTrain(LANES[laneIndices[0]], chunkZ - 30, Math.random() > 0.5);
      this.spawnTrain(LANES[laneIndices[1]], chunkZ - 30, false);

      // The open escape lane has a rich coin trail
      const escapeLane = LANES[laneIndices[2]];
      this.spawnCoinLine(escapeLane, chunkZ - 15, 8);

    } else if (pattern === 'POWERUP_BONANZA') {
      // High reward zone with Jetpack or Magnet
      const powerupLane = LANES[laneIndices[0]];
      this.spawnRandomPowerup(powerupLane, chunkZ - 20);

      // Golden coin ribbons in all 3 lanes at various spots
      this.spawnCoinLine(LANES[0], chunkZ - 10, 4);
      this.spawnCoinLine(LANES[1], chunkZ - 25, 5);
      this.spawnCoinLine(LANES[2], chunkZ - 40, 4);

      // 1 low barrier to test reflexes
      this.spawnHurdle(LANES[laneIndices[1]], chunkZ - 40);
    }
  }

  // --- Obstacle Builders ---

  spawnTrain(x, z, hasRamp = false) {
    const length = 22;
    const height = 3.4;
    const width = 2.6;

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Train Body Box
    const bodyGeo = new THREE.BoxGeometry(width, height, length);
    const body = new THREE.Mesh(bodyGeo, this.trainBodyMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Roof strip
    const roofGeo = new THREE.BoxGeometry(width * 0.9, 0.2, length);
    const roof = new THREE.Mesh(roofGeo, this.trainRoofMat);
    roof.position.y = height + 0.1;
    group.add(roof);

    // Front Window (facing player approaching from +Z)
    const windowGeo = new THREE.BoxGeometry(width * 0.75, 1.0, 0.1);
    const frontWindow = new THREE.Mesh(windowGeo, this.trainWindowMat);
    frontWindow.position.set(0, height * 0.65, length / 2 + 0.02);
    group.add(frontWindow);

    // Headlights
    const hLightGeo = new THREE.CircleGeometry(0.25, 12);
    const leftHeadlight = new THREE.Mesh(hLightGeo, this.headlightMat);
    leftHeadlight.position.set(-0.8, 1.0, length / 2 + 0.05);
    const rightHeadlight = leftHeadlight.clone();
    rightHeadlight.position.x = 0.8;
    group.add(leftHeadlight, rightHeadlight);

    // Side Windows
    const sideWinCount = 4;
    for (let w = 0; w < sideWinCount; w++) {
      const wz = -length / 2 + 3 + w * 4.5;
      const sWinGeo = new THREE.BoxGeometry(0.1, 0.8, 1.8);
      const lWin = new THREE.Mesh(sWinGeo, this.trainWindowMat);
      lWin.position.set(-width / 2 - 0.02, height * 0.6, wz);
      const rWin = lWin.clone();
      rWin.position.x = width / 2 + 0.02;
      group.add(lWin, rWin);
    }

    // Optional Wooden Ramp attached to front
    if (hasRamp) {
      const rampLength = 6.0;
      const rampGeo = new THREE.BufferGeometry();
      // Right triangular wedge prism
      const halfW = width * 0.45;
      const vertices = new Float32Array([
        // Bottom face
        -halfW, 0, rampLength,   halfW, 0, rampLength,   halfW, 0, 0,
        -halfW, 0, rampLength,   halfW, 0, 0,            -halfW, 0, 0,
        // Incline ramp surface (from Y=0 at front to Y=height at train front)
        -halfW, 0, rampLength,   halfW, height, 0,       halfW, 0, rampLength,
        -halfW, 0, rampLength,   -halfW, height, 0,      halfW, height, 0,
        // Left side triangle
        -halfW, 0, 0,            -halfW, height, 0,      -halfW, 0, rampLength,
        // Right side triangle
        halfW, 0, rampLength,    halfW, height, 0,       halfW, 0, 0,
      ]);
      rampGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      rampGeo.computeVertexNormals();

      const ramp = new THREE.Mesh(rampGeo, this.rampMat);
      ramp.position.set(0, 0, length / 2);
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      group.add(ramp);

      // Register ramp for smooth walking upward
      this.ramps.push({
        x,
        zStart: z + length / 2 + rampLength,
        zEnd: z + length / 2,
        height,
        trainTopZStart: z + length / 2,
        trainTopZEnd: z - length / 2
      });
    }

    this.scene.add(group);

    const obstacle = {
      type: 'TRAIN',
      mesh: group,
      x,
      z,
      width: width * 0.9,
      height,
      depth: length,
      hasRamp,
      isSolidRoof: true
    };
    this.obstacles.push(obstacle);
    return obstacle;
  }

  spawnMovingTrain(x, z) {
    const obstacle = this.spawnTrain(x, z, false);
    obstacle.type = 'MOVING_TRAIN';
    obstacle.speed = 18; // rushes towards +Z
    this.movingTrains.push(obstacle);
  }

  spawnHurdle(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const width = 2.4;
    const height = 0.9; // Low barrier: must jump

    // Barrier Crossbar (Yellow & Black stripes)
    const barGeo = new THREE.BoxGeometry(width, 0.35, 0.15);
    const bar = new THREE.Mesh(barGeo, this.hazardMat);
    bar.position.y = height - 0.17;
    bar.castShadow = true;
    group.add(bar);

    // Hazard Stripes on bar
    for (let s = -3; s <= 3; s++) {
      const stripeGeo = new THREE.BoxGeometry(0.18, 0.36, 0.17);
      const stripe = new THREE.Mesh(stripeGeo, this.stripeMat);
      stripe.position.set(s * 0.35, height - 0.17, 0);
      group.add(stripe);
    }

    // Side Posts
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, height, 8);
    const leftPost = new THREE.Mesh(postGeo, this.barrierPostMat);
    leftPost.position.set(-width / 2 + 0.15, height / 2, 0);
    const rightPost = leftPost.clone();
    rightPost.position.x = width / 2 - 0.15;
    group.add(leftPost, rightPost);

    this.scene.add(group);

    const obstacle = {
      type: 'HURDLE',
      mesh: group,
      x,
      z,
      width: width * 0.9,
      height: 0.95,
      depth: 0.8
    };
    this.obstacles.push(obstacle);
    return obstacle;
  }

  spawnSlideBarrier(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const width = 2.6;
    const archHeight = 2.4;
    const bottomGap = 1.05; // Gap underneath for sliding!

    // Overhead Warning Sign
    const signGeo = new THREE.BoxGeometry(width, 1.1, 0.2);
    const sign = new THREE.Mesh(signGeo, this.hazardMat);
    sign.position.y = bottomGap + 0.55;
    sign.castShadow = true;
    group.add(sign);

    // Hazard stripes
    for (let s = -3; s <= 3; s++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.12, 0.22), this.stripeMat);
      stripe.position.set(s * 0.38, bottomGap + 0.55, 0);
      group.add(stripe);
    }

    // Tall side posts
    const postGeo = new THREE.BoxGeometry(0.18, archHeight, 0.18);
    const leftPost = new THREE.Mesh(postGeo, this.barrierPostMat);
    leftPost.position.set(-width / 2 + 0.1, archHeight / 2, 0);
    const rightPost = leftPost.clone();
    rightPost.position.x = width / 2 - 0.1;
    group.add(leftPost, rightPost);

    this.scene.add(group);

    const obstacle = {
      type: 'SLIDE_BARRIER',
      mesh: group,
      x,
      z,
      width: width * 0.9,
      bottomGap,
      topY: archHeight,
      depth: 0.8
    };
    this.obstacles.push(obstacle);
    return obstacle;
  }

  // --- Collectible Spawners ---

  spawnCoinLine(x, startZ, count = 5) {
    for (let i = 0; i < count; i++) {
      this.collectibles.spawnCoin(x, 0.9, startZ - i * 2.2);
    }
  }

  spawnCoinArc(x, centerZ) {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1)) * 2 - 1; // -1 to 1
      const y = 0.9 + (1 - t * t) * 2.2; // Parabolic arc up to 3.1
      const z = centerZ + t * 4.5;
      this.collectibles.spawnCoin(x, y, z);
    }
  }

  spawnRandomPowerup(x, z) {
    const types = ['magnet', 'sneakers', 'jetpack', 'multiplier'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.collectibles.spawnPowerup(type, x, 1.4, z);
  }

  // --- Update Loop ---

  update(delta, playerPos) {
    // 1. Move moving trains towards player (+Z direction)
    for (let i = 0; i < this.movingTrains.length; i++) {
      const train = this.movingTrains[i];
      train.z += train.speed * delta;
      train.mesh.position.z = train.z;
    }

    // 2. Recycle old chunks and spawn new ones ahead
    const oldestChunk = this.chunks[0];
    if (oldestChunk && playerPos.z < oldestChunk.zEnd - 20) {
      this.scene.remove(oldestChunk.group);
      this.chunks.shift();
      this.generateChunk(false);
    }

    // 3. Remove passed obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (obs.z > playerPos.z + 20) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);

        // Remove from moving trains list if applicable
        const mtIndex = this.movingTrains.indexOf(obs);
        if (mtIndex !== -1) this.movingTrains.splice(mtIndex, 1);
      }
    }

    // 4. Clean up ramps that player has passed
    for (let i = this.ramps.length - 1; i >= 0; i--) {
      if (this.ramps[i].trainTopZEnd > playerPos.z + 20) {
        this.ramps.splice(i, 1);
      }
    }
  }

  clearAll() {
    this.chunks.forEach(c => this.scene.remove(c.group));
    this.obstacles.forEach(o => this.scene.remove(o.mesh));
    this.chunks = [];
    this.obstacles = [];
    this.movingTrains = [];
    this.ramps = [];
    this.nextChunkZ = 0;
  }
}
