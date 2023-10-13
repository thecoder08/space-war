var net = require('net');
var scene = new THREE.Scene();
scene.background = new THREE.CubeTextureLoader().setPath('textures/skybox/').load(['right.png', 'left.png', 'top.png', 'bottom.png', 'front.png', 'back.png']);
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.z = -100;
camera.position.y = 0;
scene.add(camera);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
var loader = new THREE.OBJLoader();
var controls = new THREE.OrbitControls(camera, document.body);
controls.enablePan = false;
var aDown = false;
var dDown = false;
var wDown = false;
var sDown = false;
var shiftDown = false;
var spaceDown = false;
var t = 0;
var gameState = {};
var oldGameState = {};
var socket = net.connect({port:12345,host:'localhost'});
socket.on('error', function(err) {
    console.error(err);
});
socket.on('data', function(data) {
    t = 0;
    try {
    oldGameState = structuredClone(gameState);
    gameState = JSON.parse(data);
    ship.position.set(gameState.planet.position.x, gameState.planet.position.y, gameState.planet.position.z);
    ship.rotation.set(gameState.planet.rotation.x, gameState.planet.rotation.y, gameState.planet.rotation.z);
    }
    catch (err) {
        console.error(err);
    }
});
socket.on('connect', function() {
document.body.onkeydown = function(event) {
    if (event.code == 'F11') {
        nw.Window.get().toggleFullscreen();
    }
    if (event.code == 'KeyA') {
        aDown = true;
    }
    if (event.code == 'KeyD') {
        dDown = true;
    }
    if (event.code == 'KeyW') {
        wDown = true;
    }
    if (event.code == 'KeyS') {
        sDown = true;
    }
    if (event.code == 'ShiftLeft') {
        shiftDown = true;
    }
    if (event.code == 'Space') {
        spaceDown = true;
    }
    /*if (!event.repeat) {
        socket.write(JSON.stringify({command: 'updateControls', entity: name, controls: {forward: wDown, back: sDown, left: aDown, right: dDown}}));
    }*/
}
document.body.onkeyup = function(event) {
    if (event.code == 'KeyA') {
        aDown = false;
    }
    if (event.code == 'KeyD') {
        dDown = false;
    }
    if (event.code == 'KeyW') {
        wDown = false;
    }
    if (event.code == 'KeyS') {
        sDown = false;
    }
    if (event.code == 'ShiftLeft') {
        shiftDown = false;
    }
    if (event.code == 'Space') {
        spaceDown = false;
    }
    /*if (!event.repeat) {
        socket.write(JSON.stringify({command: 'updateControls', entity: name, controls: {forward: wDown, back: sDown, left: aDown, right: dDown}}));
    }*/
}
});

window.onresize = function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

var ambientLight = new THREE.AmbientLight(0xaaaaaa);
scene.add(ambientLight);
var pointLight = new THREE.DirectionalLight(0xffffff);
pointLight.position.set(0, 50, 0);
pointLight.castShadow = true;
scene.add(pointLight);

var shipGeometry = new THREE.SphereGeometry(10, 32, 16);
var shipMaterial = new THREE.MeshPhongMaterial({color:0x0000ff});
var ship = new THREE.Mesh(shipGeometry, shipMaterial);
scene.add(ship);

var otherShips = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshPhongMaterial({color: 0xff0000}), 100);
scene.add(otherShips);

function loop() {
    requestAnimationFrame(loop);
    controls.maxDistance = Infinity;
    var shipCount = 0;
    for (var entity in gameState) {
        if (entity == 'planet') {
            continue;
        }
        var dummy = new THREE.Object3D();
        var oldPosition = new THREE.Vector3(oldGameState[entity].position.x, oldGameState[entity].position.y, oldGameState[entity].position.z);
        var oldRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(oldGameState[entity].rotation.x, oldGameState[entity].rotation.y, oldGameState[entity].rotation.z));
        var newPosition = new THREE.Vector3(gameState[entity].position.x, gameState[entity].position.y, gameState[entity].position.z);
        var newRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(gameState[entity].rotation.x, gameState[entity].rotation.y, gameState[entity].rotation.z));
        dummy.position.lerpVectors(oldPosition, newPosition, t);
        dummy.quaternion.slerpQuaternions(oldRotation, newRotation, t);
        if (entity == 'test') {
            var oldCamPosition = new THREE.Vector3();
            oldCamPosition.lerpVectors(oldPosition, newPosition, t - 0.16);
            var newCamPosition = new THREE.Vector3();
            newCamPosition.lerpVectors(oldPosition, newPosition, t);
            camera.position.add(newCamPosition.sub(oldCamPosition));
            controls.target = dummy.position;
        }
        dummy.updateMatrix();
        otherShips.setMatrixAt(shipCount, dummy.matrix);
        shipCount++;
    }
    otherShips.instanceMatrix.needsUpdate = true;
    otherShips.count = shipCount;
    t += 0.16;
    controls.update();
    renderer.render(scene, camera);
}
loop();