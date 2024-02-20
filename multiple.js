import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer, clock;
let model, animations;
let digit_animations = [];
let other_animations = [];
let actions = [];

let initialTime;
let firstRun = true;

let number_of_clock_digits = 6;

const mixers = [],
  objects = [];

const params = {
  sharedSkeleton: false,
};

init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 4, -30);
  camera.zoom = 6;
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0.5, 0);

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  //scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(-3, 10, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 4;
  dirLight.shadow.camera.bottom = -4;
  dirLight.shadow.camera.left = -4;
  dirLight.shadow.camera.right = 4;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 40;
  scene.add(dirLight);

  // scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );

  // ground

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const loader = new GLTFLoader();
  loader.load("models/all_new_3-4_export.glb", function (gltf) {
    model = gltf.scene;
    animations = gltf.animations;

    // separate animations representing digits in the clock from other animations
    animations.forEach((animation) => {
      let animationNameAsInt = parseInt(animation.name);

      if (isNaN(animationNameAsInt)) {
        // if animation name is NaN (not a number)
        other_animations.push(animation);
      } else {
        // if animation name is a number
        // put the animation into an array at index matching the animation name
        digit_animations[animationNameAsInt] = animation;
      }
    });

    model.traverse(function (object) {
      if (object.isMesh) object.castShadow = true;
    });

    setInitialTime();

    setupDefaultScene();
  });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();

  gui.add(params, "sharedSkeleton").onChange(function () {
    clearScene();

    if (params.sharedSkeleton === true) {
      setupSharedSkeletonScene();
    } else {
      setupDefaultScene();
    }
  });
  gui.open();
}

function clearScene() {
  for (const mixer of mixers) {
    mixer.stopAllAction();
  }

  mixers.length = 0;

  //

  for (const object of objects) {
    scene.remove(object);

    scene.traverse(function (child) {
      if (child.isSkinnedMesh) child.skeleton.dispose();
    });
  }
}

function setupDefaultScene() {
  // three cloned models with independent skeletons.
  // each model can have its own animation state

  let position_offset = -3.4;

  for (let index = number_of_clock_digits; index > 0; index--) {
    let modelClone = SkeletonUtils.clone(model);

    modelClone.position.x = position_offset + index;
    modelClone.rotation.y = Math.PI * 0.5;

    let mixer = new THREE.AnimationMixer(modelClone);

    let action = mixer.clipAction(animations[0]);

    actions.push(action);

    action.play();

    scene.add(modelClone);

    objects.push(modelClone);
    mixers.push(mixer);
  }
}

// function setupSharedSkeletonScene() {
//   // three cloned models with a single shared skeleton.
//   // all models share the same animation state

//   const sharedModel = SkeletonUtils.clone(model);
//   const shareSkinnedMesh = sharedModel.getObjectByName("vanguard_Mesh");
//   const sharedSkeleton = shareSkinnedMesh.skeleton;
//   const sharedParentBone = sharedModel.getObjectByName("mixamorigHips");
//   scene.add(sharedParentBone); // the bones need to be in the scene for the animation to work

//   const model1 = shareSkinnedMesh.clone();
//   const model2 = shareSkinnedMesh.clone();
//   const model3 = shareSkinnedMesh.clone();

//   model1.bindMode = THREE.DetachedBindMode;
//   model2.bindMode = THREE.DetachedBindMode;
//   model3.bindMode = THREE.DetachedBindMode;

//   const identity = new THREE.Matrix4();

//   model1.bind(sharedSkeleton, identity);
//   model2.bind(sharedSkeleton, identity);
//   model3.bind(sharedSkeleton, identity);

//   model1.position.x = -2;
//   model2.position.x = 0;
//   model3.position.x = 2;

//   // apply transformation from the glTF asset

//   model1.scale.setScalar(0.01);
//   model1.rotation.x = -Math.PI * 0.5;
//   model2.scale.setScalar(0.01);
//   model2.rotation.x = -Math.PI * 0.5;
//   model3.scale.setScalar(0.01);
//   model3.rotation.x = -Math.PI * 0.5;

//   //

//   const mixer = new THREE.AnimationMixer(sharedParentBone);
//   mixer.clipAction(animations[1]).play();

//   scene.add(sharedParentBone, model1, model2, model3);

//   objects.push(sharedParentBone, model1, model2, model3);
//   mixers.push(mixer);
// }

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  for (const mixer of mixers) mixer.update(delta);

  renderer.render(scene, camera);
}

function setWeight(action, weight) {
  action.enabled = true;
  action.setEffectiveTimeScale(1);
  action.setEffectiveWeight(weight);
}

function pad(str, max) {
  str = str.toString();
  return str.length < max ? pad("0" + str, max) : str;
}

// setInterval(() => {
//   updateClock();
// }, 1000);

function updateClock() {
  let d = new Date();
  let hours = d.getHours();
  let minutes = d.getMinutes();
  let seconds = d.getSeconds();

  document.getElementById("testClock").innerHTML = pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2);

  //console.log(pad(seconds, 2));

  //clock digits have indexes from 0 to 5 from left to right
  for (let clockDigit = 0; clockDigit < 6; clockDigit++) {
    let currentDigitClip = actions[clockDigit].getClip().name;

    // time units are padded with 0 so each hour consist of 2 digits
    // for example 5am is 05 and 6am is 06. Clock format is like this: 05:24
    // 0 is the left part of the number and 1 is the right part
    let numberPart = clockDigit % 2;

    let currentTimePart;

    if (clockDigit <= 1) {
      //hours
      currentTimePart = pad(hours, 2).split("")[numberPart];
    } else if (clockDigit > 1 && clockDigit <= 3) {
      //minutes
      currentTimePart = pad(minutes, 2).split("")[numberPart];
    } else {
      //seconds
      currentTimePart = pad(seconds, 2).split("")[numberPart];
    }

    if (currentDigitClip != currentTimePart) {
      let currentDigitClip_int = parseInt(currentDigitClip);
      let currentTimePart_int = parseInt(currentTimePart);

      let previousAction = mixers[clockDigit].clipAction(
        digit_animations[currentDigitClip_int]
      );
      let newAction = mixers[clockDigit].clipAction(
        digit_animations[currentTimePart_int]
      );
      actions[clockDigit] = newAction;
      previousAction.fadeOut(1);
      newAction.fadeIn(1);
      newAction.play();
      animate();
    }
  }
}

// setTimeout(() => {
//   //console.log(animations);
//   //   console.log(digit_animations);
//   //   console.log(other_animations);
//   //console.log(objects[0]);
//   //   console.log("Delayed for 2 seconds.");
//     let action = mixers[4].clipAction(animations[0]);
//     let action_2 = mixers[4].clipAction(digit_animations[2]);
//     action.fadeOut(5);
//     action_2.fadeIn(5);
//     action_2.play();
//     animate();

//     //console.log(mixers[4].clipAction(animations[0]).getClip());
// }, 1000);

setInterval(() => {
  //   console.log(actions);
  updateClock();
}, 1000);

function setInitialTime() {
  let d = new Date();
  let hours = d.getHours();
  let minutes = d.getMinutes();
  let seconds = d.getSeconds();

  let timeString = pad(hours, 2) + pad(minutes, 2) + pad(seconds, 2);
  initialTime = timeString.split("");
  console.log(initialTime);
}
