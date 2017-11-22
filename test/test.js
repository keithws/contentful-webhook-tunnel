/* eslint-env mocha */

const tunnel = require("..");
const should = require("should");

describe("Contentful Webhook Tunnel", function () {
    describe("createServer", function () {
        this.slow(4000);

        it("should open a tunnel with ngrok and register a webhook with Contentful", function (done) {

            let webhook = tunnel.createServer({
                "spaces": [ "4l0w8syj29ap" ],
            });

            let p1 = new Promise((resolve, reject) => {

                // log info about the tunnel
                webhook.on("ngrokConnect", function (url, uiUrl, port) {

                    try {

                        should(url).be.a.String;
                        uiUrl.should.be.a.String;
                        port.should.be.a.Number;
                        port.should.be.above(1024);
                        port.should.be.below(65536);
                        url.should.match(/^https:\/\/[0-9a-f]+.ngrok.io$/);
                        uiUrl.should.match(/^http:\/\/127.0.0.1:\d{4,5}$/);

                        resolve();

                    } catch (err) {
                        reject(err);
                    }


                });

            });

            let p2 = new Promise((resolve, reject) => {

                // log info about the webhooks
                webhook.on("webhookCreated", function (record) {

                    try {

                        record.should.exist;
                        record.url.should.exist;
                        record.url.should.match(/https:\/\/[0-9a-f]+.ngrok.io/);

                        // TODO verify record has custom header with date created
                        record.headers.should.exist;
                        record.headers.should.have.length(1);
                        record.headers[0].should.exist;
                        record.headers[0].should.have.keys("key", "value");
                        record.headers[0].key.should.equal("X-Date-Created");

                        webhook.close(resolve);

                    } catch (err) {
                        reject(err);
                    }


                });

                /* 
                 * TODO
                 * create delete method on webhook object so this event can be tested
                 */
                /*
                webhook.on("webhookDeleted", function () {

                    console.log("Webhook deleted");

                });
                */

            });

            // listen for errors
            webhook.on("error", function (err) {

                webhook.close();
                throw err;

            });

            // start up a webhook listener server
            webhook.listen();

            Promise.all([p1, p2]).then(() => {

                done();

            }).catch(err => {

                webhook.close();
                done(err);

            });

        });
    });
});


// TODO create Mocha test of behavrior when two tunnels are created at the same time




/*
let webhook2 = tunnel.createServer({
    "spaces": [ "i3mqntl0l339" ],
});

// log info about the tunnel
webhook2.on("ngrokConnect", function (url, uiUrl, port) {

    console.log("2: \x1b[1mAccess URLs:\x1b[22m");
    console.log("2:  \x1b[90m----------------------------------------\x1b[39m");
    console.log("2:        Local: \x1b[35mhttp://localhost:%s\x1b[39m", port);
    console.log("2:     External: \x1b[35m%s\x1b[39m", url);
    console.log("2:  \x1b[90m----------------------------------------\x1b[39m");
    console.log("2:           UI: \x1b[35m%s\x1b[39m", uiUrl);
    console.log("2:  \x1b[90m----------------------------------------\x1b[39m");
    console.log(`2: !!! NOT SAVING CHANGES BECAUSE THIS IS A TEST !!!`);

});

// log info about the webhooks
webhook2.on("webhookCreated", function (webhook) {

    console.log(`2: Webhook created: ${webhook.url}`);
    console.log("2: Listening for changes...");

});
webhook2.on("webhookDeleted", function () {

    console.log("2: Webhook deleted");

});


// listen for errors
webhook2.on("error", function (err) {

    if (err.details && err.details.err) {

        // if it is an ngrok error it may have a err.details.err message
        console.error(err.details.err);
        if (err.stack) {

            // always try to log the stack trace
            console.error(err.stack);

        }

    } else if (err.msg) {

        // otherwise it may have a err.msg property
        console.error(err.msg);
        if (err.stack) {

            // always try to log the stack trace
            console.error(err.stack);

        }

    } else if (err.stack) {

        // or it may have a stack
        console.error(err.stack);

    } else {

        // or it may something else entirely
        console.error(err);

    }
    webhook2.close();
    throw err;

});

// start up a webhook listener server
webhook2.listen();
*/
