# contentful-webhook-tunnel

[![Build Status](https://travis-ci.org/keithws/contentful-webhook-tunnel.svg?branch=master)](https://travis-ci.org/keithws/contentful-webhook-tunnel) [![NPM Dependency Status](https://david-dm.org/keithws/contentful-webhook-tunnel.svg)](https://david-dm.org/keithws/contentful-webhook-tunnel) [![NPM Verion](https://img.shields.io/npm/v/contentful-webhook-tunnel.svg)](https://www.npmjs.com/package/contentful-webhook-tunnel)

A Simple HTTP Webserver for listening to Contentful API Webhooks with secure tunnels to localhost by ngrok.

Extends [contentful-webhook-listener.js][2] to automatically start up ngrok with a tunnel to the same port and registers the webhook with the Contentful Management API.

This is very useful for local development and/or servers behind firewalls. Create a script with custom callbacks for any or all actions that occur in Contentful.

## Install

```bash
npm install contentful-webhook-tunnel
```

## Usage

Require this module and the create a new server. Provide the username and password you want to use for HTTP Basic Authentication, the port number for the server to attach too, and the space ID(s) you want to register these webhooks in.

```node
var tunnel = require("contentful-webhook-tunnel");

var port = 5000;
var server = tunnel.createServer({
    "auth": "username:password",
    "port": port,
    "spaces": [ "cfexampleapi" ]
});

server.on("publish", function (payload) {

    console.log("Received webhook for Publish event in Contentful");
    
    // see payload for details
    console.log(payload);

});

server.listen(port);
```

## How it Works

Node.js is used to create a HTTP server that listens for requests and processes them as requests from Contentful Webhooks. When this server starts listening, then ngrok is started up and connected to the same port the server is running on and with the same authentication, if any. Once ngork is connected and provides an ngrok URL, then the ngrok URL is registered with Contentful via the Contentful Management API. If this process is interupted or terminated, then the registered webhook will be removed from Contentful.

## Todo

* make port number optional by generating a random one by default
* if port number is in use, then increment by one and try again
* make username and password optional by generating a random ones by default
* a command line app?

## Change Log

_1.0.0 — November 3, 2016_

* initial version

## License

contentful-webhook-tunnel is available under the [MIT License][1].

[1]: https://github.com/keithws/contentful-webhook-tunnel/blob/master/LICENSE
[2]: https://github.com/keithws/contentful-webhook-listener.js
