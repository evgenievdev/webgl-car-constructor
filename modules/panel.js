var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.panel = (function( _p ){

    /**
     * 
     * @param {*} editor 
     * @param {*} cfg 
     */
    _p.instance = function( editor , cfg ) {

        this.editor = editor;
        this.id = cfg.id == undefined ? "panel-"+THREE.Math.generateUUID() : cfg.id;
        // Pivot point used for translating, rotating, scaling panel
        this.pivot = new THREE.Object3D();
        if( this.editor !== null ) { 
            this.editor.scene.add(this.pivot);
        }
        this.pivot.matrixAutoUpdate = true;

        // Added by the build() method
        this.mesh = null;
        this.geometry = null;
        this.area = 0;
        // Essential
        this.curves = cfg.curves;
        this.order = cfg.order;
        this.numPoints = cfg.numPoints;
        this.stepsBetweenCurves = cfg.stepsBetweenCurves;
        this.offset = cfg.offset;

        this.angle = new THREE.Vector3(); // Angle used to store the current value for rotation. 

        this.selectedCurves = [];

        this.build();

  
    }

    _p.instance.prototype.cloneCurves = function() {

        var c = this.curves;
        var ar = new Array(c.length);
        for( var i = 0 ; i < c.length;i++) {

            var pt = new Array(c[i].points.length);

            for(var j=0;j< c[i].points.length;j++) {

                pt[j] = c[i].points[j].clone();

            }

            var s = new THREE.CatmullRomCurve3(pt);
            ar[i] = s;

        }

        return ar;

    }

    _p.instance.prototype.createOrder = function( desc ) {

        var a = [];
        var n = this.curves.length;
        for( var i = 0 ; i < n; i++ ) {
            a[i] = desc === true ? n-1-i : i;
        }

        return a;

    }

    _p.instance.prototype.positionPivot = function( exclude ) {

        exclude = exclude == undefined || !exclude.length ? [] : exclude;

        var temp = [];
        for( var i = 0 ; i < this.controlPoints.length; i++ ) {
            if( exclude.indexOf(i) >= 0 ) { continue; }
            temp.push(this.controlPoints[i]);
        }
        var center = VDS.module.calculate.objectsCentroid(temp);  

        this.pivot.position.copy(center);
 

    }

    _p.instance.prototype.transform = function( cfg ) {

        cfg = cfg || {};

        var actions = ["flip","rotate","scale","move","place"];
        var action = cfg.action.trim().toLowerCase();
        if( actions.indexOf( action ) < 0 ) { return false; }
        
        var exclude = cfg.exclude == undefined || !cfg.exclude.length ? [] : cfg.exclude;

        var temp = [];
        for( var i = 0 ; i < this.controlPoints.length; i++ ) {
            if( exclude.indexOf(i) >= 0 ) { continue; }
            temp.push(this.controlPoints[i]);
        }
        var center = VDS.module.calculate.objectsCentroid(temp);   

        for( var i = 0 ; i < this.controlPoints.length; i++ ) {
            if( exclude.indexOf(i) >= 0 ) { continue; }
            VDS.module.shape[ action+"Curve" ]( this.controlPoints[i] , cfg.value , center );
        }  
        this.alignPoints(false);
        this.updateControlPoints();

        if( action == "rotate" ) {
            this.angle.add( cfg.value );
        }
  
    }

    /**
     * Rotate a panel's curves and rebuild it.
     * 
     * @param {*} angle The angle vector to rotate by
     */
    _p.instance.prototype.rotate = function( angle , excludeCurves ) {
        this.transform({
            action:"rotate",
            value: angle,
            exclude: excludeCurves
        });
    }

    /**
     * Rotate a panel's curves to a specific angle
     * 
     * @param {*} angle 
     * @param {*} excludeCurves 
     */
    _p.instance.prototype.rotateTo = function( angle , excludeCurves ) {
        this.transform({
            action:"rotate",
            value: new THREE.Vector3().subVectors( angle , this.angle ),
            exclude: excludeCurves
        });
    }

    /**
     * Scale a panel's curves and rebuild it.
     * An axis component of 1 will retain the current scale on that axis.
     * 
     * NOTE: Refrain from using negative scale to flip orientation, it will cause issues with face order and face normals
     * 
     * @param {*} scale The scale vector to resize by 
     */
    _p.instance.prototype.scale = function( scale , excludeCurves ) {
        this.transform({
            action:"scale",
            value: scale,
            exclude: excludeCurves
        });
    }

    _p.instance.prototype.move = function( offset , excludeCurves ) {
        this.transform({
            action:"move",
            value: offset,
            exclude: excludeCurves
        });
    }

    _p.instance.prototype.moveTo = function( position , excludeCurves ) {
        this.transform({
            action:"place",
            value: position,
            exclude: excludeCurves
        });
    }

    _p.instance.prototype.flip = function( axis , excludeCurves ) {
        this.transform({
            action:"flip",
            value: axis,
            exclude: excludeCurves
        });
    }

    /**
     * 
     * @param {*} curves 
     * @param {*} order 
     * @param {*} cfg 
     */
    _p.instance.prototype.build = function() {
 
        if( this.mesh !== null && this.mesh !== undefined ) { 
            // Order has to be reset after first build, otherwise it will cause a mirroring effect every call of this method
            // This has to be done before anything else to ensure the order length and curves length match 
            this.order = this.createOrder(false);

        }

        var curves = this.curves;
        var order = this.order;

        if( !curves.length || !order.length || curves.length !== order.length || curves.length < 2 ) { return false; }

        var offset = this.offset !== undefined ? this.offset : new THREE.Vector3(0,0,0);
        // Icosahedron used for the control points
        var ich = new THREE.IcosahedronGeometry( 1 );

          
        var id, c;
        var numPoints = this.numPoints == undefined || this.numPoints < 3 ? 3 : this.numPoints;
        var stepsBetweenCurves = this.stepsBetweenCurves == undefined || this.stepsBetweenCurves < 2 ? 2 : this.stepsBetweenCurves;
        var controlPoints = [];
        var pointHandles = [];
        var cpMesh;

        _p.reorderCurves( curves , order );

        // Get the arrays of points (Vector3) for each curve in the correct order
        for( var i = 0 ; i < curves.length ; i++ ) {
            
            //id = order[ i ];
            c = curves[i];
            controlPoints.push(
                c.points
            );

            pointHandles.push([]);
            for( var cp = 0 ; cp < curves[i].points.length; cp++ ) {

                cpMesh = new THREE.Mesh( ich , VDS.materials.highlight );
                cpMesh.name = "PanelControlPoint";
                cpMesh.position.copy( curves[i].points[cp].add(offset) );
                pointHandles[ pointHandles.length-1 ].push(
                    cpMesh
                );

            }

        }
 
        var curvePoints = this.calculateCurvePoints( curves , numPoints );
        var g = this.constructGeometry( curvePoints , stepsBetweenCurves , offset );
        
        var area = VDS.module.calculate.geometry3DArea(g);

        if( this.mesh == null ) { 
            this.mesh = new THREE.Mesh( g , VDS.materials.default );
            this.mesh.uuid = this.id; // mesh uuid should match the panel instance's id
        } else {
            this.mesh.geometry.dispose();
            this.mesh.geometry = g;
            this.removePointHandles();
        }
        this.geometry = g;
        this.area = area;
        this.curvePoints = curvePoints;          // The positions in 3D space for all interpolated points along each of the curves (2D array)
        this.controlPoints = controlPoints;      // Positions for all control points (2D array)
        this.pointHandles = pointHandles;        // THREE.Mesh instances for all control points (2D array)

        this.selectedCurves = [];                // Used to translate stuff
        
        // Set the mass property for this panel
        this.mesh.mass = area * 0.025;
        if( this.editor !== null ) { 
            this.editor.container.find("#panel-mass").html("Mass: "+this.mesh.mass.toFixed(0)+" LBS");
        }
        // The offset vector also has to be reset, otherwise the newly built panel will have the offset applied again, moving the control points to the wrong location
        this.offset = new THREE.Vector3();

        this.positionPivot();

    }
    
    _p.reorderCurves = function( curves , order ) {

        // reorder curves
        var tempc = [];
        for( var i = 0 ; i < curves.length ; i++ ) {
            id = order[ i ];
            tempc[i] = curves[id];
        }
        curves = tempc;        

    }
     

    /**
     * 
     * @param {*} curves 
     * @param {*} order 
     * @param {*} numPoints 
     */
    _p.instance.prototype.calculateCurvePoints = function( curves , numPoints ) {

        return _p.calculateCurvePoints( curves , numPoints );

    }

    /**
     * 
     * @param {*} curvePoints 
     * @param {*} interpolations 
     */
    _p.instance.prototype.interpolateCurvePoints = function( curvePoints , interpolations ) {

        return _p.interpolateCurvePoints( curvePoints , interpolations );

    }

    /**
     * 
     * @param {*} curves 
     */
    _p.instance.prototype.updateCurveArcs = function() {

        for( var i = 0 ; i < this.curves.length; i++ ) {

            this.curves[i].updateArcLengths();

        }

    }

    _p.calculateCurvePoints = function( curves , numPoints ) {

        var curvePoints = [];

        var id,c;
        for( var i = 0 ; i < curves.length ; i++ ) {

            c = curves[i];
            curvePoints.push(
                c.getPoints( numPoints )
            );
        
        }

        return curvePoints;

    }

    _p.interpolateCurvePoints = function( curvePoints , interpolations ) {

        var segments = interpolations < 2 ? 2 : interpolations;

        // Add intermediate curves
        var diff;
        var mps = [];
        var npts = curvePoints[0].length;
        var scalar = 0;
        // Create interpolations between each curve by linearly interpolating the points horizontally
        for( var c = 0 ; c < curvePoints.length-1 ; c++ ) {
              
            for( var i = 1 ; i < segments ; i++ ) {

                scalar = i / segments;
                mps.push([]);
                
                for( var j = 0 ; j < npts ; j++ ) {

                    diff = new THREE.Vector3().subVectors( curvePoints[c+1][j] , curvePoints[c][j] );
                    mps[ mps.length-1 ].push(
                        new THREE.Vector3().addVectors( curvePoints[c][j] , new THREE.Vector3().copy(diff).multiplyScalar(scalar) )
                    );


                }

            }

        }
        // Add the interpolated curves to the curvePoints array
        if( segments > 1 ) {
            var fi = 0;
            var fr = 0;
            var icp = curvePoints.length;
            var cpid = 0;
            var cfix = 0;
            segments--;
            for( var i = 0 ; i < icp-1 ; i++ ) {

                for( var y = 0 ; y < segments ; y++ ) { 
                    if( i > 0 && y == 0 ) { cfix++; }
                    cpid = y + fr*segments + 1 + cfix;
                                
                    curvePoints.splice( cpid , 0 , mps[ fi ] );
                    fi++;

                }

                fr++;

            }
        }

    }

    _p.constructGeometry = function( curvePoints , stepsBetweenCurves , offset , twoSided ) {

        var g = new THREE.Geometry();
        g.vertices = [];
        g.faces = [];
        
         
        _p.interpolateCurvePoints( curvePoints , stepsBetweenCurves );

        // First create an array of vertex points
        for( var i = 0 ; i < curvePoints.length ; i++ ) {
         
            for( var j = 0 ; j < curvePoints[i].length; j++ ) {
                
                g.vertices.push( curvePoints[i][j] );

            }
 
        }
        // Then setup the faces based on the vertex points
        var f1,f2,p0,p1,p2,p3;
        var np = curvePoints[0].length;
         
        for( var i = 0 ; i < curvePoints.length-1 ; i++ ) {
           
            for( var j = 0 ; j < curvePoints[i].length-1 ; j++ ) {
                 

                // Face vertex indices (f1 and f2 form a rectangle split diagonally into 2 triangles)
                /*
                *   0 ......... 2
                *     .    .  .
                *     .  .    .
                *   1 ......... 3
                * 
                *   Triangles: f1( 0 , 1 , 2 ) ; f2( 1 , 3 , 2 )
                */
                p0 = i*np + j;
                p1 = i*np + 1  + j;
                p2 = (i+1)*np  + j;
                p3 = (i+1)*np + 1 + j;

                f1 = new THREE.Face3( p0 , p1 , p2 );
                f2 = new THREE.Face3( p1 , p3 , p2 );

                g.faces.push(
                    f1,
                    f2
                );

            }

        }

        //VDS.module.calculate.computeVertexNormals( g , 90 );
        g.computeVertexNormals(true);
        g.computeFaceNormals();
   
        g.computeBoundingBox();

        g.verticesNeedUpdate = true;
        g.facesNeedUpdate = true;
        
        // 2-sided projection
        if( twoSided === true ) { 

            var g2 = g.clone();

            VDS.module.calculate.reverseFaceOrder( g2 );
            g2.computeVertexNormals(true);
            g2.computeFaceNormals();
            g.merge(g2);

        }

        return g;

    }

    /**
     * 
     * @param {*} curvePoints 
     * @param {*} stepsBetweenCurves 
     * @param {*} offset 
     */
    _p.instance.prototype.constructGeometry = function( curvePoints , stepsBetweenCurves , offset ) {

        return _p.constructGeometry( curvePoints , stepsBetweenCurves , offset );

    }

    /**
     * Position the panel's point handles over the control points. 
     * This should ideally be done only once upon panel creation.
     * Additionally, it may be used if the user cancels the panel editing process.
     * 
     * @param {*} CP2PH Align the Control Points to the Point Handles (set to true)
     */
    _p.instance.prototype.alignPoints = function( CP2PH ) {

        if( this.controlPoints.length !== this.pointHandles.length ) {
            return false;
        }

        var cp, ph;
        for( var i = 0 ; i < this.pointHandles.length; i++ ) {
           
            for( var j = 0 ; j < this.pointHandles[i].length; j++ ) {

                cp = this.controlPoints[i][j];
                ph = this.pointHandles[i][j];
                if( CP2PH === true ) { 
                    
                    cp.copy( ph.position );
                    this.curves[i].points[j].copy( ph.position );
                   

                } else {

                    ph.position.copy( cp );

                }

            }

        }
 
        return true;

    }

    /**
     * Take a panel's structure and iterate over it's curves.
     * Each control point for the panel is aligned with the current position of its respective point handle.
     * This is done so that the user can move the handles freely and the points will then be positioned automatically.
     * Repositioning the control points will trigger an update in the geometry
     *
     */
    _p.instance.prototype.updateControlPoints = function() {
        
        if( this.mesh == null ) { return false; }

        var ptsAligned = this.alignPoints( true );
        if( ptsAligned === false ) { return false; }

        var curvePoints = this.calculateCurvePoints( this.curves  , this.numPoints );
        this.updateCurveArcs();
        this.curvePoints = curvePoints;
        

        var newG = this.constructGeometry( curvePoints , this.stepsBetweenCurves , new THREE.Vector3() );
        this.mesh.geometry.dispose();
        this.mesh.geometry = newG;

        this.area = VDS.module.calculate.geometry3DArea(newG);
        this.mesh.mass = this.area * 0.025;
        this.editor.container.find("#panel-mass").html("Mass: "+this.mesh.mass.toFixed(0)+" LBS");

        this.positionPivot();

        return true;

    }

    /**
     * Convert a panel's point handles from a 2D array to a list
     * 
     * @param {*} handles 
     */
    _p.instance.prototype.pointHandlesToList = function() {

        var list = [];
        var handles = this.pointHandles;
        // ES6 way (lacks backwards compatibility, so avoid it for now) : arr1d = [].concat(...arr2d);
        for( var i = 0 ; i < handles.length ; i++ ) {

            for( var j = 0 ; j < handles[i].length; j++ ) {
                list.push(handles[i][j]);
            }

        }

        return list;

    }

    _p.instance.prototype.getPointHandleID = function( o ) {

        var uuid = o.uuid;

        var r = { curveID:null , pointID:null };
        for( var c = 0 ; c < this.pointHandles.length ; c++ ) {
            for(var p = 0 ; p < this.pointHandles[c].length; p++ ) {
                if( this.pointHandles[c][p].uuid == uuid ) {
                    r.curveID = c;
                    r.pointID = p;
                    return r;
                }
            }
        }
        return r;

    }

    _p.instance.prototype.removePointHandles = function() {

        this.editor.removeObjectsByName( "PanelControlPoint" , 10000 );

    }

    _p.instance.prototype.renderPointHandles = function() {

        // Get rid of the object meshes first
        this.removePointHandles();

        for( var v = 0 ; v < this.pointHandles.length ; v++ ) {
            for( var y = 0 ; y < this.pointHandles[v].length; y++ ) {
                this.editor.scene.add( this.pointHandles[v][y] );
            }
        }

        // Align the point handles to the control points positions
        this.alignPoints(false);

    }

    /**
     * Used for translation purposes - the user can select certain curves, so the methods need to know which ones to exclude
     */
    _p.instance.prototype.getExcludedCurves = function( included ) {

        var ref = included == undefined ? this.selectedCurves : included;

        var excl = [];
        for( var i = 0 ; this.curves.length; i++ ) {

            if( ref.indexOf(i) < 0 ) {
                excl.push(i);
            } 

        }
        return excl;

    }

    _p.instance.prototype.insertPoint = function( curveID , afterPID ) {

        // Number of curves
        var nc = this.curves.length;

        // Curve ID is invalid
        if( curveID < 0 || curveID >= nc ) { return false; }

        var cPts = this.curves[ curveID ].points;
        var np = cPts.length;

        // If the last point on the curve is selected, go back one point.
        // ...Because the newly added point will be in the middle between the selected point and the next one
        if( afterPID >= np-1 ) {
            afterPID = np-2;
        }

        var p1 = afterPID;
        var p2 = p1 + 1;

        // Linear interpolation between the two vectors
        var pos = cPts[p1].clone().lerp( cPts[p2] , 0.5 );

        cPts.splice( p2 , 0 , pos );
    
        // Rebuild panel
        this.build();

        return true;

    }
    //UNTESTED
    _p.instance.prototype.insertCurve = function( targetID , cPoints , before , rebuild ) {

        // Number of curves
        var nc = this.curves.length;
        // Curve IDs are invalid
        if( targetID < 0 || targetID >= nc ) { return false; }

        var tID = before == true ? targetID : targetID + 1;
        tID = THREE.Math.clamp( tID , 0 , nc-1 );
      
        var newC = new THREE.CatmullRomCurve3( cPoints );
        this.curves.splice( tID , 0 , newC );

        rebuild = rebuild || true;
        if( rebuild === true ) {
            this.build();
        }
        return true;

    }
    //UNTESTED
    _p.instance.prototype.cloneCurve = function( curveID , targetID , before , rebuild ) {

        // Number of curves
        var nc = this.curves.length;
        // Curve IDs are invalid
        if( curveID < 0 || curveID >= nc || targetID < 0 || targetID >= nc ) { return false; }

        var tID = before == true ? targetID : targetID + 1;
        tID = THREE.Math.clamp( tID , 0 , nc-1 );
        
        // clone the points array with its own unique references
        var cloned = VDS.module.shape.cloneShape( this.curves[ curveID ].points );
        var newC = new THREE.CatmullRomCurve3( cloned ); 
        this.curves.splice( tID , 0 , newC );
    
        rebuild = rebuild || true;
        if( rebuild === true ) {
            this.build();
        }
        return true;

    }


    
    _p.instance.prototype.removePoint = function( curveID , pID , rebuild ) {

        var nc = this.curves.length;
        if( curveID < 0 || curveID >= nc ) { return false; }
        var np = this.curves[ curveID ].points.length; 
        if( pID < 0 || pID >= np ) { return false; }
        
        // If there are only 2 points left remove the curve itself
        if( np <= 2 ) {
            return this.removeCurve( curveID );
        }
        
        this.curves[ curveID ].points.splice(pID,1);


        rebuild = rebuild || true;
        if( rebuild === true ) {
            this.build();
        }

        return true;

    }

    _p.instance.prototype.removeCurve = function( curveID , rebuild ) {
        
        var nc = this.curves.length;
        // Can't remove anything if only 2 curves exist, otherwise geometry can't be created
        if( nc <= 2 ) { return false; }
        // ID out of bounds
        if( curveID < 0 || curveID >= nc ) { return false; }
        
        this.curves.splice( curveID , 1 );
      
        // Rebuild panel
        rebuild = rebuild || true;
        if( rebuild === true ) {
            this.build();
        }
        return true;

    }

    _p.instance.prototype.applySymmetry = function( axis , direction , distance ) {
        
        distance = distance || 5;
     
        var nc = this.curves.length;
        if( nc < 2 ) { return false; }
        
        var avg = VDS.module.calculate.objectsCentroid(this.controlPoints);
        var furthest = this.furthestPoint( avg , axis , direction );
        var delta = new THREE.Vector3().subVectors(furthest,avg);
        var minDist = new THREE.Vector3();
        minDist[axis] = Math.abs(delta[axis])*direction*2;
        var offsetDist = new THREE.Vector3();
        offsetDist[axis] = distance * direction;
 

        cloned = this.cloneCurves();
        var flipAxis = new THREE.Vector3();
        flipAxis[axis] = 1;
        for( var i = 0 ; i < cloned.length; i++ ) {
            VDS.module.shape[ "flipCurve" ]( cloned[i].points , flipAxis , avg );
        }  

        for( var i = 0 ; i < cloned.length; i++ ) {
            VDS.module.shape[ "moveCurve" ]( cloned[i].points , new THREE.Vector3().addVectors( minDist , offsetDist ) );
        } 

         
        cloned = cloned.reverse();
        

        if( axis == "x" && direction == 1 ) {
            this.curves = this.curves.concat( cloned );
        } else if( axis == "x" && direction == -1 ) {
            this.curves = cloned.concat( this.curves );
        } else if( axis == "z" && direction == 1 ) {
            this.curves = this.curves.concat( cloned );
        } else if( axis == "z" && direction == -1 ) {
            this.curves = cloned.concat( this.curves );
            console.log(this.curves);
        }

        this.build();
        return true;

    }

    _p.instance.prototype.furthestPoint = function( origin , axis , dir ) {

        var res = origin.clone();

        var nc=this.curves.length;
        for(var i=0;i<nc;i++) {

            for( var p = 0 ; p < this.curves[i].points.length;p++) {

                var pt = this.curves[i].points[p];

                if( (dir == 1 && res[axis] < pt[axis]) || (dir == -1 && res[axis] > pt[axis]) ) {
                    res = pt.clone();
                }

            }

        }

        return res;

    }

    _p.instance.prototype.extendCurves = function( targetID , distance , numPts , excludePoints ) {

        excludePoints = excludePoints || [];
        distance = distance || 5;
        numPts = numPts || 2;

        var nc = this.curves.length;
        if( nc < 2 ) { return false; }

        var c1,c2;
        if( targetID == "last" ) { 
            c1 = nc-1; 
            c2 = c1 - 1; // previous
        } else if( targetID == "first" ) { 
            c1 = 0; 
            c2 = c1 + 1; // next
        } else { return false; }

        if( numPts == "auto" ) { numPts = this.curves[c1].points.length; }

        var c1pts = this.curves[c1].getPoints( numPts );
        var c2pts = this.curves[c2].getPoints( numPts );
        var newPts = new Array();
        // Build new curve
        for( var i = 0 ; i < numPts; i++ ) {

            // Skip adding a point to this curve if it is in the excludedCurves array
            if( excludePoints.indexOf(i) >= 0 ) { continue; }
 
            var cp = c1pts[ i ];
            var np = c2pts[ i ];

            // Get the direction of this curve by chec
            var dir = new THREE.Vector3().subVectors( cp , np ).normalize();
            var newPt = cp.clone().add( dir.clone().multiplyScalar( distance ) );
            newPts.push(newPt);
             

        }

        var newC = this.curves[c1].clone();
        newC.points = newPts;

        if( c1 == nc-1 ) { 
            this.curves.push(newC); // Add point to the end of array
        } else if( c1 == 0 ) {
            this.curves.unshift(newC); // Add point to the beginning of array
        }
    
        // Rebuild panel
        this.build();

        return true;

    }

    /**
     * 
     * @param {*} targetID 
     * @param {*} distance 
     * @param {*} excludeCurves 
     */
    _p.instance.prototype.extendCurvePoints = function( targetID , distance , excludeCurves ) {

        excludeCurves = excludeCurves || [];
        distance = distance || 5;

        var nc = this.curves.length;

        // Build new curve
        for( var i = 0 ; i < nc; i++ ) {

            // Skip adding a point to this curve if it is in the excludedCurves array
            if( excludeCurves.indexOf(i) >= 0 ) { continue; }

            var c = this.curves[i];
            var cNP = c.points.length;

            var p1,p2;
            if( targetID == "last" ) { 
                p1 = cNP-1; 
                p2 = p1 - 1; // previous
            } else if( targetID == "first" ) { 
                p1 = 0; 
                p2 = p1 + 1; // next
            } else {
                continue;
            }
           
             
            var cp = c.points[ p1 ];
            var np = c.points[ p2 ];

            // Get the direction of this curve by chec
            var dir = new THREE.Vector3().subVectors( cp , np ).normalize();
            var newPt = cp.clone().add( dir.clone().multiplyScalar( distance ) );
   
            if( p1 == cNP-1 ) { 
                c.points.push(newPt); // Add point to the end of array
            } else if( p1 == 0 ) {
                c.points.unshift(newPt); // Add point to the beginning of array
            }

        }
    
        // Rebuild panel
        this.build();

        return true;

    }

    /**
     * 
     * @param {*} targetID 
     * @param {*} excludeCurves 
     */
    _p.instance.prototype.reduceCurvePoints = function( targetID , excludeCurves ) {

        excludeCurves = excludeCurves || [];
        var nc = this.curves.length;

        // Build new curve
        for( var i = 0 ; i < nc; i++ ) {

            // Skip adding a point to this curve if it is in the excludedCurves array
            if( excludeCurves.indexOf(i) >= 0 ) { continue; }

            var c = this.curves[i];
            var cNP = c.points.length;

            // You can't remove any points if the curve only has 2 control points
            if( cNP <= 2 ) { continue; }

            var p1;
            if( targetID == "last" ) { 
                p1 = cNP-1; 
            } else if( targetID == "first" ) { 
                p1 = 0; 
            } else {
                continue;
            }
    
            c.points.splice( p1 , 1 );
     
        }
    
        // Rebuild panel
        this.build();

        return true;

    }
 
    _p.instance.prototype.constructOutline = function() {

        var pts = [];
        var nc = this.curvePoints.length;
        for( var c = 0 ; c < nc; c++ ) {

            var cp = this.curvePoints[c];
            if( c == 0 ) {
                for( var i = 0 ; i < cp.length; i++ ) {
                    pts.push(
                        cp[ cp.length-1 - i ] 
                    );
                }
            } else if( c > 0 && c < nc-1 ) {
                pts.push(
                    cp[ 0 ] 
                );
            } else {
                for( var i = 0 ; i < cp.length; i++ ) {
                    pts.push(
                        cp[ i ] 
                    );
                }
            }

        }

        for( var c = nc-2 ; c >= 0; c-- ) {

            var cp = this.curvePoints[c];
            pts.push(
                cp[ cp.length-1 ] 
            );

        }

        var c = new THREE.CatmullRomCurve3(pts);
        return {
            curve: c,
            points: pts
        };

    }

    _p.instance.prototype.createLineCurve = function( points , color ) {

        var g = new THREE.Geometry();
        g.vertices = points;

        var mesh = new THREE.Line( g , new THREE.LineBasicMaterial( {
            color: color,
            opacity: 1 
        } ) );
        mesh.name = "PanelCurveLine";
        return mesh;

    }

    _p.instance.prototype.removeCurveLines = function() {
        
        this.editor.removeObjectsByName("PanelCurveLine");

    }

    _p.instance.prototype.drawCurves = function( cfg ) {

        this.removeCurveLines();

        cfg = cfg || {};
        var color = cfg.color == undefined ? new THREE.Color( Math.random(),Math.random(),Math.random() ) : cfg.color;
        var exclude = cfg.exclude == undefined ? [] : cfg.exclude;
        var useCPs = cfg.useCPs == undefined ? true : cfg.useCPs;

        var inc = useCPs == true ? 1 : this.stepsBetweenCurves;
        var n = useCPs == true ? this.curves.length : this.curvePoints.length;
 
        var m,pts;
        var e = 0;
        for( var i = 0 ; i < n; i+=inc ) {

            pts = useCPs == true ? this.curves[i].points : this.curvePoints[i];

            if( exclude.indexOf(e) >= 0 ) { continue; }
            m = this.createLineCurve( pts , color );
            this.editor.scene.add(m);
            e++;
            
        }

    }

    /**
     * Construct a trim outline piece for this panel.
     * This is typically a thin tube made of rubber/chrome/plastic.
     * It can be used in conjunction with windows to create seals, etc.
     * 
     * @param {*} cfg 
     */
    _p.instance.prototype.constructTrim = function( cfg ) {

        cfg = cfg || {};

        var shape = cfg.shape == undefined ? VDS.module.shape.circle( 12 , 0.4 ) : cfg.shape;

        // Construct outline spline
        var outline = this.constructOutline();

        var settings = {
            steps: 100, // consider increasing count for better accuracy 
            bevelEnabled: false,
            extrudePath: outline.curve
        };
        outline.curve.closed = true;
        var geo = new THREE.ExtrudeGeometry( shape, settings );
        geo.mergeVertices();
        VDS.module.calculate.computeVertexNormals(geo,80);
        var mesh = new THREE.Mesh( geo , VDS.materials.default );
        //this.editor.scene.add( mesh );

        var flowLine = new VDS.module.aerodynamics.flowLine( outline.points , 0.25 , new THREE.Color(Math.random(),Math.random(),Math.random() ) );
        //this.editor.scene.add( flowLine.curve.mesh );

        this.outline = outline;
        this.trim = geo;

        return {
            outline: outline,
            geometry: geo
        };


    }

    return _p;

})({});