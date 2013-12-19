module.exports = THREE = require('three');

require('three-system');
require('three-color');
require('three-math-common');


/**
 * @author mrdoob / http://mrdoob.com/
 * @author bhouston / http://exocortex.com/
 * @author stephomi / http://stephaneginier.com/
 */

( function ( THREE ) {

	THREE.Raycaster = function ( origin, direction, near, far ) {

		this.ray = new THREE.Ray( origin, direction );
		// direction is assumed to be normalized (for accurate distance calculations)

		this.near = near || 0;
		this.far = far || Infinity;

	};

	var sphere = new THREE.Sphere();
	var localRay = new THREE.Ray();
	var facePlane = new THREE.Plane();
	var intersectPoint = new THREE.Vector3();
	var matrixPosition = new THREE.Vector3();

	var inverseMatrix = new THREE.Matrix4();

	var descSort = function ( a, b ) {

		return a.distance - b.distance;

	};

	var vA = new THREE.Vector3();
	var vB = new THREE.Vector3();
	var vC = new THREE.Vector3();

	var intersectObject = function ( object, raycaster, intersects ) {

		if ( object instanceof THREE.Sprite ) {

			matrixPosition.setFromMatrixPosition( object.matrixWorld );
			var distance = raycaster.ray.distanceToPoint( matrixPosition );

			if ( distance > object.scale.x ) {

				return intersects;

			}

			intersects.push( {

				distance: distance,
				point: object.position,
				face: null,
				object: object

			} );

		} else if ( object instanceof THREE.LOD ) {

			matrixPosition.setFromMatrixPosition( object.matrixWorld );
			var distance = raycaster.ray.origin.distanceTo( matrixPosition );

			intersectObject( object.getObjectForDistance( distance ), raycaster, intersects );

		} else if ( object instanceof THREE.Mesh ) {

			var geometry = object.geometry;

			// Checking boundingSphere distance to ray

			if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

			sphere.copy( geometry.boundingSphere );
			sphere.applyMatrix4( object.matrixWorld );

			if ( raycaster.ray.isIntersectionSphere( sphere ) === false ) {

				return intersects;

			}

			// Check boundingBox before continuing
			
			inverseMatrix.getInverse( object.matrixWorld );  
			localRay.copy( raycaster.ray ).applyMatrix4( inverseMatrix );

			if ( geometry.boundingBox !== null ) {

				if ( localRay.isIntersectionBox( geometry.boundingBox ) === false )  {

					return intersects;

				}

			} 

			if ( geometry instanceof THREE.BufferGeometry ) {

				var material = object.material;

				if ( material === undefined ) return intersects;
				if ( geometry.dynamic === false ) return intersects;

				var a, b, c;
				var precision = raycaster.precision;

				if ( geometry.attributes.index !== undefined ) {

					var offsets = geometry.offsets;
					var indices = geometry.attributes.index.array;
					var positions = geometry.attributes.position.array;
					var offLength = geometry.offsets.length;

					var fl = geometry.attributes.index.array.length / 3;

					for ( var oi = 0; oi < offLength; ++oi ) {

						var start = offsets[ oi ].start;
						var count = offsets[ oi ].count;
						var index = offsets[ oi ].index;

						for ( var i = start, il = start + count; i < il; i += 3 ) {

							a = index + indices[ i ];
							b = index + indices[ i + 1 ]; 
							c = index + indices[ i + 2 ];

							vA.set(
								positions[ a * 3 ],
								positions[ a * 3 + 1 ],
								positions[ a * 3 + 2 ]
							);
							vB.set(
								positions[ b * 3 ],
								positions[ b * 3 + 1 ],
								positions[ b * 3 + 2 ]
							);
							vC.set(
								positions[ c * 3 ],
								positions[ c * 3 + 1 ],
								positions[ c * 3 + 2 ]
							);

							
							if ( material.side === THREE.BackSide ) {
							
								var intersectionPoint = localRay.intersectTriangle( vC, vB, vA, true ); 

							} else {

								var intersectionPoint = localRay.intersectTriangle( vA, vB, vC, material.side !== THREE.DoubleSide );

							}

							if ( intersectionPoint === null ) continue;

							intersectionPoint.applyMatrix4( object.matrixWorld );

							var distance = raycaster.ray.origin.distanceTo( intersectionPoint );

							if ( distance < precision || distance < raycaster.near || distance > raycaster.far ) continue;

							intersects.push( {

								distance: distance,
								point: intersectionPoint,
								face: null,
								faceIndex: null,
								object: object

							} );

						}

					}

				} else {

					var offsets = geometry.offsets;
					var positions = geometry.attributes.position.array;
					var offLength = geometry.offsets.length;

					var fl = geometry.attributes.position.array.length;

					for ( var i = 0; i < fl; i += 3 ) {

						a = i;
						b = i + 1;
						c = i + 2;

						vA.set(
							positions[ a * 3 ],
							positions[ a * 3 + 1 ],
							positions[ a * 3 + 2 ]
						);
						vB.set(
							positions[ b * 3 ],
							positions[ b * 3 + 1 ],
							positions[ b * 3 + 2 ]
						);
						vC.set(
							positions[ c * 3 ],
							positions[ c * 3 + 1 ],
							positions[ c * 3 + 2 ]
						);

						
						if ( material.side === THREE.BackSide ) {
							
							var intersectionPoint = localRay.intersectTriangle( vC, vB, vA, true ); 

						} else {

							var intersectionPoint = localRay.intersectTriangle( vA, vB, vC, material.side !== THREE.DoubleSide );

						}

						if ( intersectionPoint === null ) continue;

						intersectionPoint.applyMatrix4( object.matrixWorld );

						var distance = raycaster.ray.origin.distanceTo( intersectionPoint );

						if ( distance < precision || distance < raycaster.near || distance > raycaster.far ) continue;

						intersects.push( {

							distance: distance,
							point: intersectionPoint,
							face: null,
							faceIndex: null,
							object: object

						} );

					}

				}

			} else if ( geometry instanceof THREE.Geometry ) {

				var isFaceMaterial = object.material instanceof THREE.MeshFaceMaterial;
				var objectMaterials = isFaceMaterial === true ? object.material.materials : null;

				var a, b, c, d;
				var precision = raycaster.precision;

				var vertices = geometry.vertices;

				for ( var f = 0, fl = geometry.faces.length; f < fl; f ++ ) {

					var face = geometry.faces[ f ];

					var material = isFaceMaterial === true ? objectMaterials[ face.materialIndex ] : object.material;

					if ( material === undefined ) continue;

					a = vertices[ face.a ];
					b = vertices[ face.b ];
					c = vertices[ face.c ];
					
					if ( material.side === THREE.BackSide ) {
							
						var intersectionPoint = localRay.intersectTriangle( c, b, a, true ); 

					} else {
								
						var intersectionPoint = localRay.intersectTriangle( a, b, c, material.side !== THREE.DoubleSide );

					}

					if ( intersectionPoint === null ) continue;

					intersectionPoint.applyMatrix4( object.matrixWorld );

					var distance = raycaster.ray.origin.distanceTo( intersectionPoint );

					if ( distance < precision || distance < raycaster.near || distance > raycaster.far ) continue;

					intersects.push( {

						distance: distance,
						point: intersectionPoint,
						face: face,
						faceIndex: f,
						object: object

					} );

				}

			}

		} else if ( object instanceof THREE.Line ) {

			var precision = raycaster.linePrecision;
			var precisionSq = precision * precision;

			var geometry = object.geometry;

			if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

			// Checking boundingSphere distance to ray

			sphere.copy( geometry.boundingSphere );
			sphere.applyMatrix4( object.matrixWorld );
			
			if ( raycaster.ray.isIntersectionSphere( sphere ) === false ) {

				return intersects;

			}
			
			inverseMatrix.getInverse( object.matrixWorld );
			localRay.copy( raycaster.ray ).applyMatrix4( inverseMatrix );

			/* if ( geometry instanceof THREE.BufferGeometry ) {

			} else */ if ( geometry instanceof THREE.Geometry ) {

				var vertices = geometry.vertices;
				var nbVertices = vertices.length;
				var interSegment = new THREE.Vector3();
				var interRay = new THREE.Vector3();
				var step = object.type === THREE.LineStrip ? 1 : 2;

				for ( var i = 0; i < nbVertices - 1; i = i + step ) {

					var distSq = localRay.distanceSqToSegment( vertices[ i ], vertices[ i + 1 ], interRay, interSegment );

					if ( distSq > precisionSq ) continue;

					var distance = localRay.origin.distanceTo( interRay );

					if ( distance < raycaster.near || distance > raycaster.far ) continue;

					intersects.push( {

						distance: distance,
						// What do we want? intersection point on the ray or on the segment??
						// point: raycaster.ray.at( distance ),
						point: interSegment.clone().applyMatrix4( object.matrixWorld ),
						face: null,
						faceIndex: null,
						object: object

					} );

				}

			}

		}

	};

	var intersectDescendants = function ( object, raycaster, intersects ) {

		var descendants = object.getDescendants();

		for ( var i = 0, l = descendants.length; i < l; i ++ ) {

			intersectObject( descendants[ i ], raycaster, intersects );

		}
	};

	//

	THREE.Raycaster.prototype.precision = 0.0001;
	THREE.Raycaster.prototype.linePrecision = 1;

	THREE.Raycaster.prototype.set = function ( origin, direction ) {

		this.ray.set( origin, direction );
		// direction is assumed to be normalized (for accurate distance calculations)

	};

	THREE.Raycaster.prototype.intersectObject = function ( object, recursive ) {

		var intersects = [];

		if ( recursive === true ) {

			intersectDescendants( object, this, intersects );

		}

		intersectObject( object, this, intersects );

		intersects.sort( descSort );

		return intersects;

	};

	THREE.Raycaster.prototype.intersectObjects = function ( objects, recursive ) {

		var intersects = [];

		for ( var i = 0, l = objects.length; i < l; i ++ ) {

			intersectObject( objects[ i ], this, intersects );

			if ( recursive === true ) {

				intersectDescendants( objects[ i ], this, intersects );

			}

		}

		intersects.sort( descSort );

		return intersects;

	};

}( THREE ) );
/**
 * @author mrdoob / http://mrdoob.com/
 * @author supereggbert / http://www.paulbrunt.co.uk/
 * @author julianwa / https://github.com/julianwa
 */

