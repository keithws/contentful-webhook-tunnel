# contentful-webhook-tunnel

[![Build Status](https://travis-ci.org/keithws/contentful-webhook-tunnel.svg?branch=master)](https://travis-ci.org/keithws/contentful-webhook-tunnel) [![NPM Dependency Status](https://david-dm.org/keithws/contentful-webhook-tunnel.svg)](https://david-dm.org/keithws/contentful-webhook-tunnel) [![NPM Verion](https://img.shields.io/npm/v/contentful-webhook-tunnel.svg)](https://www.npmjs.com/package/contentful-webhook-tunnel)

A simple HTTP server for listening to Contentful API Webhooks with secure tunnels to localhost by ngrok.

This module extends [contentful-webhook-listener.js][2] to automatically start up ngrok with a tunnel to the same port and registers a webhook for the ngrok URL with Contentful.

This is very useful for local development and/or servers behind firewalls. Create a script with custom callbacks for any or all actions that occur in Contentful.

## Install

```bash
npm install contentful-webhook-tunnel
```

## Usage

Require this module and the create a new server. Provide the username and password for HTTP Basic Authentication, the port number for the server to attach too, and the space ID(s) to create the webhooks in.

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

To register the webhooks via the Contentful Content Managment API requires an access token. Vist the [Contentful Developer Center][3] to acquire an access token for a local script. Then, save that token to an environment variable named `CONTENTFUL_MANAGEMENT_ACCESS_TOKEN`.

Ngrok defaults to using tunnel servers in the US. To use a tunnel server outside the US then set the `NGORK_REGION` environment variable to another region. See the [ngrok documentation][4] for the list of supported regions.

## How it Works

Node.js is used to create a HTTP server that listens for requests and processes them as requests from Contentful Webhooks. When this server starts listening, then ngrok is started up and connected to the same port as the server and requires the same authentication, if any. Once ngork is connected and provides an ngrok URL, then the ngrok URL is registered with Contentful via the Contentful Content Management API. If the server is interrupted or terminated, then the registered webhook will be removed from Contentful.

Deploying and running this server on a publicly accessible system does not require ngrok and, therefore, should use the [contentful-webhook-listener.js][2] server, that this is based on, instead.

## Todo

* make username and password optional by generating random ones by default
* make port number optional by generating a random one by default
* if port number is in use, then increment by one and try again
* pass options object from createServer() function to ngrok.connect() for greater flexibility

## Change Log

_1.0.0 — November 4, 2016_

* initial version

## License

contentful-webhook-tunnel is available under the [MIT License][1].

[1]: https://github.com/keithws/contentful-webhook-tunnel/blob/master/LICENSE
[2]: https://github.com/keithws/contentful-webhook-listener.js
[3]: https://www.contentful.com/developers/docs/references/authentication/#the-content-management-api
[4]: https://ngrok.com/docs/2#global
