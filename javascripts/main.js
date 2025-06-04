import * as THREE from 'three';
import { gen_maze, gen_big_beans, boardCord2worldCord, BLOCK_SIZE, gen_black_holes } from './gen_maze.js';
import { CLASSIC, SIMPLE } from './maze.js';
import { Enemy, calculate_target } from './enemy.js';
import { init_small_map,  updateSmallMap, remove_bean, gen_big_beans_on_map } from './small_map.js';
import { init_energy_bar, updateEnergyBar } from './energy_bar.js';

import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
export const DEBUG = false;;
const LIGHTOUT = (sessionStorage.getItem("MODE_LIGHTOUT") === "true")? true : false;
const ENEMY_ACCELERATION = (sessionStorage.getItem("MODE_ACCELERATE") === "true")? true : false;
const RED_LIGHT_GREEN_LIGHT = (sessionStorage.getItem("MODE_REDGREEN") === "true")? true : false;
const HARD_MODE = (sessionStorage.getItem("MODE_HARD") === "true")? true : false;
const MODE_SOUND = (sessionStorage.getItem("MODE_SOUND") === "true")? true : false;
export const LOAD_ENEMY_MODEL = (sessionStorage.getItem("MODE_MODEL") === "true")? true : false;
let LIFE = Number(sessionStorage.getItem("LIFE"));

const MAZE = CLASSIC;
const step = BLOCK_SIZE * 3;    //3 blocks per second
let enemy_step = step * 0.5;
let stage = 1;
const player_size = new THREE.Vector3(2.0, 4.0, 2.0);
const camera_height = 5;
export const enemy_height = 2;

const MAXANGLE = Math.PI / 3;
const MINANGLE = Math.PI / 5;
const MAXINTENSITY = 10;
const MININTENSITY = 5;

export let scene;
let camera;
let renderer;
let container;
let canvas;
let floor;
export let controls;
let gaming = false;

let small_map;

let pressed_keys = new Set();

let env = new THREE.Group();
export let maze;

let total_beans = 0;
let n_beans = 0;

let flashlight;
let moving_lock = false;

let heartbeat;
let sound_playing = false;
const SOUND_RADIUS = 5 * BLOCK_SIZE;

export const MAXENERGY = 500;
export let energy;