THREE.Projector = function () {

	var _object, _objectCount, _objectPool = [], _objectPoolLength = 0,
	_vertex, _vertexCount, _vertexPool = [], _vertexPoolLength = 0,
	_face, _face3Count, _face3Pool = [], _face3PoolLength = 0,
	_line, _lineCount, _linePool = [], _linePoolLength = 0,
	_sprite, _spriteCount, _spritePool = [], _spritePoolLength = 0,

	_renderData = { objects: [], sprites: [], lights: [], elements: [] },

	_vector3 = new THREE.Vector3(),
	_vector4 = new THREE.Vector4(),

	_clipBox = new THREE.Box3( new THREE.Vector3( -1, -1, -1 ), new THREE.Vector3( 1, 1, 1 ) ),
	_boundingBox = new THREE.Box3(),
	_points3 = new Array( 3 ),
	_points4 = new Array( 4 ),

	_viewMatrix = new THREE.Matrix4(),
	_viewProjectionMatrix = new THREE.Matrix4(),

	_modelMatrix,
	_modelViewProjectionMatrix = new THREE.Matrix4(),

	_normalMatrix = new THREE.Matrix3(),
	_normalViewMatrix = new THREE.Matrix3(),

	_centroid = new THREE.Vector3(),

	_frustum = new THREE.Frustum(),

	_clippedVertex1PositionScreen = new THREE.Vector4(),
	_clippedVertex2PositionScreen = new THREE.Vector4();

	this.projectVector = function ( vector, camera ) {

		camera.matrixWorldInverse.getInverse( camera.matrixWorld );

		_viewProjectionMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );

		return vector.applyProjection( _viewProjectionMatrix );

	};

	this.unprojectVector = function ( vector, camera ) {

		camera.projectionMatrixInverse.getInverse( camera.projectionMatrix );

		_viewProjectionMatrix.multiplyMatrices( camera.matrixWorld, camera.projectionMatrixInverse );

		return vector.applyProjection( _viewProjectionMatrix );

	};

	this.pickingRay = function ( vector, camera ) {

		// set two vectors with opposing z values
		vector.z = -1.0;
		var end = new THREE.Vector3( vector.x, vector.y, 1.0 );

		this.unprojectVector( vector, camera );
		this.unprojectVector( end, camera );

		// find direction from vector to end
		end.sub( vector ).normalize();

		return new THREE.Raycaster( vector, end );

	};

	var getObject = function ( object ) {

		_object = getNextObjectInPool();
		_object.id = object.id;
		_object.object = object;

		if ( object.renderDepth !== null ) {

			_object.z = object.renderDepth;

		} else {

			_vector3.setFromMatrixPosition( object.matrixWorld );
			_vector3.applyProjection( _viewProjectionMatrix );
			_object.z = _vector3.z;

		}

		return _object;

	};

	var projectObject = function ( object ) {

		if ( object.visible === false ) return;

		if ( object instanceof THREE.Light ) {

			_renderData.lights.push( object );

		} else if ( object instanceof THREE.Mesh || object instanceof THREE.Line ) {

			if ( object.frustumCulled === false || _frustum.intersectsObject( object ) === true ) {

				_renderData.objects.push( getObject( object ) );

			}

		} else if ( object instanceof THREE.Sprite ) {

			_renderData.sprites.push( getObject( object ) );

		}

		for ( var i = 0, l = object.children.length; i < l; i ++ ) {

			projectObject( object.children[ i ] );

		}

	};

	var projectGraph = function ( root, sortObjects ) {

		_objectCount = 0;

		_renderData.objects.length = 0;
		_renderData.sprites.length = 0;
		_renderData.lights.length = 0;

		projectObject( root );

		if ( sortObjects === true ) {

			_renderData.objects.sort( painterSort );

		}

	};

	this.projectScene = function ( scene, camera, sortObjects, sortElements ) {

		var visible = false,
		o, ol, v, vl, f, fl, n, nl, c, cl, u, ul, object,
		geometry, vertices, faces, face, faceVertexNormals, faceVertexUvs, uvs,
		v1, v2, v3, v4, isFaceMaterial, objectMaterials;

		_face3Count = 0;
		_lineCount = 0;
		_spriteCount = 0;

		_renderData.elements.length = 0;

		if ( scene.autoUpdate === true ) scene.updateMatrixWorld();
		if ( camera.parent === undefined ) camera.updateMatrixWorld();

		_viewMatrix.copy( camera.matrixWorldInverse.getInverse( camera.matrixWorld ) );
		_viewProjectionMatrix.multiplyMatrices( camera.projectionMatrix, _viewMatrix );

		_normalViewMatrix.getNormalMatrix( _viewMatrix );

		_frustum.setFromMatrix( _viewProjectionMatrix );

		projectGraph( scene, sortObjects );

		for ( o = 0, ol = _renderData.objects.length; o < ol; o ++ ) {

			object = _renderData.objects[ o ].object;

			_modelMatrix = object.matrixWorld;

			_vertexCount = 0;

			if ( object instanceof THREE.Mesh ) {

				geometry = object.geometry;

				vertices = geometry.vertices;
				faces = geometry.faces;
				faceVertexUvs = geometry.faceVertexUvs;

				_normalMatrix.getNormalMatrix( _modelMatrix );

				isFaceMaterial = object.material instanceof THREE.MeshFaceMaterial;
				objectMaterials = isFaceMaterial === true ? object.material : null;

				for ( v = 0, vl = vertices.length; v < vl; v ++ ) {

					_vertex = getNextVertexInPool();

					_vertex.positionWorld.copy( vertices[ v ] ).applyMatrix4( _modelMatrix );
					_vertex.positionScreen.copy( _vertex.positionWorld ).applyMatrix4( _viewProjectionMatrix );

					var invW = 1 / _vertex.positionScreen.w;

					_vertex.positionScreen.x *= invW;
					_vertex.positionScreen.y *= invW;
					_vertex.positionScreen.z *= invW;

					_vertex.visible = ! ( _vertex.positionScreen.x < -1 || _vertex.positionScreen.x > 1 ||
							      _vertex.positionScreen.y < -1 || _vertex.positionScreen.y > 1 ||
							      _vertex.positionScreen.z < -1 || _vertex.positionScreen.z > 1 );

				}

				for ( f = 0, fl = faces.length; f < fl; f ++ ) {

					face = faces[ f ];

					var material = isFaceMaterial === true
						? objectMaterials.materials[ face.materialIndex ]
						: object.material;

					if ( material === undefined ) continue;

					var side = material.side;

					v1 = _vertexPool[ face.a ];
					v2 = _vertexPool[ face.b ];
					v3 = _vertexPool[ face.c ];

					_points3[ 0 ] = v1.positionScreen;
					_points3[ 1 ] = v2.positionScreen;
					_points3[ 2 ] = v3.positionScreen;

					if ( v1.visible === true || v2.visible === true || v3.visible === true ||
						_clipBox.isIntersectionBox( _boundingBox.setFromPoints( _points3 ) ) ) {

						visible = ( ( v3.positionScreen.x - v1.positionScreen.x ) *
							    ( v2.positionScreen.y - v1.positionScreen.y ) -
							    ( v3.positionScreen.y - v1.positionScreen.y ) *
							    ( v2.positionScreen.x - v1.positionScreen.x ) ) < 0;

						if ( side === THREE.DoubleSide || visible === ( side === THREE.FrontSide ) ) {

							_face = getNextFace3InPool();

							_face.id = object.id;
							_face.v1.copy( v1 );
							_face.v2.copy( v2 );
							_face.v3.copy( v3 );

						} else {

							continue;

						}

					} else {

						continue;

					}

					_face.normalModel.copy( face.normal );

					if ( visible === false && ( side === THREE.BackSide || side === THREE.DoubleSide ) ) {

						_face.normalModel.negate();

					}

					_face.normalModel.applyMatrix3( _normalMatrix ).normalize();

					_face.normalModelView.copy( _face.normalModel ).applyMatrix3( _normalViewMatrix );

					_face.centroidModel.copy( face.centroid ).applyMatrix4( _modelMatrix );

					faceVertexNormals = face.vertexNormals;

					for ( n = 0, nl = Math.min( faceVertexNormals.length, 3 ); n < nl; n ++ ) {

						var normalModel = _face.vertexNormalsModel[ n ];
						normalModel.copy( faceVertexNormals[ n ] );

						if ( visible === false && ( side === THREE.BackSide || side === THREE.DoubleSide ) ) {

							normalModel.negate();

						}

						normalModel.applyMatrix3( _normalMatrix ).normalize();

						var normalModelView = _face.vertexNormalsModelView[ n ];
						normalModelView.copy( normalModel ).applyMatrix3( _normalViewMatrix );

					}

					_face.vertexNormalsLength = faceVertexNormals.length;

					for ( c = 0, cl = Math.min( faceVertexUvs.length, 3 ); c < cl; c ++ ) {

						uvs = faceVertexUvs[ c ][ f ];

						if ( uvs === undefined ) continue;

						for ( u = 0, ul = uvs.length; u < ul; u ++ ) {

							_face.uvs[ c ][ u ] = uvs[ u ];

						}

					}

					_face.color = face.color;
					_face.material = material;

					_centroid.copy( _face.centroidModel ).applyProjection( _viewProjectionMatrix );

					_face.z = _centroid.z;

					_renderData.elements.push( _face );

				}

			} else if ( object instanceof THREE.Line ) {

				_modelViewProjectionMatrix.multiplyMatrices( _viewProjectionMatrix, _modelMatrix );

				vertices = object.geometry.vertices;

				v1 = getNextVertexInPool();
				v1.positionScreen.copy( vertices[ 0 ] ).applyMatrix4( _modelViewProjectionMatrix );

				// Handle LineStrip and LinePieces
				var step = object.type === THREE.LinePieces ? 2 : 1;

				for ( v = 1, vl = vertices.length; v < vl; v ++ ) {

					v1 = getNextVertexInPool();
					v1.positionScreen.copy( vertices[ v ] ).applyMatrix4( _modelViewProjectionMatrix );

					if ( ( v + 1 ) % step > 0 ) continue;

					v2 = _vertexPool[ _vertexCount - 2 ];

					_clippedVertex1PositionScreen.copy( v1.positionScreen );
					_clippedVertex2PositionScreen.copy( v2.positionScreen );

					if ( clipLine( _clippedVertex1PositionScreen, _clippedVertex2PositionScreen ) === true ) {

						// Perform the perspective divide
						_clippedVertex1PositionScreen.multiplyScalar( 1 / _clippedVertex1PositionScreen.w );
						_clippedVertex2PositionScreen.multiplyScalar( 1 / _clippedVertex2PositionScreen.w );

						_line = getNextLineInPool();

						_line.id = object.id;
						_line.v1.positionScreen.copy( _clippedVertex1PositionScreen );
						_line.v2.positionScreen.copy( _clippedVertex2PositionScreen );

						_line.z = Math.max( _clippedVertex1PositionScreen.z, _clippedVertex2PositionScreen.z );

						_line.material = object.material;

						if ( object.material.vertexColors === THREE.VertexColors ) {

							_line.vertexColors[ 0 ].copy( object.geometry.colors[ v ] );
							_line.vertexColors[ 1 ].copy( object.geometry.colors[ v - 1 ] );

						}

						_renderData.elements.push( _line );

					}

				}

			}

		}

		for ( o = 0, ol = _renderData.sprites.length; o < ol; o++ ) {

			object = _renderData.sprites[ o ].object;

			_modelMatrix = object.matrixWorld;

			_vector4.set( _modelMatrix.elements[12], _modelMatrix.elements[13], _modelMatrix.elements[14], 1 );
			_vector4.applyMatrix4( _viewProjectionMatrix );

			var invW = 1 / _vector4.w;

			_vector4.z *= invW;

			if ( _vector4.z >= -1 && _vector4.z <= 1 ) {

				_sprite = getNextSpriteInPool();
				_sprite.id = object.id;
				_sprite.x = _vector4.x * invW;
				_sprite.y = _vector4.y * invW;
				_sprite.z = _vector4.z;
				_sprite.object = object;

				_sprite.rotation = object.rotation;

				_sprite.scale.x = object.scale.x * Math.abs( _sprite.x - ( _vector4.x + camera.projectionMatrix.elements[0] ) / ( _vector4.w + camera.projectionMatrix.elements[12] ) );
				_sprite.scale.y = object.scale.y * Math.abs( _sprite.y - ( _vector4.y + camera.projectionMatrix.elements[5] ) / ( _vector4.w + camera.projectionMatrix.elements[13] ) );

				_sprite.material = object.material;

				_renderData.elements.push( _sprite );

			}

		}

		if ( sortElements === true ) _renderData.elements.sort( painterSort );

		return _renderData;

	};

	// Pools

	function getNextObjectInPool() {

		if ( _objectCount === _objectPoolLength ) {

			var object = new THREE.RenderableObject();
			_objectPool.push( object );
			_objectPoolLength ++;
			_objectCount ++;
			return object;

		}

		return _objectPool[ _objectCount ++ ];

	}

	function getNextVertexInPool() {

		if ( _vertexCount === _vertexPoolLength ) {

			var vertex = new THREE.RenderableVertex();
			_vertexPool.push( vertex );
			_vertexPoolLength ++;
			_vertexCount ++;
			return vertex;

		}

		return _vertexPool[ _vertexCount ++ ];

	}

	function getNextFace3InPool() {

		if ( _face3Count === _face3PoolLength ) {

			var face = new THREE.RenderableFace3();
			_face3Pool.push( face );
			_face3PoolLength ++;
			_face3Count ++;
			return face;

		}

		return _face3Pool[ _face3Count ++ ];


	}

	function getNextLineInPool() {

		if ( _lineCount === _linePoolLength ) {

			var line = new THREE.RenderableLine();
			_linePool.push( line );
			_linePoolLength ++;
			_lineCount ++
			return line;

		}

		return _linePool[ _lineCount ++ ];

	}

	function getNextSpriteInPool() {

		if ( _spriteCount === _spritePoolLength ) {

			var sprite = new THREE.RenderableSprite();
			_spritePool.push( sprite );
			_spritePoolLength ++;
			_spriteCount ++
			return sprite;

		}

		return _spritePool[ _spriteCount ++ ];

	}

	//

	function painterSort( a, b ) {

		if ( a.z !== b.z ) {

			return b.z - a.z;

		} else if ( a.id !== b.id ) {

			return a.id - b.id;

		} else {

			return 0;

		}

	}

	function clipLine( s1, s2 ) {

		var alpha1 = 0, alpha2 = 1,

		// Calculate the boundary coordinate of each vertex for the near and far clip planes,
		// Z = -1 and Z = +1, respectively.
		bc1near =  s1.z + s1.w,
		bc2near =  s2.z + s2.w,
		bc1far =  - s1.z + s1.w,
		bc2far =  - s2.z + s2.w;

		if ( bc1near >= 0 && bc2near >= 0 && bc1far >= 0 && bc2far >= 0 ) {

			// Both vertices lie entirely within all clip planes.
			return true;

		} else if ( ( bc1near < 0 && bc2near < 0) || (bc1far < 0 && bc2far < 0 ) ) {

			// Both vertices lie entirely outside one of the clip planes.
			return false;

		} else {

			// The line segment spans at least one clip plane.

			if ( bc1near < 0 ) {

				// v1 lies outside the near plane, v2 inside
				alpha1 = Math.max( alpha1, bc1near / ( bc1near - bc2near ) );

			} else if ( bc2near < 0 ) {

				// v2 lies outside the near plane, v1 inside
				alpha2 = Math.min( alpha2, bc1near / ( bc1near - bc2near ) );

			}

			if ( bc1far < 0 ) {

				// v1 lies outside the far plane, v2 inside
				alpha1 = Math.max( alpha1, bc1far / ( bc1far - bc2far ) );

			} else if ( bc2far < 0 ) {

				// v2 lies outside the far plane, v2 inside
				alpha2 = Math.min( alpha2, bc1far / ( bc1far - bc2far ) );

			}

			if ( alpha2 < alpha1 ) {

				// The line segment spans two boundaries, but is outside both of them.
				// (This can't happen when we're only clipping against just near/far but good
				//  to leave the check here for future usage if other clip planes are added.)
				return false;

			} else {

				// Update the s1 and s2 vertices to match the clipped line segment.
				s1.lerp( s2, alpha1 );
				s2.lerp( s1, 1 - alpha2 );

				return true;

			}

		}

	}

};
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author szimek / https://github.com/szimek/
 */

THREE.Texture = function ( image, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy ) {

	this.id = THREE.TextureIdCount ++;
	this.uuid = THREE.Math.generateUUID();

	this.name = '';

	this.image = image;
	this.mipmaps = [];

	this.mapping = mapping !== undefined ? mapping : new THREE.UVMapping();

	this.wrapS = wrapS !== undefined ? wrapS : THREE.ClampToEdgeWrapping;
	this.wrapT = wrapT !== undefined ? wrapT : THREE.ClampToEdgeWrapping;

	this.magFilter = magFilter !== undefined ? magFilter : THREE.LinearFilter;
	this.minFilter = minFilter !== undefined ? minFilter : THREE.LinearMipMapLinearFilter;

	this.anisotropy = anisotropy !== undefined ? anisotropy : 1;

	this.format = format !== undefined ? format : THREE.RGBAFormat;
	this.type = type !== undefined ? type : THREE.UnsignedByteType;

	this.offset = new THREE.Vector2( 0, 0 );
	this.repeat = new THREE.Vector2( 1, 1 );

	this.generateMipmaps = true;
	this.premultiplyAlpha = false;
	this.flipY = true;
	this.unpackAlignment = 4; // valid values: 1, 2, 4, 8 (see http://www.khronos.org/opengles/sdk/docs/man/xhtml/glPixelStorei.xml)

	this.needsUpdate = false;
	this.onUpdate = null;

};

THREE.Texture.prototype = {

	constructor: THREE.Texture,

	clone: function ( texture ) {

		if ( texture === undefined ) texture = new THREE.Texture();

		texture.image = this.image;
		texture.mipmaps = this.mipmaps.slice(0);

		texture.mapping = this.mapping;

		texture.wrapS = this.wrapS;
		texture.wrapT = this.wrapT;

		texture.magFilter = this.magFilter;
		texture.minFilter = this.minFilter;

		texture.anisotropy = this.anisotropy;

		texture.format = this.format;
		texture.type = this.type;

		texture.offset.copy( this.offset );
		texture.repeat.copy( this.repeat );

		texture.generateMipmaps = this.generateMipmaps;
		texture.premultiplyAlpha = this.premultiplyAlpha;
		texture.flipY = this.flipY;
		texture.unpackAlignment = this.unpackAlignment;

		return texture;

	},

	dispose: function () {

		this.dispatchEvent( { type: 'dispose' } );

	}

};

THREE.EventDispatcher.prototype.apply( THREE.Texture.prototype );

THREE.TextureIdCount = 0;
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */

THREE.Material = function () {

	this.id = THREE.MaterialIdCount ++;
	this.uuid = THREE.Math.generateUUID();

	this.name = '';

	this.side = THREE.FrontSide;

	this.opacity = 1;
	this.transparent = false;

	this.blending = THREE.NormalBlending;

	this.blendSrc = THREE.SrcAlphaFactor;
	this.blendDst = THREE.OneMinusSrcAlphaFactor;
	this.blendEquation = THREE.AddEquation;

	this.depthTest = true;
	this.depthWrite = true;

	this.polygonOffset = false;
	this.polygonOffsetFactor = 0;
	this.polygonOffsetUnits = 0;

	this.alphaTest = 0;

	this.overdraw = 0; // Overdrawn pixels (typically between 0 and 1) for fixing antialiasing gaps in CanvasRenderer

	this.visible = true;

	this.needsUpdate = true;

};

THREE.Material.prototype = {

	constructor: THREE.Material,

	setValues: function ( values ) {

		if ( values === undefined ) return;

		for ( var key in values ) {

			var newValue = values[ key ];

			if ( newValue === undefined ) {

				console.warn( 'THREE.Material: \'' + key + '\' parameter is undefined.' );
				continue;

			}

			if ( key in this ) {

				var currentValue = this[ key ];

				if ( currentValue instanceof THREE.Color ) {

					currentValue.set( newValue );

				} else if ( currentValue instanceof THREE.Vector3 && newValue instanceof THREE.Vector3 ) {

					currentValue.copy( newValue );

				} else if ( key == 'overdraw') {

					// ensure overdraw is backwards-compatable with legacy boolean type
					this[ key ] = Number(newValue);

				} else {

					this[ key ] = newValue;

				}

			}

		}

	},

	clone: function ( material ) {

		if ( material === undefined ) material = new THREE.Material();

		material.name = this.name;

		material.side = this.side;

		material.opacity = this.opacity;
		material.transparent = this.transparent;

		material.blending = this.blending;

		material.blendSrc = this.blendSrc;
		material.blendDst = this.blendDst;
		material.blendEquation = this.blendEquation;

		material.depthTest = this.depthTest;
		material.depthWrite = this.depthWrite;

		material.polygonOffset = this.polygonOffset;
		material.polygonOffsetFactor = this.polygonOffsetFactor;
		material.polygonOffsetUnits = this.polygonOffsetUnits;

		material.alphaTest = this.alphaTest;

		material.overdraw = this.overdraw;

		material.visible = this.visible;

		return material;

	},

	dispose: function () {

		this.dispatchEvent( { type: 'dispose' } );

	}

};

THREE.EventDispatcher.prototype.apply( THREE.Material.prototype );

THREE.MaterialIdCount = 0;
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * parameters = {
 *  fragmentShader: <string>,
 *  vertexShader: <string>,
 *
 *  uniforms: { "parameter1": { type: "f", value: 1.0 }, "parameter2": { type: "i" value2: 2 } },
 *
 *  defines: { "label" : "value" },
 *
 *  shading: THREE.SmoothShading,
 *  blending: THREE.NormalBlending,
 *  depthTest: <bool>,
 *  depthWrite: <bool>,
 *
 *  wireframe: <boolean>,
 *  wireframeLinewidth: <float>,
 *
 *  lights: <bool>,
 *
 *  vertexColors: THREE.NoColors / THREE.VertexColors / THREE.FaceColors,
 *
 *  skinning: <bool>,
 *  morphTargets: <bool>,
 *  morphNormals: <bool>,
 *
 *	fog: <bool>
 * }
 */

