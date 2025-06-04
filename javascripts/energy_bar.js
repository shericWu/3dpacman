import * as THREE from 'three';
import { energy, MAXENERGY } from './main.js';

let renderer;
let bar_scene;
let bar_camera;

const BARWIDTH = 30;
const BARHEIGHT = 350;

const bar_geometry = new THREE.BoxGeometry(2, 1);
const bar_material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const energy_bar = new THREE.Mesh(bar_geometry.clone(), bar_material.clone());

export function init_energy_bar(){
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(BARHEIGHT, BARWIDTH);
    renderer.domElement.id = 'EnergyBar';
    document.getElementById('energy').appendChild(renderer.domElement);
    bar_scene = new THREE.Scene();
    bar_camera = new THREE.OrthographicCamera(-1, 1, 0.5, -0.5, -10, 10);
    bar_camera.position.set(0, 0, 10);
    bar_camera.lookAt(0, 0, 0);

    bar_scene.add(energy_bar);
    energy_bar.position.set(0, 0, 0);

    renderer.render(bar_scene, bar_camera);
}

export function updateEnergyBar(){
    let ratio = energy / MAXENERGY
    energy_bar.scale.x = ratio;
    energy_bar.position.x = -1 + ratio;

    let color;
    if(ratio > 0.5)
        color = new THREE.Color( 0x00ff00 );
    else if(ratio < 0.2)
        color = new THREE.Color( 0xff0000 );
    else
        color = new THREE.Color( 0xf9f900 );
    energy_bar.material.color = color;

    renderer.render(bar_scene, bar_camera);
}
