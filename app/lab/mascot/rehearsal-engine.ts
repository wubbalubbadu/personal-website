import * as T from "three";

export type RoomSettings = { palette: "rose" | "blue"; evening: boolean; resting: boolean; angle: number };
type Mat = T.MeshStandardMaterial;

/** An independent, render-on-demand diorama. No timers, audio, or global handlers. */
export class RehearsalEngine {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.OrthographicCamera(-5, 5, 5, -5, .1, 70);
  private observer: ResizeObserver;
  private materials = new Set<Mat>();
  private textures = new Set<T.Texture>();
  private accent: Mat;
  private pale: Mat;
  private sky: Mat;
  private lampGlow: Mat;
  private sunlight = new T.DirectionalLight("#fff1d8", 3);
  private fill = new T.HemisphereLight("#fff8ed", "#a28a99", 2.6);
  private lamp = new T.PointLight("#ffca77", 0, 7, 2);
  private cat = new T.Group();
  private flute = new T.Group();
  private eyes = new T.Group();
  private sleepyEyes = new T.Group();
  private stars = new T.Group();
  private sun = new T.Group();
  private settings: RoomSettings = { palette: "rose", evening: false, resting: false, angle: 0 };

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.accent = this.mat("#d58ea9");
    this.pale = this.mat("#f1d9e1");
    this.sky = this.mat("#a6d6e7", .9, "#83b9d3");
    this.lampGlow = this.mat("#fff3cf", .8, "#ffcc7a");
    this.scene.add(this.fill, this.sunlight, this.lamp);
    this.sunlight.position.set(1, 8, 5);
    this.sunlight.castShadow = true;
    this.sunlight.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sunlight.shadow.camera, { left: -5, right: 5, top: 6, bottom: -5 });
    this.sunlight.shadow.bias = -.001;
    this.sunlight.shadow.normalBias = .025;
    this.lamp.position.set(2.1, 2.5, -.75);
    this.buildRoom();
    this.buildCat();
    this.observer = new ResizeObserver(() => this.render());
    this.observer.observe(canvas);
    this.update(this.settings);
  }

  private mat(color: string, roughness = .8, emissive?: string) {
    const mat = new T.MeshStandardMaterial({ color, roughness, emissive: emissive ?? "#000000", emissiveIntensity: .25 });
    this.materials.add(mat);
    return mat;
  }

  private mesh(geo: T.BufferGeometry, mat: Mat, x: number, y: number, z: number, parent: T.Object3D = this.scene) {
    const mesh = new T.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private box(w: number, h: number, d: number, mat: Mat, x: number, y: number, z: number, parent?: T.Object3D) {
    return this.mesh(new T.BoxGeometry(w, h, d), mat, x, y, z, parent);
  }

  private ball(r: number, mat: Mat, x: number, y: number, z: number, scale: [number, number, number] = [1, 1, 1], parent?: T.Object3D) {
    const mesh = this.mesh(new T.SphereGeometry(r, 20, 14), mat, x, y, z, parent);
    mesh.scale.set(...scale);
    return mesh;
  }

  private rod(a: T.Vector3, b: T.Vector3, r: number, mat: Mat, parent: T.Object3D = this.scene) {
    const direction = b.clone().sub(a);
    const mesh = this.mesh(new T.CylinderGeometry(r, r, direction.length(), 12), mat, 0, 0, 0, parent);
    mesh.position.copy(a.clone().add(b).multiplyScalar(.5));
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  }

  private buildRoom() {
    const ivory = this.mat("#fff7e9"), wood = this.mat("#ba885f"), edge = this.mat("#976546");
    const metal = this.mat("#65576c", .45), leaf = this.mat("#779879"), darkLeaf = this.mat("#4e735f");
    this.box(6.5, .25, 5.3, edge, 0, -.2, 0);
    // Individual floorboards, with staggered joints.
    for (let row = 0; row < 13; row++) {
      for (let col = 0; col < 3; col++) {
        const material = this.mat(["#cfa880", "#d8b48e", "#d0a67e", "#dfba94"][(row + col) % 4]);
        this.box(2.13, .07, .39, material, -2.15 + col * 2.15, -.045, -2.4 + row * .4);
      }
    }
    this.box(6.5, 3.65, .14, this.pale, 0, 1.75, -2.6);
    this.box(.14, 3.65, 5.3, ivory, -3.2, 1.75, 0);
    this.box(6.4, .16, .12, ivory, 0, .12, -2.47);
    this.box(.12, .16, 5.2, ivory, -3.08, .12, 0);
    // Lower wall panelling.
    for (let x = -3; x <= 3; x += .6) this.box(.035, 1.05, .05, ivory, x, .65, -2.49);
    this.box(6.4, .08, .09, ivory, 0, 1.2, -2.47);
    // Window and gathered curtains.
    this.box(2.3, 1.9, .09, ivory, .4, 2.38, -2.45);
    this.box(2.07, 1.67, .06, this.sky, .4, 2.38, -2.38);
    this.scene.add(this.sun, this.stars);
    this.ball(.19, this.mat("#fff7d4", .8, "#ffe7a4"), .94, 2.78, -2.32, [1, 1, .2], this.sun);
    for (let i = 0; i < 9; i++) this.ball(.022 + (i % 2) * .008, ivory, -.43 + (i % 4) * .49, 1.85 + Math.floor(i / 4) * .48, -2.32, [1, 1, .3], this.stars);
    this.box(.065, 1.74, .1, ivory, .4, 2.38, -2.28);
    this.box(2.15, .065, .1, ivory, .4, 2.38, -2.28);
    this.box(2.55, .11, .38, ivory, .4, 1.42, -2.28);
    this.rod(new T.Vector3(-1.05, 3.45, -2.1), new T.Vector3(1.85, 3.45, -2.1), .035, wood);
    for (const side of [-1, 1]) {
      for (let fold = 0; fold < 4; fold++) {
        this.ball(1, this.accent, .4 + side * (1.07 + fold * .09), 2.43, -2.13 + (fold % 2) * .04, [.095, .94, .10]);
      }
    }
    // Oval woven rug with a scalloped edge.
    const rug = this.mesh(new T.CylinderGeometry(1.6, 1.6, .025, 64), this.accent, .3, .022, .7);
    rug.scale.z = .78;
    const rugInset = this.mesh(new T.CylinderGeometry(1.36, 1.36, .028, 64), this.pale, .3, .033, .7);
    rugInset.scale.z = .78;
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2;
      this.ball(.14, this.accent, .3 + 1.55 * Math.cos(a), .028, .7 + 1.2 * Math.sin(a), [1, .15, 1]);
    }
    // Upright piano, individual keys and an open score.
    const piano = this.mat("#66515f"), black = this.mat("#302d3b");
    this.box(1.85, 1.25, .52, piano, -1.89, .72, -1.87);
    this.box(1.97, .12, .62, wood, -1.89, 1.4, -1.86);
    this.box(1.93, .15, .95, piano, -1.89, .73, -1.62);
    for (let i = 0; i < 21; i++) {
      this.box(.078, .05, .39, ivory, -2.74 + i * .085, .83, -1.37);
      if (![2, 6].includes(i % 7) && i < 20) this.box(.044, .05, .22, black, -2.698 + i * .085, .87, -1.46);
    }
    for (const x of [-2.66, -1.14]) this.box(.11, .65, .12, piano, x, .33, -1.26);
    this.box(.85, .14, .43, this.accent, -1.88, .48, -.63);
    for (const x of [-2.2, -1.56]) for (const z of [-.77, -.49]) this.box(.07, .4, .07, wood, x, .22, z);
    this.score(-1.89, 1.16, -1.57, .62, .43);
    // Sheet music stand, with tripod feet.
    this.rod(new T.Vector3(1.2, .08, .55), new T.Vector3(1.2, 1.24, .55), .028, metal);
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      this.rod(new T.Vector3(1.2, .22, .55), new T.Vector3(1.2 + Math.cos(a) * .36, .06, .55 + Math.sin(a) * .36), .025, metal);
    }
    this.box(.82, .58, .06, metal, 1.2, 1.36, .55);
    this.score(1.2, 1.4, .59, .72, .46);
    this.box(.87, .035, .14, metal, 1.2, 1.08, .6);
    // Floor lamp, lit only in the evening.
    this.mesh(new T.CylinderGeometry(.25, .29, .07, 24), metal, 2.48, .06, -1.4);
    this.rod(new T.Vector3(2.48, .06, -1.4), new T.Vector3(2.48, 2.45, -1.4), .035, metal);
    this.mesh(new T.CylinderGeometry(.24, .47, .52, 24, 1, true), this.lampGlow, 2.48, 2.38, -1.4);
    // A leafy plant on a low stool.
    this.mesh(new T.CylinderGeometry(.29, .22, .48, 20), this.accent, 2.48, .39, 1.45);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, h = .92 + (i % 3) * .18;
      const x = 2.48 + Math.sin(a) * .25, z = 1.45 + Math.cos(a) * .25;
      this.rod(new T.Vector3(2.48, .6, 1.45), new T.Vector3(x, h, z), .014, darkLeaf);
      const l = this.ball(.22, i % 2 ? leaf : darkLeaf, x, h, z, [.55, 1.6, .55]);
      l.rotation.z = Math.sin(a) * .5;
    }
    // Shelf with books and a tiny cookie jar on the left wall.
    this.box(.55, .1, 1.7, wood, -2.87, 2.25, .1);
    for (let i = 0; i < 5; i++) this.box(.3, .38 + (i % 2) * .12, .12, i % 2 ? this.accent : this.mat("#91a99b"), -2.88, 2.49, -.5 + i * .14);
    this.mesh(new T.CylinderGeometry(.15, .15, .24, 20), ivory, -2.88, 2.42, .65);
    this.mesh(new T.CylinderGeometry(.17, .17, .05, 20), wood, -2.88, 2.56, .65);
    // A small framed musical print.
    this.box(.8, .92, .07, wood, -2.1, 2.63, -2.47);
    this.box(.65, .77, .035, ivory, -2.1, 2.63, -2.42);
    this.ball(.1, this.accent, -2.18, 2.47, -2.37, [1, .65, .25]);
    this.box(.035, .36, .025, this.accent, -2.1, 2.63, -2.37);
  }

  private score(x: number, y: number, z: number, w: number, h: number) {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fffdf4"; ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = "#635764"; ctx.lineWidth = 1.2;
    for (let system = 0; system < 2; system++) {
      for (let line = 0; line < 5; line++) {
        const sy = 30 + system * 65 + line * 7;
        ctx.beginPath(); ctx.moveTo(18, sy); ctx.lineTo(238, sy); ctx.stroke();
      }
      for (let n = 0; n < 6; n++) {
        const nx = 38 + n * 34, ny = 44 + system * 65 + [7, 0, -7, 3.5, -3.5, 0][n];
        ctx.fillStyle = "#413842"; ctx.beginPath(); ctx.ellipse(nx, ny, 5, 3, -.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(nx + 4, ny); ctx.lineTo(nx + 4, ny - 20); ctx.stroke();
      }
    }
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; this.textures.add(texture);
    const mat = this.mat("#ffffff"); mat.map = texture;
    this.mesh(new T.PlaneGeometry(w, h), mat, x, y, z);
  }

  private buildCat() {
    this.scene.add(this.cat); this.cat.add(this.flute, this.eyes, this.sleepyEyes);
    const fur = this.mat("#fffaf0"), pink = this.mat("#e6a2ae"), eye = this.mat("#3c3443"), silver = this.mat("#d8e2e8", .27);
    silver.metalness = .6;
    this.ball(.42, fur, 0, .58, 0, [.85, 1.1, .8], this.cat);
    this.ball(.55, fur, 0, 1.19, .015, [1, .87, .83], this.cat);
    for (const side of [-1, 1]) {
      const ear = this.mesh(new T.ConeGeometry(.22, .43, 3), fur, side * .34, 1.67, 0, this.cat);
      ear.rotation.z = -side * .18;
      const inner = this.mesh(new T.ConeGeometry(.12, .28, 3), pink, side * .34, 1.69, .105, this.cat);
      inner.rotation.z = -side * .18;
      this.ball(.11, eye, side * .19, 1.24, .426, [.72, 1, .38], this.eyes);
      this.ball(.032, fur, side * .19 - .017, 1.27, .465, [1, 1, .5], this.eyes);
      this.rod(new T.Vector3(side * .12, 1.22, .45), new T.Vector3(side * .26, 1.23, .43), .016, eye, this.sleepyEyes);
      this.ball(.09, pink, side * .34, 1.1, .38, [1, .4, .2], this.cat);
      this.ball(.16, fur, side * .24, .17, .17, [1, .65, 1.4], this.cat);
      this.ball(.14, fur, side * .31, .81, .31, [.8, 1.15, .9], this.flute);
      for (let i = 0; i < 2; i++) this.rod(new T.Vector3(side * .36, 1.05 + i * .055, .36), new T.Vector3(side * .65, 1.02 + i * .09, .34), .008, eye, this.cat);
    }
    this.ball(.052, pink, 0, 1.1, .474, [1, .65, .5], this.cat);
    this.rod(new T.Vector3(0, 1.07, .46), new T.Vector3(.055, 1.03, .45), .009, eye, this.cat);
    this.rod(new T.Vector3(0, 1.07, .46), new T.Vector3(-.055, 1.03, .45), .009, eye, this.cat);
    // Collar and gold bell.
    const collar = this.mesh(new T.TorusGeometry(.27, .045, 8, 24), this.accent, 0, .88, 0, this.cat); collar.rotation.x = Math.PI / 2;
    this.ball(.065, this.mat("#dbb868", .35), 0, .82, .3, [1, 1, 1], this.cat);
    const tailCurve = new T.CatmullRomCurve3([new T.Vector3(.22, .35, -.12), new T.Vector3(.65, .4, -.23), new T.Vector3(.73, .72, -.1), new T.Vector3(.64, .82, -.06)]);
    this.mesh(new T.TubeGeometry(tailCurve, 18, .085, 10, false), fur, 0, 0, 0, this.cat);
    // Transverse flute and visible key cups.
    this.rod(new T.Vector3(-.2, 1.02, .55), new T.Vector3(1, .88, .55), .035, silver, this.flute);
    for (let i = 0; i < 7; i++) this.ball(.043, silver, .05 + i * .105, 1.037 - i * .012, .57, [1, .4, 1], this.flute);
  }

  update(settings: RoomSettings) {
    this.settings = settings;
    this.accent.color.set(settings.palette === "rose" ? "#d58ea9" : "#7eaac2");
    this.pale.color.set(settings.palette === "rose" ? "#f1d9e1" : "#d6e6ef");
    this.sky.color.set(settings.evening ? "#293c72" : "#a6d6e7");
    this.sky.emissive.set(settings.evening ? "#253e74" : "#83b9d3");
    this.sun.visible = !settings.evening; this.stars.visible = settings.evening;
    this.sunlight.intensity = settings.evening ? .6 : 3;
    this.sunlight.color.set(settings.evening ? "#adb9ff" : "#fff1d8");
    this.fill.intensity = settings.evening ? 1.1 : 2.6;
    this.lamp.intensity = settings.evening ? 16 : 0;
    this.lampGlow.emissiveIntensity = settings.evening ? 1.4 : .15;
    this.cat.position.set(settings.resting ? -.65 : -.25, settings.resting ? .60 : .06, .85);
    this.cat.rotation.set(0, -.15, settings.resting ? -Math.PI / 2 : 0);
    this.cat.scale.setScalar(settings.resting ? .78 : 1);
    this.flute.visible = !settings.resting; this.eyes.visible = !settings.resting; this.sleepyEyes.visible = settings.resting;
    const a = (.55 + settings.angle * Math.PI / 180);
    this.camera.position.set(Math.sin(a) * 11, 8, Math.cos(a) * 11);
    this.camera.lookAt(0, 1.15, 0);
    this.render();
  }

  private render() {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const half = Math.max(4.15, 4.3 / aspect);
    this.camera.left = -half * aspect; this.camera.right = half * aspect;
    this.camera.top = half; this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.observer.disconnect();
    this.scene.traverse(object => { if (object instanceof T.Mesh) object.geometry.dispose(); });
    this.materials.forEach(mat => mat.dispose());
    this.textures.forEach(texture => texture.dispose());
    this.sunlight.shadow.dispose();
    this.renderer.dispose();
  }
}
