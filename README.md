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

Require this module and then create a new server. The `createServer` function expects the first argument to be an object with the `spaces` key and an array of space IDs to register the webhook with.

Then listen for one or more of Contentful webhook events, `create`, `save`, `autoSave`, `archive`, `unarchive`, `delete`, `publish` or `unpublish` on the server object and setup a custom callback. See [contentful-webhook-listener.js][2] for details on the payload for each event.

Lastly, instruct the server to start listening.

```node
var tunnel = require("contentful-webhook-tunnel");

var server = tunnel.createServer({
    "spaces": [ "cfexampleapi" ]
});

server.on("publish", function (payload) {

    console.log("Received webhook for Publish event in Contentful");
    
    // see payload for details
    console.log(payload);

});

server.listen();
```

To register the webhooks via the Contentful Content Management API requires an access token. Vist the [Contentful Developer Center][3] to acquire an access token for a local script. Then, save that token to an environment variable named `CONTENTFUL_MANAGEMENT_ACCESS_TOKEN`.

Ngrok defaults to using tunnel servers in the US. To use a tunnel server outside the US then set the `NGORK_REGION` environment variable to another region. See the [ngrok documentation][4] for the list of supported regions.

## How it Works

Node.js is used to create a HTTP server that listens for requests and processes them as requests from Contentful Webhooks. When this server starts listening, then ngrok is started up and connected to the same port as the server and requires the same authentication, if any. Once ngork is connected and provides an ngrok URL, then the ngrok URL is registered with Contentful via the Contentful Content Management API. If the server is interrupted or terminated, then the registered webhook will be removed from Contentful.

Deploying and running this server on a publicly accessible system does not require ngrok and, therefore, should use the [contentful-webhook-listener.js][2] server, that this is based on, instead.

## Advanced Usage

In addition to the Contentful webhook events, this server also emits the following events.

### Event: 'error'

* <Error> The error that occurred.

Emitted when an error occurs. The server will be closed directly following this event.

### Event: 'ngrokConnect'

* <String> the public URL of your tunnel
* <String> the URL to your local ngork web interface
* <Number> the local port number that is forwarded

Emitted after ngork connects.

### Event: 'ngrokDisconnet'

Emitted after ngrok disconnects.

### Event: 'webhookCreated'

* <[Webhook][webhook]> the webhook definition from Contentful

Emitted after a webhook record is created via the Contentful Content Management API.

### Event: 'webhookDeleted'

Emitted after a webhook record is deleted via the Contentful Content Management API.

## Todo

* accept a single space or an array of spaces or an options object as the first argument to createServer()
* pass options object from createServer() function to ngrok.connect() for greater flexibility

## Change Log

_1.2.0 — January 31, 2017_

* automatically removes orphaned tunnels from the same host upon reconnection
* returns the URL to the ngrok UI and the local port number that is forwarded as arguments to the `ngrokConnect` event in addition to the public ngork URL
* requires ngrok 2.2.6 or greater to get the ngrok UI URL, otherwise that arugment will be undefined

_1.1.0 — November 4, 2016_

* random username and password are used if none are provided
* port number defaults to 5678 if none is provided

_1.0.0 — November 3, 2016_

* initial version

## License

contentful-webhook-tunnel is available under the [MIT License][1].

[1]: https://github.com/keithws/contentful-webhook-tunnel/blob/master/LICENSE
[2]: https://github.com/keithws/contentful-webhook-listener.js
[3]: https://www.contentful.com/developers/docs/references/authentication/#the-content-management-api
[4]: https://ngrok.com/docs/2#global
[webhook]: https://www.contentful.com/developers/docs/references/content-management-api/#/reference/webhooks/webhooks-collection/create-a-webhook
