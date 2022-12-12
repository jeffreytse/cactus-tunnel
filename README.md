<div align="center">
  <br>

  <a href="https://github.com/jeffreytse/cactus-tunnel">
    <img alt="cactus-tunnel logo" src="https://user-images.githubusercontent.com/9413601/206916652-0e9fca67-841d-4805-8360-f066eee93950.png" width="260">
  </a>

  <h1>Cactus Tunnel</h1>

</div>

<h4 align="center">
  🌵 A charming TCP tunnel over websocket and browser.
</h4>

<p align="center">

  <a href="https://badge.fury.io/js/cactus-tunnel">
    <img src="https://badge.fury.io/js/cactus-tunnel.svg"
      alt="NPM Version" />
  </a>

  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-brightgreen.svg"
      alt="License: MIT" />
  </a>

  <a href="https://liberapay.com/jeffreytse">
    <img src="https://img.shields.io/liberapay/goal/jeffreytse.svg?logo=liberapay"
      alt="Donate (Liberapay)" />
  </a>

  <a href="https://patreon.com/jeffreytse">
    <img src="https://img.shields.io/badge/support-patreon-F96854.svg?style=flat-square"
      alt="Donate (Patreon)" />
  </a>

  <a href="https://ko-fi.com/jeffreytse">
  <img height="20" src="https://www.ko-fi.com/img/githubbutton_sm.svg"
  alt="Donate (Ko-fi)" />
  </a>
</p>

<div align="center">
  <sub>Built with ❤︎ by
  <a href="https://jeffreytse.net">jeffreytse</a> and
  <a href="https://github.com/jeffreytse/cactus-tunnel/graphs/contributors">contributors </a>
  </sub>
</div>

<br>

Hey, nice to meet you, you found this charming tool. Here the
_Cactus Tunnel_ is a TCP tunnel tool over websocket and browser. It can help
you open a TCP tunnel to the outside world through the browser in an extremely
restricted environment, just like a cactus under the scorching sun to absorb
nutrients in the endless desert. **If you are a thirsty and honey geek and
focus on finding outside hydration, don't miss it.**

<p align="center">
Like this charming tool? You can give it a star or sponsor me!<br>
I will respect your crucial support and say THANK YOU!
</p>

<p align="center">

  <img src="https://user-images.githubusercontent.com/9413601/207098540-229261d7-7055-4578-9d27-792269a7b2b6.png" alt="Tunnel Structure" width="100%"/>

</p>

## Installation

Install the tool from [NPM](https://www.npmjs.com/package/cactus-tunnel):

```sh
npm install -g cactus-tunnel
```

## Usages

The help instructions of this tool:

```sh
$ cactus-tunnel help

Usage: cactus-tunnel help [command]

TCP tunnel over websocket and browser

Options:
  -V, --version                       output the version number
  -h, --help                          display help for command

Commands:
  client [options] <server> <target>  runs cactus-tunnel in client mode
  server [options]                    runs cactus-tunnel in server mode
  help [command]                      display help for command
```

### Tunnel Server

The help instructions of tunnel server:

```sh
$ cactus-tunnel help server

Usage: cactus-tunnel server [options]

runs cactus-tunnel in server mode

Options:
  -p, --port <port>         tunnel server listening port (default: 7800)
  -h, --hostname <address>  tunnel server listening hostname (default: "0.0.0.0")
  -v, --verbose             enable verbose output
  --help                    display help for command
```

Start a tunnel server:

```sh
cactus-tunnel server

```

### Tunnel Client

The help instructions of tunnel client:

```sh
$ cactus-tunnel help client

Usage: cactus-tunnel client [options] <server> <target>

runs cactus-tunnel in client mode

Arguments:
  server                            tunnel server url, empty is bridge mode, e.g.
                                    ws://your-tunnel-server:7800
  target                            tunnel target url, e.g. your-linux-ssh-server:22

Options:
  -p, --port <port>                 tunnel client listening port (default: 7700)
  -h, --hostname <address>          tunnel client listening hostname (default: "127.0.0.1")
  -b, --bridge-mode                 enable tunnel bridge mode
  -nb, --no-browser                 disable auto open browser when in bridge mode
  -bp, --bridge-port <port>         tunnel bridge listening port (default: 7900)
  -bh, --bridge-hostname <address>  tunnel bridge listening hostname (default: "127.0.0.1")
  -v, --verbose                     enable verbose output
  --help                            display help for command
```

Start a tunnel client:

```sh
cactus-tunnel client -b ws://localhost:7800 api.ipify.com:80
```

This command will start a server at address `localhost:7700` in bridge mode,
and open the tunnel bridge on the web browser.

```sh
curl http://localhost:7700/?format=json
```

When you connect to the port `7700`, it will auto connect to the specified
tunnel server `localhost:7800` and connect to target host `api.ipify:80`, you
will get your server ip address through [the IP API lookup service](https://www.ipify.com),
the response content is similar as below:

```sh
$ curl http://localhost:7700/?format=json
{"ip":"201.xxx.xxx.138"}%
```

### Import the package

A simple example:

```js
import cactusTunnel from "cactus-tunnel";

const options = {
  port: 1234,
  hostname: localhost,
};

const server = new cactusTunnel.Server({
  listen: {
    port: options.port,
    hostname: options.hostname,
  },
  logger: {
    silent: options.verbose ? false : true,
  },
});

console.info(`server listening at: http://${options.hostname}:${options.port}`);
```

## Development

To set up your environment to develop this tool, run `npm install`.

Your environment is setup just like a normal node project! To test your
project, run `npm start:cli help`. This shows help instructions of CLI
tool. You can edit the source code under `src`, `bin`, `test`, etc. like
normal to test NodeJS project. As you make modifications to the source
code and configuration files, you need to rerun the command and you
should see the changes, just like normal.

## Contributing

Issues and Pull Requests are greatly appreciated. If you've never
contributed to an open source project before I'm more than happy to walk
you through how to create a pull request.

You can start by [opening an issue](https://github.com/jeffreytse/cactus-tunnel/issues/new)
describing the problem that you're looking to resolve and we'll go from there.

## License

This theme is licensed under the [MIT license](https://opensource.org/licenses/mit-license.php) © JeffreyTse.

<!-- External links -->

