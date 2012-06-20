function proc( options ) {
  options = options || {};

  var specR = (options.hasOwnProperty( "specR" )) ? parseFloat( options.specR ) : 1.0;
  var specG = (options.hasOwnProperty( "specG" )) ? parseFloat( options.specG ) : 1.0;
  var specB = (options.hasOwnProperty( "specB" )) ? parseFloat( options.specB ) : 1.0;

  return {
    textures: {
      color: '../assets/images/concrete3.jpg'
    },
    diffuse:[specR,specG,specB]
  };
}