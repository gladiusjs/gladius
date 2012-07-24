document.addEventListener( "DOMContentLoaded", function( e ) {

  require.config({
    baseUrl: "../.."
  });
  
  require( 
    [ "gladius-core", 
      "gladius-cubicvr" ],
    function( Gladius, cubicvrExtension ) {

      var engine = new Gladius();

      // Engine monitor setup
      function monitor( engine ) {
        debugger;
        engine.detach( monitor );
      }
      document.addEventListener( "keydown", function( event ) {
        var code = event.which || event.keyCode;
        if( code === 0x4D && event.ctrlKey && event.altKey ) {
          engine.attach( monitor );
        }
      });

      var cubicvrOptions = {
        renderer: {
          canvas: document.getElementById( "test-canvas" )
        }
      };
      engine.registerExtension( cubicvrExtension, cubicvrOptions );

      var resources = {};

      var materialArgs = '?colorTexture=../assets/images/camera-rotate-diffuse.jpg' +
                         '&bumpTexture=../assets/images/cube-impulse-bump.jpg' +
                         '&normalTexture=../assets/images/camera-rotate-normal.jpg';

      engine.get(
        [
          {
            type: engine["gladius-cubicvr"].Mesh,
            url: '../assets/procedural-mesh.js',
            load: engine.loaders.procedural,
            onsuccess: function( mesh ) {
              resources.mesh = mesh;
            },
            onfailure: function( error ) {
            }
          },
          {
            type: engine["gladius-cubicvr"].MaterialDefinition,
            url: '../assets/procedural-material.js' + materialArgs,
            load: engine.loaders.procedural,
            onsuccess: function( material ) {
              resources.material = material;
            },
            onfailure: function( error ) {
            }
          }
        ],
        {
          oncomplete: game.bind( null, engine, resources )
        }
      );

  });

  function game( engine, resources ) {
    var space = new engine.SimulationSpace();
    var cubicvr = engine.findExtension( "gladius-cubicvr" );

    var lightDefinition = new cubicvr.LightDefinition({
      intensity: 1,
      light_type: cubicvr.LightDefinition.LightTypes.POINT,
      method: cubicvr.LightDefinition.LightingMethods.DYNAMIC
    })

    space.add( new engine.Entity( "camera",
      [
        new engine.core.Transform( [0, 0, 0] ),
        new cubicvr.Light( lightDefinition ),
        new cubicvr.Camera( {
          targeted:false
        } )
      ]
    ));

    var xCoord, yCoord, zCoord;
    for (xCoord = -2; xCoord <= 2; xCoord = xCoord + 1){
      for (yCoord = -0.5; yCoord <= 0.5; yCoord = yCoord + 0.5){
        for (zCoord = -2; zCoord <= 2; zCoord = zCoord + 1){
          //Get rid of some annoying corner cubes that appear really close to the camera
          if (!(yCoord === 0 && (xCoord === 1 || xCoord === -1) && (zCoord === 1 || zCoord === -1))){
            space.add(new engine.Entity("cubex:" + xCoord + "y:" + yCoord + "z:" + zCoord,
              [
                new engine.core.Transform( [xCoord, yCoord, zCoord], [0, 0, 0], [ 0.1, 0.1, 0.1 ] ),
                new cubicvr.Model( resources.mesh, resources.material )
              ]
            ));
          }
        }
      }
    }
    var parentCube = new engine.Entity( "cube",
      [
        new engine.core.Transform( [0, 0, 6], [0, 0, 0] ),
        new cubicvr.Model( resources.mesh, resources.material )
      ]
    );
    space.add( parentCube );

    var task = new engine.FunctionTask( function() {
      space.findNamed( "cube" ).findComponent( "Transform" ).rotation.y += space.clock.delta * 0.0003;

      space.findNamed( "camera" ).findComponent( "Transform" ).rotation.y += space.clock.delta * 0.0003;
    }, {
      tags: ["@update"]
    });
    task.start();

    engine.resume();
  }

});
