import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { enemy_height, LOAD_ENEMY_MODEL } from './main.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

export const BLOCK_SIZE = 11;
export const BLOCK_MARGIN = 1;
export const BLOCK_HEIGHT = 7;

export class Maze{
    constructor(mazeInfo) {
        this.info = mazeInfo;
        this.size = mazeInfo.size;
        this.beans = mazeInfo.beans;
        this.big_beans = mazeInfo.big_beans;
        this.player_init_pos = mazeInfo.player_init_pos;;
        this.enemy_init_pos = mazeInfo.enemy_init_pos;
        this.portals = mazeInfo.portals;
        this.portals_dir = mazeInfo.portals_dir;
        this.enemy_type = mazeInfo.enemy_type;
        this.enemy_initial_target = mazeInfo.enemy_initial_target;
        this.maze_map = build_maze_map(mazeInfo);
        this.mesh = new THREE.Group();
        this.material = new THREE.MeshPhongMaterial({
            color: 0x0000E3
        })
        this.bean_group = new THREE.Group();
        this.portal_group = new THREE.Group();
        this.enemies = []
        this.enemy_group = new THREE.Group();
        this.black_hole_group = new THREE.Group();
    }
}

let maze;

function build_maze_map(mazeInfo){
    let walls = mazeInfo.pos;
    let [rows, cols] = mazeInfo.size;

    //up, right, down, left
    let map = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0b1111));

    for(let wall of walls){
        let start = new THREE.Vector2(wall[0], wall[1]);
        let end = new THREE.Vector2(wall[2], wall[3]);
        if (start.y == end.y){
            if(start.x > end.x){
                let tmp = start.x;
                start.x = end.x;
                end.x = tmp;
            }

            for(let i = start.x; i < end.x; i++){
                if(start.y != 0){
                    map[i][start.y-1] &= 0b1101;
                }
                if(start.y != cols){
                    map[i][start.y] &= 0b0111;
                }
            }
        }
        else{
            if(start.y > end.y){
                let tmp = start.y;
                start.y = end.y;
                end.y = tmp;
            }

            for(let i = start.y; i < end.y; i++){
                if(start.x != 0){
                    map[start.x-1][i] &= 0b1011;
                }
                if(start.x != rows){
                    map[start.x][i] &= 0b1110;
                }
            }
        }
    }

    for(let door of mazeInfo.enemy_room_door){
        let start = new THREE.Vector2(door[0], door[1]);
        let end = new THREE.Vector2(door[2], door[3]);

        if (start.y == end.y){
            if(start.x > end.x){
                let tmp = start.x;
                start.x = end.x;
                end.x = tmp;
            }

            for(let i = start.x; i < end.x; i++){
                if(door[4] == 0b0111){
                    map[i][start.y] &= 0b0111;
                }
                else if(door[4] == 0b1101){
                    map[i][start.y-1] &= 0b1101;
                }
            }
        }
        else{
            if(start.y > end.y){
                let tmp = start.y;
                start.y = end.y;
                end.y = tmp;
            }

            for(let i = start.y; i < end.y; i++){
                if(door[4] == 0b1011){
                    map[start.x][i] &= 0b1011;
                }
                else if(door[4] == 0b1110){
                    map[start.x-1][i] &= 0b1110;
                }
            }
        }
    }

    return map;
}


export async function gen_maze(mazeInfo) {
    maze = new Maze(mazeInfo);

    // console.log(maze.maze_map);

    for (let wall of mazeInfo.pos) {
        let start = new THREE.Vector2(wall[0], wall[1]);
        let end = new THREE.Vector2(wall[2], wall[3]);

        let width, height, depth;
        if (start.y == end.y) {
            width = Math.abs(start.x - end.x) * BLOCK_SIZE + 2 * BLOCK_MARGIN;
            depth = 2 * BLOCK_MARGIN;
        } else {
            width = 2 * BLOCK_MARGIN;
            depth = Math.abs(start.y - end.y) * BLOCK_SIZE + 2 * BLOCK_MARGIN;
        }
        height = BLOCK_HEIGHT;

        let geo = new THREE.BoxGeometry(width, height, depth);
        let mesh = new THREE.Mesh(geo, maze.material.clone());
        mesh.position.set(
            (start.x + end.x) * BLOCK_SIZE / 2,
            BLOCK_HEIGHT / 2,
            (start.y + end.y) * BLOCK_SIZE / 2
        );
        maze.mesh.add(mesh);
    }

    gen_beans(maze);
    gen_portals(maze);
    if(LOAD_ENEMY_MODEL)
        await gen_enemy_v2(maze);
    else
        gen_enemy(maze)
    return maze;
}

function gen_beans(maze) {
    const bean_size = 1;
    const material = new THREE.MeshPhongMaterial({
        color: 0xFFFF6F
    })

    for (let bean of maze.beans) {
        let geometry = new THREE.BoxGeometry(bean_size, bean_size, bean_size);
        let bean_mesh = new THREE.Mesh(geometry, material.clone());
        let pos = boardCord2worldCord(bean[0], bean[1]);
        bean_mesh.position.set(pos.x, pos.y, pos.z);
        maze.bean_group.add(bean_mesh);
    }
}


export function gen_big_beans(maze) {
    const bean_size = 3;
    const material = new THREE.MeshPhongMaterial({
        color: 0x84dcc6
    })


    for (let bean of maze.big_beans) {
        let geometry = new THREE.BoxGeometry(bean_size, bean_size, bean_size);
        let bean_mesh = new THREE.Mesh(geometry, material.clone());
        let pos = boardCord2worldCord(bean[0], bean[1]);
        bean_mesh.position.set(pos.x, pos.y, pos.z);
        maze.bean_group.add(bean_mesh);
    }
}

