

import * as THREE from 'three';

// Shared color palette for mobs
const PALETTE = Object.freeze({
    // Zombie
    zombieSkin: 0x3d6e35,
    zombieShirt: 0x276787,
    zombiePants: 0x2b3463,

    // Skeleton
    skeletonBone: 0xc8c8c8,
    skeletonDark: 0x2e2e2e,
    skeletonBow: 0x6e4a27,

    // Creeper
    creeperGreen: 0x4da83e,
    creeperDark: 0x181818,
    creeperLight: 0x68bc56,

    // Spider
    spiderBody: 0x221c1a,
    spiderEyes: 0xcc1111,
    spiderLegs: 0x1c1715,

    // Enderman
    endermanSkin: 0x141414,
    endermanEyes: 0xcc33ff,

    // Pig
    pigSkin: 0xf0a2a2,
    pigSnout: 0xde7b7b,
    pigEyes: 0x222222,

    // Cow
    cowHide: 0x483526,
    cowWhite: 0xdedede,
    cowHorns: 0xd2d2d2,
    cowMuzzle: 0x685242,
    cowUdder: 0xdfa0a0,

    // Zombie Pigman
    pigmanSkin: 0xd98d8d,
    pigmanDecay: 0x3d6e35,
    goldSword: 0xe6b422,

    // Wither Skeleton
    witherBone: 0x1f1f1f,
    stoneSword: 0x737373,

    // Ghast
    ghastWhite: 0xefefef,
    ghastEyes: 0x5a5a5a,
    ghastRed: 0x882222
});

function createLambert(color, emissive = 0x000000) {
    return new THREE.MeshLambertMaterial({
        color: color,
        emissive: emissive
    });
}

function createBoxMesh(width, height, depth, material, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(offsetX, offsetY, offsetZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createLimbPivot(width, height, depth, material, pivotX, pivotY, pivotZ) {
    const pivot = new THREE.Group();
    pivot.position.set(pivotX, pivotY, pivotZ);

    const mesh = createBoxMesh(width, height, depth, material, 0, -height / 2, 0);
    pivot.add(mesh);

    return { pivot, mesh };
}

export function buildZombieModel() {
    const root = new THREE.Group();
    root.name = 'Zombie';

    const skinMat = createLambert(PALETTE.zombieSkin);
    const shirtMat = createLambert(PALETTE.zombieShirt);
    const pantsMat = createLambert(PALETTE.zombiePants);
    const eyeMat = createLambert(0x181818);

    const materials = [skinMat, shirtMat, pantsMat, eyeMat];
    const parts = {};

    // 1. Head & Neck Pivot (at Y = 1.35)
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.35, 0);
    const headMesh = createBoxMesh(0.5, 0.5, 0.5, skinMat, 0, 0.25, 0);
    headPivot.add(headMesh);

    // Eye sockets
    const leftEye = createBoxMesh(0.08, 0.05, 0.02, eyeMat, -0.12, 0.25, 0.255);
    const rightEye = createBoxMesh(0.08, 0.05, 0.02, eyeMat, 0.12, 0.25, 0.255);
    headPivot.add(leftEye);
    headPivot.add(rightEye);

    root.add(headPivot);
    parts.head = headPivot;

    // 2. Torso (Y = 0.72 to 1.35)
    const torsoMesh = createBoxMesh(0.5, 0.63, 0.25, shirtMat, 0, 0.995, 0);
    root.add(torsoMesh);
    parts.torso = torsoMesh;

    // 3. Arms (Outstretched straight forward for Zombie)
    const leftArm = createLimbPivot(0.2, 0.65, 0.2, skinMat, -0.35, 1.32, 0);
    const rightArm = createLimbPivot(0.2, 0.65, 0.2, skinMat, 0.35, 1.32, 0);

    // Default zombie pose: arms held forward
    leftArm.pivot.rotation.x = -Math.PI / 2;
    rightArm.pivot.rotation.x = -Math.PI / 2;
    leftArm.pivot.rotation.z = -0.05;
    rightArm.pivot.rotation.z = 0.05;

    // Small shirt sleeves on upper arms
    const leftSleeve = createBoxMesh(0.22, 0.2, 0.22, shirtMat, 0, -0.1, 0);
    const rightSleeve = createBoxMesh(0.22, 0.2, 0.22, shirtMat, 0, -0.1, 0);
    leftArm.pivot.add(leftSleeve);
    rightArm.pivot.add(rightSleeve);

    root.add(leftArm.pivot);
    root.add(rightArm.pivot);
    parts.leftArm = leftArm.pivot;
    parts.rightArm = rightArm.pivot;

    // 4. Legs (Y = 0 to 0.72)
    const leftLeg = createLimbPivot(0.22, 0.72, 0.22, pantsMat, -0.13, 0.72, 0);
    const rightLeg = createLimbPivot(0.22, 0.72, 0.22, pantsMat, 0.13, 0.72, 0);

    root.add(leftLeg.pivot);
    root.add(rightLeg.pivot);
    parts.leftLeg = leftLeg.pivot;
    parts.rightLeg = rightLeg.pivot;

    return { root, parts, materials };
}

export function buildSkeletonModel() {
    const root = new THREE.Group();
    root.name = 'Skeleton';

    const boneMat = createLambert(PALETTE.skeletonBone);
    const darkMat = createLambert(PALETTE.skeletonDark);
    const bowMat = createLambert(PALETTE.skeletonBow);

    const materials = [boneMat, darkMat, bowMat];
    const parts = {};

    // 1. Skull & Neck Pivot
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.35, 0);
    const skullMesh = createBoxMesh(0.5, 0.5, 0.5, boneMat, 0, 0.25, 0);
    headPivot.add(skullMesh);

    // Eye sockets & mouth
    const leftEye = createBoxMesh(0.09, 0.08, 0.02, darkMat, -0.12, 0.27, 0.255);
    const rightEye = createBoxMesh(0.09, 0.08, 0.02, darkMat, 0.12, 0.27, 0.255);
    const mouth = createBoxMesh(0.14, 0.05, 0.02, darkMat, 0, 0.12, 0.255);
    headPivot.add(leftEye);
    headPivot.add(rightEye);
    headPivot.add(mouth);

    root.add(headPivot);
    parts.head = headPivot;

    // 2. Ribcage & Spine
    const ribcage = createBoxMesh(0.42, 0.63, 0.2, boneMat, 0, 0.995, 0);
    root.add(ribcage);
    parts.torso = ribcage;

    // 3. Thin Skeleton Arms
    const leftArm = createLimbPivot(0.12, 0.65, 0.12, boneMat, -0.28, 1.32, 0);
    const rightArm = createLimbPivot(0.12, 0.65, 0.12, boneMat, 0.28, 1.32, 0);

    // Bow attached to right arm
    const bowGroup = new THREE.Group();
    const bowMain = createBoxMesh(0.05, 0.55, 0.05, bowMat, 0, -0.3, 0.15);
    const bowTop = createBoxMesh(0.04, 0.12, 0.08, bowMat, 0, -0.06, 0.12);
    const bowBottom = createBoxMesh(0.04, 0.12, 0.08, bowMat, 0, -0.54, 0.12);
    bowGroup.add(bowMain);
    bowGroup.add(bowTop);
    bowGroup.add(bowBottom);
    rightArm.pivot.add(bowGroup);
    parts.bow = bowGroup;

    root.add(leftArm.pivot);
    root.add(rightArm.pivot);
    parts.leftArm = leftArm.pivot;
    parts.rightArm = rightArm.pivot;

    // 4. Thin Skeleton Legs
    const leftLeg = createLimbPivot(0.12, 0.72, 0.12, boneMat, -0.11, 0.72, 0);
    const rightLeg = createLimbPivot(0.12, 0.72, 0.12, boneMat, 0.11, 0.72, 0);

    root.add(leftLeg.pivot);
    root.add(rightLeg.pivot);
    parts.leftLeg = leftLeg.pivot;
    parts.rightLeg = rightLeg.pivot;

    return { root, parts, materials };
}

