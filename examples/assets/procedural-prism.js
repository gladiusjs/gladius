function proc( options ) {

  options = options || {};

  var length = (options.length || 1.0) / 2.0;
  var width = (options.width || 1.0) / 2.0;
  var depth = (options.depth || 1.0) / 2.0;

  var mesh =
  {
    points: [
      [ length, -width,  depth],
      [ length,  width,  depth],
      [-length,  width,  depth],
      [-length, -width,  depth],
      [ length, -width, -depth],
      [ length,  width, -depth],
      [-length,  width, -depth],
      [-length, -width, -depth]
    ],
    faces: [
      [0, 1, 2, 3],
      [7, 6, 5, 4],
      [4, 5, 1, 0],
      [5, 6, 2, 1],
      [6, 7, 3, 2],
      [7, 4, 0, 3]
    ],
    uv: [
      [ [0, 1], [1, 1], [1, 0], [0, 0] ],
      [ [0, 1], [1, 1], [1, 0], [0, 0] ],
      [ [0, 1], [1, 1], [1, 0], [0, 0] ],
      [ [0, 1], [1, 1], [1, 0], [0, 0] ],
      [ [0, 1], [1, 1], [1, 0], [0, 0] ],
      [ [0, 1], [1, 1], [1, 0], [0, 0] ]
    ],
    uvmapper: {
            projectionMode: "cubic",
            scale: [1, 1, 1]
    }
  };

  return mesh;

}
