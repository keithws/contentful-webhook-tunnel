"use strict";

const listener = require("contentful-webhook-listener");
const ContentfulWebhookListener = listener.Server;
const ngrok = require("ngrok");
const contentfulManagement = require("contentful-management");
const os = require("os");
const crypto = require("crypto");

/**
 * generate a random string for HTTP Basic Authentication
 * @returns {String} auth string of 32 random characters
 */
function randomAuth() {

    // note, each byte encoded to hex is two characters
    let username = crypto.randomBytes(8).toString("hex");
    let password = crypto.randomBytes(8).toString("hex");

    // insert an ":" in the middle to make this auth
    return `${username}:${password}`;

}

let options = {};

class ContentfulWebhookTunnel extends ContentfulWebhookListener {
    constructor (opts, requestListener) {

        opts.auth = opts.auth || randomAuth();
        opts.port = opts.port || 5678;
        opts.spaces = opts.spaces || [];
        options = opts;

        super(opts, requestListener);

        let server = this;

        function handleError (err) {

            server.emit("error", err);
            server.close();

        }

        server.on("listening", function () {

            if (!process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN) {

                handleError(new Error("CONTENTFUL_MANAGEMENT_ACCESS_TOKEN is undefined or invalid."));
                return;

            }

            // start up ngrok
            ngrok.once("connect", function (url) {

                server.emit("ngrokConnect", url);

                let client = contentfulManagement.createClient({
                    "accessToken": process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN
                });

                options.spaces.forEach(function (spaceId) {

                    // use contentful API to create/update webhook
                    client.getSpace(spaceId).then((space) => {

                        let data, hostname, password, username;

                        [username, password] = options.auth.split(":");
                        hostname = os.hostname();
                        data = {
                            "name": `Tunnel to ${hostname}`,
                            "url": url,
                            "httpBasicUsername": username,
                            "httpBasicPassword": password,
                            "headers": [],
                            "topics": [ "*.*" ]
                        };

                        space.createWebhook(data).then((webhook) => {

                            server.emit("webhookCreated", webhook);

                            // delete webhook when process is intrupted
                            process.on("SIGINT", function () {

                                webhook.delete().then(() => {

                                    server.emit("webhookDeleted");
                                    process.exit(128 + 2);

                                }).catch(handleError);

                            });

                            // delete webhook when process is terminated
                            process.on("SIGTERM", function () {

                                webhook.delete().then(() => {

                                    server.emit("webhookDeleted");
                                    process.exit(128 + 15);

                                }).catch(handleError);

                            });

                        }).catch(handleError);


                    }).catch(handleError);

                });

            });

            ngrok.on("disconnect", () => {

                server.emit("ngrokDisconnet");

            });

            ngrok.on("error", handleError);

            ngrok.connect({
                "proto": "http", // http|tcp|tls
                "addr": options.port, // port or network address
                "auth": options.auth, // http basic authentication for tunnel
                "subdomain": process.env.NGROK_SUBDOMAIN, // reserved tunnel name https://alex.ngrok.io
                "authtoken": process.env.NGROK_AUTH_TOKEN, // your authtoken from ngrok.com
                "region": process.env.NGROK_REGION || "us" // one of ngrok regions (us, eu, au, ap), defaults to us
            });

        });
    }
    listen(port, hostname, backlog, callback) {

        port = port || options.port;

        super.listen(port, hostname, backlog, callback);

    }
}

exports.Server = ContentfulWebhookTunnel;

exports.createServer = function(opts, requestListener) {

    return new ContentfulWebhookTunnel(opts, requestListener);

};
