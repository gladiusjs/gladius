Gladius
=======

* [FAQ](https://github.com/gladiusjs/gladius-core/wiki/Faq)
* [IRC](irc://irc.mozilla.org/#games)
* [Mailing List](https://lists.mozilla.org/listinfo/community-games)
* [Twitter](https://twitter.com/#!/gladiusjs)
* [Contributors](https://github.com/gladiusjs/gladius-core/contributors)
* [Blog](http://blog.ottodestrukt.org) -- I usually blog about Gladius here
* [Docs](http://gladius.readthedocs.org/en/latest/index.html)

# Gladius is a 3D game engine

Gladius is a 3D game engine, written entirely in JavaScript, and designed to run in the browser. We leverage existing web technologies whenever possible and where gaps exist in support for games, we develop new solutions.

The engine consists of a core set of functionality that is common to all games and simulations like the game loop, messaging, tasks and timers. Common components like the spatial transform are also provided by the core. More specialized funcionality, like graphics or physics, is encapsulated into engine extensions that are designed to run on top of the core. A common set of extensions is maintained as part of this project, and support for third-party extensions is a strong design objective.

An engine instance is comprised of the engine core plus a set of extensions.

# Related projects

We are also building a set of tools and libraries for building games. They are designed to be generally useful and reusable in other projects as well.

<b>Check out our [roadmap](https://github.com/gladiusjs/gladius-core/wiki/Roadmap) for more details.<b>

# Getting Started

Start by cloning the repository or downloading a zipped version from github.
Inside the project directory you'll find pre-built versions of the following modules:

* gladius-core: the engine core; you'll definitely need to load this
* gladius-cubicvr: CubicVR rendering backend

We tested the examples with these module versions.
If you build your own modules, the examples might still work, but they also might not.
We're working on more modules to add support for user input, 2d and 3d physics, and additional 2d and 3d backends.

### Using requirejs

You can load these modules using requirejs:

````javascript
var Gladius = require( "gladius-core" );
var engine = new Gladius();
````

Check out the examples to see how this is done.

### Using a script tag

You can also load Gladius using a script tag:

````HTML
<script src="gladius-core.js"></script>
<script>
  var engine = new Gladius();
</script>
````

If you load Gladius with a script tag you'll find a global engine constructor named Gladius.
Loading extensions this way will add them as properties on the global Gladius object.
For example:

````HTML
<script src="gladius-core.js"></script>
<script src="gladius-cubicvr.js"></script>
<script>
  Gladius; // global engine constructor
  Gladius["gladius-cubicvr"]; // gladius-cubicvr extension you loaded
</script>
````

## Examples

Check out the `examples` in the top-level project directory.
You will need a web server that can serve files from the project directory.
Follow these instructions if you would like to use the server that comes with Gladius.

1. Make sure you have a recent version of `node` installed (>=0.6). See [here](http://nodejs.org/) for details on how to do this for your platform.
2. Install `jake` globally.

            npm install -g jake

3. Run the web server.

            jake serve

4. Go to the following URL in your browser to view the examples. Be sure to use a recent version of Firefox or Chrome.

            http://localhost:8080/examples

# Contributing

This repository contains only the compiled modules that you need to start using Gladius.
If you're interested in contributing to the core or other modules, you can find project repositories here:

* [gladius-core](https://github.com/gladiusjs/gladius-core)
* [gladius-cubicvr](https://github.com/gladiusjs/gladius-cubicvr)
* [gladius-box2d](https://github.com/gladiusjs/gladius-box2d)
* [gladius-input](https://github.com/gladiusjs/gladius-input)

We would also love to work with anyone interested in writing great examples or documentation.

# License and Notes

See [LICENSE](https://github.com/gladiusjs/gladius/blob/develop/LICENSE) for more information.

All our logos are handmade by [Sean Martell](https://twitter.com/#!/mart3ll).
