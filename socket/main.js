/**
 * Socket Server
 */
const redis = require('socket.io-redis');
const os = require('os');
const _ = require('lodash');

exports.createServer = function(io){

    io.adapter(redis({host:global.appconfig.redisInfo.address, port:global.appconfig.redisInfo.port}));
    const monNSP = io.of('/mon-redis');
   
    monNSP.use(commonMiddleware);
    monNSP.on('connect',(socket) => { 
        connectHandler(socket);      
        socket.on('disconnect', commonDisconnectHandler(socket));   
        socket.on('getAliveNode', getAliveNode(socket)); // get alive node lists
        socket.on('getConnected', getConnected(socket)); // request.nodeName, request.type
        socket.on('getConnectedAll', getConnectedAll(socket));

    }) 
    
    monNSP.adapter.customHook = undefinedReply;
    function undefinedReply(request,cb){
        cb();
    }
}; 

function getAliveNode(socket){
    return function(data = {}){
        if(typeof(data) != 'object'){
            socket.emit('msg', 'need request object')
        } else {
            const request = {};
            request.type = 'getAliveNode';
            redisRequester(socket, request);
        }
    }
}

function getConnected(socket){
    return function(data = {}){
        if(typeof(data) != 'object' || data.nodeName){
            socket.emit('msg', 'need request object')
        } else {
            const request = {};
            request.type = 'getConnected';            
            request.nodeName = data.nodeName;
            redisRequester(socket, request);
        }
    }
}

function getConnectedAll(socket){
    return function(data = {}){
        if(typeof(data) != 'object'){
            socket.emit('msg', 'need request object')
        } else {
            const request = {};
            request.type = 'getConnectedAll';            
            redisRequester(socket, request, sumBynsp);
        }

        function sumBynsp(results){
            console.log(results);
        }
    }
}


function redisRequester(socket, request, cb){
    socket.nsp.adapter.customRequest(request, (err,replies) => {
            // socket.io-redis : like other request type, need to filter undefined result
            // implement..
            const filtered = replies.filter(reply => reply !== undefined)
            logger.info(filtered);
            if(typeof(cb) !== 'function'){
                socket.emit('msg', filtered);
            }else{
                cb(filtered);
            }
    })
}



function getInfo(socket){
    return {
        namespace : socket.nsp.name,
        alias : socket.alias ? socket.alias : 'guest' ,
        servername : socket.servername ? socket.servername : global.hostname ,
        address : socket.handshake.address
    }
}

function commonMiddleware(socket,next) {
    const sockInfo = getInfo(socket);
    socket.servername = sockInfo.servername;
    global.logger.debug(`[${sockInfo.namespace}][${sockInfo.alias}][${sockInfo.servername}][${sockInfo.address}] : middleware passing`)
    next()
}

function commonDisconnectHandler(socket){
    return function(reason){
        const sockInfo = getInfo(socket);
        const message = `[${sockInfo.namespace}][${sockInfo.alias}][${sockInfo.servername}][${sockInfo.address}] : client disconnected : reason ${reason}`
        global.logger.debug(message);
        //cannot broadcast after disconnect event
        socket.nsp.emit('msg', message);
    }
}

function connectHandler(socket){
    const sockInfo = getInfo(socket);
    const message = `[${sockInfo.namespace}][${sockInfo.alias}][${sockInfo.servername}][${sockInfo.address}] : new client connected`;
    global.logger.debug(message);
    socket.nsp.emit('msg', message); 
    socket.emit('notify-your-socketid', socket.id); 
}
/*

function notifyNspSockets(socket){
    return function(){
        socket.nsp.adapter.clients((err, clients) => {
            if(err) global.logger.error(err);
            global.logger.debug(clients);
            socket.emit('msg', clients);
        })
    }
}

function notifyRoomSockets(socket){
    return function(roomNM){
        socket.nsp.adapter.clients([roomNM], (err,clients) => {
            if(err) global.logger.error(err);
            global.logger.debug(clients)
            socket.emit('msg', clients);
        })
    }
}

function notifySetAlias(socket){
    return function(alias){
        const sockInfo = getInfo(socket);
        const message = `[${sockInfo.namespace}][${sockInfo.alias}][${sockInfo.servername}][${sockInfo.address}] : set alias`;
        global.logger.debug(message);
        socket.nsp.emit('msg', message);  
    }    
}

function joinHandler(socket){
    return function(roomNM){
        const sockInfo = getInfo(socket);
        socket.join(roomNM,() => {
            const message = `[${sockInfo.namespace}][${sockInfo.alias}][${sockInfo.servername}][${sockInfo.address}][${roomNM}] : join room`;
            global.logger.debug(message);
            socket.nsp.emit('msg', message);  
        })        
    }
}

function leaveHandler(socket){
    return function(roomNM){
        const sockInfo = getInfo(socket);
        socket.leave(roomNM,() => {
            const message = `[${sockInfo.namespace}][${sockInfo.alias}][${sockInfo.servername}][${sockInfo.address}][${roomNM}] : leave room`;
            global.logger.debug(message);
            socket.nsp.emit('msg', message);  
        })        
    }
}

function msgHandler(socket){
    return function(data){
        global.logger.info(data);
        const {message, sendRange, target} = data;
        const sockInfo = getInfo(socket);
        const taggedMsg = `[${sockInfo.namespace}][${sockInfo.alias}][${sockInfo.servername}][${sockInfo.address}][${sendRange}][${target}] : message ${message}`;
        const action = {
            'nsp' : nspSend(socket),
            'room' : roomSend(socket),
            'socket' : socketSend(socket)
        }
        action[sendRange](taggedMsg, target);
    }
}

function nspSend(socket){
    return function(taggedMsg, target){
         socket.nsp.emit('msg', taggedMsg);
    }
}

function roomSend(socket){
    return function(taggedMsg, target){
        socket.to(target).emit('msg', taggedMsg);
    }
}

function socketSend(socket){
    return function(taggedMsg, target){
        socket.to(target).emit('msg', taggedMsg);
    }
}
*/