export function buildCreeperModel() {
    const root = new THREE.Group();
    root.name = 'Creeper';

    const greenMat = createLambert(PALETTE.creeperGreen);
    const darkMat = createLambert(PALETTE.creeperDark);

    const materials = [greenMat, darkMat];
    const parts = {};

    // 1. Head & Neck Pivot (Y = 1.15)
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.15, 0);
    const headMesh = createBoxMesh(0.5, 0.5, 0.5, greenMat, 0, 0.25, 0);
    headPivot.add(headMesh);

    // Iconic Creeper Face
    const leftEye = createBoxMesh(0.09, 0.09, 0.02, darkMat, -0.12, 0.28, 0.255);
    const rightEye = createBoxMesh(0.09, 0.09, 0.02, darkMat, 0.12, 0.28, 0.255);
    const centerMouth = createBoxMesh(0.09, 0.10, 0.02, darkMat, 0, 0.20, 0.255);
    const leftMouth = createBoxMesh(0.07, 0.12, 0.02, darkMat, -0.08, 0.13, 0.255);
    const rightMouth = createBoxMesh(0.07, 0.12, 0.02, darkMat, 0.08, 0.13, 0.255);

    headPivot.add(leftEye);
    headPivot.add(rightEye);
    headPivot.add(centerMouth);
    headPivot.add(leftMouth);
    headPivot.add(rightMouth);

    root.add(headPivot);
    parts.head = headPivot;

    // 2. Torso
    const torsoMesh = createBoxMesh(0.48, 0.72, 0.25, greenMat, 0, 0.79, 0);
    root.add(torsoMesh);
    parts.torso = torsoMesh;

    // 3. Four Legs
    const flLeg = createLimbPivot(0.22, 0.43, 0.22, greenMat, -0.13, 0.43, 0.13);
    const frLeg = createLimbPivot(0.22, 0.43, 0.22, greenMat, 0.13, 0.43, 0.13);
    const blLeg = createLimbPivot(0.22, 0.43, 0.22, greenMat, -0.13, 0.43, -0.13);
    const brLeg = createLimbPivot(0.22, 0.43, 0.22, greenMat, 0.13, 0.43, -0.13);

    root.add(flLeg.pivot);
    root.add(frLeg.pivot);
    root.add(blLeg.pivot);
    root.add(brLeg.pivot);

    parts.frontLeftLeg = flLeg.pivot;
    parts.frontRightLeg = frLeg.pivot;
    parts.backLeftLeg = blLeg.pivot;
    parts.backRightLeg = brLeg.pivot;

    return { root, parts, materials };
}

