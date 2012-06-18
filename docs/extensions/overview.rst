Extensions Overview
===================

Gladius features an extension system that allows libraries to be created that
easily integrate with the engine and provide new functionality that the core
library does not provide.

An extension is a collection of three types of items: components, resources, and
services.

Components
----------

Components are chunks of functionality and state that can be attached to
entities. The ``cubicvr`` extension, for example, provides a ``model`` component
that contains both the data for displaying a 3d model and logic to help render
it. In order to render an entity to the screen, you attach a model component to
the entity and configure it to the model you want displayed.

Components can also respond to events. If a component has an ``onX`` function
(where ``X`` is replaced with the event type), the function will be called when
an event with a matching type is dispatched to the component.

Components can depend on other components in order to function. When a component
is added to an entity that does not have other components that it depends on,
an error is thrown.

Resources
---------

Resources are types of data that generally don't change and are shared among
several entities. This includes things like 3d models, textures, sounds, etc.
Extensions don't define individual resources, but instead define functions that
can load resources. The ``cubicvr`` extension defines resources for things like
light definitions and meshes.

A resource provided by an extension is a function that takes in a piece of data
and produces some type of resource. This data is typically retrieved via an
``XMLHttpRequest``, although this behavior can be customized. The returned
data is passed to the resource constructor.

Services
--------

Services are lists of tasks that are executed during the game loop. Each task
in a service defines which phase of processing it takes part in: input, update,
or render. Tasks can also define dependencies between eachother, so that tasks
that require other tasks to be complete can be scheduled correctly. For example,
the ``cubicvr`` extension defines a render task, tied to the render phase, which
handles rendering entities in 3d space.