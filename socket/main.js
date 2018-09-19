/**
 * Socket Server
 */
const redis = require('socket.io-redis');
const os = require('os');
const _ = require('lodash');

exports.createServer = function(io){

    io.adapter(redis({host:global.appconfig.redisInfo.address, port:global.appconfig.redisInfo.port}));
    // todo : use variable for namespace ( as key )
    // use '/mon-redis' as communication namespace between socket servers and mon server
    // and use '/mon-redis' namespace as communication nsp between monServer and monitoring browser
    const monNSP = io.of('/mon-redis');
   
    monNSP.use(commonMiddleware);

    monNSP.on('connect',(socket) => {  
        // when new socket server started, connect event fired
        // or when new monitor browser connected
        connectHandler(socket);      
        socket.on('disconnect', commonDisconnectHandler(socket));   
        socket.on('getAliveNode', reqAliveNode(socket)); // get alive node lists
        socket.on('getConnected', reqConnected(socket)); // request.nodeName, request.type
        socket.on('getConnectedAll', reqConnectedAll(socket));
    }) 
    
    // ignore all custom request by undfinedReply
    monNSP.adapter.customHook = undefinedReply;

    function undefinedReply(request,cb){
        // if request.type == eventNotification,
        // this event is from monitored socket node
        if(request.type === 'eventNotification') {
            // event notification from monitored node
            global.logger.info(`received msg from node : ${request.event} : ${request.msg}`)
            monNSP.local.emit('msg', request.msg);
            let nodeCount; 
            switch(request.event){
 
                case 'connection' : 
                    nodeCount = sumByNode(request.connInfo);
                    monNSP.local.emit('resConnectedAll', nodeCount);
                case 'disconnect' :
                    console.log(request.connInfo)
                    nodeCount = sumByNode(request.connInfo);
                    monNSP.local.emit('resDisConnectedAll', nodeCount);            
            }
        } 
        // ignore all custom request by cb()

        cb(); 
    }
}; 

function reqAliveNode(socket){
    return async function(data = {}){
        if(typeof(data) != 'object'){
            socket.emit('msg', 'need request object')
        } else {
            const request = {};
            request.type = 'getAliveNode';
            const result = await redisRequester(socket, request);
            socket.emit('msg', result);
        }
    } 
}

function reqConnected(socket){
    return function(data = {}){
        if(typeof(data) != 'object' || data.nodeName){
            socket.emit('msg', 'need request object')
        } else {
            const request = {};    
            request.nodeName = data.nodeName;
            redisRequester(socket, request);
        }
    }
}

function reqConnectedAll(socket){
    return async function(data = {}){
        if(typeof(data) != 'object'){
            socket.emit('msg', 'need request object')
        } else {
            const request = {};
            request.type = 'getConnectedAll';            
            const result = await redisRequester(socket, request);
            const nodeCount = sumByNode(result);
            console.log(nodeCount);
            socket.emit('msg', nodeCount);
            socket.emit('resConnectedAll', nodeCount )
        }
        //results sample 
        //[{node:server1, data : [{namespace:'/', connected:1},...]}{}]
    }
}

function sumByNode(connInfos){
    global.logger.info(connInfos);
    const connectedByNode  = []
    for(const connInfo of connInfos){
        const nodename = connInfo.node;
        const connectionList = connInfo.connected;
        const count = connectionList.reduce((sum,nspInfo) => {
            return sum + nspInfo.connected
        },0)
        connectedByNode.push({
            nodename : nodename,
            connected : count
        })
    }
    return connectedByNode
}

 // customRequst to socket servers
 // request looks like
 // request = {from:'nodename', type:'functional string'}
 // ** function string
 // 'getAliveNode' : get alive node names
 // 'getConnectedAll' : get socketservers connected client info

 function redisRequester(socket, request){
    return new Promise((resolve,reject) => {
        request.from = global.hostname;
        socket.nsp.adapter.customRequest(request, (err,replies) => {
            if(err) {
                reject(err);
            } else {
                // socket.io-redis : like other request type, need to filter undefined result
                const filtered = replies.filter(reply => reply !== undefined)
                logger.info(filtered);
                resolve(filtered);
            }
        })
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