export function gen_black_holes(maze, n_black_hole) {
    const radius = 2;
    const geometry = new THREE.SphereGeometry(radius);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });

    for (let i = 0; i < n_black_hole; i++){
        let mesh = new THREE.Mesh(geometry.clone(), material.clone());
        let idx = Math.floor(Math.random() * maze.info.beans.length);
        let pos = maze.info.beans[idx];
        pos = boardCord2worldCord(pos[0], pos[1]);
        mesh.position.set(pos.x, 2, pos.z);
        mesh.geometry.computeBoundingBox();
        mesh.updateMatrixWorld();
        mesh.geometry.boundingBox.applyMatrix4(mesh.matrixWorld);
        maze.black_hole_group.add(mesh);
    }
}


function gen_portals(maze){
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('/3dpacman/images/MCportal.jpg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 4);

    const portalMaterial = new THREE.MeshStandardMaterial({map: texture, side: THREE.DoubleSide, color: 0xFFFFFF});

    for (let portal of maze.portals) {
        let start = new THREE.Vector2(portal[0], portal[1]);
        let end = new THREE.Vector2(portal[2], portal[3]);

        let width, height;
        if (start.y == end.y){
            width = Math.abs(start.x - end.x) * BLOCK_SIZE;
        }
        else{
            width = Math.abs(start.y - end.y) * BLOCK_SIZE;
        }
        height = BLOCK_HEIGHT;

        let geo = new THREE.PlaneGeometry(width, height);
        let mesh = new THREE.Mesh(geo, portalMaterial.clone());
        mesh.rotation.set(0, Math.PI / 2, 0, 'XYZ');
        mesh.position.set(
            (start.x + end.x) * BLOCK_SIZE / 2,
            BLOCK_HEIGHT / 2,
            (start.y + end.y) * BLOCK_SIZE / 2
        );

        maze.portal_group.add(mesh);
    }
}

function gen_single_enemy(i) {
    const filename = [
        "red",
        "pink",
        "blue",
        "orange"
    ]

    return new Promise((resolve, reject) => {
        const manager = new THREE.LoadingManager();
        const mtlLoader = new MTLLoader(manager);
        let prev_value = 0;
        mtlLoader.setPath('/3dpacman/models/');
        mtlLoader.load(
            `${filename[i]}.mtl`,
            /* Called when finished */
            function (material) {
                material.preload();
                const loader = new OBJLoader(manager);
                loader.setPath('/3dpacman/models/');
                loader.setMaterials(material);
                loader.load(
                    `${filename[i]}.obj`,
                    /* Called when finished */
                    function (object) {
                        let mesh = object.children[0];
                        let enemy_pos = maze.enemy_init_pos[i];
                        let pos = boardCord2worldCord(enemy_pos[0], enemy_pos[1]);
                        pos.y = enemy_height;
                        mesh.position.copy(pos);
                        mesh.geometry.center();
                        let enemy_pos_vector = new THREE.Vector2(enemy_pos[0], enemy_pos[1]);
                        let init_target = new THREE.Vector2(maze.enemy_initial_target[0], maze.enemy_initial_target[1])
                        let enemy = new Enemy(maze.enemy_type[i], mesh, enemy_pos_vector, init_target);
                        maze.enemies.push(enemy);
                        maze.enemy_group.add(enemy.mesh);
                        resolve(object);
                    },
                    /* Called when loading */
                    function (xhr) {
                        let cur_value = Math.round(xhr.loaded / xhr.total * 100);
                        let value = document.getElementById("loading-progress").value;
                        value += cur_value - prev_value;
                        prev_value = cur_value;
                        document.getElementById("loading-progress").value = `${value}`;
                    },
                    /* Called when error */
                    function (error) {
                        console.log("Error when loading enemy", i);
                        console.log("error: ", error);
                        reject(error);
                    }
                )
            },
            /* Called when loading */
            function (xhr) {
                console.log("material", (xhr.loaded / xhr.total * 100) + '% loaded');
                document.getElementById("loadingBar")
            },
            /* Called when error */
            function (error) {
                console.log("Error when loading enemy material", i);
                console.log("error: ", error);
                reject(error);
            }
        )
    });
}

async function gen_enemy_v2(maze) {
    for (let i = 0; i < maze.enemy_init_pos.length; i++) {
        try {
            let enemy = await gen_single_enemy(i);
        }
        catch (err) {
            console.log("Failed loading enemy", i, err);
        }
    }
}

function gen_enemy(maze){
    const color = [0xff0000, 0xffb8ff, 0x00ffff, 0xffb852];

    let i = 0;
    for(let enemy_pos of maze.enemy_init_pos){

        let geo = new THREE.BoxGeometry(BLOCK_SIZE/2, BLOCK_SIZE/2, BLOCK_SIZE/2);
        //geo.computeBoundsTree();
        let mat = new THREE.MeshPhongMaterial({ color: color[i] });
        let mesh = new THREE.Mesh(geo, mat.clone());
        let pos = boardCord2worldCord(enemy_pos[0], enemy_pos[1]);
        mesh.position.copy(pos);

        let enemy_pos_vector = new THREE.Vector2(enemy_pos[0], enemy_pos[1]);
        let init_target = new THREE.Vector2(maze.enemy_initial_target[0], maze.enemy_initial_target[1])

        let enemy = new Enemy(maze.enemy_type[i], mesh, enemy_pos_vector, init_target);
        maze.enemies.push(enemy);
        maze.enemy_group.add(enemy.mesh);
        i++;

    }
}

export function boardCord2worldCord(x, y) {
    let worldCord = new THREE.Vector3(x * BLOCK_SIZE + BLOCK_SIZE / 2, 1, y * BLOCK_SIZE + BLOCK_SIZE / 2);
    return worldCord;
}
