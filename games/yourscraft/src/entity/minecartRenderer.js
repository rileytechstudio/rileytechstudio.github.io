import * as THREE from 'three';

const MINECART_MAT = new THREE.MeshLambertMaterial({ color: 0x666666 });
const MINECART_INSIDE_MAT = new THREE.MeshLambertMaterial({ color: 0x444444 });
const TNT_MAT = new THREE.MeshLambertMaterial({ color: 0xff3333 }); // Simple solid red for TNT
const HOPPER_MAT = new THREE.MeshLambertMaterial({ color: 0x333333 }); // Simple solid dark grey for Hopper

export function createMinecartRenderer(entity) {
    const group = new THREE.Group();
    
    // Base Minecart mesh (5 flat planes to form an open box)
    const cartGeometry = new THREE.BoxGeometry(0.98, 0.5, 0.98);
    const cartMesh = new THREE.Mesh(cartGeometry, MINECART_MAT);
    cartMesh.position.set(0, 0.25, 0); // Shift up so bottom is at y=0
    cartMesh.castShadow = true;
    cartMesh.receiveShadow = true;
    group.add(cartMesh);
    
    // Hollow interior effect (inner box)
    const innerGeometry = new THREE.BoxGeometry(0.8, 0.5, 0.8);
    const innerMesh = new THREE.Mesh(innerGeometry, MINECART_INSIDE_MAT);
    innerMesh.position.set(0, 0.26, 0); // Slightly higher to avoid Z-fighting on bottom
    group.add(innerMesh);

    // Depending on type, add payload
    if (entity.type === 'minecart_tnt' || entity.type === 'tnt') {
        const tntGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const tntMesh = new THREE.Mesh(tntGeo, TNT_MAT);
        tntMesh.position.set(0, 0.5, 0);
        group.add(tntMesh);
    } else if (entity.type === 'minecart_hopper' || entity.type === 'hopper') {
        const hopperGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const hopperMesh = new THREE.Mesh(hopperGeo, HOPPER_MAT);
        hopperMesh.position.set(0, 0.5, 0);
        group.add(hopperMesh);
    }
    
    return {
        group,
        update: function(dt, x, y, z, yaw, pitch) {
            // Apply position and rotation
            this.group.position.set(x, y, z);
            if (entity.velocity) {
                // Determine yaw based on velocity vector
                const vx = entity.velocity.x;
                const vz = entity.velocity.z;
                if (Math.abs(vx) > 0.01 || Math.abs(vz) > 0.01) {
                    this.group.rotation.y = Math.atan2(vx, vz);
                }
            }
        }
    };
}
