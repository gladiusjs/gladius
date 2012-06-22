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
      engine.registerExtension( box2dExtension);//, box2dOptions);

      var resources = {};

      var materialArgs = '&colorTexture=../assets/images/cube-collision-diffuse.jpg' +
        '&bumpTexture=../assets/images/cube-collision-bump.jpg' +
        '&normalTexture=../assets/images/cube-collision-normal.jpg';

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
            url: '../assets/procedural-material.js?diffuseR=0.7&diffuseG=0.7&diffuseB=0.7' + materialArgs,
            load: engine.loaders.procedural,
            onsuccess: function( material ) {
              resources.material = material;
            },
            onfailure: function( error ) {
            }
          },
          {
            type: engine["gladius-cubicvr"].MaterialDefinition,
            url: '../assets/procedural-material.js?diffuseR=0.1&diffuseG=0.1&diffuseB=0.1' + materialArgs,
            load: engine.loaders.procedural,
            onsuccess: function( material ) {
              resources.materialDull = material;
            },
            onfailure: function( error ) {
            }
          },
          {
            type: engine["gladius-cubicvr"].MaterialDefinition,
            url: '../assets/procedural-material.js?diffuseR=1&diffuseG=1&diffuseB=1' + materialArgs,
            load: engine.loaders.procedural,
            onsuccess: function( material ) {
              resources.materialShiny = material;
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
      intensity: 1,
      light_type: cubicvr.LightDefinition.LightTypes.POINT,
      method: cubicvr.LightDefinition.LightingMethods.DYNAMIC
    });

    space.add( new engine.Entity( "camera",
      [
        new engine.core.Transform( [0, 0, 5] ),
        new cubicvr.Light( lightDefinition ),
        new cubicvr.Camera( {
          targeted:false
        } )
      ]
    ));

    var bodyDefinition = new box2d.BodyDefinition();
    var fixtureDefinition = new box2d.FixtureDefinition({shape:new box2d.BoxShape(0.25,0.25)});

    for (var cubeIndex = 0; cubeIndex < 5; cubeIndex++){

      var firstBody = new box2d.Body({bodyDefinition: bodyDefinition, fixtureDefinition: fixtureDefinition});

      firstBody.onContactBegin = function(event){
        console.log("First cube number " + cubeIndex + " contact begin");
        this.owner.findComponent( "Model").setMaterialDefinition(resources.materialDull);
      };
      firstBody.onContactEnd = function(event){
        console.log("First cube number " + cubeIndex + " contact end");
      };
      var firstCube = new engine.Entity( "cube1",
        [
          new engine.core.Transform( [3 + cubeIndex * 1.5, 0.125, 0], [0, 0, 0], [0.5, 0.5, 0.5] ),
          firstBody,
          new cubicvr.Model( resources.mesh, resources.material )
        ]
      );
      space.add( firstCube );

      var secondBody = new box2d.Body({bodyDefinition: bodyDefinition, fixtureDefinition: fixtureDefinition});

      secondBody.onContactBegin = function(event){
        console.log("Second cube number " + cubeIndex + " contact begin");
        this.owner.findComponent( "Model").setMaterialDefinition(resources.materialShiny);
      };
      secondBody.onContactEnd = function(event){
        console.log("Second cube number " + cubeIndex + " contact end");
      };

      var secondCube = new engine.Entity( "cube2",
        [
          new engine.core.Transform( [-3 - cubeIndex * 1.5, -0.125, 0], [0, 0, 0], [0.5, 0.5, 0.5] ),
          secondBody,
          new cubicvr.Model( resources.mesh, resources.material )
        ]
      );
      space.add( secondCube );
      new engine.Event("LinearImpulse", {impulse: [-0.25,0]}).dispatch(firstCube);
      new engine.Event("LinearImpulse", {impulse: [0.25,0]}).dispatch(secondCube);
    }

    var task = new engine.FunctionTask( function() {
    }, {
      tags: ["@update"]
    });
    task.start();

    engine.resume();
  }

});