export function buildSpiderModel() {
    const root = new THREE.Group();
    root.name = 'Spider';

    const bodyMat = createLambert(PALETTE.spiderBody);
    const eyeMat = createLambert(PALETTE.spiderEyes, 0x440000);
    const legMat = createLambert(PALETTE.spiderLegs);

    const materials = [bodyMat, eyeMat, legMat];
    const parts = {};

    // 1. Head / Cephalothorax (Front)
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.38, 0.32);
    const headMesh = createBoxMesh(0.45, 0.35, 0.45, bodyMat, 0, 0, 0);
    headPivot.add(headMesh);

    // Glowing Red Eyes (8 eyes)
    const mainEyeL = createBoxMesh(0.07, 0.05, 0.02, eyeMat, -0.11, 0.02, 0.23);
    const mainEyeR = createBoxMesh(0.07, 0.05, 0.02, eyeMat, 0.11, 0.02, 0.23);
    const topEyeL = createBoxMesh(0.04, 0.04, 0.02, eyeMat, -0.05, 0.08, 0.23);
    const topEyeR = createBoxMesh(0.04, 0.04, 0.02, eyeMat, 0.05, 0.08, 0.23);
    const sideEyeL = createBoxMesh(0.04, 0.04, 0.02, eyeMat, -0.17, 0.04, 0.21);
    const sideEyeR = createBoxMesh(0.04, 0.04, 0.02, eyeMat, 0.17, 0.04, 0.21);

    headPivot.add(mainEyeL);
    headPivot.add(mainEyeR);
    headPivot.add(topEyeL);
    headPivot.add(topEyeR);
    headPivot.add(sideEyeL);
    headPivot.add(sideEyeR);

    root.add(headPivot);
    parts.head = headPivot;

    // 2. Middle Body / Thorax
    const thoraxMesh = createBoxMesh(0.35, 0.28, 0.35, bodyMat, 0, 0.36, 0.0);
    root.add(thoraxMesh);
    parts.torso = thoraxMesh;

    // 3. Abdomen (Large Rear)
    const abdomenMesh = createBoxMesh(0.65, 0.45, 0.75, bodyMat, 0, 0.42, -0.45);
    root.add(abdomenMesh);
    parts.abdomen = abdomenMesh;

    // 4. Eight Legs (4 Left, 4 Right)
    parts.legs = [];
    const zOffsets = [0.20, 0.07, -0.07, -0.20];
    const legAngles = [0.35, 0.12, -0.12, -0.35];

    // Left Legs
    for (let i = 0; i < 4; i++) {
        const legPivot = new THREE.Group();
        legPivot.position.set(-0.18, 0.36, zOffsets[i]);

        const upperLeg = createBoxMesh(0.35, 0.08, 0.08, legMat, -0.16, 0.06, 0);
        upperLeg.rotation.z = -0.35;

        const lowerLeg = createBoxMesh(0.40, 0.07, 0.07, legMat, -0.42, -0.12, 0);
        lowerLeg.rotation.z = 0.55;

        legPivot.add(upperLeg);
        legPivot.add(lowerLeg);
        legPivot.rotation.y = legAngles[i];

        root.add(legPivot);
        parts.legs.push({ pivot: legPivot, side: 'left', index: i });
    }

    // Right Legs
    for (let i = 0; i < 4; i++) {
        const legPivot = new THREE.Group();
        legPivot.position.set(0.18, 0.36, zOffsets[i]);

        const upperLeg = createBoxMesh(0.35, 0.08, 0.08, legMat, 0.16, 0.06, 0);
        upperLeg.rotation.z = 0.35;

        const lowerLeg = createBoxMesh(0.40, 0.07, 0.07, legMat, 0.42, -0.12, 0);
        lowerLeg.rotation.z = -0.55;

        legPivot.add(upperLeg);
        legPivot.add(lowerLeg);
        legPivot.rotation.y = -legAngles[i];

        root.add(legPivot);
        parts.legs.push({ pivot: legPivot, side: 'right', index: i });
    }

    return { root, parts, materials };
}