await init();
async function init() {
    document.getElementById('game_over').style.display = 'none';
    document.getElementById('game_complete').style.display = 'none';
    document.getElementById('energyText').style.display = 'none';

    // Scene and camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    container = document.getElementById('container');

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Canvas
    canvas = renderer.domElement;

    // Control
    controls = new PointerLockControls(camera, document.body);
    controls.maxPolarAngle = Math.PI * 5 / 6;
    scene.add(controls.object);
    initControl()

    // Light
    let ambientLight = new THREE.AmbientLight('#0c0c0c', 5);
    scene.add(ambientLight);
    let directionalLight = new THREE.DirectionalLight(0xffffff, 10);
    directionalLight.position.set(1, 1, 3);
    // scene.add(directionalLight);

    flashlight = new THREE.SpotLight(0xffffff, MAXINTENSITY, 100, MAXANGLE, 0.5, 0.5);
    flashlight.position.set(0, 0, 0);
    flashlight.target.position.set(0, 0, -1);

    controls.object.add(flashlight);
    controls.object.add(flashlight.target);

    // Floor
    const floor_size = 1000;
    let floorGeometry = new THREE.PlaneGeometry(floor_size, floor_size);
    floor = new THREE.Mesh(floorGeometry, new THREE.MeshPhongMaterial({ color: 0x003060 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.set(floor_size / 2, 0, floor_size / 2);
    env.add(floor);

    // Maze
    maze = await gen_maze(MAZE);
    document.getElementById("loadingBar").style.display = 'none';
    document.getElementById("instructions").style.display = '';

    console.log("Finish gen maze");
    env.add(maze.mesh);
    scene.add(env);
    for (let child of env.children[1].children) {
        child.geometry.computeBoundingBox();
        child.updateMatrixWorld();
        child.geometry.boundingBox.applyMatrix4(child.matrixWorld);
        // const child_box = new THREE.Box3Helper(child.geometry.boundingBox, 0xff0000);
        // scene.add(child_box);
    }

    // scene.add(maze.bean_group);
    // total_beans = n_beans = 0;
    // for (let bean of maze.bean_group.children) {
    //     bean.geometry.computeBoundingBox();
    //     bean.updateMatrixWorld();
    //     bean.geometry.boundingBox.applyMatrix4(bean.matrixWorld);
    //     // const bean_box = new THREE.Box3Helper(bean.geometry.boundingBox, 0xff0000);
    //     // scene.add(bean_box);
    //     total_beans += 1;
    // }
    add_bean_group(maze.bean_group);
    document.getElementById('Score').textContent = `Score: 0 / ${total_beans}`;

    scene.add(maze.portal_group);
    for (let portal of maze.portal_group.children) {
        portal.geometry.computeBoundingBox();
        portal.updateMatrixWorld();
        portal.geometry.boundingBox.applyMatrix4(portal.matrixWorld);
        // const portal_box = new THREE.Box3Helper(portal.geometry.boundingBox, 0xff0000);
        // scene.add(portal_box);
    }
    scene.add(maze.enemy_group);

    let init_pos = maze.player_init_pos;
    init_pos = boardCord2worldCord(init_pos[0], init_pos[1]);
    camera.position.set(init_pos.x, camera_height, init_pos.z);
    camera.lookAt(new THREE.Vector3(init_pos.x + 1, camera_height, init_pos.z));

    // Small Map
    init_small_map(MAZE);
    updateSmallMap();

    small_map = document.getElementById('SmallMap');
    small_map.style.display = 'none';

    energy = MAXENERGY;
    document.getElementById('energyText').style.display = '';
    init_energy_bar();

    heartbeat = new Audio('/sounds/heartbeat.mp3');
    heartbeat.volume = (MODE_SOUND)? 0.05 : 0;
    heartbeat.loop = true;
    sound_playing = false;

    document.getElementById('butt2').addEventListener('click', revive);
}

function initControl(){
    document.getElementById("instructions").style.display = 'none';
    canvas.addEventListener('click', () => {
        controls.lock();
    });
    let instructions = document.getElementById('instructions');
    let game_status = document.getElementById('game_status');
    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        gaming = true;
        if(sound_playing){
            heartbeat.currentTime = 0;
            heartbeat.play();
        }
        game_status.textContent = "Click to continue.";
    });
    controls.addEventListener('unlock', () => {
        if(gaming){
            instructions.style.display = '';
        }
        gaming = false;
        if(sound_playing){
            heartbeat.pause();
        }
    });
}

document.addEventListener('keydown', (event) => {
    pressed_keys.add(event.key.toLowerCase());
    if(event.key.toLowerCase() == 'tab' && gaming){
        event.preventDefault();
        small_map.style.display = '';
        moving_lock = true;
    }
    if(event.key.toLowerCase() == 'escape' && !gaming){
        event.preventDefault();
        window.location.replace("/");
    }
});

document.addEventListener('keyup', (event) => {
    pressed_keys.delete(event.key.toLowerCase());
    if(event.key.toLowerCase() == 'tab'){
        small_map.style.display = 'none';
        moving_lock = false;
    }
});


function add_bean_group(bean_group){
    scene.add(bean_group);
    total_beans = n_beans = 0;
    for (let bean of bean_group.children) {
        bean.geometry.computeBoundingBox();
        bean.updateMatrixWorld();
        bean.geometry.boundingBox.applyMatrix4(bean.matrixWorld);
        // const bean_box = new THREE.Box3Helper(bean.geometry.boundingBox, 0xff0000);
        // scene.add(bean_box);
        total_beans += 1;
    }
}


function player_collide(step_dir, check) {
    const camera_pos = controls.object.position;
    let player_box_x = new THREE.Box3();
    player_box_x.makeEmpty();
    player_box_x.min.copy(camera_pos).sub(player_size).add(new THREE.Vector3(step_dir.x, 0, 0));
    player_box_x.max.copy(camera_pos).add(player_size).add(new THREE.Vector3(step_dir.x, 0, 0));
    // scene.add(new THREE.Box3Helper(player_box_x, 0xffff00));

    let player_box_z = new THREE.Box3();
    player_box_z.makeEmpty();
    player_box_z.min.copy(camera_pos).sub(player_size).add(new THREE.Vector3(0, 0, step_dir.z));
    player_box_z.max.copy(camera_pos).add(player_size).add(new THREE.Vector3(0, 0, step_dir.z));
    // scene.add(new THREE.Box3Helper(player_box_z, 0x00ffff));

    // Walls
    let x_collide = false;
    let z_collide = false;
    for (let wall of maze.mesh.children) {
        if (player_box_x.intersectsBox(wall.geometry.boundingBox)) {
            x_collide = true;
        }
        if (player_box_z.intersectsBox(wall.geometry.boundingBox)) {
            z_collide = true;
        }
    }
    if(DEBUG){
        x_collide = false;
        z_collide = false;
    }
    if (!check)
        return [x_collide, z_collide];

    x_collide = !x_collide;
    z_collide = !z_collide;

    // Beans
    for (let i = 0; i < maze.bean_group.children.length; i++) {
        let bean = maze.bean_group.children[i];
        if (player_box_x.intersectsBox(bean.geometry.boundingBox)) {
            remove_bean(i);
            maze.bean_group.remove(bean);
            play_coin_sound();
            n_beans += 1;

            if(!HARD_MODE || (HARD_MODE && stage == 1)){
                document.getElementById('Score').textContent = `Score: ${n_beans} / ${total_beans}`;
                if (LIGHTOUT) {
                    flashlight.angle = MAXANGLE - n_beans / total_beans * (MAXANGLE - MINANGLE);
                    flashlight.intensity = MAXINTENSITY - n_beans / total_beans * (MAXINTENSITY - MININTENSITY);
                }
                if (n_beans == total_beans) {
                    if(!HARD_MODE){
                        game_end(true);
                    }
                    else{
                        stage = 2;
                        change2stage2();
                    }
                }
            }
            else if(stage == 2){
                document.getElementById('Score').textContent = `Big Beans: ${n_beans} / ${total_beans}`;

                if(n_beans == total_beans){
                    game_end(true);
                }
                else{
                    energy = MAXENERGY;
                    gen_black_holes(maze, 5);
                    console.log("more black holes generated");
                }
            }

            if (ENEMY_ACCELERATION){
                if(stage == 2)
                    enemy_step = step * 1.25;
                else if(stage == 1){
                    if (n_beans == Math.floor(total_beans * 9 / 10)){
                        enemy_step = step * 1;
                        show_message_fade("Enemy is getting EVEN FASTER...");
                    }
                    else if (n_beans == Math.floor(total_beans * 3 / 4)){
                        enemy_step = step * 0.8;
                        show_message_fade("Enemy is getting more faster...");
                    }
                    else if (n_beans == Math.floor(total_beans / 2)){
                        enemy_step = step * 0.65;
                        show_message_fade("Enemy is getting faster...");
                    }
                }
            }
            return [x_collide, z_collide];
        }
    }

    // Black Holes
    for (let i = 0; i < maze.black_hole_group.children.length; i++) {
        let black_hole = maze.black_hole_group.children[i]
        if (player_box_x.intersectsBox(black_hole.geometry.boundingBox)) {
            if(MODE_SOUND){
                let sound = new Audio('/sounds/black_hole.mp3');
                sound.currentTime = 0.1;
                sound.play();
            }

            maze.black_hole_group.remove(black_hole);
            let idx = Math.floor(Math.random() * maze.info.beans.length);
            let pos = maze.info.beans[idx];
            pos = boardCord2worldCord(pos[0], pos[1]);
            controls.object.position.set(pos.x, camera_height, pos.z);
        }
    }

    // Portals
    for (let i = 0; i < maze.portals.length; i++) {
        let portal = maze.portal_group.children[i];
        if (player_box_x.intersectsBox(portal.geometry.boundingBox)) {
            const target_id = maze.portals_dir[i][2];
            const target_pos = new THREE.Vector3(
                BLOCK_SIZE * (maze.portals[target_id][0] + maze.portals[target_id][2]) / 2,
                camera_height,
                BLOCK_SIZE * (maze.portals[target_id][1] + maze.portals[target_id][3]) / 2,
            );
            const target_dir = new THREE.Vector3(
                maze.portals_dir[target_id][0],
                0,
                maze.portals_dir[target_id][1],
            );
            target_pos.add(target_dir.clone().multiplyScalar(0.75 * BLOCK_SIZE));
            controls.object.position.set(target_pos.x, camera_height, target_pos.z);
            camera.lookAt(target_pos.add(target_dir));
            return [x_collide, z_collide];
        }
    }
    return [x_collide, z_collide];
}

function change2stage2(){
    gen_big_beans(maze);
    gen_big_beans_on_map();
    add_bean_group(maze.bean_group);
    gen_black_holes(maze, 10);
    console.log("black holes generated");
    console.log(maze.black_hole_group);
    scene.add(maze.black_hole_group);
    document.getElementById('Score').textContent = `Big Beans: ${n_beans} / ${total_beans}`;
    let color = new THREE.Color(0xff0000);
    for(let wall of maze.mesh.children){
        wall.material.color.set(color);
    }
    let floor_color = new THREE.Color(0x8c271e);
    floor.material.color.set(floor_color);
    flashlight.color.set(0xffa0a0);
    show_message_fade("Did you think you can beat us? TAKE THIS!");
}

function movePlayer(collision, camera_dir, step_dir) {
    if (collision[0] && collision[1])
        return;
    if (collision[0])
        step_dir.setX(0);
    if (collision[1])
        step_dir.setZ(0);
    let front_dir = step_dir.clone().projectOnVector(camera_dir);
    let camera_normal = camera_dir.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0), 3 * Math.PI / 2
    ).normalize();
    let right_dir = step_dir.clone().projectOnVector(camera_normal);
    let front_len = front_dir.dot(camera_dir);
    let right_len = right_dir.dot(camera_normal);
    controls.moveForward(front_len);
    controls.moveRight(right_len);
}

