.. Gladius documentation master file, created by
   sphinx-quickstart on Sun Jun 10 18:42:56 2012.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Welcome to Gladius's documentation!
===================================

Gladius is a 3D game engine, written entirely in JavaScript, and designed to run
in the browser. We leverage existing web technologies whenever possible and
where gaps exist in support for games, we develop new solutions.

The engine consists of a core set of functionality that is common to all games
and simulations like the game loop, messaging, tasks and timers. Common
components like the spatial transform are also provided by the core. More
specialized funcionality, like graphics or physics, is encapsulated into engine
extensions that are designed to run on top of the core. A common set of
extensions is maintained as part of this project, and support for third-party
extensions is a strong design objective.

.. toctree::
   :maxdepth: 1

   engine/overview
   extensions/overview

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`

