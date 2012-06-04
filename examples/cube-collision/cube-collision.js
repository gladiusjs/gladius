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

      var box2dOptions = {
        resolver: {
          gravity: [0,-0.5]
        }
      };

      engine.registerExtension( cubicvrExtension, cubicvrOptions );
      engine.registerExtension( box2dExtension, box2dOptions);

      var resources = {};

      engine.get(
        [
          {
            type: engine["gladius-cubicvr"].Mesh,
            url: 'procedural-mesh.js',
            load: engine.loaders.procedural,
            onsuccess: function( mesh ) {
              resources.mesh = mesh;
            },
            onfailure: function( error ) {
            }
          },
          {
            type: engine["gladius-cubicvr"].MaterialDefinition,
            url: 'procedural-material.js',
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
    var space = new engine.simulation.Space();
    var cubicvr = engine.findExtension( "gladius-cubicvr" );
    var box2d = engine.findExtension( "gladius-box2d" );

    var lightDefinition = new cubicvr.LightDefinition({
      intensity: 2,
      light_type: cubicvr.LightDefinition.LightTypes.POINT,
      method: cubicvr.LightDefinition.LightingMethods.DYNAMIC
    });

    space.add( new engine.simulation.Entity( "camera",
      [
        new engine.core.Transform( [0, 0, 5] ),
        new cubicvr.Light( lightDefinition ),
        new cubicvr.Camera( {
          targeted:false
        } )
      ]
    ));

    var xCoord, yCoord, zCoord;
    for (xCoord = -11; xCoord < 11; xCoord = xCoord + 2){
      for (yCoord = -11; yCoord < 11; yCoord = yCoord + 2){
        for (zCoord = -11; zCoord < 11; zCoord = zCoord + 2){
          space.add(new engine.simulation.Entity("cubex:" + xCoord + "y:" + yCoord + "z:" + zCoord,
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

    var firstCube = new engine.simulation.Entity( "cube1",
      [
        new engine.core.Transform( [-1, 0, -6], [0, 0, 0] ),
        new box2d.Body({bodyDefinition: bodyDefinition, fixtureDefinition: fixtureDefinition}),
        new cubicvr.Model( resources.mesh, resources.material )
      ]
    );
    space.add( firstCube );

    var secondCube = new engine.simulation.Entity( "cube2",
      [
        new engine.core.Transform( [1, 0, -6], [0, 0, 0] ),
        new box2d.Body({bodyDefinition: bodyDefinition, fixtureDefinition: fixtureDefinition}),
        new cubicvr.Model( resources.mesh, resources.material )
      ]
    );
    space.add( secondCube );

    var task = new engine.FunctionTask( function() {
      var impEvent = new engine.Event('LinearImpulse',{impulse: [0, 0.5]});
      var angEvent = new engine.Event('AngularImpulse',{impulse: 0.1});

      var cubePosition1 = new engine.math.Vector3( space.findNamed( "cube1").findComponent( "Transform").position);
      if (cubePosition1[1] < -1.5){
        impEvent.dispatch(firstCube);
        angEvent.dispatch(firstCube);
      }

      var cubePosition2 = new engine.math.Vector3( space.findNamed( "cube2").findComponent( "Transform").position);
      if (cubePosition2[1] < -1.5){
        impEvent.dispatch(secondCube);
        angEvent.dispatch(secondCube);
      }
    }, {
      tags: ["@update"]
    });
    task.start();

    engine.resume();
  }

});