function play_coin_sound(){
    if (!MODE_SOUND)
        return
    const sound = new Audio('/sounds/coin.mp3');
    sound.volume = 0.05;
    sound.play();
}

function updatePosition(deltaTime) {
    let camera_dir = new THREE.Vector3(0, 0, 0);
    controls.getDirection(camera_dir);
    camera_dir.setY(0);
    camera_dir.normalize();

    let accelerate = false;
    let delta = step * deltaTime;
    if(pressed_keys.has('shift') && energy > 0){
        delta *= 2;
        accelerate = true;
    }
    else if(pressed_keys.has('capslock')){
        delta /= 2;
        energy += 45 * deltaTime;
        energy = (energy > MAXENERGY)? MAXENERGY : energy;
    }

    let move_front = false;
    let step_dir = camera_dir.clone().multiplyScalar(delta);
    let final_dir = new THREE.Vector3(0, 0, 0);
    if (pressed_keys.has('w')) {
        step_dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0);
        move_front = true;
    }
    else if (pressed_keys.has('s')) {
        step_dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        move_front = true;
    }
    if (move_front) {
        final_dir.add(step_dir);
        // movePlayer(player_collide(step_dir, false), camera_dir, step_dir.clone());
        // movePlayer(player_collide(new THREE.Vector3(0, 0, 0), true), camera_dir, step_dir.clone().multiplyScalar(-1));
        // if (accelerate)
        //     energy -= 60 * deltaTime;
    }

    let move_right = false;
    if ((pressed_keys.has('d') && !pressed_keys.has('s'))
    || (pressed_keys.has('a') && pressed_keys.has('s'))) {
        step_dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), 3 * Math.PI / 2);
        move_right = true;
    }
    else if ((pressed_keys.has('a') && !pressed_keys.has('s'))
    || (pressed_keys.has('d') && pressed_keys.has('s'))) {
        step_dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        move_right = true;
    }
    if (move_right) {
        final_dir.add(step_dir);
    }
    if (move_front || move_right) {
        final_dir.normalize().multiplyScalar(delta);
        movePlayer(player_collide(final_dir, false), camera_dir, final_dir.clone());
        movePlayer(player_collide(new THREE.Vector3(0, 0, 0), true), camera_dir, final_dir.clone().multiplyScalar(-1));
        // movePlayer(player_collide(step_dir, false), camera_dir, step_dir.clone());
        // movePlayer(player_collide(new THREE.Vector3(0, 0, 0), true), camera_dir, step_dir.clone().multiplyScalar(-1));
        if (accelerate)
            energy -= 60 * deltaTime;
    }
}

