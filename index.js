"use strict";

const listener = require("contentful-webhook-listener");
const ContentfulWebhookListener = listener.Server;
const ngrok = require("ngrok");
const contentfulManagement = require("contentful-management");
const os = require("os");

if (!process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN) {

    throw new Error("CONTENTFUL_MANAGEMENT_ACCESS_TOKEN could not be found.");

}

let client = contentfulManagement.createClient({
    "accessToken": process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN
});

class ContentfulWebhookTunnel extends ContentfulWebhookListener {
    constructor (opts, requestListener) {

        super(opts, requestListener);

        let server = this;
        let auth = opts.auth;
        let spaces = opts.spaces;
        let port = opts.port;

        function handleError (err) {

            server.emit("error", err);
            server.close();

        }

        this.on("listening", function () {

            // start up ngrok
            ngrok.once("connect", function (url) {

                server.emit("ngrokConnect", url);

                spaces.forEach(function (spaceId) {

                    // use contentful API to create/update webhook
                    client.getSpace(spaceId).then((space) => {

                        let data, hostname, password, username;

                        [username, password] = auth.split(":");
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
                "addr": port, // port or network address
                "auth": auth, // http basic authentication for tunnel
                "subdomain": process.env.NGROK_SUBDOMAIN, // reserved tunnel name https://alex.ngrok.io
                "authtoken": process.env.NGROK_AUTH_TOKEN, // your authtoken from ngrok.com
                "region": process.env.NGROK_REGION || "us" // one of ngrok regions (us, eu, au, ap), defaults to us
            });

        });
    }
}

exports.Server = ContentfulWebhookTunnel;

exports.createServer = function(opts, requestListener) {

    return new ContentfulWebhookTunnel(opts, requestListener);

};
