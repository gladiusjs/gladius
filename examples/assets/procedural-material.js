function proc( options ) {
  options = options || {};

  var R = (options.hasOwnProperty( "R" )) ? parseInt( options.R ) : 1.0;
  var G = (options.hasOwnProperty( "G" )) ? parseInt( options.G ) : 0.2;
  var B = (options.hasOwnProperty( "B" )) ? parseInt( options.B ) : 0.0;

  return {
    color: [R, G, B]
  };
}
