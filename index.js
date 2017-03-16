"use strict";

const listener = require("contentful-webhook-listener");
const ContentfulWebhookListener = listener.Server;
const ngrok = require("ngrok");
const contentfulManagement = require("contentful-management");
const os = require("os");
const crypto = require("crypto");
const HttpsProxyAgent = require('https-proxy-agent');

var agent;
const proxy = process.env.npm_config_https_proxy || process.env.npm_config_proxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxy) {
    agent = new HttpsProxyAgent(proxy);
}


/**
 * generate a random string for HTTP Basic Authentication
 * @returns {String} auth string of 32 random characters
 */
function randomAuth() {

    // note, each byte encoded to hex is two characters
    let username = crypto.randomBytes(8).toString("hex");
    let password = crypto.randomBytes(8).toString("hex");

    // insert an ":" in the middle to make this an auth string
    return `${username}:${password}`;

}

let options = {};

class ContentfulWebhookTunnel extends ContentfulWebhookListener {
    constructor (opts, requestListener) {

        if (process.env.NGROK_AUTH_TOKEN) {

            // basic auth requires a ngrok account and auth token
            opts.auth = opts.auth || randomAuth();

        }
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

            let client = contentfulManagement.createClient({
                "accessToken": process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
                "agent": agent
            });

            let hostname = os.hostname();

            // connect ngrok and contentful
            ngrok.once("connect", function (url, uiUrl) {

                server.emit("ngrokConnect", url, uiUrl, options.port);

                options.spaces.forEach(function (spaceId) {

                    // use contentful API to create/update webhook
                    client.getSpace(spaceId).then((space) => {

                        let data = {
                            "name": `Tunnel to ${hostname}`,
                            "url": url,
                            "headers": [],
                            "topics": [ "*.*" ]
                        };

                        // basic auth is optional
                        if (options.auth) {

                            let [username, password] = options.auth.split(":");
                            data.httpBasicUsername = username;
                            data.httpBasicPassword = password;

                        }

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

            // look for existing webhook with same name
            options.spaces.forEach(function (spaceId) {

                // use contentful API to get each space
                client.getSpace(spaceId).then(space => {

                    // get all the webhooks for each space
                    space.getWebhooks().then(webhooks => {

                        if (webhooks.sys.type === "Array") {

                            // find matching webhooks
                            let matches = webhooks.items.filter(webhook => {

                                return webhook.name === `Tunnel to ${hostname}`;

                            });

                            // remove matching webhooks
                            Promise.all(

                                matches.map(webhook => webhook.delete())

                            ).then(() => {

                                // only connect after all matching webhooks have been deleted
                                let ngrokOpts = {
                                    "proto": "http", // http|tcp|tls
                                    "addr": options.port, // port or network address
                                    "region": process.env.NGROK_REGION || "us"
                                };

                                if (process.env.NGROK_AUTH_TOKEN) {

                                    // these options require an AUTH TOKEN
                                    ngrokOpts.auth = options.auth;
                                    ngrokOpts.subdomain = process.env.NGROK_SUBDOMAIN;
                                    ngrokOpts.authtoken = process.env.NGROK_AUTH_TOKEN;

                                }

                                ngrok.connect(ngrokOpts);

                            }).catch(handleError);

                        } else {

                            throw new Error("response was not an array");

                        }

                    }).catch(handleError);

                }).catch(handleError);

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