function isMeshVisible(mesh) {
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4();

    let camera_copy = camera.clone();
    camera_copy.fov = flashlight.angle / Math.PI * 180 * 2 + 20;
    camera_copy.aspect = 1;

    camera_copy.updateMatrixWorld();
    camera_copy.updateProjectionMatrix();

    matrix.multiplyMatrices(camera_copy.projectionMatrix, camera_copy.matrixWorldInverse);
    frustum.setFromProjectionMatrix(matrix);

    return frustum.intersectsObject(mesh);
}

function updateEnemiesPosition(deltaTime) {
    for (let enemy of maze.enemies){
        if(RED_LIGHT_GREEN_LIGHT && isMeshVisible(enemy.mesh))
            continue;
        enemy.move((enemy_step * deltaTime > 1)? 1 : enemy_step * deltaTime);
    }
    const camera_pos = controls.object.position;
    let player_box = new THREE.Box3();
    player_box.makeEmpty();
    player_box.min.copy(camera_pos).sub(player_size);
    player_box.max.copy(camera_pos).add(player_size);

    // Enemies collision
    for (let i = 0; i < maze.enemy_group.children.length; i++) {
        let enemy = maze.enemy_group.children[i];
        enemy.geometry.computeBoundingBox();
        enemy.updateMatrixWorld();
        enemy.geometry.boundingBox.applyMatrix4(enemy.matrixWorld);
        // const enemy_box = new THREE.Box3Helper(enemy.geometry.boundingBox, 0xff00ff);
        // scene.add(enemy_box);

        if (player_box.intersectsBox(enemy.geometry.boundingBox)) {
            if(!DEBUG){
                camera.lookAt(enemy.position);
                game_end(false);
            }
        }
        for (let j = 0; j < maze.portals.length; j++) {
            let portal = maze.portal_group.children[j];
            if (enemy.geometry.boundingBox.intersectsBox(portal.geometry.boundingBox)) {
                const target_id = maze.portals_dir[j][2];
                const target_pos = new THREE.Vector3(
                    BLOCK_SIZE * (maze.portals[target_id][0] + maze.portals[target_id][2]) / 2,
                    enemy_height,
                    BLOCK_SIZE * (maze.portals[target_id][1] + maze.portals[target_id][3]) / 2,
                );
                const target_dir = new THREE.Vector3(
                    maze.portals_dir[target_id][0],
                    0,
                    maze.portals_dir[target_id][1],
                );
                target_pos.add(target_dir.clone().multiplyScalar(0.75 * BLOCK_SIZE));
                maze.enemies[i].set_pos(target_pos);
                calculate_target(maze.enemies[i]);
            }
        }
    }
}

