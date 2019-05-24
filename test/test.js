/* eslint-env mocha */

const tunnel = require("..");
const should = require("should");

describe("Contentful Webhook Tunnel", function () {
    this.slow(4 * 1000);
    this.timeout(16 * 1000);

    let server;

    beforeEach(function (done) {

        server = tunnel.createServer({
            "spaces": [ "4l0w8syj29ap" ],
        });

        // listen for errors
        server.on("error", function (err) {

            done(err);

        });

        server.on("listening", done);

        // start up a webhook listener server
        server.listen();

    });

    afterEach(function (done) {

        server.close(done);

    });

    describe("constructor()", function () {

        it("should open a tunnel with ngrok", function (done) {

            // log info about the tunnel
            server.on("ngrokConnect", function (url, uiUrl, port) {

                try {

                    should(url).be.a.String;
                    //uiUrl.should.be.a.String;
                    port.should.be.a.Number;
                    port.should.be.above(1024);
                    port.should.be.below(65536);
                    url.should.match(/^https:\/\/[0-9a-f]+.ngrok.io$/);
                    //uiUrl.should.match(/^http:\/\/127.0.0.1:\d{4,5}$/);

                    done();

                } catch (err) {

                    done(err);

                }

            });

        });

        it("should register a webhook with Contentful", function (done) {

            // log info about the webhook
            server.on("webhookCreated", function (record) {

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

                    done();

                } catch (err) {

                    done(err);

                }

            });

        });

    });

    describe("deleteWebhook()", function () {

        it("should delete a registered webhook", function (done) {

            // wait for deleted event and very returned data
            server.on("webhookDeleted", function (record) {

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

                    done();

                } catch (err) {

                    done(err);

                }

            });

            // wait to delete the webhook until it has been created
            server.on("webhookCreated", function (record) {

                server.deleteWebhook(record);

            });

        });

    });

    describe("listen()", function () {

        // should start an HTTP server listening on a port

    });

    describe("close()", function () {

        // should shutdown HTTP server
        // should stop ngrok process

    });

});
