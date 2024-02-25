import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer, clock;
let model, animations, cooModel;
let digit_animations = [];
let other_animations = [];
let actions = [];

let initialTime;

let number_of_clock_digits = 6;
let clockUnitsDistance = 3.4;
let clockDigitsDistance = 3.1;
let randomShitProbability = 8;

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
  camera.zoom = 6.5;
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0.5, 0);
  camera.translateX(-0.1);

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  //scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 4);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 6);
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

    console.log(digit_animations);

    model.traverse(function (object) {
      if (object.isMesh) object.castShadow = true;
    });

    setInitialTime();

    setupDefaultScene();
  });

  loader.load("models/coocoo_12.glb", function (gltf) {
    cooModel = gltf.scene;
    cooModel.traverse(function (object) {
      if (object.isMesh) object.castShadow = true;

      // if(object.animations.length != 0) {
      //   console.log(object.animations);
      // }
    });

    for (let index = 0; index < 4; index++) {
      let modelClone = gltf.scene.clone();

      switch (index) {
        case 0:
          modelClone.position.y = 0.1;
          modelClone.position.x = -0.2;
          break;
        case 1:
          modelClone.position.y = -0.2;
          modelClone.position.x = -0.2;
          break;

        case 2:
          modelClone.position.y = 0.1;
          modelClone.position.x = 1.8;
          break;
        case 3:
          modelClone.position.y = -0.2;
          modelClone.position.x = 1.8;
          break;
      }

      modelClone.position.z = 1;

      modelClone.scale.setScalar(0.8);

      modelClone.rotation.y = Math.PI * 0.5;

      scene.add(modelClone);
    }
  });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
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

  for (let index = number_of_clock_digits; index > 0; index--) {
    let modelClone = SkeletonUtils.clone(model);
    

    let digitOffset = clockUnitsDistance * -1;
    if (index % 2 == 1) {
      digitOffset = clockDigitsDistance * -1;
    }

    modelClone.position.x = digitOffset + index;

    modelClone.rotation.y = Math.PI * 0.5;

    
    modelClone.traverse(function (object) {
      if (object.isMesh) {
        if(object.name != "Line02" && object.name != "Box01") {
          object.material = object.material.clone();
          // Generate random values for red, green, and blue components separately
          let r = Math.random();
          let g = Math.random();
          let b = Math.random();
          // Combine components into a single color value
          let randomColor = new THREE.Color("hsl( "+getRandomInt(360)+", 100%, 67%)");
          object.material.color.copy(randomColor);
        } else {
          //face and arms
          let randomColor = new THREE.Color("hsl( 0, 100%, 90%)");
          object.material.color.copy(randomColor);
        }
      }
    });

    //console.log(modelClone);

    //.material.color.setHex( 0xffffff );

    let mixer = new THREE.AnimationMixer(modelClone);

    let action = mixer.clipAction(animations[0]);

    actions.push(action);

    action.play();

    scene.add(modelClone);

    objects.push(modelClone);
    mixers.push(mixer);
  }
}
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

function updateClock() {
  let d = new Date();
  let hours = d.getHours();
  let minutes = d.getMinutes();
  let seconds = d.getSeconds();

  document.getElementById("testClock").innerHTML =
    pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2);

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

      let previousActionObject = animations.find(
        (item) => item.name === currentDigitClip
      );

      let previousAction = mixers[clockDigit].clipAction(previousActionObject);

      let newAction = mixers[clockDigit].clipAction(
        digit_animations[currentTimePart_int]
      );


      actions[clockDigit] = newAction;
      previousAction.fadeOut(1);

      setTimeout(() => {
        previousAction.stop();
      }, 1000);

      newAction.fadeIn(1);

      newAction.play();
      //animate();
    }
  }
}

function doRandomShit() {

  let shouldIDoShit = getRandomInt(randomShitProbability) == 3;
  
  if (shouldIDoShit == false) return;

  let randomInt = getRandomInt(3);
  let currentGrandpaDigit = actions[randomInt].getClip().name;
  console.log("currentGrandpaDigit = "+currentGrandpaDigit);
  let previousActionObject = animations.find(
    (item) => item.name === currentGrandpaDigit
  );
  let previousAction = mixers[randomInt].clipAction(previousActionObject);
  let newAction = mixers[randomInt].clipAction(
    other_animations[getRandomInt(other_animations.length - 1)]
  );

  previousAction.fadeOut(1);
  newAction.fadeIn(1);
  newAction.play();
  
  setTimeout(() => {
    previousAction.stop();
  }, 1000);


  setTimeout(() => {
    newAction.fadeOut(1);
    setTimeout(() => {
      newAction.stop();
      previousAction.fadeIn(1);
      previousAction.play();
    }, 1000);
  }, 10000);
}

setInterval(() => {
  updateClock();
}, 1000);

setInterval(() => {
  //   console.log(actions);
  doRandomShit();
}, 2000);

function setInitialTime() {
  let d = new Date();
  let hours = d.getHours();
  let minutes = d.getMinutes();
  let seconds = d.getSeconds();

  let timeString = pad(hours, 2) + pad(minutes, 2) + pad(seconds, 2);
  initialTime = timeString.split("");
  console.log(initialTime);
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}