function updateHeartbeatSound(){
    if (!MODE_SOUND)
        return;
    let player_pos = controls.object.position;
    let min_dis = 1000;
    for(let enemy of maze.enemies){
        let enemy_pos = enemy.mesh.position;
        let distance = player_pos.distanceTo(enemy_pos);
        min_dis = Math.min(min_dis, distance);
    }

    if(min_dis < SOUND_RADIUS){
        if(min_dis < SOUND_RADIUS * 0.3){
            heartbeat.playbackRate = 1.6;
            heartbeat.volume = 1;
        }
        else if(min_dis < SOUND_RADIUS * 0.6){
            heartbeat.playbackRate = 1.3;
            heartbeat.volume = 0.75;
        }
        else{
            heartbeat.playbackRate = 1;
            heartbeat.volume = 0.5;
        }
        if(!sound_playing){
            heartbeat.currentTime = 0;
            heartbeat.play();
            sound_playing = true;
        }
    }
    else{
        if(sound_playing){
            heartbeat.pause();
            sound_playing = false;
        }
    }
}

function game_end(success){
    gaming = false;
    if(sound_playing){
        heartbeat.pause();
        sound_playing = false;
    }
    controls.unlock();
    
    if(LIFE == 1)
        document.getElementById('butt2').style.display = 'none';

    if(success){
        if (MODE_SOUND) {
            const sound = new Audio('/sounds/pac_man_victory.mp3');
            sound.volume = 0.05;
            sound.play();
        }
        document.getElementById('game_complete').style.display = 'flex';
    }
    else{
        if (MODE_SOUND) {
            const sound = new Audio('/sounds/pac_man_death.mp3');
            sound.volume = 0.05;
            sound.play();
        }
        document.getElementById('game_over').style.display = 'flex';
        document.getElementById('remain').textContent = LIFE - 1;
    }
}

