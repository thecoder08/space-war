var net = require('net');
var clients = [];
var gameState = {
    planet: {force: {x: 0, y: 0, z:0}, acceleration: {x: 0, y: 0, z:0}, velocity: {x: 0, y: 0, z:0}, position: {x: 0, y: 0, z:0}, torque: {x: 0, y: 0, z:0}, angularAcceleration: {x: 0, y: 0, z:0}, angularVelocity: {x: 0, y: 0, z:0}, rotation: {x: 0, y: 0, z:0}, mass: 100},
    test: {force: {x: 0, y: 0, z:0}, acceleration: {x: 0, y: 0, z:0}, velocity: {x: 0, y: 0, z:0.5}, position: {x: 100, y: 0, z:0}, torque: {x: 0, y: 0, z:0}, angularAcceleration: {x: 0, y: 0, z:0}, angularVelocity: {x: 0, y: 0, z:0}, rotation: {x: 0, y: 0, z:0}, mass: 1},
    test2: {force: {x: 0, y: 0, z:0}, acceleration: {x: 0, y: 0, z:0}, velocity: {x: 0, y: -(1/Math.sqrt(2)), z:1/Math.sqrt(2)}, position: {x: -100, y: 0, z:0}, torque: {x: 0, y: 0, z:0}, angularAcceleration: {x: 0, y: 0, z:0}, angularVelocity: {x: 0, y: 0, z:0}, rotation: {x: 0, y: 0, z:0}, mass: 1}
};
var lobbies = {};
net.createServer(function(socket) {
    clients.push(socket);
    socket.on('data', function(data) {
        var request = JSON.parse(data);
        // create a new lobby for players to join, and add the calling player to it.
        if (request.command == 'createLobby') {
            if (!lobbies.hasOwnProperty(request.name)) {
                lobbies[request.name] = {private: request.private, players: {}};
                lobbies[request.name].players[request.position] = clients.indexOf(socket);
                socket.write(JSON.stringify({response: 'lobby', lobby: lobbies[request.name]}));
            }
            else {
                socket.write(JSON.stringify({response: 'error', message: 'There is already a lobby with that name!'}));
            }
        }
        // list public lobbies
        if (request.command == 'listLobbies') {
            var publicLobbies = {};
            for (var lobby in lobbies) {
                if (!lobbies[lobby].private) {
                    publicLobbies[lobby] = lobbies[lobby];
                }
            }
            socket.write(JSON.stringify({response:'lobbies', lobbies: publicLobbies}));
        }
        // join a new player to an existing lobby
        if (request.command == 'joinLobby') {
            if (lobbies.hasOwnProperty(request.name)) {
                if (!lobbies[request.name].players.hasOwnProperty(request.position)) {
                    lobbies[request.name].players[request.position] = clients.indexOf(socket);
                    for (var player in lobbies[request.name].players) {
                        clients[lobbies[request.name].players[player]].write(JSON.stringify({response: 'lobby', lobby: lobbies[request.name]}));
                    }
                }
                else {
                    socket.write(JSON.stringify({response: 'error', message: 'A player has already chosen that position!'}));
                }
            }
            else {
                socket.write(JSON.stringify({response: 'error', message: 'Couldn\'t find a lobby with that name!'}));
            }
        }
        // create a new ship, transfer all players in lobby to ship, close lobby
        if (request.command == 'joinGame') {
            gameState[request.name] = {force: {x: 0, y: 0, z:0}, acceleration: {x: 0, y: 0, z:0}, velocity: {x: 0, y: 0, z:0}, position: {x: 0, y: 0, z:0}, torque: {x: 0, y: 0, z:0}, angularAcceleration: {x: 0, y: 0, z:0}, angularVelocity: {x: 0, y: 0, z:0}, rotation: {x: 0, y: 0, z:0}, mass: 1};
        }
    });
}).listen(12345);

process.stdin.on('data', function(data) {
    setInterval(gameLoop, 1000/60);
});

function gameLoop() {
    for (var entity in gameState) {
        gameState[entity].force.x = 0;
        gameState[entity].force.y = 0;
        gameState[entity].force.z = 0;
        gameState[entity].torque.x = 0;
        gameState[entity].torque.y = 0;
        gameState[entity].torque.z = 0;
        // apply forces here
        if (entity != 'planet') {
            applyGravity(gameState.planet, gameState[entity]);
        }
        gameState[entity].acceleration.x = gameState[entity].force.x / gameState[entity].mass;
        gameState[entity].acceleration.y = gameState[entity].force.y / gameState[entity].mass;
        gameState[entity].acceleration.z = gameState[entity].force.z / gameState[entity].mass;
        gameState[entity].velocity.x += gameState[entity].acceleration.x;
        gameState[entity].velocity.y += gameState[entity].acceleration.y;
        gameState[entity].velocity.z += gameState[entity].acceleration.z;
        gameState[entity].position.x += gameState[entity].velocity.x;
        gameState[entity].position.y += gameState[entity].velocity.y;
        gameState[entity].position.z += gameState[entity].velocity.z;
        gameState[entity].angularAcceleration.x = gameState[entity].torque.x / gameState[entity].mass;
        gameState[entity].angularAcceleration.y = gameState[entity].torque.y / gameState[entity].mass;
        gameState[entity].angularAcceleration.z = gameState[entity].torque.z / gameState[entity].mass;
        gameState[entity].angularVelocity.x += gameState[entity].angularAcceleration.x;
        gameState[entity].angularVelocity.y += gameState[entity].angularAcceleration.y;
        gameState[entity].angularVelocity.z += gameState[entity].angularAcceleration.z;
        gameState[entity].rotation.x += gameState[entity].angularVelocity.x;
        gameState[entity].rotation.y += gameState[entity].angularVelocity.y;
        gameState[entity].rotation.z += gameState[entity].angularVelocity.z;
    }
}

setInterval(function() {
    for (var i = 0; i < clients.length; i++) {
        clients[i].write(JSON.stringify(gameState));
    }
}, 100);

function applyForce(ship, force, position) {
    // torque is the cross product of the force vector and the distance vector
    ship.torque.x += force.y*position.z - force.z*position.y;
    ship.torque.y += force.z*position.x - force.x*position.z;
    ship.torque.z += force.x*position.y - force.y*position.x;
    // force is the sum of all applied forces
    ship.force.x += force.x;
    ship.force.y += force.y;
    ship.force.z += force.z;
}

function getDistance(a, b) {
    return Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y) + (a.z-b.z)*(a.z-b.z));
}

var gravConstant = 1;
function applyGravity(source, destination) {
    var distance = getDistance(source.position, destination.position);
    var gravityForce = (gravConstant * source.mass * destination.mass) / (distance*distance);
    var forceVector = {x: (source.position.x - destination.position.x) / distance * gravityForce, y: (source.position.y - destination.position.y) / distance * gravityForce, z: (source.position.z - destination.position.z) / distance * gravityForce};
    // apply force directly through the CoM
    applyForce(destination, forceVector, {x:0, y:0, z:0});
}