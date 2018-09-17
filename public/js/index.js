const getAliveNodeBtn = d3.select('#getAliveNode');
const summaryDiv = d3.select('#summary');

const msgPanel = d3.select('#msgPanel');

const socket = io('/mon-redis', {foreceNew : true});

socket.on('connect',() => {
    console.log('connected');
    socket.emit('getConnectedAll', {});
})

socket.on('msg',(message) => {
    console.log(message);    
    msgPanel.append('div').text(message);
    msgPanel.property('scrollTop', msgPanel.property('scrollHeight'));

})

socket.on('resConnectedAll', (connInfo) => {

    // data join
    const div = summaryDiv.selectAll('div').data(connInfo, function(data){
        return data.nodename
    });

    // data enter
    div.enter().append('div')
    .attr('id',function(d,i){
        return d.nodename}
    )
    .text(function(d,i){
        return `${d.nodename} : ${d.connected}` 
    })

    // update old element
    div.attr('id',function(d,i){
        return d.nodename}
    )
    .text(function(d,i){
        return `${d.nodename} : ${d.connected}` 
    }) 
    // todo font size transition

})

socket.on('resDisConnectedAll', (connInfo) => {
    // data join
    const div = summaryDiv.selectAll('div').data(connInfo, function(data){
        return data.nodename
    });

    // data enter
    div.enter().append('div')
    .attr('id',function(d,i){
        return d.nodename}
    )
    .text(function(d,i){
        return `${d.nodename} : ${d.connected}` 
    })

    // update old element
    div.attr('id',function(d,i){
        return d.nodename}
    )
    .text(function(d,i){
        return `${d.nodename} : ${d.connected}` 
    }) 
    // todo font size transition
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