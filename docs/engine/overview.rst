Engine Overview
===============

Engine Layout
-------------

Gladius is comprised of several modules, almost all of which are implemented as
:doc:`extensions</extensions/overview>`:

* ``gladius-core`` provides the core functionality of the engine.
* ``gladius-input`` provides player input functions.
* ``gladius-cubicvr`` provides 3d rendering capabilities using the ``cubicvr``
   library.
* ``gladius-box2d`` provides physics via the ``box2d`` library.

Components, Entities, and Spaces, Oh My!
----------------------------------------

Gladius uses an Entity-Component system to model the game world. In other words,
behaviors, such as rendering graphics, computing physics, and playing sound, are
defined by **components**. An **entity** is a collection of components, and
represents  something in the game world. A **space** is a collection of
entities.

Components both perform some function and contain the state for that function.
Entities are nothing more than dumb containers that manage their components, and
don't carry any state. Components can be configured and swapped around between
entities.

The Game Loop
-------------

The game loop in Gladius is split into three phases: input, update, and render.

The **input** phase is for reading input from various devices, including the
keyboard, mouse, gamepads, etc. The ``gladius-input`` extension provides a set
of input devices and convenient plumbing for retrieving the input state.

The **update** phase is for updating game state. This includes calculating
movement, applying physics, performing collision checks, and other core game
logic. During this phase he updater service provided by ``gladius-core`` will
trigger an updateevent on every registered component.

The **render** phase is when graphics are actually rendered to the screen.
Typically extensions like ``gladius-cubicvr`` will handle this phase.

Services
--------

A **service** is a collection of tasks that will be run during the game loop. A
**task** is a function that is associated with a game loop phase and a set of
tags. These tags are used to resolve dependencies between tasks; several tasks
can be under a ``physics`` tag, while another task can depend on the ``physics``
tag so that it does not execute until all the ``physics`` tasks are complete.