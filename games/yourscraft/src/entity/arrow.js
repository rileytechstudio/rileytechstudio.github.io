

import * as THREE from 'three';
import { Entity, AABB } from './mob.js';
import { BLOCKS } from '../core/chunk.js';

export const ARROW_GRAVITY = 20.0; // Ballistic gravity acceleration (m/s^2)
export const ARROW_DRAG = 0.99;    // Air resistance retention factor per tick

export function createArrowMesh() {
    const group = new THREE.Group();

    // 1. Shaft (Wood / Brown)
    const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 6);
    shaftGeo.rotateX(Math.PI / 2); // Orient along Z axis
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.castShadow = true;
    group.add(shaft);

    // 2. Arrowhead (Flint / Slate Gray)
    const headGeo = new THREE.ConeGeometry(0.055, 0.14, 4);
    headGeo.rotateX(-Math.PI / 2); // Point along forward -Z
    headGeo.translate(0, 0, -0.34);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x3A3A3A });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    group.add(head);

    // 3. Fletching (Feathers / Light Gray)
    const featherMat = new THREE.MeshLambertMaterial({
        color: 0xEEEEEE,
        side: THREE.DoubleSide
    });

    const featherGeo1 = new THREE.PlaneGeometry(0.12, 0.18);
    featherGeo1.translate(0, 0, 0.22);
    const feather1 = new THREE.Mesh(featherGeo1, featherMat);

    const featherGeo2 = new THREE.PlaneGeometry(0.12, 0.18);
    featherGeo2.rotateZ(Math.PI / 2);
    featherGeo2.translate(0, 0, 0.22);
    const feather2 = new THREE.Mesh(featherGeo2, featherMat);

    group.add(feather1);
    group.add(feather2);

    return group;
}

export class Arrow extends Entity {
    
    constructor(options = {}) {
        const x = options.x || 0;
        const y = options.y || 0;
        const z = options.z || 0;
        super('arrow', x, y, z);

        this.width = 0.25;
        this.height = 0.25;
        this.eyeHeight = 0.125;

        this.shooter = options.shooter || null;
        this.damage = options.damage !== undefined ? options.damage : 4.0;
        this.isCritical = Boolean(options.isCritical);
        this.knockbackStrength = options.knockbackStrength !== undefined ? options.knockbackStrength : 0.6;
        this.gravity = options.gravity !== undefined ? options.gravity : ARROW_GRAVITY;
        this.scene = options.scene || null;

        // Ground collision & lifetime state
        this.inGround = false;
        this.groundPos = null;
        this.groundBlockId = 0;
        this.ticksInAir = 0;
        this.ticksInGround = 0;
        this.shakeTimer = 0;

        // Three.js visual mesh
        this.mesh = createArrowMesh();
        this.mesh.position.set(x, y, z);
        this.mesh.userData.entity = this;
        this.mesh.userData.arrow = this;

        // Initialize Velocity from Direction & Speed
        const speed = options.speed !== undefined ? options.speed : 26.0;
        if (options.direction) {
            const dir = options.direction;
            const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
            this.velocity.x = (dir.x / len) * speed;
            this.velocity.y = (dir.y / len) * speed;
            this.velocity.z = (dir.z / len) * speed;
        } else {
            this.velocity.x = options.vx || 0;
            this.velocity.y = options.vy || 0;
            this.velocity.z = options.vz || 0;
        }

        this.updateRotationFromVelocity();
        this.updateHitbox();
    }

    updateRotationFromVelocity() {
        const vx = this.velocity.x;
        const vy = this.velocity.y;
        const vz = this.velocity.z;
        const speedH = Math.hypot(vx, vz);

        if (speedH > 0.0001 || Math.abs(vy) > 0.0001) {
            this.rotation.yaw = Math.atan2(vx, vz);
            this.rotation.pitch = Math.atan2(vy, speedH);

            if (this.mesh) {
                this.mesh.rotation.order = 'YXZ';
                this.mesh.rotation.y = this.rotation.yaw + Math.PI; // Face arrow forward along trajectory
                this.mesh.rotation.x = -this.rotation.pitch;
            }
        }
    }

    shoot(direction, speed, inaccuracy = 0) {
        let dx = direction.x;
        let dy = direction.y;
        let dz = direction.z;

        if (inaccuracy > 0) {
            dx += (Math.random() - 0.5) * inaccuracy;
            dy += (Math.random() - 0.5) * inaccuracy;
            dz += (Math.random() - 0.5) * inaccuracy;
        }

        const len = Math.hypot(dx, dy, dz) || 1;
        this.velocity.x = (dx / len) * speed;
        this.velocity.y = (dy / len) * speed;
        this.velocity.z = (dz / len) * speed;

        this.inGround = false;
        this.ticksInAir = 0;
        this.updateRotationFromVelocity();
    }

