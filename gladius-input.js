/*
Copyright (c) 2011-2012, Mozilla Foundation
Copyright (c) 2011-2012, Alan Kligman
Copyright (c) 2011-2012, Robert Richter
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    Neither the name of the Mozilla Foundation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function( root, factory ) {

  if ( typeof exports === "object" ) {
    // Node
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define( factory );
  } else if( root.Gladius ) {
    // Browser globals
    root.Gladius["gladius-input"] = factory();
  } else {
    throw new Error( "failed to load gladius-input; depends on Gladius" );
  }

}( this, function() {

/**
 * almond 0.1.1 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice,
        main, req;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {},
            nameParts, nameSegment, mapValue, foundMap, i, j, part;

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            return true;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                break;
                            }
                        }
                    }
                }

                foundMap = foundMap || starMap[nameSegment];

                if (foundMap) {
                    nameParts.splice(0, i, foundMap);
                    name = nameParts.join('/');
                    break;
                }
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, ret, map, i;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name],
                        config: makeConfig(name)
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else if (!defining[depName]) {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("../tools/almond", function(){});

if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('base/extension',['require'],function ( require ) {

  var Extension = function( name, options ) {
    if( typeof name !== "string" || name.length === 0 ) {
      throw new Error( "extension needs a non-trivial name" );
    }
    this.name = name;

    options = options || {};
    var serviceNames, serviceName, service;
    var componentNames, componentName, component;
    var resourceNames, resourceName, resource;
    var i, l;
    var j, m;

    this.services = {};
    if( options.hasOwnProperty( "services" ) ) {
      serviceNames = Object.keys( options.services );
      for( i = 0, l = serviceNames.length; i < l; ++ i ) {
        serviceName = serviceNames[i];
        service = options.services[serviceName];
        if( typeof service === "function" ) {
          this.services[serviceName] = service;
        } else if( typeof service === "object" ) {
          this.services[serviceName] = {};
          this.services[serviceName].service = service.service;

          if( service.hasOwnProperty( "components" ) ) {
            this.services[serviceName].components = {};
            componentNames = Object.keys( service.components );
            for( j = 0, m = componentNames.length; j < m; ++ j ) {
              componentName = componentNames[j];
              this.services[serviceName].components[componentName] = service.components[componentName];
            }
          }

          if( service.hasOwnProperty( "resources" ) ) {
            this.services[serviceName].resources = {};
            resourceNames = Object.keys( service.resources );
            for( j = 0, m = resourceNames.length; j < m; ++ j ) {
              resourceName = resourceNames[j];
              this.services[serviceName].resources[resourceName] = service.resources[resourceName];
            }
          }
        } else {
          throw new Error( "malformed extension" );
        }
      }
    }

    this.components = {};
    if( options.hasOwnProperty( "components" ) ) {
      this.components = options.components;
    }

    this.resources = {};
    if( options.hasOwnProperty( "resources" ) ) {
      this.resources = options.resources;
    }
  };

  return Extension;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('common/guid',['require'],function ( require ) {
  

  function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }).toUpperCase();
  }

  return guid;

});

/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * when
 * A lightweight CommonJS Promises/A and when() implementation
 *
 * when is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @version 1.0.4
 */

