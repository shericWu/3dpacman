import * as THREE from 'three';
import { BLOCK_SIZE, boardCord2worldCord } from './gen_maze.js';
import { maze, controls, enemy_height, LOAD_ENEMY_MODEL } from './main.js';

const scatter_time = 6

const UP =    0b1000;
const RIGHT = 0b0100;
const DOWN =  0b0010;
const LEFT =  0b0001;

const dir_pool_2 = [UP, RIGHT, DOWN, LEFT];

const DIR = {
    [UP]:    new THREE.Vector2(0, -1),
    [RIGHT]: new THREE.Vector2(1, 0),
    [DOWN]:  new THREE.Vector2(0, 1),
    [LEFT]:  new THREE.Vector2(-1, 0)
}

function get_behind_dir(dir){
    return ((dir & 0b0011) << 2) | (dir >> 2);
}


export class Enemy{
    constructor(type, mesh, pos, init_target) {
        this.type = type;
        this.mesh = mesh;
        this.init_pos = pos.clone();
        this.pos = pos.clone();
        this.init_target = init_target.clone();
        this.target = init_target.clone();
        this.face_dir = UP;
    }

    // Under world axis
    move(step) {
        let dir = DIR[this.face_dir];
        this.mesh.position.addScaledVector(new THREE.Vector3(dir.x, 0, dir.y), step);
    }

    set_pos(pos) {
        this.mesh.position.copy(pos);
    }

    reset() {
        this.mesh.position.copy(boardCord2worldCord(this.init_pos.x, this.init_pos.y));
        this.mesh.rotateY(dir_pool_2.indexOf(this.face_dir) * Math.PI / 2);
        this.pos.copy(this.init_pos);
        if(LOAD_ENEMY_MODEL)
            this.mesh.position.y = enemy_height;
        this.target.copy(this.init_target);
        this.face_dir = UP;
    }
}

//under mapAxis
export function calculate_target(enemy, moved_block){
    enemy.pos = new THREE.Vector2(Math.floor(enemy.mesh.position.x / BLOCK_SIZE), Math.floor(enemy.mesh.position.z / BLOCK_SIZE));
    enemy.mesh.position.x = enemy.pos.x * BLOCK_SIZE + BLOCK_SIZE / 2;
    enemy.mesh.position.z = enemy.pos.y * BLOCK_SIZE + BLOCK_SIZE / 2;


    if (moved_block < scatter_time){
        updateFaceDir(enemy);
        return;
    }

    if(enemy.type == 0){
        enemy.target = find_target_type_0(enemy);
    }

    else if(enemy.type == 1){
        enemy.target = find_target_type_1(enemy);
    }

    else if(enemy.type == 2){
        let flag = 0;
        for(let e of maze.enemies){
            if(e.type == 0){
                flag = 1;
                enemy.target = find_target_type_2(e, enemy);
                break;
            }
        }
        if(flag == 0) enemy.target = find_target_type_0(enemy);
    }

    else if(enemy.type == 3){
        enemy.target = find_target_type_3(enemy);
    }

    updateFaceDir(enemy);

}

//Blinky
function find_target_type_0 (enemy) {
    const playerPos = controls.object.position;
    return new THREE.Vector2(Math.floor(playerPos.x / BLOCK_SIZE), Math.floor(playerPos.z / BLOCK_SIZE));
}

//Pinky
function find_target_type_1 (emeny) {
    const playerPos = controls.object.position;
    const playerDir = new THREE.Vector3();
    controls.getDirection(playerDir);

    let playerDir_map = new THREE.Vector2(playerDir.x, playerDir.z).normalize();

    let player_at_map = new THREE.Vector2(Math.floor(playerPos.x / BLOCK_SIZE), Math.floor(playerPos.z / BLOCK_SIZE));
    player_at_map.addScaledVector(new THREE.Vector2(playerDir_map.x, playerDir_map.y), 4);

    return new THREE.Vector2(Math.floor(player_at_map.x), Math.floor(player_at_map.y));
}

//Inky
function find_target_type_2 (blinky, enemy) {
    const playerPos = controls.object.position;
    const playerDir = new THREE.Vector3();
    controls.getDirection(playerDir);

    let playerDir_map = new THREE.Vector2(playerDir.x, playerDir.z).normalize();

    let player_at_map = new THREE.Vector2(Math.floor(playerPos.x / BLOCK_SIZE), Math.floor(playerPos.z / BLOCK_SIZE));
    player_at_map.addScaledVector(new THREE.Vector2(playerDir_map.x, playerDir_map.y), 2);
    player_at_map = new THREE.Vector2(Math.floor(player_at_map.x), Math.floor(player_at_map.y));

    let v = blinky.pos.clone();
    player_at_map.sub(v);

    return v.addScaledVector(player_at_map, 2);
}

//Clyde
function find_target_type_3 (enemy) {
    const playerPos = controls.object.position;
    if(enemy.pos.distanceTo(playerPos) >= 8)
        return new THREE.Vector2(Math.floor(playerPos.x / BLOCK_SIZE), Math.floor(playerPos.z / BLOCK_SIZE));

    return new THREE.Vector2(-1, 30);
}


function updateFaceDir(enemy){
    let dir_pool = [UP, RIGHT, DOWN, LEFT];
    let prev_dir_idx = dir_pool_2.indexOf(enemy.face_dir);
    let behind_dir = get_behind_dir(enemy.face_dir);
    dir_pool.splice(dir_pool.indexOf(behind_dir), 1);

    let tile = maze.maze_map[enemy.pos.x][enemy.pos.y];
    let dis_max = 1000;

    for (let dir of dir_pool) {
        if(!(tile & dir))
            continue;

        let neighbor_tile = enemy.pos.clone().add(DIR[dir]);
        if(neighbor_tile.x >= maze.size[0]){
            neighbor_tile.x = 0;
        }
        else if(neighbor_tile.x < 0){
            neighbor_tile.x = maze.size[0]-1;
        }
        if(neighbor_tile.y >= maze.size[1]){
            neighbor_tile.y = 0;
        }
        else if(neighbor_tile.y < 0){
            neighbor_tile.y = maze.size[1]-1;
        }

        let distance = neighbor_tile.distanceTo(enemy.target);
        if (distance < dis_max) {
            dis_max = distance;
            enemy.face_dir = dir;
        }
    }

    let next_dir_idx = dir_pool_2.indexOf(enemy.face_dir);
    enemy.mesh.rotateY((prev_dir_idx - next_dir_idx) * Math.PI / 2);
}
