function proc( options ) {
  options = options || {};

  var diffuseR = (options.hasOwnProperty( "diffuseR" )) ? parseFloat( options.diffuseR ) : 1.0;
  var diffuseG = (options.hasOwnProperty( "diffuseG" )) ? parseFloat( options.diffuseG ) : 1.0;
  var diffuseB = (options.hasOwnProperty( "diffuseB" )) ? parseFloat( options.diffuseB ) : 1.0;
  var colorTexture = (options.hasOwnProperty( "colorTexture" )) ? options.colorTexture : '../assets/images/2576-diffuse.jpg';
  var normalTexture = (options.hasOwnProperty( "normalTexture" )) ? options.normalTexture : '../assets/images/2576-normal.jpg';
  var bumpTexture = (options.hasOwnProperty( "bumpTexture" )) ? options.bumpTexture : '../assets/images/2576-bump.jpg';
  var envSphereTexture = (options.hasOwnProperty( "envSphereTexture" )) ? options.envSphereTexture : '../assets/images/fract_reflections.jpg';

  return {
    textures: {
      color: colorTexture,
      normal: normalTexture,
      bump: bumpTexture,
      envsphere: envSphereTexture
    },
    diffuse:[diffuseR,diffuseG,diffuseB]
  };
}