export function buildEndermanModel() {
    const root = new THREE.Group();
    root.name = 'Enderman';

    const skinMat = createLambert(PALETTE.endermanSkin);
    const eyeMat = createLambert(PALETTE.endermanEyes, 0x660099);
    const blockMat = createLambert(0x6b533a);

    const materials = [skinMat, eyeMat, blockMat];
    const parts = {};

    // 1. Tall Head & Neck Pivot (Y = 2.45)
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 2.45, 0);
    const skullMesh = createBoxMesh(0.38, 0.38, 0.38, skinMat, 0, 0.19, 0);
    headPivot.add(skullMesh);

    // Glowing Purple Eyes
    const leftEye = createBoxMesh(0.08, 0.03, 0.02, eyeMat, -0.10, 0.20, 0.195);
    const rightEye = createBoxMesh(0.08, 0.03, 0.02, eyeMat, 0.10, 0.20, 0.195);
    headPivot.add(leftEye);
    headPivot.add(rightEye);

    // Openable Jaw for screaming / aggro
    const jawMesh = createBoxMesh(0.36, 0.12, 0.36, skinMat, 0, 0.06, 0);
    headPivot.add(jawMesh);
    parts.jaw = jawMesh;

    root.add(headPivot);
    parts.head = headPivot;

    // 2. Slender Torso (Y = 1.65 to 2.45)
    const torsoMesh = createBoxMesh(0.32, 0.80, 0.18, skinMat, 0, 2.05, 0);
    root.add(torsoMesh);
    parts.torso = torsoMesh;

    // 3. Extra Long Arms
    const leftArm = createLimbPivot(0.1, 1.45, 0.1, skinMat, -0.21, 2.40, 0);
    const rightArm = createLimbPivot(0.1, 1.45, 0.1, skinMat, 0.21, 2.40, 0);

    root.add(leftArm.pivot);
    root.add(rightArm.pivot);
    parts.leftArm = leftArm.pivot;
    parts.rightArm = rightArm.pivot;

    // Carried block mesh (hidden by default)
    const carriedBlock = createBoxMesh(0.45, 0.45, 0.45, blockMat, 0, 1.65, 0.35);
    carriedBlock.visible = false;
    root.add(carriedBlock);
    parts.carriedBlock = carriedBlock;

    // 4. Extra Long Legs
    const leftLeg = createLimbPivot(0.1, 1.65, 0.1, skinMat, -0.09, 1.65, 0);
    const rightLeg = createLimbPivot(0.1, 1.65, 0.1, skinMat, 0.09, 1.65, 0);

    root.add(leftLeg.pivot);
    root.add(rightLeg.pivot);
    parts.leftLeg = leftLeg.pivot;
    parts.rightLeg = rightLeg.pivot;

    return { root, parts, materials };
}

export function buildPigModel() {
    const root = new THREE.Group();
    root.name = 'Pig';

    const skinMat = createLambert(PALETTE.pigSkin);
    const snoutMat = createLambert(PALETTE.pigSnout);
    const eyeMat = createLambert(PALETTE.pigEyes);

    const materials = [skinMat, snoutMat, eyeMat];
    const parts = {};

    // 1. Torso / Body (Horizontal box)
    const bodyMesh = createBoxMesh(0.65, 0.50, 0.85, skinMat, 0, 0.52, 0);
    root.add(bodyMesh);
    parts.torso = bodyMesh;

    // 2. Head Pivot (Y = 0.55, Z = 0.42)
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.55, 0.42);
    const headMesh = createBoxMesh(0.45, 0.45, 0.45, skinMat, 0, 0.15, 0.15);
    headPivot.add(headMesh);

    // Snout
    const snoutMesh = createBoxMesh(0.22, 0.14, 0.12, snoutMat, 0, 0.08, 0.41);
    headPivot.add(snoutMesh);

    // Eyes
    const leftEye = createBoxMesh(0.04, 0.05, 0.02, eyeMat, -0.23, 0.22, 0.22);
    const rightEye = createBoxMesh(0.04, 0.05, 0.02, eyeMat, 0.23, 0.22, 0.22);
    headPivot.add(leftEye);
    headPivot.add(rightEye);

    root.add(headPivot);
    parts.head = headPivot;

    // 3. Four Short Legs
    const flLeg = createLimbPivot(0.20, 0.35, 0.20, skinMat, -0.20, 0.35, 0.28);
    const frLeg = createLimbPivot(0.20, 0.35, 0.20, skinMat, 0.20, 0.35, 0.28);
    const blLeg = createLimbPivot(0.20, 0.35, 0.20, skinMat, -0.20, 0.35, -0.28);
    const brLeg = createLimbPivot(0.20, 0.35, 0.20, skinMat, 0.20, 0.35, -0.28);

    root.add(flLeg.pivot);
    root.add(frLeg.pivot);
    root.add(blLeg.pivot);
    root.add(brLeg.pivot);

    parts.frontLeftLeg = flLeg.pivot;
    parts.frontRightLeg = frLeg.pivot;
    parts.backLeftLeg = blLeg.pivot;
    parts.backRightLeg = brLeg.pivot;

    return { root, parts, materials };
}