(function(define) {
define('when',[],function() {
    var freeze, reduceArray, undef;

    /**
     * No-Op function used in method replacement
     * @private
     */
    function noop() {}

    /**
     * Allocate a new Array of size n
     * @private
     * @param n {number} size of new Array
     * @returns {Array}
     */
    function allocateArray(n) {
        return new Array(n);
    }

    /**
     * Use freeze if it exists
     * @function
     * @private
     */
    freeze = Object.freeze || function(o) { return o; };

    // ES5 reduce implementation if native not available
    // See: http://es5.github.com/#x15.4.4.21 as there are many
    // specifics and edge cases.
    reduceArray = [].reduce ||
        function(reduceFunc /*, initialValue */) {
            // ES5 dictates that reduce.length === 1

            // This implementation deviates from ES5 spec in the following ways:
            // 1. It does not check if reduceFunc is a Callable

            var arr, args, reduced, len, i;

            i = 0;
            arr = Object(this);
            len = arr.length >>> 0;
            args = arguments;

            // If no initialValue, use first item of array (we know length !== 0 here)
            // and adjust i to start at second item
            if(args.length <= 1) {
                // Skip to the first real element in the array
                for(;;) {
                    if(i in arr) {
                        reduced = arr[i++];
                        break;
                    }

                    // If we reached the end of the array without finding any real
                    // elements, it's a TypeError
                    if(++i >= len) {
                        throw new TypeError();
                    }
                }
            } else {
                // If initialValue provided, use it
                reduced = args[1];
            }

            // Do the actual reduce
            for(;i < len; ++i) {
                // Skip holes
                if(i in arr)
                    reduced = reduceFunc(reduced, arr[i], i, arr);
            }

            return reduced;
        };

    /**
     * Trusted Promise constructor.  A Promise created from this constructor is
     * a trusted when.js promise.  Any other duck-typed promise is considered
     * untrusted.
     */
    function Promise() {}

    /**
     * Create an already-resolved promise for the supplied value
     * @private
     *
     * @param value anything
     * @return {Promise}
     */
    function resolved(value) {

        var p = new Promise();

        p.then = function(callback) {
            checkCallbacks(arguments);

            var nextValue;
            try {
                if(callback) nextValue = callback(value);
                return promise(nextValue === undef ? value : nextValue);
            } catch(e) {
                return rejected(e);
            }
        };

        return freeze(p);
    }

    /**
     * Create an already-rejected {@link Promise} with the supplied
     * rejection reason.
     * @private
     *
     * @param reason rejection reason
     * @return {Promise}
     */
    function rejected(reason) {

        var p = new Promise();

        p.then = function(callback, errback) {
            checkCallbacks(arguments);

            var nextValue;
            try {
                if(errback) {
                    nextValue = errback(reason);
                    return promise(nextValue === undef ? reason : nextValue)
                }

                return rejected(reason);

            } catch(e) {
                return rejected(e);
            }
        };

        return freeze(p);
    }

    /**
     * Helper that checks arrayOfCallbacks to ensure that each element is either
     * a function, or null or undefined.
     *
     * @param arrayOfCallbacks {Array} array to check
     * @throws {Error} if any element of arrayOfCallbacks is something other than
     * a Functions, null, or undefined.
     */
    function checkCallbacks(arrayOfCallbacks) {
        var arg, i = arrayOfCallbacks.length;
        while(i) {
            arg = arrayOfCallbacks[--i];
            if (arg != null && typeof arg != 'function') throw new Error('callback is not a function');
        }
    }

    /**
     * Creates a new, CommonJS compliant, Deferred with fully isolated
     * resolver and promise parts, either or both of which may be given out
     * safely to consumers.
     * The Deferred itself has the full API: resolve, reject, progress, and
     * then. The resolver has resolve, reject, and progress.  The promise
     * only has then.
     *
     * @memberOf when
     * @function
     *
     * @returns {Deferred}
     */
    function defer() {
        var deferred, promise, listeners, progressHandlers, _then, _progress, complete;

        listeners = [];
        progressHandlers = [];

        /**
         * Pre-resolution then() that adds the supplied callback, errback, and progback
         * functions to the registered listeners
         *
         * @private
         *
         * @param [callback] {Function} resolution handler
         * @param [errback] {Function} rejection handler
         * @param [progback] {Function} progress handler
         *
         * @throws {Error} if any argument is not null, undefined, or a Function
         */
        _then = function unresolvedThen(callback, errback, progback) {
            // Check parameters and fail immediately if any supplied parameter
            // is not null/undefined and is also not a function.
            // That is, any non-null/undefined parameter must be a function.
            checkCallbacks(arguments);

            var deferred = defer();

            listeners.push(function(promise) {
                promise.then(callback, errback)
                    .then(deferred.resolve, deferred.reject, deferred.progress);
            });

            progback && progressHandlers.push(progback);

            return deferred.promise;
        };

        /**
         * Registers a handler for this {@link Deferred}'s {@link Promise}.  Even though all arguments
         * are optional, each argument that *is* supplied must be null, undefined, or a Function.
         * Any other value will cause an Error to be thrown.
         *
         * @memberOf Promise
         *
         * @param [callback] {Function} resolution handler
         * @param [errback] {Function} rejection handler
         * @param [progback] {Function} progress handler
         *
         * @throws {Error} if any argument is not null, undefined, or a Function
         */
        function then(callback, errback, progback) {
            return _then(callback, errback, progback);
        }

        /**
         * Resolves this {@link Deferred}'s {@link Promise} with val as the
         * resolution value.
         *
         * @memberOf Resolver
         *
         * @param val anything
         */
        function resolve(val) {
            complete(resolved(val));
        }

        /**
         * Rejects this {@link Deferred}'s {@link Promise} with err as the
         * reason.
         *
         * @memberOf Resolver
         *
         * @param err anything
         */
        function reject(err) {
            complete(rejected(err));
        }

        /**
         * @private
         * @param update
         */
        _progress = function(update) {
            var progress, i = 0;
            while (progress = progressHandlers[i++]) progress(update);
        };

        /**
         * Emits a progress update to all progress observers registered with
         * this {@link Deferred}'s {@link Promise}
         *
         * @memberOf Resolver
         *
         * @param update anything
         */
        function progress(update) {
            _progress(update);
        }

        /**
         * Transition from pre-resolution state to post-resolution state, notifying
         * all listeners of the resolution or rejection
         *
         * @private
         *
         * @param completed {Promise} the completed value of this deferred
         */
        complete = function(completed) {
            var listener, i = 0;

            // Replace _then with one that directly notifies with the result.
            _then = completed.then;

            // Replace complete so that this Deferred can only be completed
            // once. Also Replace _progress, so that subsequent attempts to issue
            // progress throw.
            complete = _progress = function alreadyCompleted() {
                // TODO: Consider silently returning here so that parties who
                // have a reference to the resolver cannot tell that the promise
                // has been resolved using try/catch
                throw new Error("already completed");
            };

            // Free progressHandlers array since we'll never issue progress events
            // for this promise again now that it's completed
            progressHandlers = undef;

            // Notify listeners
            // Traverse all listeners registered directly with this Deferred

            while (listener = listeners[i++]) {
                listener(completed);
            }

            listeners = [];
        };

        /**
         * The full Deferred object, with both {@link Promise} and {@link Resolver}
         * parts
         * @class Deferred
         * @name Deferred
         * @augments Resolver
         * @augments Promise
         */
        deferred = {};

        // Promise and Resolver parts
        // Freeze Promise and Resolver APIs

        /**
         * The Promise API
         * @namespace Promise
         * @name Promise
         */
        promise = new Promise();
        promise.then = deferred.then = then;

        /**
         * The {@link Promise} for this {@link Deferred}
         * @memberOf Deferred
         * @name promise
         * @type {Promise}
         */
        deferred.promise = freeze(promise);

        /**
         * The {@link Resolver} for this {@link Deferred}
         * @namespace Resolver
         * @name Resolver
         * @memberOf Deferred
         * @name resolver
         * @type {Resolver}
         */
        deferred.resolver = freeze({
            resolve:  (deferred.resolve  = resolve),
            reject:   (deferred.reject   = reject),
            progress: (deferred.progress = progress)
        });

        return deferred;
    }

    /**
     * Determines if promiseOrValue is a promise or not.  Uses the feature
     * test from http://wiki.commonjs.org/wiki/Promises/A to determine if
     * promiseOrValue is a promise.
     *
     * @param promiseOrValue anything
     *
     * @returns {Boolean} true if promiseOrValue is a {@link Promise}
     */
    function isPromise(promiseOrValue) {
        return promiseOrValue && typeof promiseOrValue.then === 'function';
    }

    /**
     * Register an observer for a promise or immediate value.
     *
     * @function
     * @name when
     * @namespace
     *
     * @param promiseOrValue anything
     * @param {Function} [callback] callback to be called when promiseOrValue is
     *   successfully resolved.  If promiseOrValue is an immediate value, callback
     *   will be invoked immediately.
     * @param {Function} [errback] callback to be called when promiseOrValue is
     *   rejected.
     * @param {Function} [progressHandler] callback to be called when progress updates
     *   are issued for promiseOrValue.
     *
     * @returns {Promise} a new {@link Promise} that will complete with the return
     *   value of callback or errback or the completion value of promiseOrValue if
     *   callback and/or errback is not supplied.
     */
    function when(promiseOrValue, callback, errback, progressHandler) {
        // Get a promise for the input promiseOrValue
        // See promise()
        var trustedPromise = promise(promiseOrValue);

        // Register promise handlers
        return trustedPromise.then(callback, errback, progressHandler);
    }

    /**
     * Returns promiseOrValue if promiseOrValue is a {@link Promise}, a new Promise if
     * promiseOrValue is a foreign promise, or a new, already-resolved {@link Promise}
     * whose resolution value is promiseOrValue if promiseOrValue is an immediate value.
     *
     * Note that this function is not safe to export since it will return its
     * input when promiseOrValue is a {@link Promise}
     *
     * @private
     *
     * @param promiseOrValue anything
     *
     * @returns Guaranteed to return a trusted Promise.  If promiseOrValue is a when.js {@link Promise}
     *   returns promiseOrValue, otherwise, returns a new, already-resolved, when.js {@link Promise}
     *   whose resolution value is:
     *   * the resolution value of promiseOrValue if it's a foreign promise, or
     *   * promiseOrValue if it's a value
     */
    function promise(promiseOrValue) {
        var promise, deferred;

        if(promiseOrValue instanceof Promise) {
            // It's a when.js promise, so we trust it
            promise = promiseOrValue;

        } else {
            // It's not a when.js promise.  Check to see if it's a foreign promise
            // or a value.

            deferred = defer();
            if(isPromise(promiseOrValue)) {
                // It's a compliant promise, but we don't know where it came from,
                // so we don't trust its implementation entirely.  Introduce a trusted
                // middleman when.js promise

                // IMPORTANT: This is the only place when.js should ever call .then() on
                // an untrusted promise.
                promiseOrValue.then(deferred.resolve, deferred.reject, deferred.progress);
                promise = deferred.promise;

            } else {
                // It's a value, not a promise.  Create an already-resolved promise
                // for it.
                deferred.resolve(promiseOrValue);
                promise = deferred.promise;
            }
        }

        return promise;
    }

    /**
     * Return a promise that will resolve when howMany of the supplied promisesOrValues
     * have resolved. The resolution value of the returned promise will be an array of
     * length howMany containing the resolutions values of the triggering promisesOrValues.
     *
     * @memberOf when
     *
     * @param promisesOrValues {Array} array of anything, may contain a mix
     *      of {@link Promise}s and values
     * @param howMany
     * @param [callback]
     * @param [errback]
     * @param [progressHandler]
     *
     * @returns {Promise}
     */
    function some(promisesOrValues, howMany, callback, errback, progressHandler) {
        var toResolve, results, ret, deferred, resolver, rejecter, handleProgress, len, i;

        len = promisesOrValues.length >>> 0;

        toResolve = Math.max(0, Math.min(howMany, len));
        results = [];
        deferred = defer();
        ret = when(deferred, callback, errback, progressHandler);

        // Wrapper so that resolver can be replaced
        function resolve(val) {
            resolver(val);
        }

        // Wrapper so that rejecter can be replaced
        function reject(err) {
            rejecter(err);
        }

        // Wrapper so that progress can be replaced
        function progress(update) {
            handleProgress(update);
        }

        function complete() {
            resolver = rejecter = handleProgress = noop;
        }

        // No items in the input, resolve immediately
        if (!toResolve) {
            deferred.resolve(results);

        } else {
            // Resolver for promises.  Captures the value and resolves
            // the returned promise when toResolve reaches zero.
            // Overwrites resolver var with a noop once promise has
            // be resolved to cover case where n < promises.length
            resolver = function(val) {
                // This orders the values based on promise resolution order
                // Another strategy would be to use the original position of
                // the corresponding promise.
                results.push(val);

                if (!--toResolve) {
                    complete();
                    deferred.resolve(results);
                }
            };

            // Rejecter for promises.  Rejects returned promise
            // immediately, and overwrites rejecter var with a noop
            // once promise to cover case where n < promises.length.
            // TODO: Consider rejecting only when N (or promises.length - N?)
            // promises have been rejected instead of only one?
            rejecter = function(err) {
                complete();
                deferred.reject(err);
            };

            handleProgress = deferred.progress;

            // TODO: Replace while with forEach
            for(i = 0; i < len; ++i) {
                if(i in promisesOrValues) {
                    when(promisesOrValues[i], resolve, reject, progress);
                }
            }
        }

        return ret;
    }

    /**
     * Return a promise that will resolve only once all the supplied promisesOrValues
     * have resolved. The resolution value of the returned promise will be an array
     * containing the resolution values of each of the promisesOrValues.
     *
     * @memberOf when
     *
     * @param promisesOrValues {Array} array of anything, may contain a mix
     *      of {@link Promise}s and values
     * @param [callback] {Function}
     * @param [errback] {Function}
     * @param [progressHandler] {Function}
     *
     * @returns {Promise}
     */
    function all(promisesOrValues, callback, errback, progressHandler) {
        var results, promise;

        results = allocateArray(promisesOrValues.length);
        promise = reduce(promisesOrValues, reduceIntoArray, results);

        return when(promise, callback, errback, progressHandler);
    }

    function reduceIntoArray(current, val, i) {
        current[i] = val;
        return current;
    }

    /**
     * Return a promise that will resolve when any one of the supplied promisesOrValues
     * has resolved. The resolution value of the returned promise will be the resolution
     * value of the triggering promiseOrValue.
     *
     * @memberOf when
     *
     * @param promisesOrValues {Array} array of anything, may contain a mix
     *      of {@link Promise}s and values
     * @param [callback] {Function}
     * @param [errback] {Function}
     * @param [progressHandler] {Function}
     *
     * @returns {Promise}
     */
    function any(promisesOrValues, callback, errback, progressHandler) {

        function unwrapSingleResult(val) {
            return callback(val[0]);
        }

        return some(promisesOrValues, 1, unwrapSingleResult, errback, progressHandler);
    }

    /**
     * Traditional map function, similar to `Array.prototype.map()`, but allows
     * input to contain {@link Promise}s and/or values, and mapFunc may return
     * either a value or a {@link Promise}
     *
     * @memberOf when
     *
     * @param promisesOrValues {Array} array of anything, may contain a mix
     *      of {@link Promise}s and values
     * @param mapFunc {Function} mapping function mapFunc(value) which may return
     *      either a {@link Promise} or value
     *
     * @returns {Promise} a {@link Promise} that will resolve to an array containing
     *      the mapped output values.
     */
    function map(promisesOrValues, mapFunc) {

        var results, i;

        // Since we know the resulting length, we can preallocate the results
        // array to avoid array expansions.
        i = promisesOrValues.length;
        results = allocateArray(i);

        // Since mapFunc may be async, get all invocations of it into flight
        // asap, and then use reduce() to collect all the results
        for(;i >= 0; --i) {
            if(i in promisesOrValues)
                results[i] = when(promisesOrValues[i], mapFunc);
        }

        // Could use all() here, but that would result in another array
        // being allocated, i.e. map() would end up allocating 2 arrays
        // of size len instead of just 1.  Since all() uses reduce()
        // anyway, avoid the additional allocation by calling reduce
        // directly.
        return reduce(results, reduceIntoArray, results);
    }

    /**
     * Traditional reduce function, similar to `Array.prototype.reduce()`, but
     * input may contain {@link Promise}s and/or values, but reduceFunc
     * may return either a value or a {@link Promise}, *and* initialValue may
     * be a {@link Promise} for the starting value.
     *
     * @memberOf when
     *
     * @param promisesOrValues {Array} array of anything, may contain a mix
     *      of {@link Promise}s and values
     * @param reduceFunc {Function} reduce function reduce(currentValue, nextValue, index, total),
     *      where total is the total number of items being reduced, and will be the same
     *      in each call to reduceFunc.
     * @param initialValue starting value, or a {@link Promise} for the starting value
     *
     * @returns {Promise} that will resolve to the final reduced value
     */
    function reduce(promisesOrValues, reduceFunc, initialValue) {

        var total, args;

        total = promisesOrValues.length;

        // Skip promisesOrValues, since it will be used as 'this' in the call
        // to the actual reduce engine below.

        // Wrap the supplied reduceFunc with one that handles promises and then
        // delegates to the supplied.

        args = [
            function (current, val, i) {
                return when(current, function (c) {
                    return when(val, function (value) {
                        return reduceFunc(c, value, i, total);
                    });
                });
            }
        ];

        if (arguments.length >= 3) args.push(initialValue);

        return promise(reduceArray.apply(promisesOrValues, args));
    }

    /**
     * Ensure that resolution of promiseOrValue will complete resolver with the completion
     * value of promiseOrValue, or instead with resolveValue if it is provided.
     *
     * @memberOf when
     *
     * @param promiseOrValue
     * @param resolver {Resolver}
     * @param [resolveValue] anything
     *
     * @returns {Promise}
     */
    function chain(promiseOrValue, resolver, resolveValue) {
        var useResolveValue = arguments.length > 2;

        return when(promiseOrValue,
            function(val) {
				if(useResolveValue) val = resolveValue;
                resolver.resolve(val);
				return val;
            },
			function(e) {
				resolver.reject(e);
				return rejected(e);
			},
            resolver.progress
        );
    }

    //
    // Public API
    //

    when.defer     = defer;

    when.isPromise = isPromise;
    when.some      = some;
    when.all       = all;
    when.any       = any;

    when.reduce    = reduce;
    when.map       = map;

    when.chain     = chain;

    return when;
});
})(typeof define == 'function'
    ? define
    : function (factory) { typeof module != 'undefined'
        ? (module.exports = factory())
        : (this.when      = factory());
    }
    // Boilerplate for AMD, Node, and browser global
);

