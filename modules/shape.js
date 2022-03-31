var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.shape = (function( _public ) {

    _public.polygonShape = function( pts , xoffset , yoffset ) {

        xoffset = xoffset == undefined ? 0 : xoffset;
        yoffset = yoffset == undefined ? 0 : yoffset;

        var shape = new THREE.Shape();

        shape.moveTo( pts[0].x + xoffset, pts[0].y + yoffset );

        for( var i = 1 ; i < pts.length; i++ ) {

            shape.lineTo( pts[i].x + xoffset, pts[i].y + yoffset );

        }

        shape.lineTo( pts[0].x + xoffset, pts[0].y + yoffset );

        return shape;

    }

    _public.pointCurvePath = function( pts ) {

        var spline = new THREE.CurvePath();

        if( pts.length < 2 ) {
            return spline;
        }

        spline.curves = [];

        for( var i = 0 ; i < pts.length-1; i++ ) {
 
            spline.curves.push(new THREE.LineCurve3( pts[i] , pts[i+1] ) );

        }

        return spline;

    }

    _public.pointCatmullRomCurve = function( pts , tension ) {

        var spline = new THREE.CatmullRomCurve3(pts);
        spline.tension = THREE.Math.clamp( tension , 0 , 1 );
        return spline;

    }

    _public.ellipseCurvePath = function(npts,xrad,yrad) {

        var ar = [];

        var x1,y1,v1,v2;
        var seg = Math.PI*2 / npts;

        for( var i = 0 ; i < npts  ; i++ ) {
            
            x1 = xrad * Math.cos( seg*i );
            y1 = yrad * Math.sin( seg*i );
            x2 = xrad * Math.cos( seg*(i+1) );
            y2 = yrad * Math.sin( seg*(i+1) );

            v1 = new THREE.Vector3( x1 , y1 , 0 );
            v2 = new THREE.Vector3( x2 , y2 , 0 );

            ar.push( new THREE.LineCurve3( v1 , v2 ) );
           
        
        }

        var spline = new THREE.CurvePath();
        spline.curves = ar;
        
        return spline;

    }

    _public.circleCurvePath = function( npts , rad ) {

        return _public.ellipseCurvePath(npts,rad,rad);

    };

    _public.ellipse = function( npts , xrad , yrad , xoffset , yoffset ) {
        
        var shape = new THREE.Shape();
        
        xoffset = xoffset == undefined ? 0 : xoffset;
        yoffset = yoffset == undefined ? 0 : yoffset;

        shape.moveTo( xrad + xoffset, yoffset );
    
        var seg = Math.PI*2 / npts;
        
        for( var i = 0 ; i < npts ; i++ ) {
        
            shape.lineTo( xrad * Math.cos(seg*i) +xoffset , yrad * Math.sin( seg*i ) + yoffset );
        
        }
        
        shape.lineTo(xrad + xoffset, yoffset);
        
        return shape;

    }

    _public.circle = function( npts , rad , xoffset , yoffset ) {
        
        return _public.ellipse(npts,rad,rad,xoffset , yoffset);
    
    }
    
    
    // Create a ring shape with a specified outer and inner radius. 
    _public.ring = function( rad1 , rad2 , npts ) {

        var s = _public.circle( npts , rad1 );
        var hole = _public.circle( npts , rad2 );
        s.holes = [ hole ];

        return s;

    }

    _public.ellipsePoints = function( npts , xrad , yrad , xoffset , yoffset ) {

        xoffset = xoffset == undefined ? 0 : xoffset;
        yoffset = yoffset == undefined ? 0 : yoffset;
        var pts = [];

        var ai = (Math.PI*2) / npts;
        for( var i = 0 ; i < npts ; i++ ) {
            pts.push(
                new THREE.Vector2( xrad * Math.cos(ai*i) + xoffset , yrad * Math.sin(ai*i) + yoffset )
            );
        }

        return pts;

    }

    _public.circlePoints = function( npts , rad , xoffset , yoffset ) {

        return _public.ellipsePoints( npts , rad , rad , xoffset , yoffset );
        
    }

    _public.rectanglePoints = function (x, y, w, h , center ) {

        var hw = 0;
        var hh = 0;
        if( center == true ) {
            hw = -w/2;
            hh = -h/2;
        }

        var pts = [
            new THREE.Vector2 ( x +hw , y +hh ),
            new THREE.Vector2 ( x+w +hw , y +hh),
            new THREE.Vector2 ( x+w +hw , y+h  +hh ),
            new THREE.Vector2 ( x +hw , y+h  +hh )
        ];

        return pts;

    };

    _public.rectangle = function (x, y, w, h , center) {

        var pts = public.rectanglePoints(x,y,w,h , center );
        var shape = new THREE.Shape( pts );
  
        return shape;
    };

    _public.rectangleRoundedPoints = function(w,h,r, points , offset , center) {

        var pts = [
            new THREE.Vector3( 0, 0, 0 ),
            new THREE.Vector3( w, 0, 0 ),
            new THREE.Vector3( w, h, 0 ),
            new THREE.Vector3( 0, h, 0 ) 
        ];
        if( offset !== undefined ) {
            var cvec = new THREE.Vector3();
            if( center == true ) {
                cvec.set(-w/2,-h/2,0);
            }
            for(var i=0;i<pts.length;i++){

                pts[i].add(offset).add(cvec);

            }
        }
        var curve = new THREE.CatmullRomCurve3( pts );
        curve.closed = true;
        curve.curveType = "catmullrom";
        curve.tension = r;
        var pts = curve.getPoints( points );
        
        for(var i = 0 ; i < pts.length; i++ ) {
           pts[i] = new THREE.Vector2( pts[i].x , pts[i].y );
        }

        return pts;

    }
    _public.rectangleRounded = function( w,h,r, points , offset , center ) {

        var pts = _public.rectangleRoundedPoints(w,h,r, points , offset , center);
 
        var shape = new THREE.Shape( pts );
  
        return shape;

    }

    _public.CBeam = function( w , h , th , iw , r , points , flipZ ) {

        var zdir = flipZ === true ? -1 : 1;
        var curve = new THREE.CatmullRomCurve3( [
            new THREE.Vector3( 0, 0, 0 ),
            new THREE.Vector3( w*zdir, 0, 0 ),
            new THREE.Vector3( w*zdir, h, 0 ),
            new THREE.Vector3( 0, h, 0 ),
            new THREE.Vector3( 0, h-th, 0 ),
            new THREE.Vector3( w*zdir -1*zdir*iw, h-th, 0 ), // Tricks to flip shape direction without any additional variables
            new THREE.Vector3( w*zdir -1*zdir*iw , th, 0 ),
            new THREE.Vector3( 0, th, 0 )
        ] );
        curve.closed = true;
        curve.curveType = "catmullrom";
        curve.tension = r;
        var pts = curve.getPoints( points );
        var shape = new THREE.Shape( pts );
  
        return shape;

    }

    _public.IBeam = function( w , h , th , iw , r , points ) {

        w = w/2;
        
        //var th = 0.3;
        //var iw = 0.3;

        var curve = new THREE.CatmullRomCurve3( [
            new THREE.Vector3( -w, -h/2, 0 ),
            new THREE.Vector3( w, -h/2, 0 ),
            new THREE.Vector3( w, th -h/2, 0 ),
            new THREE.Vector3( iw/2, th -h/2, 0 ),
            new THREE.Vector3( iw/2 , h-th -h/2, 0 ),
            new THREE.Vector3( w, h-th -h/2, 0 ),

            new THREE.Vector3( w, h -h/2, 0 ),
            new THREE.Vector3( -w, h -h/2, 0 ),
            new THREE.Vector3( -w, h-th -h/2, 0 ),
            new THREE.Vector3( -iw/2, h-th -h/2, 0 ), 
            new THREE.Vector3( -iw/2, th -h/2, 0 ),
            new THREE.Vector3( -w, th -h/2, 0 )
        ] );
        curve.closed = true;
        curve.curveType = "catmullrom";
        curve.tension = r;
        var pts = curve.getPoints( points );
        var shape = new THREE.Shape( pts );
  
        return shape;

    }

    _public.coilSpring = function( radius , height , numloops , numsegs ) {

        var ar = [];

        var lh = height / numloops;

        var maxang = Math.PI*2 * numloops;

        var totalsegs = numsegs * numloops;
        var ainc = maxang / totalsegs;
        var yinc = height / totalsegs;

        var y = 0;
        for( var i = 0 ; i < maxang ; i+= ainc ) {

            y += yinc;

            ar.push( new THREE.Vector3( Math.cos( i )*radius , y,  Math.sin( i )*radius ) );

        }

        var curve = new THREE.CatmullRomCurve3(ar);
        curve.closed = false;
        curve.curveType = "catmullrom";
        curve.tension = 0.0;

        var pts = curve.getPoints( totalsegs );
        var shape = new THREE.Shape( pts );
  
        return curve;

    }
    

    _public.shapeCenter = function( shape ) {

        var avg = new THREE.Vector2();
        var n = shape.length;
        for( var i = 0 ; i < n; i++ ) {
            avg.add(shape[i]);
        }
        avg.divideScalar(n);

        return avg;

    }

    _public.moveShape = function( shape , offset ) {

        for( var i = 0 ; i < shape.length; i++ ) {

            shape[i].add(offset);

        }

    }

    _public.moveShapeTo = function( shape , position ) {

        var mid = _public.shapeCenter( shape );
        var offset = new THREE.Vector2().subVectors( position , mid );

        return _public.moveShape( shape , offset );

    }

    /**
     * Alternative name to the moveShapeTo method. Useful for the canvas module which uses an automated translating algorithm.
     * @param {*} shape 
     * @param {*} position 
     */
    _public.placeShape = function( shape , position ) {
        _public.moveShapeTo(shape,position);
    }
    
    _public.scaleShape = function( shape , scale ) {

        var avg = _public.shapeCenter(shape);

        var d;
        for( var i = 0 ; i < shape.length ; i++ ) {

            d = new THREE.Vector2().subVectors( shape[i] , avg );

            shape[i] = new THREE.Vector2().addVectors( avg , new THREE.Vector2().copy(d).multiply(scale) )

        }

    }

    _public.rotateShape = function( shape , angle ) {
         
        var origin = _public.shapeCenter(shape);
        _public.moveShapeTo( shape , new THREE.Vector2() );
        
        var euler = new THREE.Euler( 0, 0, angle );
        var vec3;
        for( var i = 0 ; i < shape.length ; i++ ) {

            vec3 = new THREE.Vector3(shape[i].x,shape[i].y,0);
            vec3.applyEuler(euler);

            shape[i].x = vec3.x;
            shape[i].y = vec3.y;

        }
        _public.moveShapeTo( shape , origin );
         
    }

    _public.flipShape = function( shape , axis ) {

        var s = new THREE.Vector2(1,1);
        if( axis == "x" ) {
            s.x = -1;
        } else if( axis == "y" ) {
            s.y = -1;
        } else if( axis == "both" ) {
            s.x = -1;
            s.y = -1;
        }

        _public.scaleShape( shape , s );

    }

    _public.cloneShape = function( shape ) {

        var p = [];
        for( var i = 0 ; i < shape.length; i++ ) {
            p.push( shape[i].clone() );
        }
        return p;

    }

    _public.shapeBounds = function( shape ) {

        var ucase = 10000000;
        var b = {
            x: {min: ucase,max: -ucase, minPoint:null , maxPoint:null },
            y: {min: ucase,max: -ucase, minPoint:null , maxPoint:null },
            width: 0,
            height: 0
        };

        var s;
        for( var i = 0 ; i < shape.length; i++ ) {

            s = shape[i];
            if( s.x < b.x.min ) { b.x.min = s.x; b.x.minPoint = s; }
            if( s.x > b.x.max ) { b.x.max = s.x; b.x.maxPoint = s; }
            if( s.y < b.y.min ) { b.y.min = s.y; b.y.minPoint = s; }
            if( s.y > b.y.max ) { b.y.max = s.y; b.y.maxPoint = s; }

        }

        b.width = Math.abs(b.x.max - b.x.min);
        b.height = Math.abs(b.y.max - b.y.min);

        return b;

    }


    
    /**
     * 
     * @param {*} curve 
     */
    _public.curveCenter = function( curve ) {

        var ref;
        if( curve.length ) {
            ref = curve;
        } else {
            ref = curve.points;
        }

        var n = ref.length;
        var avg = new THREE.Vector3();
        for( var i = 0 ; i < n ; i++ ) {

            avg.add(ref[i]);

        }
        avg.divideScalar( n );
        return avg;

    }

    /**
     * Flip a curve's control points on a specified axis.
     * The curve's orientation is flipped locally (i.e. relative to the centroid)
     * 
     * @param {*} curve 
     * @param {*} axis the axis to flip the curve on (x, y or z)
     */
    _public.flipCurve = function( curve , axis , pivot  ) {

        var scale = new THREE.Vector3(1,1,1);
        if( axis.x == 1 ) { scale.x = -1; }
        if( axis.y == 1 ) { scale.y = -1; }
        if( axis.z == 1 ) { scale.z = -1; } 
        
        _public.scaleCurve( curve , scale , pivot );

    }

    /**
     * Scale a curve's control points.
     * Scale value is used as a multiplier. Default is 1.0 (retains current scale).
     * 
     * @param {*} curve 
     * @param {*} axis 
     * @param {*} scale 
     */
    _public.scaleCurve = function( curve , scale , pivot ) {
         
        var ref;
        if( curve.length ) {
            ref = curve;
        } else {
            ref = curve.points;
        }

        var avg;
        if( pivot !== undefined ) { avg = pivot; }
        else { avg = _public.curveCenter( ref ); }
 
        var delta = 0;
        for( var i = 0 ; i < ref.length ; i++ ) {

            delta = new THREE.Vector3().subVectors( ref[i] , avg );
            ref[i] = new THREE.Vector3().addVectors( avg , new THREE.Vector3().copy(delta).multiply(scale) );

        }

    }

    /**
     * Move a curve's control points by a specific amount
     * 
     * @param {*} curve a THREE.Curve / CatmullRomSpline3 / etc. curve (can be 2D or 3D)
     * @param {*} offset a THREE.Vector3 instance
     */
    _public.moveCurve = function( curve , offset ) {

        var ref;
        if( curve.length ) {
            ref = curve;
        } else {
            ref = curve.points;
        }

        for( var i = 0 ; i < ref.length ; i++ ) {

            ref[i].add(offset);

        }

    }

    _public.placeCurve = function( curve,position,pivot ) {
        return _public.moveCurveTo( curve,position,pivot );
    }

    _public.moveCurveTo = function( curve , position , pivot ) {

        var ref;
        if( curve.length ) {
            ref = curve;
        } else {
            ref = curve.points;
        }

        var avg;
        if( pivot !== undefined ) { avg = pivot; }
        else { avg = _public.curveCenter( ref ); }
 
        var offset = new THREE.Vector3().subVectors( position , avg );

        return _public.moveCurve( ref , offset );

    }

    /**
     * 
     * 
     * @param {*} curve 
     * @param {*} axis 
     * @param {*} amount 
     */
    _public.rotateCurve = function( curve , amount , pivot ) {
        
        var ref;
        if( curve.length ) {
            ref = curve;
        } else {
            ref = curve.points;
        }

        var origin;
        if( pivot !== undefined ) { origin = pivot; }
        else { origin = _public.curveCenter( ref ); }
        
        _public.moveCurveTo( ref, new THREE.Vector3() , origin );
        
        var euler = new THREE.Euler().setFromVector3( amount );
        euler.order="ZYX";
        for( var i = 0 ; i < ref.length ; i++ ) {

            ref[i].applyEuler(euler);
  
        }

        _public.moveCurveTo( ref , origin , new THREE.Vector3() );

    }

    return _public;

})( {} );
 