export function buildCowModel() {
    const root = new THREE.Group();
    root.name = 'Cow';

    const hideMat = createLambert(PALETTE.cowHide);
    const hornMat = createLambert(PALETTE.cowHorns);
    const muzzleMat = createLambert(PALETTE.cowMuzzle);
    const udderMat = createLambert(PALETTE.cowUdder);
    const eyeMat = createLambert(0x1a1a1a);

    const materials = [hideMat, hornMat, muzzleMat, udderMat, eyeMat];
    const parts = {};

    // 1. Large Torso (Horizontal box)
    const bodyMesh = createBoxMesh(0.75, 0.65, 1.05, hideMat, 0, 0.88, 0);
    root.add(bodyMesh);
    parts.torso = bodyMesh;

    // Udder
    const udderMesh = createBoxMesh(0.25, 0.15, 0.30, udderMat, 0, 0.58, -0.22);
    root.add(udderMesh);

    // 2. Head Pivot (Y = 0.98, Z = 0.52)
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.98, 0.52);
    const headMesh = createBoxMesh(0.48, 0.48, 0.48, hideMat, 0, 0.16, 0.16);
    headPivot.add(headMesh);

    // Muzzle / Snout
    const muzzleMesh = createBoxMesh(0.32, 0.22, 0.18, muzzleMat, 0, 0.05, 0.43);
    headPivot.add(muzzleMesh);

    // Horns
    const leftHorn = createBoxMesh(0.08, 0.18, 0.08, hornMat, -0.26, 0.38, 0.12);
    const rightHorn = createBoxMesh(0.08, 0.18, 0.08, hornMat, 0.26, 0.38, 0.12);
    headPivot.add(leftHorn);
    headPivot.add(rightHorn);

    // Eyes
    const leftEye = createBoxMesh(0.04, 0.05, 0.02, eyeMat, -0.25, 0.24, 0.25);
    const rightEye = createBoxMesh(0.04, 0.05, 0.02, eyeMat, 0.25, 0.24, 0.25);
    headPivot.add(leftEye);
    headPivot.add(rightEye);

    root.add(headPivot);
    parts.head = headPivot;

    // 3. Four Legs
    const flLeg = createLimbPivot(0.22, 0.60, 0.22, hideMat, -0.24, 0.60, 0.35);
    const frLeg = createLimbPivot(0.22, 0.60, 0.22, hideMat, 0.24, 0.60, 0.35);
    const blLeg = createLimbPivot(0.22, 0.60, 0.22, hideMat, -0.24, 0.60, -0.35);
    const brLeg = createLimbPivot(0.22, 0.60, 0.22, hideMat, 0.24, 0.60, -0.35);

    root.add(flLeg.pivot);
    root.add(frLeg.pivot);
    root.add(blLeg.pivot);
    root.add(brLeg.pivot);

    parts.frontLeftLeg = flLeg.pivot;
    parts.frontRightLeg = frLeg.pivot;
    parts.backLeftLeg = blLeg.pivot;
    parts.backRightLeg = brLeg.pivot;

    return { root, parts, materials };
}

export function buildZombiePigmanModel() {
    const root = new THREE.Group();
    root.name = 'ZombiePigman';

    const skinMat = createLambert(PALETTE.pigmanSkin);
    const decayMat = createLambert(PALETTE.pigmanDecay);
    const pantsMat = createLambert(0x4a4a35);
    const goldMat = createLambert(PALETTE.goldSword);

    const materials = [skinMat, decayMat, pantsMat, goldMat];
    const parts = {};

    // Head
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.35, 0);
    const headMesh = createBoxMesh(0.5, 0.5, 0.5, skinMat, 0, 0.25, 0);
    const snoutMesh = createBoxMesh(0.22, 0.14, 0.12, decayMat, 0, 0.18, 0.28);
    headPivot.add(headMesh);
    headPivot.add(snoutMesh);
    root.add(headPivot);
    parts.head = headPivot;

    // Torso
    const torsoMesh = createBoxMesh(0.5, 0.63, 0.25, skinMat, 0, 0.995, 0);
    root.add(torsoMesh);
    parts.torso = torsoMesh;

    // Arms
    const leftArm = createLimbPivot(0.2, 0.65, 0.2, skinMat, -0.35, 1.32, 0);
    const rightArm = createLimbPivot(0.2, 0.65, 0.2, skinMat, 0.35, 1.32, 0);

    // Golden Sword attached to right hand
    const swordMesh = createBoxMesh(0.06, 0.55, 0.14, goldMat, 0, -0.45, 0.20);
    rightArm.pivot.add(swordMesh);

    leftArm.pivot.rotation.x = -Math.PI / 2;
    rightArm.pivot.rotation.x = -Math.PI / 2;

    root.add(leftArm.pivot);
    root.add(rightArm.pivot);
    parts.leftArm = leftArm.pivot;
    parts.rightArm = rightArm.pivot;

    // Legs
    const leftLeg = createLimbPivot(0.22, 0.72, 0.22, pantsMat, -0.13, 0.72, 0);
    const rightLeg = createLimbPivot(0.22, 0.72, 0.22, pantsMat, 0.13, 0.72, 0);

    root.add(leftLeg.pivot);
    root.add(rightLeg.pivot);
    parts.leftLeg = leftLeg.pivot;
    parts.rightLeg = rightLeg.pivot;

    return { root, parts, materials };
}