if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/function-task',['require','common/guid','when'],function ( require ) {

  var guid = require( "common/guid" );
  var when = require( "when" );

  var Complete = function( value ) {
    if( !( this instanceof Complete ) ) {
      return new Complete( value );
    }
    this.value = value;
  };
  
  var DefaultSchedule = function() {
    if( !( this instanceof DefaultSchedule ) ) {
      return new DefaultSchedule();
    }
    this.tags = [];
    this.dependsOn = [];
  };

  // Task states
  var T_STARTED = 0,
  T_PAUSED = 1,
  T_CANCELLED = 2,
  T_CLOSED = 3;

  // Run states
  var R_RUNNING = 0,
  R_BLOCKED = 1,
  R_RESOLVED = 2,
  R_REJECTED = 3;

  var FunctionTask = function( scheduler, thunk, schedule, context ) {
    this.id = guid();
    this._thunk = thunk;
    this._taskState = T_PAUSED;
    this._runState = R_RESOLVED;
    this._scheduler = scheduler;
    this._schedule = schedule || DefaultSchedule();
    this.result = undefined;
    this._deferred = when.defer();
    this.then = this._deferred.promise.then;
    this._context = context || this;
  };

  function start( schedule ) {
    this._schedule = schedule || this._schedule;
    if( this._taskState !== T_PAUSED ) {
      throw new Error( "task is already started or completed" );
    }
    this._taskState = T_STARTED;
    if( this._runState !== R_BLOCKED ) {
      this._scheduler.insert( this, this.id, this._schedule );
    }
    return this;
  }

  function pause() {
    if( this._runState === R_RUNNING ) {
      throw new Error( "task can only be paused while blocked" );
    }
    this._taskState = T_PAUSED;
    this._scheduler.remove( this.id );      
    return this;
  }

  function cancel() {
    if( this._runState === R_RUNNING ) {
      throw new Error( "tasks can only be cancelled while blocked" );
    }
    this._taskState = T_CANCELLED;
    this._scheduler.insert( this, this.id );
    return this;
  }

  function isStarted() {
    return this._taskState === T_STARTED;
  }

  function isRunning() {
    return this._runState === R_RUNNING;
  }
  
  function isComplete() {
    return this._taskState === T_CLOSED;
  }

  // TD: this will need to change for cooperative tasks
  // TD: most of this prototype can be factored into a Task base
  function run() {
    var task = this;
    var result = task.result;
    task.result = undefined;
    task._scheduler.current = task;
    
    try{
      task._runState = R_RUNNING;
      if( task._taskState === T_CANCELLED ) {
        task._runState = R_RESOLVED;
        task._taskState = T_CLOSED;
      } else if( task._taskState === T_STARTED ) {
        // Run the task
        result = task._thunk.call( this._context, result );
        task._runState = R_BLOCKED;

        // Process the result
        if( result instanceof Complete ) {
          task.result = result.value;
          task._taskState = T_CLOSED;
          task._runState = R_RESOLVED;
          task._deferred.resolve( task.result );
        } else {
          task.result = when( result,
          // callback
          function( value ) {
            task.result = value;
            task._runState = R_RESOLVED;
            if( task._taskState === T_STARTED ) {
              task._scheduler.insert( task, task.id, task._schedule );
            }
          },
          // errback
          function( error ) {
            task.result = error;
            task._runState = R_REJECTED;
            if( task._threadState === T_STARTED ) {
              task._scheduler.insert( task, task.id, task._schedule );
            }
          }
          );
        }
      } else {
        throw Error( "task is not runnable" );
      }
    } catch( exception ) {
      task.result = exception;
      task._runState = R_REJECTED;
      task._deferred.reject( exception );
    }
    
    task._scheduler.current = null;
    return this;
  }

  function toString() {
    return "[object FunctionTask " + this.id + "]";
  }

  FunctionTask.prototype = {
      pause: pause,
      start: start,
      cancel: cancel,
      isStarted: isStarted,
      isRunning: isRunning,
      isComplete: isComplete,
      toString: toString,
      run: run,
      when: when,
      Complete: Complete
  };
  
  return FunctionTask;

} );
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('base/service',['require','core/function-task'],function( require ) {

  var Task = require( "core/function-task" );

  var Service = function( scheduler, schedules, dependsOn ) {
    this._schedules = schedules || {};
    this.dependsOn = dependsOn || [];
    this._tasks = {};
    this._registeredComponents = {};

    if( scheduler ) {
      var i, l;
      var callbackNames = Object.keys( this._schedules );
      for( i = 0, l = callbackNames.length; i < l; ++ i ) {
        var callbackName = callbackNames[i];
        if( !this[callbackName] ) {
          throw new Error( "missing scheduler target: " + callbackName );
        }
        var schedule = this._schedules[callbackName] || {};
        // Create a new task to run this callback
        this._tasks[callbackName] = new Task( scheduler, this[callbackName],
            schedule, this );
        this._tasks[callbackName].start();
      }
    }
  };
  
  function registerComponent( id, component ) {
    if( !this._registeredComponents.hasOwnProperty( component.type ) ) {
      this._registeredComponents[component.type] = {};
    }
    this._registeredComponents[component.type][id] = component;
    
    return this;
  }
  
  function unregisterComponent( id, component ) {
    if( this._registeredComponents.hasOwnProperty( component.type ) &&
        this._registeredComponents[component.type].hasOwnProperty( id ) ) {
      delete this._registeredComponents[component.type][id];
    }
    
    return this;
  }
  
  function suspend() {
    var i, l;
    var taskNames = Object.keys( this._tasks );
    for( i = 0, l = taskNames.length; i < l; ++ i ) {
      var taskName = taskNames[i];
      this._tasks[taskName].pause();
    }
    
    return this;
  }
  
  function resume() {
    var i, l;
    var taskNames = Object.keys( this._tasks );
    for( i = 0, l = taskNames.length; i < l; ++ i ) {
      var taskName = taskNames[i];
      var schedule = this._schedules[taskName] || {};
      this._tasks[taskName].start( schedule );
    }
    
    return this;
  }
  
  function handleEvent( event ) {
    var i, l;

    if( "on" + event.type in this ) {
      var handler = this["on" + event.type];
      try {
        handler.call( this, event );
      } catch( error ) {
        console.log( error );
      }
    }
  }

  Service.prototype = {
      registerComponent: registerComponent,
      unregisterComponent: unregisterComponent,
      suspend: suspend,
      resume: resume,
      handleEvent: handleEvent
  };

  return Service;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/event',['require'],function( require ) {

  function dispatch() {
    var dispatchList = Array.prototype.slice.call( arguments, 0 );
    var i, l;

    if( dispatchList.length > 0 && Array.isArray( dispatchList[0] ) ) {
      dispatchList = dispatchList[0];
    } 
    for( i = 0, l = dispatchList.length; i < l; ++ i ) {
      try {
        var handler = dispatchList[i];
        if( handler.handleEvent ) {
          handler.handleEvent.call( handler, this );
        }
      } catch( error ) {
        console.log( error );
      }
    }
  }

  var Event = function( type, data, queue ) {
    if( undefined === type || type.length < 1 ) {
      throw new Error( "event must have a non-trivial type" );
    }
    this.type = type;
    this.data = data;
    if( undefined === queue ) {
      queue = true;
    }
    this.queue = queue;
    this.dispatch = dispatch.bind( this );
  };

  return Event;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('src/services/DOMKeyMapper',['require'],function ( require ) {

  function DOMKeyMapper(){
    this.keys = []; // Keys by keyCode

    this._keyCodes.forEach( function( arr ) {
      var keyName = arr[0];
      var keyCode = arr[1];

      this.keys[keyCode] = keyName;
    }.bind(this));
  };

  function getKeyName( code ) {
    //TODO: Talk to ack about this borked commented-out code so that it does the correct key mapping as intended
//    switch (code) {
//      case 8:
//        return 46; // delete on Mac
//      case 61:
//        return 109; // + on Mac
//      case 91: // META L (Saf/Mac)
//      case 93: // META R (Saf/Mac)
//      case 224: // META (FF/Mac)
//        return 157;
//      case 57392: // CONTROL (Op/Mac)
//        return 17;
//      case 45: // INSERT
//        return 155;
//    }
    return this.keys[code];
  }

  DOMKeyMapper.prototype._keyCodes = [
    ['BACK', 0x08],
    ['TAB', 0x09],
    ['CLEAR', 0x0C],
    ['RETURN', 0x0D],
    ['SHIFT', 0x10],
    ['CONTROL', 0x11],
    ['MENU', 0x12],
    ['PAUSE', 0x13],
    ['CAPITAL', 0x14],
    ['KANA', 0x15],
    ['HANGUL', 0x15],
    ['JUNJA', 0x17],
    ['FINAL', 0x18],
    ['HANJA', 0x19],
    ['KANJI', 0x19],//TODO: Find out if this is a bug or not. Has same number as preceding keyCode
    ['ESCAPE', 0x1B],
    ['CONVERT', 0x1C],
    ['NONCONVERT', 0x1D],
    ['ACCEPT', 0x1E],
    ['MODECHANGE', 0x1F],
    ['SPACE', 0x20],
    ['PRIOR', 0x21],
    ['NEXT', 0x22],
    ['END', 0x23],
    ['HOME', 0x24],
    ['LEFT', 0x25],
    ['UP', 0x26],
    ['RIGHT', 0x27],
    ['DOWN', 0x28],
    ['SELECT', 0x29],
    ['PRINT', 0x2A],
    ['EXECUTE', 0x2B],
    ['SNAPSHOT', 0x2C],
    ['INSERT', 0x2D],
    ['DELETE', 0x2E],
    ['HELP', 0x2F],
    ['0', 0x30],
    ['1', 0x31],
    ['2', 0x32],
    ['3', 0x33],
    ['4', 0x34],
    ['5', 0x35],
    ['6', 0x36],
    ['7', 0x37],
    ['8', 0x38],
    ['9', 0x39],
    ['A', 0x41],
    ['B', 0x42],
    ['C', 0x43],
    ['D', 0x44],
    ['E', 0x45],
    ['F', 0x46],
    ['G', 0x47],
    ['H', 0x48],
    ['I', 0x49],
    ['J', 0x4A],
    ['K', 0x4B],
    ['L', 0x4C],
    ['M', 0x4D],
    ['N', 0x4E],
    ['O', 0x4F],
    ['P', 0x50],
    ['Q', 0x51],
    ['R', 0x52],
    ['S', 0x53],
    ['T', 0x54],
    ['U', 0x55],
    ['V', 0x56],
    ['W', 0x57],
    ['X', 0x58],
    ['Y', 0x59],
    ['Z', 0x5A],
    ['LWIN', 0x5B],
    ['RWIN', 0x5C],
    ['APPS', 0x5D],
    ['SLEEP', 0x5F],
    ['NUMPAD0', 0x60],
    ['NUMPAD1', 0x61],
    ['NUMPAD2', 0x62],
    ['NUMPAD3', 0x63],
    ['NUMPAD4', 0x64],
    ['NUMPAD5', 0x65],
    ['NUMPAD6', 0x66],
    ['NUMPAD7', 0x67],
    ['NUMPAD8', 0x68],
    ['NUMPAD9', 0x69],
    ['MULTIPLY', 0x6A],
    ['ADD', 0x6B],
    ['SEPARATOR', 0x6C],
    ['SUBTRACT', 0x6D],
    ['DECIMAL', 0x6E],
    ['DIVIDE', 0x6F],
    ['F1', 0x70],
    ['F2', 0x71],
    ['F3', 0x72],
    ['F4', 0x73],
    ['F5', 0x74],
    ['F6', 0x75],
    ['F7', 0x76],
    ['F8', 0x77],
    ['F9', 0x78],
    ['F10', 0x79],
    ['F11', 0x7A],
    ['F12', 0x7B],
    ['F13', 0x7C],
    ['F14', 0x7D],
    ['F15', 0x7E],
    ['F16', 0x7F],
    ['F17', 0x80],
    ['F18', 0x81],
    ['F19', 0x82],
    ['F20', 0x83],
    ['F21', 0x84],
    ['F22', 0x85],
    ['F23', 0x86],
    ['F24', 0x87],
    ['NUMLOCK', 0x90],
    ['SCROLL', 0x91],
    ['LSHIFT', 0xA0],
    ['RSHIFT', 0xA1],
    ['LCONTROL', 0xA2],
    ['RCONTROL', 0xA3],
    ['LMENU', 0xA4],
    ['RMENU', 0xA5],
    ['BROWSER_BACK', 0xA6],
    ['BROWSER_FORWARD', 0xA7],
    ['BROWSER_REFRESH', 0xA8],
    ['BROWSER_STOP', 0xA9],
    ['BROWSER_SEARCH', 0xAA],
    ['BROWSER_FAVORITES', 0xAB],
    ['BROWSER_HOME', 0xAC],
    ['VOLUME_MUTE', 0xAD],
    ['VOLUME_DOWN', 0xAE],
    ['VOLUME_UP', 0xAF],
    ['MEDIA_NEXT_TRACK', 0xB0],
    ['MEDIA_PREV_TRACK', 0xB1],
    ['MEDIA_STOP', 0xB2],
    ['MEDIA_PLAY_PAUSE', 0xB3],
    ['MEDIA_LAUNCH_MAIL', 0xB4],
    ['MEDIA_LAUNCH_MEDIA_SELECT', 0xB5],
    ['MEDIA_LAUNCH_APP1', 0xB6],
    ['MEDIA_LAUNCH_APP2', 0xB7],
    ['OEM_1', 0xBA],
    ['OEM_PLUS', 0xBB],
    ['OEM_COMMA', 0xBC],
    ['OEM_MINUS', 0xBD],
    ['OEM_PERIOD', 0xBE],
    ['OEM_2', 0xBF],
    ['OEM_3', 0xC0],
    ['OEM_4', 0xDB],
    ['OEM_5', 0xDC],
    ['OEM_6', 0xDD],
    ['OEM_7', 0xDE],
    ['OEM_8', 0xDF],
    ['OEM_102', 0xE2],
    ['PROCESSKEY', 0xE5],
    ['PACKET', 0xE7],
    ['ATTN', 0xF6],
    ['CRSEL', 0xF7],
    ['EXSEL', 0xF8],
    ['EREOF', 0xF9],
    ['PLAY', 0xFA],
    ['ZOOM', 0xFB],
    ['NONAME', 0xFC],
    ['PA1', 0xFD],
    ['OEM_CLEAR', 0xFE],
    ['UNKNOWN', 0]
  ];

  DOMKeyMapper.prototype.getKeyName = getKeyName;
  return DOMKeyMapper;
});

if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('src/services/dispatcher',['require','base/service','core/event','src/services/DOMKeyMapper'],function ( require ) {

  var Service = require( "base/service" );
  var Event = require( "core/event" );
  var DOMKeyMapper = require( "src/services/DOMKeyMapper" );
  
  var Dispatcher = function( scheduler, options ) {
    options = options || {};

    var schedules = {
      "dispatch": {
        tags: ["@input"],
        dependsOn: []
      }
    };
    Service.call( this, scheduler, schedules );

    if ( 'element' in options ) {
      this.element = options.element;
    } else {
      this.element = document;
    }

    this.DOMKeyMapper = new DOMKeyMapper();

    this._queue = [];

    var self = this;
    function dispatcherKeyHandler(event) {
      self._queue.push(event);
    }

    this.element.addEventListener("keydown", dispatcherKeyHandler, false);
    this.element.addEventListener("keyup", dispatcherKeyHandler, false);

  };

  function dispatch(){

    var controllers = this._registeredComponents["Controller"];
    var controllerIds = Object.keys( controllers );
    var domEvent, keyCodeString, domCode, gladiusEvent;
    var i, l, controllerIndex, controllerLimit;
    for (i = 0, l = this._queue.length; i < l; ++ i){
      // get the event code from the DOM
      domEvent = this._queue[i];
      domCode = domEvent.which ? domEvent.which : domEvent.keyCode;

      // translate it into keyCode string
      keyCodeString = this.DOMKeyMapper.getKeyName(domCode);

      // create Event from DOM event
      if (domEvent.type === "keydown"){
        gladiusEvent = new Event("KeyDown", keyCodeString);
      }else if (domEvent.type === "keyup"){
        gladiusEvent = new Event("KeyUp", keyCodeString);
      }else{
        throw new Error("A DOM event type was encountered which was not keydown or keyup in dispatcher");
      }

      // dispatch each event to every controller we have that will handle it

      for (controllerIndex = 0, controllerLimit = controllerIds.length;
           controllerIndex < controllerLimit;
           ++ controllerIndex){
        gladiusEvent.dispatch(controllers[controllerIds[controllerIndex]]);
      }
    }
    this._queue = [];

    var component, entityId;
    var registeredComponents = this._registeredComponents;

    var updateEvent = new Event( 'Update', undefined, false);
    for( var componentType in registeredComponents ) {
      for( entityId in registeredComponents[componentType] ) {
        component = registeredComponents[componentType][entityId];
        while( component.handleQueuedEvent() ) {}
        updateEvent.dispatch( component );
      }
    }
  }

  Dispatcher.prototype = new Service();
  Dispatcher.prototype.constructor = Dispatcher;
  Dispatcher.prototype.dispatch = dispatch;
  return Dispatcher;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('common/extend',['require'],function ( require ) {
  

  function extend( object, extra ) {
    for ( var prop in extra ) {                
      if ( !object.hasOwnProperty( prop ) && extra.hasOwnProperty( prop ) ) {
        object[prop] = extra[prop];
      }
    }
    return object;
  }

  return extend;

});

if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('base/component',['require','core/event'],function( require ) {

  var Event = require( "core/event" );

  var Component = function( type, provider, dependsOn ) {
    this.type = type; // String identifying the type of this component
    this.provider = provider; // Reference to the object instance that provides
                              // this component
    this.dependsOn = dependsOn || []; // List of component types that this
                                      // component depends on
    this.owner = null; // Reference to the entity instance that owns this
    this._queuedEvents = []; // List of queued events
  };

  function setOwner( owner ) {
    if( owner !== this.owner ) {
      var previous = this.owner;
      this.owner = owner;
      var event = new Event(
        'ComponentOwnerChanged',
        {
          current: owner,
          previous: previous
        },
        false
      );
      event.dispatch( this );
    }
  }

  function handleEvent( event ) {
    if( "on" + event.type in this ) {
      if( event.queue ) {
        this._queuedEvents.push( event );
      } else {
        var handler = this["on" + event.type];
        try {
          handler.call( this, event );
        } catch( error ) {
          console.log( error );
        }
      }
    }
  }

  function handleQueuedEvent() {
    if( this._queuedEvents.length > 0 ) {
      var event = this._queuedEvents.shift();
      if( "on" + event.type in this ) {
        var handler = this["on" + event.type];
        try {
          handler.call( this, event );
        } catch( error ) {
          console.log( error );
        }
      }
    }
    return this._queuedEvents.length;
  }

  Component.prototype = {
      setOwner: setOwner,
      handleEvent: handleEvent,
      handleQueuedEvent: handleQueuedEvent
  };

  return Component;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('src/resources/map',['require'],function ( require ) {
  var Map = function( map ) {
    map = map || {};
    if (typeof map === "string"){
      map = JSON.parse( map );
    }
    this.States = (undefined !== map.States ) ? map.States : {};
    this.Actions = (undefined !== map.Actions ) ? map.Actions : {};
    this._validate();
  };
  Map.prototype = {
    _validate: function _mapValidate() {

      //This could probably have its length cut in half by making a function that gets called from in here.
      this._validateSubmap(this.Actions, "action");
      this._validateSubmap(this.States, "state");
    },
    _validateSubmap: function _validateSubmap(submap, submapName){
      var submapLength, submapIndex;
      var submapKeys = Object.keys(submap);
      for ( submapIndex = 0, submapLength = submapKeys.length; submapIndex < submapLength; ++ submapIndex ) {
        if (!(typeof submap[submapKeys[submapIndex]] == "string")){
          if ( !Array.isArray(submap[submapKeys[submapIndex]])) {
            throw new Error("map contains " + submapName + " " + submapKeys[submapIndex] +
              " that is not a string or array");
          } else {
            var i, l;
            var submapArray = submap[submapKeys[submapIndex]];
            if (submapArray.length === 0){
              throw new Error("map contains a(n) " + submapName + " array called " + submapKeys[submapIndex] + " of length 0");
            }
            for (i = 0, l = submapArray.length; i < l; ++ i){
              if (typeof submapArray[i] !== "string"){
                throw new Error("map contains " + submapName + " " + submapArray[i] +
                  " in a(n) " + submapName + " array. That " + submapName + " is not a string and the map is invalid as a result");
              }
            }
          }
        }
      }
    }
  }
  
  return Map;
});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('src/components/controller',['require','common/extend','base/component','src/resources/map','core/event'],function ( require ) {
  var extend = require( "common/extend" );
  var Component = require( "base/component" );
  var Map = require("src/resources/map");
  var Event = require( "core/event" );

  var Controller = function(service, map){
    Component.call( this, "Controller", service, [] );
    var that = this;
    var stateIndex, stateLength, keyIndex, keyLength;
    var actionIndex, actionLength;

    this.map = (undefined !== map ) ? map: new Map();
    this.states = {};
    this._stateMapping = {};
    //The following code segment reverses the mapping of states to keys that is
    // in map into a mapping of keys to states. This is useful in keyDown and
    // keyUp when we want to find out what keys correspond to what states.
    var states = Object.keys(this.map.States);
    for (stateIndex = 0, stateLength = states.length; stateIndex < stateLength; ++ stateIndex){
      var keys = this.map.States[states[stateIndex]];
      //The current state will have either one key or an array of keys mapped to it
      if (Array.isArray(keys)){
        for ( keyIndex = 0, keyLength = keys.length; keyIndex < keyLength; ++ keyIndex){
          this._mapKey(this._stateMapping, keys[keyIndex], states[stateIndex]);
        }
      }else{
        this._mapKey(this._stateMapping, keys, states[stateIndex]);
      }
      this.states[states[stateIndex]] = false;
    }

    this._actionMapping = {};
    //See above comments but for actions
    var actions = Object.keys(this.map.Actions);
    for (actionIndex = 0, actionLength = actions.length; actionIndex < actionLength; ++ actionIndex){
      var keys = this.map.Actions[actions[actionIndex]];
      if (Array.isArray(keys)){
        for ( keyIndex = 0, keyLength = keys.length; keyIndex < keyLength; ++ keyIndex){
          this._mapKey(this._actionMapping, keys[keyIndex], actions[actionIndex]);
        }
      }else{
        this._mapKey(this._actionMapping, keys, actions[actionIndex]);
      }
    }
  };

  Controller.prototype = new Component();
  Controller.prototype.constructor = Controller;

  //toMap is either a state or an action, depending on if this method was given
  // this._actionMapping or this._stateMapping
  function _mapKey(keyMapping, keyName, toMap){
    var currentMapping = keyMapping[keyName];
    //if no states are mapped to this key yet then map the toMap to the key
    if (undefined === currentMapping){
      keyMapping[keyName] = toMap;
    //otherwise if there is a toMap mapped then turn the mapping into an array
    // including the already mapped toMap and the new toMap
    }else if (typeof currentMapping === "string"){
      keyMapping[keyName] = [currentMapping, toMap];
    //otherwise we have multiple states mapped already, just add another one onto the array
    }else{
      keyMapping[keyName][currentMapping.length] = toMap;
    }
  }

  function onUpdate( event ) {

  }

  function onKeyDown( event ) {
    var key = event.data;
    if (undefined !== this._stateMapping[key]){
      if (Array.isArray(this._stateMapping[key])){
        var i, l;
        for (i = 0, l = this._stateMapping[key].length; i < l; ++ i){
          this.states[this._stateMapping[key][i]] = true;
        }
        if (this.owner){
          for (i = 0, l = this._stateMapping[key].length; i < l; ++ i){
            this.owner.handleEvent(new Event(this._stateMapping[key][i], true));
          }
        }
      }else{
        this.states[this._stateMapping[key]] = true;
        if (this.owner){
          this.owner.handleEvent(new Event(this._stateMapping[key], true));
        }
      }
    }
    if (undefined !== this._actionMapping[key]){
      if (Array.isArray(this._actionMapping[key])){
        for (var i = 0, l = this._actionMapping[key].length; i < l; ++ i){
          this.owner.handleEvent(new Event(this._actionMapping[key][i]));
        }
      }
      else if (this.owner){
        this.owner.handleEvent(new Event(this._actionMapping[key]));
      }
    }
  }

  function onKeyUp ( event ) {
    var key = event.data;
    if (undefined !== this._stateMapping[key]){
      if (Array.isArray(this._stateMapping[key])){
        var i, l;
        for (i = 0, l = this._stateMapping[key].length; i < l; ++ i){
          this.states[this._stateMapping[key][i]] = false;
        }
        if (this.owner){
          for (i = 0, l = this._stateMapping[key].length; i < l; ++ i){
            this.owner.handleEvent(new Event(this._stateMapping[key][i], false));
          }
        }
      }else{
        this.states[this._stateMapping[key]] = false;
        if (this.owner){
          this.owner.handleEvent(new Event(this._stateMapping[key], false));
        }
      }
    }
  }

  function onEntitySpaceChanged( event ) {
    var data = event.data;
    if( data.previous === null && data.current !== null && this.owner !== null ) {
      this.provider.registerComponent( this.owner.id, this );
    }

    if( data.previous !== null && data.current === null && this.owner !== null ) {
      this.provider.unregisterComponent( this.owner.id, this );
    }
  }

  function onComponentOwnerChanged( event ) {
    var data = event.data;
    if( data.previous === null && this.owner !== null ) {
      this.provider.registerComponent( this.owner.id, this );
    }

    if( this.owner === null && data.previous !== null ) {
      this.provider.unregisterComponent( data.previous.id, this );
    }
  }

  function onEntityActivationChanged( event ) {
    var active = event.data;
    if( active ) {
      this.provider.registerComponent( this.owner.id, this );
    } else {
      this.provider.unregisterComponent( this.owner.id, this );
    }
  }

  var prototype = {
    _mapKey: _mapKey,
    onKeyDown: onKeyDown,
    onKeyUp: onKeyUp,
    onUpdate: onUpdate,
    onEntitySpaceChanged: onEntitySpaceChanged,
    onComponentOwnerChanged: onComponentOwnerChanged,
    onEntityActivationChanged: onEntityActivationChanged
  };
  extend( Controller.prototype, prototype );

  return Controller;
});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('../src/gladius-input',['require','base/extension','src/services/dispatcher','src/components/controller','src/resources/map'],function ( require ) {

  var Extension = require( "base/extension" );

  return new Extension( "gladius-input", {
      
      services: {
        "dispatcher": {
          service: require( "src/services/dispatcher" ),
          components: {
            Controller: require( "src/components/controller" )
          },
          resources: {
          }
        }
      },
      
      components: {
      },
      
      resources: {
        Map: require( "src/resources/map" )
      }
      
  });

});

  var extension = require( "../src/gladius-input" );

  return extension;
  
}));

