/*

var tunnel = require("..");

var server = tunnel.createServer({
    "spaces": [ "4l0w8syj29ap" ]
});

server.on("publish", function (payload) {

    console.log("Received webhook for Publish event in Contentful");
    
    // see payload for details
    console.log(payload);

});

console.log("Server is listening.");
server.listen();

setTimeout(function () {
    console.log("Server is closing...");
    server.close(function (err) {
        if (err) throw err;
        console.log("Server is closed.");
        server.getConnections((err, count) => {
            if (err) {
                throw err;
            } else {
                console.log(`${count} connections remain open.`);
            }
        });
    });
}, 2000);

*/