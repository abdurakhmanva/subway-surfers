import * as THREE from 'three';
import { Character, InspectorChaser } from './character.js';
import { WorldManager, LANES, LANE_WIDTH } from './world.js';
import { CollectiblesManager } from './collectibles.js';
import { ParticleSystem } from './particles.js';
import { sounds } from './audio.js';

export class SubwaySurfersGame {
  constructor(canvasContainer, uiCallbacks) {
    this.container = canvasContainer;
    this.ui = uiCallbacks;

    // Game States: 'MENU', 'RUNNING', 'CRASHED', 'PAUSED'
    this.state = 'MENU';

    // Game Variables
    this.score = 0;
    this.coins = 0;
    this.multiplier = 1;
    this.baseSpeed = 24;
    this.speed = this.baseSpeed;
    this.maxSpeed = 46;
    this.distance = 0;

    // Powerup state
    this.activePowerups = {
      magnet: 0,
      sneakers: 0,
      jetpack: 0,
      multiplier: 0
    };

    // Floor height tracking (ground = 0, train roof = 3.4)
    this.currentFloorY = 0;

    // Camera targets
    this.camOffset = new THREE.Vector3(0, 3.8, 7.5);
    this.camTarget = new THREE.Vector3(0, 1.8, 0);

    this.initThree();
    this.initEntities();
    this.initInput();

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Clear sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.007);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      600
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    // Sunlight
    this.dirLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    this.dirLight.position.set(20, 45, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 150;
    this.dirLight.shadow.camera.left = -25;
    this.dirLight.shadow.camera.right = 25;
    this.dirLight.shadow.camera.top = 25;
    this.dirLight.shadow.camera.bottom = -25;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Ambient & Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.85);
    this.scene.add(hemiLight);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initEntities() {
    this.particles = new ParticleSystem(this.scene);
    this.collectibles = new CollectiblesManager(this.scene);
    this.world = new WorldManager(this.scene, this.collectibles);
    this.character = new Character();
    this.chaser = new InspectorChaser();

    this.scene.add(this.character.mesh);
    this.scene.add(this.chaser.mesh);

    this.world.initWorld();
    this.resetPlayerPosition();
  }

  resetPlayerPosition() {
    this.character.lane = 0;
    this.character.targetX = 0;
    this.character.currentX = 0;
    this.character.mesh.position.set(0, 0, 0);
    this.character.state = 'RUNNING';
    this.character.yVelocity = 0;
    this.character.isGrounded = true;

    this.chaser.distanceBehind = 4.5;
    this.chaser.targetDistance = 7.5;
    this.chaser.mesh.position.set(0, 0, 4.5);

    this.camera.position.set(0, 4.0, 7.5);
    this.camera.lookAt(0, 1.8, 0);
  }

  startGame() {
    sounds.init();
    sounds.startBGM();

    this.score = 0;
    this.coins = 0;
    this.multiplier = 1;
    this.speed = this.baseSpeed;
    this.distance = 0;

    this.activePowerups = { magnet: 0, sneakers: 0, jetpack: 0, multiplier: 0 };
    this.character.jetpackProp.visible = false;

    this.world.clearAll();
    this.collectibles.clearAll();
    this.world.initWorld();

    this.resetPlayerPosition();
    this.state = 'RUNNING';

    if (this.ui.onStateChange) this.ui.onStateChange(this.state);
  }

  initInput() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (this.state === 'MENU' || this.state === 'CRASHED') {
        if (e.code === 'Space' || e.code === 'Enter') {
          this.startGame();
        }
        return;
      }

      if (e.code === 'KeyP') {
        this.togglePause();
        return;
      }

