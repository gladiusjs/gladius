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
  } else if( !root.Gladius ) {
    // Browser globals
    root.Gladius = factory();
  }

}( this, function() {

/**
 * almond 0.0.3 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
/*jslint strict: false, plusplus: false */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {

    var defined = {},
        waiting = {},
        aps = [].slice,
        main, req;

    if (typeof define === "function") {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
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
                baseName = baseName.split("/");
                baseName = baseName.slice(0, baseName.length - 1);

                name = baseName.concat(name.split("/"));

                //start trimDots
                var i, part;
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
                            break;
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
            main.apply(undef, args);
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

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, i, ret, map;

        //Use name if no relName
        if (!relName) {
            relName = name;
        }

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Default to require, exports, module if no deps if
            //the factory arg has any arguments specified.
            if (!deps.length && callback.length) {
                deps = ['require', 'exports', 'module'];
            }

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
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
                        exports: defined[name]
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw name + ' missing ' + depName;
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef) {
                    defined[name] = cjsModule.exports;
                } else if (!usingExports) {
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

    requirejs = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {

            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            //Drop the config stuff on the ground.
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = arguments[2];
            } else {
                deps = [];
            }
        }

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
    req.config = function () {
        return req;
    };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (define.unordered) {
            waiting[name] = [name, deps, callback];
        } else {
            main(name, deps, callback);
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../tools/almond", function(){});

/**
 * @license
 * Copyright (c) 2011, Mozilla Foundation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 *     Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *     Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 *     Neither the name of the Mozilla Foundation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function (root, factory) {

  if ( typeof exports === 'object' ) {
    // Node
    module.exports = factory();
  } else if ( typeof define === 'function' && define.amd ) {
    // AMD. Register as an anonymous module.
    define('_math',[],factory);
  } else if ( !root._Math ) {
    // Browser globals
    root._Math = factory();
  }

}(this, function () {


/**
 * almond 0.0.3 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
/*jslint strict: false, plusplus: false */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {

    var defined = {},
        waiting = {},
        aps = [].slice,
        main, req;

    if (typeof define === "function") {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
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
                baseName = baseName.split("/");
                baseName = baseName.slice(0, baseName.length - 1);

                name = baseName.concat(name.split("/"));

                //start trimDots
                var i, part;
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
                            break;
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
            main.apply(undef, args);
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

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, i, ret, map;

        //Use name if no relName
        if (!relName) {
            relName = name;
        }

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Default to require, exports, module if no deps if
            //the factory arg has any arguments specified.
            if (!deps.length && callback.length) {
                deps = ['require', 'exports', 'module'];
            }

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
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
                        exports: defined[name]
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw name + ' missing ' + depName;
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef) {
                    defined[name] = cjsModule.exports;
                } else if (!usingExports) {
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

    requirejs = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {

            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            //Drop the config stuff on the ground.
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = arguments[2];
            } else {
                deps = [];
            }
        }

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
    req.config = function () {
        return req;
    };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (define.unordered) {
            waiting[name] = [name, deps, callback];
        } else {
            main(name, deps, callback);
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../tools/almond", function(){});

/*jshint white: false, strict: false, plusplus: false */
/*global define: false */

//JS language helpers.

//Array Remove - By John Resig (MIT Licensed)
//Done outside the define call since it should be immediately
//before dependency tracing is done for any module.
if ( !Array.prototype.remove ) {
    Array.prototype.remove = function(from, to) {
        var rest = this.slice( (to || from) + 1 || this.length );
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };
}

define('lang',['require'],function ( require ) {

    return {
        // Simple bind function to maintain "this" for a function.
        bind: function bind( obj, func ) {
            return function() {
                return func.apply( obj, arguments );
            };
        },

        extend: function extend( object, extra ) {
            for ( var prop in extra ) {
                if ( !object.hasOwnProperty( prop ) && extra.hasOwnProperty( prop ) ) {
                    object[prop] = extra[prop];
                } //if
            } //for
        } //extend
    };
});

/*jshint white: false, strict: false, plusplus: false, onevar: false,
  nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('constants',['require'],function ( require ) {

    return function() {
      
        var constants = {
                
                TAU: 2 * Math.PI,
                
                PI: Math.PI,
                
                HALF_PI: Math.PI / 2.0
                
        };
        
        return constants;
        
    };
    
});
/*jshint white: false, strict: false, plusplus: false, onevar: false,
  nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('vector/vector',['require'],function ( require ) {

    return function( FLOAT_ARRAY_TYPE ) {

        var Vector = function( dim, args ) {

            var elements = null;
            if( 1 === args.length ) {
                elements = args[0];
            } else {
                elements = args;
            }

            var vector = new FLOAT_ARRAY_TYPE( dim );
            for( var i = 0; i < dim; ++ i ) {
                vector[i] = elements[i];
            }

            return vector;

        };

        var vector = {
                
                $: Vector,

                add: function( v1, v2, result ) {
                    for( var i = 0; i < v1.length; ++ i ) {
                        result[i] += v1[i] + v2[i];
                    }

                    return result;
                },

                clear: function( v ) {
                    for( var i = 0; i < v.length; ++ i ) {
                        v[i] = 0;
                    }
                },

                dot: function( v1, v2 ) {
                    var res = 0;
                    for( var i = 0; i < v1.length; ++ i) {
                        res += v1[i] * v2[i];
                    }
                    return res;
                },

                equal: function( v1, v2, e ) {
                    e = e || 0.000001;

                    if( v1.length != v2.length ) {
                        return false;
                    }

                    var dim = v1.length;
                    for( var i = 0; i < dim; ++ i ) {
                        if ( Math.abs(v1[i] - v2[i]) > e ) {
                            return false;
                        }
                    }

                    return true;
                },

                length: function( v ) {
                    var va = 0;
                    for( var i = 0; i < v.length; ++ i ) {
                        va += v[i] * v[i];
                    }

                    return Math.sqrt(va);
                },

                multiply: function( v, s, result ) {
                    for( var i = 0; i < v.length; ++ i ) {
                        result[i] = v[i] * s;
                    }

                    return result;
                },
                
                negate: function( v, result ) {
                    for( var i = 0; i < v.length; ++ i ) {
                        result[i] = v[i] * -1;
                    }
                    
                    return result;
                },

                normalize: function( v, result ) {
                    var len = v.length;
                    for( var i = 0, abslen = vector.length(v); i < len; ++ i ) {
                        result[i] = v[i] / abslen;
                    }

                    return result;
                },

                subtract: function( v1, v2, result) {
                    for( var i = 0; i < v1.length; ++ i ) {
                        result[i] = v1[i] - v2[i];
                    }

                    return result;
                }        

        };
        
        Object.defineProperty( vector, 'x', {
            get: function() {
                return Vector2( [1, 0] );
            },
            enumerable: true
        });

        Object.defineProperty( vector, 'u', {
            get: function() {
                return Vector2( [1, 0] );
            },
            enumerable: true
        });

        Object.defineProperty( vector, 'y', {
            get: function() {
                return Vector2( [0, 1] );
            },
            enumerable: true
        });

        Object.defineProperty( vector, 'v', {
            get: function() {
                return Vector2( [0, 1] );
            },
            enumerable: true
        });

        Object.defineProperty( vector, 'zero', {
            get: function() {
                return Vector2( [0, 0] );
            },
            enumerable: true
        });

        Object.defineProperty( vector, 'one', {
            get: function() {
                return Vector2( [1, 1] );
            },
            enumerable: true
        });

        return vector;

    };

});
/*jshint white: false, strict: false, plusplus: false, onevar: false,
  nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('vector/vector2',['require','./vector','../constants'],function ( require ) {

    return function( FLOAT_ARRAY_TYPE ) {

        var vector = require( './vector' )( FLOAT_ARRAY_TYPE );
        var constants = require( '../constants' )();

        var Vector2 = function() {
            if( 0 === arguments.length ) {
                return vector.$( 2, [0, 0] );
            } else {
                return vector.$( 2, arguments );
            }
        };
        
        var vector2 = {
                
                $: Vector2,
          
                add: function( v1, v2, result ) {
                    result = result || Vector2();

                    return vector.add( v1, v2, result );
                },

                angle: function( v1, v2 ) {
                    var nV1 = Vector2();
                    var nV2 = Vector2();

                    vector.normalize(v1, nV1);
                    vector.normalize(v2, nV2);

                    return Math.acos( vector.dot( nV1, nV2 ) );
                },

                clear: vector.clear,

                dot: vector.dot,

                equal: vector.equal,

                length: vector.length,

                multiply: function( v, s, result ) {
                    result = result || Vector2();

                    return vector.multiply( v, s, result );
                },
                
                negate: function( v, result ) {
                    result = result || Vector2();
                    
                    return vector.negate( v, result );
                },

                normalize: function( v, result ) {
                    result = result || Vector2();
                    var len = vector.length(v);

                    result[0] = v[0]/len;
                    result[1] = v[1]/len;

                    return result;
                },
                
                project: function( v1, v2, result ) {
                    result = result || Vector2();
                    
                    var dp = v1[0]*v2[0] + v1[1]*v2[1];
                    var dp_over_v2_squared_length = dp / (v2[0]*v2[0] + v2[1]*v2[1]);

                    result[0] = dp_over_v2_squared_length * v2[0];
                    result[1] = dp_over_v2_squared_length * v2[1];
                    
                    return result;
                },
                
                set: function( v, x, y ) {
                    v[0] = x;
                    v[1] = y;
                },
                
                subtract: function( v1, v2, result ) {
                    result = result || Vector2();

                    return vector.subtract( v1, v2, result );
                }
                
        };
        
        Object.defineProperty( vector2, 'x', {
            get: function() {
                return Vector2( [1, 0] );
            },
            enumerable: true
        });

        Object.defineProperty( vector2, 'u', {
            get: function() {
                return Vector2( [1, 0] );
            },
            enumerable: true
        });

        Object.defineProperty( vector2, 'y', {
            get: function() {
                return Vector2( [0, 1] );
            },
            enumerable: true
        });

        Object.defineProperty( vector2, 'v', {
            get: function() {
                return Vector2( [0, 1] );
            },
            enumerable: true
        });

        Object.defineProperty( vector2, 'zero', {
            get: function() {
                return Vector2( [0, 0] );
            },
            enumerable: true
        });

        Object.defineProperty( vector2, 'one', {
            get: function() {
                return Vector2( [1, 1] );
            },
            enumerable: true
        });

        return vector2;

    };

});
/*jshint white: false, strict: false, plusplus: false, onevar: false,
  nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('vector/vector3',['require','./vector'],function ( require ) {

    return function( FLOAT_ARRAY_TYPE ) {

        var vector = require( './vector' )( FLOAT_ARRAY_TYPE );

        var Vector3 = function() {
            if( 0 === arguments.length ) {
                return vector.$( 3, [0, 0, 0] );
            } else {
                return vector.$( 3, arguments );
            }
        };

        var vector3 = {
                
                $: Vector3,

                add: function( v1, v2, result ) {
                    result = result || Vector3();

                    return vector.add( v1, v2, result );
                },

                angle: function( v1, v2 ) {

                    return Math.acos(
                            (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) /
                            (Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]) *
                                    Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2]))
                    );
                },

                clear: vector.clear,

                cross: function( v1, v2, result ) {
                    result = result || Vector3();

                    result[0] = (v1[1] * v2[2]) - (v2[1] * v1[2]);
                    result[1] = (v1[2] * v2[0]) - (v2[2] * v1[0]);
                    result[2] = (v1[0] * v2[1]) - (v2[0] * v1[1]);

                    return result;
                },

                dot: function( v1, v2 ) {
                    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
                },

                equal: vector.equal,

                length: vector.length,

                multiply: function( v, s, result ) {
                    result = result || Vector3();

                    return vector.multiply( v, s, result );
                },

                normal: function( v1, v2, result ) {
                    result = result || Vector3();

                    return Vector3.cross( v1, v2, result );
                },

                normalize: function( v, result ) {
                    result = result || Vector3();
                    var len = vector.length(v);

                    result[0] = v[0]/len;
                    result[1] = v[1]/len;
                    result[2] = v[2]/len;

                    return result;
                },
                
                set: function( v, x, y, z ) {
                    v[0] = x;
                    v[1] = y;
                    v[2] = z;
                },

                subtract: function( v1, v2, result ) {
                    result = result || Vector3();

                    return vector.subtract( v1, v2, result );
                }

        };
        
        Object.defineProperty( vector3, 'x', {
            get: function() {
                return Vector3( [1, 0, 0] );
            },
            enumerable: true
        });

        Object.defineProperty( vector3, 'y', {
            get: function() {
                return Vector3( [0, 1, 0] );
            },
            enumerable: true
        });

        Object.defineProperty( vector3, 'z', {
            get: function() {
                return Vector3( [0, 0, 1] );
            },
            enumerable: true
        });

        Object.defineProperty( vector3, 'zero', {
            get: function() {
                return Vector3( [0, 0, 0] );
            },
            enumerable: true
        });

        Object.defineProperty( vector3, 'one', {
            get: function() {
                return Vector3( [1, 1, 1] );
            },
            enumerable: true
        });

        return vector3;

    };

});
/*jshint white: false, strict: false, plusplus: false, onevar: false,
  nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('vector/vector4',['require','./vector'],function ( require ) {

    return function( FLOAT_ARRAY_TYPE ) {

        var vector = require( './vector' )( FLOAT_ARRAY_TYPE );

        var Vector4 = function() {
            if( 0 === arguments.length ) {
                return vector.$( 4, [0, 0, 0, 0] );
            } else {
                return vector.$( 4, arguments );
            }
        };

        var vector4 = {
                
                $: Vector4,

                add: function( v1, v2, result ) {
                    result = result || Vector4();

                    result[0] = v1[0] + v2[0];
                    result[1] = v1[1] + v2[1];
                    result[2] = v1[2] + v2[2];
                    result[3] = v1[3] + v2[3];

                    return result;
                },

                // Computes the angle between v1 and v2
                angle: function( v1, v2 ) {
                    return Math.acos(
                            (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2] + v1[3] * v2[3]) /
                            (Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2] + v1[3] * v1[3]) *
                                    Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2] + v2[3] * v2[3]))
                    );
                },

                clear: vector.clear,

                // Computes the dot product of v1 and v2
                dot: function( v1, v2 ) {
                    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2] + v1[3] * v2[3];
                },

                equal: vector.equal,

                length: vector.length,

                // Computes v * s
                multiply: function( v, s, result ) {
                    result = result || Vector4();

                    return vector.multiply( v, s, result );
                },

                // Computes a Vector4 with same direction as v having unit length
                normalize: function( v, result ) {
                    result = result || Vector4();
                    var len = vector.length(v);

                    result[0] = v[0]/len;
                    result[1] = v[1]/len;
                    result[2] = v[2]/len;
                    result[3] = v[3]/len;

                    return result;
                },
                
                set: function( v, x, y, z, w ) {
                    v[0] = x;
                    v[1] = y;
                    v[2] = z;
                    v[3] = w;
                },

                // Computes v1 - v2
                subtract: function( v1, v2, result ) {
                    result = result || Vector4();

                    return vector.subtract( v1, v2, result );
                }

        }
        
        Object.defineProperty( vector4, 'x', {
            get: function() {
                return Vector4( [1, 0, 0, 0] );
            },
            enumerable: true
        });

        Object.defineProperty( vector4, 'y', {
            get: function() {
                return Vector4( [0, 1, 0, 0] );
            },
            enumerable: true
        });
        
        Object.defineProperty( vector4, 'z', {
            get: function() {
                return Vector4( [0, 0, 1, 0] );
            },
            enumerable: true
        });
        
        Object.defineProperty( vector4, 'w', {
            get: function() {
                return Vector4( [0, 0, 0, 1] );
            },
            enumerable: true
        });

        Object.defineProperty( vector4, 'zero', {
            get: function() {
                return Vector4( [0, 0, 0, 0] );
            },
            enumerable: true
        });

        Object.defineProperty( vector4, 'one', {
            get: function() {
                return Vector4( [1, 1, 1, 1] );
            },
            enumerable: true
        });

        return vector4;

    };

});
/*jshint white: false, strict: false, plusplus: false, onevar: false,
  nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('vector/quaternion',['require','./vector4','./vector3'],function ( require ) {

    return function( FLOAT_ARRAY_TYPE ) {

        var vector4 = require( './vector4' )( FLOAT_ARRAY_TYPE );
        var vector3 = require( './vector3' )( FLOAT_ARRAY_TYPE );

        var Quaternion = vector4.$;

        var quaternion = {

                $: Quaternion,

                to: {
                    rpy: function( q, result ) {
                        var r = result || vector3.$();
                        var atan2 = Math.atan2,
                            asin = Math.asin;

                        r[0] = atan2( 2*q[0]*q[1] + 2*q[2]*q[3], 1 - 2*q[1]*q[1] + 2*q[2]*q[2] );
                        r[1] = asin( 2*q[0]*q[2] - 2*q[3]*q[1] );
                        r[2] = atan2( 2*q[0]*q[3] + 2*q[1]*q[2], 1 - 2*q[2]*q[2] + 2*q[3]*q[3] );

                        if( !result ) {
                            return r;
                        }
                    }
                },

                from: {
                    rpy: function( v, result ) {
                        var r = result || quaternion.$();
                        var sin = Math.sin,
                            cos = Math.cos;
                        var half_phi = v[0] / 2,
                            half_theta = v[1] / 2,
                            half_psi = v[2] / 2;
                        var sin_half_phi = sin( half_phi ),
                            cos_half_phi = cos( half_phi ),
                            sin_half_theta = sin( half_theta ),
                            cos_half_theta = cos( half_theta ),
                            sin_half_psi = sin( half_psi ),
                            cos_half_psi = cos( half_psi );

                        r[0] = cos_half_phi * cos_half_theta * cos_half_psi + 
                               sin_half_phi * sin_half_theta * sin_half_psi;
                        r[1] = sin_half_phi * cos_half_theta * cos_half_psi -
                               cos_half_phi * sin_half_theta * sin_half_psi;
                        r[2] = cos_half_phi * sin_half_theta * cos_half_psi +
                               sin_half_phi * cos_half_theta * sin_half_psi;
                        r[3] = cos_half_phi * cos_half_theta * sin_half_psi -
                               sin_half_phi * sin_half_theta * cos_half_psi;

                        if( !result ) {
                            return r;
                        }
                    }
                },

                length: vector4.length,

                multiply: function( q1, q2, result ) {
                    var r = result || quaternion.$();

                    r[0] = q1[3] * q2[0] + q1[0] * q2[3] + q1[1] * q2[2] - q1[2] * q2[1];   // x
                    r[1] = q1[3] * q2[1] - q1[0] * q2[2] + q1[1] * q2[3] + q1[2] * q2[0];   // y
                    r[2] = q1[3] * q2[2] + q1[0] * q2[1] - q1[1] * q2[0] + q1[2] * q2[3];   // z
                    r[3] = q1[3] * q2[3] - q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2];   // w

                    if( !result ) {
                        return r;
                    }
                },

                normalize: vector4.normalize

        };

        Object.defineProperty( quaternion, 'identity', {
            get: function() {
                return Quaternion( [0, 0, 0, 1] );
            },
            enumerable: true
        });

        return quaternion;

    };

});

/*jshint white: false, strict: false, plusplus: false, onevar: false,
  nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('matrix/matrix',['require'],function ( require ) {

    return function( FLOAT_ARRAY_TYPE ) {
      
        var Matrix = function( dim, args ) {
        
            var elements = null;
            if( 1 === args.length ) {
                elements = args[0];
            } else {
                elements = args;
            }
            
            var matrix = new FLOAT_ARRAY_TYPE( dim );
            for( var i = 0; i < dim; ++ i ) {
                matrix[i] = elements[i];
            }
            
            return matrix;
            
        };
        
        var matrix = {
                
            $: Matrix,
      
            add: function( m1, m2, result ) {
                for( var i = 0; i < m1.length; ++ i ) {
                    result[i] += m1[i] + m2[i];
                }

                return result;
            },
            
            subtract: function( m1, m2, result ) {
                for( var i = 0; i < m1.length; ++ i ) {
                    m1[i] -= m2[i];
                }
                return m1;
            },
            
            clear: function( m ) {
                for( var i = 0; i < m.length; ++ i ) {
                    m[i] = 0;
                }
            },
            
            equal: function( m1, m2, e ) {
                e = e || 0.000001;

                if( m1.length != m2.length ) {
                    return false;
                }
                
                var dim = m1.length;
                for( var i = 0; i < dim; ++ i ) {
                    if( Math.abs( m1[i] - m2[i] ) > e ) {
                        return false;
                    }
                }

                return true;
            }
                
        };
        
        return matrix;
        
    };
    
});

/*jshint white: false, strict: false, plusplus: false, onevar: false,
  nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('matrix/matrix2',['require','./matrix'],function ( require ) {

    return function( FLOAT_ARRAY_TYPE ) {

        var matrix = require( './matrix' )( FLOAT_ARRAY_TYPE );

        var Matrix2 = function() {
            if( 0 === arguments.length ) {
                return matrix.$( 4, [0, 0,
                                     0, 0] );
            } else {
                return matrix.$( 4, arguments );
            }
        };

        var matrix2 = {

            $: Matrix2,

            add: function( ml, result ) {
                result = result || Matrix2();
                var temp = ml[0];
                
                if (ml.length == 1)
                    result = temp;
                else {
                    for (var i = 1; i < ml.length; ++ i) {
                        result = matrix.add(temp, ml[i], result);
                        temp = result;
                    }
                }
                return result;
            },

            subtract: function( ml, result ) {
                result = result || Matrix2();
                var temp = ml[0];
                
                if (ml.length == 1) {
                    result = temp;
                } else {
                    var temp = ml[0];
                    for (var i = 1; i < ml.length; ++ i) {
                        result = matrix.subtract(temp, ml[i], result);
                        temp = result;
                    }
                }
                return result;
            },

            clear: matrix.clear,

            equal: matrix.equal,

            determinant: function( m ) {
                return m[0]*m[3] - m[1]*m[2];
            },
            
            inverse: function( m, result ) {
            
                var det = matrix2.determinant(m);
                if (det == 0)
                    throw 'matrix is singular';
                
                result = result || Matrix2();
                
                result[0] = m[3]/det;
                result[1] = m[1]*-1/det;
                result[2] = m[2]*-1/det;
                result[3] = m[0]/det;
                
                return result;
            },
            
            multiply: function( ml, result ) {
                result = result || Matrix2();
                
                if (ml.length == 1)
                    return ml[0];
                else {

                    var temp = ml[0];
                    for (var i = 1; i < ml.length; ++ i) {
                        result[0] = temp[0]*ml[i][0] + temp[1]*ml[i][2];
                        result[1] = temp[0]*ml[i][1] + temp[1]*ml[i][3];
                        result[2] = temp[2]*ml[i][0] + temp[3]*ml[i][2];
                        result[3] = temp[2]*ml[i][1] + temp[3]*ml[i][3];
                        temp = result;
                    }
                }
                return result;
            },
            
            transpose: function( m, result ) {
                result = result || Matrix2();
                
                var temp = m[1];
                result[0] = m[0];
                result[1] = m[2];
                result[2] = temp;
                result[3] = m[3];
                
                return result;
            }
        }

        Object.defineProperty( matrix2, 'zero', {
            get: function() {
                return Matrix2( [0, 0,
                                 0, 0] );
            },
            enumerable: true
        });
        
        Object.defineProperty( matrix2, 'one', {
            get: function() {
                return Matrix2( [1, 1,
                                 1, 1] );
            },
            enumerable: true
        });
        
        Object.defineProperty( matrix2, 'identity', {
            get: function() {
                return Matrix2( [1, 0,
                                 0, 1] );
            },
            enumerable: true
        });

        return matrix2;

    };

});
/*jshint white: false, strict: false, plusplus: false, onevar: false,
  nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('matrix/matrix3',['require','./matrix'],function ( require ) {

    return function( FLOAT_ARRAY_TYPE ) {

        var matrix = require( './matrix' )( FLOAT_ARRAY_TYPE );

        var Matrix3 = function() {
            if( 0 === arguments.length ) {
                return matrix.$( 9, [0, 0, 0,
                                     0, 0, 0,
                                     0, 0, 0] );
            } else {
                return matrix.$( 9, arguments );
            }
        };

        var matrix3 = {
                
            $: Matrix3,

            add: function( ml, result ) {
                result = result || Matrix3();
                
                if (ml.length == 1) {
                    return ml[0];
                } else {
                    var temp = ml[0];
                    for (var i = 1; i < ml.length; ++ i) {
                        result = matrix.add(temp, ml[i], result);
                        temp = result;
                    }
                }
                return result;
            },

            subtract: function( ml, result ) {
                result = result || Matrix3();
                var temp = ml[0];
                
                if (ml.length == 1)
                    result = temp;
                else {
                    for (var i = 1; i < ml.length; ++ i) {
                        result = matrix.subtract(temp, ml[i], result);
                        temp = result;
                    }
                }
                return result;
            },

            clear: matrix.clear,

            equal: matrix.equal,

            determinant: function( m ) {

                return m[0]*(m[4]*m[8] - m[5]*m[7]) 
                       - m[1]*(m[3]*m[8] - m[5]*m[6]) 
                       + m[2]*(m[3]*m[7] - m[4]*m[6]);
            },
            
            inverse: function( m, result ) {
                var det = matrix3.determinant(m);
                if (det == 0)
                    throw 'matrix is singular';
                
                result = result || Matrix3();
                
                result[0] = (m[8]*m[4] - m[7]*m[5])/det;
                result[1] = -(m[8]*m[1] - m[7]*[2])/det;
                result[2] = (m[5]*m[1] - m[4]*m[2])/det;
                
                result[3] = -(m[8]*m[3] - m[6]*m[5])/det;
                result[4] = (m[8]*m[0] - m[6]*m[2])/det;
                result[5] = -(m[5]*m[0] - m[3]*m[2])/det;
                
                result[6] = (m[7]*m[3] - m[6]*m[4])/det;
                result[7] = -(m[7]*m[0] - m[6]*m[1])/det;
                result[8] = (m[4]*m[0] - m[3]*m[1])/det;

                return result;
            },
            
            multiply: function( ml, result ) {
                result = result || Matrix3();
                
                if (ml.length == 1)
                    return ml[0];
                else {

                    var temp = ml[0];
                    for (var i = 1; i < ml.length; ++ i) {

                        result[0] = temp[0]*ml[i][0] + temp[1]*ml[i][3] + temp[2]*ml[i][6];
                        result[1] = temp[0]*ml[i][1] + temp[1]*ml[i][4] + temp[2]*ml[i][7];
                        result[2] = temp[0]*ml[i][2] + temp[1]*ml[i][5] + temp[2]*ml[i][8];

                        result[3] = temp[3]*ml[i][0] + temp[4]*ml[i][3] + temp[5]*ml[i][6];
                        result[4] = temp[3]*ml[i][1] + temp[4]*ml[i][4] + temp[5]*ml[i][7];
                        result[5] = temp[3]*ml[i][2] + temp[4]*ml[i][5] + temp[5]*ml[i][8];

                        result[6] = temp[6]*ml[i][0] + temp[7]*ml[i][3] + temp[8]*ml[i][6];
                        result[7] = temp[6]*ml[i][1] + temp[7]*ml[i][4] + temp[8]*ml[i][7];
                        result[8] = temp[6]*ml[i][2] + temp[7]*ml[i][5] + temp[8]*ml[i][8];
                        
                        temp = result;
                    }
                }
                return result;
            },
            
            // Convert a vector rotation (in radians) to a 3x3 matrix
            rotate: function( v, result ) {
                var r = result || matrix3.identity;

                var sinA,
                    cosA;

                var ml;
                if( 0 !== v[2] ) {
                    sinA = Math.sin( v[2] );
                    cosA = Math.cos( v[2] );
                    ml = [];
                    ml.push(matrix3.$([ cosA, sinA, 0,
                                       -sinA, cosA, 0,
                                        0, 0, 1 ] ));
                    ml.push(matrix3.$(r));
                    
                    matrix3.multiply( ml, r );
                }

                if( 0 !== v[1] ) {
                    sinA = Math.sin( v[1] );
                    cosA = Math.cos( v[1] );
                    ml = [];
                    ml.push(matrix3.$([ cosA, 0, -sinA,
                                        0, 1, 0,
                                        sinA, 0, cosA ] ));
                    ml.push(matrix3.$(r));
                    
                    matrix3.multiply( ml, r );
                }

                if( 0 !== v[0] ) {
                    sinA = Math.sin( v[0] );
                    cosA = Math.cos( v[0] );
                    ml = [];
                    ml.push(matrix3.$([ 1, 0, 0,
                                        0, cosA, sinA,
                                        0, -sinA, cosA ] ));
                    ml.push(matrix3.$(r));
                    
                    matrix3.multiply( ml, r );
                }

                if( !result ) {
                    return r;
                }
            },

            transpose: function( m, result ) {
                result = result || Matrix3();

                var a01 = m[1], a02 = m[2], a12 = m[5];
                
                result[0] = m[0];
                result[1] = m[3];
                result[2] = m[6];
                result[3] = a01;
                result[4] = m[4];
                result[5] = m[7];
                result[6] = a02;
                result[7] = a12;
                result[8] = m[8];

                return result;
            }

        };
        
        Object.defineProperty( matrix3, 'zero', {
            get: function() {
                return Matrix3( [0, 0, 0,
                                 0, 0, 0,
                                 0, 0, 0] );
            },
            enumerable: true
        });
        
        Object.defineProperty( matrix3, 'one', {
            get: function() {
                return Matrix3( [1, 1, 1,
                                 1, 1, 1,
                                 1, 1, 1] );
            },
            enumerable: true
        });
        
        Object.defineProperty( matrix3, 'identity', {
            get: function() {
                return Matrix3( [1, 0, 0,
                                 0, 1, 0,
                                 0, 0, 1] );
            },
            enumerable: true
        });

        return matrix3;

    };

});
/*jshint white: false, strict: false, plusplus: false, onevar: false,
  nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('matrix/matrix4',['require','./matrix','../vector/vector3'],function ( require ) {

    return function( FLOAT_ARRAY_TYPE ) {

        var matrix = require( './matrix' )( FLOAT_ARRAY_TYPE );
        var vector3 = require( '../vector/vector3' )( FLOAT_ARRAY_TYPE );

        var Matrix4 = function() {
            if( 0 === arguments.length ) {
                return matrix.$( 16, [0, 0, 0, 0,
                                      0, 0, 0, 0,
                                      0, 0, 0, 0,
                                      0, 0, 0, 0] );
            } else {
                return matrix.$( 16, arguments );
            }
        };

        var matrix4 = {
                
            $: Matrix4,

            add: function( ml, result ) {
                result = result || Matrix4();
                
                if (ml.length == 1) {
                    return ml[0];
                } else {
                    var temp = ml[0];
                    for (var i = 1; i < ml.length; ++ i) {
                        result = matrix.add(temp, ml[i], result);
                        temp = result;
                    }
                }
                return result;
            },
            
            subtract: function( ml, result ) {
                result = result || Matrix4();
                var temp = ml[0];
                
                if (ml.length == 1)
                    result = temp;
                else {
                    for (var i = 1; i < ml.length; ++ i) {
                        result = matrix.subtract(temp, ml[i], result);
                        temp = result;
                    }
                }
                return result;
            },

            clear: matrix.clear,

            equal: matrix.equal,

            multiply: function( ml, result ) {
                result = result || Matrix4();
                
                if (ml.length == 1)
                    return ml[0];
                else {

                    var temp = ml[0];
                    for (var i = 1; i < ml.length; ++ i) {

                        result[0] = temp[0]*ml[i][0] + temp[1]*ml[i][4] + temp[2]*ml[i][8] + temp[3]*ml[i][12];
                        result[1] = temp[0]*ml[i][1] + temp[1]*ml[i][5] + temp[2]*ml[i][9] + temp[3]*ml[i][13];
                        result[2] = temp[0]*ml[i][2] + temp[1]*ml[i][6] + temp[2]*ml[i][10] + temp[3]*ml[i][14];
                        result[3] = temp[0]*ml[i][3] + temp[1]*ml[i][7] + temp[2]*ml[i][11] + temp[3]*ml[i][15];            
                        result[4] = temp[4]*ml[i][0] + temp[5]*ml[i][4] + temp[6]*ml[i][8] + temp[7]*ml[i][12];
                        result[5] = temp[4]*ml[i][1] + temp[5]*ml[i][5] + temp[6]*ml[i][9] + temp[7]*ml[i][13];
                        result[6] = temp[4]*ml[i][2] + temp[5]*ml[i][6] + temp[6]*ml[i][10] + temp[7]*ml[i][14];
                        result[7] = temp[4]*ml[i][3] + temp[5]*ml[i][7] + temp[6]*ml[i][11] + temp[7]*ml[i][15];
                        result[8] = temp[8]*ml[i][0] + temp[9]*ml[i][4] + temp[10]*ml[i][8] + temp[11]*ml[i][12];
                        result[9] = temp[8]*ml[i][1] + temp[9]*ml[i][5] + temp[10]*ml[i][9] + temp[11]*ml[i][13];
                        result[10] = temp[8]*ml[i][2] + temp[9]*ml[i][6] + temp[10]*ml[i][10] + temp[11]*ml[i][14];
                        result[11] = temp[8]*ml[i][3] + temp[9]*ml[i][7] + temp[10]*ml[i][11] + temp[11]*ml[i][15];
                        result[12] = temp[12]*ml[i][0] + temp[13]*ml[i][4] + temp[14]*ml[i][8] + temp[15]*ml[i][12];
                        result[13] = temp[12]*ml[i][1] + temp[13]*ml[i][5] + temp[14]*ml[i][9] + temp[15]*ml[i][13];
                        result[14] = temp[12]*ml[i][2] + temp[13]*ml[i][6] + temp[14]*ml[i][10] + temp[15]*ml[i][14];
                        result[15] = temp[12]*ml[i][3] + temp[13]*ml[i][7] + temp[14]*ml[i][11] + temp[15]*ml[i][15];                        
                        
                        temp = result;
                    }
                }
                return result;
            },
            
            multiplyVector3: function( m, v, result ) {
                result = result || vector3.$();
                
                result[0] = m[0] * v[0] + m[2] * v[1] + m[3] * v[2];
                result[1] = m[4] * v[0] + m[5] * v[1] + m[6] * v[2];
                result[2] = m[8] * v[0] + m[9] * v[1] + m[10] * v[2];

                return result;
            },

            determinant: function (m) {
                var a0 = m[0] * m[5] - m[1] * m[4];
                var a1 = m[0] * m[6] - m[2] * m[4];
                var a2 = m[0] * m[7] - m[3] * m[4];
                var a3 = m[1] * m[6] - m[2] * m[5];
                var a4 = m[1] * m[7] - m[3] * m[5];
                var a5 = m[2] * m[7] - m[3] * m[6];
                var b0 = m[8] * m[13] - m[9] * m[12];
                var b1 = m[8] * m[14] - m[10] * m[12];
                var b2 = m[8] * m[15] - m[11] * m[12];
                var b3 = m[9] * m[14] - m[10] * m[13];
                var b4 = m[9] * m[15] - m[11] * m[13];
                var b5 = m[10] * m[15] - m[11] * m[14];

                var det = a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0;

                return det;
            },

            transpose: function (m , result) {
                result = result || Matrix4();
                
                result[0] = m[0];
                result[1] = m[4];
                result[2] = m[8];
                result[3] = m[12];
                result[4] = m[1];
                result[5] = m[5]; 
                result[6] = m[9]; 
                result[7] = m[13]; 
                result[8] = m[2];
                result[9] = m[6]; 
                result[10] = m[10]; 
                result[11] = m[14]; 
                result[12] = m[3];
                result[13] = m[7]; 
                result[14] = m[11]; 
                result[15] = m[15];
                
                return result;
            },

            inverse: function (m, result) {
                
                result = result || Matrix4();
                
                var a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3],
                    a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
                    a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11],
                    a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15],

                    b00 = a00 * a11 - a01 * a10,
                    b01 = a00 * a12 - a02 * a10,
                    b02 = a00 * a13 - a03 * a10,
                    b03 = a01 * a12 - a02 * a11,
                    b04 = a01 * a13 - a03 * a11,
                    b05 = a02 * a13 - a03 * a12,
                    b06 = a20 * a31 - a21 * a30,
                    b07 = a20 * a32 - a22 * a30,
                    b08 = a20 * a33 - a23 * a30,
                    b09 = a21 * a32 - a22 * a31,
                    b10 = a21 * a33 - a23 * a31,
                    b11 = a22 * a33 - a23 * a32,

                    d = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06),
                    invDet;

                // Determinant, throw exception if singular
                if (!d)
                    throw 'matrix is singular';
                
                invDet = 1 / d;
                result[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
                result[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
                result[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
                result[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
                result[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
                result[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
                result[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
                result[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
                result[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
                result[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
                result[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
                result[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
                result[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
                result[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
                result[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
                result[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;
                
                return result;
            },

            toHTML: function( m ) {
                var result = "[ ";
                for( var i = 0; i < 4; ++ i ) {
                    result += "<br>";
                    for( var j = 0; j < 4; ++ j ) {
                        result += " (" + m[4*i+j] + ") ";
                    }
                }
                result += " ]";
                return result;
            }

        };
        Object.defineProperty( matrix4, 'zero', {
            get: function() {
                return Matrix4( [0, 0, 0, 0,
                                 0, 0, 0, 0,
                                 0, 0, 0, 0,
                                 0, 0, 0, 0] );
            },
            enumerable: true
        });
        
        Object.defineProperty( matrix4, 'one', {
            get: function() {
                return Matrix4( [1, 1, 1, 1,
                                 1, 1, 1, 1,
                                 1, 1, 1, 1,
                                 1, 1, 1, 1] );
            },
            enumerable: true
        });
        
        Object.defineProperty( matrix4, 'identity', {
            get: function() {
                return Matrix4( [1, 0, 0, 0,
                                 0, 1, 0, 0,
                                 0, 0, 1, 0,
                                 0, 0, 0, 1] ); 
            },
            enumerable: true
        });

        return matrix4;

    };

});

/*jshint white: false, strict: false, plusplus: false, onevar: false,
nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('matrix/transform',['require','./matrix4'],function ( require ) {

    return function( FLOAT_ARRAY_TYPE ) {

        var matrix4 = require( './matrix4' )( FLOAT_ARRAY_TYPE );

        var Transform = matrix4.$;
        
        var transform = {
                
            $: Transform,

            fixed: function( vt, vr, vs ) {
                var r = matrix4.identity;

                if( vt ) {
                    transform.translate( vt, r );
                }

                if( vr ) {
                    transform.rotate( vr, r );
                }

                if( vs ) {
                    transform.scale( vs, r );
                }

                return r;
            },

            // Convert a vector rotation (in radians) to a 4x4 matrix
            rotate: function( v, result ) {
                var r = result || matrix4.identity;

                var sinA,
                    cosA;

                var ml;
                if( 0 !== v[2] ) {
                    sinA = Math.sin( v[2] );
                    cosA = Math.cos( v[2] );
                    ml = [];
                    ml.push(matrix4.$([ cosA, sinA, 0, 0,
                                       -sinA, cosA, 0, 0,
                                        0, 0, 1, 0,
                                        0, 0, 0, 1 ] ));
                    ml.push(matrix4.$(r));
                    
                    matrix4.multiply( ml, r );
                }

                if( 0 !== v[1] ) {
                    sinA = Math.sin( v[1] );
                    cosA = Math.cos( v[1] );
                    ml = [];
                    ml.push(matrix4.$([ cosA, 0, -sinA, 0,
                                        0, 1, 0, 0,
                                        sinA, 0, cosA, 0,
                                        0, 0, 0, 1 ] ));
                    ml.push(matrix4.$(r));
                    
                    matrix4.multiply( ml, r );
                }

                if( 0 !== v[0] ) {
                    sinA = Math.sin( v[0] );
                    cosA = Math.cos( v[0] );
                    ml = [];
                    ml.push(matrix4.$([ 1, 0, 0, 0,
                                        0, cosA, sinA, 0,
                                        0, -sinA, cosA, 0,
                                        0, 0, 0, 1 ] ));
                    ml.push(matrix4.$(r));
                    
                    matrix4.multiply( ml, r );
                }

                if( !result ) {
                    return r;
                }
            },

            // Convert a vector3 scale to a 4x4 matrix
            scale: function( v, result ) {
                var r = [ v[0], 0.0, 0.0, 0.0,
                           0.0, v[1], 0.0, 0.0,
                           0.0, 0.0, v[2], 0.0,
                           0.0, 0.0, 0.0, 1.0 ];

                if( result ) {
                    matrix4.multiply( [ r, matrix4.$( result ) ], result );
                } else {
                    return r;
                }
            },

            // Convert a vector3 translation to a 4x4 matrix
            translate: function( v, result ) {
                var r = [ 1.0, 0.0, 0.0, 0.0,
                           0.0, 1.0, 0.0, 0.0,
                           0.0, 0.0, 1.0, 0.0,
                           v[0], v[1], v[2], 1.0 ]

                if( result ) {
                    matrix4.multiply( [ r, matrix4.$( result ) ], result );
                } else {
                    return r;
                }
            }

        };
        
        return transform;

    };

});

/*jshint white: false, strict: false, plusplus: false, onevar: false,
  nomen: false */
/*global define: false, console: false, window: false, setTimeout: false */

define('_math',['require','./lang','./constants','./vector/vector2','./vector/vector3','./vector/vector4','./vector/quaternion','./matrix/matrix2','./matrix/matrix3','./matrix/matrix4','./matrix/transform'],function ( require ) {

    var lang = require( './lang' ),
        constants = require( './constants' ),
        vector2 = require( './vector/vector2' ),
        vector3 = require( './vector/vector3' ),
        vector4 = require( './vector/vector4' ),
        quaternion = require( './vector/quaternion' ),
        matrix2 = require( './matrix/matrix2' ),
        matrix3 = require( './matrix/matrix3' ),
        matrix4 = require( './matrix/matrix4' ),
        transform = require( './matrix/transform' );

    var _Math = function( options ) {
        
        var _FLOAT_ARRAY_ENUM = {
                Float32: Float32Array,
                Float64: Float64Array
        };
                
        var _FLOAT_ARRAY_TYPE = _FLOAT_ARRAY_ENUM.Float32;
        
        Object.defineProperty( this, 'ARRAY_TYPE', {
            get: function() {
                return _FLOAT_ARRAY_TYPE;
            },
            enumerable: true
        });
        
        lang.extend( this, constants() );
        
        var _vector2 = vector2( _FLOAT_ARRAY_TYPE );
        var _vector3 = vector3( _FLOAT_ARRAY_TYPE );
        var _vector4 = vector4( _FLOAT_ARRAY_TYPE );
        var _quaternion = quaternion( _FLOAT_ARRAY_TYPE );
        
        var _matrix2 = matrix2( _FLOAT_ARRAY_TYPE );
        var _matrix3 = matrix3( _FLOAT_ARRAY_TYPE );
        var _matrix4 = matrix4( _FLOAT_ARRAY_TYPE );
        var _transform = transform( _FLOAT_ARRAY_TYPE );
        
        Object.defineProperty( this, 'Vector2', {
            get: function() {
                return _vector2.$;
            },
            enumerable: true
        });
        Object.defineProperty( this, 'vector2', {
            get: function() {
                return _vector2;
            },
            enumerable: true
        });

        Object.defineProperty( this, 'Vector3', {
            get: function() {
                return _vector3.$;
            },
            enumerable: true
        });
        Object.defineProperty( this, 'vector3', {
            get: function() {
                return _vector3;
            },
            enumerable: true
        });
        
        Object.defineProperty( this, 'Vector4', {
            get: function() {
                return _vector4.$;
            },
            enumerable: true
        });
        Object.defineProperty( this, 'vector4', {
            get: function() {
                return _vector4;
            },
            enumerable: true
        });
        
        Object.defineProperty( this, 'Quaternion', {
            get: function() {
                return _quaternion.$;
            },
            enumerable: true
        });
        Object.defineProperty( this, 'quaternion', {
            get: function() {
                return _quaternion;
            },
            enumerable: true
        });
        
        Object.defineProperty( this, 'Matrix2', {
            get: function() {
                return _matrix2.$;
            },
            enumerable: true
        });
        Object.defineProperty( this, 'matrix2', {
            get: function() {
                return _matrix2;
            },
            enumerable: true
        });
        
        Object.defineProperty( this, 'Matrix3', {
            get: function() {
                return _matrix3.$;
            },
            enumerable: true
        });
        Object.defineProperty( this, 'matrix3', {
            get: function() {
                return _matrix3;
            },
            enumerable: true
        });  
        
        Object.defineProperty( this, 'Matrix4', {
            get: function() {
                return _matrix4.$;
            },
            enumerable: true
        });
        Object.defineProperty( this, 'matrix4', {
            get: function() {
                return _matrix4;
            },
            enumerable: true
        });
        
        Object.defineProperty( this, 'Transform', {
            get: function() {
                return _transform.$;
            },
            enumerable: true
        });
        Object.defineProperty( this, 'transform', {
            get: function() {
                return _transform;
            },
            enumerable: true
        });
        
    };

    return new _Math();

});
  return require( "_math" );
}));

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

if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('common/multicast-delegate',['require','common/guid'],function( require ) {

  var guid = require( "common/guid" );
  
  function subscribe( callback ) {
    if( !callback.hasOwnProperty( "_id" ) ) {
      callback._id = guid();
    }
    
    if( !this._callbacks.hasOwnProperty( callback._id ) ) {
      this._callbacks[callback._id] = callback;
      ++ this.size;
    }
  }
  
  function unsubscribe( callback ) {
    if( callback.hasOwnProperty( "_id" ) ) {
      if( this._callbacks.hasOwnProperty( callback._id ) ) {
        delete this._callbacks[callback._id];
        -- this.size;
      }
    }
  }
  
  var Delegate = function() {
    var callbacks = {};
    
    function dispatcher( data ) {
      var i, l;
      var count = 0;
      var callbackIds = Object.keys( callbacks );
      for( i = 0, l = callbackIds.length; i < l; ++ i ) {
        var callbackId = callbackIds[i];
        var callback = callbacks[callbackId];
        callback( data );
        ++ count;
      }
      
      return count;
    }
    
    dispatcher._callbacks = callbacks;
    dispatcher.subscribe = subscribe;
    dispatcher.unsubscribe = unsubscribe;
    dispatcher.size = 0;

    return dispatcher;
  };
  
  return Delegate;
  
});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/loop',['require'],function( require ) {

  var Loop = function( callback, context ) {
    this.L_STARTED = 0;
    this.L_PAUSED = 1;
    this.L_CANCELLED = 2;
    this.L_FINISHED = 3;

    this.R_RUNNING = 0;
    this.R_IDLE = 1;

    this._loopState = this.L_PAUSED;
    this._runState = this.R_IDLE;    

    this.callback = callback;
    this.context = context || this;
  };

  function _run() {
    this._runState = this.R_RUNNING;
    if( this.callback ) {
      this.callback.call( this.context );
      if( this.L_STARTED === this._loopState ) {
        this._pump();
      } else {
        this.suspend();
      }
    }
    this._runState = this.R_IDLE;
  }

  function _pump() {
    throw new Error( "not implemented for base prototype" );
  }

  function suspend() {
    this._loopState = this.L_PAUSED;
  }

  function resume() {
    if( !this.callback ) {
      throw new Error( "callback not defined" );
    }
    this._loopState = this.L_STARTED;
    if( this._runState === this.R_IDLE ) {      
      this._pump();
    }
  }
  
  function isStarted() {
    return this._loopState === this.L_STARTED;
  }

  Loop.prototype = {
      suspend: suspend,
      resume: resume,
      _pump: _pump,
      _run: _run,
      isStarted: isStarted
  };

  return Loop;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/request-animation-frame-loop',['require','core/loop'],function( require ) {

  if( !window.requestAnimationFrame ) {
    window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function( callback, element ) {
      window.setTimeout( callback, 1000/60 );
    };
  }
  
  var Loop = require( "core/loop" );

  var RequestAnimationFrameLoop = function( callback, context ) {
    Loop.call( this, callback, context );
  };

  function _pump() {
    requestAnimationFrame( this._run.bind( this ) );
  }
  
  RequestAnimationFrameLoop.prototype = new Loop();
  RequestAnimationFrameLoop.prototype._pump = _pump;
  RequestAnimationFrameLoop.prototype.constructor = RequestAnimationFrameLoop;

  return RequestAnimationFrameLoop;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/clock',['require','common/multicast-delegate'],function( require ) {
  
  var MulticastDelegate = require( "common/multicast-delegate" );
  
  var C_STARTED = 0,
  C_PAUSED = 1;
  
  var Clock = function( delegate ) {
    this.time = 0;
    this.delta = 0;
    this._timeScale = 1.0;
    this._idealFrameInterval = 1.0/30.0;
    
    this._clockState = undefined;
    this.signal = new MulticastDelegate();
    this._delegate = delegate || null;

    this._delegateHandler = this.update.bind( this );
    if( this._delegate ) {
      this._delegate.subscribe( this._delegateHandler );
    }

    this._stepCount = 0;
    
    this.start();
  };
  
  function pause() {
    this._clockState = C_PAUSED;
  }
  
  function start() {
    this._clockState = C_STARTED;
  }
  
  function update( delta ) {
    if( C_PAUSED !== this._clockState ) {
      this.delta = delta * this._timeScale;
    } else {
      this.delta = this._stepCount * this._idealFrameInterval * this._timeScale;
      this._stepCount = 0;
    }
    this.time += this.delta;
    this.signal( this.delta ); // Dispatch time signal
  }
  
  function step( count ) {
    if( C_PAUSED === this._clockState ) {
      this._stepCount += (undefined === count) ? 1 : count;
    }
  }
  
  function isStarted() {
    return this._clockState === C_STARTED;
  }
  
  function reset( delegate ) {
    if( delegate && delegate != this._delegate ) {
      this._delegate.unsubscribe( this._delegateHandler );  
      this._delegate = delegate || null;
      this._delegate.subscribe( this._delegateHandler );
    }
    this.time = 0;
    this.delta = 0;    
  }
  
  function setTimeScale( scale ) {
    this._timeScale = scale;
  }
  
  function setIdealFrameInterval( interval ) {
    this._idealFrameInterval = interval;
  }
  
  Clock.prototype = {
     pause: pause,
     start: start,
     update: update,
     isStarted: isStarted,
     step: step,
     reset: reset,
     setTimeScale: setTimeScale,
     setIdealFrameInterval: setIdealFrameInterval
  };
  
  return Clock;
  
});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('common/graph',['require'],function( require ) {

  /* Graph
   * 
   * Stores a set of nodes and a set of directed edges connecting them.
   * Supports inserting, removing, linking and unlinking nodes. Nodes are
   * assumed to be strings.
   * 
   */

  var Graph = function() {
    this._nodes = {};        // Nodes in the graph
    this._adjacencies = {};  // Adjacency list; Sink maps to sources
    this._descendants = {};  // Number of descendants for each node
    this._roots = {};        // List of nodes that have no ancestors
    this._cachedSort = null; // Cached copy of the sorted nodes
    this._cachedSize = 0;    // Cached size of the graph
  };

  function link( source, sink ) {
    if( !this._nodes[source] ) { 
      this._nodes[source] = true;
      this._descendants[source] = 0;
    }
    if( !this._nodes[sink] ) { 
      this._nodes[sink] = true; 
      this._descendants[sink] = 0;
      this._roots[sink] = true;
    }            

    if( !this._adjacencies[sink] ) {
      this._adjacencies[sink] = {};
    }

    this._adjacencies[sink][source] = true;
    ++ this._descendants[source];
    if( this._roots[source] ) {
      delete this._roots[source];
    }

    this._cachedSort = null;

    return this;
  }

  function unlink( source, sink ) {
    if( this._adjacencies[sink] && this._adjacencies[sink][source] ) {
      delete this._adjacencies[sink][source];
      -- this._descendants[source];
      if( !Object.keys( this._adjacencies[sink] ).length ) {
        delete this._adjacencies[sink];
      }
      if( !this._descendants[source] ) {
        this._roots[source] = true;
      }
    } else {
      throw new Error( "no such link: ", source, "->", sink );
    }

    this._cachedSort = null;

    return this;
  }

  function insert( node ) {
    if( !this._nodes[node] ) {
      this._nodes[node] = true;
      this._descendants[node] = 0;
      this._roots[node] = true;

      ++ this._cachedSize;
      this._cachedSort = null;
    }

    return this;
  }

  function remove( node ) {
    var edges = this._adjacencies[node] || {};    

    if( this._nodes[node] ) {
      for( var source in edges ) {
        this.unlink( source, node );
      }

      delete this._nodes[node];
      delete this._descendants[node];

      -- this._cachedSize;
      this._cachedSort = null;
    } else {
      throw new Error( "no such node: ", node );
    }

    return this;
  }

  function size() {
    return this._cachedSize;
  }

  function clear() {    
    this._nodes = {};
    this._adjacencies = {};
    this._descendants = {};
    this._roots = {};    
    this._cachedSort = null;
    this._cachedSize = 0;

    return this;
  }

  function sort() {
    var graph = this;
    var sorted = [],
    roots = Object.keys( this._roots ),
    visited = [];

    function visit( sink, visitedStack ) {
      if( -1 !== visitedStack.indexOf( sink ) ) {
        throw new Error( "directed cycle detected" );
      }
      visitedStack.push( sink );

      if( -1 === visited.indexOf( sink ) ) {
        visited.push( sink );
        var edges = graph._adjacencies[sink];
        for( var source in edges ) {
          if( !graph._nodes[source] ) {  // This might be a dangling edge
            delete edges[source];
          } else {
            visit( source, visitedStack );              
          }
        }
        sorted.push( sink );
      }
      visitedStack.pop();
    }

    if( null === this._cachedSort ) {
      for( var i = 0, l = roots.length; i < l; ++ i ) {
        visit( roots[i], [] );
      }             

      if( sorted.length < Object.keys( this._nodes ).length ) {
        throw new Error( "directed cycle detected" );
      }

      this._cachedSort = sorted;
    }

    return this._cachedSort.slice();

  }

  function hasNode( node ) {
    return this._nodes.hasOwnProperty( node );
  }

  function hasLink( source, sink ) {
    if( !this.hasNode( source ) ) { // This might be a dangling edge
      this.unlink( source, sink );
      return false;
    }
    return this._adjacencies.hasOwnProperty( sink ) &&
    this._adjacencies[sink].hasOwnProperty( source );
  }

  Graph.prototype = {
      link: link,    
      unlink: unlink,    
      insert: insert,
      remove: remove,
      size: size,
      clear: clear,
      sort: sort,
      hasNode: hasNode,
      hasLink: hasLink
  };

  return Graph;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/dependency-scheduler',['require','common/graph'],function ( require ) {

  var Graph = require( "common/graph" );

  var defaultPhases = [
    "@input",
    "@update",
    "@render"
  ];

  var DependencyScheduler = function( phases ) {
    this.current = null;
    this._tasks = {};
    this._graph = new Graph();
    this._schedule = null;

    this._phases = phases || defaultPhases;
    this.clear();
  };
  
  function update() {
    var i, l;
    var sortedGraph = this._graph.sort();
    this._schedule = [];
    for( i = 0, l = sortedGraph.length; i < l; ++ i ) {
      if( this._tasks.hasOwnProperty( sortedGraph[i] ) ) {
        this._schedule.push( sortedGraph[i] );
      }
    }
    return this;
  }
  
  function next() {
    if( !this._schedule ) {
      return undefined;
    }
    var taskId = this._schedule.shift();
    return this._tasks[taskId];
  }
  
  function hasNext() {
    return this._schedule && this._schedule.length > 0;
  }

  function insert( task, taskId, schedule ) {
    var i, l;
    this._tasks[taskId] = task;
    this._graph.insert( taskId );

    if( schedule ) {
      if( schedule.tags ) {
        var tags = schedule.tags;
        for( i = 0, l = schedule.tags.length; i < l; ++ i ) {
          var tag = tags[i];
          if( tag[0] === '@' ) {
            this._graph.link( task.id, tag );
          } else {
            this._graph.link( tag, task.id );
          }
        }
      }
      
      if( schedule.dependsOn ) {
        var dependsOn = schedule.dependsOn;
        for( i = 0, l = dependsOn.length; i < l; ++ i ) {
          this._graph.link( task.id, dependsOn[i] );
        }
      }
    }
    
    return this;
  }

  function remove( taskId ) {
    if( !this._graph.hasNode( taskId ) ) {
      throw new Error( "task is not scheduled to run" );
    }
    
    this._graph.remove( taskId );
    delete this._tasks[taskId];
    return this;
  }

  function size() {
    return this._graph.size();
  }
  
  function clear() {
    this._schedule = null;
    this._graph.clear();

    // Set up scheduler phases
    var i;
    for( i = 0; i < this._phases.length; ++ i ) {
      this._graph.insert( this._phases[i] );
      if( i > 0 ) {
        this._graph.link( this._phases[i-1], this._phases[i] );
      }
    }
  }

  DependencyScheduler.prototype = {
      next: next,
      insert: insert,
      remove: remove,
      size: size,
      hasNext: hasNext,
      update: update,
      clear: clear
  };

  return DependencyScheduler;

} );
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

define('core/timer',['require'],function( require ) {

  var T_STARTED = 0,
  T_PAUSED = 1;

  var Timer = function( delegate, delay, callback, data ) {
    this._delegate = delegate;
    this._callback = callback;
    this._data = data;
    this._delay = delay;
    this.elapsed = 0;
    this._timerState = undefined;
    
    this.start();
  };
  
  function update( delta ) {
    if( T_PAUSED !== this._timerState ) {
      this.elapsed += delta;
      
      if( this.elapsed >= this._delay ) {
        this._callback( this._data );
        this.pause();
      }
    }
  }
  
  function start() {
    this._timerState = T_STARTED;
    this._delegate.subscribe( this.update );
  }
  
  function pause() {
    this._timerState = T_PAUSED;
    this._delegate.unsubscribe( this.update );
  }
  
  function isStarted() {
    return this._timerState === T_STARTED;
  }
  
  function reset() {
    this.elapsed = 0;
    this.start();
  }
  
  Timer.prototype = {
      start: start,
      pause: pause,
      update: update,
      isStarted: isStarted,
      reset: reset
  };
  
  return Timer;

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

define('common/decode-data-uri',['require'],function ( require ) {
  

  function decodeDataUri(uri) {
    var components = uri.match( ':.*,' )[0].slice(1, -1).split(';');
    var contentType = components[0], encoding = components[1], base64 = components[2];
    var data = decodeURIComponent(uri.match( ',.*' )[0].slice(1));

    switch( contentType ) {
      case '':
      case 'text/plain':
        return data;
      default:
        throw 'unknown content type: ' + contentType;
    }
  }

  return decodeDataUri;

});


if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('common/decode-javascript-uri',['require'],function ( require ) {
  

  function decodeJavaScriptUri( uri ) {
    /*jshint scripturl:true*/
    var js = uri.match( '^javascript://.*' )[0].slice( 'javascript://'.length );
    return decodeURIComponent( js );
  }

  return decodeJavaScriptUri;

});


define('core/loaders/default',['require','common/decode-data-uri','common/decode-javascript-uri'],function(require) {

  var decodeDataURI = require( "common/decode-data-uri" );
  var decodeJavaScriptURI = require( "common/decode-javascript-uri" );

  return function(url, onsuccess, onfailure) {
    if( url.match('^data:') ) {
      onsuccess( decodeDataURI( url ) );
    } else if( url.match( '^javascript:' ) ) {
      onsuccess( decodeJavaScriptURI( url ) );
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function() {
        if(4 != xhr.readyState) {
          return;
        }
        if(xhr.status < 200 || xhr.status > 299) {
          onfailure(xhr.statusText);
          return;
        }
        onsuccess(xhr.responseText);
      };
      xhr.send(null);
    }
  };

});
define('core/get',['require','core/loaders/default'],function(require) {

  var defaultLoad = require( 'core/loaders/default' );

  var get = function resourceGet(requests, options) {

    options = options || {};
    options.oncomplete = options.oncomplete || function () {};

    if(!requests.length) {
      options.oncomplete();
      return;
    }

    var requestsHandled = 0;
    var requestHandled = function() {
      ++ requestsHandled;
      if( requestsHandled === requests.length ) {
        options.oncomplete();
      }
    };

    var doLoad = function( load, request ) {
      load(
        request.url,
        function loadSuccess(data) {
          if(undefined === data) {
            request.onfailure('load returned with not data');
          } else {
            var instance = new request.type(data);
            request.onsuccess(instance);
          }
          requestHandled();
        },
        function loadFailure(error) {
          request.onfailure('load failed: ' + error);
          requestHandled();
        }
      );
    };

    for(var i = 0; i < requests.length; i++) {
      var request = requests[i];
      var load = request.load || defaultLoad;
      doLoad( load, request );
    }
    return;
  };

  return get;
});

if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('common/get-url-params',['require'],function ( require ) {
  

  function getURLParams( url ) {
    var urlParts = url.split("?");
    var result = {};
    if( urlParts[1] ) {
      var params = urlParts[1].split("&");

      for ( var i = 0; i < params.length; ++i ) {
        var item = params[i].split("=");
        var key = decodeURIComponent(item[0]);
        var val = decodeURIComponent(item[1]);
        result[key] = val;
      }
    }

    return result;
  }
  return getURLParams;
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

define('core/entity',['require','common/guid','core/event'],function( require ) {

  var guid = require( "common/guid" );
  var Event = require( "core/event" );

  var Entity = function( name, components, tags, parent ) {
    this.id = guid();
    this.name = name || "";
    this.active = false;
    this.parent = null;
    this._children = {};
    this.space = null;
    this.size = 0;
    this._components = {};
    this.tags = tags || [];

    // Add components from the constructor list
    if( components && components.length > 0) {
      if (this.validateDependencies.call(this, components)){
        var i, l;
        for ( i = 0, l = components.length; i < l; ++ i){
          this.addComponent.call(this, components[i], true);
        }
      }else{
        throw new Error( "required component missing" );
      }
    }

    if( parent ) {
      this.setParent( parent );
    }
  };

  function addComponent( component, force ) {
    if (force || this.validateDependencies.call(this, component)){
      var previous = this.removeComponent( component.type );
      component.setOwner( this );
      this._components[component.type] = component;
      ++ this.size;

      var event = new Event( "EntityComponentAdded", component );
      event.dispatch( this );
      return previous;
    } else {
      throw new Error( "required component missing");
    }
  }

  function removeComponent( type ) {
    var previous = null;
    if( this.hasComponent( type ) ) {
      previous = this._components[type];
      delete this._components[type];
      previous.setOwner( null );
      -- this.size;
      
      var event = new Event( "EntityComponentRemoved", previous );
      event.dispatch( this );

      //We need to re-pack the internal components into an array so that
      //validate dependencies knows what to do with it
      var componentArray = [];
      var componentTypes = Object.keys(this._components);
      for(var comIndex = 0; comIndex < componentTypes.length; comIndex++){
        componentArray.push(this._components[componentTypes[comIndex]]);
      }
      //What we've done here is cause all of the existing components to be re-validated
      //now that one of them has been removed
      if (!this.validateDependencies.call({_components: []}, componentArray)){
        throw new Error( "required component removed from entity- component dependency missing");
      }
    }
    return previous;
  }

  function setParent( parent ) {
    var event;
    if( parent !== this.parent ) {
      if( this.parent ) {
        event = new Event( "ChildEntityRemoved", this );
        event.dispatch( this.parent );
      }
      
      var previous = this.parent;
      this.parent = parent;
      
      event = new Event( "EntityParentChanged",
          { previous: previous, current: parent } );
      event.dispatch( this );
      
      if( this.parent ) {
        event = new Event( "ChildEntityAdded", this );
        event.dispatch( this.parent );
      }
    }
  }
  
  function setSpace( space ) {
    if( space !== this.space ) {
      var previous = this.space;
      this.space = space;

      if (!this.space && this.active){
        setActive.call(this, false);
      }

      var event = new Event( "EntitySpaceChanged",
          { previous: previous, current: space } );
      event.dispatch( this );
    }
  }
  
  function setActive( value ) {
    var event;

    if (this.space){
      if( value) {
        this.active = true;
        event = new Event( "EntityActivationChanged", true );
      } else {
        this.active = false;
        event = new Event( "EntityActivationChanged", false );
      }
    } else {
      if (value){
        throw new Error( "Cannot set active to true on an entity that isn't in a space" );
      } else {
        this.active = false;
        event = new Event( "EntityActivationChanged", false);
      }
    }
    event.dispatch( this );
    
    return this;
  }

  function findComponent( type ) {
    if( this._components.hasOwnProperty( type ) ) {
      return this._components[type];
    }

    return null;
  }
  
  function hasComponent( args ) {
    var i, l;
    var componentTypes = Object.keys( this._components );
    if( Array.isArray( args ) ) {
      if( args.length === 0 ) {
        return true;
      }
      for( i = 0, l = args.length; i < l; ++ i ) {
        if( componentTypes.indexOf( args[i] ) < 0 ) {
          return false;
        }
      }
    } else if (args){
      if( componentTypes.indexOf( args ) < 0 ) {
        return false;
      }
    } else {
      return true;
    }
    return true;
  }

  //Check a list of components that we're going to add and make sure
  //that all components that they are dependent on either already exist in
  //this entity or are being added
  function validateDependencies(componentsToValidate){
    var componentTypes = Object.keys(this._components);
    if (Array.isArray(componentsToValidate)){
      componentsToValidate.forEach(
        function (component){
          componentTypes.push(component.type);
        }
      );
    }else{
      componentTypes.push(componentsToValidate.type);
      componentsToValidate = [componentsToValidate];
    }

    var component;
    for (var comIndex = 0; comIndex < componentsToValidate.length; comIndex++){
      component = componentsToValidate[comIndex];
      for (var depIndex = 0; depIndex < component.dependsOn.length; depIndex++){
        if (componentTypes.indexOf(component.dependsOn[depIndex]) < 0){
          return false;
        }
      }
    }
    return true;
  }

  function handleEvent( event ) {
    var componentTypes = Object.keys( this._components );
    var i, l;

    if( this["on" + event.type] ) {
      var handler = this["on" + event.type];
      try {
        handler.call( this, event );
      } catch( error ) {
        console.log( error );
      }
    }

    for( i = 0, l = componentTypes.length; i < l; ++ i ) {
      var componentType = componentTypes[i];
      var component = this._components[componentType];
      if( component.handleEvent ) {
        component.handleEvent.call( component, event );
      }
    }
  }
  
  function onChildEntityAdded( event ) {
    var child = event.data;
    this._children[child.id] = child;
  }
  
  function onChildEntityRemoved( event ) {
    var child = event.data;
    delete this._children[child.id];
  }

  Entity.prototype = {
      setParent: setParent,
      setSpace: setSpace,
      setActive: setActive,
      findComponent: findComponent,
      hasComponent: hasComponent,
      addComponent: addComponent,
      removeComponent: removeComponent,
      validateDependencies: validateDependencies,
      handleEvent: handleEvent,
      onChildEntityAdded: onChildEntityAdded,
      onChildEntityRemoved: onChildEntityRemoved
  };

  return Entity;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/space',['require','common/guid','core/entity','core/clock'],function( require ) {

  function Space( clock ) {
    // This will normally be the system simulation clock, but for a UI space
    // it might be the realtime clock instead.
    this.clock = new Clock( clock.signal ); // This clock controls updates for
                                            // all entities in this space
    this.id = guid();
    this.size = 0; // The number of entities in this space

    this._entities = {}; // Maps entity ID to object
    this._nameIndex = {}; // Maps name to entity ID
    this._tagIndex = {}; // Maps tag to entity ID
  }

  var guid = require( "common/guid" );
  var Entity = require( "core/entity" );
  var Clock = require( "core/clock" );

  function add( entity ) {
    var i, l;

    this._entities[entity.id] = entity;
    entity.space = this;
    ++ this.size;

    if( entity.name ) {
      if( !this._nameIndex.hasOwnProperty( entity.name ) ) {
        this._nameIndex[entity.name] = [];
      }
      this._nameIndex[entity.name].push( entity.id );
    }

    if( entity.tags ) {
      for( i = 0, l = entity.tags.length; i < l; ++ i ) {
        var tag = entity.tags[i];
        if( !this._tagIndex.hasOwnProperty( tag ) ) {
          this._tagIndex[tag] = [];
        }
        this._tagIndex[tag].push( entity.id );
      }
    }

    // Recursively add child entities to the space
    if( entity._children ) {
      for( var childId in entity._children ){
        this.add.call( this, entity._children[childId] );
      }
    }

    return this;
  }

  function remove( entity ) {
    var i, l;

    if( this._entities.hasOwnProperty( entity.id ) ) {
      delete this._entities[entity.id];
      entity.space = null;
      -- this.size;

      if( entity.name ) {
        if( this._nameIndex.hasOwnProperty( entity.name ) ) {
          delete this._nameIndex[entity.name];
        }
      }

      if( entity.tags ) {
        for( i = 0, l = entity.tags.length; i < l; ++ i ) {
          var tag = entity.tags[i];
          delete this._tagIndex[entity.id];
        }
      }

      // Recursively remove child entities from the space
      if( entity._children ) {
        for( var childId in entity._children ){
          this.remove.call( this, entity._children[childId] );
        }
      }
    } else {
      throw new Error("attempted to remove unavailable entity " +
        entity.toString());
    }

    return this;
  }
  
  function findNamed( name ) {
    if( this._nameIndex.hasOwnProperty( name ) ) {
      var id = this._nameIndex[name][0];
      return this._entities[id];
    }
    
    return null;
  }
  
  function findAllNamed( name ) {
    var i, l;
    if( this._nameIndex.hasOwnProperty( name ) ) {
      var ids = this._nameIndex[name];
      var result = [];
      for( i = 0, l = ids.length; i < l; ++ i ) {
        var id = ids[i];
        result.push( this._entities[id] );
      }
      return result;
    }
    
    return [];
  }
  
  function findTagged( tag ) {
    if( this._tagIndex.hasOwnProperty( tag ) ) {
      var id = this._tagIndex[tag][0];
      return this._entities[id];
    }
    
    return null;
  }
  
  function findAllTagged( tag ) {
    var i, l;
    if( this._tagIndex.hasOwnProperty( tag ) ) {
      var ids = this._tagIndex[tag];
      var result = [];
      for( i = 0, l = ids.length; i < l; ++ i ) {
        var id = ids[i];
        result.push( this._entities[id] );
      }
      return result;
    }
    
    return [];
  }
  
  function findWith( type ) {
    var i, l;
    var entityIds = Object.keys( this._entities );
    for( i = 0, l = entityIds.length; i < l; ++ i ) {
      var id = entityIds[i];
      var entity = this._entities[id];
      if( entity.hasComponent( type ) ) {
        return entity;
      }
    }
    
    return null;
  }
  
  function findAllWith( type ) {
    var i, l;
    var result = [];
    var entityIds = Object.keys( this._entities );
    for( i = 0, l = entityIds.length; i < l; ++ i ) {
      var id = entityIds[i];
      var entity = this._entities[id];
      if( entity.hasComponent( type ) ) {
        result.push( entity );
      }
    }
    
    return result;
  }

  Space.prototype = {
      add: add,
      remove: remove,
      findNamed: findNamed,
      findAllNamed: findAllNamed,
      findTagged: findTagged,
      findAllTagged: findAllTagged,
      findWith: findWith,
      findAllWith: findAllWith
  };

  return Space;

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

define('core/components/transform',['require','_math','common/extend','base/component'],function( require ) {

  var math = require( "_math" );
  var extend = require( "common/extend" );
  var Component = require( "base/component" );

  var Transform = function( position, rotation, scale ) {
    Component.call( this, "Transform", null, [] );

    this.position = position ? new math.Vector3( position ) : math.vector3.zero;
    this.rotation = rotation ? new math.Vector3( rotation ) : math.vector3.zero;
    this.scale = scale ? new math.Vector3( scale ) : math.vector3.one;
    this._cachedMatrix = math.matrix4.identity;
    this._cachedIsValid = false;
    this._cachedAbsolute = math.matrix4.identity;
  };
  Transform.prototype = new Component();
  Transform.prototype.constructor = Transform;

  function matrix() {
    if( this._cachedIsValid ) {
      return this._cachedMatrix;
    } else {
      // debugger;
      this._cachedMatrix = math.transform.fixed( this.position, this.rotation, 
        this.scale );
      this._cachedIsValid = true;
      return this._cachedMatrix;
    }
  }

  function setPosition( position ) {
    math.vector3.set( this.position, position[0], position[1], position[2] );
    this._cachedIsValid = false;

    return this;
  }

  function setRotation( rotation ) {
    math.vector3.set( this.rotation, rotation[0], rotation[1], rotation[2] );
    this._cachedIsValid = false;

    return this;
  }

  function setScale( scale ) {
    math.vector3.set( this.scale, scale[0], scale[1], scale[2] );
    this._cachedIsValid = false;

    return this;
  }

  function absolute() {
    if( this.owner && this.owner.parent && 
        this.owner.parent.hasComponent( "Transform" ) ) {
      var parentTransform = this.owner.parent.findComponent( this.type );                            
      this._cachedAbsolute = math.matrix4.multiply( [matrix.call( this ), parentTransform.absolute()] );
    } else {
      this._cachedAbsolute = matrix.call( this );
    }
    return this._cachedAbsolute;
  }

  function relative() {
    throw new Error( "not implemented" );
  }

  var prototype = {
      setPosition: setPosition,
      setRotation: setRotation,
      setScale: setScale,
      absolute: absolute,
      relative: relative
  };
  extend( Transform.prototype, prototype );

  return Transform;

});
define('core/resources/script',['require'],function(require) {
    var Script = function(data) {


      if (data === undefined){
        throw new Error("script body is undefined");
      }

      /*jslint evil:true */
      var g = new Function([], 'var f = ' + data + '; return f.apply( null, Array.prototype.slice.call(arguments) );');
      return g;
    };
    return Script;

});

define('core/loaders/procedural',['require','core/get','core/resources/script','common/get-url-params'],function(require) {

  var get = require('core/get');
  var Script = require('core/resources/script');
  var getURLParams = require('common/get-url-params');
  return function(url, onsuccess, onfailure) {

    var scriptLocation = url.split( "?" )[0];
    var scriptOptions = getURLParams(url);
    get([{
      url : scriptLocation,
      type : Script,
      onsuccess : function(instance) {
        try {
          var data = instance( scriptOptions );
          onsuccess( data ) ;
        } catch ( e ) {
          onfailure( e );
        }
      },
      onfailure : onfailure
    }]);

  };
});

if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/services/updater',['require','base/service','core/event'],function ( require ) {

  var Service = require( "base/service" );
  var Event = require( "core/event" );

  var Updater = function( scheduler, options ) {
    options = options || {};
    
    var schedules = {
        "update": {
          tags: ["@update", "logic"],
          dependsOn: ["physics"]
        }
    };
    Service.call( this, scheduler, schedules );
  };

  function update() {
    var registeredComponents = this._registeredComponents;

    // Update all logic components
    var component;
    var updateEvent = new Event( 'Update', false );
    for( var componentType in registeredComponents ) {
      for( var entityId in registeredComponents[componentType] ) {
        component = registeredComponents[componentType][entityId];
        while( component.handleQueuedEvent() ) {}
        updateEvent.dispatch( component );
      }
    }
  }

  Updater.prototype = new Service();
  Updater.prototype.constructor = Updater;
  Updater.prototype.update = update;

  return Updater;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/components/actor',['require','base/component','common/extend'],function( require ) {

  var Component = require( "base/component" );
  var extend = require( "common/extend" );

  var Actor = function( service, eventMap ) {
    Component.call( this, "Logic", service, [] );

    eventMap = eventMap || {};

    // Set up event handlers
    var i, l;
    var eventNames = Object.keys( eventMap );
    for( i = 0, l = eventNames.length; i < l; ++ i ) {
      var eventName = eventNames[i];
      this["on" + eventName] = eventMap[eventName];
    }
  };
  Actor.prototype = new Component();
  Actor.prototype.constructor = Actor;

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
    onEntitySpaceChanged: onEntitySpaceChanged,
    onComponentOwnerChanged: onComponentOwnerChanged,
    onEntityActivationChanged: onEntityActivationChanged
  };
  extend( Actor.prototype, prototype );

  return Actor;

});
define('core/resources/event-map',['require','core/get','core/resources/script'],function( require ) {

  var get = require( "core/get" );
  var Script = require( "core/resources/script" );

  var EventMap = function( data ) {
    data = data || {};
    var map = {};

    var getRequests = [];
    var eventNames = Object.keys( data );

    for( var eventName in eventNames ) {
      if( "string" === typeof data[eventName] ) {
        getRequests.push({
          type: Script,
          url: data[eventName],
          onsuccess: function( script ) {
            map[eventName] = script;
          },
          onfailure: function( error ) {
            console.log( "error loading script: " + data[eventName] );
            throw error;
          }
        });
      } else if( "function" === typeof data[eventName] ) {
        map[eventName] = data[eventName];
      }
    }
    get( getRequests );

    return map;
  };

  return EventMap;

});

if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/engine',['require','_math','common/multicast-delegate','core/request-animation-frame-loop','core/clock','core/dependency-scheduler','core/function-task','core/timer','core/event','core/get','core/loaders/default','core/loaders/procedural','base/component','base/service','base/extension','core/space','core/entity','core/components/transform','core/resources/script','core/services/updater','core/components/actor','core/resources/event-map'],function ( require ) {
  
  var _Math = require( "_math" );
  
  var MulticastDelegate = require( "common/multicast-delegate" );
  var Loop = require( "core/request-animation-frame-loop" );
  var Clock = require( "core/clock" );
  var Scheduler = require( "core/dependency-scheduler" );
  var FunctionTask = require( "core/function-task" );
  var Timer = require( "core/timer" );
  var Event = require( "core/event" );
  var get = require( "core/get" );
  var loaders = {
      text: require( "core/loaders/default" ),
      procedural: require( "core/loaders/procedural" )
  };

  var base = {
    Component: require( "base/component" ),
    Service: require( "base/service" ),
    Extension: require( "base/extension" )
  };

  var Space = require( "core/space" );
  var Entity = require( "core/entity" );

  var core = new base.Extension( "core", {
    components: {
      "Transform": require( "core/components/transform" )
    },
    resources: {
      "Script": require( "core/resources/script" )
    }    
  });

  var logic = new base.Extension( "logic", {
    services: {
      "updater": {
        service: require( "core/services/updater" ),
        components: {
          "Actor": require( "core/components/actor" )
        },
        resources: {}
      }
    },
    resources: {
      "EventMap": require( "core/resources/event-map" )
    }
  });
  
  function simulationLoop() {
    // Increment frame counter
    this.frame += 1;
    
    // Update internal timestamp
    var timestamp = Date.now();
    this.cachedTimestamp = this.cachedTimestamp || timestamp; // This is a hack for the first frame
    var delta = timestamp - this.cachedTimestamp;
    this.cachedTimestamp = timestamp;
    
    // Update system clock
    this.realClock.update( delta );
    
    // Update scheduler and run all tasks
    this._scheduler.update();
    while( this._scheduler.hasNext() ) {
      this._scheduler.next().run();
    }
    
    // Run monitor callbacks
    if( this._monitor.size > 0 ) {
      this._monitor( this );
    }
  }
  
  var Engine = function() {
    this._loop = new Loop( simulationLoop, this );
    this.frame = 0;
    this._monitor = new MulticastDelegate();

    // System clocks
    this.realClock = new Clock();
    // The simulation clock receives update signals from the realtime clock
    this.simulationClock = new Clock( this.realClock.signal );
    
    this._scheduler = new Scheduler();
    
    // Bind the scheduler to the task constructor
    this.FunctionTask = FunctionTask.bind( this, this._scheduler );
 
    this.Timer = Timer;
    this.Event = Event;

    // Convenient constructors bound to each of the engine timers by default
    this.RealTimer = Timer.bind( this, this.realClock.signal );
    this.SimulationTimer = Timer.bind( this, this.simulationClock.signal );
    
    // Base prototypes, useful for extending the engine at runtime
    this.base = base;

    this.Space = Space;
    this.RealSpace = Space.bind( null, this.realClock );
    this.SimulationSpace = Space.bind( null, this.simulationClock );
    this.Entity = Entity;
  
    // Registered extensions go in here; They are also exposed as properties
    // on the engine instance
    this._extensions = {};

    // Register core extension
    this.registerExtension( core );

    // Register logic extension
    this.registerExtension( logic );
  };
  
  function suspend() {
    this._loop.suspend();
    
    return this;
  }
  
  function resume() {
    this._loop.resume();
    
    return this;
  }
  
  function attach( callback ) {
    this._monitor.subscribe( callback );
    
    return this;
  }
  
  function detach( callback ) {
    this._monitor.unsubscribe( callback );
    
    return this;
  }
  
  function isRunning() {
    return this._loop.isStarted();
  }
  
  function registerExtension( extension, options ) {
    if( !extension instanceof base.Extension ) {
      throw new Error( "argument is not an extension" );
    }

    options = options || {};

    var i, l;
    var j, m;
    var extensionInstance = {};
    
    var services = extension.services;
    var serviceNames = Object.keys( services );
    var serviceName, serviceOptions, service;
    var components, componentNames, componentName, ComponentConstructor;
    var resources, resourceNames, resourceName, ResourceConstructor;
    for( i = 0, l = serviceNames.length; i < l; ++ i ) {
      serviceName = serviceNames[i];
      serviceOptions = options[serviceName] || {};
      if( typeof services[serviceName] === "function" ) {
        extensionInstance[serviceName] = new services[serviceName]( 
            this._scheduler, serviceOptions );
      } else if( typeof services[serviceName] === "object" ) {
        service = new services[serviceName].service( this._scheduler, 
          serviceOptions );
        extensionInstance[serviceName] = service;

        components = services[serviceName].components;
        componentNames = Object.keys( components );
        for( j = 0, m = componentNames.length; j < m; ++ j ) {
          componentName = componentNames[j];
          ComponentConstructor = components[componentName].bind( null, service );
          var componentProperties = Object.keys(components[componentName]);
          for (i = 0, l = componentProperties.length; i < l; ++ i) {
            ComponentConstructor[componentProperties[i]] = components[componentName][componentProperties[i]];
          }
          extensionInstance[componentName] = ComponentConstructor;
        }

        resources = services[serviceName].resources;
        resourceNames = Object.keys( resources );
        for( j = 0, m = resourceNames.length; j < m; ++ j ) {
          resourceName = resourceNames[j];
          ResourceConstructor = resources[resourceName].bind( null, service );
          var resourceProperties = Object.keys(resources[resourceName]);
          for (i = 0, l = resourceProperties.length; i < l; ++ i) {
            ResourceConstructor[resourceProperties[i]] = resources[resourceName][resourceProperties[i]];
          }
          extensionInstance[resourceName] = ResourceConstructor;
        }
      }
    }

    components = extension.components;
    componentNames = Object.keys( components );
    for( i = 0, l = componentNames.length; i < l; ++ i ) {
      componentName = componentNames[i];
      ComponentConstructor = components[componentName];
      extensionInstance[componentName] = ComponentConstructor;
    }
    
    resources = extension.resources;
    resourceNames = Object.keys( resources );
    for( i = 0, l = resourceNames.length; i < l; ++ i ) {
      resourceName = resourceNames[i];
      ResourceConstructor = resources[resourceName];
      extensionInstance[resourceName] = ResourceConstructor;
    }

    this._extensions[extension.name] = extensionInstance;
    if( !this.hasOwnProperty( name ) ) {
      this[extension.name] = extensionInstance;
    }
    
    return this;
  }
  
  function unregisterExtension( extension ) {
    throw new Error( "not implemented" );
  }
  
  function findExtension( name ) {
    if( this._extensions.hasOwnProperty( name ) ) {
      return this._extensions[name];
    }
    
    return undefined;
  }
  
  function hasExtension( name ) {
    return this._extensions.hasOwnProperty( name );
  }
  
  Engine.prototype = {
      isRunning: isRunning,
      suspend: suspend,
      resume: resume,
      attach: attach,
      detach: detach,
      registerExtension: registerExtension,
      unregisterExtension: unregisterExtension,
      findExtension: findExtension,
      hasExtension: hasExtension,
      get: get,
      loaders: loaders,
      math: _Math
  };
  
  return Engine;
  
});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/gladius-core',['require','core/engine'],function ( require ) {

  var Engine = require( "core/engine" );

  return Engine;

});
  var Gladius = require( "core/gladius-core" );

  return Gladius;
  
}));