function revive(){
    if(LIFE <= 1) return;
    LIFE--;

    document.getElementById('game_over').style.display = 'none';
    moved_distance = 0;
    moved_block = 0;
    energy = MAXENERGY;
    for(let enemy of maze.enemies)
        enemy.reset();
    let init_pos = maze.player_init_pos;
    init_pos = boardCord2worldCord(init_pos[0], init_pos[1]);
    camera.position.set(init_pos.x, camera_height, init_pos.z);
    camera.lookAt(new THREE.Vector3(init_pos.x + 1, camera_height, init_pos.z));
    instructions.style.display = '';
}

var moved_distance = 0;
var moved_block = 0;
let lastTime = 0
function animate(currentTime) {
    if (!lastTime) lastTime = currentTime;

    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.03);
    lastTime = currentTime;
    //console.log(deltaTime);

    if (gaming) {
        if(!moving_lock)
            updatePosition(deltaTime);

        //update enemies' target everytime they move a block
        if(moved_distance == 0){
            for(let enemy of maze.enemies){
                calculate_target(enemy, moved_block);
            }
        }

        //console.log("Maze enemies", maze.enemies);
        updateEnemiesPosition(deltaTime);
        moved_distance = moved_distance + enemy_step * deltaTime;
        if(moved_distance >= BLOCK_SIZE){
            moved_block++;
            moved_distance = 0;
        }

        updateSmallMap();
        updateEnergyBar();
        updateHeartbeatSound();
    }

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
requestAnimationFrame(animate);


function show_message_fade(message){
    let el = document.getElementById('inGameMessage');
    el.textContent = message;

    el.style.transition = 'none';
    el.style.opacity = 1;
    setTimeout(() => {
        el.style.transition = 'opacity 1.5s ease-out';
        el.style.opacity = 0;
  }, 2500);
}


function onWindowResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

window.addEventListener('resize', onWindowResize);
onWindowResize();
