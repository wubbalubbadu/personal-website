'use client';
import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {createModel} from './embouchure/model';

// A passive, non-interactive rendering of the same model the full Simulation
// page uses — just enough motion to read as "this is a real 3D model," not
// a screenshot. No OrbitControls, no pointer handling — but hovering shows
// the airflow, same shader as the full page.
export default function EmbouchureMiniPreview() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    } catch {
      return; // No WebGL — the card still works as a plain link without its preview.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#000000', 0);
    renderer.domElement.style.opacity = '0';
    renderer.domElement.style.transform = 'scale(.94)';
    renderer.domElement.style.transition = 'opacity .9s cubic-bezier(.16,.8,.3,1), transform .9s cubic-bezier(.16,.8,.3,1)';
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#8d7477', 2.5));
    const light = new THREE.DirectionalLight('#fff8ec', 3);
    light.position.set(-2, 4, 7);
    scene.add(light);
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    camera.position.set(-.5, 0, 8.8);
    camera.lookAt(-.55, -.1, 0);
    const model = createModel();
    scene.add(model.root);
    const resize = new ResizeObserver(() => {
      const {width, height} = container.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resize.observe(container);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hovering = {current: false};
    const setHover = (value: boolean) => { hovering.current = value; };
    container.addEventListener('pointerenter', () => setHover(true));
    container.addEventListener('pointerleave', () => setHover(false));
    let frame = 0, revealed = false;
    function tick(now: number) {
      const time = now / 1000;
      model.update(76, reduced ? 0 : time, hovering.current);
      model.root.rotation.y = reduced ? -.15 : Math.sin(time * .28) * .32 - .15;
      renderer.render(scene, camera);
      if (!revealed) { revealed = true; renderer.domElement.style.opacity = '1'; renderer.domElement.style.transform = 'scale(1)'; }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      scene.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return <div ref={host} className="preview-3d" aria-hidden="true" />;
}
