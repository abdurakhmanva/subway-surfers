import * as THREE from 'three';

export class Character {
  constructor() {
    this.mesh = new THREE.Group();
    this.state = 'RUNNING'; // 'RUNNING', 'JUMPING', 'SLIDING', 'CRASHED', 'HOVERBOARD'
    this.runTime = 0;
    this.slideProgress = 0;
    this.lane = 0; // -1: Left, 0: Center, 1: Right
    this.targetX = 0;
    this.currentX = 0;
    this.yVelocity = 0;
    this.isGrounded = true;
    this.leanAngle = 0;
    this.rollRotation = 0;

    // Hitbox parameters
    this.hitbox = {
      width: 0.9,
      height: 1.8,
      depth: 0.9,
      offsetY: 0.9
    };

    this.buildMesh();
  }

  buildMesh() {
    // Materials with vibrant Subway Surfers palette
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.5 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xee2222, roughness: 0.4 });
    const capVisorMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.3 });
    const hoodieMat = new THREE.MeshStandardMaterial({ color: 0x0099ff, roughness: 0.6 });
    const hoodieTrimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const jeansMat = new THREE.MeshStandardMaterial({ color: 0x223355, roughness: 0.8 });
    const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0xee2222, roughness: 0.4 });
    const backpackMat = new THREE.MeshStandardMaterial({ color: 0x33aa44, roughness: 0.5 });

    // Base wrapper for leaning and rolling
    this.characterGroup = new THREE.Group();
    this.mesh.add(this.characterGroup);

    // 1. Torso
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.y = 1.0;
    this.characterGroup.add(this.torsoGroup);

    const torsoGeo = new THREE.BoxGeometry(0.65, 0.7, 0.4);
    const torsoMesh = new THREE.Mesh(torsoGeo, hoodieMat);
    torsoMesh.castShadow = true;
    this.torsoGroup.add(torsoMesh);

    // Hoodie pocket / details
    const pocketGeo = new THREE.BoxGeometry(0.45, 0.22, 0.08);
    const pocketMesh = new THREE.Mesh(pocketGeo, hoodieTrimMat);
    pocketMesh.position.set(0, -0.15, 0.2);
    this.torsoGroup.add(pocketMesh);

    // Backpack
    const packGeo = new THREE.BoxGeometry(0.5, 0.55, 0.25);
    const packMesh = new THREE.Mesh(packGeo, backpackMat);
    packMesh.position.set(0, 0.05, -0.28);
    packMesh.castShadow = true;
    this.torsoGroup.add(packMesh);

    // Spray can on backpack
    const canGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8);
    const canMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.6, roughness: 0.3 });
    const canMesh = new THREE.Mesh(canGeo, canMat);
    canMesh.position.set(0.18, 0.05, -0.42);
    canMesh.rotation.x = 0.2;
    this.torsoGroup.add(canMesh);

    // 2. Head & Cap
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.55, 0);
    this.torsoGroup.add(this.headGroup);

    const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Hair / Ear details
    const earGeo = new THREE.BoxGeometry(0.08, 0.12, 0.1);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.24, 0, 0);
    const rightEar = leftEar.clone();
    rightEar.position.set(0.24, 0, 0);
    this.headGroup.add(leftEar, rightEar);

    // Backwards Cap Dome
    const capGeo = new THREE.BoxGeometry(0.46, 0.22, 0.46);
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.set(0, 0.16, 0.02);
    this.headGroup.add(capMesh);

    // Backwards Cap Visor
    const visorGeo = new THREE.BoxGeometry(0.4, 0.06, 0.28);
    const visorMesh = new THREE.Mesh(visorGeo, capVisorMat);
    visorMesh.position.set(0, 0.08, -0.32);
    visorMesh.rotation.x = -0.15;
    this.headGroup.add(visorMesh);

    // 3. Arms
    const armGeo = new THREE.BoxGeometry(0.18, 0.6, 0.2);
    // Shoulder pivots
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.42, 0.25, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, hoodieMat);
    leftArmMesh.position.y = -0.28;
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);

    // Left hand
    const handGeo = new THREE.BoxGeometry(0.16, 0.18, 0.18);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.y = -0.62;
    this.leftArm.add(leftHand);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.42, 0.25, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, hoodieMat);
    rightArmMesh.position.y = -0.28;
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);

    // Right hand
    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.y = -0.62;
    this.rightArm.add(rightHand);

    this.torsoGroup.add(this.leftArm, this.rightArm);

    // 4. Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.55, 0.26);

    // Left Leg Pivot (at hip)
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, 0.6, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, jeansMat);
    leftLegMesh.position.y = -0.26;
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);

    // Left Sneaker
    const sneakerGeo = new THREE.BoxGeometry(0.26, 0.2, 0.44);
    const leftSneaker = new THREE.Mesh(sneakerGeo, sneakerMat);
    leftSneaker.position.set(0, -0.52, 0.08);
    leftSneaker.castShadow = true;
    const soleGeo = new THREE.BoxGeometry(0.28, 0.06, 0.46);
    const leftSole = new THREE.Mesh(soleGeo, soleMat);
    leftSole.position.set(0, -0.1, 0);
    leftSneaker.add(leftSole);
    this.leftLeg.add(leftSneaker);

    // Right Leg Pivot (at hip)
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, 0.6, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, jeansMat);
    rightLegMesh.position.y = -0.26;
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);

    // Right Sneaker
    const rightSneaker = leftSneaker.clone();
    this.rightLeg.add(rightSneaker);

    this.characterGroup.add(this.leftLeg, this.rightLeg);

    // 5. Shadow Blob beneath character
    const shadowGeo = new THREE.CircleGeometry(0.65, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    this.blobShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.blobShadow.rotation.x = -Math.PI / 2;
    this.blobShadow.position.y = 0.02;
    this.mesh.add(this.blobShadow);

    // 6. Jetpack item (attached to backpack, invisible until equipped)
    this.jetpackProp = new THREE.Group();
    const rocketGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 12);
    const rocketMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.8, roughness: 0.2 });
    const r1 = new THREE.Mesh(rocketGeo, rocketMat);
    r1.position.x = -0.22;
    const r2 = new THREE.Mesh(rocketGeo, rocketMat);
    r2.position.x = 0.22;
    this.jetpackProp.add(r1, r2);
    this.jetpackProp.position.set(0, 0.05, -0.45);
    this.jetpackProp.visible = false;
    this.torsoGroup.add(this.jetpackProp);

    // 7. Hoverboard prop (under feet, invisible until activated)
    this.hoverboard = new THREE.Group();
    const deckGeo = new THREE.BoxGeometry(0.7, 0.08, 1.8);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xff0055, roughness: 0.2, metalness: 0.5 });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.castShadow = true;
    this.hoverboard.add(deckMesh);
    this.hoverboard.position.y = 0.12;
    this.hoverboard.visible = false;
    this.mesh.add(this.hoverboard);
  }

  // Lane shifting: -1 (left), 0 (center), 1 (right)
  setLane(laneIndex, laneWidth = 3.2) {
    this.lane = Math.max(-1, Math.min(1, laneIndex));
    this.targetX = this.lane * laneWidth;
  }

  jump(jumpPower = 18) {
    if (this.isGrounded && this.state !== 'CRASHED') {
      this.yVelocity = jumpPower;
      this.isGrounded = false;
      this.state = 'JUMPING';
      return true;
    }
    return false;
  }

  // Fast dive when pressing down in air (Subway Surfers signature mechanic!)
  dive() {
    if (!this.isGrounded && this.state !== 'CRASHED') {
      this.yVelocity = -28;
    }
  }

  slide() {
    if (this.state === 'CRASHED') return;
    if (!this.isGrounded) {
      this.dive();
    }
    this.state = 'SLIDING';
    this.slideProgress = 0.7; // ~0.7s slide duration
    // Shrink hitbox
    this.hitbox.height = 0.7;
    this.hitbox.offsetY = 0.35;
  }

  crash() {
    this.state = 'CRASHED';
    this.yVelocity = 6;
  }

  update(delta, runSpeed = 20) {
    // 1. Smooth horizontal lane interpolation
    const lerpSpeed = 16;
    const prevX = this.currentX;
    this.currentX += (this.targetX - this.currentX) * Math.min(1, delta * lerpSpeed);
    this.mesh.position.x = this.currentX;

    // Lean into lane change
    const deltaX = this.targetX - this.currentX;
    const targetLean = -deltaX * 0.18;
    this.leanAngle += (targetLean - this.leanAngle) * Math.min(1, delta * 12);
    this.characterGroup.rotation.z = this.leanAngle;

    // 2. Vertical Physics (Gravity & Jump)
    if (!this.isGrounded) {
      const gravity = 55;
      this.yVelocity -= gravity * delta;
      this.mesh.position.y += this.yVelocity * delta;

      if (this.mesh.position.y <= 0) {
        this.mesh.position.y = 0;
        this.yVelocity = 0;
        this.isGrounded = true;
        if (this.state === 'JUMPING') {
          this.state = 'RUNNING';
        }
      }
    }

    // Shadow scales with height
    const heightFactor = Math.max(0.2, 1 - this.mesh.position.y * 0.12);
    this.blobShadow.scale.set(heightFactor, heightFactor, 1);
    this.blobShadow.material.opacity = 0.35 * heightFactor;

    // 3. State & Animation Machine
    if (this.state === 'CRASHED') {
      // Tumble backwards
      this.characterGroup.rotation.x += delta * 6;
      this.leftArm.rotation.x = Math.PI * 0.7;
      this.rightArm.rotation.x = Math.PI * 0.7;
      this.leftLeg.rotation.x = -Math.PI * 0.4;
      this.rightLeg.rotation.x = -Math.PI * 0.4;
      return;
    }

    if (this.state === 'SLIDING') {
      this.slideProgress -= delta;
      // Tuck and roll or slide low
      this.characterGroup.position.y = -0.4;
      this.characterGroup.rotation.x = Math.PI * 0.35;
      this.torsoGroup.rotation.x = 0.3;
      this.leftLeg.rotation.x = -Math.PI * 0.4;
      this.rightLeg.rotation.x = -Math.PI * 0.4;
      this.leftArm.rotation.x = -Math.PI * 0.5;
      this.rightArm.rotation.x = -Math.PI * 0.5;

      if (this.slideProgress <= 0) {
        this.state = 'RUNNING';
        this.characterGroup.position.y = 0;
        this.characterGroup.rotation.x = 0;
        this.torsoGroup.rotation.x = 0;
        this.hitbox.height = 1.8;
        this.hitbox.offsetY = 0.9;
      }
      return;
    }

    if (this.state === 'JUMPING') {
      // Jump pose: legs tucked slightly, arms wide
      this.characterGroup.position.y = 0;
      this.characterGroup.rotation.x = -0.15;
      this.leftLeg.rotation.x = -0.5;
      this.rightLeg.rotation.x = -0.3;
      this.leftArm.rotation.x = -1.2;
      this.leftArm.rotation.z = -0.4;
      this.rightArm.rotation.x = -1.2;
      this.rightArm.rotation.z = 0.4;
      this.torsoGroup.position.y = 1.0;
      return;
    }

    // RUNNING Animation (Dynamic cyclic stride based on game speed)
    this.runTime += delta * (runSpeed * 0.65);
    const cycle = this.runTime;
    const stride = Math.sin(cycle);
    const cosStride = Math.cos(cycle);

    // Torso bounce
    this.torsoGroup.position.y = 1.0 + Math.abs(stride) * 0.12;
    this.torsoGroup.rotation.y = -stride * 0.12;

    // Head subtle opposite bob
    this.headGroup.rotation.y = stride * 0.08;

    // Legs swing back and forth
    this.leftLeg.rotation.x = stride * 0.95;
    this.rightLeg.rotation.x = -stride * 0.95;

    // Arms swing in anti-phase to legs
    this.leftArm.rotation.x = -stride * 0.85;
    this.leftArm.rotation.z = -0.15;
    this.rightArm.rotation.x = stride * 0.85;
    this.rightArm.rotation.z = 0.15;
  }
}

