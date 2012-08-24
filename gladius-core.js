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

define('constants',['require'],function ( require ) {

  return {
    TAU: 2 * Math.PI,
    PI: Math.PI
  };

});
define('equal',['require'],function ( require ) {

  function equal( arg1, arg2, e ) {
    e = e || 0.000001;

    return Math.abs( arg1 - arg2 ) < e;
  }

  return equal;

});
define('vector/v',['require'],function ( require ) {

  var V = function() {
  };

  return V;

});
define('vector/v2',['require','vector/v'],function ( require ) {

  var V = require( "vector/v" );

  return function( FLOAT_ARRAY_TYPE ) {

    var V2 = function() {
      var argc = arguments.length;
      var i, j, vi = 0;

      var vector = new FLOAT_ARRAY_TYPE( 2 );

      for( i = 0; i < argc && vi < 2; ++ i ) {
        var arg = arguments[i];
        if( arg === undefined ) {
          break;
        } else if( arg instanceof Array ||
            arg instanceof FLOAT_ARRAY_TYPE ) {
          for( j = 0; j < arg.length && vi < 2; ++ j ) {
            vector[vi ++] = arg[j];
          }
        } else {
          vector[vi ++] = arg;
        }
      }
      // Fill in missing elements with zero
      for( ; vi < 2; ++ vi ) {
        vector[vi] = 0;
      }

      return vector;
    };
    V2.prototype = new V();
    V2.prototype.constructor = V2;

    return V2;

  };

});
/*!
 * Lo-Dash v0.4.1 <http://lodash.com>
 * Copyright 2012 John-David Dalton <http://allyoucanleet.com/>
 * Based on Underscore.js 1.3.3, copyright 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
 * <http://documentcloud.github.com/underscore>
 * Available under MIT license <http://lodash.com/license>
 */
