function proc( options ) {
  options = options || {};
  if (options.colorR === undefined){
    options.colorR = 1;
  }else{
    options.colorR = parseInt(options.colorR);
  }
  if (options.colorG === undefined){
    options.colorG = 0.2
  }else{
    options.colorG = parseInt(options.colorG);
  }
  if (options.colorB === undefined){
    options.colorB = 0;
  }else{
    options.colorB = parseInt(options.colorB);
  }
  return {
    color: [options.colorR, options.colorG, options.colorB]
  };
}
