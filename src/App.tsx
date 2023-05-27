import { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SelectiveBloom } from "./js/SelectiveBloom";
import { DatGUI } from "./js/DatGUI";
import Particles from "./Particles/Particles";
import Time from "./Time";
import "./App.css";

const getCubeMapTexture = (renderer: THREE.WebGLRenderer, path: string) => {
  return new Promise((resolve, reject) => {
    new RGBELoader().load(
      path,
      (texture) => {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        pmremGenerator.dispose();
        resolve(envMap);
      },
      undefined,
      reject
    );
  });
};

export default function App() {
  const [isInitScene, setIsInitScene] = useState<boolean>(false);

  useEffect(() => {
    if (!isInitScene) {
      setIsInitScene(true);
      initScene();
    }
  }, []);

  const initScene = async () => {
    const time = new Time();
    const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector("canvas.webgl")!,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0.0);
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      1,
      200
    );
    camera.position.set(0, 2, 10);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    let selectiveBloom = new SelectiveBloom(scene, camera, renderer);
    new DatGUI(renderer, selectiveBloom);

    let envMap = (await getCubeMapTexture(
      renderer,
      "./hdr/satara_night_4k.hdr"
    )) as THREE.Texture;

    let light = new THREE.DirectionalLight();
    light.position.setScalar(1);
    scene.add(light, new THREE.AmbientLight(0xffffff, 0.5));

    let { model, mixer }: any = await addModel(scene);
    let { ring }: any = await addRing(scene);

    let particles = new Particles(scene);

    let clock = new THREE.Clock();

    window.addEventListener("resize", onResize);
    renderer.setAnimationLoop(() => {
      let delta = clock.getDelta();

      time.tick();

      particles.update({
        value: time.value(),
      });

      if (mixer) mixer.update(delta);

      if (model) {
        model.material.color.set(0x000000);
        ring.material.color.set(0x000000);
        scene.background = null;
      }
      renderer.setClearColor(0x000000);
      selectiveBloom.bloomComposer.render();
      if (model) {
        model.material.color.copy(model.userData.color);
        ring.material.color.copy(ring.userData.color);
      }
      if (envMap) {
        scene.background = envMap;
      }
      renderer.setClearColor(0x1d1d1d);
      selectiveBloom.finalComposer.render();

      controls.update();
    });

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      selectiveBloom.bloomComposer.setSize(
        window.innerWidth,
        window.innerHeight
      );
      selectiveBloom.finalComposer.setSize(
        window.innerWidth,
        window.innerHeight
      );
    }
  };

  const addModel = (scene: THREE.Scene) => {
    return new Promise((resolve, reject) => {
      let model: THREE.Object3D | any;
      let mixer: THREE.AnimationAction | any;
      let loader = new GLTFLoader();
      loader.load("https://cywarr.github.io/small-shop/Egg.glb", (gltf) => {
        model = gltf.scene.getObjectByName("Egg_with_Animation");
        model!.userData = {
          // @ts-ignore;
          color: new THREE.Color().copy(model.material.color),
        };

        mixer = new THREE.AnimationMixer(gltf.scene);
        mixer.clipAction(gltf.animations[0]).play();

        model.position.setY(0.0);
        scene.add(model!);

        resolve({
          model,
          mixer,
        });
      });
    });
  };

  const addRing = (scene: THREE.Scene) => {
    return new Promise((resolve, reject) => {
      const textureloader = new THREE.TextureLoader();
      textureloader.load(
        "./model/textures/Material.001_diffuse.png",
        function (texture) {
          let ring: THREE.Object3D | any;
          let loader = new GLTFLoader();
          loader.load("./model/scene.gltf", (gltf) => {
            ring = gltf.scene.getObjectByName("Plane_0");
            ring.material = new THREE.MeshStandardMaterial({
              map: texture,
              transparent: true,
            });
            ring.userData = {
              // @ts-ignore;
              color: new THREE.Color().copy(ring.material.color),
            };
            ring.rotateX(-Math.PI / 2);
            ring.scale.set(2, 2, 2);
            ring.position.setY(-1.0);
            scene.add(ring);

            resolve({
              ring,
            });
          });
        }
      );
    });
  };

  return (
    <div className="App">
      <div className="content">
        <a className="title" href="https://github.com/WaterSeeding/MagicAgg" target="_blank">Made in JYuan</a>
      </div>
      <canvas
        className="webgl"
        style={{ width: "100%", height: "100%" }}
      ></canvas>
    </div>
  );
}
