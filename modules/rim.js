var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.rim = (function( _p ){
 
    var LIMITS = {
        minDepth: 0.5,
        maxDepth: 3.0,
        minTopInset: 1.0,
        maxTopInset: 3.0
    }

    _p.instance = function() {
        
        this.boltPattern = 5;

    };

    _p.instance.prototype.constructRimGeometry = function( points , size , width , depth , topinset , innerWidth , innerHeight ) {
 
        var spline = VDS.module.shape.circleCurvePath( points , size/2 );
        var extrudeSettings = {
            steps: points,
            bevelEnabled: false,
            extrudePath: spline
        };

        var w = width;
        var h = (depth < LIMITS.minDepth) ? LIMITS.minDepth : (depth > LIMITS.maxDepth) ? LIMITS.maxDepth : depth;
        var inw = 0.5;
        var inh = 0.7;
        var inbevel = (topinset < LIMITS.minTopInset) ? LIMITS.minTopInset : (topinset > LIMITS.maxTopInset) ? LIMITS.maxTopInset : topinset;
        var pts = [];
        pts.push(
            new THREE.Vector2 ( 0.0 , 0.1 ),
            new THREE.Vector2 ( 0.1 , 0 ),
            new THREE.Vector2 ( inw-0.1 , 0 ), //bevel 
            new THREE.Vector2 ( inw  , 0.1 ),
            new THREE.Vector2 ( inw*inbevel , inh-0.1 ), // bevel
            new THREE.Vector2 ( inw*inbevel+0.1 , inh ),
         
             
            new THREE.Vector2 ( w-inw*inbevel-0.1 , inh ),
            new THREE.Vector2 ( w-inw*inbevel, inh-0.1 ), // bevel
 
            new THREE.Vector2 ( w-inw , 0.1 ), //bevel
            new THREE.Vector2 ( w-inw+0.1 , 0 ),
            new THREE.Vector2 ( w-0.1 , 0 ),
            new THREE.Vector2 ( w  , 0.1 ),
            new THREE.Vector2 ( w , h-0.1 ),
            new THREE.Vector2 ( w-0.2 , h ), // bevel
            new THREE.Vector2 ( w-0.2-innerWidth , innerHeight ),
            new THREE.Vector2 ( 0.2+innerWidth , innerHeight ),
            new THREE.Vector2 ( 0.2 , h ), // bevel
            new THREE.Vector2 ( 0 , h-0.1 )
        );
        var shape = new THREE.Shape( pts );
      
        var geo = new THREE.ExtrudeGeometry( shape, extrudeSettings );
          
        var ptsPerLine = pts.length;
        // Approximate the vertex points which are off on the y-axis (the first and last segment on the circle). Place them back to 0 on the y-axis.
        for(var i = 0 ; i < geo.vertices.length; i++ ) {
            if( Math.abs(geo.vertices[i].y) < 0.5  && geo.vertices[i].x > 0 ) { 
                geo.vertices[i].y = 0;
            }
        }
         
        // Remove the caps from the rim (the number of triangles in a 2D shape from points == (the number of points-2)*2
        geo.faces.splice(0,(ptsPerLine-2)*2);
        // Now that the caps are removed we can weld the vertices which are on the same positions (duplicates)
        geo.mergeVertices();
        
        // Make the geometry smooth (not faceted)
        geo.computeFaceNormals();
         geo.computeVertexNormals(true);
       //geo.computeFlatVertexNormals();
        geo.computeBoundingBox();
        geo.translate(0,0,w/2);

        return geo;

    }

    _p.instance.prototype.buildRimDesign = function( cfg ) {

        var rad = cfg.radius;
        var nPts = cfg.points == undefined || cfg.points < 5 ? 5 : cfg.points;
        var cuts = cfg.cuts;
        var thickness = cfg.thickness;

        var cOff = cfg.outlineOffset !== undefined ? cfg.outlineOffset : new THREE.Vector2();  
         
        var circle = VDS.module.shape.circle( nPts , rad , cOff.x , cOff.y );
        
        circle.holes = [];
        for( var i = 0 ; i < cuts.length; i++ ) {

            // If its a single shape, add it and move on
            if( cuts[i].type == "Shape" ) {
                circle.holes.push(cuts[i]);
                continue;
            } 

            // Otherwise a pattern needs to be applied

            var aInt = (Math.PI*2)/cuts[i].repeat;

            var cr = cuts[i].radius;
            var poly = cuts[i].polygon;
            var aOffset = cuts[i].angleOffset == undefined ? 0 : cuts[i].angleOffset;
            VDS.module.shape.rotateShape( poly , aOffset );

            var shape,clone;
            var sv;
            for( var j = 0 ; j < cuts[i].repeat; j++ ) {
                 
                VDS.module.shape.moveShapeTo( poly , new THREE.Vector2( Math.cos(aInt*j)*cr , Math.sin(aInt*j)*cr ) );
                // Clone the shape to avoid losing the original data after scaling. 
                clone = JSON.parse(JSON.stringify(poly));
              
                if( cuts[i].useScaleVariety == true && cuts[i].scaleVariety !== null && cuts[i].scaleVariety.length ) {
                     
                    sv = cuts[i].scaleVariety[ j % cuts[i].scaleVariety.length];
                    VDS.module.shape.scaleShape( clone , sv[0] , sv[1] );
                }

                shape = new THREE.Shape(clone);
                circle.holes.push(shape);
                // Has to be done at the end so it doesn't interfere with the initial angle
                if( cuts[i].rotate == true ) {
                    VDS.module.shape.rotateShape( poly , aInt );
                }

            }


        }
         

        // Add bolt pattern
        var bRad = cfg.boltRadius;
        var bSize = cfg.boltSize;
        var bSegs = cfg.boltSegments;
        var bInt = (Math.PI*2)/cfg.numBolts;
        var bShape;  
        
        for( var i = 0 ; i < cfg.numBolts; i++ ) {

            bShape = VDS.module.shape.circle( bSegs , bSize , Math.cos(bInt*i)*bRad + cOff.x , Math.sin(bInt*i)*bRad + cOff.y );
            circle.holes.push(bShape);
        
        }

        var extrudeSettings = { 
            depth: thickness, 
            bevelEnabled: cfg.bevel.enabled, 
            bevelSegments: cfg.bevel.segments, 
            steps: cfg.bevel.steps, 
            bevelSize: cfg.bevel.size, 
            bevelThickness: cfg.bevel.thickness,
            // Extra parameters (added by me, won't be available if a different version of THREE.js is added)
            bevelFront: cfg.bevel.front,
            bevelBack: cfg.bevel.back,
            removeFrontFaces: cfg.removeFront,
            removeBackFaces: cfg.removeBack,
            removeSidewallFaces: cfg.removeSidewall,
            removeContourFaces: cfg.removeContour
        };
        var geometry = new THREE.ExtrudeGeometry( circle, extrudeSettings );
 
        geometry.mergeVertices();
        VDS.module.calculate.computeVertexNormals(geometry,40);
     
        return geometry;

    }

    return  _p;

})( {} );