;(function(window, undefined) {
  

  /**
   * Used to cache the last `_.templateSettings.evaluate` delimiter to avoid
   * unnecessarily assigning `reEvaluateDelimiter` a new generated regexp.
   * Assigned in `_.template`.
   */
  var lastEvaluateDelimiter;

  /**
   * Used to cache the last template `options.variable` to avoid unnecessarily
   * assigning `reDoubleVariable` a new generated regexp. Assigned in `_.template`.
   */
  var lastVariable;

  /**
   * Used to match potentially incorrect data object references, like `obj.obj`,
   * in compiled templates. Assigned in `_.template`.
   */
  var reDoubleVariable;

  /**
   * Used to match "evaluate" delimiters, including internal delimiters,
   * in template text. Assigned in `_.template`.
   */
  var reEvaluateDelimiter;

  /** Detect free variable `exports` */
  var freeExports = typeof exports == 'object' && exports &&
    (typeof global == 'object' && global && global == global.global && (window = global), exports);

  /** Native prototype shortcuts */
  var ArrayProto = Array.prototype,
      ObjectProto = Object.prototype;

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used to restore the original `_` reference in `noConflict` */
  var oldDash = window._;

  /** Used to detect delimiter values that should be processed by `tokenizeEvaluate` */
  var reComplexDelimiter = /[-+=!~*%&^<>|{(\/]|\[\D|\b(?:delete|in|instanceof|new|typeof|void)\b/;

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /** Used to insert the data object variable into compiled template source */
  var reInsertVariable = /(?:__e|__t = )\(\s*(?![\d\s"']|this\.)/g;

  /** Used to detect if a method is native */
  var reNative = RegExp('^' +
    (ObjectProto.valueOf + '')
      .replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&')
      .replace(/valueOf|for [^\]]+/g, '.+?') + '$'
  );

  /** Used to match tokens in template text */
  var reToken = /__token__(\d+)/g;

  /** Used to match unescaped characters in strings for inclusion in HTML */
  var reUnescapedHtml = /[&<"']/g;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to fix the JScript [[DontEnum]] bug */
  var shadowed = [
    'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
    'toLocaleString', 'toString', 'valueOf'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** Used to replace template delimiters */
  var token = '__token__';

  /** Used to store tokenized template text snippets */
  var tokenized = [];

  /** Native method shortcuts */
  var concat = ArrayProto.concat,
      hasOwnProperty = ObjectProto.hasOwnProperty,
      push = ArrayProto.push,
      propertyIsEnumerable = ObjectProto.propertyIsEnumerable,
      slice = ArrayProto.slice,
      toString = ObjectProto.toString;

  /* Native method shortcuts for methods with the same name as other `lodash` methods */
  var nativeBind = reNative.test(nativeBind = slice.bind) && nativeBind,
      nativeIsArray = reNative.test(nativeIsArray = Array.isArray) && nativeIsArray,
      nativeIsFinite = window.isFinite,
      nativeKeys = reNative.test(nativeKeys = Object.keys) && nativeKeys;

  /** `Object#toString` result shortcuts */
  var arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Timer shortcuts */
  var clearTimeout = window.clearTimeout,
      setTimeout = window.setTimeout;

  /**
   * Detect the JScript [[DontEnum]] bug:
   * In IE < 9 an objects own properties, shadowing non-enumerable ones, are
   * made non-enumerable as well.
   */
  var hasDontEnumBug = !propertyIsEnumerable.call({ 'valueOf': 0 }, 'valueOf');

  /** Detect if `Array#slice` cannot be used to convert strings to arrays (e.g. Opera < 10.52) */
  var noArraySliceOnStrings = slice.call('x')[0] != 'x';

  /**
   * Detect lack of support for accessing string characters by index:
   * IE < 8 can't access characters by index and IE 8 can only access
   * characters by index on string literals.
   */
  var noCharByIndex = ('x'[0] + Object('x')[0]) != 'xx';

  /* Detect if `Function#bind` exists and is inferred to be fast (i.e. all but V8) */
  var isBindFast = nativeBind && /\n|Opera/.test(nativeBind + toString.call(window.opera));

  /* Detect if `Object.keys` exists and is inferred to be fast (i.e. V8, Opera, IE) */
  var isKeysFast = nativeKeys && /^.+$|true/.test(nativeKeys + !!window.attachEvent);

  /** Detect if sourceURL syntax is usable without erroring */
  try {
    // Adobe's and Narwhal's JS engines will error
    var useSourceURL = (Function('//@')(), true);
  } catch(e){ }

  /**
   * Used to escape characters for inclusion in HTML.
   * The `>` and `/` characters don't require escaping in HTML and have no
   * special meaning unless they're part of a tag or an unquoted attribute value
   * http://mathiasbynens.be/notes/ambiguous-ampersands (semi-related fun fact)
   */
  var htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '"': '&quot;',
    "'": '&#x27;'
  };

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /*--------------------------------------------------------------------------*/

  /**
   * The `lodash` function.
   *
   * @name _
   * @constructor
   * @param {Mixed} value The value to wrap in a `LoDash` instance.
   * @returns {Object} Returns a `LoDash` instance.
   */
  function lodash(value) {
    // allow invoking `lodash` without the `new` operator
    return new LoDash(value);
  }

  /**
   * Creates a `LoDash` instance that wraps a value to allow chaining.
   *
   * @private
   * @constructor
   * @param {Mixed} value The value to wrap.
   */
  function LoDash(value) {
    // exit early if already wrapped
    if (value && value._wrapped) {
      return value;
    }
    this._wrapped = value;
  }

  /**
   * By default, Lo-Dash uses embedded Ruby (ERB) style template delimiters,
   * change the following template settings to use alternative delimiters.
   *
   * @static
   * @memberOf _
   * @type Object
   */
  lodash.templateSettings = {

    /**
     * Used to detect `data` property values to be HTML-escaped.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'escape': /<%-([\s\S]+?)%>/g,

    /**
     * Used to detect code to be evaluated.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'evaluate': /<%([\s\S]+?)%>/g,

    /**
     * Used to detect `data` property values to inject.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'interpolate': /<%=([\s\S]+?)%>/g,

    /**
     * Used to reference the data object in the template text.
     *
     * @static
     * @memberOf _.templateSettings
     * @type String
     */
    'variable': 'obj'
  };

  /*--------------------------------------------------------------------------*/

  /**
   * The template used to create iterator functions.
   *
   * @private
   * @param {Obect} data The data object used to populate the text.
   * @returns {String} Returns the interpolated text.
   */
  var iteratorTemplate = template(
    // assign the `result` variable an initial value
    'var result<% if (init) { %> = <%= init %><% } %>;\n' +
    // add code to exit early or do so if the first argument is falsey
    '<%= exit %>;\n' +
    // add code after the exit snippet but before the iteration branches
    '<%= top %>;\n' +
    'var index, iteratee = <%= iteratee %>;\n' +

    // the following branch is for iterating arrays and array-like objects
    '<% if (arrayBranch) { %>' +
    'var length = iteratee.length; index = -1;' +
    '  <% if (objectBranch) { %>\nif (length === length >>> 0) {<% } %>' +

    // add support for accessing string characters by index if needed
    '  <% if (noCharByIndex) { %>\n' +
    '  if (toString.call(iteratee) == stringClass) {\n' +
    '    iteratee = iteratee.split(\'\')\n' +
    '  }' +
    '  <% } %>\n' +

    '  <%= arrayBranch.beforeLoop %>;\n' +
    '  while (++index < length) {\n' +
    '    <%= arrayBranch.inLoop %>\n' +
    '  }' +
    '  <% if (objectBranch) { %>\n}<% } %>' +
    '<% } %>' +

    // the following branch is for iterating an object's own/inherited properties
    '<% if (objectBranch) { %>' +
    '  <% if (arrayBranch) { %>\nelse {<% } %>' +
    '  <% if (!hasDontEnumBug) { %>\n' +
    '  var skipProto = typeof iteratee == \'function\' && \n' +
    '    propertyIsEnumerable.call(iteratee, \'prototype\');\n' +
    '  <% } %>' +

    // iterate own properties using `Object.keys` if it's fast
    '  <% if (isKeysFast && useHas) { %>\n' +
    '  var props = nativeKeys(iteratee),\n' +
    '      propIndex = -1,\n' +
    '      length = props.length;\n\n' +
    '  <%= objectBranch.beforeLoop %>;\n' +
    '  while (++propIndex < length) {\n' +
    '    index = props[propIndex];\n' +
    '    if (!(skipProto && index == \'prototype\')) {\n' +
    '      <%= objectBranch.inLoop %>\n' +
    '    }\n' +
    '  }' +

    // else using a for-in loop
    '  <% } else { %>\n' +
    '  <%= objectBranch.beforeLoop %>;\n' +
    '  for (index in iteratee) {' +
    '    <% if (hasDontEnumBug) { %>\n' +
    '    <%   if (useHas) { %>if (hasOwnProperty.call(iteratee, index)) {\n  <% } %>' +
    '    <%= objectBranch.inLoop %>;\n' +
    '    <%   if (useHas) { %>}<% } %>' +
    '    <% } else { %>\n' +

    // Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1
    // (if the prototype or a property on the prototype has been set)
    // incorrectly sets a function's `prototype` property [[Enumerable]]
    // value to `true`. Because of this Lo-Dash standardizes on skipping
    // the the `prototype` property of functions regardless of its
    // [[Enumerable]] value.
    '    if (!(skipProto && index == \'prototype\')<% if (useHas) { %> &&\n' +
    '        hasOwnProperty.call(iteratee, index)<% } %>) {\n' +
    '      <%= objectBranch.inLoop %>\n' +
    '    }' +
    '    <% } %>\n' +
    '  }' +
    '  <% } %>' +

    // Because IE < 9 can't set the `[[Enumerable]]` attribute of an
    // existing property and the `constructor` property of a prototype
    // defaults to non-enumerable, Lo-Dash skips the `constructor`
    // property when it infers it's iterating over a `prototype` object.
    '  <% if (hasDontEnumBug) { %>\n\n' +
    '  var ctor = iteratee.constructor;\n' +
    '    <% for (var k = 0; k < 7; k++) { %>\n' +
    '  index = \'<%= shadowed[k] %>\';\n' +
    '  if (<%' +
    '      if (shadowed[k] == \'constructor\') {' +
    '        %>!(ctor && ctor.prototype === iteratee) && <%' +
    '      } %>hasOwnProperty.call(iteratee, index)) {\n' +
    '    <%= objectBranch.inLoop %>\n' +
    '  }' +
    '    <% } %>' +
    '  <% } %>' +
    '  <% if (arrayBranch) { %>\n}<% } %>' +
    '<% } %>\n' +

    // add code to the bottom of the iteration function
    '<%= bottom %>;\n' +
    // finally, return the `result`
    'return result'
  );

  /**
   * Reusable iterator options shared by
   * `every`, `filter`, `find`, `forEach`, `forIn`, `forOwn`, `groupBy`, `map`,
   * `reject`, `some`, and `sortBy`.
   */
  var baseIteratorOptions = {
    'args': 'collection, callback, thisArg',
    'init': 'collection',
    'top':
      'if (!callback) {\n' +
      '  callback = identity\n' +
      '}\n' +
      'else if (thisArg) {\n' +
      '  callback = iteratorBind(callback, thisArg)\n' +
      '}',
    'inLoop': 'callback(iteratee[index], index, collection)'
  };

  /** Reusable iterator options for `every` and `some` */
  var everyIteratorOptions = {
    'init': 'true',
    'inLoop': 'if (!callback(iteratee[index], index, collection)) return !result'
  };

  /** Reusable iterator options for `defaults` and `extend` */
  var extendIteratorOptions = {
    'args': 'object',
    'init': 'object',
    'top':
      'for (var source, sourceIndex = 1, length = arguments.length; sourceIndex < length; sourceIndex++) {\n' +
      '  source = arguments[sourceIndex];\n' +
      (hasDontEnumBug ? '  if (source) {' : ''),
    'iteratee': 'source',
    'useHas': false,
    'inLoop': 'result[index] = iteratee[index]',
    'bottom': (hasDontEnumBug ? '  }\n' : '') + '}'
  };

  /** Reusable iterator options for `filter` and `reject` */
  var filterIteratorOptions = {
    'init': '[]',
    'inLoop': 'callback(iteratee[index], index, collection) && result.push(iteratee[index])'
  };

  /** Reusable iterator options for `find`, `forEach`, `forIn`, and `forOwn` */
  var forEachIteratorOptions = {
    'top': 'if (thisArg) callback = iteratorBind(callback, thisArg)'
  };

  /** Reusable iterator options for `forIn` and `forOwn` */
  var forOwnIteratorOptions = {
    'inLoop': {
      'object': baseIteratorOptions.inLoop
    }
  };

  /** Reusable iterator options for `invoke`, `map`, `pluck`, and `sortBy` */
  var mapIteratorOptions = {
    'init': '',
    'exit': 'if (!collection) return []',
    'beforeLoop': {
      'array':  'result = Array(length)',
      'object': 'result = ' + (isKeysFast ? 'Array(length)' : '[]')
    },
    'inLoop': {
      'array':  'result[index] = callback(iteratee[index], index, collection)',
      'object': 'result' + (isKeysFast ? '[propIndex] = ' : '.push') + '(callback(iteratee[index], index, collection))'
    }
  };

  /*--------------------------------------------------------------------------*/

  /**
   * Creates compiled iteration functions. The iteration function will be created
   * to iterate over only objects if the first argument of `options.args` is
   * "object" or `options.inLoop.array` is falsey.
   *
   * @private
   * @param {Object} [options1, options2, ...] The compile options objects.
   *
   *  args - A string of comma separated arguments the iteration function will
   *   accept.
   *
   *  init - A string to specify the initial value of the `result` variable.
   *
   *  exit - A string of code to use in place of the default exit-early check
   *   of `if (!arguments[0]) return result`.
   *
   *  top - A string of code to execute after the exit-early check but before
   *   the iteration branches.
   *
   *  beforeLoop - A string or object containing an "array" or "object" property
   *   of code to execute before the array or object loops.
   *
   *  iteratee - A string or object containing an "array" or "object" property
   *   of the variable to be iterated in the loop expression.
   *
   *  useHas - A boolean to specify whether or not to use `hasOwnProperty` checks
   *   in the object loop.
   *
   *  inLoop - A string or object containing an "array" or "object" property
   *   of code to execute in the array or object loops.
   *
   *  bottom - A string of code to execute after the iteration branches but
   *   before the `result` is returned.
   *
   * @returns {Function} Returns the compiled function.
   */
  function createIterator() {
    var object,
        prop,
        value,
        index = -1,
        length = arguments.length;

    // merge options into a template data object
    var data = {
      'bottom': '',
      'exit': '',
      'init': '',
      'top': '',
      'arrayBranch': { 'beforeLoop': '' },
      'objectBranch': { 'beforeLoop': '' }
    };

    while (++index < length) {
      object = arguments[index];
      for (prop in object) {
        value = (value = object[prop]) == null ? '' : value;
        // keep this regexp explicit for the build pre-process
        if (/beforeLoop|inLoop/.test(prop)) {
          if (typeof value == 'string') {
            value = { 'array': value, 'object': value };
          }
          data.arrayBranch[prop] = value.array;
          data.objectBranch[prop] = value.object;
        } else {
          data[prop] = value;
        }
      }
    }
    // set additional template `data` values
    var args = data.args,
        firstArg = /^[^,]+/.exec(args)[0],
        iteratee = (data.iteratee = data.iteratee || firstArg);

    data.firstArg = firstArg;
    data.hasDontEnumBug = hasDontEnumBug;
    data.isKeysFast = isKeysFast;
    data.shadowed = shadowed;
    data.useHas = data.useHas !== false;

    if (!('noCharByIndex' in data)) {
      data.noCharByIndex = noCharByIndex;
    }
    if (!data.exit) {
      data.exit = 'if (!' + firstArg + ') return result';
    }
    if (firstArg != 'collection' || !data.arrayBranch.inLoop) {
      data.arrayBranch = null;
    }
    // create the function factory
    var factory = Function(
        'arrayClass, compareAscending, funcClass, hasOwnProperty, identity, ' +
        'iteratorBind, objectTypes, nativeKeys, propertyIsEnumerable, ' +
        'slice, stringClass, toString',
      ' return function(' + args + ') {\n' + iteratorTemplate(data) + '\n}'
    );
    // return the compiled function
    return factory(
      arrayClass, compareAscending, funcClass, hasOwnProperty, identity,
      iteratorBind, objectTypes, nativeKeys, propertyIsEnumerable, slice,
      stringClass, toString
    );
  }

  /**
   * Used by `sortBy` to compare transformed values of `collection`, sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {Number} Returns `-1` if `a` < `b`, `0` if `a` == `b`, or `1` if `a` > `b`.
   */
  function compareAscending(a, b) {
    a = a.criteria;
    b = b.criteria;

    if (a === undefined) {
      return 1;
    }
    if (b === undefined) {
      return -1;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  }

  /**
   * Used by `template` to replace tokens with their corresponding code snippets.
   *
   * @private
   * @param {String} match The matched token.
   * @param {String} index The `tokenized` index of the code snippet.
   * @returns {String} Returns the code snippet.
   */
  function detokenize(match, index) {
    return tokenized[index];
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Used by `escape` to escape characters for inclusion in HTML.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeHtmlChar(match) {
    return htmlEscapes[match];
  }

  /**
   * Creates a new function that, when called, invokes `func` with the `this`
   * binding of `thisArg` and the arguments (value, index, object).
   *
   * @private
   * @param {Function} func The function to bind.
   * @param {Mixed} [thisArg] The `this` binding of `func`.
   * @returns {Function} Returns the new bound function.
   */
  function iteratorBind(func, thisArg) {
    return function(value, index, object) {
      return func.call(thisArg, value, index, object);
    };
  }

  /**
   * A no-operation function.
   *
   * @private
   */
  function noop() {
    // no operation performed
  }

  /**
   * A shim implementation of `Object.keys` that produces an array of the given
   * object's own enumerable property names.
   *
   * @private
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names.
   */
  var shimKeys = createIterator({
    'args': 'object',
    'exit': 'if (!(object && objectTypes[typeof object])) throw TypeError()',
    'init': '[]',
    'inLoop': 'result.push(index)'
  });

  /**
   * Used by `template` to replace "escape" template delimiters with tokens.
   *
   * @private
   * @param {String} match The matched template delimiter.
   * @param {String} value The delimiter value.
   * @returns {String} Returns a token.
   */
  function tokenizeEscape(match, value) {
    if (reComplexDelimiter.test(value)) {
      return '<e%-' + value + '%>';
    }
    var index = tokenized.length;
    tokenized[index] = "' +\n__e(" + value + ") +\n'";
    return token + index;
  }

  /**
   * Used by `template` to replace "evaluate" template delimiters, or complex
   * "escape" and "interpolate" delimiters, with tokens.
   *
   * @private
   * @param {String} match The matched template delimiter.
   * @param {String} value The delimiter value.
   * @param {String} escapeValue The "escape" delimiter value.
   * @param {String} interpolateValue The "interpolate" delimiter value.
   * @returns {String} Returns a token.
   */
  function tokenizeEvaluate(match, value, escapeValue, interpolateValue) {
    var index = tokenized.length;
    if (value) {
      tokenized[index] = "';\n" + value + ";\n__p += '"
    } else if (escapeValue) {
      tokenized[index] = "' +\n__e(" + escapeValue + ") +\n'";
    } else if (interpolateValue) {
      tokenized[index] = "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
    }
    return token + index;
  }

  /**
   * Used by `template` to replace "interpolate" template delimiters with tokens.
   *
   * @private
   * @param {String} match The matched template delimiter.
   * @param {String} value The delimiter value.
   * @returns {String} Returns a token.
   */
  function tokenizeInterpolate(match, value) {
    if (reComplexDelimiter.test(value)) {
      return '<e%=' + value + '%>';
    }
    var index = tokenized.length;
    tokenized[index] = "' +\n((__t = (" + value + ")) == null ? '' : __t) +\n'";
    return token + index;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Checks if a given `target` value is present in a `collection` using strict
   * equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @alias include
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Mixed} target The value to check for.
   * @returns {Boolean} Returns `true` if `target` value is found, else `false`.
   * @example
   *
   * _.contains([1, 2, 3], 3);
   * // => true
   *
   * _.contains({ 'name': 'moe', 'age': 40 }, 'moe');
   * // => true
   *
   * _.contains('curly', 'ur');
   * // => true
   */
  var contains = createIterator({
    'args': 'collection, target',
    'init': 'false',
    'noCharByIndex': false,
    'beforeLoop': {
      'array': 'if (toString.call(iteratee) == stringClass) return collection.indexOf(target) > -1'
    },
    'inLoop': 'if (iteratee[index] === target) return true'
  });

  /**
   * Checks if the `callback` returns a truthy value for **all** elements of a
   * `collection`. The `callback` is bound to `thisArg` and invoked with 3
   * arguments; for arrays they are (value, index, array) and for objects they
   * are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias all
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Boolean} Returns `true` if all values pass the callback check, else `false`.
   * @example
   *
   * _.every([true, 1, null, 'yes'], Boolean);
   * // => false
   */
  var every = createIterator(baseIteratorOptions, everyIteratorOptions);

  /**
   * Examines each value in a `collection`, returning an array of all values the
   * `callback` returns truthy for. The `callback` is bound to `thisArg` and
   * invoked with 3 arguments; for arrays they are (value, index, array) and for
   * objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias select
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of values that passed callback check.
   * @example
   *
   * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => [2, 4, 6]
   */
  var filter = createIterator(baseIteratorOptions, filterIteratorOptions);

  /**
   * Examines each value in a `collection`, returning the first one the `callback`
   * returns truthy for. The function returns as soon as it finds an acceptable
   * value, and does not iterate over the entire `collection`. The `callback` is
   * bound to `thisArg` and invoked with 3 arguments; for arrays they are
   * (value, index, array) and for objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias detect
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the value that passed the callback check, else `undefined`.
   * @example
   *
   * var even = _.find([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => 2
   */
  var find = createIterator(baseIteratorOptions, forEachIteratorOptions, {
    'init': '',
    'inLoop': 'if (callback(iteratee[index], index, collection)) return iteratee[index]'
  });

  /**
   * Iterates over a `collection`, executing the `callback` for each value in the
   * `collection`. The `callback` is bound to `thisArg` and invoked with 3
   * arguments; for arrays they are (value, index, array) and for objects they
   * are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias each
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array|Object} Returns the `collection`.
   * @example
   *
   * _([1, 2, 3]).forEach(alert).join(',');
   * // => alerts each number and returns '1,2,3'
   *
   * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, alert);
   * // => alerts each number (order is not guaranteed)
   */
  var forEach = createIterator(baseIteratorOptions, forEachIteratorOptions);

  /**
   * Splits `collection` into sets, grouped by the result of running each value
   * through `callback`. The `callback` is bound to `thisArg` and invoked with
   * 3 arguments; for arrays they are (value, index, array) and for objects they
   * are (value, key, object). The `callback` argument may also be the name of a
   * property to group by.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function|String} callback The function called per iteration or
   *  property name to group by.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Object} Returns an object of grouped values.
   * @example
   *
   * _.groupBy([1.3, 2.1, 2.4], function(num) { return Math.floor(num); });
   * // => { '1': [1.3], '2': [2.1, 2.4] }
   *
   * _.groupBy([1.3, 2.1, 2.4], function(num) { return this.floor(num); }, Math);
   * // => { '1': [1.3], '2': [2.1, 2.4] }
   *
   * _.groupBy(['one', 'two', 'three'], 'length');
   * // => { '3': ['one', 'two'], '5': ['three'] }
   */
  var groupBy = createIterator(baseIteratorOptions, {
    'init': '{}',
    'top':
      'var prop, isFunc = typeof callback == \'function\';\n' +
      'if (isFunc && thisArg) callback = iteratorBind(callback, thisArg)',
    'inLoop':
      'prop = isFunc\n' +
      '  ? callback(iteratee[index], index, collection)\n' +
      '  : iteratee[index][callback];\n' +
      '(hasOwnProperty.call(result, prop) ? result[prop] : result[prop] = []).push(iteratee[index])'
  });

  /**
   * Invokes the method named by `methodName` on each element in the `collection`.
   * Additional arguments will be passed to each invoked method. If `methodName`
   * is a function it will be invoked for, and `this` bound to, each element
   * in the `collection`.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function|String} methodName The name of the method to invoke or
   *  the function invoked per iteration.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the method with.
   * @returns {Array} Returns a new array of values returned from each invoked method.
   * @example
   *
   * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
   * // => [[1, 5, 7], [1, 2, 3]]
   *
   * _.invoke([123, 456], String.prototype.split, '');
   * // => [['1', '2', '3'], ['4', '5', '6']]
   */
  var invoke = createIterator(mapIteratorOptions, {
    'args': 'collection, methodName',
    'top':
      'var args = slice.call(arguments, 2),\n' +
      '    isFunc = typeof methodName == \'function\'',
    'inLoop': {
      'array':
        'result[index] = (isFunc ? methodName : iteratee[index][methodName])' +
        '.apply(iteratee[index], args)',
      'object':
        'result' + (isKeysFast ? '[propIndex] = ' : '.push') +
        '((isFunc ? methodName : iteratee[index][methodName]).apply(iteratee[index], args))'
    }
  });

  /**
   * Produces a new array of values by mapping each element in the `collection`
   * through a transformation `callback`. The `callback` is bound to `thisArg`
   * and invoked with 3 arguments; for arrays they are (value, index, array)
   * and for objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias collect
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of values returned by the callback.
   * @example
   *
   * _.map([1, 2, 3], function(num) { return num * 3; });
   * // => [3, 6, 9]
   *
   * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
   * // => [3, 6, 9] (order is not guaranteed)
   */
  var map = createIterator(baseIteratorOptions, mapIteratorOptions);

  /**
   * Retrieves the value of a specified property from all elements in
   * the `collection`.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {String} property The property to pluck.
   * @returns {Array} Returns a new array of property values.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * _.pluck(stooges, 'name');
   * // => ['moe', 'larry', 'curly']
   */
  var pluck = createIterator(mapIteratorOptions, {
    'args': 'collection, property',
    'inLoop': {
      'array':  'result[index] = iteratee[index][property]',
      'object': 'result' + (isKeysFast ? '[propIndex] = ' : '.push') + '(iteratee[index][property])'
    }
  });

  /**
   * Boils down a `collection` to a single value. The initial state of the
   * reduction is `accumulator` and each successive step of it should be returned
   * by the `callback`. The `callback` is bound to `thisArg` and invoked with 4
   * arguments; for arrays they are (accumulator, value, index, array) and for
   * objects they are (accumulator, value, key, object).
   *
   * @static
   * @memberOf _
   * @alias foldl, inject
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [accumulator] Initial value of the accumulator.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the accumulated value.
   * @example
   *
   * var sum = _.reduce([1, 2, 3], function(memo, num) { return memo + num; });
   * // => 6
   */
  var reduce = createIterator({
    'args': 'collection, callback, accumulator, thisArg',
    'init': 'accumulator',
    'top':
      'var noaccum = arguments.length < 3;\n' +
      'if (thisArg) callback = iteratorBind(callback, thisArg)',
    'beforeLoop': {
      'array': 'if (noaccum) result = collection[++index]'
    },
    'inLoop': {
      'array':
        'result = callback(result, iteratee[index], index, collection)',
      'object':
        'result = noaccum\n' +
        '  ? (noaccum = false, iteratee[index])\n' +
        '  : callback(result, iteratee[index], index, collection)'
    }
  });

  /**
   * The right-associative version of `_.reduce`.
   *
   * @static
   * @memberOf _
   * @alias foldr
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [accumulator] Initial value of the accumulator.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the accumulated value.
   * @example
   *
   * var list = [[0, 1], [2, 3], [4, 5]];
   * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
   * // => [4, 5, 2, 3, 0, 1]
   */
  function reduceRight(collection, callback, accumulator, thisArg) {
    if (!collection) {
      return accumulator;
    }

    var length = collection.length,
        noaccum = arguments.length < 3;

    if(thisArg) {
      callback = iteratorBind(callback, thisArg);
    }
    if (length === length >>> 0) {
      var iteratee = noCharByIndex && toString.call(collection) == stringClass
        ? collection.split('')
        : collection;

      if (length && noaccum) {
        accumulator = iteratee[--length];
      }
      while (length--) {
        accumulator = callback(accumulator, iteratee[length], length, collection);
      }
      return accumulator;
    }

    var prop,
        props = keys(collection);

    length = props.length;
    if (length && noaccum) {
      accumulator = collection[props[--length]];
    }
    while (length--) {
      prop = props[length];
      accumulator = callback(accumulator, collection[prop], prop, collection);
    }
    return accumulator;
  }

  /**
   * The opposite of `_.filter`, this method returns the values of a `collection`
   * that `callback` does **not** return truthy for.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of values that did **not** pass the callback check.
   * @example
   *
   * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => [1, 3, 5]
   */
  var reject = createIterator(baseIteratorOptions, filterIteratorOptions, {
    'inLoop': '!' + filterIteratorOptions.inLoop
  });

  /**
   * Checks if the `callback` returns a truthy value for **any** element of a
   * `collection`. The function returns as soon as it finds passing value, and
   * does not iterate over the entire `collection`. The `callback` is bound to
   * `thisArg` and invoked with 3 arguments; for arrays they are
   * (value, index, array) and for objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias any
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Boolean} Returns `true` if any value passes the callback check, else `false`.
   * @example
   *
   * _.some([null, 0, 'yes', false]);
   * // => true
   */
  var some = createIterator(baseIteratorOptions, everyIteratorOptions, {
    'init': 'false',
    'inLoop': everyIteratorOptions.inLoop.replace('!', '')
  });


  /**
   * Produces a new sorted array, sorted in ascending order by the results of
   * running each element of `collection` through a transformation `callback`.
   * The `callback` is bound to `thisArg` and invoked with 3 arguments;
   * for arrays they are (value, index, array) and for objects they are
   * (value, key, object). The `callback` argument may also be the name of a
   * property to sort by (e.g. 'length').
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function|String} callback The function called per iteration or
   *  property name to sort by.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of sorted values.
   * @example
   *
   * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
   * // => [3, 1, 2]
   *
   * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
   * // => [3, 1, 2]
   *
   * _.sortBy(['larry', 'brendan', 'moe'], 'length');
   * // => ['moe', 'larry', 'brendan']
   */
  var sortBy = createIterator(baseIteratorOptions, mapIteratorOptions, {
    'top':
      'if (typeof callback == \'string\') {\n' +
      '  var prop = callback;\n' +
      '  callback = function(collection) { return collection[prop] }\n' +
      '}\n' +
      'else if (thisArg) {\n' +
      '  callback = iteratorBind(callback, thisArg)\n' +
      '}',
    'inLoop': {
      'array':
        'result[index] = {\n' +
        '  criteria: callback(iteratee[index], index, collection),\n' +
        '  value: iteratee[index]\n' +
        '}',
      'object':
        'result' + (isKeysFast ? '[propIndex] = ' : '.push') + '({\n' +
        '  criteria: callback(iteratee[index], index, collection),\n' +
        '  value: iteratee[index]\n' +
        '})'
    },
    'bottom':
      'result.sort(compareAscending);\n' +
      'length = result.length;\n' +
      'while (length--) {\n' +
      '  result[length] = result[length].value\n' +
      '}'
  });

  /**
   * Converts the `collection`, into an array. Useful for converting the
   * `arguments` object.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to convert.
   * @returns {Array} Returns the new converted array.
   * @example
   *
   * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
   * // => [2, 3, 4]
   */
  function toArray(collection) {
    if (!collection) {
      return [];
    }
    if (collection.toArray && toString.call(collection.toArray) == funcClass) {
      return collection.toArray();
    }
    var length = collection.length;
    if (length === length >>> 0) {
      return (noArraySliceOnStrings ? toString.call(collection) == stringClass : typeof collection == 'string')
        ? collection.split('')
        : slice.call(collection);
    }
    return values(collection);
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Produces a new array with all falsey values of `array` removed. The values
   * `false`, `null`, `0`, `""`, `undefined` and `NaN` are all falsey.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to compact.
   * @returns {Array} Returns a new filtered array.
   * @example
   *
   * _.compact([0, 1, false, 2, '', 3]);
   * // => [1, 2, 3]
   */
  function compact(array) {
    var result = [];
    if (!array) {
      return result;
    }
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (array[index]) {
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Produces a new array of `array` values not present in the other arrays
   * using strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to process.
   * @param {Array} [array1, array2, ...] Arrays to check.
   * @returns {Array} Returns a new array of `array` values not present in the
   *  other arrays.
   * @example
   *
   * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
   * // => [1, 3, 4]
   */
  function difference(array) {
    var result = [];
    if (!array) {
      return result;
    }
    var index = -1,
        length = array.length,
        flattened = concat.apply(result, arguments);

    while (++index < length) {
      if (indexOf(flattened, array[index], length) < 0) {
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Gets the first value of the `array`. Pass `n` to return the first `n` values
   * of the `array`.
   *
   * @static
   * @memberOf _
   * @alias head, take
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Mixed} Returns the first value or an array of the first `n` values
   *  of `array`.
   * @example
   *
   * _.first([5, 4, 3, 2, 1]);
   * // => 5
   */
  function first(array, n, guard) {
    if (array) {
      return (n == null || guard) ? array[0] : slice.call(array, 0, n);
    }
  }

  /**
   * Flattens a nested array (the nesting can be to any depth). If `shallow` is
   * truthy, `array` will only be flattened a single level.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to compact.
   * @param {Boolean} shallow A flag to indicate only flattening a single level.
   * @returns {Array} Returns a new flattened array.
   * @example
   *
   * _.flatten([1, [2], [3, [[4]]]]);
   * // => [1, 2, 3, 4];
   *
   * _.flatten([1, [2], [3, [[4]]]], true);
   * // => [1, 2, 3, [[4]]];
   */
  function flatten(array, shallow) {
    var result = [];
    if (!array) {
      return result;
    }
    var value,
        index = -1,
        length = array.length;

    while (++index < length) {
      value = array[index];
      if (isArray(value)) {
        push.apply(result, shallow ? value : flatten(value));
      } else {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Gets the index at which the first occurrence of `value` is found using
   * strict equality for comparisons, i.e. `===`. If the `array` is already
   * sorted, passing `true` for `isSorted` will run a faster binary search.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @param {Boolean|Number} [fromIndex=0] The index to start searching from or
   *  `true` to perform a binary search on a sorted `array`.
   * @returns {Number} Returns the index of the matched value or `-1`.
   * @example
   *
   * _.indexOf([1, 2, 3, 1, 2, 3], 2);
   * // => 1
   *
   * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
   * // => 4
   *
   * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
   * // => 2
   */
  function indexOf(array, value, fromIndex) {
    if (!array) {
      return -1;
    }
    var index = -1,
        length = array.length;

    if (fromIndex) {
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? Math.max(0, length + fromIndex) : fromIndex) - 1;
      } else {
        index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
    }
    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Gets all but the last value of `array`. Pass `n` to exclude the last `n`
   * values from the result.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Array} Returns all but the last value or `n` values of `array`.
   * @example
   *
   * _.initial([3, 2, 1]);
   * // => [3, 2]
   */
  function initial(array, n, guard) {
    if (!array) {
      return [];
    }
    return slice.call(array, 0, -((n == null || guard) ? 1 : n));
  }

  /**
   * Computes the intersection of all the passed-in arrays.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of unique values, in order, that are
   *  present in **all** of the arrays.
   * @example
   *
   * _.intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]);
   * // => [1, 2]
   */
  function intersection(array) {
    var result = [];
    if (!array) {
      return result;
    }
    var value,
        index = -1,
        length = array.length,
        others = slice.call(arguments, 1);

    while (++index < length) {
      value = array[index];
      if (indexOf(result, value) < 0 &&
          every(others, function(other) { return indexOf(other, value) > -1; })) {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Gets the last value of the `array`. Pass `n` to return the lasy `n` values
   * of the `array`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Mixed} Returns the last value or an array of the last `n` values
   *  of `array`.
   * @example
   *
   * _.last([3, 2, 1]);
   * // => 1
   */
  function last(array, n, guard) {
    if (array) {
      var length = array.length;
      return (n == null || guard) ? array[length - 1] : slice.call(array, -n || length);
    }
  }

  /**
   * Gets the index at which the last occurrence of `value` is found using
   * strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @param {Number} [fromIndex=array.length-1] The index to start searching from.
   * @returns {Number} Returns the index of the matched value or `-1`.
   * @example
   *
   * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
   * // => 4
   *
   * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
   * // => 1
   */
  function lastIndexOf(array, value, fromIndex) {
    if (!array) {
      return -1;
    }
    var index = array.length;
    if (fromIndex && typeof fromIndex == 'number') {
      index = (fromIndex < 0 ? Math.max(0, index + fromIndex) : Math.min(fromIndex, index - 1)) + 1;
    }
    while (index--) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Retrieves the maximum value of an `array`. If `callback` is passed,
   * it will be executed for each value in the `array` to generate the
   * criterion by which the value is ranked. The `callback` is bound to
   * `thisArg` and invoked with 3 arguments; (value, index, array).
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Function} [callback] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the maximum value.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * _.max(stooges, function(stooge) { return stooge.age; });
   * // => { 'name': 'curly', 'age': 60 };
   */
  function max(array, callback, thisArg) {
    var computed = -Infinity,
        result = computed;

    if (!array) {
      return result;
    }
    var current,
        index = -1,
        length = array.length;

    if (!callback) {
      while (++index < length) {
        if (array[index] > result) {
          result = array[index];
        }
      }
      return result;
    }
    if (thisArg) {
      callback = iteratorBind(callback, thisArg);
    }
    while (++index < length) {
      current = callback(array[index], index, array);
      if (current > computed) {
        computed = current;
        result = array[index];
      }
    }
    return result;
  }

  /**
   * Retrieves the minimum value of an `array`. If `callback` is passed,
   * it will be executed for each value in the `array` to generate the
   * criterion by which the value is ranked. The `callback` is bound to `thisArg`
   * and invoked with 3 arguments; (value, index, array).
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Function} [callback] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the minimum value.
   * @example
   *
   * _.min([10, 5, 100, 2, 1000]);
   * // => 2
   */
  function min(array, callback, thisArg) {
    var computed = Infinity,
        result = computed;

    if (!array) {
      return result;
    }
    var current,
        index = -1,
        length = array.length;

    if (!callback) {
      while (++index < length) {
        if (array[index] < result) {
          result = array[index];
        }
      }
      return result;
    }
    if (thisArg) {
      callback = iteratorBind(callback, thisArg);
    }
    while (++index < length) {
      current = callback(array[index], index, array);
      if (current < computed) {
        computed = current;
        result = array[index];
      }
    }
    return result;
  }

  /**
   * Creates an array of numbers (positive and/or negative) progressing from
   * `start` up to but not including `stop`. This method is a port of Python's
   * `range()` function. See http://docs.python.org/library/functions.html#range.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Number} [start=0] The start of the range.
   * @param {Number} end The end of the range.
   * @param {Number} [step=1] The value to increment or descrement by.
   * @returns {Array} Returns a new range array.
   * @example
   *
   * _.range(10);
   * // => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
   *
   * _.range(1, 11);
   * // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
   *
   * _.range(0, 30, 5);
   * // => [0, 5, 10, 15, 20, 25]
   *
   * _.range(0, -10, -1);
   * // => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
   *
   * _.range(0);
   * // => []
   */
  function range(start, end, step) {
    step || (step = 1);
    if (end == null) {
      end = start || 0;
      start = 0;
    }
    // use `Array(length)` so V8 will avoid the slower "dictionary" mode
    // http://www.youtube.com/watch?v=XAqIpGU8ZZk#t=16m27s
    var index = -1,
        length = Math.max(0, Math.ceil((end - start) / step)),
        result = Array(length);

    while (++index < length) {
      result[index] = start;
      start += step;
    }
    return result;
  }

  /**
   * The opposite of `_.initial`, this method gets all but the first value of
   * `array`. Pass `n` to exclude the first `n` values from the result.
   *
   * @static
   * @memberOf _
   * @alias tail
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Array} Returns all but the first value or `n` values of `array`.
   * @example
   *
   * _.rest([3, 2, 1]);
   * // => [2, 1]
   */
  function rest(array, n, guard) {
    if (!array) {
      return [];
    }
    return slice.call(array, (n == null || guard) ? 1 : n);
  }

  /**
   * Produces a new array of shuffled `array` values, using a version of the
   * Fisher-Yates shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to shuffle.
   * @returns {Array} Returns a new shuffled array.
   * @example
   *
   * _.shuffle([1, 2, 3, 4, 5, 6]);
   * // => [4, 1, 6, 3, 5, 2]
   */
  function shuffle(array) {
    if (!array) {
      return [];
    }
    var rand,
        index = -1,
        length = array.length,
        result = Array(length);

    while (++index < length) {
      rand = Math.floor(Math.random() * (index + 1));
      result[index] = result[rand];
      result[rand] = array[index];
    }
    return result;
  }

  /**
   * Uses a binary search to determine the smallest index at which the `value`
   * should be inserted into `array` in order to maintain the sort order of the
   * sorted `array`. If `callback` is passed, it will be executed for `value` and
   * each element in `array` to compute their sort ranking. The `callback` is
   * bound to `thisArg` and invoked with 1 argument; (value).
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Mixed} value The value to evaluate.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Number} Returns the index at which the value should be inserted
   *  into `array`.
   * @example
   *
   * _.sortedIndex([20, 30, 40], 35);
   * // => 2
   *
   * var dict = {
   *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'thirty-five': 35, 'fourty': 40 }
   * };
   *
   * _.sortedIndex(['twenty', 'thirty', 'fourty'], 'thirty-five', function(word) {
   *   return dict.wordToNumber[word];
   * });
   * // => 2
   *
   * _.sortedIndex(['twenty', 'thirty', 'fourty'], 'thirty-five', function(word) {
   *   return this.wordToNumber[word];
   * }, dict);
   * // => 2
   */
  function sortedIndex(array, value, callback, thisArg) {
    if (!array) {
      return 0;
    }
    var mid,
        low = 0,
        high = array.length;

    if (callback) {
      if (thisArg) {
        callback = bind(callback, thisArg);
      }
      value = callback(value);
      while (low < high) {
        mid = (low + high) >>> 1;
        callback(array[mid]) < value ? low = mid + 1 : high = mid;
      }
    } else {
      while (low < high) {
        mid = (low + high) >>> 1;
        array[mid] < value ? low = mid + 1 : high = mid;
      }
    }
    return low;
  }

  /**
   * Computes the union of the passed-in arrays.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of unique values, in order, that are
   *  present in one or more of the arrays.
   * @example
   *
   * _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
   * // => [1, 2, 3, 101, 10]
   */
  function union() {
    var index = -1,
        result = [],
        flattened = concat.apply(result, arguments),
        length = flattened.length;

    while (++index < length) {
      if (indexOf(result, flattened[index]) < 0) {
        result.push(flattened[index]);
      }
    }
    return result;
  }

  /**
   * Produces a duplicate-value-free version of the `array` using strict equality
   * for comparisons, i.e. `===`. If the `array` is already sorted, passing `true`
   * for `isSorted` will run a faster algorithm. If `callback` is passed,
   * each value of `array` is passed through a transformation `callback` before
   * uniqueness is computed. The `callback` is bound to `thisArg` and invoked
   * with 3 arguments; (value, index, array).
   *
   * @static
   * @memberOf _
   * @alias unique
   * @category Arrays
   * @param {Array} array The array to process.
   * @param {Boolean} [isSorted=false] A flag to indicate that the `array` is already sorted.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a duplicate-value-free array.
   * @example
   *
   * _.uniq([1, 2, 1, 3, 1]);
   * // => [1, 2, 3]
   *
   * _.uniq([1, 1, 2, 2, 3], true);
   * // => [1, 2, 3]
   *
   * _.uniq([1, 2, 1.5, 3, 2.5], function(num) { return Math.floor(num); });
   * // => [1, 2, 3]
   *
   * _.uniq([1, 2, 1.5, 3, 2.5], function(num) { return this.floor(num); }, Math);
   * // => [1, 2, 3]
   */
  function uniq(array, isSorted, callback, thisArg) {
    var result = [];
    if (!array) {
      return result;
    }
    var computed,
        index = -1,
        length = array.length,
        seen = [];

    // juggle arguments
    if (typeof isSorted == 'function') {
      thisArg = callback;
      callback = isSorted;
      isSorted = false;
    }
    if (!callback) {
      callback = identity;
    } else if (thisArg) {
      callback = iteratorBind(callback, thisArg);
    }
    while (++index < length) {
      computed = callback(array[index], index, array);
      if (isSorted
            ? !index || seen[seen.length - 1] !== computed
            : indexOf(seen, computed) < 0
          ) {
        seen.push(computed);
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Produces a new array with all occurrences of the passed values removed using
   * strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to filter.
   * @param {Mixed} [value1, value2, ...] Values to remove.
   * @returns {Array} Returns a new filtered array.
   * @example
   *
   * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
   * // => [2, 3, 4]
   */
  function without(array) {
    var result = [];
    if (!array) {
      return result;
    }
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (indexOf(arguments, array[index], 1) < 0) {
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Merges the elements of each array at their corresponding indexes. Useful for
   * separate data sources that are coordinated through matching array indexes.
   * For a matrix of nested arrays, `_.zip.apply(...)` can transpose the matrix
   * in a similar fashion.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of merged arrays.
   * @example
   *
   * _.zip(['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]);
   * // => [['moe', 30, true], ['larry', 40, false], ['curly', 50, false]]
   */
  function zip(array) {
    if (!array) {
      return [];
    }
    var index = -1,
        length = max(pluck(arguments, 'length')),
        result = Array(length);

    while (++index < length) {
      result[index] = pluck(arguments, index);
    }
    return result;
  }

  /**
   * Merges an array of `keys` and an array of `values` into a single object.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} keys The array of keys.
   * @param {Array} [values=[]] The array of values.
   * @returns {Object} Returns an object composed of the given keys and
   *  corresponding values.
   * @example
   *
   * _.zipObject(['moe', 'larry', 'curly'], [30, 40, 50]);
   * // => { 'moe': 30, 'larry': 40, 'curly': 50 }
   */
  function zipObject(keys, values) {
    if (!keys) {
      return {};
    }
    var index = -1,
        length = keys.length,
        result = {};

    values || (values = []);
    while (++index < length) {
      result[keys[index]] = values[index];
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a new function that is restricted to executing only after it is
   * called `n` times.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Number} n The number of times the function must be called before
   * it is executed.
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * var renderNotes = _.after(notes.length, render);
   * _.forEach(notes, function(note) {
   *   note.asyncSave({ 'success': renderNotes });
   * });
   * // `renderNotes` is run once, after all notes have saved
   */
  function after(n, func) {
    if (n < 1) {
      return func();
    }
    return function() {
      if (--n < 1) {
        return func.apply(this, arguments);
      }
    };
  }

  /**
   * Creates a new function that, when called, invokes `func` with the `this`
   * binding of `thisArg` and prepends any additional `bind` arguments to those
   * passed to the bound function. Lazy defined methods may be bound by passing
   * the object they are bound to as `func` and the method name as `thisArg`.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function|Object} func The function to bind or the object the method belongs to.
   * @param {Mixed} [thisArg] The `this` binding of `func` or the method name.
   * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
   * @returns {Function} Returns the new bound function.
   * @example
   *
   * // basic bind
   * var func = function(greeting) {
   *   return greeting + ' ' + this.name;
   * };
   *
   * func = _.bind(func, { 'name': 'moe' }, 'hi');
   * func();
   * // => 'hi moe'
   *
   * // lazy bind
   * var object = {
   *   'name': 'moe',
   *   'greet': function(greeting) {
   *     return greeting + ' ' + this.name;
   *   }
   * };
   *
   * var func = _.bind(object, 'greet', 'hi');
   * func();
   * // => 'hi moe'
   *
   * object.greet = function(greeting) {
   *   return greeting + ', ' + this.name + '!';
   * };
   *
   * func();
   * // => 'hi, moe!'
   */
  function bind(func, thisArg) {
    var methodName,
        isFunc = toString.call(func) == funcClass;

    // juggle arguments
    if (!isFunc) {
      methodName = thisArg;
      thisArg = func;
    }
    // use `Function#bind` if it exists and is fast
    // (in V8 `Function#bind` is slower except when partially applied)
    else if (isBindFast || (nativeBind && arguments.length > 2)) {
      return nativeBind.call.apply(nativeBind, arguments);
    }

    var partialArgs = slice.call(arguments, 2);

    function bound() {
      // `Function#bind` spec
      // http://es5.github.com/#x15.3.4.5
      var args = arguments,
          thisBinding = thisArg;

      if (!isFunc) {
        func = thisArg[methodName];
      }
      if (partialArgs.length) {
        args = args.length
          ? concat.apply(partialArgs, args)
          : partialArgs;
      }
      if (this instanceof bound) {
        // get `func` instance if `bound` is invoked in a `new` expression
        noop.prototype = func.prototype;
        thisBinding = new noop;

        // mimic the constructor's `return` behavior
        // http://es5.github.com/#x13.2.2
        var result = func.apply(thisBinding, args);
        return result && objectTypes[typeof result]
          ? result
          : thisBinding
      }
      return func.apply(thisBinding, args);
    }
    return bound;
  }

  /**
   * Binds methods on `object` to `object`, overwriting the existing method.
   * If no method names are provided, all the function properties of `object`
   * will be bound.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Object} object The object to bind and assign the bound methods to.
   * @param {String} [methodName1, methodName2, ...] Method names on the object to bind.
   * @returns {Object} Returns the `object`.
   * @example
   *
   * var buttonView = {
   *  'label': 'lodash',
   *  'onClick': function() { alert('clicked: ' + this.label); }
   * };
   *
   * _.bindAll(buttonView);
   * jQuery('#lodash_button').on('click', buttonView.onClick);
   * // => When the button is clicked, `this.label` will have the correct value
   */
  function bindAll(object) {
    var funcs = arguments,
        index = 1;

    if (funcs.length == 1) {
      index = 0;
      funcs = functions(object);
    }
    for (var length = funcs.length; index < length; index++) {
      object[funcs[index]] = bind(object[funcs[index]], object);
    }
    return object;
  }

  /**
   * Creates a new function that is the composition of the passed functions,
   * where each function consumes the return value of the function that follows.
   * In math terms, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} [func1, func2, ...] Functions to compose.
   * @returns {Function} Returns the new composed function.
   * @example
   *
   * var greet = function(name) { return 'hi: ' + name; };
   * var exclaim = function(statement) { return statement + '!'; };
   * var welcome = _.compose(exclaim, greet);
   * welcome('moe');
   * // => 'hi: moe!'
   */
  function compose() {
    var funcs = arguments;
    return function() {
      var args = arguments,
          length = funcs.length;

      while (length--) {
        args = [funcs[length].apply(this, args)];
      }
      return args[0];
    };
  }

  /**
   * Creates a new function that will delay the execution of `func` until after
   * `wait` milliseconds have elapsed since the last time it was invoked. Pass
   * `true` for `immediate` to cause debounce to invoke `func` on the leading,
   * instead of the trailing, edge of the `wait` timeout. Subsequent calls to
   * the debounced function will return the result of the last `func` call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to debounce.
   * @param {Number} wait The number of milliseconds to delay.
   * @param {Boolean} immediate A flag to indicate execution is on the leading
   *  edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * var lazyLayout = _.debounce(calculateLayout, 300);
   * jQuery(window).on('resize', lazyLayout);
   */
  function debounce(func, wait, immediate) {
    var args,
        result,
        thisArg,
        timeoutId;

    function delayed() {
      timeoutId = null;
      if (!immediate) {
        func.apply(thisArg, args);
      }
    }

    return function() {
      var isImmediate = immediate && !timeoutId;
      args = arguments;
      thisArg = this;

      clearTimeout(timeoutId);
      timeoutId = setTimeout(delayed, wait);

      if (isImmediate) {
        result = func.apply(thisArg, args);
      }
      return result;
    };
  }

  /**
   * Executes the `func` function after `wait` milliseconds. Additional arguments
   * are passed to `func` when it is invoked.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to delay.
   * @param {Number} wait The number of milliseconds to delay execution.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
   * @returns {Number} Returns the `setTimeout` timeout id.
   * @example
   *
   * var log = _.bind(console.log, console);
   * _.delay(log, 1000, 'logged later');
   * // => 'logged later' (Appears after one second.)
   */
  function delay(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function() { return func.apply(undefined, args); }, wait);
  }

  /**
   * Defers executing the `func` function until the current call stack has cleared.
   * Additional arguments are passed to `func` when it is invoked.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to defer.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
   * @returns {Number} Returns the `setTimeout` timeout id.
   * @example
   *
   * _.defer(function() { alert('deferred'); });
   * // returns from the function before `alert` is called
   */
  function defer(func) {
    var args = slice.call(arguments, 1);
    return setTimeout(function() { return func.apply(undefined, args); }, 1);
  }

  /**
   * Creates a new function that memoizes the result of `func`. If `resolver` is
   * passed, it will be used to determine the cache key for storing the result
   * based on the arguments passed to the memoized function. By default, the first
   * argument passed to the memoized function is used as the cache key.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to have its output memoized.
   * @param {Function} [resolver] A function used to resolve the cache key.
   * @returns {Function} Returns the new memoizing function.
   * @example
   *
   * var fibonacci = _.memoize(function(n) {
   *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
   * });
   */
  function memoize(func, resolver) {
    var cache = {};
    return function() {
      var prop = resolver ? resolver.apply(this, arguments) : arguments[0];
      return hasOwnProperty.call(cache, prop)
        ? cache[prop]
        : (cache[prop] = func.apply(this, arguments));
    };
  }

  /**
   * Creates a new function that is restricted to one execution. Repeat calls to
   * the function will return the value of the first call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * var initialize = _.once(createApplication);
   * initialize();
   * initialize();
   * // Application is only created once.
   */
  function once(func) {
    var result,
        ran = false;

    return function() {
      if (ran) {
        return result;
      }
      ran = true;
      result = func.apply(this, arguments);
      return result;
    };
  }

  /**
   * Creates a new function that, when called, invokes `func` with any additional
   * `partial` arguments prepended to those passed to the partially applied
   * function. This method is similar `bind`, except it does **not** alter the
   * `this` binding.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to partially apply arguments to.
   * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
   * @returns {Function} Returns the new partially applied function.
   * @example
   *
   * var greet = function(greeting, name) { return greeting + ': ' + name; };
   * var hi = _.partial(greet, 'hi');
   * hi('moe');
   * // => 'hi: moe'
   */
  function partial(func) {
    var args = slice.call(arguments, 1),
        argsLength = args.length;

    return function() {
      var result,
          others = arguments;

      if (others.length) {
        args.length = argsLength;
        push.apply(args, others);
      }
      result = args.length == 1 ? func.call(this, args[0]) : func.apply(this, args);
      args.length = argsLength;
      return result;
    };
  }

  /**
   * Creates a new function that, when executed, will only call the `func`
   * function at most once per every `wait` milliseconds. If the throttled
   * function is invoked more than once during the `wait` timeout, `func` will
   * also be called on the trailing edge of the timeout. Subsequent calls to the
   * throttled function will return the result of the last `func` call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to throttle.
   * @param {Number} wait The number of milliseconds to throttle executions to.
   * @returns {Function} Returns the new throttled function.
   * @example
   *
   * var throttled = _.throttle(updatePosition, 100);
   * jQuery(window).on('scroll', throttled);
   */
  function throttle(func, wait) {
    var args,
        result,
        thisArg,
        timeoutId,
        lastCalled = 0;

    function trailingCall() {
      lastCalled = new Date;
      timeoutId = null;
      func.apply(thisArg, args);
    }

    return function() {
      var now = new Date,
          remain = wait - (now - lastCalled);

      args = arguments;
      thisArg = this;

      if (remain <= 0) {
        lastCalled = now;
        result = func.apply(thisArg, args);
      }
      else if (!timeoutId) {
        timeoutId = setTimeout(trailingCall, remain);
      }
      return result;
    };
  }

  /**
   * Create a new function that passes the `func` function to the `wrapper`
   * function as its first argument. Additional arguments are appended to those
   * passed to the `wrapper` function.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to wrap.
   * @param {Function} wrapper The wrapper function.
   * @param {Mixed} [arg1, arg2, ...] Arguments to append to those passed to the wrapper.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var hello = function(name) { return 'hello: ' + name; };
   * hello = _.wrap(hello, function(func) {
   *   return 'before, ' + func('moe') + ', after';
   * });
   * hello();
   * // => 'before, hello: moe, after'
   */
  function wrap(func, wrapper) {
    return function() {
      var args = [func];
      if (arguments.length) {
        push.apply(args, arguments);
      }
      return wrapper.apply(this, args);
    };
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Create a shallow clone of the `value`. Any nested objects or arrays will be
   * assigned by reference and not cloned.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to clone.
   * @returns {Mixed} Returns the cloned `value`.
   * @example
   *
   * _.clone({ 'name': 'moe' });
   * // => { 'name': 'moe' };
   */
  function clone(value) {
    return value && objectTypes[typeof value]
      ? (isArray(value) ? value.slice() : extend({}, value))
      : value;
  }

  /**
   * Assigns missing properties on `object` with default values from the defaults
   * objects. Once a property is set, additional defaults of the same property
   * will be ignored.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to populate.
   * @param {Object} [defaults1, defaults2, ...] The defaults objects to apply to `object`.
   * @returns {Object} Returns `object`.
   * @example
   *
   * var iceCream = { 'flavor': 'chocolate' };
   * _.defaults(iceCream, { 'flavor': 'vanilla', 'sprinkles': 'rainbow' });
   * // => { 'flavor': 'chocolate', 'sprinkles': 'rainbow' }
   */
  var defaults = createIterator(extendIteratorOptions, {
    'inLoop': 'if (result[index] == null) ' + extendIteratorOptions.inLoop
  });

  /**
   * Copies enumerable properties from the source objects to the `destination` object.
   * Subsequent sources will overwrite propery assignments of previous sources.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The destination object.
   * @param {Object} [source1, source2, ...] The source objects.
   * @returns {Object} Returns the destination object.
   * @example
   *
   * _.extend({ 'name': 'moe' }, { 'age': 40 });
   * // => { 'name': 'moe', 'age': 40 }
   */
  var extend = createIterator(extendIteratorOptions);

  /**
   * Iterates over `object`'s own and inherited enumerable properties, executing
   * the `callback` for each property. The `callback` is bound to `thisArg` and
   * invoked with 3 arguments; (value, key, object).
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Object} Returns the `object`.
   * @example
   *
   * function Dog(name) {
   *   this.name = name;
   * }
   *
   * Dog.prototype.bark = function() {
   *   alert('Woof, woof!');
   * };
   *
   * _.forIn(new Dog('Dagny'), function(value, key) {
   *   alert(key);
   * });
   * // => alerts 'name' and 'bark' (order is not guaranteed)
   */
  var forIn = createIterator(baseIteratorOptions, forEachIteratorOptions, forOwnIteratorOptions, {
    'useHas': false
  });

  /**
   * Iterates over `object`'s own enumerable properties, executing the `callback`
   * for each property. The `callback` is bound to `thisArg` and invoked with 3
   * arguments; (value, key, object).
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Object} Returns the `object`.
   * @example
   *
   * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
   *   alert(key);
   * });
   * // => alerts '0', '1', and 'length' (order is not guaranteed)
   */
  var forOwn = createIterator(baseIteratorOptions, forEachIteratorOptions, forOwnIteratorOptions);

  /**
   * Produces a sorted array of the enumerable properties, own and inherited,
   * of `object` that have function values.
   *
   * @static
   * @memberOf _
   * @alias methods
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names that have function values.
   * @example
   *
   * _.functions(_);
   * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
   */
  var functions = createIterator({
    'args': 'object',
    'init': '[]',
    'useHas': false,
    'inLoop': 'if (toString.call(iteratee[index]) == funcClass) result.push(index)',
    'bottom': 'result.sort()'
  });

  /**
   * Checks if the specified object `property` exists and is a direct property,
   * instead of an inherited property.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to check.
   * @param {String} property The property to check for.
   * @returns {Boolean} Returns `true` if key is a direct property, else `false`.
   * @example
   *
   * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
   * // => true
   */
  function has(object, property) {
    return hasOwnProperty.call(object, property);
  }

  /**
   * Checks if `value` is an `arguments` object.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an `arguments` object, else `false`.
   * @example
   *
   * (function() { return _.isArguments(arguments); })(1, 2, 3);
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  var isArguments = function(value) {
    return toString.call(value) == '[object Arguments]';
  };
  // fallback for browser like IE < 9 which detect `arguments` as `[object Object]`
  if (!isArguments(arguments)) {
    isArguments = function(value) {
      return !!(value && hasOwnProperty.call(value, 'callee'));
    };
  }

  /**
   * Checks if `value` is an array.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an array, else `false`.
   * @example
   *
   * (function() { return _.isArray(arguments); })();
   * // => false
   *
   * _.isArray([1, 2, 3]);
   * // => true
   */
  var isArray = nativeIsArray || function(value) {
    return toString.call(value) == arrayClass;
  };

  /**
   * Checks if `value` is a boolean (`true` or `false`) value.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a boolean value, else `false`.
   * @example
   *
   * _.isBoolean(null);
   * // => false
   */
  function isBoolean(value) {
    return value === true || value === false || toString.call(value) == boolClass;
  }

  /**
   * Checks if `value` is a date.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a date, else `false`.
   * @example
   *
   * _.isDate(new Date);
   * // => true
   */
  function isDate(value) {
    return toString.call(value) == dateClass;
  }

  /**
   * Checks if `value` is a DOM element.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a DOM element, else `false`.
   * @example
   *
   * _.isElement(document.body);
   * // => true
   */
  function isElement(value) {
    return !!(value && value.nodeType == 1);
  }

  /**
   * Checks if `value` is empty. Arrays or strings with a length of `0` and
   * objects with no own enumerable properties are considered "empty".
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Array|Object|String} value The value to inspect.
   * @returns {Boolean} Returns `true` if the `value` is empty, else `false`.
   * @example
   *
   * _.isEmpty([1, 2, 3]);
   * // => false
   *
   * _.isEmpty({});
   * // => true
   *
   * _.isEmpty('');
   * // => true
   */
  var isEmpty = createIterator({
    'args': 'value',
    'init': 'true',
    'top':
      'var className = toString.call(value);\n' +
      'if (className == arrayClass || className == stringClass) return !value.length',
    'inLoop': {
      'object': 'return false'
    }
  });

  /**
   * Performs a deep comparison between two values to determine if they are
   * equivalent to each other.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} a The value to compare.
   * @param {Mixed} b The other value to compare.
   * @param {Array} [stack] Internally used to keep track of "seen" objects to
   *  avoid circular references.
   * @returns {Boolean} Returns `true` if the values are equvalent, else `false`.
   * @example
   *
   * var moe = { 'name': 'moe', 'luckyNumbers': [13, 27, 34] };
   * var clone = { 'name': 'moe', 'luckyNumbers': [13, 27, 34] };
   *
   * moe == clone;
   * // => false
   *
   * _.isEqual(moe, clone);
   * // => true
   */
  function isEqual(a, b, stack) {
    stack || (stack = []);

    // exit early for identical values
    if (a === b) {
      // treat `+0` vs. `-0` as not equal
      return a !== 0 || (1 / a == 1 / b);
    }
    // a strict comparison is necessary because `undefined == null`
    if (a == null || b == null) {
      return a === b;
    }
    // unwrap any wrapped objects
    if (a._chain) {
      a = a._wrapped;
    }
    if (b._chain) {
      b = b._wrapped;
    }
    // invoke a custom `isEqual` method if one is provided
    if (a.isEqual && toString.call(a.isEqual) == funcClass) {
      return a.isEqual(b);
    }
    if (b.isEqual && toString.call(b.isEqual) == funcClass) {
      return b.isEqual(a);
    }
    // compare [[Class]] names
    var className = toString.call(a);
    if (className != toString.call(b)) {
      return false;
    }
    switch (className) {
      // strings, numbers, dates, and booleans are compared by value
      case stringClass:
        // primitives and their corresponding object instances are equivalent;
        // thus, `'5'` is quivalent to `new String('5')`
        return a == String(b);

      case numberClass:
        // treat `NaN` vs. `NaN` as equal
        return a != +a
          ? b != +b
          // but treat `+0` vs. `-0` as not equal
          : (a == 0 ? (1 / a == 1 / b) : a == +b);

      case boolClass:
      case dateClass:
        // coerce dates and booleans to numeric values, dates to milliseconds and booleans to 1 or 0;
        // treat invalid dates coerced to `NaN` as not equal
        return +a == +b;

      // regexps are compared by their source and flags
      case regexpClass:
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') {
      return false;
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = stack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (stack[length] == a) {
        return true;
      }
    }

    var index = -1,
        result = true,
        size = 0;

    // add the first collection to the stack of traversed objects
    stack.push(a);

    // recursively compare objects and arrays
    if (className == arrayClass) {
      // compare array lengths to determine if a deep comparison is necessary
      size = a.length;
      result = size == b.length;

      if (result) {
        // deep compare the contents, ignoring non-numeric properties
        while (size--) {
          if (!(result = isEqual(a[size], b[size], stack))) {
            break;
          }
        }
      }
    } else {
      // objects with different constructors are not equivalent
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) {
        return false;
      }
      // deep compare objects.
      for (var prop in a) {
        if (hasOwnProperty.call(a, prop)) {
          // count the number of properties.
          size++;
          // deep compare each property value.
          if (!(result = hasOwnProperty.call(b, prop) && isEqual(a[prop], b[prop], stack))) {
            break;
          }
        }
      }
      // ensure both objects have the same number of properties
      if (result) {
        for (prop in b) {
          // Adobe's JS engine, embedded in applications like InDesign, has a
          // bug that causes `!size--` to throw an error so it must be wrapped
          // in parentheses.
          // https://github.com/documentcloud/underscore/issues/355
          if (hasOwnProperty.call(b, prop) && !(size--)) {
            break;
          }
        }
        result = !size;
      }
      // handle JScript [[DontEnum]] bug
      if (result && hasDontEnumBug) {
        while (++index < 7) {
          prop = shadowed[index];
          if (hasOwnProperty.call(a, prop)) {
            if (!(result = hasOwnProperty.call(b, prop) && isEqual(a[prop], b[prop], stack))) {
              break;
            }
          }
        }
      }
    }
    // remove the first collection from the stack of traversed objects
    stack.pop();
    return result;
  }

  /**
   * Checks if `value` is a finite number.
   * Note: This is not the same as native `isFinite`, which will return true for
   * booleans and other values. See http://es5.github.com/#x15.1.2.5.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a finite number, else `false`.
   * @example
   *
   * _.isFinite(-101);
   * // => true
   *
   * _.isFinite('10');
   * // => false
   *
   * _.isFinite(Infinity);
   * // => false
   */
  function isFinite(value) {
    return nativeIsFinite(value) && toString.call(value) == numberClass;
  }

  /**
   * Checks if `value` is a function.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(''.concat);
   * // => true
   */
  function isFunction(value) {
    return toString.call(value) == funcClass;
  }

  /**
   * Checks if `value` is the language type of Object.
   * (e.g. arrays, functions, objects, regexps, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // check if the value is the ECMAScript language type of Object
    // http://es5.github.com/#x8
    return value && objectTypes[typeof value];
  }

  /**
   * Checks if `value` is `NaN`.
   * Note: This is not the same as native `isNaN`, which will return true for
   * `undefined` and other values. See http://es5.github.com/#x15.1.2.4.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `NaN`, else `false`.
   * @example
   *
   * _.isNaN(NaN);
   * // => true
   *
   * _.isNaN(new Number(NaN));
   * // => true
   *
   * isNaN(undefined);
   * // => true
   *
   * _.isNaN(undefined);
   * // => false
   */
  function isNaN(value) {
    // `NaN` as a primitive is the only value that is not equal to itself
    // (perform the [[Class]] check first to avoid errors with some host objects in IE)
    return toString.call(value) == numberClass && value != +value
  }

  /**
   * Checks if `value` is `null`.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `null`, else `false`.
   * @example
   *
   * _.isNull(null);
   * // => true
   *
   * _.isNull(undefined);
   * // => false
   */
  function isNull(value) {
    return value === null;
  }

  /**
   * Checks if `value` is a number.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a number, else `false`.
   * @example
   *
   * _.isNumber(8.4 * 5;
   * // => true
   */
  function isNumber(value) {
    return toString.call(value) == numberClass;
  }

  /**
   * Checks if `value` is a regular expression.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a regular expression, else `false`.
   * @example
   *
   * _.isRegExp(/moe/);
   * // => true
   */
  function isRegExp(value) {
    return toString.call(value) == regexpClass;
  }

  /**
   * Checks if `value` is a string.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a string, else `false`.
   * @example
   *
   * _.isString('moe');
   * // => true
   */
  function isString(value) {
    return toString.call(value) == stringClass;
  }

  /**
   * Checks if `value` is `undefined`.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `undefined`, else `false`.
   * @example
   *
   * _.isUndefined(void 0);
   * // => true
   */
  function isUndefined(value) {
    return value === undefined;
  }

  /**
   * Produces an array of object`'s own enumerable property names.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names.
   * @example
   *
   * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
   * // => ['one', 'two', 'three'] (order is not guaranteed)
   */
  var keys = !nativeKeys ? shimKeys : function(object) {
    // avoid iterating over the `prototype` property
    return typeof object == 'function' && propertyIsEnumerable.call(object, 'prototype')
      ? shimKeys(object)
      : nativeKeys(object);
  };

  /**
   * Creates an object composed of the specified properties. Property names may
   * be specified as individual arguments or as arrays of property names.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to pluck.
   * @param {Object} [prop1, prop2, ...] The properties to pick.
   * @returns {Object} Returns an object composed of the picked properties.
   * @example
   *
   * _.pick({ 'name': 'moe', 'age': 40, 'userid': 'moe1' }, 'name', 'age');
   * // => { 'name': 'moe', 'age': 40 }
   */
  function pick(object) {
    var prop,
        index = 0,
        props = concat.apply(ArrayProto, arguments),
        length = props.length,
        result = {};

    // start `index` at `1` to skip `object`
    while (++index < length) {
      prop = props[index];
      if (prop in object) {
        result[prop] = object[prop];
      }
    }
    return result;
  }

  /**
   * Gets the size of `value` by returning `value.length` if `value` is a string
   * or array, or the number of own enumerable properties if `value` is an object.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Array|Object|String} value The value to inspect.
   * @returns {Number} Returns `value.length` if `value` is a string or array,
   *  or the number of own enumerable properties if `value` is an object.
   * @example
   *
   * _.size([1, 2]);
   * // => 2
   *
   * _.size({ 'one': 1, 'two': 2, 'three': 3 });
   * // => 3
   *
   * _.size('curly');
   * // => 5
   */
  function size(value) {
    if (!value) {
      return 0;
    }
    var length = value.length;
    return length === length >>> 0 ? value.length : keys(value).length;
  }

  /**
   * Produces an array of `object`'s own enumerable property values.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property values.
   * @example
   *
   * _.values({ 'one': 1, 'two': 2, 'three': 3 });
   * // => [1, 2, 3]
   */
  var values = createIterator({
    'args': 'object',
    'init': '[]',
    'inLoop': 'result.push(iteratee[index])'
  });

  /*--------------------------------------------------------------------------*/

  /**
   * Escapes a string for inclusion in HTML, replacing `&`, `<`, `"`, and `'`
   * characters.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} string The string to escape.
   * @returns {String} Returns the escaped string.
   * @example
   *
   * _.escape('Curly, Larry & Moe');
   * // => "Curly, Larry &amp; Moe"
   */
  function escape(string) {
    return string == null ? '' : (string + '').replace(reUnescapedHtml, escapeHtmlChar);
  }

  /**
   * This function returns the first argument passed to it.
   * Note: It is used throughout Lo-Dash as a default callback.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Mixed} value Any value.
   * @returns {Mixed} Returns `value`.
   * @example
   *
   * var moe = { 'name': 'moe' };
   * moe === _.identity(moe);
   * // => true
   */
  function identity(value) {
    return value;
  }

  /**
   * Adds functions properties of `object` to the `lodash` function and chainable
   * wrapper.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} object The object of function properties to add to `lodash`.
   * @example
   *
   * _.mixin({
   *   'capitalize': function(string) {
   *     return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
   *   }
   * });
   *
   * _.capitalize('curly');
   * // => 'Curly'
   *
   * _('larry').capitalize();
   * // => 'Larry'
   */
  function mixin(object) {
    forEach(functions(object), function(methodName) {
      var func = lodash[methodName] = object[methodName];

      LoDash.prototype[methodName] = function() {
        var args = [this._wrapped];
        if (arguments.length) {
          push.apply(args, arguments);
        }
        var result = func.apply(lodash, args);
        if (this._chain) {
          result = new LoDash(result);
          result._chain = true;
        }
        return result;
      };
    });
  }

  /**
   * Reverts the '_' variable to its previous value and returns a reference to
   * the `lodash` function.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @returns {Function} Returns the `lodash` function.
   * @example
   *
   * var lodash = _.noConflict();
   */
  function noConflict() {
    window._ = oldDash;
    return this;
  }

  /**
   * Resolves the value of `property` on `object`. If `property` is a function
   * it will be invoked and its result returned, else the property value is
   * returned. If `object` is falsey, then `null` is returned.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} object The object to inspect.
   * @param {String} property The property to get the result of.
   * @returns {Mixed} Returns the resolved value.
   * @example
   *
   * var object = {
   *   'cheese': 'crumpets',
   *   'stuff': function() {
   *     return 'nonsense';
   *   }
   * };
   *
   * _.result(object, 'cheese');
   * // => 'crumpets'
   *
   * _.result(object, 'stuff');
   * // => 'nonsense'
   */
  function result(object, property) {
    // based on Backbone's private `getValue` function
    // https://github.com/documentcloud/backbone/blob/0.9.2/backbone.js#L1419-1424
    if (!object) {
      return null;
    }
    var value = object[property];
    return toString.call(value) == funcClass ? object[property]() : value;
  }

  /**
   * A micro-templating method that handles arbitrary delimiters, preserves
   * whitespace, and correctly escapes quotes within interpolated code.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} text The template text.
   * @param {Obect} data The data object used to populate the text.
   * @param {Object} options The options object.
   * @returns {Function|String} Returns a compiled function when no `data` object
   *  is given, else it returns the interpolated text.
   * @example
   *
   * // using compiled template
   * var compiled = _.template('hello: <%= name %>');
   * compiled({ 'name': 'moe' });
   * // => 'hello: moe'
   *
   * var list = '<% _.forEach(people, function(name) { %> <li><%= name %></li> <% }); %>';
   * _.template(list, { 'people': ['moe', 'curly', 'larry'] });
   * // => '<li>moe</li><li>curly</li><li>larry</li>'
   *
   * var template = _.template('<b><%- value %></b>');
   * template({ 'value': '<script>' });
   * // => '<b>&lt;script></b>'
   *
   * // using `print`
   * var compiled = _.template('<% print("Hello " + epithet); %>');
   * compiled({ 'epithet': 'stooge' });
   * // => 'Hello stooge.'
   *
   * // using custom template settings
   * _.templateSettings = {
   *   'interpolate': /\{\{(.+?)\}\}/g
   * };
   *
   * var template = _.template('Hello {{ name }}!');
   * template({ 'name': 'Mustache' });
   * // => 'Hello Mustache!'
   *
   * // using the `variable` option
   * _.template('<%= data.hasWith %>', { 'hasWith': 'no' }, { 'variable': 'data' });
   * // => 'no'
   *
   * // using the `source` property
   * <script>
   *   JST.project = <%= _.template(jstText).source %>;
   * </script>
   */
  function template(text, data, options) {
    // based on John Resig's `tmpl` implementation
    // http://ejohn.org/blog/javascript-micro-templating/
    // and Laura Doktorova's doT.js
    // https://github.com/olado/doT
    options || (options = {});

    var isEvaluating,
        result,
        escapeDelimiter = options.escape,
        evaluateDelimiter = options.evaluate,
        interpolateDelimiter = options.interpolate,
        settings = lodash.templateSettings,
        variable = options.variable;

    // use default settings if no options object is provided
    if (escapeDelimiter == null) {
      escapeDelimiter = settings.escape;
    }
    if (evaluateDelimiter == null) {
      evaluateDelimiter = settings.evaluate;
    }
    if (interpolateDelimiter == null) {
      interpolateDelimiter = settings.interpolate;
    }

    // tokenize delimiters to avoid escaping them
    if (escapeDelimiter) {
      text = text.replace(escapeDelimiter, tokenizeEscape);
    }
    if (interpolateDelimiter) {
      text = text.replace(interpolateDelimiter, tokenizeInterpolate);
    }
    if (evaluateDelimiter != lastEvaluateDelimiter) {
      // generate `reEvaluateDelimiter` to match `_.templateSettings.evaluate`
      // and internal `<e%- %>`, `<e%= %>` delimiters
      lastEvaluateDelimiter = evaluateDelimiter;
      reEvaluateDelimiter = RegExp(
        (evaluateDelimiter ? evaluateDelimiter.source : '($^)') +
        '|<e%-([\\s\\S]+?)%>|<e%=([\\s\\S]+?)%>'
      , 'g');
    }
    isEvaluating = tokenized.length;
    text = text.replace(reEvaluateDelimiter, tokenizeEvaluate);
    isEvaluating = isEvaluating != tokenized.length;

    // escape characters that cannot be included in string literals and
    // detokenize delimiter code snippets
    text = "__p += '" + text
      .replace(reUnescapedString, escapeStringChar)
      .replace(reToken, detokenize) + "';\n";

    // clear stored code snippets
    tokenized.length = 0;

    // if `options.variable` is not specified and the template contains "evaluate"
    // delimiters, wrap a with-statement around the generated code to add the
    // data object to the top of the scope chain
    if (!variable) {
      variable = settings.variable || lastVariable || 'obj';

      if (isEvaluating) {
        text = 'with (' + variable + ') {\n' + text + '\n}\n';
      }
      else {
        if (variable != lastVariable) {
          // generate `reDoubleVariable` to match references like `obj.obj` inside
          // transformed "escape" and "interpolate" delimiters
          lastVariable = variable;
          reDoubleVariable = RegExp('(\\(\\s*)' + variable + '\\.' + variable + '\\b', 'g');
        }
        // avoid a with-statement by prepending data object references to property names
        text = text
          .replace(reInsertVariable, '$&' + variable + '.')
          .replace(reDoubleVariable, '$1__d');
      }
    }

    // cleanup code by stripping empty strings
    text = ( isEvaluating ? text.replace(reEmptyStringLeading, '') : text)
      .replace(reEmptyStringMiddle, '$1')
      .replace(reEmptyStringTrailing, '$1;');

    // frame code as the function body
    text = 'function(' + variable + ') {\n' +
      variable + ' || (' + variable + ' = {});\n' +
      'var __t, __p = \'\', __e = _.escape' +
      (isEvaluating
        ? ', __j = Array.prototype.join;\n' +
          'function print() { __p += __j.call(arguments, \'\') }\n'
        : ', __d = ' + variable + '.' + variable + ' || ' + variable + ';\n'
      ) +
      text +
      'return __p\n}';

    // add a sourceURL for easier debugging
    // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
    if (useSourceURL) {
      text += '\n//@ sourceURL=/lodash/template/source[' + (templateCounter++) + ']';
    }

    try {
      result = Function('_', 'return ' + text)(lodash);
    } catch(e) {
      result = function() { throw e; };
    }

    if (data) {
      return result(data);
    }
    // provide the compiled function's source via its `toString` method, in
    // supported environments, or the `source` property as a convenience for
    // build time precompilation
    result.source = text;
    return result;
  }

  /**
   * Executes the `callback` function `n` times. The `callback` is bound to
   * `thisArg` and invoked with 1 argument; (index).
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Number} n The number of times to execute the callback.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @example
   *
   * _.times(3, function() { genie.grantWish(); });
   * // => calls `genie.grantWish()` 3 times
   *
   * _.times(3, function() { this.grantWish(); }, genie);
   * // => also calls `genie.grantWish()` 3 times
   */
  function times(n, callback, thisArg) {
    var index = -1;
    if (thisArg) {
      while (++index < n) {
        callback.call(thisArg, index);
      }
    } else {
      while (++index < n) {
        callback(index);
      }
    }
  }

  /**
   * Generates a unique id. If `prefix` is passed, the id will be appended to it.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} [prefix] The value to prefix the id with.
   * @returns {Number|String} Returns a numeric id if no prefix is passed, else
   *  a string id may be returned.
   * @example
   *
   * _.uniqueId('contact_');
   * // => 'contact_104'
   */
  function uniqueId(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Wraps the value in a `lodash` wrapper object.
   *
   * @static
   * @memberOf _
   * @category Chaining
   * @param {Mixed} value The value to wrap.
   * @returns {Object} Returns the wrapper object.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * var youngest = _.chain(stooges)
   *     .sortBy(function(stooge) { return stooge.age; })
   *     .map(function(stooge) { return stooge.name + ' is ' + stooge.age; })
   *     .first()
   *     .value();
   * // => 'moe is 40'
   */
  function chain(value) {
    value = new LoDash(value);
    value._chain = true;
    return value;
  }

  /**
   * Invokes `interceptor` with the `value` as the first argument, and then
   * returns `value`. The purpose of this method is to "tap into" a method chain,
   * in order to perform operations on intermediate results within the chain.
   *
   * @static
   * @memberOf _
   * @category Chaining
   * @param {Mixed} value The value to pass to `callback`.
   * @param {Function} interceptor The function to invoke.
   * @returns {Mixed} Returns `value`.
   * @example
   *
   * _.chain([1,2,3,200])
   *  .filter(function(num) { return num % 2 == 0; })
   *  .tap(alert)
   *  .map(function(num) { return num * num })
   *  .value();
   * // => // [2, 200] (alerted)
   * // => [4, 40000]
   */
  function tap(value, interceptor) {
    interceptor(value);
    return value;
  }

  /**
   * Enables method chaining on the wrapper object.
   *
   * @name chain
   * @deprecated
   * @memberOf _
   * @category Chaining
   * @returns {Mixed} Returns the wrapper object.
   * @example
   *
   * _([1, 2, 3]).value();
   * // => [1, 2, 3]
   */
  function wrapperChain() {
    this._chain = true;
    return this;
  }

  /**
   * Extracts the wrapped value.
   *
   * @name value
   * @memberOf _
   * @category Chaining
   * @returns {Mixed} Returns the wrapped value.
   * @example
   *
   * _([1, 2, 3]).value();
   * // => [1, 2, 3]
   */
  function wrapperValue() {
    return this._wrapped;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The semantic version number.
   *
   * @static
   * @memberOf _
   * @type String
   */
  lodash.VERSION = '0.4.1';

  // assign static methods
  lodash.after = after;
  lodash.bind = bind;
  lodash.bindAll = bindAll;
  lodash.chain = chain;
  lodash.clone = clone;
  lodash.compact = compact;
  lodash.compose = compose;
  lodash.contains = contains;
  lodash.debounce = debounce;
  lodash.defaults = defaults;
  lodash.defer = defer;
  lodash.delay = delay;
  lodash.difference = difference;
  lodash.escape = escape;
  lodash.every = every;
  lodash.extend = extend;
  lodash.filter = filter;
  lodash.find = find;
  lodash.first = first;
  lodash.flatten = flatten;
  lodash.forEach = forEach;
  lodash.forIn = forIn;
  lodash.forOwn = forOwn;
  lodash.functions = functions;
  lodash.groupBy = groupBy;
  lodash.has = has;
  lodash.identity = identity;
  lodash.indexOf = indexOf;
  lodash.initial = initial;
  lodash.intersection = intersection;
  lodash.invoke = invoke;
  lodash.isArguments = isArguments;
  lodash.isArray = isArray;
  lodash.isBoolean = isBoolean;
  lodash.isDate = isDate;
  lodash.isElement = isElement;
  lodash.isEmpty = isEmpty;
  lodash.isEqual = isEqual;
  lodash.isFinite = isFinite;
  lodash.isFunction = isFunction;
  lodash.isNaN = isNaN;
  lodash.isNull = isNull;
  lodash.isNumber = isNumber;
  lodash.isObject = isObject;
  lodash.isRegExp = isRegExp;
  lodash.isString = isString;
  lodash.isUndefined = isUndefined;
  lodash.keys = keys;
  lodash.last = last;
  lodash.lastIndexOf = lastIndexOf;
  lodash.map = map;
  lodash.max = max;
  lodash.memoize = memoize;
  lodash.min = min;
  lodash.mixin = mixin;
  lodash.noConflict = noConflict;
  lodash.once = once;
  lodash.partial = partial;
  lodash.pick = pick;
  lodash.pluck = pluck;
  lodash.range = range;
  lodash.reduce = reduce;
  lodash.reduceRight = reduceRight;
  lodash.reject = reject;
  lodash.rest = rest;
  lodash.result = result;
  lodash.shuffle = shuffle;
  lodash.size = size;
  lodash.some = some;
  lodash.sortBy = sortBy;
  lodash.sortedIndex = sortedIndex;
  lodash.tap = tap;
  lodash.template = template;
  lodash.throttle = throttle;
  lodash.times = times;
  lodash.toArray = toArray;
  lodash.union = union;
  lodash.uniq = uniq;
  lodash.uniqueId = uniqueId;
  lodash.values = values;
  lodash.without = without;
  lodash.wrap = wrap;
  lodash.zip = zip;
  lodash.zipObject = zipObject;

  // assign aliases
  lodash.all = every;
  lodash.any = some;
  lodash.collect = map;
  lodash.detect = find;
  lodash.each = forEach;
  lodash.foldl = reduce;
  lodash.foldr = reduceRight;
  lodash.head = first;
  lodash.include = contains;
  lodash.inject = reduce;
  lodash.methods = functions;
  lodash.select = filter;
  lodash.tail = rest;
  lodash.take = first;
  lodash.unique = uniq;

  // add pseudo private properties used and removed during the build process
  lodash._iteratorTemplate = iteratorTemplate;
  lodash._shimKeys = shimKeys;

  /*--------------------------------------------------------------------------*/

  // assign private `LoDash` constructor's prototype
  LoDash.prototype = lodash.prototype;

  // add all static functions to `LoDash.prototype`
  mixin(lodash);

  // add `LoDash.prototype.chain` after calling `mixin()` to avoid overwriting
  // it with the wrapped `lodash.chain`
  LoDash.prototype.chain = wrapperChain;
  LoDash.prototype.value = wrapperValue;

  // add all mutator Array functions to the wrapper.
  forEach(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(methodName) {
    var func = ArrayProto[methodName];

    LoDash.prototype[methodName] = function() {
      var value = this._wrapped;
      func.apply(value, arguments);

      // IE compatibility mode and IE < 9 have buggy Array `shift()` and `splice()`
      // functions that fail to remove the last element, `value[0]`, of
      // array-like objects even though the `length` property is set to `0`.
      // The `shift()` method is buggy in IE 8 compatibility mode, while `splice()`
      // is buggy regardless of mode in IE < 9 and buggy in compatibility mode in IE 9.
      if (value.length === 0) {
        delete value[0];
      }
      if (this._chain) {
        value = new LoDash(value);
        value._chain = true;
      }
      return value;
    };
  });

  // add all accessor Array functions to the wrapper.
  forEach(['concat', 'join', 'slice'], function(methodName) {
    var func = ArrayProto[methodName];

    LoDash.prototype[methodName] = function() {
      var value = this._wrapped,
          result = func.apply(value, arguments);

      if (this._chain) {
        result = new LoDash(result);
        result._chain = true;
      }
      return result;
    };
  });

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash was injected by a third-party script and not intended to be
    // loaded as a module. The global assignment can be reverted in the Lo-Dash
    // module via its `noConflict()` method.
    window._ = lodash;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define('vector/../../lib/lodash',[],function() {
      return lodash;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports) {
    // in Node.js or RingoJS v0.8.0+
    if (typeof module == 'object' && module && module.exports == freeExports) {
      (module.exports = lodash)._ = lodash;
    }
    // in Narwhal or RingoJS v0.7.0-
    else {
      freeExports._ = lodash;
    }
  }
  else {
    // in a browser or Rhino
    window._ = lodash;
  }
}(this));

define('common/not-implemented',['require'],function ( require ) {

  return function notImplemented() {
    throw new Error( "not implemented" );
  };

});
define('vector/vector',['require'],function ( require ) {

  var Vector = function() {
  };

  return Vector;

});
define('vector/vector2-api',['require','common/not-implemented','vector/v2'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {

    var notImplemented = require( "common/not-implemented" );
    var V2 = require( "vector/v2" )( FLOAT_ARRAY_TYPE );

    function add( v1, v2, result ) {
      result = result || new V2();
      
      result[0] = v1[0] + v2[0];
      result[1] = v1[1] + v2[1];
      
      return result;
    }
      
    function angle( v1, v2 ) {
      var normalizedV1 = new V2();
      var normalizedV2 = new V2();

      normalize(v1, normalizedV1);
      normalize(v2, normalizedV2);

      return Math.acos( dot( normalizedV1, normalizedV2 ) );
    }
      
    function clear( v ) {
      v[0] = 0;
      v[1] = 0;
      
      return v;
    }

    function distance( v1, v2 ) {
      return Math.sqrt((v1[0] - v2[0]) * (v1[0] - v2[0]) +
        (v1[1] - v2[1]) * (v1[1] - v2[1]));
    }
      
    function dot( v1, v2 ) {
      var r = 0;
      
      r += v1[0] * v2[0];
      r += v1[1] * v2[1];
      
      return r;
    }
      
    function equal( v1, v2, e ) {
      e = e || 0.000001;

      if( v1.length !== v2.length ) {
        return false;
      }

      var d0 = Math.abs( v1[0] - v2[0] );
      var d1 = Math.abs( v1[1] - v2[1] );

      if( isNaN( d0 ) || d0 > e ||
          isNaN( d1 ) || d1 > e ) {
        return false;
      }

      return true;
    }
    
    function length( v ) {
      var r = 0;
      
      r += v[0] * v[0];
      r += v[1] * v[1];
      
      return Math.sqrt( r );
    }

    function limit(v, max, result){
      result = result || new V2();
      var length;
      length = Math.sqrt( v[0] * v[0] +
        v[1] * v[1]);

      if (length > max){
        var ratio = max/length;
        result[0] = v[0] * ratio;
        result[1] = v[1] * ratio;
      }else{
        result[0] = v[0];
        result[1] = v[1];
      }
      return result;
    }

    function multiply( v, s, result ) {
      result = result || new V2();
      
      result[0] = s * v[0];
      result[1] = s * v[1];
      
      return result;
    }
    
    function negate( v, result ) {
      result = result || new V2();
      
      result[0] = -1 * v[0];
      result[1] = -1 * v[1];
      
      return result;
    }
    
    function normalize( v, result ) {
      result = result || new V2();
      var l = length( v );
      
      result[0] = v[0]/l;
      result[1] = v[1]/l;
      
      return result;
    }
    
    function project( v1, v2, result ) {
      result = result || new V2();
      
      var dp = v1[0]*v2[0] + v1[1]*v2[1];
      var dp_over_v2_squared_length = dp / (v2[0]*v2[0] + v2[1]*v2[1]);

      result[0] = dp_over_v2_squared_length * v2[0];
      result[1] = dp_over_v2_squared_length * v2[1];
      
      return result;
    }
    
    function set( v ) {
      if( 2 === arguments.length ) {
        v[0] = arguments[1][0];
        v[1] = arguments[1][1];
      } else {
        v[0] = arguments[1];
        v[1] = arguments[2];
      }
     
      return v;
    }
    
    function subtract( v1, v2, result ) {
      result = result || new V2();
      
      result[0] = v1[0] - v2[0];
      result[1] = v1[1] - v2[1];
      
      return result;
    }

    var vector2 = {  
      add: add,
      angle: angle,
      clear: clear,
      distance: distance,
      dot: dot,
      equal: equal,
      length: length,
      limit: limit,
      multiply: multiply,              
      negate: negate,
      normalize: normalize,
      project: project,
      set: set,
      subtract: subtract,
      
      x: new V2( 1, 0 ),
      u: new V2( 1, 0 ),
      y: new V2( 0, 1 ),
      v: new V2( 0, 1 ),
      zero: new V2( 0, 0 ),
      one: new V2( 1, 1 )
    };
    
    return vector2;

  };

});
define('vector/vector2',['require','../../lib/lodash','common/not-implemented','vector/v2','vector/vector2-api','vector/vector'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {
    
    var _ = require( "../../lib/lodash" );
    var notImplemented = require( "common/not-implemented" );
    var V2 = require( "vector/v2" )( FLOAT_ARRAY_TYPE );
    var vector2 = require( "vector/vector2-api" )( FLOAT_ARRAY_TYPE );
    var Vector = require( "vector/vector" );

    function getValue( index ) {
      return this.buffer[index];
    }

    function setValue( index, value ) {
      this.buffer[index] = value;
      this.modified = true;
    }

    var Vector2 = function( arg1, arg2 ) {
      var argc = arguments.length;

      this.buffer = new V2(
        (arg1 instanceof Vector) ? arg1.buffer : arg1,
        (arg2 instanceof Vector) ? arg2.buffer : arg2
      );

      Object.defineProperties( this, {
        x: {
          get: getValue.bind( this, 0 ),
          set: setValue.bind( this, 0 )
        },
        y: {
          get: getValue.bind( this, 1 ),
          set: setValue.bind( this, 1 )
        }
      });

      this.modified = true;
      this.size = 2;
    };
    Vector2.prototype = new Vector();
    Vector2.prototype.constructor = Vector2;

    function add( arg, result ) {
      var other;
      if( arg instanceof Vector2 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      vector2.add( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function angle( arg ) {
      var other;
      if( arg instanceof Vector2 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return vector2.angle( this.buffer, other );
    }

    function clear() {
      vector2.clear( this.buffer );
      this.modified = true;

      return this;
    }

    function clone() {
      return new Vector2( this );
    }

    function distance(arg) {
      var other;
      if( arg instanceof Vector2 ) {
        other = arg.buffer;
      } else {
        other = arg;
      }
      return vector2.distance(this.buffer, other);
    }

    function dot( arg ) {
      var other;
      if( arg instanceof Vector2 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return vector2.dot( this.buffer, other );
    }

    function equal( arg ) {
      var other;
      if( arg instanceof Vector2 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return vector2.equal( this.buffer, other );
    }

    function length() {
      return vector2.length( this.buffer );
    }

    function limit(max, result) {
      result = result || this;
      var other;
      if( result instanceof Vector2 ) {
        other = result.buffer;
        result.modified = true;
      } else {
        other = result;
      }
      vector2.limit(this.buffer, max, other);
      return result;
    }

    function multiply( arg, result ) {
      result = result || this;
      vector2.multiply( this.buffer, arg, result.buffer );
      result.modified = true;

      return this;
    }

    function negate( result ) {
      result = result || this;
      vector2.negate( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }

    function normalize( result ) {
      result = result || this;
      vector2.normalize( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }

    function project( arg, result ) {
      var other;
      if( arg instanceof Vector2 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      vector2.project( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function set( arg1, arg2 ) {
      var argc = arguments.length;
      var buffer = this.buffer;
      if( 1 === argc ) {
        if( arg1 instanceof Vector2 ) {
          var other = arg1.buffer;
          buffer[0] = other[0];
          buffer[1] = other[1];
          this.modified = true;
        } else {
          buffer[0] = arg1[0];
          buffer[1] = arg1[1];
          this.modified = true;
        }
      } else if( 2 === argc ) {
        buffer[0] = arg1;
        buffer[1] = arg2;
        this.modified = true;
      }      

      return this;
    }

    function subtract( arg, result ) {
      var other;
      if( arg instanceof Vector2 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      vector2.subtract( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }    
    
    _.extend( Vector2.prototype, {
      add: add,
      angle: angle,
      clear: clear,
      clone: clone,
      distance: distance,
      dot: dot,
      equal: equal,
      length: length,
      limit: limit,
      multiply: multiply,
      negate: negate,
      normalize: normalize,
      project: project,
      set: set,
      subtract: subtract
    });

    return Vector2;

  };

});
define('vector/v3',['require','vector/v'],function ( require ) {

  var V = require( "vector/v" );

  return function( FLOAT_ARRAY_TYPE ) {

    var V3 = function() {
      var argc = arguments.length;
      var i, j, vi = 0;

      var vector = new FLOAT_ARRAY_TYPE( 3 );

      for( i = 0; i < argc && vi < 3; ++ i ) {
        var arg = arguments[i];
        if( arg === undefined ) {
          break;
        } else if( arg instanceof Array ||
            arg instanceof FLOAT_ARRAY_TYPE ) {
          for( j = 0; j < arg.length && vi < 3; ++ j ) {
            vector[vi ++] = arg[j];
          }
        } else {
          vector[vi ++] = arg;
        }
      }
      // Fill in missing elements with zero
      for( ; vi < 3; ++ vi ) {
        vector[vi] = 0;
      }

      return vector;
    };
    V3.prototype = new V();
    V3.prototype.constructor = V3;

    return V3;

  };

});
define('matrix/matrix',['require'],function ( require ) {

  var Matrix = function() {
  };

  return Matrix;

});
define('vector/vector3-api',['require','common/not-implemented','vector/v3'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {

    var notImplemented = require( "common/not-implemented" );
    var V3 = require( "vector/v3" )( FLOAT_ARRAY_TYPE );

    function add( v1, v2, result ) {
      if( result === v1 ) {
        v1[0] += v2[0];
        v1[1] += v2[1];
        v1[2] += v2[2];
        return;
      }

      if( undefined === result ) {
        result = new V3( v1[0] + v2[0], 
          v1[1] + v2[1], v1[2] + v2[2] );
        return result;
      } else {
        result[0] = v1[0] + v2[0];
        result[1] = v1[1] + v2[1];
        result[2] = v1[2] + v2[2];
        return;
      }
    }

    function angle( v1, v2 ) {
      return Math.acos(
        (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) /
        (Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]) *
          Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2]) ) );
    }

    function clear( v ) {
      v[0] = 0;
      v[1] = 0;
      v[2] = 0;

      return v;
    }

    function cross( v1, v2, result ) {
      result = result || new V3();

      var v1_0 = v1[0],
        v1_1 = v1[1],
        v1_2 = v1[2];
      var v2_0 = v2[0],
        v2_1 = v2[1],
        v2_2 = v2[2];

      result[0] = (v1_1 * v2_2) - (v2_1 * v1_2);
      result[1] = (v1_2 * v2_0) - (v2_2 * v1_0);
      result[2] = (v1_0 * v2_1) - (v2_0 * v1_1);

      return result;
    }

    function distance( v1, v2 ) {
      return Math.sqrt((v1[0] - v2[0]) * (v1[0] - v2[0]) +
        (v1[1] - v2[1]) * (v1[1] - v2[1]) +
        (v1[2] - v2[2]) * (v1[2] - v2[2]));
    }

    function dot( v1, v2 ) {
      return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    }

    function equal( v1, v2, e ) {
      e = e || 0.000001;

      if( v1.length !== v2.length ) {
        return false;
      }

      var d0 = Math.abs( v1[0] - v2[0] );
      var d1 = Math.abs( v1[1] - v2[1] );
      var d2 = Math.abs( v1[2] - v2[2] );

      if( isNaN( d0 ) || d0 > e ||
          isNaN( d1 ) || d1 > e ||
          isNaN( d2 ) || d2 > e ) {
        return false;
      }

      return true;
    }

    function length( v ) {
      var r = 0;
      
      r += v[0] * v[0];
      r += v[1] * v[1];
      r += v[2] * v[2];
      
      return Math.sqrt( r );      
    }

    function limit(v, max, result){
      result = result || new V3();
      var length;
      length = Math.sqrt( v[0] * v[0] +
                          v[1] * v[1] +
                          v[2] * v[2]);

      if (length > max){
        var ratio = max/length;
        result[0] = v[0] * ratio;
        result[1] = v[1] * ratio;
        result[2] = v[2] * ratio;
      }else{
        result[0] = v[0];
        result[1] = v[1];
        result[2] = v[2];
      }
      return result;
    }

    function multiply( v, s, result ) {
      result = result || new V3();
      
      result[0] = s * v[0];
      result[1] = s * v[1];
      result[2] = s * v[2];
      
      return result;      
    }

    function negate( v, result ) {
      result = result || new V3();
      
      result[0] = -1 * v[0];
      result[1] = -1 * v[1];
      result[2] = -1 * v[2];
      
      return result;      
    }

    function normalize( v, result ) {
      result = result || new V3();
      var l = length( v );
      
      result[0] = v[0]/l;
      result[1] = v[1]/l;
      result[2] = v[2]/l;
      
      return result;      
    }

    function set( v ) {
      if( 2 === arguments.length ) {
        v[0] = arguments[1][0];
        v[1] = arguments[1][1];
        v[2] = arguments[1][2];
      } else {          
        v[0] = arguments[1];
        v[1] = arguments[2];
        v[2] = arguments[3];
      }
     
      return v;      
    }

    function subtract( v1, v2, result ) {
      result = result || new V3();
      
      result[0] = v1[0] - v2[0];
      result[1] = v1[1] - v2[1];
      result[2] = v1[2] - v2[2];
      
      return result;
    }

    //This does a matrix3 by vector3 transform, which is a matrix multiplication
    //The matrix3 is on the left side of the multiplication and is multiplied by
    // the vector in column form
    function transform( v, m, result ) {
      result = result || new V3();

      var x = v[0], y = v[1], z = v[2];

      result[0] = m[0] * x + m[1] * y + m[2] * z;
      result[1] = m[3] * x + m[4] * y + m[5] * z;
      result[2] = m[6] * x + m[7] * y + m[8] * z;

      return result;
    }

    var vector3 = {
      add: add,
      angle: angle,
      clear: clear,
      cross: cross,
      distance: distance,
      dot: dot,
      equal: equal,
      length: length,
      limit: limit,
      multiply: multiply,
      negate: negate,
      normalize: normalize,
      set: set,
      subtract: subtract,
      transform: transform,

      x: new V3( 1, 0, 0 ),
      y: new V3( 0, 1, 0 ),
      z: new V3( 0, 0, 1 ),
      zero: new V3( 0, 0, 0 ),
      one: new V3( 1, 1, 1 )
    };
    
    return vector3;

  };

});
define('vector/vector3',['require','../../lib/lodash','common/not-implemented','vector/v3','vector/vector3-api','matrix/matrix','vector/vector'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {
    
    var _ = require( "../../lib/lodash" );
    var notImplemented = require( "common/not-implemented" );
    var V3 = require( "vector/v3" )( FLOAT_ARRAY_TYPE );
    var vector3 = require( "vector/vector3-api" )( FLOAT_ARRAY_TYPE );
    var Matrix = require( "matrix/matrix" );
    var Vector = require( "vector/vector" );

    function getValue( index ) {
      return this.buffer[index];
    }

    function setValue( index, value ) {
      this.buffer[index] = value;
      this.modified = true;
    }

    var Vector3 = function( arg1, arg2, arg3 ) {
      var argc = arguments.length;

      this.buffer = new V3(
        (arg1 instanceof Vector) ? arg1.buffer : arg1,
        (arg2 instanceof Vector) ? arg2.buffer : arg2,
        (arg3 instanceof Vector) ? arg3.buffer : arg3
      );

      Object.defineProperties( this, {
        x: {
          get: getValue.bind( this, 0 ),
          set: setValue.bind( this, 0 )
        },
        y: {
          get: getValue.bind( this, 1 ),
          set: setValue.bind( this, 1 )
        },
        z: {
          get: getValue.bind( this, 2 ),
          set: setValue.bind( this, 2 )
        }
      });

      this.modified = true;
      this.size = 3;
    };
    Vector3.prototype = new Vector();
    Vector3.prototype.constructor = Vector3;

    function add( arg, result ) {
      var other;
      if( arg instanceof Vector3 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      vector3.add( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function angle( arg ) {
      var other;
      if( arg instanceof Vector3 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return vector3.angle( this.buffer, other );      
    }

    function clear() {
      vector3.clear( this.buffer );
      this.modified = true;

      return this;
    }

    function clone() {
      return new Vector3( this );
    }

    function cross( arg, result ) {
      var other;
      if( arg instanceof Vector3 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      vector3.cross( this.buffer, other, result.buffer );    
      result.modified = true; 

      return this;
    }

    function distance(arg) {
      var other;
      if( arg instanceof Vector3 ) {
        other = arg.buffer;
      } else {
        other = arg;
      }
      return vector3.distance(this.buffer, other);
    }

    function dot( arg ) {
      var other;
      if( arg instanceof Vector3 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return vector3.dot( this.buffer, other );
    }

    function equal( arg ) {
      var other;
      if( arg instanceof Vector3 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return vector3.equal( this.buffer, other );
    }

    function length() {
      return vector3.length( this.buffer );
    }

    function limit(max, result) {
      result = result || this;
      var other;
      if( result instanceof Vector3 ) {
        other = result.buffer;
        result.modified = true;
      } else {
        other = result;
      }
      vector3.limit(this.buffer, max, other);
      return result;
    }

    function multiply( arg, result ) {
      result = result || this;
      vector3.multiply( this.buffer, arg, result.buffer );
      result.modified = true;

      return this;
    }

    function negate( result ) {
      result = result || this;
      vector3.negate( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }

    function normalize( result ) {
      result = result || this;
      vector3.normalize( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }

    function set( arg1, arg2, arg3 ) {
      var argc = arguments.length;
      var buffer = this.buffer;
      if( 1 === argc ) {
        if( arg1 instanceof Vector3 ) {
          var other = arg1.buffer;
          buffer[0] = other[0];
          buffer[1] = other[1];
          buffer[2] = other[2];
          this.modified = true;
        } else {
          buffer[0] = arg1[0];
          buffer[1] = arg1[1];
          buffer[2] = arg1[2];
          this.modified = true;
        }
      } else if( 3 === argc ) {
        buffer[0] = arg1;
        buffer[1] = arg2;
        buffer[2] = arg3;
        this.modified = true;
      }      

      return this;
    }

    function subtract( arg, result ) {
      var other;
      if( arg instanceof Vector3 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      vector3.subtract( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function transform( arg, result ) {
      var other;
      if( arg instanceof Matrix ) {
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      vector3.transform( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }
    
    _.extend( Vector3.prototype, {
      add: add,
      angle: angle,
      clear: clear,
      clone: clone,
      cross: cross,
      distance: distance,
      dot: dot,
      equal: equal,
      length: length,
      limit: limit,
      multiply: multiply,
      negate: negate,
      normalize: normalize,
      set: set,
      subtract: subtract,
      transform: transform
    });

    return Vector3;

  };

});
define('vector/v4',['require','vector/v'],function ( require ) {

  var V = require( "vector/v" );

  return function( FLOAT_ARRAY_TYPE ) {

    var V4 = function() {
      var argc = arguments.length;
      var i, j, vi = 0;

      var vector = new FLOAT_ARRAY_TYPE( 4 );

      for( i = 0; i < argc && vi < 4; ++ i ) {
        var arg = arguments[i];
        if( arg === undefined ) {
          break;
        } else if( arg instanceof Array ||
                   arg instanceof FLOAT_ARRAY_TYPE ) {
          for( j = 0; j < arg.length && vi < 4; ++ j ) {
            vector[vi ++] = arg[j];
          }
        } else {
          vector[vi ++] = arg;
        }
      }
      // Fill in missing elements with zero
      for( ; vi < 4; ++ vi ) {
        vector[vi] = 0;
      }

      return vector;
    };
    V4.prototype = new V();
    V4.prototype.constructor = V4;

    return V4;

  };

});
define('vector/vector4-api',['require','common/not-implemented','vector/v4'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {

    var notImplemented = require( "common/not-implemented" );
    var V4 = require( "vector/v4" )( FLOAT_ARRAY_TYPE );

    function add( v1, v2, result ) {
      if( result === v1 ) {
        v1[0] += v2[0];
        v1[1] += v2[1];
        v1[2] += v2[2];
        v1[3] += v2[3];
        return;
      }

      if( undefined === result ) {
        result = new V4( v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2], v1[3] + v2[3] );
        return result;
      } else {
        result[0] = v1[0] + v2[0];
        result[1] = v1[1] + v2[1];
        result[2] = v1[2] + v2[2];
        result[3] = v1[3] + v2[3];
        return;
      }
    }

    function angle( v1, v2 ) {
      return Math.acos(
        (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) /
        (Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2] + v1[3] * v1[3]) *
          Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2] + v2[3] * v2[3]) ) );
    }

    function clear( v ) {
      v[0] = 0;
      v[1] = 0;
      v[2] = 0;
      v[3] = 0;

      return v;
    }

    function distance( v1, v2 ) {
      return Math.sqrt((v1[0] - v2[0]) * (v1[0] - v2[0]) +
                       (v1[1] - v2[1]) * (v1[1] - v2[1]) +
                       (v1[2] - v2[2]) * (v1[2] - v2[2]) +
                       (v1[3] - v2[3]) * (v1[3] - v2[3]));
    }

    function dot( v1, v2 ) {
      return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2] + v1[3] * v2[3];
    }

    function equal( v1, v2, e ) {
      e = e || 0.000001;

      if( v1.length !== v2.length ) {
        return false;
      }

      var d0 = Math.abs( v1[0] - v2[0] );
      var d1 = Math.abs( v1[1] - v2[1] );
      var d2 = Math.abs( v1[2] - v2[2] );
      var d3 = Math.abs( v1[3] - v2[3] );

      if( isNaN( d0 ) || d0 > e ||
          isNaN( d1 ) || d1 > e ||
          isNaN( d2 ) || d2 > e ||
          isNaN( d3 ) || d3 > e ) {
        return false;
      }

      return true;
    }

    function length( v ) {
      var r = 0;

      r += v[0] * v[0];
      r += v[1] * v[1];
      r += v[2] * v[2];
      r += v[3] * v[3];

      return Math.sqrt( r );
    }

    function limit(v, max, result){
      result = result || new V4();
      var length;
      length = Math.sqrt( v[0] * v[0] +
                          v[1] * v[1] +
                          v[2] * v[2] +
                          v[3] * v[3]);
      if (length > max){
        var ratio = max/length;
        result[0] = v[0] * ratio;
        result[1] = v[1] * ratio;
        result[2] = v[2] * ratio;
        result[3] = v[3] * ratio;
      }else{
        result[0] = v[0];
        result[1] = v[1];
        result[2] = v[2];
        result[3] = v[3];
      }
      return result;
    }

    function multiply( v, s, result ) {
      result = result || new V4();
      
      result[0] = s * v[0];
      result[1] = s * v[1];
      result[2] = s * v[2];
      result[3] = s * v[3];
      
      return result;      
    }

    function negate( v, result ) {
      result = result || new V4();
      
      result[0] = -1 * v[0];
      result[1] = -1 * v[1];
      result[2] = -1 * v[2];
      result[3] = -1 * v[3];
      
      return result;      
    }

    function normalize( v, result ) {
      result = result || new V4();
      var l = length( v );
      
      result[0] = v[0]/l;
      result[1] = v[1]/l;
      result[2] = v[2]/l;
      result[3] = v[3]/l;
      
      return result;      
    }

    function set( v ) {
      if( 2 === arguments.length ) {
        v[0] = arguments[1][0];
        v[1] = arguments[1][1];
        v[2] = arguments[1][2];
        v[3] = arguments[1][3];
      } else {          
        v[0] = arguments[1];
        v[1] = arguments[2];
        v[2] = arguments[3];
        v[3] = arguments[4];
      }
     
      return v;      
    }

    function subtract( v1, v2, result ) {
      result = result || new V4();
      
      result[0] = v1[0] - v2[0];
      result[1] = v1[1] - v2[1];
      result[2] = v1[2] - v2[2];
      result[3] = v1[3] - v2[3];
      
      return result;
    }

    //This does a matrix4 by vector4 transform, which is a matrix multiplication
    //The matrix4 is on the left side of the multiplication and is multiplied by
    // the vector in column form
    function transform( v, m, result ) {
      result = result || new V4();

      var x = v[0], y = v[1], z = v[2], w = v[3];

      result[0] = m[0] * x + m[1] * y + m[2] * z + m[3] * w;
      result[1] = m[4] * x + m[5] * y + m[6] * z + m[7] * w;
      result[2] = m[8] * x + m[9] * y + m[10] * z + m[11] * w;
      result[3] = m[12] * x + m[13] * y + m[14] * z + m[15] * w;

      return result;
    }

    var vector4 = {
      add: add,
      angle: angle,
      clear: clear,
      distance: distance,
      dot: dot,
      equal: equal,
      length: length,
      limit: limit,
      multiply: multiply,
      negate: negate,
      normalize: normalize,
      set: set,
      subtract: subtract,
      transform: transform,

      x: new V4( 1, 0, 0, 0 ),
      y: new V4( 0, 1, 0, 0 ),
      z: new V4( 0, 0, 1, 0 ),
      w: new V4( 0, 0, 0, 1 ),
      zero: new V4( 0, 0, 0, 0 ),
      one: new V4( 1, 1, 1, 1 )
    };
    
    return vector4;

  };

});
define('vector/vector4',['require','../../lib/lodash','common/not-implemented','vector/v4','vector/vector4-api','matrix/matrix','vector/vector'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {
    
    var _ = require( "../../lib/lodash" );
    var notImplemented = require( "common/not-implemented" );
    var V4 = require( "vector/v4" )( FLOAT_ARRAY_TYPE );
    var vector4 = require( "vector/vector4-api" )( FLOAT_ARRAY_TYPE );
    var Matrix = require( "matrix/matrix" );
    var Vector = require( "vector/vector" );  

    function getValue( index ) {
      return this.buffer[index];
    }

    function setValue( index, value ) {
      this.buffer[index] = value;
      this.modified = true;
    }

    var Vector4 = function( arg1, arg2, arg3, arg4 ) {
      var argc = arguments.length;

      this.buffer = new V4(
        (arg1 instanceof Vector) ? arg1.buffer : arg1,
        (arg2 instanceof Vector) ? arg2.buffer : arg2,
        (arg3 instanceof Vector) ? arg3.buffer : arg3,
        (arg4 instanceof Vector) ? arg4.buffer : arg4
      );

      Object.defineProperties( this, {
        x: {
          get: getValue.bind( this, 0 ),
          set: setValue.bind( this, 0 )
        },
        y: {
          get: getValue.bind( this, 1 ),
          set: setValue.bind( this, 1 )
        },
        z: {
          get: getValue.bind( this, 2 ),
          set: setValue.bind( this, 2 )
        },
        w: {
          get: getValue.bind( this, 3 ),
          set: setValue.bind( this, 3 )
        }
      });

      this.modified = true;
      this.size = 4;
    };
    Vector4.prototype = new Vector();
    Vector4.prototype.constructor = Vector4;

    function add( arg, result ) {
      var other;
      if( arg instanceof Vector4 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      vector4.add( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function angle( arg ) {
      var other;
      if( arg instanceof Vector4 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return vector4.angle( this.buffer, other );      
    }

    function clear() {
      vector4.clear( this.buffer );
      this.modified = true;

      return this;
    }

    function clone() {
      return new Vector4( this );
    }

    function distance(arg) {
      var other;
      if( arg instanceof Vector4 ) {
        other = arg.buffer;
      } else {
        other = arg;
      }
      return vector4.distance(this.buffer, other);
    }

    function dot( arg ) {
      var other;
      if( arg instanceof Vector4 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return vector4.dot( this.buffer, other );
    }

    function equal( arg ) {
      var other;
      if( arg instanceof Vector4 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return vector4.equal( this.buffer, other );
    }

    function length() {
      return vector4.length( this.buffer );
    }

    function limit(max, result) {
      result = result || this;
      var other;
      if( result instanceof Vector4 ) {
        other = result.buffer;
        result.modified = true;
      } else {
        other = result;
      }
      vector4.limit(this.buffer, max, other);
      return result;
    }

    function multiply( arg, result ) {
      result = result || this;
      vector4.multiply( this.buffer, arg, result.buffer );
      result.modified = true;

      return this;
    }

    function negate( result ) {
      result = result || this;
      vector4.negate( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }

    function normalize( result ) {
      result = result || this;
      vector4.normalize( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }

    function set( arg1, arg2, arg3, arg4 ) {
      var argc = arguments.length;
      var buffer = this.buffer;
      if( 1 === argc ) {
        if( arg1 instanceof Vector4 ) {
          var other = arg1.buffer;
          buffer[0] = other[0];
          buffer[1] = other[1];
          buffer[2] = other[2];
          buffer[3] = other[3];
          this.modified = true;
        } else {
          buffer[0] = arg1[0];
          buffer[1] = arg1[1];
          buffer[2] = arg1[2];
          buffer[3] = arg1[3];
          this.modified = true;
        }
      } else if( 4 === argc ) {
        buffer[0] = arg1;
        buffer[1] = arg2;
        buffer[2] = arg3;
        buffer[3] = arg4;
        this.modified = true;
      }

      return this;
    }

    function subtract( arg, result ) {
      var other;
      if( arg instanceof Vector4 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      vector4.subtract( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function transform( arg, result ) {
      var other;
      if( arg instanceof Matrix ) {
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      vector4.transform( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }
  
    _.extend( Vector4.prototype, {
      add: add,
      angle: angle,
      clear: clear,
      clone: clone,
      distance: distance,
      dot: dot,
      equal: equal,
      length: length,
      limit: limit,
      multiply: multiply,
      negate: negate,
      normalize: normalize,
      set: set,
      subtract: subtract,
      transform: transform
    });

    return Vector4;

  };

});
define('matrix/m',['require'],function ( require ) {

  var M = function() {
  };

  return M;

});
define('matrix/m2',['require','matrix/m'],function ( require ) {

  var M = require( "matrix/m" );

  return function( FLOAT_ARRAY_TYPE ) {

    var M2 = function() {
      var elements = null;
      var argc = arguments.length;
      if( 1 === argc) {
        elements = arguments[0];
      } else if( 0 === argc ) {
        elements = [0, 0,
                    0, 0];
      } else {
        elements = arguments;
      }

      var matrix = new FLOAT_ARRAY_TYPE( 4 );
      for( var i = 0; i < 4; ++ i ) {
        matrix[i] = elements[i];
      }

      return matrix;
    };
    M2.prototype = new M();
    M2.prototype.constructor = M2;

    return M2;

  };

});
/*!
 * Lo-Dash v0.4.1 <http://lodash.com>
 * Copyright 2012 John-David Dalton <http://allyoucanleet.com/>
 * Based on Underscore.js 1.3.3, copyright 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
 * <http://documentcloud.github.com/underscore>
 * Available under MIT license <http://lodash.com/license>
 */
;(function(window, undefined) {
  

  /**
   * Used to cache the last `_.templateSettings.evaluate` delimiter to avoid
   * unnecessarily assigning `reEvaluateDelimiter` a new generated regexp.
   * Assigned in `_.template`.
   */
  var lastEvaluateDelimiter;

  /**
   * Used to cache the last template `options.variable` to avoid unnecessarily
   * assigning `reDoubleVariable` a new generated regexp. Assigned in `_.template`.
   */
  var lastVariable;

  /**
   * Used to match potentially incorrect data object references, like `obj.obj`,
   * in compiled templates. Assigned in `_.template`.
   */
  var reDoubleVariable;

  /**
   * Used to match "evaluate" delimiters, including internal delimiters,
   * in template text. Assigned in `_.template`.
   */
  var reEvaluateDelimiter;

  /** Detect free variable `exports` */
  var freeExports = typeof exports == 'object' && exports &&
    (typeof global == 'object' && global && global == global.global && (window = global), exports);

  /** Native prototype shortcuts */
  var ArrayProto = Array.prototype,
      ObjectProto = Object.prototype;

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used to restore the original `_` reference in `noConflict` */
  var oldDash = window._;

  /** Used to detect delimiter values that should be processed by `tokenizeEvaluate` */
  var reComplexDelimiter = /[-+=!~*%&^<>|{(\/]|\[\D|\b(?:delete|in|instanceof|new|typeof|void)\b/;

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /** Used to insert the data object variable into compiled template source */
  var reInsertVariable = /(?:__e|__t = )\(\s*(?![\d\s"']|this\.)/g;

  /** Used to detect if a method is native */
  var reNative = RegExp('^' +
    (ObjectProto.valueOf + '')
      .replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&')
      .replace(/valueOf|for [^\]]+/g, '.+?') + '$'
  );

  /** Used to match tokens in template text */
  var reToken = /__token__(\d+)/g;

  /** Used to match unescaped characters in strings for inclusion in HTML */
  var reUnescapedHtml = /[&<"']/g;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to fix the JScript [[DontEnum]] bug */
  var shadowed = [
    'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
    'toLocaleString', 'toString', 'valueOf'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** Used to replace template delimiters */
  var token = '__token__';

  /** Used to store tokenized template text snippets */
  var tokenized = [];

  /** Native method shortcuts */
  var concat = ArrayProto.concat,
      hasOwnProperty = ObjectProto.hasOwnProperty,
      push = ArrayProto.push,
      propertyIsEnumerable = ObjectProto.propertyIsEnumerable,
      slice = ArrayProto.slice,
      toString = ObjectProto.toString;

  /* Native method shortcuts for methods with the same name as other `lodash` methods */
  var nativeBind = reNative.test(nativeBind = slice.bind) && nativeBind,
      nativeIsArray = reNative.test(nativeIsArray = Array.isArray) && nativeIsArray,
      nativeIsFinite = window.isFinite,
      nativeKeys = reNative.test(nativeKeys = Object.keys) && nativeKeys;

  /** `Object#toString` result shortcuts */
  var arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Timer shortcuts */
  var clearTimeout = window.clearTimeout,
      setTimeout = window.setTimeout;

  /**
   * Detect the JScript [[DontEnum]] bug:
   * In IE < 9 an objects own properties, shadowing non-enumerable ones, are
   * made non-enumerable as well.
   */
  var hasDontEnumBug = !propertyIsEnumerable.call({ 'valueOf': 0 }, 'valueOf');

  /** Detect if `Array#slice` cannot be used to convert strings to arrays (e.g. Opera < 10.52) */
  var noArraySliceOnStrings = slice.call('x')[0] != 'x';

  /**
   * Detect lack of support for accessing string characters by index:
   * IE < 8 can't access characters by index and IE 8 can only access
   * characters by index on string literals.
   */
  var noCharByIndex = ('x'[0] + Object('x')[0]) != 'xx';

  /* Detect if `Function#bind` exists and is inferred to be fast (i.e. all but V8) */
  var isBindFast = nativeBind && /\n|Opera/.test(nativeBind + toString.call(window.opera));

  /* Detect if `Object.keys` exists and is inferred to be fast (i.e. V8, Opera, IE) */
  var isKeysFast = nativeKeys && /^.+$|true/.test(nativeKeys + !!window.attachEvent);

  /** Detect if sourceURL syntax is usable without erroring */
  try {
    // Adobe's and Narwhal's JS engines will error
    var useSourceURL = (Function('//@')(), true);
  } catch(e){ }

  /**
   * Used to escape characters for inclusion in HTML.
   * The `>` and `/` characters don't require escaping in HTML and have no
   * special meaning unless they're part of a tag or an unquoted attribute value
   * http://mathiasbynens.be/notes/ambiguous-ampersands (semi-related fun fact)
   */
  var htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '"': '&quot;',
    "'": '&#x27;'
  };

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /*--------------------------------------------------------------------------*/

  /**
   * The `lodash` function.
   *
   * @name _
   * @constructor
   * @param {Mixed} value The value to wrap in a `LoDash` instance.
   * @returns {Object} Returns a `LoDash` instance.
   */
  function lodash(value) {
    // allow invoking `lodash` without the `new` operator
    return new LoDash(value);
  }

  /**
   * Creates a `LoDash` instance that wraps a value to allow chaining.
   *
   * @private
   * @constructor
   * @param {Mixed} value The value to wrap.
   */
  function LoDash(value) {
    // exit early if already wrapped
    if (value && value._wrapped) {
      return value;
    }
    this._wrapped = value;
  }

  /**
   * By default, Lo-Dash uses embedded Ruby (ERB) style template delimiters,
   * change the following template settings to use alternative delimiters.
   *
   * @static
   * @memberOf _
   * @type Object
   */
  lodash.templateSettings = {

    /**
     * Used to detect `data` property values to be HTML-escaped.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'escape': /<%-([\s\S]+?)%>/g,

    /**
     * Used to detect code to be evaluated.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'evaluate': /<%([\s\S]+?)%>/g,

    /**
     * Used to detect `data` property values to inject.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'interpolate': /<%=([\s\S]+?)%>/g,

    /**
     * Used to reference the data object in the template text.
     *
     * @static
     * @memberOf _.templateSettings
     * @type String
     */
    'variable': 'obj'
  };

  /*--------------------------------------------------------------------------*/

  /**
   * The template used to create iterator functions.
   *
   * @private
   * @param {Obect} data The data object used to populate the text.
   * @returns {String} Returns the interpolated text.
   */
  var iteratorTemplate = template(
    // assign the `result` variable an initial value
    'var result<% if (init) { %> = <%= init %><% } %>;\n' +
    // add code to exit early or do so if the first argument is falsey
    '<%= exit %>;\n' +
    // add code after the exit snippet but before the iteration branches
    '<%= top %>;\n' +
    'var index, iteratee = <%= iteratee %>;\n' +

    // the following branch is for iterating arrays and array-like objects
    '<% if (arrayBranch) { %>' +
    'var length = iteratee.length; index = -1;' +
    '  <% if (objectBranch) { %>\nif (length === length >>> 0) {<% } %>' +

    // add support for accessing string characters by index if needed
    '  <% if (noCharByIndex) { %>\n' +
    '  if (toString.call(iteratee) == stringClass) {\n' +
    '    iteratee = iteratee.split(\'\')\n' +
    '  }' +
    '  <% } %>\n' +

    '  <%= arrayBranch.beforeLoop %>;\n' +
    '  while (++index < length) {\n' +
    '    <%= arrayBranch.inLoop %>\n' +
    '  }' +
    '  <% if (objectBranch) { %>\n}<% } %>' +
    '<% } %>' +

    // the following branch is for iterating an object's own/inherited properties
    '<% if (objectBranch) { %>' +
    '  <% if (arrayBranch) { %>\nelse {<% } %>' +
    '  <% if (!hasDontEnumBug) { %>\n' +
    '  var skipProto = typeof iteratee == \'function\' && \n' +
    '    propertyIsEnumerable.call(iteratee, \'prototype\');\n' +
    '  <% } %>' +

    // iterate own properties using `Object.keys` if it's fast
    '  <% if (isKeysFast && useHas) { %>\n' +
    '  var props = nativeKeys(iteratee),\n' +
    '      propIndex = -1,\n' +
    '      length = props.length;\n\n' +
    '  <%= objectBranch.beforeLoop %>;\n' +
    '  while (++propIndex < length) {\n' +
    '    index = props[propIndex];\n' +
    '    if (!(skipProto && index == \'prototype\')) {\n' +
    '      <%= objectBranch.inLoop %>\n' +
    '    }\n' +
    '  }' +

    // else using a for-in loop
    '  <% } else { %>\n' +
    '  <%= objectBranch.beforeLoop %>;\n' +
    '  for (index in iteratee) {' +
    '    <% if (hasDontEnumBug) { %>\n' +
    '    <%   if (useHas) { %>if (hasOwnProperty.call(iteratee, index)) {\n  <% } %>' +
    '    <%= objectBranch.inLoop %>;\n' +
    '    <%   if (useHas) { %>}<% } %>' +
    '    <% } else { %>\n' +

    // Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1
    // (if the prototype or a property on the prototype has been set)
    // incorrectly sets a function's `prototype` property [[Enumerable]]
    // value to `true`. Because of this Lo-Dash standardizes on skipping
    // the the `prototype` property of functions regardless of its
    // [[Enumerable]] value.
    '    if (!(skipProto && index == \'prototype\')<% if (useHas) { %> &&\n' +
    '        hasOwnProperty.call(iteratee, index)<% } %>) {\n' +
    '      <%= objectBranch.inLoop %>\n' +
    '    }' +
    '    <% } %>\n' +
    '  }' +
    '  <% } %>' +

    // Because IE < 9 can't set the `[[Enumerable]]` attribute of an
    // existing property and the `constructor` property of a prototype
    // defaults to non-enumerable, Lo-Dash skips the `constructor`
    // property when it infers it's iterating over a `prototype` object.
    '  <% if (hasDontEnumBug) { %>\n\n' +
    '  var ctor = iteratee.constructor;\n' +
    '    <% for (var k = 0; k < 7; k++) { %>\n' +
    '  index = \'<%= shadowed[k] %>\';\n' +
    '  if (<%' +
    '      if (shadowed[k] == \'constructor\') {' +
    '        %>!(ctor && ctor.prototype === iteratee) && <%' +
    '      } %>hasOwnProperty.call(iteratee, index)) {\n' +
    '    <%= objectBranch.inLoop %>\n' +
    '  }' +
    '    <% } %>' +
    '  <% } %>' +
    '  <% if (arrayBranch) { %>\n}<% } %>' +
    '<% } %>\n' +

    // add code to the bottom of the iteration function
    '<%= bottom %>;\n' +
    // finally, return the `result`
    'return result'
  );

  /**
   * Reusable iterator options shared by
   * `every`, `filter`, `find`, `forEach`, `forIn`, `forOwn`, `groupBy`, `map`,
   * `reject`, `some`, and `sortBy`.
   */
  var baseIteratorOptions = {
    'args': 'collection, callback, thisArg',
    'init': 'collection',
    'top':
      'if (!callback) {\n' +
      '  callback = identity\n' +
      '}\n' +
      'else if (thisArg) {\n' +
      '  callback = iteratorBind(callback, thisArg)\n' +
      '}',
    'inLoop': 'callback(iteratee[index], index, collection)'
  };

  /** Reusable iterator options for `every` and `some` */
  var everyIteratorOptions = {
    'init': 'true',
    'inLoop': 'if (!callback(iteratee[index], index, collection)) return !result'
  };

  /** Reusable iterator options for `defaults` and `extend` */
  var extendIteratorOptions = {
    'args': 'object',
    'init': 'object',
    'top':
      'for (var source, sourceIndex = 1, length = arguments.length; sourceIndex < length; sourceIndex++) {\n' +
      '  source = arguments[sourceIndex];\n' +
      (hasDontEnumBug ? '  if (source) {' : ''),
    'iteratee': 'source',
    'useHas': false,
    'inLoop': 'result[index] = iteratee[index]',
    'bottom': (hasDontEnumBug ? '  }\n' : '') + '}'
  };

  /** Reusable iterator options for `filter` and `reject` */
  var filterIteratorOptions = {
    'init': '[]',
    'inLoop': 'callback(iteratee[index], index, collection) && result.push(iteratee[index])'
  };

  /** Reusable iterator options for `find`, `forEach`, `forIn`, and `forOwn` */
  var forEachIteratorOptions = {
    'top': 'if (thisArg) callback = iteratorBind(callback, thisArg)'
  };

  /** Reusable iterator options for `forIn` and `forOwn` */
  var forOwnIteratorOptions = {
    'inLoop': {
      'object': baseIteratorOptions.inLoop
    }
  };

  /** Reusable iterator options for `invoke`, `map`, `pluck`, and `sortBy` */
  var mapIteratorOptions = {
    'init': '',
    'exit': 'if (!collection) return []',
    'beforeLoop': {
      'array':  'result = Array(length)',
      'object': 'result = ' + (isKeysFast ? 'Array(length)' : '[]')
    },
    'inLoop': {
      'array':  'result[index] = callback(iteratee[index], index, collection)',
      'object': 'result' + (isKeysFast ? '[propIndex] = ' : '.push') + '(callback(iteratee[index], index, collection))'
    }
  };

  /*--------------------------------------------------------------------------*/

  /**
   * Creates compiled iteration functions. The iteration function will be created
   * to iterate over only objects if the first argument of `options.args` is
   * "object" or `options.inLoop.array` is falsey.
   *
   * @private
   * @param {Object} [options1, options2, ...] The compile options objects.
   *
   *  args - A string of comma separated arguments the iteration function will
   *   accept.
   *
   *  init - A string to specify the initial value of the `result` variable.
   *
   *  exit - A string of code to use in place of the default exit-early check
   *   of `if (!arguments[0]) return result`.
   *
   *  top - A string of code to execute after the exit-early check but before
   *   the iteration branches.
   *
   *  beforeLoop - A string or object containing an "array" or "object" property
   *   of code to execute before the array or object loops.
   *
   *  iteratee - A string or object containing an "array" or "object" property
   *   of the variable to be iterated in the loop expression.
   *
   *  useHas - A boolean to specify whether or not to use `hasOwnProperty` checks
   *   in the object loop.
   *
   *  inLoop - A string or object containing an "array" or "object" property
   *   of code to execute in the array or object loops.
   *
   *  bottom - A string of code to execute after the iteration branches but
   *   before the `result` is returned.
   *
   * @returns {Function} Returns the compiled function.
   */
  function createIterator() {
    var object,
        prop,
        value,
        index = -1,
        length = arguments.length;

    // merge options into a template data object
    var data = {
      'bottom': '',
      'exit': '',
      'init': '',
      'top': '',
      'arrayBranch': { 'beforeLoop': '' },
      'objectBranch': { 'beforeLoop': '' }
    };

    while (++index < length) {
      object = arguments[index];
      for (prop in object) {
        value = (value = object[prop]) == null ? '' : value;
        // keep this regexp explicit for the build pre-process
        if (/beforeLoop|inLoop/.test(prop)) {
          if (typeof value == 'string') {
            value = { 'array': value, 'object': value };
          }
          data.arrayBranch[prop] = value.array;
          data.objectBranch[prop] = value.object;
        } else {
          data[prop] = value;
        }
      }
    }
    // set additional template `data` values
    var args = data.args,
        firstArg = /^[^,]+/.exec(args)[0],
        iteratee = (data.iteratee = data.iteratee || firstArg);

    data.firstArg = firstArg;
    data.hasDontEnumBug = hasDontEnumBug;
    data.isKeysFast = isKeysFast;
    data.shadowed = shadowed;
    data.useHas = data.useHas !== false;

    if (!('noCharByIndex' in data)) {
      data.noCharByIndex = noCharByIndex;
    }
    if (!data.exit) {
      data.exit = 'if (!' + firstArg + ') return result';
    }
    if (firstArg != 'collection' || !data.arrayBranch.inLoop) {
      data.arrayBranch = null;
    }
    // create the function factory
    var factory = Function(
        'arrayClass, compareAscending, funcClass, hasOwnProperty, identity, ' +
        'iteratorBind, objectTypes, nativeKeys, propertyIsEnumerable, ' +
        'slice, stringClass, toString',
      ' return function(' + args + ') {\n' + iteratorTemplate(data) + '\n}'
    );
    // return the compiled function
    return factory(
      arrayClass, compareAscending, funcClass, hasOwnProperty, identity,
      iteratorBind, objectTypes, nativeKeys, propertyIsEnumerable, slice,
      stringClass, toString
    );
  }

  /**
   * Used by `sortBy` to compare transformed values of `collection`, sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {Number} Returns `-1` if `a` < `b`, `0` if `a` == `b`, or `1` if `a` > `b`.
   */
  function compareAscending(a, b) {
    a = a.criteria;
    b = b.criteria;

    if (a === undefined) {
      return 1;
    }
    if (b === undefined) {
      return -1;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  }

  /**
   * Used by `template` to replace tokens with their corresponding code snippets.
   *
   * @private
   * @param {String} match The matched token.
   * @param {String} index The `tokenized` index of the code snippet.
   * @returns {String} Returns the code snippet.
   */
  function detokenize(match, index) {
    return tokenized[index];
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Used by `escape` to escape characters for inclusion in HTML.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeHtmlChar(match) {
    return htmlEscapes[match];
  }

  /**
   * Creates a new function that, when called, invokes `func` with the `this`
   * binding of `thisArg` and the arguments (value, index, object).
   *
   * @private
   * @param {Function} func The function to bind.
   * @param {Mixed} [thisArg] The `this` binding of `func`.
   * @returns {Function} Returns the new bound function.
   */
  function iteratorBind(func, thisArg) {
    return function(value, index, object) {
      return func.call(thisArg, value, index, object);
    };
  }

  /**
   * A no-operation function.
   *
   * @private
   */
  function noop() {
    // no operation performed
  }

  /**
   * A shim implementation of `Object.keys` that produces an array of the given
   * object's own enumerable property names.
   *
   * @private
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names.
   */
  var shimKeys = createIterator({
    'args': 'object',
    'exit': 'if (!(object && objectTypes[typeof object])) throw TypeError()',
    'init': '[]',
    'inLoop': 'result.push(index)'
  });

  /**
   * Used by `template` to replace "escape" template delimiters with tokens.
   *
   * @private
   * @param {String} match The matched template delimiter.
   * @param {String} value The delimiter value.
   * @returns {String} Returns a token.
   */
  function tokenizeEscape(match, value) {
    if (reComplexDelimiter.test(value)) {
      return '<e%-' + value + '%>';
    }
    var index = tokenized.length;
    tokenized[index] = "' +\n__e(" + value + ") +\n'";
    return token + index;
  }

  /**
   * Used by `template` to replace "evaluate" template delimiters, or complex
   * "escape" and "interpolate" delimiters, with tokens.
   *
   * @private
   * @param {String} match The matched template delimiter.
   * @param {String} value The delimiter value.
   * @param {String} escapeValue The "escape" delimiter value.
   * @param {String} interpolateValue The "interpolate" delimiter value.
   * @returns {String} Returns a token.
   */
  function tokenizeEvaluate(match, value, escapeValue, interpolateValue) {
    var index = tokenized.length;
    if (value) {
      tokenized[index] = "';\n" + value + ";\n__p += '"
    } else if (escapeValue) {
      tokenized[index] = "' +\n__e(" + escapeValue + ") +\n'";
    } else if (interpolateValue) {
      tokenized[index] = "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
    }
    return token + index;
  }

  /**
   * Used by `template` to replace "interpolate" template delimiters with tokens.
   *
   * @private
   * @param {String} match The matched template delimiter.
   * @param {String} value The delimiter value.
   * @returns {String} Returns a token.
   */
  function tokenizeInterpolate(match, value) {
    if (reComplexDelimiter.test(value)) {
      return '<e%=' + value + '%>';
    }
    var index = tokenized.length;
    tokenized[index] = "' +\n((__t = (" + value + ")) == null ? '' : __t) +\n'";
    return token + index;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Checks if a given `target` value is present in a `collection` using strict
   * equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @alias include
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Mixed} target The value to check for.
   * @returns {Boolean} Returns `true` if `target` value is found, else `false`.
   * @example
   *
   * _.contains([1, 2, 3], 3);
   * // => true
   *
   * _.contains({ 'name': 'moe', 'age': 40 }, 'moe');
   * // => true
   *
   * _.contains('curly', 'ur');
   * // => true
   */
  var contains = createIterator({
    'args': 'collection, target',
    'init': 'false',
    'noCharByIndex': false,
    'beforeLoop': {
      'array': 'if (toString.call(iteratee) == stringClass) return collection.indexOf(target) > -1'
    },
    'inLoop': 'if (iteratee[index] === target) return true'
  });

  /**
   * Checks if the `callback` returns a truthy value for **all** elements of a
   * `collection`. The `callback` is bound to `thisArg` and invoked with 3
   * arguments; for arrays they are (value, index, array) and for objects they
   * are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias all
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Boolean} Returns `true` if all values pass the callback check, else `false`.
   * @example
   *
   * _.every([true, 1, null, 'yes'], Boolean);
   * // => false
   */
  var every = createIterator(baseIteratorOptions, everyIteratorOptions);

  /**
   * Examines each value in a `collection`, returning an array of all values the
   * `callback` returns truthy for. The `callback` is bound to `thisArg` and
   * invoked with 3 arguments; for arrays they are (value, index, array) and for
   * objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias select
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of values that passed callback check.
   * @example
   *
   * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => [2, 4, 6]
   */
  var filter = createIterator(baseIteratorOptions, filterIteratorOptions);

  /**
   * Examines each value in a `collection`, returning the first one the `callback`
   * returns truthy for. The function returns as soon as it finds an acceptable
   * value, and does not iterate over the entire `collection`. The `callback` is
   * bound to `thisArg` and invoked with 3 arguments; for arrays they are
   * (value, index, array) and for objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias detect
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the value that passed the callback check, else `undefined`.
   * @example
   *
   * var even = _.find([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => 2
   */
  var find = createIterator(baseIteratorOptions, forEachIteratorOptions, {
    'init': '',
    'inLoop': 'if (callback(iteratee[index], index, collection)) return iteratee[index]'
  });

  /**
   * Iterates over a `collection`, executing the `callback` for each value in the
   * `collection`. The `callback` is bound to `thisArg` and invoked with 3
   * arguments; for arrays they are (value, index, array) and for objects they
   * are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias each
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array|Object} Returns the `collection`.
   * @example
   *
   * _([1, 2, 3]).forEach(alert).join(',');
   * // => alerts each number and returns '1,2,3'
   *
   * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, alert);
   * // => alerts each number (order is not guaranteed)
   */
  var forEach = createIterator(baseIteratorOptions, forEachIteratorOptions);

  /**
   * Splits `collection` into sets, grouped by the result of running each value
   * through `callback`. The `callback` is bound to `thisArg` and invoked with
   * 3 arguments; for arrays they are (value, index, array) and for objects they
   * are (value, key, object). The `callback` argument may also be the name of a
   * property to group by.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function|String} callback The function called per iteration or
   *  property name to group by.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Object} Returns an object of grouped values.
   * @example
   *
   * _.groupBy([1.3, 2.1, 2.4], function(num) { return Math.floor(num); });
   * // => { '1': [1.3], '2': [2.1, 2.4] }
   *
   * _.groupBy([1.3, 2.1, 2.4], function(num) { return this.floor(num); }, Math);
   * // => { '1': [1.3], '2': [2.1, 2.4] }
   *
   * _.groupBy(['one', 'two', 'three'], 'length');
   * // => { '3': ['one', 'two'], '5': ['three'] }
   */
  var groupBy = createIterator(baseIteratorOptions, {
    'init': '{}',
    'top':
      'var prop, isFunc = typeof callback == \'function\';\n' +
      'if (isFunc && thisArg) callback = iteratorBind(callback, thisArg)',
    'inLoop':
      'prop = isFunc\n' +
      '  ? callback(iteratee[index], index, collection)\n' +
      '  : iteratee[index][callback];\n' +
      '(hasOwnProperty.call(result, prop) ? result[prop] : result[prop] = []).push(iteratee[index])'
  });

  /**
   * Invokes the method named by `methodName` on each element in the `collection`.
   * Additional arguments will be passed to each invoked method. If `methodName`
   * is a function it will be invoked for, and `this` bound to, each element
   * in the `collection`.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function|String} methodName The name of the method to invoke or
   *  the function invoked per iteration.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the method with.
   * @returns {Array} Returns a new array of values returned from each invoked method.
   * @example
   *
   * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
   * // => [[1, 5, 7], [1, 2, 3]]
   *
   * _.invoke([123, 456], String.prototype.split, '');
   * // => [['1', '2', '3'], ['4', '5', '6']]
   */
  var invoke = createIterator(mapIteratorOptions, {
    'args': 'collection, methodName',
    'top':
      'var args = slice.call(arguments, 2),\n' +
      '    isFunc = typeof methodName == \'function\'',
    'inLoop': {
      'array':
        'result[index] = (isFunc ? methodName : iteratee[index][methodName])' +
        '.apply(iteratee[index], args)',
      'object':
        'result' + (isKeysFast ? '[propIndex] = ' : '.push') +
        '((isFunc ? methodName : iteratee[index][methodName]).apply(iteratee[index], args))'
    }
  });

  /**
   * Produces a new array of values by mapping each element in the `collection`
   * through a transformation `callback`. The `callback` is bound to `thisArg`
   * and invoked with 3 arguments; for arrays they are (value, index, array)
   * and for objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias collect
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of values returned by the callback.
   * @example
   *
   * _.map([1, 2, 3], function(num) { return num * 3; });
   * // => [3, 6, 9]
   *
   * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
   * // => [3, 6, 9] (order is not guaranteed)
   */
  var map = createIterator(baseIteratorOptions, mapIteratorOptions);

  /**
   * Retrieves the value of a specified property from all elements in
   * the `collection`.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {String} property The property to pluck.
   * @returns {Array} Returns a new array of property values.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * _.pluck(stooges, 'name');
   * // => ['moe', 'larry', 'curly']
   */
  var pluck = createIterator(mapIteratorOptions, {
    'args': 'collection, property',
    'inLoop': {
      'array':  'result[index] = iteratee[index][property]',
      'object': 'result' + (isKeysFast ? '[propIndex] = ' : '.push') + '(iteratee[index][property])'
    }
  });

  /**
   * Boils down a `collection` to a single value. The initial state of the
   * reduction is `accumulator` and each successive step of it should be returned
   * by the `callback`. The `callback` is bound to `thisArg` and invoked with 4
   * arguments; for arrays they are (accumulator, value, index, array) and for
   * objects they are (accumulator, value, key, object).
   *
   * @static
   * @memberOf _
   * @alias foldl, inject
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [accumulator] Initial value of the accumulator.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the accumulated value.
   * @example
   *
   * var sum = _.reduce([1, 2, 3], function(memo, num) { return memo + num; });
   * // => 6
   */
  var reduce = createIterator({
    'args': 'collection, callback, accumulator, thisArg',
    'init': 'accumulator',
    'top':
      'var noaccum = arguments.length < 3;\n' +
      'if (thisArg) callback = iteratorBind(callback, thisArg)',
    'beforeLoop': {
      'array': 'if (noaccum) result = collection[++index]'
    },
    'inLoop': {
      'array':
        'result = callback(result, iteratee[index], index, collection)',
      'object':
        'result = noaccum\n' +
        '  ? (noaccum = false, iteratee[index])\n' +
        '  : callback(result, iteratee[index], index, collection)'
    }
  });

  /**
   * The right-associative version of `_.reduce`.
   *
   * @static
   * @memberOf _
   * @alias foldr
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [accumulator] Initial value of the accumulator.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the accumulated value.
   * @example
   *
   * var list = [[0, 1], [2, 3], [4, 5]];
   * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
   * // => [4, 5, 2, 3, 0, 1]
   */
  function reduceRight(collection, callback, accumulator, thisArg) {
    if (!collection) {
      return accumulator;
    }

    var length = collection.length,
        noaccum = arguments.length < 3;

    if(thisArg) {
      callback = iteratorBind(callback, thisArg);
    }
    if (length === length >>> 0) {
      var iteratee = noCharByIndex && toString.call(collection) == stringClass
        ? collection.split('')
        : collection;

      if (length && noaccum) {
        accumulator = iteratee[--length];
      }
      while (length--) {
        accumulator = callback(accumulator, iteratee[length], length, collection);
      }
      return accumulator;
    }

    var prop,
        props = keys(collection);

    length = props.length;
    if (length && noaccum) {
      accumulator = collection[props[--length]];
    }
    while (length--) {
      prop = props[length];
      accumulator = callback(accumulator, collection[prop], prop, collection);
    }
    return accumulator;
  }

  /**
   * The opposite of `_.filter`, this method returns the values of a `collection`
   * that `callback` does **not** return truthy for.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of values that did **not** pass the callback check.
   * @example
   *
   * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => [1, 3, 5]
   */
  var reject = createIterator(baseIteratorOptions, filterIteratorOptions, {
    'inLoop': '!' + filterIteratorOptions.inLoop
  });

  /**
   * Checks if the `callback` returns a truthy value for **any** element of a
   * `collection`. The function returns as soon as it finds passing value, and
   * does not iterate over the entire `collection`. The `callback` is bound to
   * `thisArg` and invoked with 3 arguments; for arrays they are
   * (value, index, array) and for objects they are (value, key, object).
   *
   * @static
   * @memberOf _
   * @alias any
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Boolean} Returns `true` if any value passes the callback check, else `false`.
   * @example
   *
   * _.some([null, 0, 'yes', false]);
   * // => true
   */
  var some = createIterator(baseIteratorOptions, everyIteratorOptions, {
    'init': 'false',
    'inLoop': everyIteratorOptions.inLoop.replace('!', '')
  });


  /**
   * Produces a new sorted array, sorted in ascending order by the results of
   * running each element of `collection` through a transformation `callback`.
   * The `callback` is bound to `thisArg` and invoked with 3 arguments;
   * for arrays they are (value, index, array) and for objects they are
   * (value, key, object). The `callback` argument may also be the name of a
   * property to sort by (e.g. 'length').
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function|String} callback The function called per iteration or
   *  property name to sort by.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a new array of sorted values.
   * @example
   *
   * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
   * // => [3, 1, 2]
   *
   * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
   * // => [3, 1, 2]
   *
   * _.sortBy(['larry', 'brendan', 'moe'], 'length');
   * // => ['moe', 'larry', 'brendan']
   */
  var sortBy = createIterator(baseIteratorOptions, mapIteratorOptions, {
    'top':
      'if (typeof callback == \'string\') {\n' +
      '  var prop = callback;\n' +
      '  callback = function(collection) { return collection[prop] }\n' +
      '}\n' +
      'else if (thisArg) {\n' +
      '  callback = iteratorBind(callback, thisArg)\n' +
      '}',
    'inLoop': {
      'array':
        'result[index] = {\n' +
        '  criteria: callback(iteratee[index], index, collection),\n' +
        '  value: iteratee[index]\n' +
        '}',
      'object':
        'result' + (isKeysFast ? '[propIndex] = ' : '.push') + '({\n' +
        '  criteria: callback(iteratee[index], index, collection),\n' +
        '  value: iteratee[index]\n' +
        '})'
    },
    'bottom':
      'result.sort(compareAscending);\n' +
      'length = result.length;\n' +
      'while (length--) {\n' +
      '  result[length] = result[length].value\n' +
      '}'
  });

  /**
   * Converts the `collection`, into an array. Useful for converting the
   * `arguments` object.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to convert.
   * @returns {Array} Returns the new converted array.
   * @example
   *
   * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
   * // => [2, 3, 4]
   */
  function toArray(collection) {
    if (!collection) {
      return [];
    }
    if (collection.toArray && toString.call(collection.toArray) == funcClass) {
      return collection.toArray();
    }
    var length = collection.length;
    if (length === length >>> 0) {
      return (noArraySliceOnStrings ? toString.call(collection) == stringClass : typeof collection == 'string')
        ? collection.split('')
        : slice.call(collection);
    }
    return values(collection);
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Produces a new array with all falsey values of `array` removed. The values
   * `false`, `null`, `0`, `""`, `undefined` and `NaN` are all falsey.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to compact.
   * @returns {Array} Returns a new filtered array.
   * @example
   *
   * _.compact([0, 1, false, 2, '', 3]);
   * // => [1, 2, 3]
   */
  function compact(array) {
    var result = [];
    if (!array) {
      return result;
    }
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (array[index]) {
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Produces a new array of `array` values not present in the other arrays
   * using strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to process.
   * @param {Array} [array1, array2, ...] Arrays to check.
   * @returns {Array} Returns a new array of `array` values not present in the
   *  other arrays.
   * @example
   *
   * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
   * // => [1, 3, 4]
   */
  function difference(array) {
    var result = [];
    if (!array) {
      return result;
    }
    var index = -1,
        length = array.length,
        flattened = concat.apply(result, arguments);

    while (++index < length) {
      if (indexOf(flattened, array[index], length) < 0) {
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Gets the first value of the `array`. Pass `n` to return the first `n` values
   * of the `array`.
   *
   * @static
   * @memberOf _
   * @alias head, take
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Mixed} Returns the first value or an array of the first `n` values
   *  of `array`.
   * @example
   *
   * _.first([5, 4, 3, 2, 1]);
   * // => 5
   */
  function first(array, n, guard) {
    if (array) {
      return (n == null || guard) ? array[0] : slice.call(array, 0, n);
    }
  }

  /**
   * Flattens a nested array (the nesting can be to any depth). If `shallow` is
   * truthy, `array` will only be flattened a single level.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to compact.
   * @param {Boolean} shallow A flag to indicate only flattening a single level.
   * @returns {Array} Returns a new flattened array.
   * @example
   *
   * _.flatten([1, [2], [3, [[4]]]]);
   * // => [1, 2, 3, 4];
   *
   * _.flatten([1, [2], [3, [[4]]]], true);
   * // => [1, 2, 3, [[4]]];
   */
  function flatten(array, shallow) {
    var result = [];
    if (!array) {
      return result;
    }
    var value,
        index = -1,
        length = array.length;

    while (++index < length) {
      value = array[index];
      if (isArray(value)) {
        push.apply(result, shallow ? value : flatten(value));
      } else {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Gets the index at which the first occurrence of `value` is found using
   * strict equality for comparisons, i.e. `===`. If the `array` is already
   * sorted, passing `true` for `isSorted` will run a faster binary search.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @param {Boolean|Number} [fromIndex=0] The index to start searching from or
   *  `true` to perform a binary search on a sorted `array`.
   * @returns {Number} Returns the index of the matched value or `-1`.
   * @example
   *
   * _.indexOf([1, 2, 3, 1, 2, 3], 2);
   * // => 1
   *
   * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
   * // => 4
   *
   * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
   * // => 2
   */
  function indexOf(array, value, fromIndex) {
    if (!array) {
      return -1;
    }
    var index = -1,
        length = array.length;

    if (fromIndex) {
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? Math.max(0, length + fromIndex) : fromIndex) - 1;
      } else {
        index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
    }
    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Gets all but the last value of `array`. Pass `n` to exclude the last `n`
   * values from the result.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Array} Returns all but the last value or `n` values of `array`.
   * @example
   *
   * _.initial([3, 2, 1]);
   * // => [3, 2]
   */
  function initial(array, n, guard) {
    if (!array) {
      return [];
    }
    return slice.call(array, 0, -((n == null || guard) ? 1 : n));
  }

  /**
   * Computes the intersection of all the passed-in arrays.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of unique values, in order, that are
   *  present in **all** of the arrays.
   * @example
   *
   * _.intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]);
   * // => [1, 2]
   */
  function intersection(array) {
    var result = [];
    if (!array) {
      return result;
    }
    var value,
        index = -1,
        length = array.length,
        others = slice.call(arguments, 1);

    while (++index < length) {
      value = array[index];
      if (indexOf(result, value) < 0 &&
          every(others, function(other) { return indexOf(other, value) > -1; })) {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Gets the last value of the `array`. Pass `n` to return the lasy `n` values
   * of the `array`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Mixed} Returns the last value or an array of the last `n` values
   *  of `array`.
   * @example
   *
   * _.last([3, 2, 1]);
   * // => 1
   */
  function last(array, n, guard) {
    if (array) {
      var length = array.length;
      return (n == null || guard) ? array[length - 1] : slice.call(array, -n || length);
    }
  }

  /**
   * Gets the index at which the last occurrence of `value` is found using
   * strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @param {Number} [fromIndex=array.length-1] The index to start searching from.
   * @returns {Number} Returns the index of the matched value or `-1`.
   * @example
   *
   * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
   * // => 4
   *
   * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
   * // => 1
   */
  function lastIndexOf(array, value, fromIndex) {
    if (!array) {
      return -1;
    }
    var index = array.length;
    if (fromIndex && typeof fromIndex == 'number') {
      index = (fromIndex < 0 ? Math.max(0, index + fromIndex) : Math.min(fromIndex, index - 1)) + 1;
    }
    while (index--) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Retrieves the maximum value of an `array`. If `callback` is passed,
   * it will be executed for each value in the `array` to generate the
   * criterion by which the value is ranked. The `callback` is bound to
   * `thisArg` and invoked with 3 arguments; (value, index, array).
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Function} [callback] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the maximum value.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * _.max(stooges, function(stooge) { return stooge.age; });
   * // => { 'name': 'curly', 'age': 60 };
   */
  function max(array, callback, thisArg) {
    var computed = -Infinity,
        result = computed;

    if (!array) {
      return result;
    }
    var current,
        index = -1,
        length = array.length;

    if (!callback) {
      while (++index < length) {
        if (array[index] > result) {
          result = array[index];
        }
      }
      return result;
    }
    if (thisArg) {
      callback = iteratorBind(callback, thisArg);
    }
    while (++index < length) {
      current = callback(array[index], index, array);
      if (current > computed) {
        computed = current;
        result = array[index];
      }
    }
    return result;
  }

  /**
   * Retrieves the minimum value of an `array`. If `callback` is passed,
   * it will be executed for each value in the `array` to generate the
   * criterion by which the value is ranked. The `callback` is bound to `thisArg`
   * and invoked with 3 arguments; (value, index, array).
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Function} [callback] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Mixed} Returns the minimum value.
   * @example
   *
   * _.min([10, 5, 100, 2, 1000]);
   * // => 2
   */
  function min(array, callback, thisArg) {
    var computed = Infinity,
        result = computed;

    if (!array) {
      return result;
    }
    var current,
        index = -1,
        length = array.length;

    if (!callback) {
      while (++index < length) {
        if (array[index] < result) {
          result = array[index];
        }
      }
      return result;
    }
    if (thisArg) {
      callback = iteratorBind(callback, thisArg);
    }
    while (++index < length) {
      current = callback(array[index], index, array);
      if (current < computed) {
        computed = current;
        result = array[index];
      }
    }
    return result;
  }

  /**
   * Creates an array of numbers (positive and/or negative) progressing from
   * `start` up to but not including `stop`. This method is a port of Python's
   * `range()` function. See http://docs.python.org/library/functions.html#range.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Number} [start=0] The start of the range.
   * @param {Number} end The end of the range.
   * @param {Number} [step=1] The value to increment or descrement by.
   * @returns {Array} Returns a new range array.
   * @example
   *
   * _.range(10);
   * // => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
   *
   * _.range(1, 11);
   * // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
   *
   * _.range(0, 30, 5);
   * // => [0, 5, 10, 15, 20, 25]
   *
   * _.range(0, -10, -1);
   * // => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
   *
   * _.range(0);
   * // => []
   */
  function range(start, end, step) {
    step || (step = 1);
    if (end == null) {
      end = start || 0;
      start = 0;
    }
    // use `Array(length)` so V8 will avoid the slower "dictionary" mode
    // http://www.youtube.com/watch?v=XAqIpGU8ZZk#t=16m27s
    var index = -1,
        length = Math.max(0, Math.ceil((end - start) / step)),
        result = Array(length);

    while (++index < length) {
      result[index] = start;
      start += step;
    }
    return result;
  }

  /**
   * The opposite of `_.initial`, this method gets all but the first value of
   * `array`. Pass `n` to exclude the first `n` values from the result.
   *
   * @static
   * @memberOf _
   * @alias tail
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Array} Returns all but the first value or `n` values of `array`.
   * @example
   *
   * _.rest([3, 2, 1]);
   * // => [2, 1]
   */
  function rest(array, n, guard) {
    if (!array) {
      return [];
    }
    return slice.call(array, (n == null || guard) ? 1 : n);
  }

  /**
   * Produces a new array of shuffled `array` values, using a version of the
   * Fisher-Yates shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to shuffle.
   * @returns {Array} Returns a new shuffled array.
   * @example
   *
   * _.shuffle([1, 2, 3, 4, 5, 6]);
   * // => [4, 1, 6, 3, 5, 2]
   */
  function shuffle(array) {
    if (!array) {
      return [];
    }
    var rand,
        index = -1,
        length = array.length,
        result = Array(length);

    while (++index < length) {
      rand = Math.floor(Math.random() * (index + 1));
      result[index] = result[rand];
      result[rand] = array[index];
    }
    return result;
  }

  /**
   * Uses a binary search to determine the smallest index at which the `value`
   * should be inserted into `array` in order to maintain the sort order of the
   * sorted `array`. If `callback` is passed, it will be executed for `value` and
   * each element in `array` to compute their sort ranking. The `callback` is
   * bound to `thisArg` and invoked with 1 argument; (value).
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Mixed} value The value to evaluate.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Number} Returns the index at which the value should be inserted
   *  into `array`.
   * @example
   *
   * _.sortedIndex([20, 30, 40], 35);
   * // => 2
   *
   * var dict = {
   *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'thirty-five': 35, 'fourty': 40 }
   * };
   *
   * _.sortedIndex(['twenty', 'thirty', 'fourty'], 'thirty-five', function(word) {
   *   return dict.wordToNumber[word];
   * });
   * // => 2
   *
   * _.sortedIndex(['twenty', 'thirty', 'fourty'], 'thirty-five', function(word) {
   *   return this.wordToNumber[word];
   * }, dict);
   * // => 2
   */
  function sortedIndex(array, value, callback, thisArg) {
    if (!array) {
      return 0;
    }
    var mid,
        low = 0,
        high = array.length;

    if (callback) {
      if (thisArg) {
        callback = bind(callback, thisArg);
      }
      value = callback(value);
      while (low < high) {
        mid = (low + high) >>> 1;
        callback(array[mid]) < value ? low = mid + 1 : high = mid;
      }
    } else {
      while (low < high) {
        mid = (low + high) >>> 1;
        array[mid] < value ? low = mid + 1 : high = mid;
      }
    }
    return low;
  }

  /**
   * Computes the union of the passed-in arrays.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of unique values, in order, that are
   *  present in one or more of the arrays.
   * @example
   *
   * _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
   * // => [1, 2, 3, 101, 10]
   */
  function union() {
    var index = -1,
        result = [],
        flattened = concat.apply(result, arguments),
        length = flattened.length;

    while (++index < length) {
      if (indexOf(result, flattened[index]) < 0) {
        result.push(flattened[index]);
      }
    }
    return result;
  }

  /**
   * Produces a duplicate-value-free version of the `array` using strict equality
   * for comparisons, i.e. `===`. If the `array` is already sorted, passing `true`
   * for `isSorted` will run a faster algorithm. If `callback` is passed,
   * each value of `array` is passed through a transformation `callback` before
   * uniqueness is computed. The `callback` is bound to `thisArg` and invoked
   * with 3 arguments; (value, index, array).
   *
   * @static
   * @memberOf _
   * @alias unique
   * @category Arrays
   * @param {Array} array The array to process.
   * @param {Boolean} [isSorted=false] A flag to indicate that the `array` is already sorted.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Array} Returns a duplicate-value-free array.
   * @example
   *
   * _.uniq([1, 2, 1, 3, 1]);
   * // => [1, 2, 3]
   *
   * _.uniq([1, 1, 2, 2, 3], true);
   * // => [1, 2, 3]
   *
   * _.uniq([1, 2, 1.5, 3, 2.5], function(num) { return Math.floor(num); });
   * // => [1, 2, 3]
   *
   * _.uniq([1, 2, 1.5, 3, 2.5], function(num) { return this.floor(num); }, Math);
   * // => [1, 2, 3]
   */
  function uniq(array, isSorted, callback, thisArg) {
    var result = [];
    if (!array) {
      return result;
    }
    var computed,
        index = -1,
        length = array.length,
        seen = [];

    // juggle arguments
    if (typeof isSorted == 'function') {
      thisArg = callback;
      callback = isSorted;
      isSorted = false;
    }
    if (!callback) {
      callback = identity;
    } else if (thisArg) {
      callback = iteratorBind(callback, thisArg);
    }
    while (++index < length) {
      computed = callback(array[index], index, array);
      if (isSorted
            ? !index || seen[seen.length - 1] !== computed
            : indexOf(seen, computed) < 0
          ) {
        seen.push(computed);
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Produces a new array with all occurrences of the passed values removed using
   * strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to filter.
   * @param {Mixed} [value1, value2, ...] Values to remove.
   * @returns {Array} Returns a new filtered array.
   * @example
   *
   * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
   * // => [2, 3, 4]
   */
  function without(array) {
    var result = [];
    if (!array) {
      return result;
    }
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (indexOf(arguments, array[index], 1) < 0) {
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Merges the elements of each array at their corresponding indexes. Useful for
   * separate data sources that are coordinated through matching array indexes.
   * For a matrix of nested arrays, `_.zip.apply(...)` can transpose the matrix
   * in a similar fashion.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of merged arrays.
   * @example
   *
   * _.zip(['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]);
   * // => [['moe', 30, true], ['larry', 40, false], ['curly', 50, false]]
   */
  function zip(array) {
    if (!array) {
      return [];
    }
    var index = -1,
        length = max(pluck(arguments, 'length')),
        result = Array(length);

    while (++index < length) {
      result[index] = pluck(arguments, index);
    }
    return result;
  }

  /**
   * Merges an array of `keys` and an array of `values` into a single object.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} keys The array of keys.
   * @param {Array} [values=[]] The array of values.
   * @returns {Object} Returns an object composed of the given keys and
   *  corresponding values.
   * @example
   *
   * _.zipObject(['moe', 'larry', 'curly'], [30, 40, 50]);
   * // => { 'moe': 30, 'larry': 40, 'curly': 50 }
   */
  function zipObject(keys, values) {
    if (!keys) {
      return {};
    }
    var index = -1,
        length = keys.length,
        result = {};

    values || (values = []);
    while (++index < length) {
      result[keys[index]] = values[index];
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a new function that is restricted to executing only after it is
   * called `n` times.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Number} n The number of times the function must be called before
   * it is executed.
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * var renderNotes = _.after(notes.length, render);
   * _.forEach(notes, function(note) {
   *   note.asyncSave({ 'success': renderNotes });
   * });
   * // `renderNotes` is run once, after all notes have saved
   */
  function after(n, func) {
    if (n < 1) {
      return func();
    }
    return function() {
      if (--n < 1) {
        return func.apply(this, arguments);
      }
    };
  }

  /**
   * Creates a new function that, when called, invokes `func` with the `this`
   * binding of `thisArg` and prepends any additional `bind` arguments to those
   * passed to the bound function. Lazy defined methods may be bound by passing
   * the object they are bound to as `func` and the method name as `thisArg`.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function|Object} func The function to bind or the object the method belongs to.
   * @param {Mixed} [thisArg] The `this` binding of `func` or the method name.
   * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
   * @returns {Function} Returns the new bound function.
   * @example
   *
   * // basic bind
   * var func = function(greeting) {
   *   return greeting + ' ' + this.name;
   * };
   *
   * func = _.bind(func, { 'name': 'moe' }, 'hi');
   * func();
   * // => 'hi moe'
   *
   * // lazy bind
   * var object = {
   *   'name': 'moe',
   *   'greet': function(greeting) {
   *     return greeting + ' ' + this.name;
   *   }
   * };
   *
   * var func = _.bind(object, 'greet', 'hi');
   * func();
   * // => 'hi moe'
   *
   * object.greet = function(greeting) {
   *   return greeting + ', ' + this.name + '!';
   * };
   *
   * func();
   * // => 'hi, moe!'
   */
  function bind(func, thisArg) {
    var methodName,
        isFunc = toString.call(func) == funcClass;

    // juggle arguments
    if (!isFunc) {
      methodName = thisArg;
      thisArg = func;
    }
    // use `Function#bind` if it exists and is fast
    // (in V8 `Function#bind` is slower except when partially applied)
    else if (isBindFast || (nativeBind && arguments.length > 2)) {
      return nativeBind.call.apply(nativeBind, arguments);
    }

    var partialArgs = slice.call(arguments, 2);

    function bound() {
      // `Function#bind` spec
      // http://es5.github.com/#x15.3.4.5
      var args = arguments,
          thisBinding = thisArg;

      if (!isFunc) {
        func = thisArg[methodName];
      }
      if (partialArgs.length) {
        args = args.length
          ? concat.apply(partialArgs, args)
          : partialArgs;
      }
      if (this instanceof bound) {
        // get `func` instance if `bound` is invoked in a `new` expression
        noop.prototype = func.prototype;
        thisBinding = new noop;

        // mimic the constructor's `return` behavior
        // http://es5.github.com/#x13.2.2
        var result = func.apply(thisBinding, args);
        return result && objectTypes[typeof result]
          ? result
          : thisBinding
      }
      return func.apply(thisBinding, args);
    }
    return bound;
  }

  /**
   * Binds methods on `object` to `object`, overwriting the existing method.
   * If no method names are provided, all the function properties of `object`
   * will be bound.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Object} object The object to bind and assign the bound methods to.
   * @param {String} [methodName1, methodName2, ...] Method names on the object to bind.
   * @returns {Object} Returns the `object`.
   * @example
   *
   * var buttonView = {
   *  'label': 'lodash',
   *  'onClick': function() { alert('clicked: ' + this.label); }
   * };
   *
   * _.bindAll(buttonView);
   * jQuery('#lodash_button').on('click', buttonView.onClick);
   * // => When the button is clicked, `this.label` will have the correct value
   */
  function bindAll(object) {
    var funcs = arguments,
        index = 1;

    if (funcs.length == 1) {
      index = 0;
      funcs = functions(object);
    }
    for (var length = funcs.length; index < length; index++) {
      object[funcs[index]] = bind(object[funcs[index]], object);
    }
    return object;
  }

  /**
   * Creates a new function that is the composition of the passed functions,
   * where each function consumes the return value of the function that follows.
   * In math terms, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} [func1, func2, ...] Functions to compose.
   * @returns {Function} Returns the new composed function.
   * @example
   *
   * var greet = function(name) { return 'hi: ' + name; };
   * var exclaim = function(statement) { return statement + '!'; };
   * var welcome = _.compose(exclaim, greet);
   * welcome('moe');
   * // => 'hi: moe!'
   */
  function compose() {
    var funcs = arguments;
    return function() {
      var args = arguments,
          length = funcs.length;

      while (length--) {
        args = [funcs[length].apply(this, args)];
      }
      return args[0];
    };
  }

  /**
   * Creates a new function that will delay the execution of `func` until after
   * `wait` milliseconds have elapsed since the last time it was invoked. Pass
   * `true` for `immediate` to cause debounce to invoke `func` on the leading,
   * instead of the trailing, edge of the `wait` timeout. Subsequent calls to
   * the debounced function will return the result of the last `func` call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to debounce.
   * @param {Number} wait The number of milliseconds to delay.
   * @param {Boolean} immediate A flag to indicate execution is on the leading
   *  edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * var lazyLayout = _.debounce(calculateLayout, 300);
   * jQuery(window).on('resize', lazyLayout);
   */
  function debounce(func, wait, immediate) {
    var args,
        result,
        thisArg,
        timeoutId;

    function delayed() {
      timeoutId = null;
      if (!immediate) {
        func.apply(thisArg, args);
      }
    }

    return function() {
      var isImmediate = immediate && !timeoutId;
      args = arguments;
      thisArg = this;

      clearTimeout(timeoutId);
      timeoutId = setTimeout(delayed, wait);

      if (isImmediate) {
        result = func.apply(thisArg, args);
      }
      return result;
    };
  }

  /**
   * Executes the `func` function after `wait` milliseconds. Additional arguments
   * are passed to `func` when it is invoked.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to delay.
   * @param {Number} wait The number of milliseconds to delay execution.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
   * @returns {Number} Returns the `setTimeout` timeout id.
   * @example
   *
   * var log = _.bind(console.log, console);
   * _.delay(log, 1000, 'logged later');
   * // => 'logged later' (Appears after one second.)
   */
  function delay(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function() { return func.apply(undefined, args); }, wait);
  }

  /**
   * Defers executing the `func` function until the current call stack has cleared.
   * Additional arguments are passed to `func` when it is invoked.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to defer.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
   * @returns {Number} Returns the `setTimeout` timeout id.
   * @example
   *
   * _.defer(function() { alert('deferred'); });
   * // returns from the function before `alert` is called
   */
  function defer(func) {
    var args = slice.call(arguments, 1);
    return setTimeout(function() { return func.apply(undefined, args); }, 1);
  }

  /**
   * Creates a new function that memoizes the result of `func`. If `resolver` is
   * passed, it will be used to determine the cache key for storing the result
   * based on the arguments passed to the memoized function. By default, the first
   * argument passed to the memoized function is used as the cache key.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to have its output memoized.
   * @param {Function} [resolver] A function used to resolve the cache key.
   * @returns {Function} Returns the new memoizing function.
   * @example
   *
   * var fibonacci = _.memoize(function(n) {
   *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
   * });
   */
  function memoize(func, resolver) {
    var cache = {};
    return function() {
      var prop = resolver ? resolver.apply(this, arguments) : arguments[0];
      return hasOwnProperty.call(cache, prop)
        ? cache[prop]
        : (cache[prop] = func.apply(this, arguments));
    };
  }

  /**
   * Creates a new function that is restricted to one execution. Repeat calls to
   * the function will return the value of the first call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * var initialize = _.once(createApplication);
   * initialize();
   * initialize();
   * // Application is only created once.
   */
  function once(func) {
    var result,
        ran = false;

    return function() {
      if (ran) {
        return result;
      }
      ran = true;
      result = func.apply(this, arguments);
      return result;
    };
  }

  /**
   * Creates a new function that, when called, invokes `func` with any additional
   * `partial` arguments prepended to those passed to the partially applied
   * function. This method is similar `bind`, except it does **not** alter the
   * `this` binding.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to partially apply arguments to.
   * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
   * @returns {Function} Returns the new partially applied function.
   * @example
   *
   * var greet = function(greeting, name) { return greeting + ': ' + name; };
   * var hi = _.partial(greet, 'hi');
   * hi('moe');
   * // => 'hi: moe'
   */
  function partial(func) {
    var args = slice.call(arguments, 1),
        argsLength = args.length;

    return function() {
      var result,
          others = arguments;

      if (others.length) {
        args.length = argsLength;
        push.apply(args, others);
      }
      result = args.length == 1 ? func.call(this, args[0]) : func.apply(this, args);
      args.length = argsLength;
      return result;
    };
  }

  /**
   * Creates a new function that, when executed, will only call the `func`
   * function at most once per every `wait` milliseconds. If the throttled
   * function is invoked more than once during the `wait` timeout, `func` will
   * also be called on the trailing edge of the timeout. Subsequent calls to the
   * throttled function will return the result of the last `func` call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to throttle.
   * @param {Number} wait The number of milliseconds to throttle executions to.
   * @returns {Function} Returns the new throttled function.
   * @example
   *
   * var throttled = _.throttle(updatePosition, 100);
   * jQuery(window).on('scroll', throttled);
   */
  function throttle(func, wait) {
    var args,
        result,
        thisArg,
        timeoutId,
        lastCalled = 0;

    function trailingCall() {
      lastCalled = new Date;
      timeoutId = null;
      func.apply(thisArg, args);
    }

    return function() {
      var now = new Date,
          remain = wait - (now - lastCalled);

      args = arguments;
      thisArg = this;

      if (remain <= 0) {
        lastCalled = now;
        result = func.apply(thisArg, args);
      }
      else if (!timeoutId) {
        timeoutId = setTimeout(trailingCall, remain);
      }
      return result;
    };
  }

  /**
   * Create a new function that passes the `func` function to the `wrapper`
   * function as its first argument. Additional arguments are appended to those
   * passed to the `wrapper` function.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to wrap.
   * @param {Function} wrapper The wrapper function.
   * @param {Mixed} [arg1, arg2, ...] Arguments to append to those passed to the wrapper.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var hello = function(name) { return 'hello: ' + name; };
   * hello = _.wrap(hello, function(func) {
   *   return 'before, ' + func('moe') + ', after';
   * });
   * hello();
   * // => 'before, hello: moe, after'
   */
  function wrap(func, wrapper) {
    return function() {
      var args = [func];
      if (arguments.length) {
        push.apply(args, arguments);
      }
      return wrapper.apply(this, args);
    };
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Create a shallow clone of the `value`. Any nested objects or arrays will be
   * assigned by reference and not cloned.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to clone.
   * @returns {Mixed} Returns the cloned `value`.
   * @example
   *
   * _.clone({ 'name': 'moe' });
   * // => { 'name': 'moe' };
   */
  function clone(value) {
    return value && objectTypes[typeof value]
      ? (isArray(value) ? value.slice() : extend({}, value))
      : value;
  }

  /**
   * Assigns missing properties on `object` with default values from the defaults
   * objects. Once a property is set, additional defaults of the same property
   * will be ignored.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to populate.
   * @param {Object} [defaults1, defaults2, ...] The defaults objects to apply to `object`.
   * @returns {Object} Returns `object`.
   * @example
   *
   * var iceCream = { 'flavor': 'chocolate' };
   * _.defaults(iceCream, { 'flavor': 'vanilla', 'sprinkles': 'rainbow' });
   * // => { 'flavor': 'chocolate', 'sprinkles': 'rainbow' }
   */
  var defaults = createIterator(extendIteratorOptions, {
    'inLoop': 'if (result[index] == null) ' + extendIteratorOptions.inLoop
  });

  /**
   * Copies enumerable properties from the source objects to the `destination` object.
   * Subsequent sources will overwrite propery assignments of previous sources.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The destination object.
   * @param {Object} [source1, source2, ...] The source objects.
   * @returns {Object} Returns the destination object.
   * @example
   *
   * _.extend({ 'name': 'moe' }, { 'age': 40 });
   * // => { 'name': 'moe', 'age': 40 }
   */
  var extend = createIterator(extendIteratorOptions);

  /**
   * Iterates over `object`'s own and inherited enumerable properties, executing
   * the `callback` for each property. The `callback` is bound to `thisArg` and
   * invoked with 3 arguments; (value, key, object).
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Object} Returns the `object`.
   * @example
   *
   * function Dog(name) {
   *   this.name = name;
   * }
   *
   * Dog.prototype.bark = function() {
   *   alert('Woof, woof!');
   * };
   *
   * _.forIn(new Dog('Dagny'), function(value, key) {
   *   alert(key);
   * });
   * // => alerts 'name' and 'bark' (order is not guaranteed)
   */
  var forIn = createIterator(baseIteratorOptions, forEachIteratorOptions, forOwnIteratorOptions, {
    'useHas': false
  });

  /**
   * Iterates over `object`'s own enumerable properties, executing the `callback`
   * for each property. The `callback` is bound to `thisArg` and invoked with 3
   * arguments; (value, key, object).
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @returns {Object} Returns the `object`.
   * @example
   *
   * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
   *   alert(key);
   * });
   * // => alerts '0', '1', and 'length' (order is not guaranteed)
   */
  var forOwn = createIterator(baseIteratorOptions, forEachIteratorOptions, forOwnIteratorOptions);

  /**
   * Produces a sorted array of the enumerable properties, own and inherited,
   * of `object` that have function values.
   *
   * @static
   * @memberOf _
   * @alias methods
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names that have function values.
   * @example
   *
   * _.functions(_);
   * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
   */
  var functions = createIterator({
    'args': 'object',
    'init': '[]',
    'useHas': false,
    'inLoop': 'if (toString.call(iteratee[index]) == funcClass) result.push(index)',
    'bottom': 'result.sort()'
  });

  /**
   * Checks if the specified object `property` exists and is a direct property,
   * instead of an inherited property.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to check.
   * @param {String} property The property to check for.
   * @returns {Boolean} Returns `true` if key is a direct property, else `false`.
   * @example
   *
   * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
   * // => true
   */
  function has(object, property) {
    return hasOwnProperty.call(object, property);
  }

  /**
   * Checks if `value` is an `arguments` object.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an `arguments` object, else `false`.
   * @example
   *
   * (function() { return _.isArguments(arguments); })(1, 2, 3);
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  var isArguments = function(value) {
    return toString.call(value) == '[object Arguments]';
  };
  // fallback for browser like IE < 9 which detect `arguments` as `[object Object]`
  if (!isArguments(arguments)) {
    isArguments = function(value) {
      return !!(value && hasOwnProperty.call(value, 'callee'));
    };
  }

  /**
   * Checks if `value` is an array.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an array, else `false`.
   * @example
   *
   * (function() { return _.isArray(arguments); })();
   * // => false
   *
   * _.isArray([1, 2, 3]);
   * // => true
   */
  var isArray = nativeIsArray || function(value) {
    return toString.call(value) == arrayClass;
  };

  /**
   * Checks if `value` is a boolean (`true` or `false`) value.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a boolean value, else `false`.
   * @example
   *
   * _.isBoolean(null);
   * // => false
   */
  function isBoolean(value) {
    return value === true || value === false || toString.call(value) == boolClass;
  }

  /**
   * Checks if `value` is a date.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a date, else `false`.
   * @example
   *
   * _.isDate(new Date);
   * // => true
   */
  function isDate(value) {
    return toString.call(value) == dateClass;
  }

  /**
   * Checks if `value` is a DOM element.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a DOM element, else `false`.
   * @example
   *
   * _.isElement(document.body);
   * // => true
   */
  function isElement(value) {
    return !!(value && value.nodeType == 1);
  }

  /**
   * Checks if `value` is empty. Arrays or strings with a length of `0` and
   * objects with no own enumerable properties are considered "empty".
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Array|Object|String} value The value to inspect.
   * @returns {Boolean} Returns `true` if the `value` is empty, else `false`.
   * @example
   *
   * _.isEmpty([1, 2, 3]);
   * // => false
   *
   * _.isEmpty({});
   * // => true
   *
   * _.isEmpty('');
   * // => true
   */
  var isEmpty = createIterator({
    'args': 'value',
    'init': 'true',
    'top':
      'var className = toString.call(value);\n' +
      'if (className == arrayClass || className == stringClass) return !value.length',
    'inLoop': {
      'object': 'return false'
    }
  });

  /**
   * Performs a deep comparison between two values to determine if they are
   * equivalent to each other.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} a The value to compare.
   * @param {Mixed} b The other value to compare.
   * @param {Array} [stack] Internally used to keep track of "seen" objects to
   *  avoid circular references.
   * @returns {Boolean} Returns `true` if the values are equvalent, else `false`.
   * @example
   *
   * var moe = { 'name': 'moe', 'luckyNumbers': [13, 27, 34] };
   * var clone = { 'name': 'moe', 'luckyNumbers': [13, 27, 34] };
   *
   * moe == clone;
   * // => false
   *
   * _.isEqual(moe, clone);
   * // => true
   */
  function isEqual(a, b, stack) {
    stack || (stack = []);

    // exit early for identical values
    if (a === b) {
      // treat `+0` vs. `-0` as not equal
      return a !== 0 || (1 / a == 1 / b);
    }
    // a strict comparison is necessary because `undefined == null`
    if (a == null || b == null) {
      return a === b;
    }
    // unwrap any wrapped objects
    if (a._chain) {
      a = a._wrapped;
    }
    if (b._chain) {
      b = b._wrapped;
    }
    // invoke a custom `isEqual` method if one is provided
    if (a.isEqual && toString.call(a.isEqual) == funcClass) {
      return a.isEqual(b);
    }
    if (b.isEqual && toString.call(b.isEqual) == funcClass) {
      return b.isEqual(a);
    }
    // compare [[Class]] names
    var className = toString.call(a);
    if (className != toString.call(b)) {
      return false;
    }
    switch (className) {
      // strings, numbers, dates, and booleans are compared by value
      case stringClass:
        // primitives and their corresponding object instances are equivalent;
        // thus, `'5'` is quivalent to `new String('5')`
        return a == String(b);

      case numberClass:
        // treat `NaN` vs. `NaN` as equal
        return a != +a
          ? b != +b
          // but treat `+0` vs. `-0` as not equal
          : (a == 0 ? (1 / a == 1 / b) : a == +b);

      case boolClass:
      case dateClass:
        // coerce dates and booleans to numeric values, dates to milliseconds and booleans to 1 or 0;
        // treat invalid dates coerced to `NaN` as not equal
        return +a == +b;

      // regexps are compared by their source and flags
      case regexpClass:
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') {
      return false;
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = stack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (stack[length] == a) {
        return true;
      }
    }

    var index = -1,
        result = true,
        size = 0;

    // add the first collection to the stack of traversed objects
    stack.push(a);

    // recursively compare objects and arrays
    if (className == arrayClass) {
      // compare array lengths to determine if a deep comparison is necessary
      size = a.length;
      result = size == b.length;

      if (result) {
        // deep compare the contents, ignoring non-numeric properties
        while (size--) {
          if (!(result = isEqual(a[size], b[size], stack))) {
            break;
          }
        }
      }
    } else {
      // objects with different constructors are not equivalent
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) {
        return false;
      }
      // deep compare objects.
      for (var prop in a) {
        if (hasOwnProperty.call(a, prop)) {
          // count the number of properties.
          size++;
          // deep compare each property value.
          if (!(result = hasOwnProperty.call(b, prop) && isEqual(a[prop], b[prop], stack))) {
            break;
          }
        }
      }
      // ensure both objects have the same number of properties
      if (result) {
        for (prop in b) {
          // Adobe's JS engine, embedded in applications like InDesign, has a
          // bug that causes `!size--` to throw an error so it must be wrapped
          // in parentheses.
          // https://github.com/documentcloud/underscore/issues/355
          if (hasOwnProperty.call(b, prop) && !(size--)) {
            break;
          }
        }
        result = !size;
      }
      // handle JScript [[DontEnum]] bug
      if (result && hasDontEnumBug) {
        while (++index < 7) {
          prop = shadowed[index];
          if (hasOwnProperty.call(a, prop)) {
            if (!(result = hasOwnProperty.call(b, prop) && isEqual(a[prop], b[prop], stack))) {
              break;
            }
          }
        }
      }
    }
    // remove the first collection from the stack of traversed objects
    stack.pop();
    return result;
  }

  /**
   * Checks if `value` is a finite number.
   * Note: This is not the same as native `isFinite`, which will return true for
   * booleans and other values. See http://es5.github.com/#x15.1.2.5.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a finite number, else `false`.
   * @example
   *
   * _.isFinite(-101);
   * // => true
   *
   * _.isFinite('10');
   * // => false
   *
   * _.isFinite(Infinity);
   * // => false
   */
  function isFinite(value) {
    return nativeIsFinite(value) && toString.call(value) == numberClass;
  }

  /**
   * Checks if `value` is a function.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(''.concat);
   * // => true
   */
  function isFunction(value) {
    return toString.call(value) == funcClass;
  }

  /**
   * Checks if `value` is the language type of Object.
   * (e.g. arrays, functions, objects, regexps, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // check if the value is the ECMAScript language type of Object
    // http://es5.github.com/#x8
    return value && objectTypes[typeof value];
  }

  /**
   * Checks if `value` is `NaN`.
   * Note: This is not the same as native `isNaN`, which will return true for
   * `undefined` and other values. See http://es5.github.com/#x15.1.2.4.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `NaN`, else `false`.
   * @example
   *
   * _.isNaN(NaN);
   * // => true
   *
   * _.isNaN(new Number(NaN));
   * // => true
   *
   * isNaN(undefined);
   * // => true
   *
   * _.isNaN(undefined);
   * // => false
   */
  function isNaN(value) {
    // `NaN` as a primitive is the only value that is not equal to itself
    // (perform the [[Class]] check first to avoid errors with some host objects in IE)
    return toString.call(value) == numberClass && value != +value
  }

  /**
   * Checks if `value` is `null`.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `null`, else `false`.
   * @example
   *
   * _.isNull(null);
   * // => true
   *
   * _.isNull(undefined);
   * // => false
   */
  function isNull(value) {
    return value === null;
  }

  /**
   * Checks if `value` is a number.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a number, else `false`.
   * @example
   *
   * _.isNumber(8.4 * 5;
   * // => true
   */
  function isNumber(value) {
    return toString.call(value) == numberClass;
  }

  /**
   * Checks if `value` is a regular expression.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a regular expression, else `false`.
   * @example
   *
   * _.isRegExp(/moe/);
   * // => true
   */
  function isRegExp(value) {
    return toString.call(value) == regexpClass;
  }

  /**
   * Checks if `value` is a string.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a string, else `false`.
   * @example
   *
   * _.isString('moe');
   * // => true
   */
  function isString(value) {
    return toString.call(value) == stringClass;
  }

  /**
   * Checks if `value` is `undefined`.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `undefined`, else `false`.
   * @example
   *
   * _.isUndefined(void 0);
   * // => true
   */
  function isUndefined(value) {
    return value === undefined;
  }

  /**
   * Produces an array of object`'s own enumerable property names.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names.
   * @example
   *
   * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
   * // => ['one', 'two', 'three'] (order is not guaranteed)
   */
  var keys = !nativeKeys ? shimKeys : function(object) {
    // avoid iterating over the `prototype` property
    return typeof object == 'function' && propertyIsEnumerable.call(object, 'prototype')
      ? shimKeys(object)
      : nativeKeys(object);
  };

  /**
   * Creates an object composed of the specified properties. Property names may
   * be specified as individual arguments or as arrays of property names.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to pluck.
   * @param {Object} [prop1, prop2, ...] The properties to pick.
   * @returns {Object} Returns an object composed of the picked properties.
   * @example
   *
   * _.pick({ 'name': 'moe', 'age': 40, 'userid': 'moe1' }, 'name', 'age');
   * // => { 'name': 'moe', 'age': 40 }
   */
  function pick(object) {
    var prop,
        index = 0,
        props = concat.apply(ArrayProto, arguments),
        length = props.length,
        result = {};

    // start `index` at `1` to skip `object`
    while (++index < length) {
      prop = props[index];
      if (prop in object) {
        result[prop] = object[prop];
      }
    }
    return result;
  }

  /**
   * Gets the size of `value` by returning `value.length` if `value` is a string
   * or array, or the number of own enumerable properties if `value` is an object.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Array|Object|String} value The value to inspect.
   * @returns {Number} Returns `value.length` if `value` is a string or array,
   *  or the number of own enumerable properties if `value` is an object.
   * @example
   *
   * _.size([1, 2]);
   * // => 2
   *
   * _.size({ 'one': 1, 'two': 2, 'three': 3 });
   * // => 3
   *
   * _.size('curly');
   * // => 5
   */
  function size(value) {
    if (!value) {
      return 0;
    }
    var length = value.length;
    return length === length >>> 0 ? value.length : keys(value).length;
  }

  /**
   * Produces an array of `object`'s own enumerable property values.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property values.
   * @example
   *
   * _.values({ 'one': 1, 'two': 2, 'three': 3 });
   * // => [1, 2, 3]
   */
  var values = createIterator({
    'args': 'object',
    'init': '[]',
    'inLoop': 'result.push(iteratee[index])'
  });

  /*--------------------------------------------------------------------------*/

  /**
   * Escapes a string for inclusion in HTML, replacing `&`, `<`, `"`, and `'`
   * characters.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} string The string to escape.
   * @returns {String} Returns the escaped string.
   * @example
   *
   * _.escape('Curly, Larry & Moe');
   * // => "Curly, Larry &amp; Moe"
   */
  function escape(string) {
    return string == null ? '' : (string + '').replace(reUnescapedHtml, escapeHtmlChar);
  }

  /**
   * This function returns the first argument passed to it.
   * Note: It is used throughout Lo-Dash as a default callback.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Mixed} value Any value.
   * @returns {Mixed} Returns `value`.
   * @example
   *
   * var moe = { 'name': 'moe' };
   * moe === _.identity(moe);
   * // => true
   */
  function identity(value) {
    return value;
  }

  /**
   * Adds functions properties of `object` to the `lodash` function and chainable
   * wrapper.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} object The object of function properties to add to `lodash`.
   * @example
   *
   * _.mixin({
   *   'capitalize': function(string) {
   *     return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
   *   }
   * });
   *
   * _.capitalize('curly');
   * // => 'Curly'
   *
   * _('larry').capitalize();
   * // => 'Larry'
   */
  function mixin(object) {
    forEach(functions(object), function(methodName) {
      var func = lodash[methodName] = object[methodName];

      LoDash.prototype[methodName] = function() {
        var args = [this._wrapped];
        if (arguments.length) {
          push.apply(args, arguments);
        }
        var result = func.apply(lodash, args);
        if (this._chain) {
          result = new LoDash(result);
          result._chain = true;
        }
        return result;
      };
    });
  }

  /**
   * Reverts the '_' variable to its previous value and returns a reference to
   * the `lodash` function.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @returns {Function} Returns the `lodash` function.
   * @example
   *
   * var lodash = _.noConflict();
   */
  function noConflict() {
    window._ = oldDash;
    return this;
  }

  /**
   * Resolves the value of `property` on `object`. If `property` is a function
   * it will be invoked and its result returned, else the property value is
   * returned. If `object` is falsey, then `null` is returned.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} object The object to inspect.
   * @param {String} property The property to get the result of.
   * @returns {Mixed} Returns the resolved value.
   * @example
   *
   * var object = {
   *   'cheese': 'crumpets',
   *   'stuff': function() {
   *     return 'nonsense';
   *   }
   * };
   *
   * _.result(object, 'cheese');
   * // => 'crumpets'
   *
   * _.result(object, 'stuff');
   * // => 'nonsense'
   */
  function result(object, property) {
    // based on Backbone's private `getValue` function
    // https://github.com/documentcloud/backbone/blob/0.9.2/backbone.js#L1419-1424
    if (!object) {
      return null;
    }
    var value = object[property];
    return toString.call(value) == funcClass ? object[property]() : value;
  }

  /**
   * A micro-templating method that handles arbitrary delimiters, preserves
   * whitespace, and correctly escapes quotes within interpolated code.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} text The template text.
   * @param {Obect} data The data object used to populate the text.
   * @param {Object} options The options object.
   * @returns {Function|String} Returns a compiled function when no `data` object
   *  is given, else it returns the interpolated text.
   * @example
   *
   * // using compiled template
   * var compiled = _.template('hello: <%= name %>');
   * compiled({ 'name': 'moe' });
   * // => 'hello: moe'
   *
   * var list = '<% _.forEach(people, function(name) { %> <li><%= name %></li> <% }); %>';
   * _.template(list, { 'people': ['moe', 'curly', 'larry'] });
   * // => '<li>moe</li><li>curly</li><li>larry</li>'
   *
   * var template = _.template('<b><%- value %></b>');
   * template({ 'value': '<script>' });
   * // => '<b>&lt;script></b>'
   *
   * // using `print`
   * var compiled = _.template('<% print("Hello " + epithet); %>');
   * compiled({ 'epithet': 'stooge' });
   * // => 'Hello stooge.'
   *
   * // using custom template settings
   * _.templateSettings = {
   *   'interpolate': /\{\{(.+?)\}\}/g
   * };
   *
   * var template = _.template('Hello {{ name }}!');
   * template({ 'name': 'Mustache' });
   * // => 'Hello Mustache!'
   *
   * // using the `variable` option
   * _.template('<%= data.hasWith %>', { 'hasWith': 'no' }, { 'variable': 'data' });
   * // => 'no'
   *
   * // using the `source` property
   * <script>
   *   JST.project = <%= _.template(jstText).source %>;
   * </script>
   */
  function template(text, data, options) {
    // based on John Resig's `tmpl` implementation
    // http://ejohn.org/blog/javascript-micro-templating/
    // and Laura Doktorova's doT.js
    // https://github.com/olado/doT
    options || (options = {});

    var isEvaluating,
        result,
        escapeDelimiter = options.escape,
        evaluateDelimiter = options.evaluate,
        interpolateDelimiter = options.interpolate,
        settings = lodash.templateSettings,
        variable = options.variable;

    // use default settings if no options object is provided
    if (escapeDelimiter == null) {
      escapeDelimiter = settings.escape;
    }
    if (evaluateDelimiter == null) {
      evaluateDelimiter = settings.evaluate;
    }
    if (interpolateDelimiter == null) {
      interpolateDelimiter = settings.interpolate;
    }

    // tokenize delimiters to avoid escaping them
    if (escapeDelimiter) {
      text = text.replace(escapeDelimiter, tokenizeEscape);
    }
    if (interpolateDelimiter) {
      text = text.replace(interpolateDelimiter, tokenizeInterpolate);
    }
    if (evaluateDelimiter != lastEvaluateDelimiter) {
      // generate `reEvaluateDelimiter` to match `_.templateSettings.evaluate`
      // and internal `<e%- %>`, `<e%= %>` delimiters
      lastEvaluateDelimiter = evaluateDelimiter;
      reEvaluateDelimiter = RegExp(
        (evaluateDelimiter ? evaluateDelimiter.source : '($^)') +
        '|<e%-([\\s\\S]+?)%>|<e%=([\\s\\S]+?)%>'
      , 'g');
    }
    isEvaluating = tokenized.length;
    text = text.replace(reEvaluateDelimiter, tokenizeEvaluate);
    isEvaluating = isEvaluating != tokenized.length;

    // escape characters that cannot be included in string literals and
    // detokenize delimiter code snippets
    text = "__p += '" + text
      .replace(reUnescapedString, escapeStringChar)
      .replace(reToken, detokenize) + "';\n";

    // clear stored code snippets
    tokenized.length = 0;

    // if `options.variable` is not specified and the template contains "evaluate"
    // delimiters, wrap a with-statement around the generated code to add the
    // data object to the top of the scope chain
    if (!variable) {
      variable = settings.variable || lastVariable || 'obj';

      if (isEvaluating) {
        text = 'with (' + variable + ') {\n' + text + '\n}\n';
      }
      else {
        if (variable != lastVariable) {
          // generate `reDoubleVariable` to match references like `obj.obj` inside
          // transformed "escape" and "interpolate" delimiters
          lastVariable = variable;
          reDoubleVariable = RegExp('(\\(\\s*)' + variable + '\\.' + variable + '\\b', 'g');
        }
        // avoid a with-statement by prepending data object references to property names
        text = text
          .replace(reInsertVariable, '$&' + variable + '.')
          .replace(reDoubleVariable, '$1__d');
      }
    }

    // cleanup code by stripping empty strings
    text = ( isEvaluating ? text.replace(reEmptyStringLeading, '') : text)
      .replace(reEmptyStringMiddle, '$1')
      .replace(reEmptyStringTrailing, '$1;');

    // frame code as the function body
    text = 'function(' + variable + ') {\n' +
      variable + ' || (' + variable + ' = {});\n' +
      'var __t, __p = \'\', __e = _.escape' +
      (isEvaluating
        ? ', __j = Array.prototype.join;\n' +
          'function print() { __p += __j.call(arguments, \'\') }\n'
        : ', __d = ' + variable + '.' + variable + ' || ' + variable + ';\n'
      ) +
      text +
      'return __p\n}';

    // add a sourceURL for easier debugging
    // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
    if (useSourceURL) {
      text += '\n//@ sourceURL=/lodash/template/source[' + (templateCounter++) + ']';
    }

    try {
      result = Function('_', 'return ' + text)(lodash);
    } catch(e) {
      result = function() { throw e; };
    }

    if (data) {
      return result(data);
    }
    // provide the compiled function's source via its `toString` method, in
    // supported environments, or the `source` property as a convenience for
    // build time precompilation
    result.source = text;
    return result;
  }

  /**
   * Executes the `callback` function `n` times. The `callback` is bound to
   * `thisArg` and invoked with 1 argument; (index).
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Number} n The number of times to execute the callback.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding for the callback.
   * @example
   *
   * _.times(3, function() { genie.grantWish(); });
   * // => calls `genie.grantWish()` 3 times
   *
   * _.times(3, function() { this.grantWish(); }, genie);
   * // => also calls `genie.grantWish()` 3 times
   */
  function times(n, callback, thisArg) {
    var index = -1;
    if (thisArg) {
      while (++index < n) {
        callback.call(thisArg, index);
      }
    } else {
      while (++index < n) {
        callback(index);
      }
    }
  }

  /**
   * Generates a unique id. If `prefix` is passed, the id will be appended to it.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} [prefix] The value to prefix the id with.
   * @returns {Number|String} Returns a numeric id if no prefix is passed, else
   *  a string id may be returned.
   * @example
   *
   * _.uniqueId('contact_');
   * // => 'contact_104'
   */
  function uniqueId(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Wraps the value in a `lodash` wrapper object.
   *
   * @static
   * @memberOf _
   * @category Chaining
   * @param {Mixed} value The value to wrap.
   * @returns {Object} Returns the wrapper object.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * var youngest = _.chain(stooges)
   *     .sortBy(function(stooge) { return stooge.age; })
   *     .map(function(stooge) { return stooge.name + ' is ' + stooge.age; })
   *     .first()
   *     .value();
   * // => 'moe is 40'
   */
  function chain(value) {
    value = new LoDash(value);
    value._chain = true;
    return value;
  }

  /**
   * Invokes `interceptor` with the `value` as the first argument, and then
   * returns `value`. The purpose of this method is to "tap into" a method chain,
   * in order to perform operations on intermediate results within the chain.
   *
   * @static
   * @memberOf _
   * @category Chaining
   * @param {Mixed} value The value to pass to `callback`.
   * @param {Function} interceptor The function to invoke.
   * @returns {Mixed} Returns `value`.
   * @example
   *
   * _.chain([1,2,3,200])
   *  .filter(function(num) { return num % 2 == 0; })
   *  .tap(alert)
   *  .map(function(num) { return num * num })
   *  .value();
   * // => // [2, 200] (alerted)
   * // => [4, 40000]
   */
  function tap(value, interceptor) {
    interceptor(value);
    return value;
  }

  /**
   * Enables method chaining on the wrapper object.
   *
   * @name chain
   * @deprecated
   * @memberOf _
   * @category Chaining
   * @returns {Mixed} Returns the wrapper object.
   * @example
   *
   * _([1, 2, 3]).value();
   * // => [1, 2, 3]
   */
  function wrapperChain() {
    this._chain = true;
    return this;
  }

  /**
   * Extracts the wrapped value.
   *
   * @name value
   * @memberOf _
   * @category Chaining
   * @returns {Mixed} Returns the wrapped value.
   * @example
   *
   * _([1, 2, 3]).value();
   * // => [1, 2, 3]
   */
  function wrapperValue() {
    return this._wrapped;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The semantic version number.
   *
   * @static
   * @memberOf _
   * @type String
   */
  lodash.VERSION = '0.4.1';

  // assign static methods
  lodash.after = after;
  lodash.bind = bind;
  lodash.bindAll = bindAll;
  lodash.chain = chain;
  lodash.clone = clone;
  lodash.compact = compact;
  lodash.compose = compose;
  lodash.contains = contains;
  lodash.debounce = debounce;
  lodash.defaults = defaults;
  lodash.defer = defer;
  lodash.delay = delay;
  lodash.difference = difference;
  lodash.escape = escape;
  lodash.every = every;
  lodash.extend = extend;
  lodash.filter = filter;
  lodash.find = find;
  lodash.first = first;
  lodash.flatten = flatten;
  lodash.forEach = forEach;
  lodash.forIn = forIn;
  lodash.forOwn = forOwn;
  lodash.functions = functions;
  lodash.groupBy = groupBy;
  lodash.has = has;
  lodash.identity = identity;
  lodash.indexOf = indexOf;
  lodash.initial = initial;
  lodash.intersection = intersection;
  lodash.invoke = invoke;
  lodash.isArguments = isArguments;
  lodash.isArray = isArray;
  lodash.isBoolean = isBoolean;
  lodash.isDate = isDate;
  lodash.isElement = isElement;
  lodash.isEmpty = isEmpty;
  lodash.isEqual = isEqual;
  lodash.isFinite = isFinite;
  lodash.isFunction = isFunction;
  lodash.isNaN = isNaN;
  lodash.isNull = isNull;
  lodash.isNumber = isNumber;
  lodash.isObject = isObject;
  lodash.isRegExp = isRegExp;
  lodash.isString = isString;
  lodash.isUndefined = isUndefined;
  lodash.keys = keys;
  lodash.last = last;
  lodash.lastIndexOf = lastIndexOf;
  lodash.map = map;
  lodash.max = max;
  lodash.memoize = memoize;
  lodash.min = min;
  lodash.mixin = mixin;
  lodash.noConflict = noConflict;
  lodash.once = once;
  lodash.partial = partial;
  lodash.pick = pick;
  lodash.pluck = pluck;
  lodash.range = range;
  lodash.reduce = reduce;
  lodash.reduceRight = reduceRight;
  lodash.reject = reject;
  lodash.rest = rest;
  lodash.result = result;
  lodash.shuffle = shuffle;
  lodash.size = size;
  lodash.some = some;
  lodash.sortBy = sortBy;
  lodash.sortedIndex = sortedIndex;
  lodash.tap = tap;
  lodash.template = template;
  lodash.throttle = throttle;
  lodash.times = times;
  lodash.toArray = toArray;
  lodash.union = union;
  lodash.uniq = uniq;
  lodash.uniqueId = uniqueId;
  lodash.values = values;
  lodash.without = without;
  lodash.wrap = wrap;
  lodash.zip = zip;
  lodash.zipObject = zipObject;

  // assign aliases
  lodash.all = every;
  lodash.any = some;
  lodash.collect = map;
  lodash.detect = find;
  lodash.each = forEach;
  lodash.foldl = reduce;
  lodash.foldr = reduceRight;
  lodash.head = first;
  lodash.include = contains;
  lodash.inject = reduce;
  lodash.methods = functions;
  lodash.select = filter;
  lodash.tail = rest;
  lodash.take = first;
  lodash.unique = uniq;

  // add pseudo private properties used and removed during the build process
  lodash._iteratorTemplate = iteratorTemplate;
  lodash._shimKeys = shimKeys;

  /*--------------------------------------------------------------------------*/

  // assign private `LoDash` constructor's prototype
  LoDash.prototype = lodash.prototype;

  // add all static functions to `LoDash.prototype`
  mixin(lodash);

  // add `LoDash.prototype.chain` after calling `mixin()` to avoid overwriting
  // it with the wrapped `lodash.chain`
  LoDash.prototype.chain = wrapperChain;
  LoDash.prototype.value = wrapperValue;

  // add all mutator Array functions to the wrapper.
  forEach(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(methodName) {
    var func = ArrayProto[methodName];

    LoDash.prototype[methodName] = function() {
      var value = this._wrapped;
      func.apply(value, arguments);

      // IE compatibility mode and IE < 9 have buggy Array `shift()` and `splice()`
      // functions that fail to remove the last element, `value[0]`, of
      // array-like objects even though the `length` property is set to `0`.
      // The `shift()` method is buggy in IE 8 compatibility mode, while `splice()`
      // is buggy regardless of mode in IE < 9 and buggy in compatibility mode in IE 9.
      if (value.length === 0) {
        delete value[0];
      }
      if (this._chain) {
        value = new LoDash(value);
        value._chain = true;
      }
      return value;
    };
  });

  // add all accessor Array functions to the wrapper.
  forEach(['concat', 'join', 'slice'], function(methodName) {
    var func = ArrayProto[methodName];

    LoDash.prototype[methodName] = function() {
      var value = this._wrapped,
          result = func.apply(value, arguments);

      if (this._chain) {
        result = new LoDash(result);
        result._chain = true;
      }
      return result;
    };
  });

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash was injected by a third-party script and not intended to be
    // loaded as a module. The global assignment can be reverted in the Lo-Dash
    // module via its `noConflict()` method.
    window._ = lodash;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define('matrix/../../lib/lodash',[],function() {
      return lodash;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports) {
    // in Node.js or RingoJS v0.8.0+
    if (typeof module == 'object' && module && module.exports == freeExports) {
      (module.exports = lodash)._ = lodash;
    }
    // in Narwhal or RingoJS v0.7.0-
    else {
      freeExports._ = lodash;
    }
  }
  else {
    // in a browser or Rhino
    window._ = lodash;
  }
}(this));

define('matrix/matrix2-api',['require','common/not-implemented','matrix/m2'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {

    var notImplemented = require( "common/not-implemented" );
    var M2 = require( "matrix/m2" )( FLOAT_ARRAY_TYPE );

    function add( m1, m2, result ) {
      result = result || new M2();

      result[0] = m1[0] + m2[0];
      result[1] = m1[1] + m2[1];
      result[2] = m1[2] + m2[2];
      result[3] = m1[3] + m2[3];

      return result;
    }

    function clear( m ) {
      m[0] = m[1] = 0;
      m[2] = m[3] = 0;

      return m;
    }

    function determinant( m ) {
      var a00 = m[0], a01 = m[1], 
          a10 = m[2], a11 = m[3];

      return a00 * a11 - a01 * a10;
    }

    function equal( m1, m2, e ) {
      e = e || 0.000001;

      if( m1.length !== m2.length ) {
        return false;
      }

      var d0 = Math.abs( m1[0] - m2[0] );
      var d1 = Math.abs( m1[1] - m2[1] );
      var d2 = Math.abs( m1[2] - m2[2] );
      var d3 = Math.abs( m1[3] - m2[3] );

      if( isNaN( d0 ) || d0 > e ||
          isNaN( d1 ) || d1 > e ||
          isNaN( d2 ) || d2 > e ||
          isNaN( d3 ) || d3 > e ) {
        return false;
      }

      return true;
    }

    function inverse( m, result ) {
      result = result || new M2();

      var a00 = m[0], a01 = m[1], 
          a10 = m[2], a11 = m[3],

          determinant = a00 * a11 - a01 * a10,
          inverseDeterminant;

      if( !determinant ) { return null; }
      inverseDeterminant = 1 / determinant;

      result[0] = a11 * inverseDeterminant;
      result[1] = -a01 * inverseDeterminant;
      result[2] = -a10 * inverseDeterminant;
      result[3] = a00 * inverseDeterminant;

      return result;
    }

    function multiply( m1, m2, result ) {
      result = result || new M2();
      
      var a00 = m1[0], a01 = m1[1], a10 = m1[2], a11 = m1[3];
      var b00 = m2[0], b01 = m2[1], b10 = m2[2], b11 = m2[3];

      result[0] = a00 * b00 + a01 * b10;
      result[1] = a00 * b01 + a01 * b11;
      result[2] = a10 * b00 + a11 * b10;
      result[3] = a10 * b01 + a11 * b11;

      return result;
    }

    function set( m ) {
      if( 2 === arguments.length ) {
        var values = arguments[1];
        m[0] = values[0];
        m[1] = values[1];
        m[2] = values[2];
        m[3] = values[3];
      } else {
        m[0] = arguments[1];
        m[1] = arguments[2];
        m[2] = arguments[3];
        m[3] = arguments[4];
      }
     
      return m;
    }

    function subtract( m1, m2, result ) {
      result = result || new M2();

      result[0] = m1[0] - m2[0];
      result[1] = m1[1] - m2[1];
      result[2] = m1[2] - m2[2];
      result[3] = m1[3] - m2[3];

      return result;
    }

    function transpose( m, result ) {
      if( m && m === result ) {
        var a01 = m[1];

        result[1] = m[2];
        result[2] = a01;

        return result;
      }

      result = result || new M2();

      result[0] = m[0];
      result[1] = m[2];
      result[2] = m[1];
      result[3] = m[3];

      return result;
    }

    var matrix2 = {  
      add: add,
      clear: clear,
      determinant: determinant,
      equal: equal,
      inverse: inverse,
      multiply: multiply,
      set: set,
      subtract: subtract,
      transpose: transpose,

      zero: new M2( 0, 0,
                    0, 0 ),
      one: new M2( 1, 1,
                   1, 1 ),
      identity: new M2( 1, 0,
                        0, 1 )
    };
    
    return matrix2;

  };

});
define('matrix/matrix2',['require','../../lib/lodash','common/not-implemented','matrix/m2','matrix/matrix2-api','matrix/matrix'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {
    
    var _ = require( "../../lib/lodash" );
    var notImplemented = require( "common/not-implemented" );
    var M2 = require( "matrix/m2" )( FLOAT_ARRAY_TYPE );
    var matrix2 = require( "matrix/matrix2-api" )( FLOAT_ARRAY_TYPE );
    var Matrix = require( "matrix/matrix" );

    function getView( index ) {
      return this._views[index];
    }

    function getValue( index ) {
      return this.buffer[index];
    }

    function setValue( index, value ) {
      this.buffer[index] = value;
      this.matrix.modified = true;
    }

    function updateViews() {
      var i;
      for( i = 0; i < 2; ++ i ) {
        this._views[i] = new Matrix2View( this, this.buffer, 
          i*2, (i+1)*2 );
      }
    }

    var Matrix2View = function( matrix, buffer, start, end ) {
      this.matrix = matrix;
      this.buffer = buffer.subarray( start, end );

      Object.defineProperties( this, {
        "0": {
          get: getValue.bind( this, 0 ),
          set: setValue.bind( this, 0 )
        },
        "1": {
          get: getValue.bind( this, 1 ),
          set: setValue.bind( this, 1 )
        }
      });
    };

    var Matrix2 = function( arg1, arg2, 
                            arg3, arg4 ) {
      var argc = arguments.length;
      if( 1 === argc ) {
        if( arg1 instanceof Matrix2 ) {
          this.buffer = new M2( arg1.buffer );
        } else {
          this.buffer = new M2( arg1 );
        }
      } else if( 4 === argc ) {
        this.buffer = new M2( arg1, arg2, 
                              arg3, arg4 );
      } else {
        this.buffer = new M2();
      }

      Object.defineProperties( this, {
        "0": {
          get: getView.bind( this, 0 )
        },
        "1": {
          get: getView.bind( this, 1 )
        }
      });

      this._views = [];

      updateViews.call( this );

      this.modified = true;
    };
    Matrix2.prototype = new Matrix();
    Matrix2.prototype.constructor = Matrix2;

    function add( arg, result ) {
      var other;
      if( arg instanceof Matrix2 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      matrix2.add( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function clear() {
      matrix2.clear( this.buffer );
      this.modified = true;

      return this;
    }

    function clone() {
      return new Matrix2( this );
    }

    function determinant() {
      return matrix2.determinant( this.buffer );
    }

    function equal( arg ) {
      var other;
      if( arg instanceof Matrix2 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return matrix2.equal( this.buffer, other );
    }

    function inverse( result ) {
      result = result || this;
      if( !matrix2.determinant( this.buffer ) ) {
        throw new Error( "matrix is singular" );
      }
      matrix2.inverse( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }

    function multiply( arg, result ) {
      var other;
      if( arg instanceof Matrix2 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      matrix2.multiply( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function set( arg1, arg2, arg3, arg4,
                  arg5, arg6, arg7, arg8,
                  arg9, arg10, arg11, arg12,
                  arg13, arg14, arg15, arg16 ) {
      var argc = arguments.length;
      var buffer = this.buffer;
      var other;
      if( 1 === argc ) {
        if( arg1 instanceof Matrix2 ) {
          other = arg1.buffer;
        } else {
          other = arg1;
        }
        buffer[0] = other[0];
        buffer[1] = other[1];
        buffer[2] = other[2];
        buffer[3] = other[3];
        buffer[4] = other[4];
        buffer[5] = other[5];
        buffer[6] = other[6];
        buffer[7] = other[7];
        buffer[8] = other[8];
        buffer[9] = other[9];
        buffer[10] = other[10];
        buffer[11] = other[11];
        buffer[12] = other[12];
        buffer[13] = other[13];
        buffer[14] = other[14];
        buffer[15] = other[15];
        this.modified = true;
      } else if( 16 === argc ) {
        buffer[0] = arg1;
        buffer[1] = arg2;
        buffer[2] = arg3;
        buffer[3] = arg4;
        buffer[4] = arg5;
        buffer[5] = arg6;
        buffer[6] = arg7;
        buffer[7] = arg8;
        buffer[8] = arg9;
        buffer[9] = arg10;
        buffer[10] = arg11;
        buffer[11] = arg12;
        buffer[12] = arg13;
        buffer[13] = arg14;
        buffer[14] = arg15;
        buffer[15] = arg16;
        this.modified = true;
      }      

      return this;
    }

    function subtract( arg, result ) {
      var other;
      if( arg instanceof Matrix2 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      matrix2.subtract( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function transpose( result ) {
      result = result || this;
      matrix2.transpose( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }
    
    _.extend( Matrix2.prototype, {
      add: add,
      clear: clear,
      clone: clone,
      determinant: determinant,
      equal: equal,
      inverse: inverse,
      multiply: multiply,
      set: set,
      subtract: subtract,
      transpose: transpose
    });

    return Matrix2;

  };

});
define('matrix/m3',['require','matrix/m'],function ( require ) {

  var M = require( "matrix/m" );

  return function( FLOAT_ARRAY_TYPE ) {

    var M3 = function() {
      var elements = null;
      var argc = arguments.length;
      if( 1 === argc) {
        elements = arguments[0];
      } else if( 0 === argc ) {
        elements = [0, 0, 0,
                    0, 0, 0,
                    0, 0, 0];
      } else {
        elements = arguments;
      }

      var matrix = new FLOAT_ARRAY_TYPE( 9 );
      for( var i = 0; i < 9; ++ i ) {
        matrix[i] = elements[i];
      }

      return matrix;
    };
    M3.prototype = new M();
    M3.prototype.constructor = M3;

    return M3;

  };

});
define('matrix/matrix3-api',['require','common/not-implemented','matrix/m3'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {

    var notImplemented = require( "common/not-implemented" );
    var M3 = require( "matrix/m3" )( FLOAT_ARRAY_TYPE );

    function add( m1, m2, result ) {
      result = result || new M3();

      result[0] = m1[0] + m2[0];
      result[1] = m1[1] + m2[1];
      result[2] = m1[2] + m2[2];
      result[3] = m1[3] + m2[3];
      result[4] = m1[4] + m2[4];
      result[5] = m1[5] + m2[5];
      result[6] = m1[6] + m2[6];
      result[7] = m1[7] + m2[7];
      result[8] = m1[8] + m2[8];

      return result;
    }

    function clear( m ) {
      m[0] = m[1] = m[2] = 0;
      m[3] = m[4] = m[5] = 0;
      m[6] = m[7] = m[8] = 0;

      return m;
    }

    function determinant( m ) {
      var a00 = m[0], a01 = m[1], a02 = m[2],
          a10 = m[3], a11 = m[4], a12 = m[5],
          a20 = m[6], a21 = m[7], a22 = m[8];

      return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
    }

    function equal( m1, m2, e ) {
      e = e || 0.000001;

      if( m1.length !== m2.length ) {
        return false;
      }

      var d0 = Math.abs( m1[0] - m2[0] );
      var d1 = Math.abs( m1[1] - m2[1] );
      var d2 = Math.abs( m1[2] - m2[2] );
      var d3 = Math.abs( m1[3] - m2[3] );
      var d4 = Math.abs( m1[4] - m2[4] );
      var d5 = Math.abs( m1[5] - m2[5] );
      var d6 = Math.abs( m1[6] - m2[6] );
      var d7 = Math.abs( m1[7] - m2[7] );
      var d8 = Math.abs( m1[8] - m2[8] );

      if( isNaN( d0 ) || d0 > e ||
          isNaN( d1 ) || d1 > e ||
          isNaN( d2 ) || d2 > e ||
          isNaN( d3 ) || d3 > e ||
          isNaN( d4 ) || d4 > e ||
          isNaN( d5 ) || d5 > e ||
          isNaN( d6 ) || d6 > e ||
          isNaN( d7 ) || d7 > e ||
          isNaN( d8 ) || d8 > e ) {
        return false;
      }

      return true;
    }

    function inverse( m, result ) {
      result = result || new M3();

      var a00 = m[0], a01 = m[1], a02 = m[2],
          a10 = m[3], a11 = m[4], a12 = m[5],
          a20 = m[6], a21 = m[7], a22 = m[8],

          b01 = a22 * a11 - a12 * a21,
          b11 = -a22 * a10 + a12 * a20,
          b21 = a21 * a10 - a11 * a20,

          determinant = a00 * b01 + a01 * b11 + a02 * b21,
          inverseDeterminant;

      if( !determinant ) { return null; }
      inverseDeterminant = 1 / determinant;

      result[0] = b01 * inverseDeterminant;
      result[1] = (-a22 * a01 + a02 * a21) * inverseDeterminant;
      result[2] = (a12 * a01 - a02 * a11) * inverseDeterminant;
      result[3] = b11 * inverseDeterminant;
      result[4] = (a22 * a00 - a02 * a20) * inverseDeterminant;
      result[5] = (-a12 * a00 + a02 * a10) * inverseDeterminant;
      result[6] = b21 * inverseDeterminant;
      result[7] = (-a21 * a00 + a01 * a20) * inverseDeterminant;
      result[8] = (a11 * a00 - a01 * a10) * inverseDeterminant;

      return result;
    }

    // https://github.com/toji/gl-matrix/blob/8d6179c15aa938159feb2cb617d8a3af3fa2c7f3/gl-matrix.js#L682
    function multiply( m1, m2, result ) {
        result = result || new M3();
        
        // Cache the matrix values (makes for huge speed increases!)
        var a00 = m1[0], a01 = m1[1], a02 = m1[2],
            a10 = m1[3], a11 = m1[4], a12 = m1[5],
            a20 = m1[6], a21 = m1[7], a22 = m1[8],

            b00 = m2[0], b01 = m2[1], b02 = m2[2],
            b10 = m2[3], b11 = m2[4], b12 = m2[5],
            b20 = m2[6], b21 = m2[7], b22 = m2[8];

        result[0] = a00 * b00 + a01 * b10 + a02 * b20;
        result[1] = a00 * b01 + a01 * b11 + a02 * b21;
        result[2] = a00 * b02 + a01 * b12 + a02 * b22;

        result[3] = a10 * b00 + a11 * b10 + a12 * b20;
        result[4] = a10 * b01 + a11 * b11 + a12 * b21;
        result[5] = a10 * b02 + a11 * b12 + a12 * b22;

        result[6] = a20 * b00 + a21 * b10 + a22 * b20;
        result[7] = a20 * b01 + a21 * b11 + a22 * b21;
        result[8] = a20 * b02 + a21 * b12 + a22 * a22;

        return result;
    }

    function set( m ) {
      if( 2 === arguments.length ) {
        var values = arguments[1];
        m[0] = values[0];
        m[1] = values[1];
        m[2] = values[2];
        m[3] = values[3];
        m[4] = values[4];
        m[5] = values[5];
        m[6] = values[6];
        m[7] = values[7];
        m[8] = values[8];
      } else {
        m[0] = arguments[1];
        m[1] = arguments[2];
        m[2] = arguments[3];
        m[3] = arguments[4];
        m[4] = arguments[5];
        m[5] = arguments[6];
        m[6] = arguments[7];
        m[7] = arguments[8];
        m[8] = arguments[9];
      }
     
      return m;
    }

    function subtract( m1, m2, result ) {
      result = result || new M3();

      result[0] = m1[0] - m2[0];
      result[1] = m1[1] - m2[1];
      result[2] = m1[2] - m2[2];
      result[3] = m1[3] - m2[3];
      result[4] = m1[4] - m2[4];
      result[5] = m1[5] - m2[5];
      result[6] = m1[6] - m2[6];
      result[7] = m1[7] - m2[7];
      result[8] = m1[8] - m2[8];

      return result;
    }

    function transpose( m, result ) {
      if( m && m === result ) {
        var a01 = m[1], a02 = m[2],
            a12 = m[5];

        result[1] = m[3];
        result[2] = m[6];
        result[3] = a01;
        result[5] = m[7];
        result[6] = a02;
        result[7] = a12;

        return result;
      }

      result = result || new M3();

      result[0] = m[0];
      result[1] = m[3];
      result[2] = m[6];
      result[3] = m[1];
      result[4] = m[4];
      result[5] = m[7];
      result[6] = m[2];
      result[7] = m[5];
      result[8] = m[8];

      return result;
    }

    var matrix3 = {  
      add: add,
      clear: clear,
      determinant: determinant,
      equal: equal,
      inverse: inverse,
      multiply: multiply,
      multiplyV3: notImplemented,
      set: set,
      subtract: subtract,
      transpose: transpose,

      zero: new M3( 0, 0, 0,
                    0, 0, 0,
                    0, 0, 0 ),
      one: new M3( 1, 1, 1,
                   1, 1, 1,
                   1, 1, 1 ),
      identity: new M3( 1, 0, 0,
                        0, 1, 0,
                        0, 0, 1 )
    };
    
    return matrix3;

  };

});
define('matrix/matrix3',['require','../../lib/lodash','common/not-implemented','matrix/m3','matrix/matrix3-api','matrix/matrix'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {
    
    var _ = require( "../../lib/lodash" );
    var notImplemented = require( "common/not-implemented" );
    var M3 = require( "matrix/m3" )( FLOAT_ARRAY_TYPE );
    var matrix3 = require( "matrix/matrix3-api" )( FLOAT_ARRAY_TYPE );
    var Matrix = require( "matrix/matrix" );

    function getView( index ) {
      return this._views[index];
    }

    function getValue( index ) {
      return this.buffer[index];
    }

    function setValue( index, value ) {
      this.buffer[index] = value;
      this.matrix.modified = true;
    }

    function updateViews() {
      var i;
      for( i = 0; i < 3; ++ i ) {
        this._views[i] = new Matrix3View( this, this.buffer, 
          i*3, (i+1)*3 );
      }
    }

    var Matrix3View = function( matrix, buffer, start, end ) {
      this.matrix = matrix;
      this.buffer = buffer.subarray( start, end );

      Object.defineProperties( this, {
        "0": {
          get: getValue.bind( this, 0 ),
          set: setValue.bind( this, 0 )
        },
        "1": {
          get: getValue.bind( this, 1 ),
          set: setValue.bind( this, 1 )
        },
        "2": {
          get: getValue.bind( this, 2 ),
          set: setValue.bind( this, 2 )
        }
      });
    };

    var Matrix3 = function( arg1, arg2, arg3, 
                            arg4, arg5, arg6, 
                            arg7, arg8, arg9 ) {
      var argc = arguments.length;
      if( 1 === argc ) {
        if( arg1 instanceof Matrix3 ) {
          this.buffer = new M3( arg1.buffer );
        } else {
          this.buffer = new M3( arg1 );
        }
      } else if( 9 === argc ) {
        this.buffer = new M3( arg1, arg2, arg3, 
                              arg4, arg5, arg6, 
                              arg7, arg8, arg9 );
      } else {
        this.buffer = new M3();
      }

      Object.defineProperties( this, {
        "0": {
          get: getView.bind( this, 0 )
        },
        "1": {
          get: getView.bind( this, 1 )
        },
        "2": {
          get: getView.bind( this, 2 )
        }
      });

      this._views = [];

      updateViews.call( this );

      this.modified = true;
    };
    Matrix3.prototype = new Matrix();
    Matrix3.prototype.constructor = Matrix3;

    function add( arg, result ) {
      var other;
      if( arg instanceof Matrix3 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      matrix3.add( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function clear() {
      matrix3.clear( this.buffer );
      this.modified = true;

      return this;
    }

    function clone() {
      return new Matrix3( this );
    }

    function determinant() {
      return matrix3.determinant( this.buffer );
    }

    function equal( arg ) {
      var other;
      if( arg instanceof Matrix3 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return matrix3.equal( this.buffer, other );
    }

    function inverse( result ) {
      result = result || this;
      if( !matrix3.determinant( this.buffer ) ) {
        throw new Error( "matrix is singular" );
      }
      matrix3.inverse( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }

    function multiply( arg, result ) {
      var other;
      if( arg instanceof Matrix3 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      matrix3.multiply( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function set( arg1, arg2, arg3, arg4,
                  arg5, arg6, arg7, arg8,
                  arg9, arg10, arg11, arg12,
                  arg13, arg14, arg15, arg16 ) {
      var argc = arguments.length;
      var buffer = this.buffer;
      var other;
      if( 1 === argc ) {
        if( arg1 instanceof Matrix3 ) {
          other = arg1.buffer;
        } else {
          other = arg1;
        }
        buffer[0] = other[0];
        buffer[1] = other[1];
        buffer[2] = other[2];
        buffer[3] = other[3];
        buffer[4] = other[4];
        buffer[5] = other[5];
        buffer[6] = other[6];
        buffer[7] = other[7];
        buffer[8] = other[8];
        buffer[9] = other[9];
        buffer[10] = other[10];
        buffer[11] = other[11];
        buffer[12] = other[12];
        buffer[13] = other[13];
        buffer[14] = other[14];
        buffer[15] = other[15];
        this.modified = true;
      } else if( 16 === argc ) {
        buffer[0] = arg1;
        buffer[1] = arg2;
        buffer[2] = arg3;
        buffer[3] = arg4;
        buffer[4] = arg5;
        buffer[5] = arg6;
        buffer[6] = arg7;
        buffer[7] = arg8;
        buffer[8] = arg9;
        buffer[9] = arg10;
        buffer[10] = arg11;
        buffer[11] = arg12;
        buffer[12] = arg13;
        buffer[13] = arg14;
        buffer[14] = arg15;
        buffer[15] = arg16;
        this.modified = true;
      }

      return this;
    }

    function subtract( arg, result ) {
      var other;
      if( arg instanceof Matrix3 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      matrix3.subtract( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function transpose( result ) {
      result = result || this;
      matrix3.transpose( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }
    
    _.extend( Matrix3.prototype, {
      add: add,
      clear: clear,
      clone: clone,
      determinant: determinant,
      equal: equal,
      inverse: inverse,
      multiply: multiply,
      set: set,
      subtract: subtract,
      transpose: transpose
    });

    return Matrix3;

  };

});
define('matrix/m4',['require','matrix/m'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {

    var M = require( "matrix/m" );

    var M4 = function() {
      var elements = null;
      var argc = arguments.length;
      if( 1 === argc) {
        elements = arguments[0];
      } else if( 0 === argc ) {
        elements = [0, 0, 0, 0,
                    0, 0, 0, 0,
                    0, 0, 0, 0,
                    0, 0, 0, 0];
      } else {
        elements = arguments;
      }

      var matrix = new FLOAT_ARRAY_TYPE( 16 );
      for( var i = 0; i < 16; ++ i ) {
        matrix[i] = elements[i];
      }

      return matrix;
    };
    M4.prototype = new M();
    M4.prototype.constructor = M4;

    return M4;

  };

});
define('matrix/matrix4-api',['require','common/not-implemented','matrix/m4','vector/v3'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {

    var notImplemented = require( "common/not-implemented" );
    var M4 = require( "matrix/m4" )( FLOAT_ARRAY_TYPE );
    var V3 = require( "vector/v3" )( FLOAT_ARRAY_TYPE );

    function add( m1, m2, result ) {
      result = result || new M4();

      result[0] = m1[0] + m2[0];
      result[1] = m1[1] + m2[1];
      result[2] = m1[2] + m2[2];
      result[3] = m1[3] + m2[3];
      result[4] = m1[4] + m2[4];
      result[5] = m1[5] + m2[5];
      result[6] = m1[6] + m2[6];
      result[7] = m1[7] + m2[7];
      result[8] = m1[8] + m2[8];
      result[9] = m1[9] + m2[9];
      result[10] = m1[10] + m2[10];
      result[11] = m1[11] + m2[11];
      result[12] = m1[12] + m2[12];
      result[13] = m1[13] + m2[13];
      result[14] = m1[14] + m2[14];
      result[15] = m1[15] + m2[15];

      return result;
    }

    function clear( m ) {
      m[0] = m[1] = m[2] = m[3] = 0;
      m[4] = m[5] = m[6] = m[7] = 0;
      m[8] = m[9] = m[10] = m[11] = 0;
      m[12] = m[13] = m[14] = m[15] = 0;

      return m;
    }

    function determinant( m ) {
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

      return a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0;
    }

    function equal( m1, m2, e ) {
      e = e || 0.000001;

      if( m1.length !== m2.length ) {
        return false;
      }

      var d0 = Math.abs( m1[0] - m2[0] );
      var d1 = Math.abs( m1[1] - m2[1] );
      var d2 = Math.abs( m1[2] - m2[2] );
      var d3 = Math.abs( m1[3] - m2[3] );
      var d4 = Math.abs( m1[4] - m2[4] );
      var d5 = Math.abs( m1[5] - m2[5] );
      var d6 = Math.abs( m1[6] - m2[6] );
      var d7 = Math.abs( m1[7] - m2[7] );
      var d8 = Math.abs( m1[8] - m2[8] );
      var d9 = Math.abs( m1[9] - m2[9] );
      var d10 = Math.abs( m1[10] - m2[10] );
      var d11 = Math.abs( m1[11] - m2[11] );
      var d12 = Math.abs( m1[12] - m2[12] );
      var d13 = Math.abs( m1[13] - m2[13] );
      var d14 = Math.abs( m1[14] - m2[14] );
      var d15 = Math.abs( m1[15] - m2[15] );

      if( isNaN( d0 ) || d0 > e ||
          isNaN( d1 ) || d1 > e ||
          isNaN( d2 ) || d2 > e ||
          isNaN( d3 ) || d3 > e ||
          isNaN( d4 ) || d4 > e ||
          isNaN( d5 ) || d5 > e ||
          isNaN( d6 ) || d6 > e ||
          isNaN( d7 ) || d7 > e ||
          isNaN( d8 ) || d8 > e ||
          isNaN( d9 ) || d9 > e ||
          isNaN( d10 ) || d10 > e ||
          isNaN( d11 ) || d11 > e ||
          isNaN( d12 ) || d12 > e ||
          isNaN( d13 ) || d13 > e ||
          isNaN( d14 ) || d14 > e ||
          isNaN( d15 ) || d15 > e ) {
        return false;
      }

      return true;
    }

    function inverse( m, result ) {
      result = result || new M4();
                
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

          determinant = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06),
          inverseDeterminant;

      // Determinant, throw exception if singular
      if( !determinant ) {
        return undefined;
      }
      
      inverseDeterminant = 1 / determinant;

      result[0] = (a11 * b11 - a12 * b10 + a13 * b09) * inverseDeterminant;
      result[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * inverseDeterminant;
      result[2] = (a31 * b05 - a32 * b04 + a33 * b03) * inverseDeterminant;
      result[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * inverseDeterminant;
      result[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * inverseDeterminant;
      result[5] = (a00 * b11 - a02 * b08 + a03 * b07) * inverseDeterminant;
      result[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * inverseDeterminant;
      result[7] = (a20 * b05 - a22 * b02 + a23 * b01) * inverseDeterminant;
      result[8] = (a10 * b10 - a11 * b08 + a13 * b06) * inverseDeterminant;
      result[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * inverseDeterminant;
      result[10] = (a30 * b04 - a31 * b02 + a33 * b00) * inverseDeterminant;
      result[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * inverseDeterminant;
      result[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * inverseDeterminant;
      result[13] = (a00 * b09 - a01 * b07 + a02 * b06) * inverseDeterminant;
      result[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * inverseDeterminant;
      result[15] = (a20 * b03 - a21 * b01 + a22 * b00) * inverseDeterminant;
      
      return result;      
    }

    // https://github.com/toji/gl-matrix/blob/8d6179c15aa938159feb2cb617d8a3af3fa2c7f3/gl-matrix.js#L1295
    function multiply( m1, m2, result ) {
      result = result || new M4();

      var a00 = m1[0], a01 = m1[1], a02 = m1[2], a03 = m1[3],
        a10 = m1[4], a11 = m1[5], a12 = m1[6], a13 = m1[7],
        a20 = m1[8], a21 = m1[9], a22 = m1[10], a23 = m1[11],
        a30 = m1[12], a31 = m1[13], a32 = m1[14], a33 = m1[15],

        b00 = m2[0], b01 = m2[1], b02 = m2[2], b03 = m2[3],
        b10 = m2[4], b11 = m2[5], b12 = m2[6], b13 = m2[7],
        b20 = m2[8], b21 = m2[9], b22 = m2[10], b23 = m2[11],
        b30 = m2[12], b31 = m2[13], b32 = m2[14], b33 = m2[15];

      result[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
      result[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
      result[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
      result[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
      result[4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
      result[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
      result[6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
      result[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
      result[8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
      result[9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
      result[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
      result[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
      result[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
      result[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
      result[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
      result[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

      return result;
    }

    function multiplyV3( m, v, result ) {
      result = result || new V3();

      var x = v[0], y = v[1], z = v[2];
      
      result[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
      result[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      result[2] = m[2] * x + m[6] * y + m[10] * z + m[14];

      return result;
    }

    function set( m ) {
      if( 2 === arguments.length ) {
        var values = arguments[1];
        m[0] = values[0];
        m[1] = values[1];
        m[2] = values[2];
        m[3] = values[3];
        m[4] = values[4];
        m[5] = values[5];
        m[6] = values[6];
        m[7] = values[7];
        m[8] = values[8];
        m[9] = values[9];
        m[10] = values[10];
        m[11] = values[11];
        m[12] = values[12];
        m[13] = values[13];
        m[14] = values[14];
        m[15] = values[15];
      } else {
        m[0] = arguments[1];
        m[1] = arguments[2];
        m[2] = arguments[3];
        m[3] = arguments[4];
        m[4] = arguments[5];
        m[5] = arguments[6];
        m[6] = arguments[7];
        m[7] = arguments[8];
        m[8] = arguments[9];
        m[9] = arguments[10];
        m[10] = arguments[11];
        m[11] = arguments[12];
        m[12] = arguments[13];
        m[13] = arguments[14];
        m[14] = arguments[15];
        m[15] = arguments[16];
      }
     
      return m;
    }

    function subtract( m1, m2, result ) {
      result = result || new M4();

      result[0] = m1[0] - m2[0];
      result[1] = m1[1] - m2[1];
      result[2] = m1[2] - m2[2];
      result[3] = m1[3] - m2[3];
      result[4] = m1[4] - m2[4];
      result[5] = m1[5] - m2[5];
      result[6] = m1[6] - m2[6];
      result[7] = m1[7] - m2[7];
      result[8] = m1[8] - m2[8];
      result[9] = m1[9] - m2[9];
      result[10] = m1[10] - m2[10];
      result[11] = m1[11] - m2[11];
      result[12] = m1[12] - m2[12];
      result[13] = m1[13] - m2[13];
      result[14] = m1[14] - m2[14];
      result[15] = m1[15] - m2[15];

      return result;
    }

    function transpose( m, result ) {
      if( m && m === result ) {
        var a01 = m[1], a02 = m[2], a03 = m[3],
            a12 = m[6], a13 = m[7],
            a23 = m[11];

        result[1] = m[4];
        result[2] = m[8];
        result[3] = m[12];
        result[4] = a01;
        result[6] = m[9];
        result[7] = m[13];
        result[8] = a02;
        result[9] = a12;
        result[11] = m[14];
        result[12] = a03;
        result[13] = a13;
        result[14] = a23;

        return result;
      }

      result = result || new M4();

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
    }

    var matrix4 = {  
      add: add,
      clear: clear,
      determinant: determinant,
      equal: equal,
      inverse: inverse,
      multiply: multiply,
      multiplyV3: notImplemented,
      set: set,
      subtract: subtract,
      transpose: transpose,

      zero: new M4( 0, 0, 0, 0,
                    0, 0, 0, 0,
                    0, 0, 0, 0,
                    0, 0, 0, 0 ),
      one: new M4( 1, 1, 1, 1,
                   1, 1, 1, 1,
                   1, 1, 1, 1,
                   1, 1, 1, 1 ),
      identity: new M4( 1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        0, 0, 0, 1 )
    };
    
    return matrix4;

  };

});
define('matrix/matrix4',['require','../../lib/lodash','common/not-implemented','matrix/m4','matrix/matrix4-api','matrix/matrix'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {
    
    var _ = require( "../../lib/lodash" );
    var notImplemented = require( "common/not-implemented" );
    var M4 = require( "matrix/m4" )( FLOAT_ARRAY_TYPE );
    var matrix4 = require( "matrix/matrix4-api" )( FLOAT_ARRAY_TYPE );
    var Matrix = require( "matrix/matrix" );

    function getView( index ) {
      return this._views[index];
    }

    function getValue( index ) {
      return this.buffer[index];
    }

    function setValue( index, value ) {
      this.buffer[index] = value;
      this.matrix.modified = true;
    }

    function updateViews() {
      var i;
      for( i = 0; i < 4; ++ i ) {
        this._views[i] = new Matrix4View( this, this.buffer, 
          i*4, (i+1)*4 );
      }
    }

    var Matrix4View = function( matrix, buffer, start, end ) {
      this.matrix = matrix;
      this.buffer = buffer.subarray( start, end );

      Object.defineProperties( this, {
        "0": {
          get: getValue.bind( this, 0 ),
          set: setValue.bind( this, 0 )
        },
        "1": {
          get: getValue.bind( this, 1 ),
          set: setValue.bind( this, 1 )
        },
        "2": {
          get: getValue.bind( this, 2 ),
          set: setValue.bind( this, 2 )
        },
        "3": {
          get: getValue.bind( this, 3 ),
          set: setValue.bind( this, 3 )
        }        
      });
    };

    var Matrix4 = function( arg1, arg2, arg3, arg4,
                            arg5, arg6, arg7, arg8,
                            arg9, arg10, arg11, arg12,
                            arg13, arg14, arg15, arg16 ) {
      var argc = arguments.length;
      if( 1 === argc ) {
        if( arg1 instanceof Matrix4 ) {
          this.buffer = new M4( arg1.buffer );
        } else {
          this.buffer = new M4( arg1 );
        }
      } else if( 16 === argc ) {
        this.buffer = new M4( arg1, arg2, arg3, arg4,
                              arg5, arg6, arg7, arg8,
                              arg9, arg10, arg11, arg12,
                              arg13, arg14, arg15, arg16 );
      } else {
        this.buffer = new M4();
      }

      Object.defineProperties( this, {
        "0": {
          get: getView.bind( this, 0 )
        },
        "1": {
          get: getView.bind( this, 1 )
        },
        "2": {
          get: getView.bind( this, 2 )
        },
        "3": {
          get: getView.bind( this, 3 )
        }
      });

      this._views = [];

      updateViews.call( this );

      this.modified = true;
    };
    Matrix4.prototype = new Matrix();
    Matrix4.prototype.constructor = Matrix4;

    function add( arg, result ) {
      var other;
      if( arg instanceof Matrix4 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      matrix4.add( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function clear() {
      matrix4.clear( this.buffer );
      this.modified = true;

      return this;
    }

    function clone() {
      return new Matrix4( this );
    }

    function determinant() {
      return matrix4.determinant( this.buffer );
    }

    function equal( arg ) {
      var other;
      if( arg instanceof Matrix4 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return matrix4.equal( this.buffer, other );
    }

    function inverse( result ) {
      result = result || this;
      if( !matrix4.determinant( this.buffer ) ) {
        throw new Error( "matrix is singular" );
      }
      matrix4.inverse( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }

    function multiply( arg, result ) {
      var other;
      if( arg instanceof Matrix4 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      matrix4.multiply( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function set( arg1, arg2, arg3, arg4,
                  arg5, arg6, arg7, arg8,
                  arg9, arg10, arg11, arg12,
                  arg13, arg14, arg15, arg16 ) {
      var argc = arguments.length;
      var buffer = this.buffer;
      var other;
      if( 1 === argc ) {
        if( arg1 instanceof Matrix4 ) {
          other = arg1.buffer;
        } else {
          other = arg1;
        }
        buffer[0] = other[0];
        buffer[1] = other[1];
        buffer[2] = other[2];
        buffer[3] = other[3];
        buffer[4] = other[4];
        buffer[5] = other[5];
        buffer[6] = other[6];
        buffer[7] = other[7];
        buffer[8] = other[8];
        buffer[9] = other[9];
        buffer[10] = other[10];
        buffer[11] = other[11];
        buffer[12] = other[12];
        buffer[13] = other[13];
        buffer[14] = other[14];
        buffer[15] = other[15];
        this.modified = true;
      } else if( 16 === argc ) {
        buffer[0] = arg1;
        buffer[1] = arg2;
        buffer[2] = arg3;
        buffer[3] = arg4;
        buffer[4] = arg5;
        buffer[5] = arg6;
        buffer[6] = arg7;
        buffer[7] = arg8;
        buffer[8] = arg9;
        buffer[9] = arg10;
        buffer[10] = arg11;
        buffer[11] = arg12;
        buffer[12] = arg13;
        buffer[13] = arg14;
        buffer[14] = arg15;
        buffer[15] = arg16;
        this.modified = true;
      }      

      return this;
    }

    function subtract( arg, result ) {
      var other;
      if( arg instanceof Matrix4 ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      matrix4.subtract( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function transpose( result ) {
      result = result || this;
      matrix4.transpose( this.buffer, result.buffer );
      result.modified = true;

      return this;
    }
    
    _.extend( Matrix4.prototype, {
      add: add,
      clear: clear,
      clone: clone,
      determinant: determinant,
      equal: equal,
      inverse: inverse,
      multiply: multiply,
      set: set,
      subtract: subtract,
      transpose: transpose
    });

    return Matrix4;

  };

});
define('matrix/transform-api',['require','common/not-implemented','matrix/m4','matrix/matrix4-api'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {

    var notImplemented = require( "common/not-implemented" );
    var M4 = require( "matrix/m4" )( FLOAT_ARRAY_TYPE );
    var matrix4 = require( "matrix/matrix4-api" )( FLOAT_ARRAY_TYPE );

    function compound( transform, t, r, s ) {
      transform = transform || new M4(matrix4.identity);

      if( t ) {
        translate( t, transform );
      }

      if( r ) {
        rotate( r, transform );
      }

      if( s ) {
        scale( s, transform );
      }

      return transform;
    }

    function set(transform, t, r, s){
      if (transform){
        matrix4.set(transform, matrix4.identity);
      }
      return compound(transform, t, r, s);
    }

    function rotate( v, result ) {
      result = result || new M4( matrix4.identity );

      var sinA,
          cosA;
      var rotation;

      if( 0 !== v[2] ) {
        sinA = Math.sin( v[2] );
        cosA = Math.cos( v[2] );

        rotation = [ cosA, -sinA, 0, 0,
                     sinA, cosA, 0, 0,
                     0, 0, 1, 0,
                     0, 0, 0, 1 ];
        matrix4.multiply( result, rotation, result );
      }

      if( 0 !== v[1] ) {
        sinA = Math.sin( v[1] );
        cosA = Math.cos( v[1] );

        rotation = [ cosA, 0, sinA, 0,
                     0, 1, 0, 0,
                     -sinA, 0, cosA, 0,
                     0, 0, 0, 1 ];
        matrix4.multiply( result, rotation, result );
      }

      if( 0 !== v[0] ) {
        sinA = Math.sin( v[0] );
        cosA = Math.cos( v[0] );
        
        rotation = [ 1, 0, 0, 0,
                     0, cosA, -sinA, 0,
                     0, sinA, cosA, 0,
                     0, 0, 0, 1 ];
        matrix4.multiply( result, rotation, result );
      }

      return result;
    }

    function scale( v, result ) {
      result = result || new M4( matrix4.identity );

      matrix4.multiply( result, [v[0], 0, 0, 0,
                                 0, v[1], 0, 0,
                                 0, 0, v[2], 0,
                                 0, 0, 0, 1], result );

      return result;
    }

    function translate( v, result ) {
      result = result || new M4( matrix4.identity );

      matrix4.multiply( result, [1, 0, 0, v[0],
                                 0, 1, 0, v[1],
                                 0, 0, 1, v[2],
                                 0, 0, 0, 1], result );

      return result;
    }

    var transform = {
      compound: compound,
      set: set,
      rotate: rotate,
      scale: scale,
      translate: translate
    };

    return transform;

  };

});
define('matrix/t',['require','matrix/m','matrix/m4','matrix/transform-api'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {

    var M = require( "matrix/m" );
    var M4 = require( "matrix/m4" )( FLOAT_ARRAY_TYPE );
    var transform = require("matrix/transform-api")( FLOAT_ARRAY_TYPE );

    var T = function(t, r, s) {
      var matrix = new M4();
      return transform.set(matrix, t, r, s);
    };
    T.prototype = new M();
    T.prototype.constructor = T;

    return T;

  };

});
define('matrix/transform',['require','common/not-implemented','matrix/m4','matrix/transform-api','matrix/matrix4-api','matrix/matrix4'],function ( require ) {

  return function( FLOAT_ARRAY_TYPE ) {
    
    var notImplemented = require( "common/not-implemented" );
    var M4 = require( "matrix/m4" )( FLOAT_ARRAY_TYPE );
    var transform = require( "matrix/transform-api" )( FLOAT_ARRAY_TYPE );
    var matrix4 = require( "matrix/matrix4-api" )( FLOAT_ARRAY_TYPE );
    var Matrix4 = require( "matrix/matrix4" )( FLOAT_ARRAY_TYPE );

    function getView( index ) {
      return this._views[index];
    }

    function getValue( index ) {
      return this.buffer[index];
    }

    function setValue( index, value ) {
      this.buffer[index] = value;
      this.matrix.modified = true;
    }

    function updateViews() {
      var i;
      for( i = 0; i < 4; ++ i ) {
        this._views[i] = new TransformView( this, this.buffer, 
          i*4, (i+1)*4 );
      }
    }

    var TransformView = function( matrix, buffer, start, end ) {
      this.matrix = matrix;
      this.buffer = buffer.subarray( start, end );

      Object.defineProperties( this, {
        "0": {
          get: getValue.bind( this, 0 ),
          set: setValue.bind( this, 0 )
        },
        "1": {
          get: getValue.bind( this, 1 ),
          set: setValue.bind( this, 1 )
        },
        "2": {
          get: getValue.bind( this, 2 ),
          set: setValue.bind( this, 2 )
        },
        "3": {
          get: getValue.bind( this, 3 ),
          set: setValue.bind( this, 3 )
        }        
      });
    };

    var Transform = function( arg1, arg2, arg3 ) {
      var argc = arguments.length;
      if( 0 === argc ) {
        this.buffer = new M4(matrix4.identity);
      }else if( 1 === argc ) {
        if( arg1 instanceof Transform ||
            arg1 instanceof Matrix4 ) {
          this.buffer = new M4( arg1.buffer );
        } else if( arg1 instanceof M4 ) {
          this.buffer = new M4( arg1 );
        } else {
          this.buffer = new M4(matrix4.identity);
          transform.compound( this.buffer, arg1, arg2, arg3 );
        }
      } else {
        this.buffer = new M4(matrix4.identity);
        transform.compound(this.buffer, arg1, arg2, arg3 );
      }

      Object.defineProperties( this, {
        "0": {
          get: getView.bind( this, 0 )
        },
        "1": {
          get: getView.bind( this, 1 )
        },
        "2": {
          get: getView.bind( this, 2 )
        },
        "3": {
          get: getView.bind( this, 3 )
        }
      });

      this._views = [];

      updateViews.call( this );

      this.modified = true;
    };

    function clone() {
      return new Transform( this );
    }

    function equal( arg ) {
      var other;
      if( arg instanceof Matrix4 ||
          arg instanceof Transform ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      return matrix4.equal( this.buffer, other );
    }

    function multiply( arg, result ) {
      var other;
      if( arg instanceof Matrix4 ||
          arg instanceof Transform ) {        
        other = arg.buffer;
      } else {
        other = arg;
      }

      result = result || this;
      matrix4.multiply( this.buffer, other, result.buffer );
      result.modified = true;

      return this;
    }

    function rotate( v, result ) {
      var rotation = transform.rotate( v );

      result = result || this;
      matrix4.multiply( this.buffer, rotation, result.buffer );
      result.modified = true;

      return this;
    }

    function scale( v, result ) {
      var scaled = transform.scale( v );

      result = result || this;
      matrix4.multiply( this.buffer, scaled, result.buffer );
      result.modified = true;

      return this;
    }

    function set( t, r, s ) {
      transform.set( this.buffer, t, r, s );
      this.modified = true;
    }

    function transformDirection( v, result ) {

    }

    function transformPoint( v, result ) {

    }

    function translate( v, result ) {
      var translation = transform.translate( v );

      result = result || this;
      matrix4.multiply( this.buffer, translation, result.buffer );
      result.modified = true;

      return this;
    }

    Transform.prototype = {
      clone: clone,
      equal: equal,
      inverseTransformDirection: notImplemented,
      inverseTransformPoint: notImplemented,
      multiply: multiply,
      rotate: rotate,
      scale: scale,
      set: set,
      transformDirection: notImplemented,
      transformPoint: notImplemented,
      translate: translate
    };

    return Transform;

  };

});
define('_math',['require','constants','equal','vector/v2','vector/vector2','vector/vector2-api','vector/v3','vector/vector3','vector/vector3-api','vector/v4','vector/vector4','vector/vector4-api','matrix/m2','matrix/matrix2','matrix/matrix2-api','matrix/m3','matrix/matrix3','matrix/matrix3-api','matrix/m4','matrix/matrix4','matrix/matrix4-api','matrix/t','matrix/transform','matrix/transform-api'],function ( require ) {

  var constants = require( "constants" );
  var equal = require( "equal" );

  var V2 = require( "vector/v2" );
  var Vector2 = require( "vector/vector2" );
  var vector2 = require( "vector/vector2-api" );

  var V3 = require( "vector/v3" );
  var Vector3 = require( "vector/vector3" );
  var vector3 = require( "vector/vector3-api" );

  var V4 = require( "vector/v4" );
  var Vector4 = require( "vector/vector4" );
  var vector4 = require( "vector/vector4-api" );

  var M2 = require( "matrix/m2" );
  var Matrix2 = require( "matrix/matrix2" );
  var matrix2 = require( "matrix/matrix2-api" );

  var M3 = require( "matrix/m3" );
  var Matrix3 = require( "matrix/matrix3" );
  var matrix3 = require( "matrix/matrix3-api" );

  var M4 = require( "matrix/m4" );
  var Matrix4 = require( "matrix/matrix4" );
  var matrix4 = require( "matrix/matrix4-api" );

  var T = require( "matrix/t" );
  var Transform = require( "matrix/transform" );
  var transform = require( "matrix/transform-api" );

  function extend( object, extra ) {
    for ( var prop in extra ) {
      if ( !object.hasOwnProperty( prop ) && extra.hasOwnProperty( prop ) ) {
        object[prop] = extra[prop];
      }
    }
  }

  var _Math = function( options ) {
    var FLOAT_ARRAY_ENUM = {
        Float32: Float32Array,
        Float64: Float64Array
    };
    this.FLOAT_ARRAY_ENUM = FLOAT_ARRAY_ENUM;

    var ARRAY_TYPE = this.ARRAY_TYPE = FLOAT_ARRAY_ENUM.Float32;

    extend( this, constants );
    this.equal = equal;
    extend( this, {
      V2: V2( ARRAY_TYPE ),
      Vector2: Vector2( ARRAY_TYPE ),
      vector2: vector2( ARRAY_TYPE )
    });
    extend( this, {
      V3: V3( ARRAY_TYPE ),
      Vector3: Vector3( ARRAY_TYPE ),
      vector3: vector3( ARRAY_TYPE )
    });
    extend( this, {
      V4: V4( ARRAY_TYPE ),
      Vector4: Vector4( ARRAY_TYPE ),
      vector4: vector4( ARRAY_TYPE )
    });
    extend( this, {
      M2: M2( ARRAY_TYPE ),
      Matrix2: Matrix2( ARRAY_TYPE ),
      matrix2: matrix2( ARRAY_TYPE )
    });
    extend( this, {
      M3: M3( ARRAY_TYPE ),
      Matrix3: Matrix3( ARRAY_TYPE ),
      matrix3: matrix3( ARRAY_TYPE )
    });
    extend( this, {
      M4: M4( ARRAY_TYPE ),
      Matrix4: Matrix4( ARRAY_TYPE ),
      matrix4: matrix4( ARRAY_TYPE )
    });
    extend( this, {
      T: T( ARRAY_TYPE ),
      Transform: Transform( ARRAY_TYPE ),
      transform: transform( ARRAY_TYPE )
    });
  };

  return new _Math();

});
  return require('_math');
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
    var task = this._tasks[taskId];
    this.remove( taskId );
    return task;
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
        task._scheduler.remove( task.id );
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
              if( task._taskState === T_STARTED ) {
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
      task._taskState = T_CLOSED;
      task._runState = R_REJECTED;
      task._deferred.reject( exception );
      console.log( "Task", task.id, ": ", exception.stack );
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

    // Local position
    this._position = position ? new math.Vector3( position ) : new math.Vector3( math.vector3.zero );
    this.__defineGetter__( "position", function() {
      return this._position;
    });
    this.__defineSetter__( "position", function( value ) {
      this._position.set( value );
      this._cachedLocalMatrixIsValid = false;
      this._cachedWorldMatrixIsValid = false;
    });

    // Local rotation
    this._rotation = rotation ? new math.Vector3( rotation ) : new math.Vector3( math.vector3.zero );
    this.__defineGetter__( "rotation", function() {
      return this._rotation;
    });
    this.__defineSetter__( "rotation", function( value ) {
      this._rotation.set( value );
      this._cachedLocalMatrixIsValid = false;
      this._cachedWorldMatrixIsValid = false;
    });
    this._rotationMatrix = new math.transform.rotate( this._rotation );
    this._rotationMatrixIsValid = true;

    // Local scale
    this._scale = scale ? new math.Vector3( scale ) : new math.Vector3( math.vector3.one );
    this.__defineGetter__( "scale", function() {
      return this._scale;
    });
    this.__defineSetter__( "scale", function( value ) {
      this._scale.set( value );
      this._cachedLocalMatrixIsValid = false;
      this._cachedWorldMatrixIsValid = false;
    });

    this._cachedLocalMatrix = new math.T();
    this._cachedLocalMatrixIsValid = false;
    this._cachedWorldMatrix = new math.T();
    //TODO: Make the world matrix caching actually do something
    this._cachedWorldMatrixIsValid = false;
    this._tempMatrix = new math.T();
  };
  Transform.prototype = new Component();
  Transform.prototype.constructor = Transform;

  // Return the relative transform
  function computeLocalMatrix() {
    if( this._cachedLocalMatrixIsValid && !this.position.modified && !this.rotation.modified && !this.scale.modified) {
      return this._cachedLocalMatrix;
    } else {
      math.transform.set(this._cachedLocalMatrix, this.position.buffer, this.rotation.buffer, this.scale.buffer);
      this._cachedLocalMatrixIsValid = true;
      this.position.modified = false;
      this.rotation.modified = false;
      this.scale.modified = false;
      return this._cachedLocalMatrix;
    }
  }

  // Return the world transform
  function computeWorldMatrix() {
    if( this.owner && this.owner.parent && 
        this.owner.parent.hasComponent( "Transform" ) ) {
      var parentTransform = this.owner.parent.findComponent( "Transform" );                            
      math.matrix4.multiply( parentTransform.worldMatrix(), computeLocalMatrix.call( this),
        this._cachedWorldMatrix );
    } else {
      math.matrix4.set( this._cachedWorldMatrix, computeLocalMatrix.call( this) );
    }
    return this._cachedWorldMatrix;
  }

  //This calculates the rotation of the object relative to world space
  function computeWorldRotation(){
    //TODO: Add caching of results in here once we have a way of detecting changes in the parents
    if( this.owner && this.owner.parent &&
      this.owner.parent.hasComponent( "Transform" ) ) {
      return math.matrix4.multiply(this.owner.parent.findComponent( "Transform").worldRotation(),
                                   math.transform.rotate(this._rotation.buffer));
    }else{
      return math.transform.rotate(this._rotation.buffer);
    }
  }

  //TODO: Should produce a unit vector showing the orientation of things in world space
  function directionToWorld(){

  }

  function pointToWorld(direction, result) {
    result = result || new math.V3();
    direction = direction || new math.V3();
    math.matrix4.multiply(
      computeWorldRotation.call(this),
      math.transform.translate( direction ),
      this._tempMatrix);
    math.vector3.set(result, this._tempMatrix[3], this._tempMatrix[7], this._tempMatrix[11]);
    return result;
  }

  function pointToLocal(direction, result) {
    result = result || new math.V3();
    if( this.owner && this.owner.parent &&
      this.owner.parent.hasComponent( "Transform" ) ) {
      var thisParentWorldMatrix = this.owner.parent.findComponent( "Transform").worldMatrix();
      //Multiply the inverse of the parent's world matrix by the other transform's world matrix,
      // putting the result in the temp matrix
      //Solution grabbed from http://www.macaronikazoo.com/?p=419
      math.matrix4.multiply(math.matrix4.inverse(thisParentWorldMatrix,this._tempMatrix), math.transform.translate(direction), this._tempMatrix);
      //Subtract this turret's position so that everything is offset properly
      math.vector3.set(result, this._tempMatrix[3] - this._position.buffer[0], this._tempMatrix[7] - this._position.buffer[1], this._tempMatrix[11] - this._position.buffer[2]);
    }
    else{
      math.vector3.set(result, direction[0], direction[1], direction[2]);
    }
    return result;
  }

  function toWorldPoint() {
    var worldMatrix = computeWorldMatrix.call(this);
    return [worldMatrix[3], worldMatrix[7], worldMatrix[11]];
  }

  function relativeTo(otherTransform, result)
  {
    result = result || new math.V3();
    var otherWorldMatrix = otherTransform.worldMatrix();
    if( this.owner && this.owner.parent &&
      this.owner.parent.hasComponent( "Transform" ) ) {
      var thisParentWorldMatrix = this.owner.parent.findComponent( "Transform").worldMatrix();
      //Multiply the inverse of the parent's world matrix by the other transform's world matrix,
      // putting the result in the temp matrix
      // Solution grabbed from http://www.macaronikazoo.com/?p=419
      math.matrix4.multiply(math.matrix4.inverse(thisParentWorldMatrix,this._tempMatrix), otherWorldMatrix, this._tempMatrix);
      //Subtract this turret's position so that everything is offset properly
      math.vector3.set(result, this._tempMatrix[3] - this._position.buffer[0], this._tempMatrix[7] - this._position.buffer[1], this._tempMatrix[11] - this._position.buffer[2]);
    }
    else{
      math.vector3.set(result, otherWorldMatrix[3], otherWorldMatrix[7], otherWorldMatrix[11]);
    }
    return result;
  }

  var prototype = {
    //TODO: worldMatrix and localMatrix look like property accessors from the outside but are actually methods. This should be changed, either so that they are accessed like properties or look like methods
    worldMatrix: computeWorldMatrix,
    localMatrix: computeLocalMatrix,
    pointToLocal: pointToLocal,
    pointToWorld: pointToWorld,
    directionToWorld: undefined,
    //Same thing goes for this one.
    worldRotation: computeWorldRotation,
    relativeTo: relativeTo,
    toWorldPoint: toWorldPoint,
    lookAt: undefined,
    target: undefined,
    // Direction constants
    forward: new math.Vector3( 0, 0, 1 ),
    backward: new math.Vector3( 0, 0, -1 ),
    left: new math.Vector3( -1, 0, 0 ),
    right: new math.Vector3( 1, 0, 0 ),
    up: new math.Vector3( 0, 1, 0 ),
    down: new math.Vector3( 0, -1, 0 )
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

