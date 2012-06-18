var PATH = process.env["PATH"].split( ':' );
var MODULES_BIN = process.cwd() + "/node_modules/.bin";
PATH.unshift( MODULES_BIN );
PATH = PATH.join( ':' );

process.env["PATH"] = PATH;

task( "default", [], require( "./tools/jake-tasks/default" ) );

desc( "start web server in project directory" );
task( "serve", [], require( "./tools/jake-tasks/serve" ) );