THREE.ShaderMaterial = function ( parameters ) {

	THREE.Material.call( this );

	this.fragmentShader = "void main() {}";
	this.vertexShader = "void main() {}";
	this.uniforms = {};
	this.defines = {};
	this.attributes = null;

	this.shading = THREE.SmoothShading;

	this.linewidth = 1;

	this.wireframe = false;
	this.wireframeLinewidth = 1;

	this.fog = false; // set to use scene fog

	this.lights = false; // set to use scene lights

	this.vertexColors = THREE.NoColors; // set to use "color" attribute stream

	this.skinning = false; // set to use skinning attribute streams

	this.morphTargets = false; // set to use morph targets
	this.morphNormals = false; // set to use morph normals

	// When rendered geometry doesn't include these attributes but the material does,
	// use these default values in WebGL. This avoids errors when buffer data is missing.
	this.defaultAttributeValues = {
		"color" : [ 1, 1, 1],
		"uv" : [ 0, 0 ],
		"uv2" : [ 0, 0 ]
	};

	// By default, bind position to attribute index 0. In WebGL, attribute 0
	// should always be used to avoid potentially expensive emulation.
	this.index0AttributeName = "position";

	this.setValues( parameters );

};

THREE.ShaderMaterial.prototype = Object.create( THREE.Material.prototype );

THREE.ShaderMaterial.prototype.clone = function () {

	var material = new THREE.ShaderMaterial();

	THREE.Material.prototype.clone.call( this, material );

	material.fragmentShader = this.fragmentShader;
	material.vertexShader = this.vertexShader;

	material.uniforms = THREE.UniformsUtils.clone( this.uniforms );

	material.attributes = this.attributes;
	material.defines = this.defines;

	material.shading = this.shading;

	material.wireframe = this.wireframe;
	material.wireframeLinewidth = this.wireframeLinewidth;

	material.fog = this.fog;

	material.lights = this.lights;

	material.vertexColors = this.vertexColors;

	material.skinning = this.skinning;

	material.morphTargets = this.morphTargets;
	material.morphNormals = this.morphNormals;

	return material;

};
/**
 * Uniforms library for shared webgl shaders
 */

THREE.UniformsLib = {

	common: {

		"diffuse" : { type: "c", value: new THREE.Color( 0xeeeeee ) },
		"opacity" : { type: "f", value: 1.0 },

		"map" : { type: "t", value: null },
		"offsetRepeat" : { type: "v4", value: new THREE.Vector4( 0, 0, 1, 1 ) },

		"lightMap" : { type: "t", value: null },
		"specularMap" : { type: "t", value: null },

		"envMap" : { type: "t", value: null },
		"flipEnvMap" : { type: "f", value: -1 },
		"useRefract" : { type: "i", value: 0 },
		"reflectivity" : { type: "f", value: 1.0 },
		"refractionRatio" : { type: "f", value: 0.98 },
		"combine" : { type: "i", value: 0 },

		"morphTargetInfluences" : { type: "f", value: 0 }

	},

	bump: {

		"bumpMap" : { type: "t", value: null },
		"bumpScale" : { type: "f", value: 1 }

	},

	normalmap: {

		"normalMap" : { type: "t", value: null },
		"normalScale" : { type: "v2", value: new THREE.Vector2( 1, 1 ) }
	},

	fog : {

		"fogDensity" : { type: "f", value: 0.00025 },
		"fogNear" : { type: "f", value: 1 },
		"fogFar" : { type: "f", value: 2000 },
		"fogColor" : { type: "c", value: new THREE.Color( 0xffffff ) }

	},

	lights: {

		"ambientLightColor" : { type: "fv", value: [] },

		"directionalLightDirection" : { type: "fv", value: [] },
		"directionalLightColor" : { type: "fv", value: [] },

		"hemisphereLightDirection" : { type: "fv", value: [] },
		"hemisphereLightSkyColor" : { type: "fv", value: [] },
		"hemisphereLightGroundColor" : { type: "fv", value: [] },

		"pointLightColor" : { type: "fv", value: [] },
		"pointLightPosition" : { type: "fv", value: [] },
		"pointLightDistance" : { type: "fv1", value: [] },

		"spotLightColor" : { type: "fv", value: [] },
		"spotLightPosition" : { type: "fv", value: [] },
		"spotLightDirection" : { type: "fv", value: [] },
		"spotLightDistance" : { type: "fv1", value: [] },
		"spotLightAngleCos" : { type: "fv1", value: [] },
		"spotLightExponent" : { type: "fv1", value: [] }

	},

	particle: {

		"psColor" : { type: "c", value: new THREE.Color( 0xeeeeee ) },
		"opacity" : { type: "f", value: 1.0 },
		"size" : { type: "f", value: 1.0 },
		"scale" : { type: "f", value: 1.0 },
		"map" : { type: "t", value: null },

		"fogDensity" : { type: "f", value: 0.00025 },
		"fogNear" : { type: "f", value: 1 },
		"fogFar" : { type: "f", value: 2000 },
		"fogColor" : { type: "c", value: new THREE.Color( 0xffffff ) }

	},

	shadowmap: {

		"shadowMap": { type: "tv", value: [] },
		"shadowMapSize": { type: "v2v", value: [] },

		"shadowBias" : { type: "fv1", value: [] },
		"shadowDarkness": { type: "fv1", value: [] },

		"shadowMatrix" : { type: "m4v", value: [] }

	}

};/**
 * @author szimek / https://github.com/szimek/
 * @author alteredq / http://alteredqualia.com/
 */

THREE.WebGLRenderTarget = function ( width, height, options ) {

	this.width = width;
	this.height = height;

	options = options || {};

	this.wrapS = options.wrapS !== undefined ? options.wrapS : THREE.ClampToEdgeWrapping;
	this.wrapT = options.wrapT !== undefined ? options.wrapT : THREE.ClampToEdgeWrapping;

	this.magFilter = options.magFilter !== undefined ? options.magFilter : THREE.LinearFilter;
	this.minFilter = options.minFilter !== undefined ? options.minFilter : THREE.LinearMipMapLinearFilter;

	this.anisotropy = options.anisotropy !== undefined ? options.anisotropy : 1;

	this.offset = new THREE.Vector2( 0, 0 );
	this.repeat = new THREE.Vector2( 1, 1 );

	this.format = options.format !== undefined ? options.format : THREE.RGBAFormat;
	this.type = options.type !== undefined ? options.type : THREE.UnsignedByteType;

	this.depthBuffer = options.depthBuffer !== undefined ? options.depthBuffer : true;
	this.stencilBuffer = options.stencilBuffer !== undefined ? options.stencilBuffer : true;

	this.generateMipmaps = true;

	this.shareDepthFrom = null;

};

THREE.WebGLRenderTarget.prototype = {

	constructor: THREE.WebGLRenderTarget,

	clone: function () {

		var tmp = new THREE.WebGLRenderTarget( this.width, this.height );

		tmp.wrapS = this.wrapS;
		tmp.wrapT = this.wrapT;

		tmp.magFilter = this.magFilter;
		tmp.minFilter = this.minFilter;

		tmp.anisotropy = this.anisotropy;

		tmp.offset.copy( this.offset );
		tmp.repeat.copy( this.repeat );

		tmp.format = this.format;
		tmp.type = this.type;

		tmp.depthBuffer = this.depthBuffer;
		tmp.stencilBuffer = this.stencilBuffer;

		tmp.generateMipmaps = this.generateMipmaps;

		tmp.shareDepthFrom = this.shareDepthFrom;

		return tmp;

	},

	dispose: function () {

		this.dispatchEvent( { type: 'dispose' } );

	}

};

THREE.EventDispatcher.prototype.apply( THREE.WebGLRenderTarget.prototype );
/**
 * @author alteredq / http://alteredqualia.com
 */

THREE.WebGLRenderTargetCube = function ( width, height, options ) {

	THREE.WebGLRenderTarget.call( this, width, height, options );

	this.activeCubeFace = 0; // PX 0, NX 1, PY 2, NY 3, PZ 4, NZ 5

};

THREE.WebGLRenderTargetCube.prototype = Object.create( THREE.WebGLRenderTarget.prototype );
/**
 * Uniform Utilities
 */

THREE.UniformsUtils = {

	merge: function ( uniforms ) {

		var u, p, tmp, merged = {};

		for ( u = 0; u < uniforms.length; u ++ ) {

			tmp = this.clone( uniforms[ u ] );

			for ( p in tmp ) {

				merged[ p ] = tmp[ p ];

			}

		}

		return merged;

	},

	clone: function ( uniforms_src ) {

		var u, p, parameter, parameter_src, uniforms_dst = {};

		for ( u in uniforms_src ) {

			uniforms_dst[ u ] = {};

			for ( p in uniforms_src[ u ] ) {

				parameter_src = uniforms_src[ u ][ p ];

				if ( parameter_src instanceof THREE.Color ||
					 parameter_src instanceof THREE.Vector2 ||
					 parameter_src instanceof THREE.Vector3 ||
					 parameter_src instanceof THREE.Vector4 ||
					 parameter_src instanceof THREE.Matrix4 ||
					 parameter_src instanceof THREE.Texture ) {

					uniforms_dst[ u ][ p ] = parameter_src.clone();

				} else if ( parameter_src instanceof Array ) {

					uniforms_dst[ u ][ p ] = parameter_src.slice();

				} else {

					uniforms_dst[ u ][ p ] = parameter_src;

				}

			}

		}

		return uniforms_dst;

	}

};/**
 * Shader chunks for WebLG Shader library
 * 
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 * @author mikael emtinger / http://gomo.se/
 */

