document.addEventListener( "DOMContentLoaded", function( e ) {

  require.config({
    baseUrl: "../.."
  });
  
  require( 
    [ "gladius-core",
      "gladius-cubicvr",
      "gladius-box2d"],
    function( Gladius, cubicvrExtension, box2dExtension ) {

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
      engine.registerExtension( box2dExtension );

      var resources = {};

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
            url: '../assets/procedural-material.js',
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
    var box2d = engine.findExtension( "gladius-box2d" );

    var lightDefinition = new cubicvr.LightDefinition({
      intensity: 2,
      light_type: cubicvr.LightDefinition.LightTypes.POINT,
      method: cubicvr.LightDefinition.LightingMethods.DYNAMIC
    });

    space.add( new engine.Entity( "camera",
      [
        new engine.core.Transform( [0, 0, 0] ),
        new cubicvr.Light( lightDefinition ),
        new cubicvr.Camera( {
          targeted:false
        } )
      ]
    ));

    space.add(new engine.Entity( "gravity",
      [
        new box2d.Force({force:[0,-1], forceType:box2d.Force.ForceTypes.GLOBAL})
      ]
    ));

    var xCoord, yCoord, zCoord;
    for (xCoord = -11; xCoord < 11; xCoord = xCoord + 2){
      for (yCoord = -11; yCoord < 11; yCoord = yCoord + 2){
        for (zCoord = -11; zCoord < 11; zCoord = zCoord + 2){
          space.add(new engine.Entity("cubex:" + xCoord + "y:" + yCoord + "z:" + zCoord,
            [
              new engine.core.Transform( [xCoord, yCoord, zCoord], [0, 0, 0], [ 0.1, 0.1, 0.1 ] ),
              new cubicvr.Model( resources.mesh, resources.material )
            ]
          ));
        }
      }
    }

    var bodyDefinition = new box2d.BodyDefinition();
    var fixtureDefinition = new box2d.FixtureDefinition({shape:new box2d.BoxShape()});

    var parentCube = new engine.Entity( "cube",
      [
        new engine.core.Transform( [0, 0, -6], [0, 0, 0] ),
        new box2d.Body({bodyDefinition: bodyDefinition, fixtureDefinition: fixtureDefinition}),
        new cubicvr.Model( resources.mesh, resources.material )
      ]
    );
    space.add( parentCube );

    var task = new engine.FunctionTask( function() {
      var cubePosition = new engine.math.Vector3( space.findNamed( "cube").findComponent( "Transform").position);
      if (cubePosition[1] < -1.5){
        var impEvent = new engine.Event('LinearImpulse',{impulse: [0, 1]});
        impEvent.dispatch(parentCube);

        var angEvent = new engine.Event('AngularImpulse',{impulse: 0.1});
        angEvent.dispatch(parentCube);
      }
    }, {
      tags: ["@update"]
    });
    task.start();

    engine.resume();
  }

});
