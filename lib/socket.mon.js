module.exports = function(io){

    io.on('connect',function(socket){
        //console.log(socket.server);
        console.log(socket.nsp.name);
    })
    console.log(Object.keys(io.nsps))
    for ( const nspName of Object.keys(io.nsps)) {
        const nspObj = io.nsps[nspName];
        nspObj.on('connect', (socket) => {
            console.log(`connection detected on ${nspName}`)
        })
    } 
    //console.log(io)
}
 