THREE.ShaderChunk = {

	// FOG

	fog_pars_fragment: [

		"#ifdef USE_FOG",

			"uniform vec3 fogColor;",

			"#ifdef FOG_EXP2",

				"uniform float fogDensity;",

			"#else",

				"uniform float fogNear;",
				"uniform float fogFar;",

			"#endif",

		"#endif"

	].join("\n"),

	fog_fragment: [

		"#ifdef USE_FOG",

			"float depth = gl_FragCoord.z / gl_FragCoord.w;",

			"#ifdef FOG_EXP2",

				"const float LOG2 = 1.442695;",
				"float fogFactor = exp2( - fogDensity * fogDensity * depth * depth * LOG2 );",
				"fogFactor = 1.0 - clamp( fogFactor, 0.0, 1.0 );",

			"#else",

				"float fogFactor = smoothstep( fogNear, fogFar, depth );",

			"#endif",

			"gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );",

		"#endif"

	].join("\n"),

	// ENVIRONMENT MAP

	envmap_pars_fragment: [

		"#ifdef USE_ENVMAP",

			"uniform float reflectivity;",
			"uniform samplerCube envMap;",
			"uniform float flipEnvMap;",
			"uniform int combine;",

			"#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP )",

				"uniform bool useRefract;",
				"uniform float refractionRatio;",

			"#else",

				"varying vec3 vReflect;",

			"#endif",

		"#endif"

	].join("\n"),

	envmap_fragment: [

		"#ifdef USE_ENVMAP",

			"vec3 reflectVec;",

			"#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP )",

				"vec3 cameraToVertex = normalize( vWorldPosition - cameraPosition );",

				"if ( useRefract ) {",

					"reflectVec = refract( cameraToVertex, normal, refractionRatio );",

				"} else { ",

					"reflectVec = reflect( cameraToVertex, normal );",

				"}",

			"#else",

				"reflectVec = vReflect;",

			"#endif",

			"#ifdef DOUBLE_SIDED",

				"float flipNormal = ( -1.0 + 2.0 * float( gl_FrontFacing ) );",
				"vec4 cubeColor = textureCube( envMap, flipNormal * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );",

			"#else",

				"vec4 cubeColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );",

			"#endif",

			"#ifdef GAMMA_INPUT",

				"cubeColor.xyz *= cubeColor.xyz;",

			"#endif",

			"if ( combine == 1 ) {",

				"gl_FragColor.xyz = mix( gl_FragColor.xyz, cubeColor.xyz, specularStrength * reflectivity );",

			"} else if ( combine == 2 ) {",

				"gl_FragColor.xyz += cubeColor.xyz * specularStrength * reflectivity;",

			"} else {",

				"gl_FragColor.xyz = mix( gl_FragColor.xyz, gl_FragColor.xyz * cubeColor.xyz, specularStrength * reflectivity );",

			"}",

		"#endif"

	].join("\n"),

	envmap_pars_vertex: [

		"#if defined( USE_ENVMAP ) && ! defined( USE_BUMPMAP ) && ! defined( USE_NORMALMAP )",

			"varying vec3 vReflect;",

			"uniform float refractionRatio;",
			"uniform bool useRefract;",

		"#endif"

	].join("\n"),

	worldpos_vertex : [

		"#if defined( USE_ENVMAP ) || defined( PHONG ) || defined( LAMBERT ) || defined ( USE_SHADOWMAP )",

			"#ifdef USE_SKINNING",

				"vec4 worldPosition = modelMatrix * skinned;",

			"#endif",

			"#if defined( USE_MORPHTARGETS ) && ! defined( USE_SKINNING )",

				"vec4 worldPosition = modelMatrix * vec4( morphed, 1.0 );",

			"#endif",

			"#if ! defined( USE_MORPHTARGETS ) && ! defined( USE_SKINNING )",

				"vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",

			"#endif",

		"#endif"

	].join("\n"),

	envmap_vertex : [

		"#if defined( USE_ENVMAP ) && ! defined( USE_BUMPMAP ) && ! defined( USE_NORMALMAP )",

			"vec3 worldNormal = mat3( modelMatrix[ 0 ].xyz, modelMatrix[ 1 ].xyz, modelMatrix[ 2 ].xyz ) * objectNormal;",
			"worldNormal = normalize( worldNormal );",

			"vec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );",

			"if ( useRefract ) {",

				"vReflect = refract( cameraToVertex, worldNormal, refractionRatio );",

			"} else {",

				"vReflect = reflect( cameraToVertex, worldNormal );",

			"}",

		"#endif"

	].join("\n"),

	// COLOR MAP (particles)

	map_particle_pars_fragment: [

		"#ifdef USE_MAP",

			"uniform sampler2D map;",

		"#endif"

	].join("\n"),


	map_particle_fragment: [

		"#ifdef USE_MAP",

			"gl_FragColor = gl_FragColor * texture2D( map, vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y ) );",

		"#endif"

	].join("\n"),

	// COLOR MAP (triangles)

	map_pars_vertex: [

		"#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP )",

			"varying vec2 vUv;",
			"uniform vec4 offsetRepeat;",

		"#endif"

	].join("\n"),

	map_pars_fragment: [

		"#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP )",

			"varying vec2 vUv;",

		"#endif",

		"#ifdef USE_MAP",

			"uniform sampler2D map;",

		"#endif"

	].join("\n"),

	map_vertex: [

		"#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP )",

			"vUv = uv * offsetRepeat.zw + offsetRepeat.xy;",

		"#endif"

	].join("\n"),

	map_fragment: [

		"#ifdef USE_MAP",

			"vec4 texelColor = texture2D( map, vUv );",

			"#ifdef GAMMA_INPUT",

				"texelColor.xyz *= texelColor.xyz;",

			"#endif",

			"gl_FragColor = gl_FragColor * texelColor;",

		"#endif"

	].join("\n"),

	// LIGHT MAP

	lightmap_pars_fragment: [

		"#ifdef USE_LIGHTMAP",

			"varying vec2 vUv2;",
			"uniform sampler2D lightMap;",

		"#endif"

	].join("\n"),

	lightmap_pars_vertex: [

		"#ifdef USE_LIGHTMAP",

			"varying vec2 vUv2;",

		"#endif"

	].join("\n"),

	lightmap_fragment: [

		"#ifdef USE_LIGHTMAP",

			"gl_FragColor = gl_FragColor * texture2D( lightMap, vUv2 );",

		"#endif"

	].join("\n"),

	lightmap_vertex: [

		"#ifdef USE_LIGHTMAP",

			"vUv2 = uv2;",

		"#endif"

	].join("\n"),

	// BUMP MAP

	bumpmap_pars_fragment: [

		"#ifdef USE_BUMPMAP",

			"uniform sampler2D bumpMap;",
			"uniform float bumpScale;",

			// Derivative maps - bump mapping unparametrized surfaces by Morten Mikkelsen
			//	http://mmikkelsen3d.blogspot.sk/2011/07/derivative-maps.html

			// Evaluate the derivative of the height w.r.t. screen-space using forward differencing (listing 2)

			"vec2 dHdxy_fwd() {",

				"vec2 dSTdx = dFdx( vUv );",
				"vec2 dSTdy = dFdy( vUv );",

				"float Hll = bumpScale * texture2D( bumpMap, vUv ).x;",
				"float dBx = bumpScale * texture2D( bumpMap, vUv + dSTdx ).x - Hll;",
				"float dBy = bumpScale * texture2D( bumpMap, vUv + dSTdy ).x - Hll;",

				"return vec2( dBx, dBy );",

			"}",

			"vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy ) {",

				"vec3 vSigmaX = dFdx( surf_pos );",
				"vec3 vSigmaY = dFdy( surf_pos );",
				"vec3 vN = surf_norm;",		// normalized

				"vec3 R1 = cross( vSigmaY, vN );",
				"vec3 R2 = cross( vN, vSigmaX );",

				"float fDet = dot( vSigmaX, R1 );",

				"vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );",
				"return normalize( abs( fDet ) * surf_norm - vGrad );",

			"}",

		"#endif"

	].join("\n"),

	// NORMAL MAP

	normalmap_pars_fragment: [

		"#ifdef USE_NORMALMAP",

			"uniform sampler2D normalMap;",
			"uniform vec2 normalScale;",

			// Per-Pixel Tangent Space Normal Mapping
			// http://hacksoflife.blogspot.ch/2009/11/per-pixel-tangent-space-normal-mapping.html

			"vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm ) {",

				"vec3 q0 = dFdx( eye_pos.xyz );",
				"vec3 q1 = dFdy( eye_pos.xyz );",
				"vec2 st0 = dFdx( vUv.st );",
				"vec2 st1 = dFdy( vUv.st );",

				"vec3 S = normalize(  q0 * st1.t - q1 * st0.t );",
				"vec3 T = normalize( -q0 * st1.s + q1 * st0.s );",
				"vec3 N = normalize( surf_norm );",

				"vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;",
				"mapN.xy = normalScale * mapN.xy;",
				"mat3 tsn = mat3( S, T, N );",
				"return normalize( tsn * mapN );",

			"}",

		"#endif"

	].join("\n"),

	// SPECULAR MAP

	specularmap_pars_fragment: [

		"#ifdef USE_SPECULARMAP",

			"uniform sampler2D specularMap;",

		"#endif"

	].join("\n"),

	specularmap_fragment: [

		"float specularStrength;",

		"#ifdef USE_SPECULARMAP",

			"vec4 texelSpecular = texture2D( specularMap, vUv );",
			"specularStrength = texelSpecular.r;",

		"#else",

			"specularStrength = 1.0;",

		"#endif"

	].join("\n"),

	// LIGHTS LAMBERT

	lights_lambert_pars_vertex: [

		"uniform vec3 ambient;",
		"uniform vec3 diffuse;",
		"uniform vec3 emissive;",

		"uniform vec3 ambientLightColor;",

		"#if MAX_DIR_LIGHTS > 0",

			"uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];",
			"uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];",

		"#endif",

		"#if MAX_HEMI_LIGHTS > 0",

			"uniform vec3 hemisphereLightSkyColor[ MAX_HEMI_LIGHTS ];",
			"uniform vec3 hemisphereLightGroundColor[ MAX_HEMI_LIGHTS ];",
			"uniform vec3 hemisphereLightDirection[ MAX_HEMI_LIGHTS ];",

		"#endif",

		"#if MAX_POINT_LIGHTS > 0",

			"uniform vec3 pointLightColor[ MAX_POINT_LIGHTS ];",
			"uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];",
			"uniform float pointLightDistance[ MAX_POINT_LIGHTS ];",

		"#endif",

		"#if MAX_SPOT_LIGHTS > 0",

			"uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];",
			"uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ];",
			"uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];",
			"uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];",
			"uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];",
			"uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];",

		"#endif",

		"#ifdef WRAP_AROUND",

			"uniform vec3 wrapRGB;",

		"#endif"

	].join("\n"),

	lights_lambert_vertex: [

		"vLightFront = vec3( 0.0 );",

		"#ifdef DOUBLE_SIDED",

			"vLightBack = vec3( 0.0 );",

		"#endif",

		"transformedNormal = normalize( transformedNormal );",

		"#if MAX_DIR_LIGHTS > 0",

		"for( int i = 0; i < MAX_DIR_LIGHTS; i ++ ) {",

			"vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );",
			"vec3 dirVector = normalize( lDirection.xyz );",

			"float dotProduct = dot( transformedNormal, dirVector );",
			"vec3 directionalLightWeighting = vec3( max( dotProduct, 0.0 ) );",

			"#ifdef DOUBLE_SIDED",

				"vec3 directionalLightWeightingBack = vec3( max( -dotProduct, 0.0 ) );",

				"#ifdef WRAP_AROUND",

					"vec3 directionalLightWeightingHalfBack = vec3( max( -0.5 * dotProduct + 0.5, 0.0 ) );",

				"#endif",

			"#endif",

			"#ifdef WRAP_AROUND",

				"vec3 directionalLightWeightingHalf = vec3( max( 0.5 * dotProduct + 0.5, 0.0 ) );",
				"directionalLightWeighting = mix( directionalLightWeighting, directionalLightWeightingHalf, wrapRGB );",

				"#ifdef DOUBLE_SIDED",

					"directionalLightWeightingBack = mix( directionalLightWeightingBack, directionalLightWeightingHalfBack, wrapRGB );",

				"#endif",

			"#endif",

			"vLightFront += directionalLightColor[ i ] * directionalLightWeighting;",

			"#ifdef DOUBLE_SIDED",

				"vLightBack += directionalLightColor[ i ] * directionalLightWeightingBack;",

			"#endif",

		"}",

		"#endif",

		"#if MAX_POINT_LIGHTS > 0",

			"for( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {",

				"vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );",
				"vec3 lVector = lPosition.xyz - mvPosition.xyz;",

				"float lDistance = 1.0;",
				"if ( pointLightDistance[ i ] > 0.0 )",
					"lDistance = 1.0 - min( ( length( lVector ) / pointLightDistance[ i ] ), 1.0 );",

				"lVector = normalize( lVector );",
				"float dotProduct = dot( transformedNormal, lVector );",

				"vec3 pointLightWeighting = vec3( max( dotProduct, 0.0 ) );",

				"#ifdef DOUBLE_SIDED",

					"vec3 pointLightWeightingBack = vec3( max( -dotProduct, 0.0 ) );",

					"#ifdef WRAP_AROUND",

						"vec3 pointLightWeightingHalfBack = vec3( max( -0.5 * dotProduct + 0.5, 0.0 ) );",

					"#endif",

				"#endif",

				"#ifdef WRAP_AROUND",

					"vec3 pointLightWeightingHalf = vec3( max( 0.5 * dotProduct + 0.5, 0.0 ) );",
					"pointLightWeighting = mix( pointLightWeighting, pointLightWeightingHalf, wrapRGB );",

					"#ifdef DOUBLE_SIDED",

						"pointLightWeightingBack = mix( pointLightWeightingBack, pointLightWeightingHalfBack, wrapRGB );",

					"#endif",

				"#endif",

				"vLightFront += pointLightColor[ i ] * pointLightWeighting * lDistance;",

				"#ifdef DOUBLE_SIDED",

					"vLightBack += pointLightColor[ i ] * pointLightWeightingBack * lDistance;",

				"#endif",

			"}",

		"#endif",

		"#if MAX_SPOT_LIGHTS > 0",

			"for( int i = 0; i < MAX_SPOT_LIGHTS; i ++ ) {",

				"vec4 lPosition = viewMatrix * vec4( spotLightPosition[ i ], 1.0 );",
				"vec3 lVector = lPosition.xyz - mvPosition.xyz;",

				"float spotEffect = dot( spotLightDirection[ i ], normalize( spotLightPosition[ i ] - worldPosition.xyz ) );",

				"if ( spotEffect > spotLightAngleCos[ i ] ) {",

					"spotEffect = max( pow( spotEffect, spotLightExponent[ i ] ), 0.0 );",

					"float lDistance = 1.0;",
					"if ( spotLightDistance[ i ] > 0.0 )",
						"lDistance = 1.0 - min( ( length( lVector ) / spotLightDistance[ i ] ), 1.0 );",

					"lVector = normalize( lVector );",

					"float dotProduct = dot( transformedNormal, lVector );",
					"vec3 spotLightWeighting = vec3( max( dotProduct, 0.0 ) );",

					"#ifdef DOUBLE_SIDED",

						"vec3 spotLightWeightingBack = vec3( max( -dotProduct, 0.0 ) );",

						"#ifdef WRAP_AROUND",

							"vec3 spotLightWeightingHalfBack = vec3( max( -0.5 * dotProduct + 0.5, 0.0 ) );",

						"#endif",

					"#endif",

					"#ifdef WRAP_AROUND",

						"vec3 spotLightWeightingHalf = vec3( max( 0.5 * dotProduct + 0.5, 0.0 ) );",
						"spotLightWeighting = mix( spotLightWeighting, spotLightWeightingHalf, wrapRGB );",

						"#ifdef DOUBLE_SIDED",

							"spotLightWeightingBack = mix( spotLightWeightingBack, spotLightWeightingHalfBack, wrapRGB );",

						"#endif",

					"#endif",

					"vLightFront += spotLightColor[ i ] * spotLightWeighting * lDistance * spotEffect;",

					"#ifdef DOUBLE_SIDED",

						"vLightBack += spotLightColor[ i ] * spotLightWeightingBack * lDistance * spotEffect;",

					"#endif",

				"}",

			"}",

		"#endif",

		"#if MAX_HEMI_LIGHTS > 0",

			"for( int i = 0; i < MAX_HEMI_LIGHTS; i ++ ) {",

				"vec4 lDirection = viewMatrix * vec4( hemisphereLightDirection[ i ], 0.0 );",
				"vec3 lVector = normalize( lDirection.xyz );",

				"float dotProduct = dot( transformedNormal, lVector );",

				"float hemiDiffuseWeight = 0.5 * dotProduct + 0.5;",
				"float hemiDiffuseWeightBack = -0.5 * dotProduct + 0.5;",

				"vLightFront += mix( hemisphereLightGroundColor[ i ], hemisphereLightSkyColor[ i ], hemiDiffuseWeight );",

				"#ifdef DOUBLE_SIDED",

					"vLightBack += mix( hemisphereLightGroundColor[ i ], hemisphereLightSkyColor[ i ], hemiDiffuseWeightBack );",

				"#endif",

			"}",

		"#endif",

		"vLightFront = vLightFront * diffuse + ambient * ambientLightColor + emissive;",

		"#ifdef DOUBLE_SIDED",

			"vLightBack = vLightBack * diffuse + ambient * ambientLightColor + emissive;",

		"#endif"

	].join("\n"),

	// LIGHTS PHONG

	lights_phong_pars_vertex: [

		"#ifndef PHONG_PER_PIXEL",

		"#if MAX_POINT_LIGHTS > 0",

			"uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];",
			"uniform float pointLightDistance[ MAX_POINT_LIGHTS ];",

			"varying vec4 vPointLight[ MAX_POINT_LIGHTS ];",

		"#endif",

		"#if MAX_SPOT_LIGHTS > 0",

			"uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ];",
			"uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];",

			"varying vec4 vSpotLight[ MAX_SPOT_LIGHTS ];",

		"#endif",

		"#endif",

		"#if MAX_SPOT_LIGHTS > 0 || defined( USE_BUMPMAP )",

			"varying vec3 vWorldPosition;",

		"#endif"

	].join("\n"),


	lights_phong_vertex: [

		"#ifndef PHONG_PER_PIXEL",

		"#if MAX_POINT_LIGHTS > 0",

			"for( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {",

				"vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );",
				"vec3 lVector = lPosition.xyz - mvPosition.xyz;",

				"float lDistance = 1.0;",
				"if ( pointLightDistance[ i ] > 0.0 )",
					"lDistance = 1.0 - min( ( length( lVector ) / pointLightDistance[ i ] ), 1.0 );",

				"vPointLight[ i ] = vec4( lVector, lDistance );",

			"}",

		"#endif",

		"#if MAX_SPOT_LIGHTS > 0",

			"for( int i = 0; i < MAX_SPOT_LIGHTS; i ++ ) {",

				"vec4 lPosition = viewMatrix * vec4( spotLightPosition[ i ], 1.0 );",
				"vec3 lVector = lPosition.xyz - mvPosition.xyz;",

				"float lDistance = 1.0;",
				"if ( spotLightDistance[ i ] > 0.0 )",
					"lDistance = 1.0 - min( ( length( lVector ) / spotLightDistance[ i ] ), 1.0 );",

				"vSpotLight[ i ] = vec4( lVector, lDistance );",

			"}",

		"#endif",

		"#endif",

		"#if MAX_SPOT_LIGHTS > 0 || defined( USE_BUMPMAP )",

			"vWorldPosition = worldPosition.xyz;",

		"#endif"

	].join("\n"),

	lights_phong_pars_fragment: [

		"uniform vec3 ambientLightColor;",

		"#if MAX_DIR_LIGHTS > 0",

			"uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];",
			"uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];",

		"#endif",

		"#if MAX_HEMI_LIGHTS > 0",

			"uniform vec3 hemisphereLightSkyColor[ MAX_HEMI_LIGHTS ];",
			"uniform vec3 hemisphereLightGroundColor[ MAX_HEMI_LIGHTS ];",
			"uniform vec3 hemisphereLightDirection[ MAX_HEMI_LIGHTS ];",

		"#endif",

		"#if MAX_POINT_LIGHTS > 0",

			"uniform vec3 pointLightColor[ MAX_POINT_LIGHTS ];",

			"#ifdef PHONG_PER_PIXEL",

				"uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];",
				"uniform float pointLightDistance[ MAX_POINT_LIGHTS ];",

			"#else",

				"varying vec4 vPointLight[ MAX_POINT_LIGHTS ];",

			"#endif",

		"#endif",

		"#if MAX_SPOT_LIGHTS > 0",

			"uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];",
			"uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ];",
			"uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];",
			"uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];",
			"uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];",

			"#ifdef PHONG_PER_PIXEL",

				"uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];",

			"#else",

				"varying vec4 vSpotLight[ MAX_SPOT_LIGHTS ];",

			"#endif",

		"#endif",

		"#if MAX_SPOT_LIGHTS > 0 || defined( USE_BUMPMAP )",

			"varying vec3 vWorldPosition;",

		"#endif",

		"#ifdef WRAP_AROUND",

			"uniform vec3 wrapRGB;",

		"#endif",

		"varying vec3 vViewPosition;",
		"varying vec3 vNormal;"

	].join("\n"),

	lights_phong_fragment: [

		"vec3 normal = normalize( vNormal );",
		"vec3 viewPosition = normalize( vViewPosition );",

		"#ifdef DOUBLE_SIDED",

			"normal = normal * ( -1.0 + 2.0 * float( gl_FrontFacing ) );",

		"#endif",

		"#ifdef USE_NORMALMAP",

			"normal = perturbNormal2Arb( -vViewPosition, normal );",

		"#elif defined( USE_BUMPMAP )",

			"normal = perturbNormalArb( -vViewPosition, normal, dHdxy_fwd() );",

		"#endif",

		"#if MAX_POINT_LIGHTS > 0",

			"vec3 pointDiffuse  = vec3( 0.0 );",
			"vec3 pointSpecular = vec3( 0.0 );",

			"for ( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {",

				"#ifdef PHONG_PER_PIXEL",

					"vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );",
					"vec3 lVector = lPosition.xyz + vViewPosition.xyz;",

					"float lDistance = 1.0;",
					"if ( pointLightDistance[ i ] > 0.0 )",
						"lDistance = 1.0 - min( ( length( lVector ) / pointLightDistance[ i ] ), 1.0 );",

					"lVector = normalize( lVector );",

				"#else",

					"vec3 lVector = normalize( vPointLight[ i ].xyz );",
					"float lDistance = vPointLight[ i ].w;",

				"#endif",

				// diffuse

				"float dotProduct = dot( normal, lVector );",

				"#ifdef WRAP_AROUND",

					"float pointDiffuseWeightFull = max( dotProduct, 0.0 );",
					"float pointDiffuseWeightHalf = max( 0.5 * dotProduct + 0.5, 0.0 );",

					"vec3 pointDiffuseWeight = mix( vec3 ( pointDiffuseWeightFull ), vec3( pointDiffuseWeightHalf ), wrapRGB );",

				"#else",

					"float pointDiffuseWeight = max( dotProduct, 0.0 );",

				"#endif",

				"pointDiffuse  += diffuse * pointLightColor[ i ] * pointDiffuseWeight * lDistance;",

				// specular

				"vec3 pointHalfVector = normalize( lVector + viewPosition );",
				"float pointDotNormalHalf = max( dot( normal, pointHalfVector ), 0.0 );",
				"float pointSpecularWeight = specularStrength * max( pow( pointDotNormalHalf, shininess ), 0.0 );",

				"#ifdef PHYSICALLY_BASED_SHADING",

					// 2.0 => 2.0001 is hack to work around ANGLE bug

					"float specularNormalization = ( shininess + 2.0001 ) / 8.0;",

					"vec3 schlick = specular + vec3( 1.0 - specular ) * pow( 1.0 - dot( lVector, pointHalfVector ), 5.0 );",
					"pointSpecular += schlick * pointLightColor[ i ] * pointSpecularWeight * pointDiffuseWeight * lDistance * specularNormalization;",

				"#else",

					"pointSpecular += specular * pointLightColor[ i ] * pointSpecularWeight * pointDiffuseWeight * lDistance;",

				"#endif",

			"}",

		"#endif",

		"#if MAX_SPOT_LIGHTS > 0",

			"vec3 spotDiffuse  = vec3( 0.0 );",
			"vec3 spotSpecular = vec3( 0.0 );",

			"for ( int i = 0; i < MAX_SPOT_LIGHTS; i ++ ) {",

				"#ifdef PHONG_PER_PIXEL",

					"vec4 lPosition = viewMatrix * vec4( spotLightPosition[ i ], 1.0 );",
					"vec3 lVector = lPosition.xyz + vViewPosition.xyz;",

					"float lDistance = 1.0;",
					"if ( spotLightDistance[ i ] > 0.0 )",
						"lDistance = 1.0 - min( ( length( lVector ) / spotLightDistance[ i ] ), 1.0 );",

					"lVector = normalize( lVector );",

				"#else",

					"vec3 lVector = normalize( vSpotLight[ i ].xyz );",
					"float lDistance = vSpotLight[ i ].w;",

				"#endif",

				"float spotEffect = dot( spotLightDirection[ i ], normalize( spotLightPosition[ i ] - vWorldPosition ) );",

				"if ( spotEffect > spotLightAngleCos[ i ] ) {",

					"spotEffect = max( pow( spotEffect, spotLightExponent[ i ] ), 0.0 );",

					// diffuse

					"float dotProduct = dot( normal, lVector );",

					"#ifdef WRAP_AROUND",

						"float spotDiffuseWeightFull = max( dotProduct, 0.0 );",
						"float spotDiffuseWeightHalf = max( 0.5 * dotProduct + 0.5, 0.0 );",

						"vec3 spotDiffuseWeight = mix( vec3 ( spotDiffuseWeightFull ), vec3( spotDiffuseWeightHalf ), wrapRGB );",

					"#else",

						"float spotDiffuseWeight = max( dotProduct, 0.0 );",

					"#endif",

					"spotDiffuse += diffuse * spotLightColor[ i ] * spotDiffuseWeight * lDistance * spotEffect;",

					// specular

					"vec3 spotHalfVector = normalize( lVector + viewPosition );",
					"float spotDotNormalHalf = max( dot( normal, spotHalfVector ), 0.0 );",
					"float spotSpecularWeight = specularStrength * max( pow( spotDotNormalHalf, shininess ), 0.0 );",

					"#ifdef PHYSICALLY_BASED_SHADING",

						// 2.0 => 2.0001 is hack to work around ANGLE bug

						"float specularNormalization = ( shininess + 2.0001 ) / 8.0;",

						"vec3 schlick = specular + vec3( 1.0 - specular ) * pow( 1.0 - dot( lVector, spotHalfVector ), 5.0 );",
						"spotSpecular += schlick * spotLightColor[ i ] * spotSpecularWeight * spotDiffuseWeight * lDistance * specularNormalization * spotEffect;",

					"#else",

						"spotSpecular += specular * spotLightColor[ i ] * spotSpecularWeight * spotDiffuseWeight * lDistance * spotEffect;",

					"#endif",

				"}",

			"}",

		"#endif",

		"#if MAX_DIR_LIGHTS > 0",

			"vec3 dirDiffuse  = vec3( 0.0 );",
			"vec3 dirSpecular = vec3( 0.0 );" ,

			"for( int i = 0; i < MAX_DIR_LIGHTS; i ++ ) {",

				"vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );",
				"vec3 dirVector = normalize( lDirection.xyz );",

				// diffuse

				"float dotProduct = dot( normal, dirVector );",

				"#ifdef WRAP_AROUND",

					"float dirDiffuseWeightFull = max( dotProduct, 0.0 );",
					"float dirDiffuseWeightHalf = max( 0.5 * dotProduct + 0.5, 0.0 );",

					"vec3 dirDiffuseWeight = mix( vec3( dirDiffuseWeightFull ), vec3( dirDiffuseWeightHalf ), wrapRGB );",

				"#else",

					"float dirDiffuseWeight = max( dotProduct, 0.0 );",

				"#endif",

				"dirDiffuse  += diffuse * directionalLightColor[ i ] * dirDiffuseWeight;",

				// specular

				"vec3 dirHalfVector = normalize( dirVector + viewPosition );",
				"float dirDotNormalHalf = max( dot( normal, dirHalfVector ), 0.0 );",
				"float dirSpecularWeight = specularStrength * max( pow( dirDotNormalHalf, shininess ), 0.0 );",

				"#ifdef PHYSICALLY_BASED_SHADING",

					/*
					// fresnel term from skin shader
					"const float F0 = 0.128;",

					"float base = 1.0 - dot( viewPosition, dirHalfVector );",
					"float exponential = pow( base, 5.0 );",

					"float fresnel = exponential + F0 * ( 1.0 - exponential );",
					*/

					/*
					// fresnel term from fresnel shader
					"const float mFresnelBias = 0.08;",
					"const float mFresnelScale = 0.3;",
					"const float mFresnelPower = 5.0;",

					"float fresnel = mFresnelBias + mFresnelScale * pow( 1.0 + dot( normalize( -viewPosition ), normal ), mFresnelPower );",
					*/

					// 2.0 => 2.0001 is hack to work around ANGLE bug

					"float specularNormalization = ( shininess + 2.0001 ) / 8.0;",

					//"dirSpecular += specular * directionalLightColor[ i ] * dirSpecularWeight * dirDiffuseWeight * specularNormalization * fresnel;",

					"vec3 schlick = specular + vec3( 1.0 - specular ) * pow( 1.0 - dot( dirVector, dirHalfVector ), 5.0 );",
					"dirSpecular += schlick * directionalLightColor[ i ] * dirSpecularWeight * dirDiffuseWeight * specularNormalization;",

				"#else",

					"dirSpecular += specular * directionalLightColor[ i ] * dirSpecularWeight * dirDiffuseWeight;",

				"#endif",

			"}",

		"#endif",

		"#if MAX_HEMI_LIGHTS > 0",

			"vec3 hemiDiffuse  = vec3( 0.0 );",
			"vec3 hemiSpecular = vec3( 0.0 );" ,

			"for( int i = 0; i < MAX_HEMI_LIGHTS; i ++ ) {",

				"vec4 lDirection = viewMatrix * vec4( hemisphereLightDirection[ i ], 0.0 );",
				"vec3 lVector = normalize( lDirection.xyz );",

				// diffuse

				"float dotProduct = dot( normal, lVector );",
				"float hemiDiffuseWeight = 0.5 * dotProduct + 0.5;",

				"vec3 hemiColor = mix( hemisphereLightGroundColor[ i ], hemisphereLightSkyColor[ i ], hemiDiffuseWeight );",

				"hemiDiffuse += diffuse * hemiColor;",

				// specular (sky light)

				"vec3 hemiHalfVectorSky = normalize( lVector + viewPosition );",
				"float hemiDotNormalHalfSky = 0.5 * dot( normal, hemiHalfVectorSky ) + 0.5;",
				"float hemiSpecularWeightSky = specularStrength * max( pow( hemiDotNormalHalfSky, shininess ), 0.0 );",

				// specular (ground light)

				"vec3 lVectorGround = -lVector;",

				"vec3 hemiHalfVectorGround = normalize( lVectorGround + viewPosition );",
				"float hemiDotNormalHalfGround = 0.5 * dot( normal, hemiHalfVectorGround ) + 0.5;",
				"float hemiSpecularWeightGround = specularStrength * max( pow( hemiDotNormalHalfGround, shininess ), 0.0 );",

				"#ifdef PHYSICALLY_BASED_SHADING",

					"float dotProductGround = dot( normal, lVectorGround );",

					// 2.0 => 2.0001 is hack to work around ANGLE bug

					"float specularNormalization = ( shininess + 2.0001 ) / 8.0;",

					"vec3 schlickSky = specular + vec3( 1.0 - specular ) * pow( 1.0 - dot( lVector, hemiHalfVectorSky ), 5.0 );",
					"vec3 schlickGround = specular + vec3( 1.0 - specular ) * pow( 1.0 - dot( lVectorGround, hemiHalfVectorGround ), 5.0 );",
					"hemiSpecular += hemiColor * specularNormalization * ( schlickSky * hemiSpecularWeightSky * max( dotProduct, 0.0 ) + schlickGround * hemiSpecularWeightGround * max( dotProductGround, 0.0 ) );",

				"#else",

					"hemiSpecular += specular * hemiColor * ( hemiSpecularWeightSky + hemiSpecularWeightGround ) * hemiDiffuseWeight;",

				"#endif",

			"}",

		"#endif",

		"vec3 totalDiffuse = vec3( 0.0 );",
		"vec3 totalSpecular = vec3( 0.0 );",

		"#if MAX_DIR_LIGHTS > 0",

			"totalDiffuse += dirDiffuse;",
			"totalSpecular += dirSpecular;",

		"#endif",

		"#if MAX_HEMI_LIGHTS > 0",

			"totalDiffuse += hemiDiffuse;",
			"totalSpecular += hemiSpecular;",

		"#endif",

		"#if MAX_POINT_LIGHTS > 0",

			"totalDiffuse += pointDiffuse;",
			"totalSpecular += pointSpecular;",

		"#endif",

		"#if MAX_SPOT_LIGHTS > 0",

			"totalDiffuse += spotDiffuse;",
			"totalSpecular += spotSpecular;",

		"#endif",

		"#ifdef METAL",

			"gl_FragColor.xyz = gl_FragColor.xyz * ( emissive + totalDiffuse + ambientLightColor * ambient + totalSpecular );",

		"#else",

			"gl_FragColor.xyz = gl_FragColor.xyz * ( emissive + totalDiffuse + ambientLightColor * ambient ) + totalSpecular;",

		"#endif"

	].join("\n"),

	// VERTEX COLORS

	color_pars_fragment: [

		"#ifdef USE_COLOR",

			"varying vec3 vColor;",

		"#endif"

	].join("\n"),


	color_fragment: [

		"#ifdef USE_COLOR",

			"gl_FragColor = gl_FragColor * vec4( vColor, 1.0 );",

		"#endif"

	].join("\n"),

	color_pars_vertex: [

		"#ifdef USE_COLOR",

			"varying vec3 vColor;",

		"#endif"

	].join("\n"),


	color_vertex: [

		"#ifdef USE_COLOR",

			"#ifdef GAMMA_INPUT",

				"vColor = color * color;",

			"#else",

				"vColor = color;",

			"#endif",

		"#endif"

	].join("\n"),

	// SKINNING

	skinning_pars_vertex: [

		"#ifdef USE_SKINNING",

			"#ifdef BONE_TEXTURE",

				"uniform sampler2D boneTexture;",
				"uniform int boneTextureWidth;",
				"uniform int boneTextureHeight;",

				"mat4 getBoneMatrix( const in float i ) {",

					"float j = i * 4.0;",
					"float x = mod( j, float( boneTextureWidth ) );",
					"float y = floor( j / float( boneTextureWidth ) );",

					"float dx = 1.0 / float( boneTextureWidth );",
					"float dy = 1.0 / float( boneTextureHeight );",

					"y = dy * ( y + 0.5 );",

					"vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );",
					"vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );",
					"vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );",
					"vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );",

					"mat4 bone = mat4( v1, v2, v3, v4 );",

					"return bone;",

				"}",

			"#else",

				"uniform mat4 boneGlobalMatrices[ MAX_BONES ];",

				"mat4 getBoneMatrix( const in float i ) {",

					"mat4 bone = boneGlobalMatrices[ int(i) ];",
					"return bone;",

				"}",

			"#endif",

		"#endif"

	].join("\n"),

	skinbase_vertex: [

		"#ifdef USE_SKINNING",

			"mat4 boneMatX = getBoneMatrix( skinIndex.x );",
			"mat4 boneMatY = getBoneMatrix( skinIndex.y );",

		"#endif"

	].join("\n"),

	skinning_vertex: [

		"#ifdef USE_SKINNING",

			"#ifdef USE_MORPHTARGETS",

			"vec4 skinVertex = vec4( morphed, 1.0 );",

			"#else",

			"vec4 skinVertex = vec4( position, 1.0 );",

			"#endif",

			"vec4 skinned  = boneMatX * skinVertex * skinWeight.x;",
			"skinned 	  += boneMatY * skinVertex * skinWeight.y;",

		"#endif"

	].join("\n"),

	// MORPHING

	morphtarget_pars_vertex: [

		"#ifdef USE_MORPHTARGETS",

			"#ifndef USE_MORPHNORMALS",

			"uniform float morphTargetInfluences[ 8 ];",

			"#else",

			"uniform float morphTargetInfluences[ 4 ];",

			"#endif",

		"#endif"

	].join("\n"),

	morphtarget_vertex: [

		"#ifdef USE_MORPHTARGETS",

			"vec3 morphed = vec3( 0.0 );",
			"morphed += ( morphTarget0 - position ) * morphTargetInfluences[ 0 ];",
			"morphed += ( morphTarget1 - position ) * morphTargetInfluences[ 1 ];",
			"morphed += ( morphTarget2 - position ) * morphTargetInfluences[ 2 ];",
			"morphed += ( morphTarget3 - position ) * morphTargetInfluences[ 3 ];",

			"#ifndef USE_MORPHNORMALS",

			"morphed += ( morphTarget4 - position ) * morphTargetInfluences[ 4 ];",
			"morphed += ( morphTarget5 - position ) * morphTargetInfluences[ 5 ];",
			"morphed += ( morphTarget6 - position ) * morphTargetInfluences[ 6 ];",
			"morphed += ( morphTarget7 - position ) * morphTargetInfluences[ 7 ];",

			"#endif",

			"morphed += position;",

		"#endif"

	].join("\n"),

	default_vertex : [

		"vec4 mvPosition;",

		"#ifdef USE_SKINNING",

			"mvPosition = modelViewMatrix * skinned;",

		"#endif",

		"#if !defined( USE_SKINNING ) && defined( USE_MORPHTARGETS )",

			"mvPosition = modelViewMatrix * vec4( morphed, 1.0 );",

		"#endif",

		"#if !defined( USE_SKINNING ) && ! defined( USE_MORPHTARGETS )",

			"mvPosition = modelViewMatrix * vec4( position, 1.0 );",

		"#endif",

		"gl_Position = projectionMatrix * mvPosition;"

	].join("\n"),

	morphnormal_vertex: [

		"#ifdef USE_MORPHNORMALS",

			"vec3 morphedNormal = vec3( 0.0 );",

			"morphedNormal +=  ( morphNormal0 - normal ) * morphTargetInfluences[ 0 ];",
			"morphedNormal +=  ( morphNormal1 - normal ) * morphTargetInfluences[ 1 ];",
			"morphedNormal +=  ( morphNormal2 - normal ) * morphTargetInfluences[ 2 ];",
			"morphedNormal +=  ( morphNormal3 - normal ) * morphTargetInfluences[ 3 ];",

			"morphedNormal += normal;",

		"#endif"

	].join("\n"),

	skinnormal_vertex: [

		"#ifdef USE_SKINNING",

			"mat4 skinMatrix = skinWeight.x * boneMatX;",
			"skinMatrix 	+= skinWeight.y * boneMatY;",

			"#ifdef USE_MORPHNORMALS",

			"vec4 skinnedNormal = skinMatrix * vec4( morphedNormal, 0.0 );",

			"#else",

			"vec4 skinnedNormal = skinMatrix * vec4( normal, 0.0 );",

			"#endif",

		"#endif"

	].join("\n"),

	defaultnormal_vertex: [

		"vec3 objectNormal;",

		"#ifdef USE_SKINNING",

			"objectNormal = skinnedNormal.xyz;",

		"#endif",

		"#if !defined( USE_SKINNING ) && defined( USE_MORPHNORMALS )",

			"objectNormal = morphedNormal;",

		"#endif",

		"#if !defined( USE_SKINNING ) && ! defined( USE_MORPHNORMALS )",

			"objectNormal = normal;",

		"#endif",

		"#ifdef FLIP_SIDED",

			"objectNormal = -objectNormal;",

		"#endif",

		"vec3 transformedNormal = normalMatrix * objectNormal;"

	].join("\n"),

	// SHADOW MAP

	// based on SpiderGL shadow map and Fabien Sanglard's GLSL shadow mapping examples
	//  http://spidergl.org/example.php?id=6
	// 	http://fabiensanglard.net/shadowmapping

	shadowmap_pars_fragment: [

		"#ifdef USE_SHADOWMAP",

			"uniform sampler2D shadowMap[ MAX_SHADOWS ];",
			"uniform vec2 shadowMapSize[ MAX_SHADOWS ];",

			"uniform float shadowDarkness[ MAX_SHADOWS ];",
			"uniform float shadowBias[ MAX_SHADOWS ];",

			"varying vec4 vShadowCoord[ MAX_SHADOWS ];",

			"float unpackDepth( const in vec4 rgba_depth ) {",

				"const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );",
				"float depth = dot( rgba_depth, bit_shift );",
				"return depth;",

			"}",

		"#endif"

	].join("\n"),

	shadowmap_fragment: [

		"#ifdef USE_SHADOWMAP",

			"#ifdef SHADOWMAP_DEBUG",

				"vec3 frustumColors[3];",
				"frustumColors[0] = vec3( 1.0, 0.5, 0.0 );",
				"frustumColors[1] = vec3( 0.0, 1.0, 0.8 );",
				"frustumColors[2] = vec3( 0.0, 0.5, 1.0 );",

			"#endif",

			"#ifdef SHADOWMAP_CASCADE",

				"int inFrustumCount = 0;",

			"#endif",

			"float fDepth;",
			"vec3 shadowColor = vec3( 1.0 );",

			"for( int i = 0; i < MAX_SHADOWS; i ++ ) {",

				"vec3 shadowCoord = vShadowCoord[ i ].xyz / vShadowCoord[ i ].w;",

				// "if ( something && something )" 		 breaks ATI OpenGL shader compiler
				// "if ( all( something, something ) )"  using this instead

				"bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );",
				"bool inFrustum = all( inFrustumVec );",

				// don't shadow pixels outside of light frustum
				// use just first frustum (for cascades)
				// don't shadow pixels behind far plane of light frustum

				"#ifdef SHADOWMAP_CASCADE",

					"inFrustumCount += int( inFrustum );",
					"bvec3 frustumTestVec = bvec3( inFrustum, inFrustumCount == 1, shadowCoord.z <= 1.0 );",

				"#else",

					"bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );",

				"#endif",

				"bool frustumTest = all( frustumTestVec );",

				"if ( frustumTest ) {",

					"shadowCoord.z += shadowBias[ i ];",

					"#if defined( SHADOWMAP_TYPE_PCF )",

						// Percentage-close filtering
						// (9 pixel kernel)
						// http://fabiensanglard.net/shadowmappingPCF/

						"float shadow = 0.0;",

						/*
						// nested loops breaks shader compiler / validator on some ATI cards when using OpenGL
						// must enroll loop manually

						"for ( float y = -1.25; y <= 1.25; y += 1.25 )",
							"for ( float x = -1.25; x <= 1.25; x += 1.25 ) {",

								"vec4 rgbaDepth = texture2D( shadowMap[ i ], vec2( x * xPixelOffset, y * yPixelOffset ) + shadowCoord.xy );",

								// doesn't seem to produce any noticeable visual difference compared to simple "texture2D" lookup
								//"vec4 rgbaDepth = texture2DProj( shadowMap[ i ], vec4( vShadowCoord[ i ].w * ( vec2( x * xPixelOffset, y * yPixelOffset ) + shadowCoord.xy ), 0.05, vShadowCoord[ i ].w ) );",

								"float fDepth = unpackDepth( rgbaDepth );",

								"if ( fDepth < shadowCoord.z )",
									"shadow += 1.0;",

						"}",

						"shadow /= 9.0;",

						*/

						"const float shadowDelta = 1.0 / 9.0;",

						"float xPixelOffset = 1.0 / shadowMapSize[ i ].x;",
						"float yPixelOffset = 1.0 / shadowMapSize[ i ].y;",

						"float dx0 = -1.25 * xPixelOffset;",
						"float dy0 = -1.25 * yPixelOffset;",
						"float dx1 = 1.25 * xPixelOffset;",
						"float dy1 = 1.25 * yPixelOffset;",

						"fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy0 ) ) );",
						"if ( fDepth < shadowCoord.z ) shadow += shadowDelta;",

						"fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy0 ) ) );",
						"if ( fDepth < shadowCoord.z ) shadow += shadowDelta;",

						"fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy0 ) ) );",
						"if ( fDepth < shadowCoord.z ) shadow += shadowDelta;",

						"fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, 0.0 ) ) );",
						"if ( fDepth < shadowCoord.z ) shadow += shadowDelta;",

						"fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy ) );",
						"if ( fDepth < shadowCoord.z ) shadow += shadowDelta;",

						"fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, 0.0 ) ) );",
						"if ( fDepth < shadowCoord.z ) shadow += shadowDelta;",

						"fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy1 ) ) );",
						"if ( fDepth < shadowCoord.z ) shadow += shadowDelta;",

						"fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy1 ) ) );",
						"if ( fDepth < shadowCoord.z ) shadow += shadowDelta;",

						"fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy1 ) ) );",
						"if ( fDepth < shadowCoord.z ) shadow += shadowDelta;",

						"shadowColor = shadowColor * vec3( ( 1.0 - shadowDarkness[ i ] * shadow ) );",

					"#elif defined( SHADOWMAP_TYPE_PCF_SOFT )",

						// Percentage-close filtering
						// (9 pixel kernel)
						// http://fabiensanglard.net/shadowmappingPCF/

						"float shadow = 0.0;",

						"float xPixelOffset = 1.0 / shadowMapSize[ i ].x;",
						"float yPixelOffset = 1.0 / shadowMapSize[ i ].y;",

						"float dx0 = -1.0 * xPixelOffset;",
						"float dy0 = -1.0 * yPixelOffset;",
						"float dx1 = 1.0 * xPixelOffset;",
						"float dy1 = 1.0 * yPixelOffset;",

						"mat3 shadowKernel;",
						"mat3 depthKernel;",

						"depthKernel[0][0] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy0 ) ) );",
						"depthKernel[0][1] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, 0.0 ) ) );",
						"depthKernel[0][2] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy1 ) ) );",
						"depthKernel[1][0] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy0 ) ) );",
						"depthKernel[1][1] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy ) );",
						"depthKernel[1][2] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy1 ) ) );",
						"depthKernel[2][0] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy0 ) ) );",
						"depthKernel[2][1] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, 0.0 ) ) );",
						"depthKernel[2][2] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy1 ) ) );",

						"vec3 shadowZ = vec3( shadowCoord.z );",
						"shadowKernel[0] = vec3(lessThan(depthKernel[0], shadowZ ));",
						"shadowKernel[0] *= vec3(0.25);",
													
						"shadowKernel[1] = vec3(lessThan(depthKernel[1], shadowZ ));",
						"shadowKernel[1] *= vec3(0.25);",

						"shadowKernel[2] = vec3(lessThan(depthKernel[2], shadowZ ));",
						"shadowKernel[2] *= vec3(0.25);",

						"vec2 fractionalCoord = 1.0 - fract( shadowCoord.xy * shadowMapSize[i].xy );",

						"shadowKernel[0] = mix( shadowKernel[1], shadowKernel[0], fractionalCoord.x );",
						"shadowKernel[1] = mix( shadowKernel[2], shadowKernel[1], fractionalCoord.x );",

						"vec4 shadowValues;",
						"shadowValues.x = mix( shadowKernel[0][1], shadowKernel[0][0], fractionalCoord.y );",
						"shadowValues.y = mix( shadowKernel[0][2], shadowKernel[0][1], fractionalCoord.y );",
						"shadowValues.z = mix( shadowKernel[1][1], shadowKernel[1][0], fractionalCoord.y );",
						"shadowValues.w = mix( shadowKernel[1][2], shadowKernel[1][1], fractionalCoord.y );",

						"shadow = dot( shadowValues, vec4( 1.0 ) );",

						"shadowColor = shadowColor * vec3( ( 1.0 - shadowDarkness[ i ] * shadow ) );",

					"#else",

						"vec4 rgbaDepth = texture2D( shadowMap[ i ], shadowCoord.xy );",
						"float fDepth = unpackDepth( rgbaDepth );",

						"if ( fDepth < shadowCoord.z )",

							// spot with multiple shadows is darker

							"shadowColor = shadowColor * vec3( 1.0 - shadowDarkness[ i ] );",

							// spot with multiple shadows has the same color as single shadow spot

							//"shadowColor = min( shadowColor, vec3( shadowDarkness[ i ] ) );",

					"#endif",

				"}",


				"#ifdef SHADOWMAP_DEBUG",

					"#ifdef SHADOWMAP_CASCADE",

						"if ( inFrustum && inFrustumCount == 1 ) gl_FragColor.xyz *= frustumColors[ i ];",

					"#else",

						"if ( inFrustum ) gl_FragColor.xyz *= frustumColors[ i ];",

					"#endif",

				"#endif",

			"}",

			"#ifdef GAMMA_OUTPUT",

				"shadowColor *= shadowColor;",

			"#endif",

			"gl_FragColor.xyz = gl_FragColor.xyz * shadowColor;",

		"#endif"

	].join("\n"),

	shadowmap_pars_vertex: [

		"#ifdef USE_SHADOWMAP",

			"varying vec4 vShadowCoord[ MAX_SHADOWS ];",
			"uniform mat4 shadowMatrix[ MAX_SHADOWS ];",

		"#endif"

	].join("\n"),

	shadowmap_vertex: [

		"#ifdef USE_SHADOWMAP",

			"for( int i = 0; i < MAX_SHADOWS; i ++ ) {",

				"vShadowCoord[ i ] = shadowMatrix[ i ] * worldPosition;",

			"}",

		"#endif"

	].join("\n"),

	// ALPHATEST

	alphatest_fragment: [

		"#ifdef ALPHATEST",

			"if ( gl_FragColor.a < ALPHATEST ) discard;",

		"#endif"

	].join("\n"),

	// LINEAR SPACE

	linear_to_gamma_fragment: [

		"#ifdef GAMMA_OUTPUT",

			"gl_FragColor.xyz = sqrt( gl_FragColor.xyz );",

		"#endif"

	].join("\n")


};/**
 * Webgl Shader Library for three.js
 *
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 * @author mikael emtinger / http://gomo.se/
 */


