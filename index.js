"use strict";

const listener = require("contentful-webhook-listener");
const ContentfulWebhookListener = listener.Server;
const ngrok = require("ngrok");
const contentfulManagement = require("contentful-management");
const os = require("os");
const crypto = require("crypto");
const HttpsProxyAgent = require("https-proxy-agent");

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

class ContentfulWebhookTunnel extends ContentfulWebhookListener {
    constructor (opts, requestListener) {

        // must set opts.auth before calling parent constructor
        if (process.env.NGROK_AUTH_TOKEN) {

            // this option requires an AUTH TOKEN
            opts.auth = opts.auth || randomAuth();

        }

        super(opts, requestListener);
        this.options = this.options || {};
        this.options.port = opts.port || 0;
        this.options.spaces = opts.spaces || [];

        // define our default ngrok options
        this.options.ngrok = {
            "proto": "http",
            "bind_tls": true,
            "region": "us"
        };

        // allow options passed to createServer() to override the defaults
        Object.assign(this.options.ngrok, opts.ngrok);

        // environment variables override defaults and values from createServer
        if (process.env.NGROK_REGION) {

            this.options.ngrok.region = process.env.NGROK_REGION;

        }
        if (process.env.NGROK_AUTH_TOKEN) {

            this.options.ngrok.authtoken = process.env.NGROK_AUTH_TOKEN;

        }
        if (process.env.NGROK_SUBDOMAIN && process.env.NGROK_AUTH_TOKEN) {

            // this option requires an AUTH TOKEN
            this.options.ngrok.subdomain = process.env.NGROK_SUBDOMAIN;

        }
        if (opts.auth && process.env.NGROK_AUTH_TOKEN) {

            // this option requires an AUTH TOKEN
            this.options.ngrok.auth = opts.auth;

        }

        let server = this;

        function handleError (err) {

            server.emit("error", err);
            server.close();

        }

        server.on("listening", function () {

            let port = server.address().port;

            // tell ngrok which port we are listening on
            this.options.ngrok.addr = port;

            if (!process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN) {

                handleError(new Error("CONTENTFUL_MANAGEMENT_ACCESS_TOKEN is undefined or invalid."));
                return;

            }

            let client = contentfulManagement.createClient({
                "accessToken": process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
                "agent": agent
            });

            let hostname = os.hostname();

            ngrok.on("disconnect", () => server.emit("ngrokDisconnet"));
            ngrok.on("error", err => handleError(err));

            // connect ngrok and contentful
            ngrok.connect(server.options.ngrok, (err, url, uiUrl) => {

                if (err) {
                    return;
                }

                server.emit("ngrokConnect", url, uiUrl, port);

                // find and remove webhooks with the same name before re-connecting
                Promise.all(server.options.spaces.map(spaceId => {

                    // use contentful API to get each space
                    return client.getSpace(spaceId);

                })).then(spaces => {

                    // get all the webhooks for each space
                    return Promise.all(spaces.map(space => space.getWebhooks()));

                }).then(responses => {

                    let webhooks = responses.filter(response => response.sys.type === "Array");

                    webhooks = webhooks.reduce((acc, v) => acc.concat(v.items), []);

                    // find matching webhooks
                    let matches = webhooks.filter(webhook => {

                        return webhook.name === `Tunnel to ${hostname}`;

                    });

                    // remove matching webhooks
                    return Promise.all(matches.map(webhook => webhook.delete()));

                }).then(() => {

                    return Promise.all(server.options.spaces.map(spaceId => {

                        // use contentful API to get each space
                        return client.getSpace(spaceId);

                    }));

                }).then(spaces => {

                    // use contentful API to create/update webhook
                    let data = {
                        "name": `Tunnel to ${hostname}`,
                        "url": url,
                        "headers": [],
                        "topics": [ "*.*" ]
                    };

                    // basic auth is optional
                    if (server.options.auth) {

                        let [username, password] = server.options.auth.split(":");
                        data.httpBasicUsername = username;
                        data.httpBasicPassword = password;

                    }

                    return Promise.all(spaces.map(space => space.createWebhook(data)));

                }).then(webhooks => {

                    webhooks.forEach(webhook => {

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

                    });

                }).catch(handleError);

            });

        });
    }
    listen(port, hostname, backlog, callback) {

        port = port || this.options.port || this.options.ngrok.addr || 0;

        super.listen(port, hostname, backlog, callback);

    }
}

exports.Server = ContentfulWebhookTunnel;

exports.createServer = function(opts, requestListener) {

    return new ContentfulWebhookTunnel(opts, requestListener);

};