// Security Inspector & Bulldog (The classic Subway Surfers pursuers!)
export class InspectorChaser {
  constructor() {
    this.mesh = new THREE.Group();
    this.distanceBehind = 4.5; // Starts directly behind Jake
    this.targetDistance = 8.0; // Gradually retreats when player doesn't stumble
    this.visible = true;
    this.stumbleTimer = 0;

    this.buildInspector();
    this.buildDog();
  }

  buildInspector() {
    this.guardGroup = new THREE.Group();
    this.guardGroup.position.set(-0.6, 0, 0);
    this.mesh.add(this.guardGroup);

    const uniformMat = new THREE.MeshStandardMaterial({ color: 0x2b3846, roughness: 0.7 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x47637f, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6b89c, roughness: 0.5 });
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x1f2730, roughness: 0.4 });

    // Chunky torso
    this.guardTorso = new THREE.Group();
    this.guardTorso.position.y = 1.1;
    const bodyGeo = new THREE.BoxGeometry(0.85, 0.8, 0.5);
    const bodyMesh = new THREE.Mesh(bodyGeo, shirtMat);
    bodyMesh.castShadow = true;
    this.guardTorso.add(bodyMesh);

    // Badge
    const badgeGeo = new THREE.BoxGeometry(0.12, 0.15, 0.04);
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0.22, 0.15, 0.26);
    this.guardTorso.add(badge);

    // Head & Mustache
    const headGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = 0.65;
    headMesh.castShadow = true;
    this.guardTorso.add(headMesh);

    // Security Cap
    const capGeo = new THREE.BoxGeometry(0.52, 0.2, 0.52);
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.set(0, 0.8, 0);
    const visorGeo = new THREE.BoxGeometry(0.48, 0.05, 0.25);
    const visor = new THREE.Mesh(visorGeo, capMat);
    visor.position.set(0, 0.72, 0.32);
    this.guardTorso.add(capMesh, visor);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
    this.gLeftArm = new THREE.Group();
    this.gLeftArm.position.set(-0.52, 0.3, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, uniformMat);
    leftArmMesh.position.y = -0.3;
    this.gLeftArm.add(leftArmMesh);

    this.gRightArm = new THREE.Group();
    this.gRightArm.position.set(0.52, 0.3, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, uniformMat);
    rightArmMesh.position.y = -0.3;
    this.gRightArm.add(rightArmMesh);

    this.guardTorso.add(this.gLeftArm, this.gRightArm);
    this.guardGroup.add(this.guardTorso);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.3, 0.65, 0.3);
    this.gLeftLeg = new THREE.Group();
    this.gLeftLeg.position.set(-0.25, 0.65, 0);
    const lLegMesh = new THREE.Mesh(legGeo, uniformMat);
    lLegMesh.position.y = -0.32;
    this.gLeftLeg.add(lLegMesh);

    this.gRightLeg = new THREE.Group();
    this.gRightLeg.position.set(0.25, 0.65, 0);
    const rLegMesh = new THREE.Mesh(legGeo, uniformMat);
    rLegMesh.position.y = -0.32;
    this.gRightLeg.add(rLegMesh);

    this.guardGroup.add(this.gLeftLeg, this.gRightLeg);
  }

  buildDog() {
    this.dogGroup = new THREE.Group();
    this.dogGroup.position.set(0.65, 0, 0.3);
    this.mesh.add(this.dogGroup);

    const dogMat = new THREE.MeshStandardMaterial({ color: 0x996633, roughness: 0.8 });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xee2222, roughness: 0.4 });

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.4, 0.35, 0.65);
    const body = new THREE.Mesh(bodyGeo, dogMat);
    body.position.y = 0.35;
    body.castShadow = true;
    this.dogGroup.add(body);

    // Dog Head
    const headGeo = new THREE.BoxGeometry(0.32, 0.32, 0.35);
    const head = new THREE.Mesh(headGeo, dogMat);
    head.position.set(0, 0.55, 0.35);
    this.dogGroup.add(head);

    // Collar
    const collarGeo = new THREE.BoxGeometry(0.34, 0.08, 0.36);
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.45, 0.22);
    this.dogGroup.add(collar);

    // Dog Legs
    const dLegGeo = new THREE.BoxGeometry(0.12, 0.25, 0.12);
    this.dLegs = [];
    const positions = [
      [-0.15, 0.12, 0.2],
      [0.15, 0.12, 0.2],
      [-0.15, 0.12, -0.2],
      [0.15, 0.12, -0.2]
    ];
    positions.forEach(pos => {
      const legGroup = new THREE.Group();
      legGroup.position.set(pos[0], pos[1], pos[2]);
      const legMesh = new THREE.Mesh(dLegGeo, dogMat);
      legMesh.position.y = -0.08;
      legGroup.add(legMesh);
      this.dogGroup.add(legGroup);
      this.dLegs.push(legGroup);
    });
  }

  triggerStumble() {
    this.distanceBehind = 2.0; // Leaps closer!
    this.stumbleTimer = 5.0; // Stays close for 5 seconds
  }

  update(delta, playerPos, playerLaneX, runSpeed = 20) {
    if (this.stumbleTimer > 0) {
      this.stumbleTimer -= delta;
      if (this.stumbleTimer <= 0) {
        this.targetDistance = 7.0;
      }
    }

    // Follow player with smooth lag
    this.distanceBehind += (this.targetDistance - this.distanceBehind) * Math.min(1, delta * 0.8);
    this.mesh.position.z = playerPos.z + this.distanceBehind;

    // Follow player lane
    this.mesh.position.x += (playerLaneX - this.mesh.position.x) * Math.min(1, delta * 6);

    // Running animation
    const cycle = Date.now() * 0.015 * (runSpeed / 20);
    const s = Math.sin(cycle);

    this.gLeftLeg.rotation.x = s * 0.8;
    this.gRightLeg.rotation.x = -s * 0.8;
    this.gLeftArm.rotation.x = -s * 0.8;
    this.gRightArm.rotation.x = s * 0.8;
    this.guardTorso.position.y = 1.1 + Math.abs(s) * 0.08;

    // Dog scampering animation
    this.dLegs[0].rotation.x = s * 1.2;
    this.dLegs[1].rotation.x = -s * 1.2;
    this.dLegs[2].rotation.x = -s * 1.2;
    this.dLegs[3].rotation.x = s * 1.2;
  }
}