    update(dt = 0.05, world = null) {
        if (this.removed || this.isDead) return;

        // 1. Stuck in Ground Logic
        if (this.inGround) {
            this.ticksInGround += dt;
            if (this.shakeTimer > 0) {
                this.shakeTimer -= dt;
            }

            // If the block the arrow is stuck in gets destroyed, resume falling
            if (world && this.groundPos && typeof world.getBlock === 'function') {
                const blockId = world.getBlock(this.groundPos.x, this.groundPos.y, this.groundPos.z);
                if (blockId === BLOCKS.AIR || blockId === 0) {
                    this.inGround = false;
                    this.groundPos = null;
                    this.velocity.y = -1.0;
                }
            }

            // Despawn after 60 seconds stuck in block
            if (this.ticksInGround > 60.0) {
                this.remove(world);
            }
            return;
        }

        // 2. Air Flight Progression & Bounds Check
        this.ticksInAir += dt;
        if (this.ticksInAir > 30.0 || this.position.y < -32 || this.position.y > 320) {
            this.remove(world);
            return;
        }

        this.prevPosition.x = this.position.x;
        this.prevPosition.y = this.position.y;
        this.prevPosition.z = this.position.z;

        const moveStepX = this.velocity.x * dt;
        const moveStepY = this.velocity.y * dt;
        const moveStepZ = this.velocity.z * dt;

        const pStart = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
        const pEnd = new THREE.Vector3(
            this.position.x + moveStepX,
            this.position.y + moveStepY,
            this.position.z + moveStepZ
        );
        const stepDist = pStart.distanceTo(pEnd);
        const dir = stepDist > 0.0001 ? pEnd.clone().sub(pStart).normalize() : new THREE.Vector3(0, -1, 0);

        // 3. Mob Hitbox Collision Raycast Check
        let closestHitMob = null;
        let closestMobDist = stepDist + 0.3;

        if (world && typeof world.getEntities === 'function') {
            const entities = world.getEntities();
            for (const entity of entities) {
                if (!entity || entity === this || entity.isDead || entity.removed) continue;
                // Avoid self-collision for first 0.2s of flight
                if (entity === this.shooter && this.ticksInAir < 0.2) continue;

                const ePos = entity.position;
                if (!ePos) continue;
                const eWidth = entity.width || 0.6;
                const eHeight = entity.height || 1.8;

                const box = new THREE.Box3(
                    new THREE.Vector3(ePos.x - eWidth / 2, ePos.y, ePos.z - eWidth / 2),
                    new THREE.Vector3(ePos.x + eWidth / 2, ePos.y + eHeight, ePos.z + eWidth / 2)
                );

                const hitPt = new THREE.Vector3();
                const ray = new THREE.Ray(pStart, dir);
                if (ray.intersectBox(box, hitPt)) {
                    const dist = pStart.distanceTo(hitPt);
                    if (dist <= closestMobDist) {
                        closestMobDist = dist;
                        closestHitMob = entity;
                    }
                }
            }
        }

        // 4. Voxel Terrain Block Raycast Check (Step Sampling)
        let hitBlockId = 0;
        let hitBlockDist = stepDist;
        let hitBlockPos = null;

        if (world && typeof world.getBlock === 'function') {
            const numSteps = Math.max(1, Math.ceil(stepDist / 0.12));
            for (let i = 1; i <= numSteps; i++) {
                const frac = i / numSteps;
                const sx = pStart.x + moveStepX * frac;
                const sy = pStart.y + moveStepY * frac;
                const sz = pStart.z + moveStepZ * frac;

                const bx = Math.floor(sx);
                const by = Math.floor(sy);
                const bz = Math.floor(sz);

                const blockId = world.getBlock(bx, by, bz);
                if (blockId > 0 && blockId !== BLOCKS.AIR && blockId !== BLOCKS.WATER && blockId !== BLOCKS.WATER_FLOWING) {
                    hitBlockId = blockId;
                    hitBlockPos = { x: bx, y: by, z: bz };
                    hitBlockDist = stepDist * frac;
                    pEnd.set(sx, sy, sz);
                    break;
                }
            }
        }

        // 5. Prioritize Collision: Mob vs Solid Block
        if (closestHitMob && closestMobDist <= hitBlockDist) {
            // Hit Mob!
            const hitMob = closestHitMob;
            let finalDamage = this.damage;
            if (this.isCritical) {
                finalDamage += Math.floor(Math.random() * (finalDamage / 2 + 2));
            }

            // Deal damage via mob.damage() or mob.takeDamage()
            if (typeof hitMob.damage === 'function') {
                hitMob.damage(finalDamage, this.shooter || this);
            } else if (typeof hitMob.takeDamage === 'function') {
                hitMob.takeDamage(finalDamage, this.shooter || this);
            }

            // Apply Knockback Impulse
            const speedH = Math.hypot(this.velocity.x, this.velocity.z) || 1;
            const kb = this.knockbackStrength * 8.0;
            hitMob.velocity.x += (this.velocity.x / speedH) * kb;
            hitMob.velocity.y = Math.max(hitMob.velocity.y, 3.8);
            hitMob.velocity.z += (this.velocity.z / speedH) * kb;

            // Remove arrow on successful impact
            this.remove(world);
            return;
        }

        if (hitBlockId > 0) {
            // Stuck into Solid Voxel Block
            this.position.x = pEnd.x;
            this.position.y = pEnd.y;
            this.position.z = pEnd.z;
            this.inGround = true;
            this.groundPos = hitBlockPos;
            this.groundBlockId = hitBlockId;
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.velocity.z = 0;
            this.shakeTimer = 0.35;

            if (this.mesh) {
                this.mesh.position.set(this.position.x, this.position.y, this.position.z);
            }
            this.updateHitbox();
            return;
        }

        // 6. Free Parabolic Ballistic Trajectory
        this.position.x += moveStepX;
        this.position.y += moveStepY;
        this.position.z += moveStepZ;

        // Gravity acceleration (downward)
        this.velocity.y -= this.gravity * dt;

        // Aerodynamic air drag: drag^(dt * 20)
        const dragFactor = Math.pow(ARROW_DRAG, dt * 20);
        this.velocity.x *= dragFactor;
        this.velocity.y *= dragFactor;
        this.velocity.z *= dragFactor;

        this.updateRotationFromVelocity();
        this.updateHitbox();

        if (this.mesh) {
            this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        }
    }

    remove(world = null) {
        this.removed = true;
        this.isDead = true;

        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }

        if (world && typeof world.removeEntity === 'function') {
            world.removeEntity(this);
        }
    }
}
