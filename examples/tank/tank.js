document.addEventListener( "DOMContentLoaded", function( e ) {

  require.config({
    baseUrl: "../.."
  });
  
  require( 
    [ "gladius-core", 
      "gladius-cubicvr",
      "gladius-input" ],
    function( Gladius, cubicvrExtension, inputExtension ) {

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
      var inputOptions = {
        dispatcher: {
          element: document
        }
      }
      engine.registerExtension( inputExtension, inputOptions );

      var cubicvr = engine.findExtension( "gladius-cubicvr" );
      var input = engine.findExtension( "gladius-input" );
      var resources = {};

      var materialArgs = '?colorTexture=../assets/images/tank-diffuse.jpg' +
        '&bumpTexture=../assets/images/tank-bump.jpg' +
        '&normalTexture=../assets/images/tank-normal.jpg';

      engine.get(
        [
          {
            type: cubicvr.Mesh,
            url: "../assets/procedural-prism.js?length=2.0&width=1.0&depth=0.5",
            load: engine.loaders.procedural,
            onsuccess: function( mesh ) {
              resources.tankBody = mesh;
            },
            onfailure: function( error ) {
            }
          },
          {
            type: cubicvr.Mesh,
            url: "../assets/procedural-prism.js?length=1.7&width=0.4&depth=0.7",
            load: engine.loaders.procedural,
            onsuccess: function( mesh ) {
              resources.tankTread = mesh;
            },
            onfailure: function( error ) {
            }
          },
          {
            type: cubicvr.Mesh,
            url: "../assets/procedural-prism.js?length=1.0&width=0.7&depth=0.3",
            load: engine.loaders.procedural,
            onsuccess: function( mesh ) {
              resources.tankTurret = mesh;
            },
            onfailure: function( error ) {
            }
          },
          {
            type: cubicvr.Mesh,
            url: "../assets/procedural-prism.js?length=0.8&width=0.2&depth=0.1",
            load: engine.loaders.procedural,
            onsuccess: function( mesh ) {
              resources.tankBarrel = mesh;
            },
            onfailure: function( error ) {
            }
          },          
          {
            type: cubicvr.MaterialDefinition,
            url: "../assets/procedural-material.js" + materialArgs,
            load: engine.loaders.procedural,
            onsuccess: function( material ) {
              resources.material = material;
            },
            onfailure: function( error ) {
            }
          },
          {
            type: input.Map,
            url: "tank-controls.json",
            onsuccess: function( inputMap ) {
              resources.tankControls = inputMap;
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
    var math = engine.math;
    var space = new engine.SimulationSpace();
    var cubicvr = engine.findExtension( "gladius-cubicvr" );
    var input = engine.findExtension( "gladius-input" );
    var Entity = engine.Entity;

    var lightDefinition = new cubicvr.LightDefinition({
      intensity: 2,
      light_type: cubicvr.LightDefinition.LightTypes.POINT,
      method: cubicvr.LightDefinition.LightingMethods.DYNAMIC
    });

    var tankLogic = {
      "Update": function( event ) {
        if( this.owner.hasComponent( "Controller" ) ) {
          var controller = this.owner.findComponent( "Controller" );
          var transform = space.findNamed( "tank-body" ).findComponent( "Transform" );
          if( controller.states["MoveForward"] ) {
            console.log( this.owner.id, "Move forward!" );
            var direction = math.transform.translate( [space.clock.delta * 0.001, 0, 0] );
            var rotation = math.transform.rotate( transform.rotation );
            direction = math.matrix4.multiply( [direction, rotation] );
            direction = [direction[12], direction[13], direction[14]];
            transform.setPosition( math.vector3.add( direction, transform.position ) );
          }
          if( controller.states["MoveBackward"] ) {
            console.log( this.owner.id, "Move backward!" );            
            var direction = math.transform.translate( [space.clock.delta * -0.001, 0, 0] );
            var rotation = math.transform.rotate( transform.rotation );
            direction = math.matrix4.multiply( [direction, rotation] );
            direction = [direction[12], direction[13], direction[14]];
            transform.setPosition( math.vector3.add( direction, transform.position ) );
          }
          if( controller.states["TurnLeft"] ) {
            if( controller.states["StrafeModifier"] ) {
              console.log( this.owner.id, "Strafe left!" );
              var direction = math.transform.translate( [0, space.clock.delta * -0.001, 0] );
              var rotation = math.transform.rotate( transform.rotation );
              direction = math.matrix4.multiply( [direction, rotation] );
              direction = [direction[12], direction[13], direction[14]];
              transform.setPosition( math.vector3.add( direction, transform.position ) );              
            } else {
              console.log( this.owner.id, "Turn left!" );
              var rotation = transform.rotation;
              transform.setRotation( math.vector3.add( rotation, [0, 0, space.clock.delta * -0.001] ) );
            }
          }
          if( controller.states["TurnRight"] ) {
            if( controller.states["StrafeModifier"] ) {
              console.log( this.owner.id, "Strafe right!" );
              var direction = math.transform.translate( [0, space.clock.delta * 0.001, 0] );
              var rotation = math.transform.rotate( transform.rotation );
              direction = math.matrix4.multiply( [direction, rotation] );
              direction = [direction[12], direction[13], direction[14]];
              transform.setPosition( math.vector3.add( direction, transform.position ) );   
            } else {
              console.log( this.owner.id, "Turn right!" );
              var rotation = transform.rotation;
              transform.setRotation( math.vector3.add( rotation, [0, 0, space.clock.delta * 0.001] ) );
            }
          }
        }
      },
      "Fire": function( event ) {
        console.log( this.owner.id, "Fire!" );
      }
    };

    // This parent entity will let us adjust the position and orientation of the
    // tank, and handle game logic events
    space.add( new Entity( "tank", 
      [
        new engine.core.Transform( [0, 0, 5], [math.TAU/6, 0, 0], [0.5, 0.5, 0.5] ),
        new input.Controller( resources.tankControls ),
        new engine.logic.Actor( tankLogic )
      ],
      ["tank"]
    ));
    space.add( new Entity( "tank-body",
      [
        new engine.core.Transform(),
        new cubicvr.Model( resources.tankBody, resources.material )
      ],
      ["tank"],
      space.findNamed( "tank" )
    ));
    space.add( new Entity( "tank-tread",
      [
        new engine.core.Transform( [0, 0.8, 0] ),
        new cubicvr.Model( resources.tankTread, resources.material )
      ],
      ["tank"],
      space.findNamed( "tank-body" )
    ));
    space.add( new Entity( "tank-tread",
      [
        new engine.core.Transform( [0, -0.8, 0] ),
        new cubicvr.Model( resources.tankTread, resources.material )
      ],
      ["tank"],
      space.findNamed( "tank-body" )
    ));
    space.add( new Entity( "tank-turret",
      [
        new engine.core.Transform( [-0.2, 0, -0.6] ),
        new cubicvr.Model( resources.tankTurret, resources.material )
      ],
      ["tank"],
      space.findNamed( "tank-body" )
    ));
    space.add( new Entity( "tank-barrel",
      [
        new engine.core.Transform( [0.8, 0, 0] ),
        new cubicvr.Model( resources.tankBarrel, resources.material )
      ],
      ["tank"],
      space.findNamed( "tank-turret" )
    ));

    space.add( new Entity( "camera",
      [
        new engine.core.Transform( [0, 0, 0] ),
        new cubicvr.Camera({
          targeted: true
        }),
        new cubicvr.Light()
      ]
    ));
    // space.findNamed( "camera" ).findComponent( "Camera" ).setTarget( 0, 0, 0 );

    var task = new engine.FunctionTask( function() {
    }, {
      tags: ["@update"]
    }).start();

    engine.resume();
  }

});
