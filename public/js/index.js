const getAliveNodeBtn = d3.select('#getAliveNode');

const msgPanel = d3.select('#msgPanel');

const socket = io('/mon-redis', {foreceNew : true});

socket.on('connect',() => {
    console.log('connected');
})

socket.on('msg',(message) => {
    console.log(message);    
    msgPanel.append('div').text(message);
    msgPanel.property('scrollTop', msgPanel.property('scrollHeight'));

})

const connected = () => ( typeof(socket) == 'object' && socket.connected );

getAliveNodeBtn.on('click',() => {
    if(!connected()) {
        alert('Please connect NSP');
        return 
    }
    socket.emit('getAliveNode', {});
    socket.emit('getConnectedAll', {});
})