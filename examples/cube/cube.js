document.addEventListener( "DOMContentLoaded", function( e ) {

  var engine = new Gladius();

  var cubicvrOptions = {
    renderer: {
      canvas: document.getElementById( "test-canvas" )
    }
  };
  engine.registerExtension( Gladius["gladius-cubicvr"], cubicvrOptions );

  var resources = {};

  var materialArgs = 'colorTexture=../assets/images/cube-diffuse.jpg' +
    '&bumpTexture=../assets/images/cube-bump.jpg' +
    '&normalTexture=../assets/images/cube-normal.jpg';

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
        url: '../assets/procedural-material.js?' + materialArgs,
        load: engine.loaders.procedural,
        onsuccess: function( material ) {
          resources.material = material;
        },
        onfailure: function( error ) {
        }
      },
      {
        type: engine["gladius-cubicvr"].MaterialDefinition,
        url: '../assets/procedural-material.js?diffuseR=0&diffuseG=0&diffuseB=1&' + materialArgs,
        load: engine.loaders.procedural,
        onsuccess: function( material ) {
          resources.altMaterial = material;
        },
        onfailure: function( error ) {
        }
      }
    ],
    {
      oncomplete: game.bind( null, engine, resources )
    }
  );

  function game( engine, resources ) {
    var space = new engine.SimulationSpace();
    var cubicvr = engine.findExtension( "gladius-cubicvr" );

    var lightDefinition = new cubicvr.LightDefinition({
      intensity: 1,
      distance:30,
      light_type: cubicvr.LightDefinition.LightTypes.POINT,
      method: cubicvr.LightDefinition.LightingMethods.DYNAMIC
    })

    space.add( new engine.Entity( "camera",
      [
        new engine.core.Transform( [0, 0, 0] ),
        new cubicvr.Camera(),
        new cubicvr.Light()
      ]
    ));
    space.add( new engine.Entity( "light-center",
      [
        new engine.core.Transform( [0, 0, -6], [engine.math.TAU, engine.math.TAU, engine.math.TAU] )
      ]
    ));
    space.add( new engine.Entity( "light-marker",
      [
        new engine.core.Transform( [3, 0, 0], [0, 0, 0], [0.1, 0.1, 0.1] ),
        new cubicvr.Model( resources.mesh, resources.material )
      ]
    ));
    space.add( new engine.Entity( "light-source",
      [
        new engine.core.Transform( [3, 0, 0], [0, 0, 0], [1, 1, 1] ),
        new cubicvr.Light( lightDefinition )
      ]
    ));
    var parentCube = new engine.Entity( "cube",
      [
        new engine.core.Transform( [0, 0, -6], [0, -engine.math.TAU/8, engine.math.TAU/8] ),
        new cubicvr.Model( resources.mesh, resources.material )
      ]
    );
    space.add( parentCube );
    space.findNamed( "light-source" ).setParent( space.findNamed( "light-center" ) );
    space.findNamed( "light-marker" ).setParent( space.findNamed( "light-center" ) );

    var task = new engine.FunctionTask( function() {
      space.findNamed( "cube" ).findComponent( "Transform" ).rotation.add([space.clock.delta * 0.003, space.clock.delta * 0.001, space.clock.delta * 0.0007]);

      space.findNamed( "light-center" ).findComponent( "Transform" ).rotation.y += space.clock.delta * 0.001;
    }, {
      tags: ["@update"]
    });
    task.start();

    function suspendHandler( event ) {
      var code = event.which || event.keyCode;
      if( code === 0x4D && event.ctrlKey && event.altKey ) {
        if( engine.simulationClock.isStarted() ) {
          engine.simulationClock.pause();
          window.context = this;
          console.log( "suspend" );
        } else {
          delete window.context;
          engine.simulationClock.start();
          console.log( "resume" );
        }
      }
    }
    document.addEventListener( "keydown", suspendHandler.bind({
      engine: engine,
      space: space,
      resources: resources
    }) );

    engine.resume();
  }

});
