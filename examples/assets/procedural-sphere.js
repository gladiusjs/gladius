function proc( options ) {

  options = options || {};
  options.type = options.type || "sphere";
  options.radius = options.radius || 0.5;
  options.latDetail = options.latDetail || 24;
  options.lonDetail = options.lonDetail || 24;

  var mesh =
  {
    primitive: {
      type: options.type,
      radius: options.radius,
      lat: options.latDetail,
      lon: options.lonDetail,
      uvmapper: {
        projectionMode: "cubic",
        scale: [1, 1, 1]
      }
    },
    compile: true
  };

  return mesh;

}