      if (this.state !== 'RUNNING') return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLane(-1);
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveLane(1);
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          this.playerJump();
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.playerSlide();
          break;
      }
    });

    // Touch & Swipe Controls (Mobile + Mouse)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const onStart = (clientX, clientY) => {
      touchStartX = clientX;
      touchStartY = clientY;
      touchStartTime = performance.now();
    };

    const onEnd = (clientX, clientY) => {
      if (this.state === 'MENU' || this.state === 'CRASHED') {
        this.startGame();
        return;
      }
      if (this.state !== 'RUNNING') return;

      const dx = clientX - touchStartX;
      const dy = clientY - touchStartY;
      const dt = performance.now() - touchStartTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < 20 && absDy < 20) return; // Too small

      if (absDx > absDy) {
        // Horizontal Swipe
        if (dx > 0) this.moveLane(1);
        else this.moveLane(-1);
      } else {
        // Vertical Swipe
        if (dy < 0) this.playerJump();
        else this.playerSlide();
      }
    };

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }, { passive: true });

    let isMouseDown = false;
    window.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      onStart(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', (e) => {
      if (isMouseDown) {
        isMouseDown = false;
        onEnd(e.clientX, e.clientY);
      }
    });
  }

  moveLane(direction) {
    if (this.character.state === 'CRASHED') return;
    const newLane = this.character.lane + direction;
    if (newLane >= -1 && newLane <= 1) {
      this.character.setLane(newLane, LANE_WIDTH);
    }
  }

  playerJump() {
    if (this.character.state === 'CRASHED') return;
    const jumpPower = this.activePowerups.sneakers > 0 ? 25 : 18;
    const jumped = this.character.jump(jumpPower);
    if (jumped) {
      sounds.playJump();
    }
  }

  playerSlide() {
    if (this.character.state === 'CRASHED') return;
    this.character.slide();
    sounds.playSlide();
    this.particles.emit('dust', this.character.mesh.position, 12);
  }

  togglePause() {
    if (this.state === 'RUNNING') {
      this.state = 'PAUSED';
      sounds.stopBGM();
    } else if (this.state === 'PAUSED') {
      this.state = 'RUNNING';
      sounds.startBGM();
    }
    if (this.ui.onStateChange) this.ui.onStateChange(this.state);
  }

  triggerCrash() {
    if (this.state === 'CRASHED') return;
    this.state = 'CRASHED';
    this.character.crash();
    sounds.playCrash();
    sounds.stopBGM();
    sounds.stopJetpackSound();

    // Inspector rushes in to catch player
    this.chaser.distanceBehind = 0.8;

    if (this.ui.onGameOver) {
      this.ui.onGameOver({
        score: Math.floor(this.score),
        coins: this.coins
      });
    }
  }

  triggerStumble() {
    this.chaser.triggerStumble();
    // Quick camera shake
    this.camOffset.x = (Math.random() - 0.5) * 0.6;
    setTimeout(() => { this.camOffset.x = 0; }, 200);
  }

  updatePhysicsAndCollisions(delta) {
    const pPos = this.character.mesh.position;

    // 1. Ramps and Elevated Train Roof Detection
    let detectedFloor = 0;
    for (let r of this.world.ramps) {
      // Check if player is on the ramp lane and in ramp Z segment
      if (Math.abs(pPos.x - r.x) < 1.3) {
        if (pPos.z <= r.zStart && pPos.z >= r.zEnd) {
          // Incline upward smoothly
          const progress = (r.zStart - pPos.z) / (r.zStart - r.zEnd);
          detectedFloor = progress * r.height;
          break;
        } else if (pPos.z < r.trainTopZStart && pPos.z >= r.trainTopZEnd) {
          // On train roof
          detectedFloor = r.height;
          break;
        }
      }
    }

    // Also check other trains with solid roofs
    if (detectedFloor === 0) {
      for (let obs of this.world.obstacles) {
        if (obs.type === 'TRAIN' && obs.isSolidRoof) {
          const halfD = obs.depth / 2;
          if (Math.abs(pPos.x - obs.x) < 1.3 && pPos.z <= obs.z + halfD && pPos.z >= obs.z - halfD) {
            if (pPos.y >= obs.height - 0.5) {
              detectedFloor = obs.height;
              break;
            }
          }
        }
      }
    }

    this.currentFloorY = detectedFloor;

    // Apply ground / roof clamping
    if (pPos.y < this.currentFloorY) {
      pPos.y = this.currentFloorY;
      this.character.yVelocity = 0;
      this.character.isGrounded = true;
      if (this.character.state === 'JUMPING') {
        this.character.state = 'RUNNING';
      }
    } else if (pPos.y > this.currentFloorY + 0.1 && this.character.isGrounded) {
      // Stepped off roof: begin falling!
      this.character.isGrounded = false;
    }

    // 2. Jetpack flight override
    if (this.activePowerups.jetpack > 0) {
      // Ascend to Y = 11.5
      pPos.y += (11.5 - pPos.y) * Math.min(1, delta * 6);
      this.character.isGrounded = false;
      this.character.jetpackProp.visible = true;
      this.particles.emit('jetpack', new THREE.Vector3(pPos.x, pPos.y + 0.6, pPos.z - 0.4), 3);
      return; // Immune to ground obstacles while flying!
    } else {
      this.character.jetpackProp.visible = false;
    }

    // 3. Obstacle Collision Detection (AABB)
    const pHit = this.character.hitbox;
    const pMinX = pPos.x - pHit.width / 2;
    const pMaxX = pPos.x + pHit.width / 2;
    const pMinY = pPos.y;
    const pMaxY = pPos.y + pHit.height;
    const pMinZ = pPos.z - pHit.depth / 2;
    const pMaxZ = pPos.z + pHit.depth / 2;

    for (let obs of this.world.obstacles) {
      if (obs.type === 'TRAIN' || obs.type === 'MOVING_TRAIN') {
        const halfW = obs.width / 2;
        const halfD = obs.depth / 2;
        const oMinX = obs.x - halfW;
        const oMaxX = obs.x + halfW;
        const oMinZ = obs.z - halfD;
        const oMaxZ = obs.z + halfD;
        const oMaxY = obs.height;

        // Check if player collides with the train's front or sides
        if (pMaxX > oMinX && pMinX < oMaxX && pMaxZ > oMinZ && pMinZ < oMaxZ) {
          // If player is below roof level and enters from the front
          if (pMinY < oMaxY - 0.4) {
            // Did the player hit the ramp?
            let onRamp = false;
            if (obs.hasRamp) {
              const rampZStart = obs.z + halfD + 6.0;
              if (pPos.z <= rampZStart && pPos.z >= obs.z + halfD) {
                onRamp = true;
              }
            }
            if (!onRamp) {
              this.triggerCrash();
              return;
            }
          }
        }
      } else if (obs.type === 'HURDLE') {
        const halfW = obs.width / 2;
        const halfD = obs.depth / 2;
        if (
          pMaxX > obs.x - halfW &&
          pMinX < obs.x + halfW &&
          pMaxZ > obs.z - halfD &&
          pMinZ < obs.z + halfD
        ) {
          // Low barrier: player collides if their feet are below hurdle height (0.9)
          if (pMinY < obs.height - 0.15) {
            this.triggerCrash();
            return;
          }
        }
      } else if (obs.type === 'SLIDE_BARRIER') {
        const halfW = obs.width / 2;
        const halfD = obs.depth / 2;
        if (
          pMaxX > obs.x - halfW &&
          pMinX < obs.x + halfW &&
          pMaxZ > obs.z - halfD &&
          pMinZ < obs.z + halfD
        ) {
          // Overhead barrier: safe if sliding under bottomGap (1.05)
          if (pMaxY > obs.bottomGap) {
            this.triggerCrash();
            return;
          }
        }
      }
    }
  }

  updatePowerups(delta) {
    for (let key in this.activePowerups) {
      if (this.activePowerups[key] > 0) {
        this.activePowerups[key] -= delta;
        if (this.activePowerups[key] <= 0) {
          this.activePowerups[key] = 0;
          if (key === 'jetpack') {
            sounds.stopJetpackSound();
          }
        }
      }
    }
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    const delta = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (this.state === 'RUNNING') {
      // Speed progression
      this.speed = Math.min(this.maxSpeed, this.baseSpeed + (this.distance / 150) * 1.5);

      // Move player forward (-Z direction)
      const forwardDist = this.speed * delta;
      this.character.mesh.position.z -= forwardDist;
      this.distance += forwardDist;

      // Score counter
      const activeMult = (this.multiplier) * (this.activePowerups.multiplier > 0 ? 2 : 1);
      this.score += forwardDist * 0.5 * activeMult;

      // Update Powerups
      this.updatePowerups(delta);

      // Character physics & update
      this.character.update(delta, this.speed);
      this.updatePhysicsAndCollisions(delta);

      // Chaser (Inspector & Dog)
      this.chaser.update(delta, this.character.mesh.position, this.character.currentX, this.speed);

      // World & Obstacles
      this.world.update(delta, this.character.mesh.position);

      // Collectibles & Magnet
      const magnetActive = this.activePowerups.magnet > 0;
      this.collectibles.update(
        delta,
        this.character.mesh.position,
        magnetActive,
        (coinPos) => {
          this.coins += 1;
          this.score += 60 * activeMult;
          sounds.playCoin();
          this.particles.emit('coin', coinPos, 8);
        },
        (pType, pPos) => {
          sounds.playPowerup();
          this.particles.emit('coin', pPos, 15);
          if (pType === 'magnet') {
            this.activePowerups.magnet = 10;
          } else if (pType === 'sneakers') {
            this.activePowerups.sneakers = 12;
          } else if (pType === 'jetpack') {
            this.activePowerups.jetpack = 10;
            sounds.startJetpackSound();
          } else if (pType === 'multiplier') {
            this.activePowerups.multiplier = 15;
          }
        }
      );

      // Dynamic Sunlight following player
      this.dirLight.position.z = this.character.mesh.position.z + 20;
      this.dirLight.target.position.z = this.character.mesh.position.z;

      // Particles
      this.particles.update(delta);

      // Camera Smooth Follow
      const targetCamX = this.character.currentX * 0.7;
      const targetCamY = Math.max(3.8, this.character.mesh.position.y + 3.8);
      const targetCamZ = this.character.mesh.position.z + this.camOffset.z;

      this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, delta * 12);
      this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, delta * 8);
      this.camera.position.z = targetCamZ;

      const lookY = Math.max(1.8, this.character.mesh.position.y + 1.2);
      this.camTarget.set(this.character.currentX * 0.5, lookY, this.character.mesh.position.z - 8);
      this.camera.lookAt(this.camTarget);

      // Push HUD updates
      if (this.ui.onUpdateHUD) {
        this.ui.onUpdateHUD({
          score: Math.floor(this.score),
          coins: this.coins,
          multiplier: activeMult,
          powerups: this.activePowerups
        });
      }
    } else if (this.state === 'CRASHED') {
      this.character.update(delta, 0);
      this.particles.update(delta);

      // Orbit camera around crash site
      const pPos = this.character.mesh.position;
      this.camera.lookAt(pPos.x, pPos.y + 1.0, pPos.z);
    } else if (this.state === 'MENU') {
      // Idle menu camera pan
      const pPos = this.character.mesh.position;
      const t = time * 0.001;
      this.camera.position.set(Math.sin(t) * 4, 3.2, pPos.z + 6);
      this.camera.lookAt(pPos.x, 1.2, pPos.z);
      this.character.update(delta, 0);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
