import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  MeshBuilder,
  Scene,
  // SceneLoader,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import "./style.css";
import "@babylonjs/loaders";
import { HandDrawnBorderPostProcess } from "./HandDrawnBorderPostProcess";
import { Pane } from "tweakpane";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

if (!canvas) throw new Error("canvas is null");

class Experience {
  private canvas: HTMLCanvasElement;
  private scene: Scene;
  private engine: Engine;
  private camera: ArcRotateCamera;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(this.canvas);
    this.scene = this.createScene(this.engine);
    this.camera = this.createCamera(this.scene);
    this.camera.maxZ = 100;
    this.initRenderLoop();
    this.initResizeHandler();

    const box = MeshBuilder.CreateBox("box", { size: 2 }, this.scene);
    const material = new StandardMaterial("material", this.scene);
    material.diffuseColor = new Color3(1, 0, 0);
    box.material = material;

    box.rotation = new Vector3(0, 2, 0);

    const box2 = MeshBuilder.CreateBox("box2", { size: 2 }, this.scene);
    const material2 = new StandardMaterial("material2", this.scene);
    material2.diffuseColor = new Color3(0, 1, 0);
    box2.material = material2;
    box2.position = new Vector3(-2, 0, 2);
    box.position = new Vector3(2, 0, -2);
    const ground = MeshBuilder.CreateGround(
      "ground",
      { width: 10, height: 10 },
      this.scene
    );
    ground.position.y = -2;
    const light = new DirectionalLight(
      "light",
      new Vector3(-1, -1, -1),
      this.scene
    );
    light.intensity = 0.7;

    const light2 = new DirectionalLight(
      "light",
      new Vector3(1, 1, 1),
      this.scene
    );
    light2.intensity = 0.7;

    // Our built-in 'ground' shape.

    const sg = new ShadowGenerator(1024, light);
    const sm = sg.getShadowMap();

    if (sm) {
      sm.renderList = [box, box2];
    }

    light.shadowMinZ = 0;
    light.shadowMaxZ = 3;

    ground.receiveShadows = true;

    //  SceneLoader.AppendAsync("/", "suzanne.glb", this.scene).then((scene) => {
    //   scene.meshes.forEach(mesh => {
    //     console.log(mesh.name);

    //     if(mesh.name === "__root__") {

    //     }
    //   })

    //  })

    box.isPickable = true;
    box2.isPickable = true;
    ground.isPickable = true;

    const outlinePostProcess = new HandDrawnBorderPostProcess(
      "HandDrawnPostProcess",
      this.camera
    );

    // const pane = new Pane();

    // const PARAMS = {
    //   normalOutlineDebug: true,
    //   finalColor: false,
    // };

    // pane.addBinding(PARAMS, "normalOutlineDebug").on("change", () => {
    //   outlinePostProcess.uNormalOutlineDebug = PARAMS.normalOutlineDebug;
    // });

    // pane.addBinding(PARAMS, "finalColor").on("change", () => {
    //   outlinePostProcess.uFinalColor = PARAMS.finalColor;
    // });

    this.scene.onPointerDown = (evt, pickInfo) => {
      if (pickInfo.pickedMesh) {
        const pickedMesh = pickInfo.pickedMesh;
        const outlinedMeshes = outlinePostProcess.renderList;
        if (outlinedMeshes?.includes(pickedMesh)) {
          outlinePostProcess.removeOutlineMesh(pickedMesh);
          return;
        }
        outlinePostProcess.addOutlineMeshes(pickedMesh);
      }
    };

    const pane = new Pane();

    const PARAMS = {
      outlineThickness: 1.5,
      outlineColor: "#000000",
    };

    pane.addBinding(PARAMS, "outlineThickness").on("change", () => {
      outlinePostProcess.setOutlineThickness(PARAMS.outlineThickness);
    });
    pane.addBinding(PARAMS, "outlineColor").on("change", () => {
      outlinePostProcess.setOutlineColor(PARAMS.outlineColor);
    });
  }

  private createScene = (engine: Engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(1, 1, 1, 1);
    // scene.createDefaultLight(true);
    // scene.createDefaultEnvironment();
    return scene;
  };

  private createCamera = (scene: Scene) => {
    const camera = new ArcRotateCamera(
      "camera",
      0,
      0,
      10,
      new Vector3(0, 0, 0),
      scene
    );

    camera.attachControl(true);
    camera.setPosition(new Vector3(0, 0, 20));
    return camera;
  };

  private initRenderLoop = () => {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  };

  private initResizeHandler = () => {
    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  };
}

new Experience(canvas);