THREE.ShaderLib = {

	'basic': {

		uniforms: THREE.UniformsUtils.merge( [

			THREE.UniformsLib[ "common" ],
			THREE.UniformsLib[ "fog" ],
			THREE.UniformsLib[ "shadowmap" ]

		] ),

		vertexShader: [

			THREE.ShaderChunk[ "map_pars_vertex" ],
			THREE.ShaderChunk[ "lightmap_pars_vertex" ],
			THREE.ShaderChunk[ "envmap_pars_vertex" ],
			THREE.ShaderChunk[ "color_pars_vertex" ],
			THREE.ShaderChunk[ "morphtarget_pars_vertex" ],
			THREE.ShaderChunk[ "skinning_pars_vertex" ],
			THREE.ShaderChunk[ "shadowmap_pars_vertex" ],

			"void main() {",

				THREE.ShaderChunk[ "map_vertex" ],
				THREE.ShaderChunk[ "lightmap_vertex" ],
				THREE.ShaderChunk[ "color_vertex" ],
				THREE.ShaderChunk[ "skinbase_vertex" ],

				"#ifdef USE_ENVMAP",

				THREE.ShaderChunk[ "morphnormal_vertex" ],
				THREE.ShaderChunk[ "skinnormal_vertex" ],
				THREE.ShaderChunk[ "defaultnormal_vertex" ],

				"#endif",

				THREE.ShaderChunk[ "morphtarget_vertex" ],
				THREE.ShaderChunk[ "skinning_vertex" ],
				THREE.ShaderChunk[ "default_vertex" ],

				THREE.ShaderChunk[ "worldpos_vertex" ],
				THREE.ShaderChunk[ "envmap_vertex" ],
				THREE.ShaderChunk[ "shadowmap_vertex" ],

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform vec3 diffuse;",
			"uniform float opacity;",

			THREE.ShaderChunk[ "color_pars_fragment" ],
			THREE.ShaderChunk[ "map_pars_fragment" ],
			THREE.ShaderChunk[ "lightmap_pars_fragment" ],
			THREE.ShaderChunk[ "envmap_pars_fragment" ],
			THREE.ShaderChunk[ "fog_pars_fragment" ],
			THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
			THREE.ShaderChunk[ "specularmap_pars_fragment" ],

			"void main() {",

				"gl_FragColor = vec4( diffuse, opacity );",

				THREE.ShaderChunk[ "map_fragment" ],
				THREE.ShaderChunk[ "alphatest_fragment" ],
				THREE.ShaderChunk[ "specularmap_fragment" ],
				THREE.ShaderChunk[ "lightmap_fragment" ],
				THREE.ShaderChunk[ "color_fragment" ],
				THREE.ShaderChunk[ "envmap_fragment" ],
				THREE.ShaderChunk[ "shadowmap_fragment" ],

				THREE.ShaderChunk[ "linear_to_gamma_fragment" ],

				THREE.ShaderChunk[ "fog_fragment" ],

			"}"

		].join("\n")

	},

	'lambert': {

		uniforms: THREE.UniformsUtils.merge( [

			THREE.UniformsLib[ "common" ],
			THREE.UniformsLib[ "fog" ],
			THREE.UniformsLib[ "lights" ],
			THREE.UniformsLib[ "shadowmap" ],

			{
				"ambient"  : { type: "c", value: new THREE.Color( 0xffffff ) },
				"emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
				"wrapRGB"  : { type: "v3", value: new THREE.Vector3( 1, 1, 1 ) }
			}

		] ),

		vertexShader: [

			"#define LAMBERT",

			"varying vec3 vLightFront;",

			"#ifdef DOUBLE_SIDED",

				"varying vec3 vLightBack;",

			"#endif",

			THREE.ShaderChunk[ "map_pars_vertex" ],
			THREE.ShaderChunk[ "lightmap_pars_vertex" ],
			THREE.ShaderChunk[ "envmap_pars_vertex" ],
			THREE.ShaderChunk[ "lights_lambert_pars_vertex" ],
			THREE.ShaderChunk[ "color_pars_vertex" ],
			THREE.ShaderChunk[ "morphtarget_pars_vertex" ],
			THREE.ShaderChunk[ "skinning_pars_vertex" ],
			THREE.ShaderChunk[ "shadowmap_pars_vertex" ],

			"void main() {",

				THREE.ShaderChunk[ "map_vertex" ],
				THREE.ShaderChunk[ "lightmap_vertex" ],
				THREE.ShaderChunk[ "color_vertex" ],

				THREE.ShaderChunk[ "morphnormal_vertex" ],
				THREE.ShaderChunk[ "skinbase_vertex" ],
				THREE.ShaderChunk[ "skinnormal_vertex" ],
				THREE.ShaderChunk[ "defaultnormal_vertex" ],

				THREE.ShaderChunk[ "morphtarget_vertex" ],
				THREE.ShaderChunk[ "skinning_vertex" ],
				THREE.ShaderChunk[ "default_vertex" ],

				THREE.ShaderChunk[ "worldpos_vertex" ],
				THREE.ShaderChunk[ "envmap_vertex" ],
				THREE.ShaderChunk[ "lights_lambert_vertex" ],
				THREE.ShaderChunk[ "shadowmap_vertex" ],

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform float opacity;",

			"varying vec3 vLightFront;",

			"#ifdef DOUBLE_SIDED",

				"varying vec3 vLightBack;",

			"#endif",

			THREE.ShaderChunk[ "color_pars_fragment" ],
			THREE.ShaderChunk[ "map_pars_fragment" ],
			THREE.ShaderChunk[ "lightmap_pars_fragment" ],
			THREE.ShaderChunk[ "envmap_pars_fragment" ],
			THREE.ShaderChunk[ "fog_pars_fragment" ],
			THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
			THREE.ShaderChunk[ "specularmap_pars_fragment" ],

			"void main() {",

				"gl_FragColor = vec4( vec3 ( 1.0 ), opacity );",

				THREE.ShaderChunk[ "map_fragment" ],
				THREE.ShaderChunk[ "alphatest_fragment" ],
				THREE.ShaderChunk[ "specularmap_fragment" ],

				"#ifdef DOUBLE_SIDED",

					//"float isFront = float( gl_FrontFacing );",
					//"gl_FragColor.xyz *= isFront * vLightFront + ( 1.0 - isFront ) * vLightBack;",

					"if ( gl_FrontFacing )",
						"gl_FragColor.xyz *= vLightFront;",
					"else",
						"gl_FragColor.xyz *= vLightBack;",

				"#else",

					"gl_FragColor.xyz *= vLightFront;",

				"#endif",

				THREE.ShaderChunk[ "lightmap_fragment" ],
				THREE.ShaderChunk[ "color_fragment" ],
				THREE.ShaderChunk[ "envmap_fragment" ],
				THREE.ShaderChunk[ "shadowmap_fragment" ],

				THREE.ShaderChunk[ "linear_to_gamma_fragment" ],

				THREE.ShaderChunk[ "fog_fragment" ],

			"}"

		].join("\n")

	},

	'phong': {

		uniforms: THREE.UniformsUtils.merge( [

			THREE.UniformsLib[ "common" ],
			THREE.UniformsLib[ "bump" ],
			THREE.UniformsLib[ "normalmap" ],
			THREE.UniformsLib[ "fog" ],
			THREE.UniformsLib[ "lights" ],
			THREE.UniformsLib[ "shadowmap" ],

			{
				"ambient"  : { type: "c", value: new THREE.Color( 0xffffff ) },
				"emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
				"specular" : { type: "c", value: new THREE.Color( 0x111111 ) },
				"shininess": { type: "f", value: 30 },
				"wrapRGB"  : { type: "v3", value: new THREE.Vector3( 1, 1, 1 ) }
			}

		] ),

		vertexShader: [

			"#define PHONG",

			"varying vec3 vViewPosition;",
			"varying vec3 vNormal;",

			THREE.ShaderChunk[ "map_pars_vertex" ],
			THREE.ShaderChunk[ "lightmap_pars_vertex" ],
			THREE.ShaderChunk[ "envmap_pars_vertex" ],
			THREE.ShaderChunk[ "lights_phong_pars_vertex" ],
			THREE.ShaderChunk[ "color_pars_vertex" ],
			THREE.ShaderChunk[ "morphtarget_pars_vertex" ],
			THREE.ShaderChunk[ "skinning_pars_vertex" ],
			THREE.ShaderChunk[ "shadowmap_pars_vertex" ],

			"void main() {",

				THREE.ShaderChunk[ "map_vertex" ],
				THREE.ShaderChunk[ "lightmap_vertex" ],
				THREE.ShaderChunk[ "color_vertex" ],

				THREE.ShaderChunk[ "morphnormal_vertex" ],
				THREE.ShaderChunk[ "skinbase_vertex" ],
				THREE.ShaderChunk[ "skinnormal_vertex" ],
				THREE.ShaderChunk[ "defaultnormal_vertex" ],

				"vNormal = normalize( transformedNormal );",

				THREE.ShaderChunk[ "morphtarget_vertex" ],
				THREE.ShaderChunk[ "skinning_vertex" ],
				THREE.ShaderChunk[ "default_vertex" ],

				"vViewPosition = -mvPosition.xyz;",

				THREE.ShaderChunk[ "worldpos_vertex" ],
				THREE.ShaderChunk[ "envmap_vertex" ],
				THREE.ShaderChunk[ "lights_phong_vertex" ],
				THREE.ShaderChunk[ "shadowmap_vertex" ],

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform vec3 diffuse;",
			"uniform float opacity;",

			"uniform vec3 ambient;",
			"uniform vec3 emissive;",
			"uniform vec3 specular;",
			"uniform float shininess;",

			THREE.ShaderChunk[ "color_pars_fragment" ],
			THREE.ShaderChunk[ "map_pars_fragment" ],
			THREE.ShaderChunk[ "lightmap_pars_fragment" ],
			THREE.ShaderChunk[ "envmap_pars_fragment" ],
			THREE.ShaderChunk[ "fog_pars_fragment" ],
			THREE.ShaderChunk[ "lights_phong_pars_fragment" ],
			THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
			THREE.ShaderChunk[ "bumpmap_pars_fragment" ],
			THREE.ShaderChunk[ "normalmap_pars_fragment" ],
			THREE.ShaderChunk[ "specularmap_pars_fragment" ],

			"void main() {",

				"gl_FragColor = vec4( vec3 ( 1.0 ), opacity );",

				THREE.ShaderChunk[ "map_fragment" ],
				THREE.ShaderChunk[ "alphatest_fragment" ],
				THREE.ShaderChunk[ "specularmap_fragment" ],

				THREE.ShaderChunk[ "lights_phong_fragment" ],

				THREE.ShaderChunk[ "lightmap_fragment" ],
				THREE.ShaderChunk[ "color_fragment" ],
				THREE.ShaderChunk[ "envmap_fragment" ],
				THREE.ShaderChunk[ "shadowmap_fragment" ],

				THREE.ShaderChunk[ "linear_to_gamma_fragment" ],

				THREE.ShaderChunk[ "fog_fragment" ],

			"}"

		].join("\n")

	},

	'particle_basic': {

		uniforms:  THREE.UniformsUtils.merge( [

			THREE.UniformsLib[ "particle" ],
			THREE.UniformsLib[ "shadowmap" ]

		] ),

		vertexShader: [

			"uniform float size;",
			"uniform float scale;",

			THREE.ShaderChunk[ "color_pars_vertex" ],
			THREE.ShaderChunk[ "shadowmap_pars_vertex" ],

			"void main() {",

				THREE.ShaderChunk[ "color_vertex" ],

				"vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

				"#ifdef USE_SIZEATTENUATION",
					"gl_PointSize = size * ( scale / length( mvPosition.xyz ) );",
				"#else",
					"gl_PointSize = size;",
				"#endif",

				"gl_Position = projectionMatrix * mvPosition;",

				THREE.ShaderChunk[ "worldpos_vertex" ],
				THREE.ShaderChunk[ "shadowmap_vertex" ],

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform vec3 psColor;",
			"uniform float opacity;",

			THREE.ShaderChunk[ "color_pars_fragment" ],
			THREE.ShaderChunk[ "map_particle_pars_fragment" ],
			THREE.ShaderChunk[ "fog_pars_fragment" ],
			THREE.ShaderChunk[ "shadowmap_pars_fragment" ],

			"void main() {",

				"gl_FragColor = vec4( psColor, opacity );",

				THREE.ShaderChunk[ "map_particle_fragment" ],
				THREE.ShaderChunk[ "alphatest_fragment" ],
				THREE.ShaderChunk[ "color_fragment" ],
				THREE.ShaderChunk[ "shadowmap_fragment" ],
				THREE.ShaderChunk[ "fog_fragment" ],

			"}"

		].join("\n")

	},

	'dashed': {

		uniforms: THREE.UniformsUtils.merge( [

			THREE.UniformsLib[ "common" ],
			THREE.UniformsLib[ "fog" ],

			{
				"scale":     { type: "f", value: 1 },
				"dashSize":  { type: "f", value: 1 },
				"totalSize": { type: "f", value: 2 }
			}

		] ),

		vertexShader: [

			"uniform float scale;",
			"attribute float lineDistance;",

			"varying float vLineDistance;",

			THREE.ShaderChunk[ "color_pars_vertex" ],

			"void main() {",

				THREE.ShaderChunk[ "color_vertex" ],

				"vLineDistance = scale * lineDistance;",

				"vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
				"gl_Position = projectionMatrix * mvPosition;",

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform vec3 diffuse;",
			"uniform float opacity;",

			"uniform float dashSize;",
			"uniform float totalSize;",

			"varying float vLineDistance;",

			THREE.ShaderChunk[ "color_pars_fragment" ],
			THREE.ShaderChunk[ "fog_pars_fragment" ],

			"void main() {",

				"if ( mod( vLineDistance, totalSize ) > dashSize ) {",

					"discard;",

				"}",

				"gl_FragColor = vec4( diffuse, opacity );",

				THREE.ShaderChunk[ "color_fragment" ],
				THREE.ShaderChunk[ "fog_fragment" ],

			"}"

		].join("\n")

	},

	'depth': {

		uniforms: {

			"mNear": { type: "f", value: 1.0 },
			"mFar" : { type: "f", value: 2000.0 },
			"opacity" : { type: "f", value: 1.0 }

		},

		vertexShader: [

			"void main() {",

				"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform float mNear;",
			"uniform float mFar;",
			"uniform float opacity;",

			"void main() {",

				"float depth = gl_FragCoord.z / gl_FragCoord.w;",
				"float color = 1.0 - smoothstep( mNear, mFar, depth );",
				"gl_FragColor = vec4( vec3( color ), opacity );",

			"}"

		].join("\n")

	},

	'normal': {

		uniforms: {

			"opacity" : { type: "f", value: 1.0 }

		},

		vertexShader: [

			"varying vec3 vNormal;",

			THREE.ShaderChunk[ "morphtarget_pars_vertex" ],

			"void main() {",

				"vNormal = normalize( normalMatrix * normal );",

				THREE.ShaderChunk[ "morphtarget_vertex" ],
				THREE.ShaderChunk[ "default_vertex" ],

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform float opacity;",
			"varying vec3 vNormal;",

			"void main() {",

				"gl_FragColor = vec4( 0.5 * normalize( vNormal ) + 0.5, opacity );",

			"}"

		].join("\n")

	},

	/* -------------------------------------------------------------------------
	//	Normal map shader
	//		- Blinn-Phong
	//		- normal + diffuse + specular + AO + displacement + reflection + shadow maps
	//		- point and directional lights (use with "lights: true" material option)
	 ------------------------------------------------------------------------- */

	'normalmap' : {

		uniforms: THREE.UniformsUtils.merge( [

			THREE.UniformsLib[ "fog" ],
			THREE.UniformsLib[ "lights" ],
			THREE.UniformsLib[ "shadowmap" ],

			{

			"enableAO"		  : { type: "i", value: 0 },
			"enableDiffuse"	  : { type: "i", value: 0 },
			"enableSpecular"  : { type: "i", value: 0 },
			"enableReflection": { type: "i", value: 0 },
			"enableDisplacement": { type: "i", value: 0 },

			"tDisplacement": { type: "t", value: null }, // must go first as this is vertex texture
			"tDiffuse"	   : { type: "t", value: null },
			"tCube"		   : { type: "t", value: null },
			"tNormal"	   : { type: "t", value: null },
			"tSpecular"	   : { type: "t", value: null },
			"tAO"		   : { type: "t", value: null },

			"uNormalScale": { type: "v2", value: new THREE.Vector2( 1, 1 ) },

			"uDisplacementBias": { type: "f", value: 0.0 },
			"uDisplacementScale": { type: "f", value: 1.0 },

			"uDiffuseColor": { type: "c", value: new THREE.Color( 0xffffff ) },
			"uSpecularColor": { type: "c", value: new THREE.Color( 0x111111 ) },
			"uAmbientColor": { type: "c", value: new THREE.Color( 0xffffff ) },
			"uShininess": { type: "f", value: 30 },
			"uOpacity": { type: "f", value: 1 },

			"useRefract": { type: "i", value: 0 },
			"uRefractionRatio": { type: "f", value: 0.98 },
			"uReflectivity": { type: "f", value: 0.5 },

			"uOffset" : { type: "v2", value: new THREE.Vector2( 0, 0 ) },
			"uRepeat" : { type: "v2", value: new THREE.Vector2( 1, 1 ) },

			"wrapRGB"  : { type: "v3", value: new THREE.Vector3( 1, 1, 1 ) }

			}

		] ),

		fragmentShader: [

			"uniform vec3 uAmbientColor;",
			"uniform vec3 uDiffuseColor;",
			"uniform vec3 uSpecularColor;",
			"uniform float uShininess;",
			"uniform float uOpacity;",

			"uniform bool enableDiffuse;",
			"uniform bool enableSpecular;",
			"uniform bool enableAO;",
			"uniform bool enableReflection;",

			"uniform sampler2D tDiffuse;",
			"uniform sampler2D tNormal;",
			"uniform sampler2D tSpecular;",
			"uniform sampler2D tAO;",

			"uniform samplerCube tCube;",

			"uniform vec2 uNormalScale;",

			"uniform bool useRefract;",
			"uniform float uRefractionRatio;",
			"uniform float uReflectivity;",

			"varying vec3 vTangent;",
			"varying vec3 vBinormal;",
			"varying vec3 vNormal;",
			"varying vec2 vUv;",

			"uniform vec3 ambientLightColor;",

			"#if MAX_DIR_LIGHTS > 0",

				"uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];",
				"uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];",

			"#endif",

			"#if MAX_HEMI_LIGHTS > 0",

				"uniform vec3 hemisphereLightSkyColor[ MAX_HEMI_LIGHTS ];",
				"uniform vec3 hemisphereLightGroundColor[ MAX_HEMI_LIGHTS ];",
				"uniform vec3 hemisphereLightDirection[ MAX_HEMI_LIGHTS ];",

			"#endif",

			"#if MAX_POINT_LIGHTS > 0",

				"uniform vec3 pointLightColor[ MAX_POINT_LIGHTS ];",
				"uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];",
				"uniform float pointLightDistance[ MAX_POINT_LIGHTS ];",

			"#endif",

			"#if MAX_SPOT_LIGHTS > 0",

				"uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];",
				"uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ];",
				"uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];",
				"uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];",
				"uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];",
				"uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];",

			"#endif",

			"#ifdef WRAP_AROUND",

				"uniform vec3 wrapRGB;",

			"#endif",

			"varying vec3 vWorldPosition;",
			"varying vec3 vViewPosition;",

			THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
			THREE.ShaderChunk[ "fog_pars_fragment" ],

			"void main() {",

				"gl_FragColor = vec4( vec3( 1.0 ), uOpacity );",

				"vec3 specularTex = vec3( 1.0 );",

				"vec3 normalTex = texture2D( tNormal, vUv ).xyz * 2.0 - 1.0;",
				"normalTex.xy *= uNormalScale;",
				"normalTex = normalize( normalTex );",

				"if( enableDiffuse ) {",

					"#ifdef GAMMA_INPUT",

						"vec4 texelColor = texture2D( tDiffuse, vUv );",
						"texelColor.xyz *= texelColor.xyz;",

						"gl_FragColor = gl_FragColor * texelColor;",

					"#else",

						"gl_FragColor = gl_FragColor * texture2D( tDiffuse, vUv );",

					"#endif",

				"}",

				"if( enableAO ) {",

					"#ifdef GAMMA_INPUT",

						"vec4 aoColor = texture2D( tAO, vUv );",
						"aoColor.xyz *= aoColor.xyz;",

						"gl_FragColor.xyz = gl_FragColor.xyz * aoColor.xyz;",

					"#else",

						"gl_FragColor.xyz = gl_FragColor.xyz * texture2D( tAO, vUv ).xyz;",

					"#endif",

				"}",

				"if( enableSpecular )",
					"specularTex = texture2D( tSpecular, vUv ).xyz;",

				"mat3 tsb = mat3( normalize( vTangent ), normalize( vBinormal ), normalize( vNormal ) );",
				"vec3 finalNormal = tsb * normalTex;",

				"#ifdef FLIP_SIDED",

					"finalNormal = -finalNormal;",

				"#endif",

				"vec3 normal = normalize( finalNormal );",
				"vec3 viewPosition = normalize( vViewPosition );",

				// point lights

				"#if MAX_POINT_LIGHTS > 0",

					"vec3 pointDiffuse = vec3( 0.0 );",
					"vec3 pointSpecular = vec3( 0.0 );",

					"for ( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {",

						"vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );",
						"vec3 pointVector = lPosition.xyz + vViewPosition.xyz;",

						"float pointDistance = 1.0;",
						"if ( pointLightDistance[ i ] > 0.0 )",
							"pointDistance = 1.0 - min( ( length( pointVector ) / pointLightDistance[ i ] ), 1.0 );",

						"pointVector = normalize( pointVector );",

						// diffuse

						"#ifdef WRAP_AROUND",

							"float pointDiffuseWeightFull = max( dot( normal, pointVector ), 0.0 );",
							"float pointDiffuseWeightHalf = max( 0.5 * dot( normal, pointVector ) + 0.5, 0.0 );",

							"vec3 pointDiffuseWeight = mix( vec3 ( pointDiffuseWeightFull ), vec3( pointDiffuseWeightHalf ), wrapRGB );",

						"#else",

							"float pointDiffuseWeight = max( dot( normal, pointVector ), 0.0 );",

						"#endif",

						"pointDiffuse += pointDistance * pointLightColor[ i ] * uDiffuseColor * pointDiffuseWeight;",

						// specular

						"vec3 pointHalfVector = normalize( pointVector + viewPosition );",
						"float pointDotNormalHalf = max( dot( normal, pointHalfVector ), 0.0 );",
						"float pointSpecularWeight = specularTex.r * max( pow( pointDotNormalHalf, uShininess ), 0.0 );",

						"#ifdef PHYSICALLY_BASED_SHADING",

							// 2.0 => 2.0001 is hack to work around ANGLE bug

							"float specularNormalization = ( uShininess + 2.0001 ) / 8.0;",

							"vec3 schlick = uSpecularColor + vec3( 1.0 - uSpecularColor ) * pow( 1.0 - dot( pointVector, pointHalfVector ), 5.0 );",
							"pointSpecular += schlick * pointLightColor[ i ] * pointSpecularWeight * pointDiffuseWeight * pointDistance * specularNormalization;",

						"#else",

							"pointSpecular += pointDistance * pointLightColor[ i ] * uSpecularColor * pointSpecularWeight * pointDiffuseWeight;",

						"#endif",

					"}",

				"#endif",

				// spot lights

				"#if MAX_SPOT_LIGHTS > 0",

					"vec3 spotDiffuse = vec3( 0.0 );",
					"vec3 spotSpecular = vec3( 0.0 );",

					"for ( int i = 0; i < MAX_SPOT_LIGHTS; i ++ ) {",

						"vec4 lPosition = viewMatrix * vec4( spotLightPosition[ i ], 1.0 );",
						"vec3 spotVector = lPosition.xyz + vViewPosition.xyz;",

						"float spotDistance = 1.0;",
						"if ( spotLightDistance[ i ] > 0.0 )",
							"spotDistance = 1.0 - min( ( length( spotVector ) / spotLightDistance[ i ] ), 1.0 );",

						"spotVector = normalize( spotVector );",

						"float spotEffect = dot( spotLightDirection[ i ], normalize( spotLightPosition[ i ] - vWorldPosition ) );",

						"if ( spotEffect > spotLightAngleCos[ i ] ) {",

							"spotEffect = max( pow( spotEffect, spotLightExponent[ i ] ), 0.0 );",

							// diffuse

							"#ifdef WRAP_AROUND",

								"float spotDiffuseWeightFull = max( dot( normal, spotVector ), 0.0 );",
								"float spotDiffuseWeightHalf = max( 0.5 * dot( normal, spotVector ) + 0.5, 0.0 );",

								"vec3 spotDiffuseWeight = mix( vec3 ( spotDiffuseWeightFull ), vec3( spotDiffuseWeightHalf ), wrapRGB );",

							"#else",

								"float spotDiffuseWeight = max( dot( normal, spotVector ), 0.0 );",

							"#endif",

							"spotDiffuse += spotDistance * spotLightColor[ i ] * uDiffuseColor * spotDiffuseWeight * spotEffect;",

							// specular

							"vec3 spotHalfVector = normalize( spotVector + viewPosition );",
							"float spotDotNormalHalf = max( dot( normal, spotHalfVector ), 0.0 );",
							"float spotSpecularWeight = specularTex.r * max( pow( spotDotNormalHalf, uShininess ), 0.0 );",

							"#ifdef PHYSICALLY_BASED_SHADING",

								// 2.0 => 2.0001 is hack to work around ANGLE bug

								"float specularNormalization = ( uShininess + 2.0001 ) / 8.0;",

								"vec3 schlick = uSpecularColor + vec3( 1.0 - uSpecularColor ) * pow( 1.0 - dot( spotVector, spotHalfVector ), 5.0 );",
								"spotSpecular += schlick * spotLightColor[ i ] * spotSpecularWeight * spotDiffuseWeight * spotDistance * specularNormalization * spotEffect;",

							"#else",

								"spotSpecular += spotDistance * spotLightColor[ i ] * uSpecularColor * spotSpecularWeight * spotDiffuseWeight * spotEffect;",

							"#endif",

						"}",

					"}",

				"#endif",

				// directional lights

				"#if MAX_DIR_LIGHTS > 0",

					"vec3 dirDiffuse = vec3( 0.0 );",
					"vec3 dirSpecular = vec3( 0.0 );",

					"for( int i = 0; i < MAX_DIR_LIGHTS; i++ ) {",

						"vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );",
						"vec3 dirVector = normalize( lDirection.xyz );",

						// diffuse

						"#ifdef WRAP_AROUND",

							"float directionalLightWeightingFull = max( dot( normal, dirVector ), 0.0 );",
							"float directionalLightWeightingHalf = max( 0.5 * dot( normal, dirVector ) + 0.5, 0.0 );",

							"vec3 dirDiffuseWeight = mix( vec3( directionalLightWeightingFull ), vec3( directionalLightWeightingHalf ), wrapRGB );",

						"#else",

							"float dirDiffuseWeight = max( dot( normal, dirVector ), 0.0 );",

						"#endif",

						"dirDiffuse += directionalLightColor[ i ] * uDiffuseColor * dirDiffuseWeight;",

						// specular

						"vec3 dirHalfVector = normalize( dirVector + viewPosition );",
						"float dirDotNormalHalf = max( dot( normal, dirHalfVector ), 0.0 );",
						"float dirSpecularWeight = specularTex.r * max( pow( dirDotNormalHalf, uShininess ), 0.0 );",

						"#ifdef PHYSICALLY_BASED_SHADING",

							// 2.0 => 2.0001 is hack to work around ANGLE bug

							"float specularNormalization = ( uShininess + 2.0001 ) / 8.0;",

							"vec3 schlick = uSpecularColor + vec3( 1.0 - uSpecularColor ) * pow( 1.0 - dot( dirVector, dirHalfVector ), 5.0 );",
							"dirSpecular += schlick * directionalLightColor[ i ] * dirSpecularWeight * dirDiffuseWeight * specularNormalization;",

						"#else",

							"dirSpecular += directionalLightColor[ i ] * uSpecularColor * dirSpecularWeight * dirDiffuseWeight;",

						"#endif",

					"}",

				"#endif",

				// hemisphere lights

				"#if MAX_HEMI_LIGHTS > 0",

					"vec3 hemiDiffuse  = vec3( 0.0 );",
					"vec3 hemiSpecular = vec3( 0.0 );" ,

					"for( int i = 0; i < MAX_HEMI_LIGHTS; i ++ ) {",

						"vec4 lDirection = viewMatrix * vec4( hemisphereLightDirection[ i ], 0.0 );",
						"vec3 lVector = normalize( lDirection.xyz );",

						// diffuse

						"float dotProduct = dot( normal, lVector );",
						"float hemiDiffuseWeight = 0.5 * dotProduct + 0.5;",

						"vec3 hemiColor = mix( hemisphereLightGroundColor[ i ], hemisphereLightSkyColor[ i ], hemiDiffuseWeight );",

						"hemiDiffuse += uDiffuseColor * hemiColor;",

						// specular (sky light)


						"vec3 hemiHalfVectorSky = normalize( lVector + viewPosition );",
						"float hemiDotNormalHalfSky = 0.5 * dot( normal, hemiHalfVectorSky ) + 0.5;",
						"float hemiSpecularWeightSky = specularTex.r * max( pow( hemiDotNormalHalfSky, uShininess ), 0.0 );",

						// specular (ground light)

						"vec3 lVectorGround = -lVector;",

						"vec3 hemiHalfVectorGround = normalize( lVectorGround + viewPosition );",
						"float hemiDotNormalHalfGround = 0.5 * dot( normal, hemiHalfVectorGround ) + 0.5;",
						"float hemiSpecularWeightGround = specularTex.r * max( pow( hemiDotNormalHalfGround, uShininess ), 0.0 );",

						"#ifdef PHYSICALLY_BASED_SHADING",

							"float dotProductGround = dot( normal, lVectorGround );",

							// 2.0 => 2.0001 is hack to work around ANGLE bug

							"float specularNormalization = ( uShininess + 2.0001 ) / 8.0;",

							"vec3 schlickSky = uSpecularColor + vec3( 1.0 - uSpecularColor ) * pow( 1.0 - dot( lVector, hemiHalfVectorSky ), 5.0 );",
							"vec3 schlickGround = uSpecularColor + vec3( 1.0 - uSpecularColor ) * pow( 1.0 - dot( lVectorGround, hemiHalfVectorGround ), 5.0 );",
							"hemiSpecular += hemiColor * specularNormalization * ( schlickSky * hemiSpecularWeightSky * max( dotProduct, 0.0 ) + schlickGround * hemiSpecularWeightGround * max( dotProductGround, 0.0 ) );",

						"#else",

							"hemiSpecular += uSpecularColor * hemiColor * ( hemiSpecularWeightSky + hemiSpecularWeightGround ) * hemiDiffuseWeight;",

						"#endif",

					"}",

				"#endif",

				// all lights contribution summation

				"vec3 totalDiffuse = vec3( 0.0 );",
				"vec3 totalSpecular = vec3( 0.0 );",

				"#if MAX_DIR_LIGHTS > 0",

					"totalDiffuse += dirDiffuse;",
					"totalSpecular += dirSpecular;",

				"#endif",

				"#if MAX_HEMI_LIGHTS > 0",

					"totalDiffuse += hemiDiffuse;",
					"totalSpecular += hemiSpecular;",

				"#endif",

				"#if MAX_POINT_LIGHTS > 0",

					"totalDiffuse += pointDiffuse;",
					"totalSpecular += pointSpecular;",

				"#endif",

				"#if MAX_SPOT_LIGHTS > 0",

					"totalDiffuse += spotDiffuse;",
					"totalSpecular += spotSpecular;",

				"#endif",

				"#ifdef METAL",

					"gl_FragColor.xyz = gl_FragColor.xyz * ( totalDiffuse + ambientLightColor * uAmbientColor + totalSpecular );",

				"#else",

					"gl_FragColor.xyz = gl_FragColor.xyz * ( totalDiffuse + ambientLightColor * uAmbientColor ) + totalSpecular;",

				"#endif",

				"if ( enableReflection ) {",

					"vec3 vReflect;",
					"vec3 cameraToVertex = normalize( vWorldPosition - cameraPosition );",

					"if ( useRefract ) {",

						"vReflect = refract( cameraToVertex, normal, uRefractionRatio );",

					"} else {",

						"vReflect = reflect( cameraToVertex, normal );",

					"}",

					"vec4 cubeColor = textureCube( tCube, vec3( -vReflect.x, vReflect.yz ) );",

					"#ifdef GAMMA_INPUT",

						"cubeColor.xyz *= cubeColor.xyz;",

					"#endif",

					"gl_FragColor.xyz = mix( gl_FragColor.xyz, cubeColor.xyz, specularTex.r * uReflectivity );",

				"}",

				THREE.ShaderChunk[ "shadowmap_fragment" ],
				THREE.ShaderChunk[ "linear_to_gamma_fragment" ],
				THREE.ShaderChunk[ "fog_fragment" ],

			"}"

		].join("\n"),

		vertexShader: [

			"attribute vec4 tangent;",

			"uniform vec2 uOffset;",
			"uniform vec2 uRepeat;",

			"uniform bool enableDisplacement;",

			"#ifdef VERTEX_TEXTURES",

				"uniform sampler2D tDisplacement;",
				"uniform float uDisplacementScale;",
				"uniform float uDisplacementBias;",

			"#endif",

			"varying vec3 vTangent;",
			"varying vec3 vBinormal;",
			"varying vec3 vNormal;",
			"varying vec2 vUv;",

			"varying vec3 vWorldPosition;",
			"varying vec3 vViewPosition;",

			THREE.ShaderChunk[ "skinning_pars_vertex" ],
			THREE.ShaderChunk[ "shadowmap_pars_vertex" ],

			"void main() {",

				THREE.ShaderChunk[ "skinbase_vertex" ],
				THREE.ShaderChunk[ "skinnormal_vertex" ],

				// normal, tangent and binormal vectors

				"#ifdef USE_SKINNING",

					"vNormal = normalize( normalMatrix * skinnedNormal.xyz );",

					"vec4 skinnedTangent = skinMatrix * vec4( tangent.xyz, 0.0 );",
					"vTangent = normalize( normalMatrix * skinnedTangent.xyz );",

				"#else",

					"vNormal = normalize( normalMatrix * normal );",
					"vTangent = normalize( normalMatrix * tangent.xyz );",

				"#endif",

				"vBinormal = normalize( cross( vNormal, vTangent ) * tangent.w );",

				"vUv = uv * uRepeat + uOffset;",

				// displacement mapping

				"vec3 displacedPosition;",

				"#ifdef VERTEX_TEXTURES",

					"if ( enableDisplacement ) {",

						"vec3 dv = texture2D( tDisplacement, uv ).xyz;",
						"float df = uDisplacementScale * dv.x + uDisplacementBias;",
						"displacedPosition = position + normalize( normal ) * df;",

					"} else {",

						"#ifdef USE_SKINNING",

							"vec4 skinVertex = vec4( position, 1.0 );",

							"vec4 skinned  = boneMatX * skinVertex * skinWeight.x;",
							"skinned 	  += boneMatY * skinVertex * skinWeight.y;",

							"displacedPosition  = skinned.xyz;",

						"#else",

							"displacedPosition = position;",

						"#endif",

					"}",

				"#else",

					"#ifdef USE_SKINNING",

						"vec4 skinVertex = vec4( position, 1.0 );",

						"vec4 skinned  = boneMatX * skinVertex * skinWeight.x;",
						"skinned 	  += boneMatY * skinVertex * skinWeight.y;",

						"displacedPosition  = skinned.xyz;",

					"#else",

						"displacedPosition = position;",

					"#endif",

				"#endif",

				//

				"vec4 mvPosition = modelViewMatrix * vec4( displacedPosition, 1.0 );",
				"vec4 worldPosition = modelMatrix * vec4( displacedPosition, 1.0 );",

				"gl_Position = projectionMatrix * mvPosition;",

				//

				"vWorldPosition = worldPosition.xyz;",
				"vViewPosition = -mvPosition.xyz;",

				// shadows

				"#ifdef USE_SHADOWMAP",

					"for( int i = 0; i < MAX_SHADOWS; i ++ ) {",

						"vShadowCoord[ i ] = shadowMatrix[ i ] * worldPosition;",

					"}",

				"#endif",

			"}"

		].join("\n")

	},

	/* -------------------------------------------------------------------------
	//	Cube map shader
	 ------------------------------------------------------------------------- */

	'cube': {

		uniforms: { "tCube": { type: "t", value: null },
					"tFlip": { type: "f", value: -1 } },

		vertexShader: [

			"varying vec3 vWorldPosition;",

			"void main() {",

				"vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
				"vWorldPosition = worldPosition.xyz;",

				"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform samplerCube tCube;",
			"uniform float tFlip;",

			"varying vec3 vWorldPosition;",

			"void main() {",

				"gl_FragColor = textureCube( tCube, vec3( tFlip * vWorldPosition.x, vWorldPosition.yz ) );",

			"}"

		].join("\n")

	},

	// Depth encoding into RGBA texture
	// 	based on SpiderGL shadow map example
	// 		http://spidergl.org/example.php?id=6
	// 	originally from
	//		http://www.gamedev.net/topic/442138-packing-a-float-into-a-a8r8g8b8-texture-shader/page__whichpage__1%25EF%25BF%25BD
	// 	see also here:
	//		http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/

	'depthRGBA': {

		uniforms: {},

		vertexShader: [

			THREE.ShaderChunk[ "morphtarget_pars_vertex" ],
			THREE.ShaderChunk[ "skinning_pars_vertex" ],

			"void main() {",

				THREE.ShaderChunk[ "skinbase_vertex" ],
				THREE.ShaderChunk[ "morphtarget_vertex" ],
				THREE.ShaderChunk[ "skinning_vertex" ],
				THREE.ShaderChunk[ "default_vertex" ],

			"}"

		].join("\n"),

		fragmentShader: [

			"vec4 pack_depth( const in float depth ) {",

				"const vec4 bit_shift = vec4( 256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0 );",
				"const vec4 bit_mask  = vec4( 0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0 );",
				"vec4 res = fract( depth * bit_shift );",
				"res -= res.xxyz * bit_mask;",
				"return res;",

			"}",

			"void main() {",

				"gl_FragData[ 0 ] = pack_depth( gl_FragCoord.z );",

				//"gl_FragData[ 0 ] = pack_depth( gl_FragCoord.z / gl_FragCoord.w );",
				//"float z = ( ( gl_FragCoord.z / gl_FragCoord.w ) - 3.0 ) / ( 4000.0 - 3.0 );",
				//"gl_FragData[ 0 ] = pack_depth( z );",
				//"gl_FragData[ 0 ] = vec4( z, z, z, 1.0 );",

			"}"

		].join("\n")

	}

};
