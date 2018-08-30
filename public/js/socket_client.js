const nspConnectBtn = d3.select('#connectNSP');
const nspDisonnectBtn = d3.select('#disconnectNSP');
const nspGetSocketsBtn = d3.select('#getNSPSockets');
const joinRoomBtn = d3.select('#joinRoom');
const leaveRoomBtn = d3.select('#leaveRoom');
const getRoomSocketBtn = d3.select('#getRoomSockets');
const msgToNSPBtn = d3.select('#msgToNSP');
const msgInRoomBtn = d3.select('#msgInRoom');
const msgToMemberBtn = d3.select('#msgToMember');
const setAliasBtn = d3.select('#setAlias');
const getHostsListBtn = d3.select('#getHostsList');
const getHostSocketsBtn = d3.select('#getHostSockets');
const getSocketIDFromAliasBtn = d3.select('#getSocketIDFromAlias');
const getWhereBtn = d3.select('#getWhereAmI');
const disconnectSocketBtn = d3.select('#disconnectSocket');


const msgPanel = d3.select('#msgPanel');

var socket;

nspConnectBtn.on('click',() => {

    // force disconnect previous socket connections
    if( typeof(socket)=='object' ){
        socket.disconnect();
    }

    const namespace = d3.select('#namespace').property('value');
    const options = {foreceNew : true}

    socket = io(namespace, options);
    socket.on('connect',() => {
        console.log('connected');
    })

    socket.on('msg',(message) => {
        console.log(message);
        msgPanel.append('div').text(message);
        msgPanel.property('scrollTop', msgPanel.property('scrollHeight'));

    })

    socket.on('notify-your-socketid',(id) => {
        console.log(id);
        d3.select('#mySocketID').property('value', id);
    })
    
    socket.on('disconnect',() => {
        console.log('disconnected')
        d3.select('#mySocketID').property('value', 'disconnected');
    })
})

const connected = () => ( typeof(socket) == 'object' && socket.connected );

nspDisonnectBtn.on('click',() => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    console.log('disconnection btn clicked')
    socket.disconnect();
})

nspGetSocketsBtn.on('click',() => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    console.log('nspGetSocketsBtn btn clicked')
    socket.emit('nspGetSocketsBtn')
})

getRoomSocketBtn.on('click', () => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    const roomName = d3.select('#room').property('value');
    socket.emit('roomGetsocketBtn', roomName);
})

setAliasBtn.on('click',() => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    const alias = d3.select('#alias').property('value');
    socket.emit('setAlias', alias);
})

joinRoomBtn.on('click',() => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    const roomNM = d3.select('#room').property('value');
    socket.emit('joinRoom', roomNM);   

})

leaveRoomBtn.on('click',() => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    const roomNM = d3.select('#room').property('value');
    socket.emit('leaveRoom', roomNM);   

})

msgToNSPBtn.on('click',() => {   
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    const sendInfo = {}; 
    sendInfo.message = d3.select('#sendMessage').property('value');
    sendInfo.sendRange = 'nsp';
    sendInfo.target = '';
    socket.emit('sendMessage', sendInfo);
})

msgInRoomBtn.on('click',() => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    const sendInfo = {}; 
    sendInfo.message = d3.select('#sendMessage').property('value');
    sendInfo.sendRange = 'room';
    sendInfo.target = d3.select('#sendRoom').property('value');
    socket.emit('sendMessage', sendInfo);
})

msgToMemberBtn.on('click',() => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    const sendInfo = {}; 
    sendInfo.message =  d3.select('#sendMessage').property('value');
    sendInfo.sendRange = 'socket';
    sendInfo.target = d3.select('#sendReceiver').property('value');
    socket.emit('sendMessage', sendInfo);
})

getHostsListBtn.on('click',() => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    socket.emit('customRequet', {type:'getHostsList'});
});

getHostSocketsBtn.on('click',() => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    const hostname = d3.select('#hostname').property('value');
    socket.emit('customRequet', {type:'getSocketsInHost', hostname:hostname});
});

getSocketIDFromAliasBtn.on('click',() => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    const alias = d3.select('#alias').property('value');
    socket.emit('customRequet', {type:'getsidFromAlias', alias:alias});
})

getWhereBtn.on('click', () => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    const alias = d3.select('#alias').property('value');
    socket.emit('customRequet', {type:'getIPwhereAliasIn', alias:alias});
})

disconnectSocketBtn.on('click', () => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    const alias = d3.select('#alias').property('value');
    socket.emit('customRequet', {type:'disconnectAlias', alias:alias});
})