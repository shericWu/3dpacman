import * as THREE from 'three';
import { controls, DEBUG, maze } from "./main.js";
import { BLOCK_SIZE } from './gen_maze.js';

let map_scene;
let map_camera;
let renderer;

let maze_mesh;
let beans_icon;
let enemies_icon;

let player_pos;

const MAPSIZE = 600;

const wall_material = new THREE.MeshBasicMaterial({ color: 0x999999 });
const player_material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const player_geometry = new THREE.CircleGeometry(1, 16);
const bean_material = new THREE.MeshBasicMaterial({ color: 0xffff6f });
const bean_geometry = new THREE.CircleGeometry(0.2, 16);
const big_bean_material = new THREE.MeshBasicMaterial({ color: 0x84dcc6 });
const big_bean_geometry = new THREE.CircleGeometry(0.4, 16);
const enemy_geometry = new THREE.CircleGeometry(0.6, 16);
const enemy_color = [0xff0000, 0xffb8ff, 0x00ffff, 0xffb852];

const player_icon = new THREE.Mesh(player_geometry, player_material);

export function init_small_map(){
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(MAPSIZE, MAPSIZE);
    renderer.setClearColor(0x000093, 1);
    renderer.domElement.id = 'SmallMap';
    document.getElementById('container').appendChild(renderer.domElement);
    map_scene = new THREE.Scene();
    if(DEBUG)
        map_camera = new THREE.OrthographicCamera(-25, 25, 25, -25, -10, 10);
    else
        map_camera = new THREE.OrthographicCamera(-11, 11, 11, -11, -10, 10);
    map_camera.position.set(0, 0, 10);
    map_camera.lookAt(0, 0, 0);
    player_pos = new THREE.Vector2(maze.info.player_init_pos[0], maze.info.player_init_pos[1]);
    maze_mesh = new THREE.Group();
    maze_mesh.position.set(-player_pos.x, player_pos.y, 0);

    map_scene.add(maze_mesh);
    beans_icon = new THREE.Group();
    map_scene.add(beans_icon);
    enemies_icon = new THREE.Group();
    map_scene.add(enemies_icon);

    gen_map();
    gen_beans();
    gen_enemies();

    renderer.render(map_scene, map_camera);
}

function gen_map(){
    for(let wall of maze.info.pos){
        let start = new THREE.Vector2(wall[0], wall[1]);
        let end = new THREE.Vector2(wall[2], wall[3]);

        let width, height;
        if (start.y == end.y) {
            width = Math.abs(start.x - end.x) + 0.3;
            height = 0.3;
        } else {
            width = 0.3;
            height = Math.abs(start.y - end.y) + 0.3;
        }

        let wall_geometry = new THREE.PlaneGeometry(width, height);

        let wall_mesh = new THREE.Mesh(wall_geometry, wall_material.clone());
        wall_mesh.position.set(
            (start.x + end.x) / 2,
            -(start.y + end.y) / 2,
            0
        );
        maze_mesh.add(wall_mesh);
    }

    for(let portal of maze.info.portals){
        let start = new THREE.Vector2(portal[0], portal[1]);
        let end = new THREE.Vector2(portal[2], portal[3]);

        let width, height;
        if (start.y == end.y) {
            width = Math.abs(start.x - end.x) + 0.3;
            height = 0.3;
        } else {
            width = 0.3;
            height = Math.abs(start.y - end.y) + 0.3;
        }

        let portal_geometry = new THREE.PlaneGeometry(width, height);
        let portal_material = wall_material.clone();
        portal_material.color.set(0xff00ff);

        let portal_mesh = new THREE.Mesh(portal_geometry, portal_material);
        portal_mesh.position.set(
            (start.x + end.x) / 2,
            -(start.y + end.y) / 2,
            0
        );
        maze_mesh.add(portal_mesh);
    }

    player_icon.position.set(0, 0, 0);
    map_scene.add(player_icon);
}

function gen_beans(){
    beans_icon.clear();
    for(let bean of maze.bean_group.children){
        let position = bean.position;
        let bean_mesh = new THREE.Mesh(bean_geometry.clone(), bean_material.clone());
        bean_mesh.position.set(position.x / BLOCK_SIZE, -position.z / BLOCK_SIZE, 0);
        beans_icon.add(bean_mesh);
    }
}


export function gen_big_beans_on_map(){
    beans_icon.clear();
    for(let bean of maze.bean_group.children){
        let position = bean.position;
        let bean_mesh = new THREE.Mesh(big_bean_geometry.clone(), big_bean_material.clone());
        bean_mesh.position.set(position.x / BLOCK_SIZE, -position.z / BLOCK_SIZE, 0);
        beans_icon.add(bean_mesh);
    }
}


function gen_enemies(){
    enemies_icon.clear();
    for(let i = 0; i < maze.enemies.length; i++){
        let enemy = maze.enemies[i];
        let position = enemy.pos;
        let enemy_material = new THREE.MeshBasicMaterial({ color: enemy_color[i] });
        let enemy_mesh = new THREE.Mesh(enemy_geometry.clone(), enemy_material);
        enemy_mesh.position.set(position.x + 0.5, -position.y - 0.5, 0);
        enemies_icon.add(enemy_mesh);
    }
}

function update_enemies(){
    for(let i = 0; i < maze.enemies.length; i++){
        let enemy = maze.enemies[i];
        let position = enemy.pos;
        let enemy_mesh = enemies_icon.children[i];
        enemy_mesh.position.set(position.x + 0.5, -position.y - 0.5, 0);
    }
}

export function remove_bean(i){
    beans_icon.remove(beans_icon.children[i]);
}

export function updateSmallMap() {
    const playerPos = controls.object.position;
    const playerDir = new THREE.Vector3();
    controls.getDirection(playerDir);

    maze_mesh.position.set(-playerPos.x / BLOCK_SIZE, playerPos.z / BLOCK_SIZE, 0);
    beans_icon.position.set(-playerPos.x / BLOCK_SIZE, playerPos.z / BLOCK_SIZE, 0);

    update_enemies();
    enemies_icon.position.set(-playerPos.x / BLOCK_SIZE, playerPos.z / BLOCK_SIZE, 0);

    let angle = Math.atan2(playerDir.x, -playerDir.z);
    map_scene.rotation.z = angle;

    renderer.render(map_scene, map_camera);
}
