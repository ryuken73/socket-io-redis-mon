/**
 * Socket Server
 */
const redis = require('socket.io-redis');
const os = require('os');
const _ = require('lodash');

exports.createServer = function(io){

    io.adapter(redis({host:global.appconfig.redisInfo.address, port:global.appconfig.redisInfo.port}));

    const rootNamespace = io.of('/');
    const chatNamespace = io.of('/chat');
    const botNamespace = io.of('/bot');
    const privateNamespace = io.of('/private');


    rootNamespace.use(commonMiddleware);
    chatNamespace.use(commonMiddleware);
    botNamespace.use(commonMiddleware);
    privateNamespace.use(commonMiddleware);

    rootNamespace.on('connect',(socket) => { 

        connectHandler(socket);      
        socket.on('disconnect', commonDisconnectHandler(socket));   
        socket.on('nspGetSocketsBtn', notifyNspSockets(socket));
        socket.on('roomGetsocketBtn', notifyRoomSockets(socket));
        socket.on('setAlias', (alias) => socket.alias = alias );
        socket.on('setAlias', notifySetAlias(socket));
        socket.on('joinRoom', joinHandler(socket));
        socket.on('leaveRoom', leaveHandler(socket));
        socket.on('sendMessage', msgHandler(socket));
        socket.on('customRequet', customHandler(socket));

    })      

    chatNamespace.on('connect',(socket) => {
  
        connectHandler(socket);
        socket.on('disconnect', commonDisconnectHandler(socket));
        socket.on('nspGetSocketsBtn', notifyNspSockets(socket));
        socket.on('roomGetsocketBtn', notifyRoomSockets(socket));
        socket.on('setAlias', (alias) => socket.alias = alias );
        socket.on('setAlias', notifySetAlias(socket));
        socket.on('joinRoom', joinHandler(socket));
        socket.on('leaveRoom', leaveHandler(socket));
        socket.on('sendMessage', msgHandler(socket));
        socket.on('customRequet', customHandler(socket));
        
    })

    botNamespace.on('connection',(socket) => {

        connectHandler(socket);      
        socket.on('disconnect', commonDisconnectHandler(socket));   
        socket.on('nspGetSocketsBtn', notifyNspSockets(socket));
        socket.on('roomGetsocketBtn', notifyRoomSockets(socket));
        socket.on('setAlias', (alias) => socket.alias = alias );
        socket.on('setAlias', notifySetAlias(socket));
        socket.on('joinRoom', joinHandler(socket));
        socket.on('leaveRoom', leaveHandler(socket));
        socket.on('sendMessage', msgHandler(socket));
        socket.on('customRequet', customHandler(socket));

    })

    privateNamespace.on('connection',(socket) => {

        connectHandler(socket);      
        socket.on('disconnect', commonDisconnectHandler(socket));   
        socket.on('nspGetSocketsBtn', notifyNspSockets(socket));
        socket.on('roomGetsocketBtn', notifyRoomSockets(socket));
        socket.on('setAlias', (alias) => socket.alias = alias );
        socket.on('setAlias', notifySetAlias(socket));
        socket.on('joinRoom', joinHandler(socket));
        socket.on('leaveRoom', leaveHandler(socket));
        socket.on('sendMessage', msgHandler(socket));
        socket.on('customRequet', customHandler(socket));

    })

    // customHook과 customRequest 동작방식
    //
    // 1. 1번노드에서 customRequest를 보낸다. 
    //   socket.nsp.adapter.customRequest(request,callback)
    //
    // ** 다른 노드에 전달되는 request의 모양은 아래와 같다.
    //    data는 위에서 전달된 request가 그대로 사용된다.
    //
    //    var request = JSON.stringify({
    //      requestid : requestid,
    //      type: requestTypes.customRequest,
    //      data: data
    //    });
    //
    // ** 1번노드의 requests 객체에 아래의 자료가 저장된다.
    //    아래 자료를 이용해서, 나중에 결과를 집계한다.
    //     self.requests[requestid] = {
    //        type: requestTypes.customRequest,
    //        numsub: numsub,
    //        msgCount: 0,
    //        replies: [],
    //        callback: fn,
    //        timeout: timeout
    //     };
    //
    // 2. 다른 노드에서는 customReqeust type으로 command를 받게 될때, customHook을 실행한다.
    //    customHook을 data와 cb를 받아서 처리값을 cb에 넘기면 알아서 redis로 publish하는 구조이다.
    //    ㅋ 멋진듯..
    //
    //     this.customHook(request.data, function(data) {
    //          var response = JSON.stringify({
    //             requestid: request.requestid,
    //             data: data
    //          });
    //          pub.publish(self.responseChannel, response);
    //      });
    //                
    //   
    //  ** default customHook은 아래처럼 data와 cb를 인자로 받고 cb(null)을 수행하는 단순한 구조이다.
    //     this.customHook = function(data, cb){ cb(null); }
    //  ** 이것을 override해서 원하는 action을 하게 할 수 있다.
    //     예를 들면, 자기 hostname을 callback으로 넘기면.. 모든 alive node 리스트를 구할 수 있다.
    //  
    // 3. 다른 노드로 부터 위 response를 전달받은 1번 노드는
    //    0) requests 객체에서 requestid로 전달한 request를 뽑아내고, 그 request를 가지고 아래 일을 수행한다.
    //    1) req.msgCount ++ : 도착한 message 갯수를 더한다.
    //    2) 전달받은 값을 replies에 push한다.
    //    3) req.msgCount == numsub이면(보낸 node 수) timeout 객체를 cliear한다.
    //    4) callback이 있다면. 즉, 최초 socket.nsp.adapter.customRequest(request,callback) 에서
    //       callback이 있었다면 callback(replies)를 수행해 준다.
    //
    
    function customHandler(socket){
        return function(request){
            request.socketID = socket.id;
            socket.nsp.adapter.customRequest(request, (err,replies) => {
                    // socket.io-redis : like other request type, need to filter undefined result
                    // implement..
                    const filtered = replies.filter(reply => reply !== undefined)
                    logger.info(filtered);
                    socket.emit('msg', filtered);
            })
        }
    }

    // attach customHook to all namespaces  
    rootNamespace.adapter.customHook = customFunctions;
    chatNamespace.adapter.customHook = customFunctions;
    botNamespace.adapter.customHook = customFunctions;
    privateNamespace.adapter.customHook = customFunctions;
    
    function customFunctions(request,cb) {
        const actionType = request.type;
        const socketID = request.socketID;
        const action = {
            'getHostsList' : getHostAlive,
            'getSocketsInHost' : getSocketsInHost,
            'getsidFromAlias' : getsidFromProperty('alias'),
            'getIPwhereAliasIn' : getIPwhereAliasIn('alias')
        }
        action[actionType](request,cb)
    }
    
    function getHostAlive(request,cb){
        cb(global.hostname);
    }
    
    function getSocketsInHost(request,cb){
        if(global.hostname == request.hostname) {
            cb(Object.keys(rootNamespace.connected).toString());
        }else{
            cb();
        }
    }

    function getsidFromProperty(key){
        return function(request,cb){
            const alias = request.alias;
            const sockets = rootNamespace.connected;
            const predicate = {};
            predicate[key] = alias;
            //_findKey가 성능이 늦어지는지 확인 필요
            const socketID = _.findKey(sockets, predicate); 
            if(typeof(cb) == 'function'){
                cb(socketID);
            }else{
                return socketID
            }
        }
    }

    function getIPwhereAliasIn(alias){
        return function(request,cb){
            const socketID = (getsidFromProperty(alias))(request)
            if(socketID){
                cb(global.hostname); 
            } else {
                cb();
            }
        }       
    }

}; 

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

