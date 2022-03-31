var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.calculate = (function( _p ) {

    /**
     * Determine if a point in 2D space is inside a 2D polygon.
     * 
     * @param {*} point The point to check with format: [x,y]
     * @param {*} vs The polygon to check with format: [ [x,y] , [x,y] , ... ]
     */
    _p.pointInPolygon = function(point, vs) {
        // ray-casting algorithm based on
        // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    
        var x = point[0], y = point[1];
    
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0], yi = vs[i][1];
            var xj = vs[j][0], yj = vs[j][1];
    
            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
    
        return inside;

    }; 

    _p.pathPointInsidePolygon = function(p0, p1) {

        var i;
        for (i = 0; i < p0.length; i += 1) {
            if (_p.pointInPolygon(p0[i], p1)) {
                return true;
            }
        }

        return false;

    }

    _p.pathPointOutsidePolygon = function( p0 , p1 ) {
 
        for (var i = 0; i < p0.length; i++ ) {
            if (!_p.pointInPolygon(p0[i], p1)) {
                return true;
            }
        }

        return false;

    }

    _p.linesIntersect = function(a,b,c,d,p,q,r,s) {

        var det, gamma, lambda;
        det = (c - a) * (s - q) - (r - p) * (d - b);

        if (det === 0) {

            return false;

        } else {

            lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
            gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;

            return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);

        }

    };

    _p.polygonEdgesOverlap = function( p0 , p1 ) {

        for (var i = 0; i < p0.length - 1; i += 1) {
            for (var j = 0; j < p1.length - 1; j += 1) {
                if (_p.linesIntersect(p0[i][0], p0[i][1], p0[i + 1][0], p0[i + 1][1], 
                              p1[j][0], p1[j][1], p1[j + 1][0], p1[j + 1][1])) {
                    return true;
                }
            }
        }
        return false;

    }

    _p.polygonsOverlap = function( p0 , p1 ) {

        // polygons overlap if either

        // 1. one of the points of one polygon is inside the other polygon polygon
        if (_p.pathPointInsidePolygon(p0, p1)) {
            return true;
        }

        // 2. one of the edges overlap
        if (_p.polygonEdgesOverlap(p0, p1)) {
            return true;
        }

        return false;

    }
 
    _p.axleLoad = function( axles , COG , totalMass ) {
        
        var load = new Array( axles.length );
        var wbase = _p.vehicleWheelbase( axles );

        for( var i = 0 ; i < axles.length ; i++ ) {

           load[i] = (1.0 - ( Math.abs( COG.x - axles[i].position ) / wbase )) * totalMass;

        }

        return load;

    }

    _p.vehicleWheelbase = function( axles ) {

        if( axles.length < 2 ) {
            return 0;
        }

        var min = axles[0].position;
        var max = min;
        var pos;

        for( var i = 1 ; i < axles.length; i++ ) {

            pos = axles[i].position;
             
            if( pos < min ) {
                min = pos;
            }

            if( pos > max ) {
                max = pos;
            }
      
        }

        return Math.abs(max - min);

    }

    /**
     * Get the center of gravity for a group of 3D objects
     * NOTE: Each object must have an assigned mass property!
     * NOTE2: A uniform density is assumed PER OBJECT
     * @param {*} list 
     */
    _p.objectsCOG = function( list ) {

        var n = list.length;
        // First get the average point
        
        var avg = new THREE.Vector3(0,0,0);
        var avgMass = 0;
        var totalMass = 0;
        var o;
        var oCOG;

        COGs = [];
 
        for( var i = 0 ; i < n ; i++ ) {

            o = list[i];
            if( o.type == "Group" ) {
                oCOG = _p.meshGroup3DCOG( o );
            } else {
                oCOG = _p.mesh3DCOG( o );
            }  
 
            COGs.push(oCOG); // keep a list of object COGs to avoid re-calculating them on the second loop

            avg.add( oCOG );
            if( o.mass == undefined ) { o.mass = 0; }
            avgMass += o.mass;
            totalMass += o.mass;
             

        }

        avgMass /= n;
        avg.divideScalar(n);

        var vec3 = new THREE.Vector3();
        var offset = 1;
        for( var i = 0 ; i < n ; i++ ) {

            o = list[i];
            oCOG = COGs[i];
            offset = o.mass / avgMass;
            vec3.x += oCOG.x * offset;
            vec3.y += oCOG.y * offset;
            vec3.z += oCOG.z * offset;

        }
        
        vec3.divideScalar(n);
 
        return {
            COG: vec3,
            totalMass: totalMass
        };

    }

    /**
     * Find the centroid (Vector3) from a list of objects (single meshes).
     * The list can be a one-dimensional or multi-dimensional array.
     * This method is recursive.
     * 
     * @param {*} list 
     * @param {*} avg 
     * @param {*} n 
     */
    _p.objectsCentroid = function( list  ) {
        
        // Upon initial call, declare the values which will be used recursively
        var avg = new THREE.Vector3();  
        var n = 0;  

        for( var i = 0 ; i < list.length; i++ ) {
            for( var j = 0 ; j < list[i].length; j++ ) { 
                var pos = list[i][j].position == undefined ? list[i][j] : list[i][j].position;
                avg.add( pos );
                n++;
            
            }
        }
         
        return avg.divideScalar(n);

    }

    _p.mesh3DArea = function( mesh ) {

        mesh.updateMatrixWorld();
        var geo = mesh.geometry;
        var n = geo.vertices.length;
        var fixedVerts = [];

        var vec3w;
        for( var i = 0 ; i < n; i++ ) {

            // Get the absolute position of the vertices
            vec3w = geo.vertices[i].clone();
            vec3w.applyMatrix4( mesh.matrixWorld );

            fixedVerts.push(vec3w);

        }

        var temp = new THREE.Geometry();
        temp.faces = geo.faces;
        temp.vertices = fixedVerts;

        return _p.geometry3DArea( temp );


    }

    _p.meshGroup3DCOG = function( group ) {

        var res = new THREE.Vector3();

        if( group.children.length <= 0 ) {
            return res;
        }
        
        var n = group.children.length;
        var r = 0;
        for( var i = 0 ; i < n; i++ ) {

            // Don't include invisible parts of the geometry
            if( group.children[i].visible == false ) {
                continue;
            }
            res.add( _p.mesh3DCOG(group.children[i]) );
            r++;
        }

        res.divideScalar(r);

        return res;

    }

    _p.mesh3DCOG = function( mesh ) {

        mesh.updateMatrixWorld();
 
        var geo = mesh.geometry;
        if( geo.type == "BufferGeometry" ) {
            geo = new THREE.Geometry().fromBufferGeometry(geo);
        }

        if( geo.vertices.length <= 0 ) {
            return new THREE.Vector3();
        }
  
        var res = new THREE.Vector3();
        var n = geo.vertices.length;

        var vec3w;
        for( var i = 0 ; i < n; i++ ) {

            // Get the absolute position of the vertices
            vec3w = geo.vertices[i].clone();
            vec3w.applyMatrix4( mesh.matrixWorld );

            res.add(vec3w);
      
        }

        res.divideScalar(n);
        
        return res;

    }

    // For this to work effectively, there shouldn't be random duplicate vertices. Otherwise they will throw the calculations off creating an unnecessary bias.
    _p.geometry3DCOG = function( geo ) {

        if( geo.vertices.length <= 0 ) {
            return new THREE.Vector3();
        }
 
        var res = new THREE.Vector3();
        var n = geo.vertices.length;

        for( var i = 0 ; i < n; i++ ) {

            res.add( geo.vertices[i] );
             

        }

        res.divideScalar(n);
    
        return res;

    }

    _p.geometry3DArea = function( geo ) {

        if( geo.faces.length <= 0 ) {
            return 0;
        }

        var sum = 0;

        var f;
        for( var i = 0 ; i < geo.faces.length; i++ ) {

            f = geo.faces[i];
            sum += this.triangle3DArea( geo.vertices[ f.a ] , geo.vertices[ f.b ] , geo.vertices[ f.c ] );

        }

        return sum;

    }

    _p.mirrorGeometry = function( geo , x , y , z ) {

        var x = x == true ? -1 : 1;
        var y = y == true ? -1 : 1;
        var z = z == true ? -1 : 1;
        geo.applyMatrix( new THREE.Matrix4().makeScale( x,y,z ) );

    }

    _p.triangle3DArea = function( p1 , p2 , p3 ) {

        var tri = new THREE.Triangle( p1 , p2 , p3 );

        return tri.getArea();

    }

    _p.reverseFaceOrderMesh = function( mesh ) {

        if( mesh.children.length <= 0 ) {
            _p.reverseFaceOrder( mesh.geometry );
        } else {
            for(var i=0;i<mesh.children.length;i++){
                _p.reverseFaceOrder( mesh.children[i].geometry);
            }
        }

    }

    _p.reverseFaceOrder = function( geo ) {

        var tmp;
        for(var f = 0; f < geo.faces.length; f++) {
            tmp = geo.faces[f].clone();
            geo.faces[f].a = tmp.c;
            geo.faces[f].c = tmp.a;
        }

    }

    _p.calcNormal = function( normals, normal, angle ) {

        var allowed = normals.filter( n => n.angleTo( normal ) < angle * Math.PI / 180 );
        
        return allowed.reduce( (a, b) => a.clone().add( b ) ).normalize();
    }

    _p.computeVertexNormalsMesh = function( mesh , angle ) {

        if( mesh.children.length <= 0 ) {
            _p.computeVertexNormals( mesh.geometry , angle );
        } else {
            for(var i=0;i<mesh.children.length;i++){
                _p.computeVertexNormals( mesh.children[i].geometry , angle );
            }
        }

    }
    
    _p.computeVertexNormals = function( geometry , angle ){

        geometry.faces.map(f => f.vertexNormals = []); // remove vertex normals 
        geometry.faces.map(f => f.normal.set(0,0,0)); // reset face normals

        geometry.computeFaceNormals();
        
        var vertices = geometry.vertices.map( () => [] ); // vertices with normals array
    
        geometry.faces.map( face => {
            vertices[ face.a ].push( face.normal );
            vertices[ face.b ].push( face.normal );
            vertices[ face.c ].push( face.normal );
        });
    
        geometry.faces.map( face => {
            face.vertexNormals[ 0 ] = _p.calcNormal( vertices[ face.a ], face.normal, angle );
            face.vertexNormals[ 1 ] = _p.calcNormal( vertices[ face.b ], face.normal, angle );
            face.vertexNormals[ 2 ] = _p.calcNormal( vertices[ face.c ], face.normal, angle );
        });
    
        if ( geometry.faces.length > 0 ) { 
            geometry.normalsNeedUpdate = true;
        }
    }

    _p.groupToMesh = function( group , material ) {

        var geo = new THREE.Geometry();
        var mesh;
        var c,g;
        for( var i = 0 ; i < group.children.length; i++ ) {

            c = group.children[i];

            if( c.visible == false ) { 
                continue;
            }

            g = c.geometry;

            if( g.type == "BufferGeometry" ) {
                g = new THREE.Geometry().fromBufferGeometry(g);
            }

            geo.merge( g );

        }

        mesh = new THREE.Mesh( geo , material );

        return mesh;

    }

    return _p;

})({});