export function buildWitherSkeletonModel() {
    const root = new THREE.Group();
    root.name = 'WitherSkeleton';

    const boneMat = createLambert(PALETTE.witherBone);
    const darkMat = createLambert(0x111111);
    const stoneMat = createLambert(PALETTE.stoneSword);

    const materials = [boneMat, darkMat, stoneMat];
    const parts = {};

    // Tall Head
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.75, 0);
    const skullMesh = createBoxMesh(0.55, 0.55, 0.55, boneMat, 0, 0.28, 0);
    headPivot.add(skullMesh);
    root.add(headPivot);
    parts.head = headPivot;

    // Tall Torso
    const torsoMesh = createBoxMesh(0.48, 0.80, 0.22, boneMat, 0, 1.30, 0);
    root.add(torsoMesh);
    parts.torso = torsoMesh;

    // Long Arms
    const leftArm = createLimbPivot(0.14, 0.85, 0.14, boneMat, -0.33, 1.70, 0);
    const rightArm = createLimbPivot(0.14, 0.85, 0.14, boneMat, 0.33, 1.70, 0);

    // Stone Sword
    const swordMesh = createBoxMesh(0.06, 0.65, 0.16, stoneMat, 0, -0.55, 0.22);
    rightArm.pivot.add(swordMesh);

    root.add(leftArm.pivot);
    root.add(rightArm.pivot);
    parts.leftArm = leftArm.pivot;
    parts.rightArm = rightArm.pivot;

    // Long Legs
    const leftLeg = createLimbPivot(0.14, 0.90, 0.14, boneMat, -0.13, 0.90, 0);
    const rightLeg = createLimbPivot(0.14, 0.90, 0.14, boneMat, 0.13, 0.90, 0);

    root.add(leftLeg.pivot);
    root.add(rightLeg.pivot);
    parts.leftLeg = leftLeg.pivot;
    parts.rightLeg = rightLeg.pivot;

    return { root, parts, materials };
}

export function buildGhastModel() {
    const root = new THREE.Group();
    root.name = 'Ghast';

    const whiteMat = createLambert(PALETTE.ghastWhite);
    const eyeMat = createLambert(PALETTE.ghastEyes);
    const redMat = createLambert(PALETTE.ghastRed, 0x440000);

    const materials = [whiteMat, eyeMat, redMat];
    const parts = {};

    // 1. Giant Body Cube (2.0 x 2.0 x 2.0)
    const bodyMesh = createBoxMesh(2.0, 2.0, 2.0, whiteMat, 0, 1.8, 0);
    root.add(bodyMesh);
    parts.torso = bodyMesh;

    // Eyes and sad mouth
    const leftEye = createBoxMesh(0.25, 0.25, 0.05, eyeMat, -0.5, 2.0, 1.01);
    const rightEye = createBoxMesh(0.25, 0.25, 0.05, eyeMat, 0.5, 2.0, 1.01);
    const mouth = createBoxMesh(0.40, 0.35, 0.05, eyeMat, 0, 1.35, 1.01);

    root.add(leftEye);
    root.add(rightEye);
    root.add(mouth);

    // 2. Nine Tentacles (3x3 Grid hanging below body)
    parts.tentacles = [];
    for (let ix = -1; ix <= 1; ix++) {
        for (let iz = -1; iz <= 1; iz++) {
            const tentaclePivot = new THREE.Group();
            tentaclePivot.position.set(ix * 0.6, 0.8, iz * 0.6);

            const length = 0.7 + Math.random() * 0.5;
            const tentMesh = createBoxMesh(0.18, length, 0.18, whiteMat, 0, -length / 2, 0);
            tentaclePivot.add(tentMesh);

            root.add(tentaclePivot);
            parts.tentacles.push(tentaclePivot);
        }
    }

    return { root, parts, materials };
}

export const MOB_MODEL_BUILDERS = Object.freeze({
    zombie: buildZombieModel,
    skeleton: buildSkeletonModel,
    creeper: buildCreeperModel,
    spider: buildSpiderModel,
    enderman: buildEndermanModel,
    pig: buildPigModel,
    cow: buildCowModel,
    zombie_pigman: buildZombiePigmanModel,
    zombiepigman: buildZombiePigmanModel,
    wither_skeleton: buildWitherSkeletonModel,
    witherskeleton: buildWitherSkeletonModel,
    ghast: buildGhastModel
});

export class MobRenderer {
    
    constructor(mob) {
        this.mob = mob;
        this.mobType = (mob.type || 'zombie').toLowerCase().trim();

        const builder = MOB_MODEL_BUILDERS[this.mobType] || buildZombieModel;
        const modelData = builder();

        this.mesh = modelData.root;
        this.mesh.name = `mob_${this.mobType}_${mob.id}`;

        this.parts = modelData.parts;

        this.materials = modelData.materials;

        // Store base colors for damage flashing
        this.baseColors = this.materials.map(m => m.color.getHex());

        // Animation state
        this.walkProgress = Math.random() * Math.PI * 2;
        this.limbSwing = 0;
        this.prevHurt = false;

        // Position mesh initially
        if (mob.position) {
            this.mesh.position.set(mob.position.x, mob.position.y, mob.position.z);
        }
    }

    update(dt = 0.05) {
        const mob = this.mob;
        if (!mob) return;

        // 1. Sync World Position
        if (mob.position) {
            this.mesh.position.set(mob.position.x, mob.position.y, mob.position.z);
        }

        // 2. Sync Yaw Rotation
        if (mob.rotation) {
            this.mesh.rotation.y = mob.rotation.yaw;
        }

        // 3. Head Tracking (Yaw & Pitch)
        if (this.parts.head && mob.rotation) {
            const headYawOffset = (mob.headYaw !== undefined ? mob.headYaw : mob.rotation.yaw) - mob.rotation.yaw;
            this.parts.head.rotation.y = headYawOffset;
            this.parts.head.rotation.x = mob.rotation.pitch || 0;
        }

        // 4. Death Animation (Rotate 90 degrees on side)
        if (mob.isDead) {
            const deathAlpha = Math.min(1.0, (mob.deathTime || 0) / 0.6);
            this.mesh.rotation.z = deathAlpha * (Math.PI / 2);
            return;
        } else {
            this.mesh.rotation.z = 0;
        }

        // 5. Calculate Movement Speed & Advance Walk Cycle
        const vx = mob.velocity ? mob.velocity.x : 0;
        const vz = mob.velocity ? mob.velocity.z : 0;
        const horizontalSpeed = Math.hypot(vx, vz);
        const isMoving = horizontalSpeed > 0.05;

        if (isMoving) {
            this.walkProgress += dt * horizontalSpeed * 8.0;
            this.limbSwing = Math.min(1.0, this.limbSwing + dt * 4.0);
        } else {
            this.limbSwing = Math.max(0.0, this.limbSwing - dt * 4.0);
        }

        // 6. Apply Mob-Specific Animations
        this._animateMobType(dt, isMoving);

        // 7. Hurt Flash (Tint Red on Damage)
        const isHurt = mob.hurtTime > 0;
        if (isHurt !== this.prevHurt) {
            this.prevHurt = isHurt;
            for (let i = 0; i < this.materials.length; i++) {
                if (isHurt) {
                    this.materials[i].color.setHex(0xff3333);
                } else {
                    this.materials[i].color.setHex(this.baseColors[i]);
                }
            }
        }
    }

    _animateMobType(dt, isMoving) {
        const mob = this.mob;
        const sinWalk = Math.sin(this.walkProgress);
        const cosWalk = Math.cos(this.walkProgress);
        const swing = this.limbSwing;

        switch (this.mobType) {
            case 'zombie':
            case 'zombie_pigman':
            case 'zombiepigman': {
                // Legs swing
                if (this.parts.leftLeg) this.parts.leftLeg.rotation.x = sinWalk * 0.65 * swing;
                if (this.parts.rightLeg) this.parts.rightLeg.rotation.x = -sinWalk * 0.65 * swing;

                // Outstretched arms menacing sway
                if (this.parts.leftArm) {
                    this.parts.leftArm.rotation.x = -Math.PI / 2 + Math.sin(this.walkProgress * 0.5) * 0.08;
                }
                if (this.parts.rightArm) {
                    this.parts.rightArm.rotation.x = -Math.PI / 2 - Math.sin(this.walkProgress * 0.5) * 0.08;
                }
                break;
            }

            case 'skeleton':
            case 'wither_skeleton':
            case 'witherskeleton': {
                // Legs swing
                if (this.parts.leftLeg) this.parts.leftLeg.rotation.x = sinWalk * 0.65 * swing;
                if (this.parts.rightLeg) this.parts.rightLeg.rotation.x = -sinWalk * 0.65 * swing;

                // Aiming bow or swinging arms
                if (mob.target && this.mobType === 'skeleton') {
                    // Aiming bow pose
                    if (this.parts.rightArm) this.parts.rightArm.rotation.x = -Math.PI / 2 + (mob.rotation.pitch || 0);
                    if (this.parts.leftArm) this.parts.leftArm.rotation.x = -Math.PI / 2 + (mob.rotation.pitch || 0);
                } else {
                    if (this.parts.leftArm) this.parts.leftArm.rotation.x = -sinWalk * 0.55 * swing;
                    if (this.parts.rightArm) this.parts.rightArm.rotation.x = sinWalk * 0.55 * swing;
                }
                break;
            }

            case 'creeper': {
                // 4-leg walking gait
                if (this.parts.frontLeftLeg) this.parts.frontLeftLeg.rotation.x = sinWalk * 0.6 * swing;
                if (this.parts.frontRightLeg) this.parts.frontRightLeg.rotation.x = -sinWalk * 0.6 * swing;
                if (this.parts.backLeftLeg) this.parts.backLeftLeg.rotation.x = -sinWalk * 0.6 * swing;
                if (this.parts.backRightLeg) this.parts.backRightLeg.rotation.x = sinWalk * 0.6 * swing;

                // Fuse Swell & Flashing
                if (typeof mob.getFuseProgress === 'function' && mob.fuseState > 0) {
                    const fuse = mob.getFuseProgress();
                    const pulse = 1.0 + fuse * 0.3 + Math.sin(performance.now() * 0.04) * 0.06 * fuse;
                    this.mesh.scale.set(pulse, pulse, pulse);
                } else {
                    this.mesh.scale.set(1, 1, 1);
                }
                break;
            }

            case 'spider': {
                // 8 legs crawling gait
                if (this.parts.legs && Array.isArray(this.parts.legs)) {
                    for (const leg of this.parts.legs) {
                        const phase = (leg.index % 2 === 0 ? 1 : -1) * (leg.side === 'left' ? 1 : -1);
                        leg.pivot.rotation.y = (leg.index * 0.15 - 0.2) + Math.sin(this.walkProgress + phase) * 0.25 * swing;
                        leg.pivot.rotation.z = Math.abs(Math.cos(this.walkProgress + phase)) * 0.15 * swing;
                    }
                }

                // Wall climbing tilt
                if (mob.isClimbing) {
                    this.mesh.rotation.x = -Math.PI / 3;
                } else {
                    this.mesh.rotation.x = 0;
                }
                break;
            }

            case 'enderman': {
                // Long stride legs & arms
                if (this.parts.leftLeg) this.parts.leftLeg.rotation.x = sinWalk * 0.45 * swing;
                if (this.parts.rightLeg) this.parts.rightLeg.rotation.x = -sinWalk * 0.45 * swing;
                if (this.parts.leftArm) this.parts.leftArm.rotation.x = -sinWalk * 0.35 * swing;
                if (this.parts.rightArm) this.parts.rightArm.rotation.x = sinWalk * 0.35 * swing;

                // Screaming / Aggro open jaw
                if (this.parts.jaw) {
                    if (mob.isAggro || mob.isScreaming) {
                        this.parts.jaw.position.y = -0.06;
                        if (this.parts.head) {
                            this.parts.head.position.x = (Math.random() - 0.5) * 0.04;
                        }
                    } else {
                        this.parts.jaw.position.y = 0.06;
                        if (this.parts.head) {
                            this.parts.head.position.x = 0;
                        }
                    }
                }

                // Carried Block visibility
                if (this.parts.carriedBlock) {
                    this.parts.carriedBlock.visible = mob.carriedBlock !== null && mob.carriedBlock !== undefined;
                }
                break;
            }

            case 'pig':
            case 'cow': {
                // 4-legged quadruped gait (diagonal pairs)
                if (this.parts.frontLeftLeg) this.parts.frontLeftLeg.rotation.x = sinWalk * 0.6 * swing;
                if (this.parts.frontRightLeg) this.parts.frontRightLeg.rotation.x = -sinWalk * 0.6 * swing;
                if (this.parts.backLeftLeg) this.parts.backLeftLeg.rotation.x = -sinWalk * 0.6 * swing;
                if (this.parts.backRightLeg) this.parts.backRightLeg.rotation.x = sinWalk * 0.6 * swing;

                // Subtle head bobbing while walking
                if (this.parts.head) {
                    this.parts.head.rotation.z = Math.sin(this.walkProgress * 2) * 0.04 * swing;
                }
                break;
            }

            case 'ghast': {
                // Dangling tentacles swaying in air
                if (this.parts.tentacles && Array.isArray(this.parts.tentacles)) {
                    const time = performance.now() * 0.003;
                    for (let i = 0; i < this.parts.tentacles.length; i++) {
                        const t = this.parts.tentacles[i];
                        t.rotation.x = Math.sin(time + i * 0.7) * 0.25;
                        t.rotation.z = Math.cos(time + i * 0.5) * 0.15;
                    }
                }
                break;
            }
        }
    }

    dispose() {
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }
}

export function createMobRenderer(mob) {
    return new MobRenderer(mob);
}

export function createMobMesh(mob) {
    const renderer = new MobRenderer(mob);
    if (!mob.userData) mob.userData = {};
    mob.userData.mobRenderer = renderer;
    mob.userData.mesh = renderer.mesh;
    return renderer.mesh;
}

export default MobRenderer;
