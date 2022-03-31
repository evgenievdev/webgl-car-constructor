var VDS = VDS || {};
VDS.module = VDS.module || {};

/**
 * Decal layering system to apply to 3D models.
 */
VDS.module.cage = (function( _p ){

    _p.instance = function( editor ) {
        
        this.editor = editor;
        this.bars = {};
        this.groups = {};

    }

    _p.instance.prototype.barExists = function( id ) {
        
        if( this.bars[id] == undefined ) { return false; }
        return true;

    }

    _p.instance.prototype.groupExists = function( id ) {
        
        if( this.groups[id] == undefined ) { return false; }
        return true;

    }

    _p.instance.prototype.createGroup = function( id , bars ) {

        if( this.groupExists(id) ) { return false; }

        this.groups[id] = {

            mesh: null,
            bars: []

        };

        if( bars !== undefined ) {
            this.addBarsToGroup( id , bars );
        }

        return true;

    }

    _p.instance.prototype.removeGroup = function( id ) {

        if( !this.groupExists(id) ) { return false; }

        var m = this.groups[id].mesh;

        if( m !== null ) {
            this.editor.scene.remove( m );
        }  

        delete this.groups[id];

        return true;

    }

    _p.instance.prototype.setGroupBars = function( group , refs ) {

        if( !this.groupExists(group) ) { return false; }
        this.groups[group].bars = [];
        return this.toggleBarsToGroup( group , refs , true );

    }

    _p.instance.prototype.addBarsToGroup = function( group , refs ) {

        return this.toggleBarsToGroup( group , refs , true );

    }

    _p.instance.prototype.removeBarsFromGroup = function( group , refs ) {

        return this.toggleBarsToGroup( group , refs , false );

    }

    _p.instance.prototype.toggleBarsToGroup = function( group , refs , insert ) {

        if( !this.groupExists(group) ) { return false; }

        // The refs element can be an array of references or a single reference (string). 
        // If it is a string add it as a single element to an array to avoid writing the same code twice and simply use a loop to add references
        var data = refs;
        if( !refs.length ) {
            data = [refs];
        }

        var bar, found;
        for( var i = 0 ; i < data.length; i++ ) { 
            
            bar = data[i];
            found = this.groups[ group ].bars.indexOf( bar );

            if( insert === true ) { 
                // Insert references
                if( this.bars[ bar ] !== undefined && found < 0 ) {

                    this.groups[ group ].bars.push( bar );

                }

            } else {
                // Remove references
                if( this.bars[ bar ] !== undefined && found >= 0 ) {

                    this.groups[ group ].bars.splice( found , 1 );

                }

            }

        }

        // Rebuild the group mesh
        this.buildGroupMesh( group );

        return true;

    }

    _p.instance.prototype.buildGroupMesh = function( id ) {

        if( !this.groupExists(id) ) { return false; }

        var g = this.groups[id];

        // Create the group mesh if it doesn't exist
        if( g.mesh == null ) {
            g.mesh = new THREE.Group();
        } 

        var m = g.mesh;
        
        // Remove previously added children
        for( var i = 0 ; i < m.children.length; i++ ) {
            
            // Only remove the child if it is not in the bars list
           // if( g.bars.indexOf( m.children[i]["bar-id"] ) >= 0 ) { continue; }
            
            m.remove( m.children[i] );
             

        }

        // Add new children
        for( var i = 0 ; i < g.bars.length; i++ ) {
            
            if( !this.barExists( g.bars[i] ) ) { continue; }

            m.add( this.bars[ g.bars[i] ].mesh );

        }

        return true;

    }

    _p.instance.prototype.getGroupMesh = function( id ) {

        if( !this.groupExists(id) ) { return false; }

        var g = this.groups[id];

        // Create the group mesh if it doesn't exist
        if( g.mesh == null ) { return false; }

        return g.mesh;

    }

    _p.instance.prototype.removeBar = function( id , removeReferences ) {

        if( !this.barExists(id) ) { return false; }

        

        return true;

    }

    _p.instance.prototype.createBar = function( cfg ) {

        // Referencese (reserved keywords) used for the frame's longitudinal members
        var fLRef = "frame-left";
        var fRRef = "frame-right";

        // CFG must be an Object 
        if( typeof cfg !== 'object' ) { return false; }

        // If no ID is given in the constructor, generate a UUID automatically
        if( cfg.id == undefined ) { 
            cfg.id = THREE.Math.generateUUID();
        }

        // A bar with this reference exists already
        if( this.bars[ cfg.id ] !== undefined ) { return false; }

        // Store the reference for the longitudinal members of the frame
        var lon = this.editor.chassis.frame.longitudinal;

        // -----------------------------------------------------------------------------------------------------------------------

        // EVERY BAR MUST HAVE AN ORIGIN POINT
        var origin = (cfg.origin == fLRef || cfg.origin == fRRef) ? lon.path : this.bars[cfg.origin].path; // "frame" or "bar-uuid"
        if( origin == undefined ) { return false; }

        // BUT NOT EVERY BAR NEEDS A FINISH POINT 
        var hasFinish = cfg.finish == undefined || cfg.finish === false ? false : cfg.finish;
        var finish = null;
        if( hasFinish !== false ) {
            finish = (cfg.finish == fLRef || cfg.finish == fRRef) ? lon.path : this.bars[cfg.finish].path; // "frame" or "bar-uuid"
            if( finish == undefined ) { return false; }
        }
          
        // -------------------------- [START POINT] --------------------------

        var startPoint = THREE.Math.clamp( cfg.startPoint , 0 , 1 );
        var sp = origin.getPoint( startPoint );

        // Offset the starting point to the actual longitudinal member (if the origin is set as such)
        if( cfg.origin == fLRef ) {
            sp.z += lon.frameWidth/2;
            sp.y += lon.meshL.position.y;
        } else if( cfg.origin == fRRef ) {
            sp.z -= lon.frameWidth/2;
            sp.y += lon.meshR.position.y;
        }

        // -------------------------- [END POINT] --------------------------

        // By default hold null
        var endPoint = null;
        var ep = null;

        if( finish !== null ) {

            endPoint = THREE.Math.clamp( cfg.endPoint , 0 , 1 );
            ep = finish.getPoint( endPoint );

            if( cfg.finish == fLRef ) {
                ep.z += lon.frameWidth/2;
                ep.y += lon.meshL.position.y;
            } else if( cfg.finish == fRRef ) {
                ep.z -= lon.frameWidth/2;
                ep.y += lon.meshR.position.y;
            }

        }

        // -----------------------------------------------------------------------------------------------------------------------
         
        var defaultShape = VDS.module.shape.circle( 12 , 1 );
        defaultShape.holes = [
            new THREE.Path( VDS.module.shape.circlePoints( 12 , 0.5 ) )
        ];

        var points = cfg.points;
        var tension = cfg.tension == undefined ? 0.5 : THREE.Math.clamp( cfg.tension, 0 , 1 );
        var path = this.buildBarPath( sp , points , ep , tension );
        var steps = cfg.steps == undefined ? 10 : THREE.Math.clamp( cfg.steps , 10 , 200 );
        var shape = cfg.shape == undefined ? defaultShape : cfg.shape;
        var geometry = this.buildBarGeometry( path , steps , shape );
       
        var mesh = new THREE.Mesh( geometry , VDS.materials.default );
        // Add a bar-id reference to tis bar's mesh 
        mesh["bar-id"] = cfg.id;    
        mesh.name = "cage-bar-"+cfg.id;
        // Calculate the mass of the bar by using the length of the path multiplied by the area of the shape (contour - holes) to get the volume
        // The bars are assumed to be constructed of steel which is ~0.282 LBS per cubic inch
        var shapePts = shape.extractPoints(40);
        var shapeArea =  THREE.ShapeUtils.area( shapePts.shape );
        var holes = shapePts.holes;
        var holesArea = 0;
        for( var i = 0 ; i < holes.length; i++ ) {
            holesArea += THREE.ShapeUtils.area( holes[i] );
        }
        mesh.mass = (path.getLength() * ( shapeArea - holesArea )) * 0.282;
        console.log( "Mass of [" + cfg.id + "] : " + mesh.mass.toFixed(3) + "LBS");
 

        this.bars[ cfg.id ] = {

            origin: cfg.origin,             // Only store the reference string, not the actual object reference
            finish: hasFinish,               // Store the reference string for the finish 

            spCurvePosition: startPoint,    // Starting Curve parameter (ranging from 0.0 to 1.0)
            spVector3: sp,                  // The actual starting point in 3D space (with corrected offsets)

            epCurvePosition: endPoint,      // Ending Curve parameter (0.0 - 1.0) ; default is NULL if bar has no ending point
            epVector3: ep,                  // The actual ending point in 3D space ; default is NULL if bar has no ending point

            points: points,                 // An array of objects containing data for each point: { direction: Vector3() , length: Number }
            path: path,                     // Spline path for this bar (constructed from the points array)
            steps: steps,                   // Number of steps used for geometry construction (Frenet-frames, spline extrusion)
            shape: shape,                   // 2D shape (typeof THREE.Shape!) used to extrude along the path spline

            geometry: geometry,             // Constructed geometry for this bar
            mesh: mesh                      // Constructed mesh for this bar (from geometry)

        };

        return true;

    }

    _p.instance.prototype.calculateCageMass = function() {

        var s = 0;
        var b;
        for( var i in this.bars ) {

            b = this.bars[i];
            if( b.mesh !== undefined && b.mesh.mass > 0 ) {
                s += b.mesh.mass;
            }

        }

        return s;

    }

     _p.instance.prototype.calculateGroupMass = function( id ) {
        
        if( !this.groupExists(id) ) { return false; }

        var s = 0;
        var b;
        for( var i = 0 ; i < this.groups.bars.length; i++ ) {

            b = this.bars[ this.groups.bars[i] ];
            if( b !== undefined && b.mesh !== undefined && b.mesh.mass > 0 ) {
                s += b.mesh.mass;
            }

        }

        return s;

    }

    _p.instance.prototype.buildBarGeometry = function( path , steps , shape ) {

        var settings = {
            steps: steps, // consider increasing count for better accuracy 
            bevelEnabled: false,
            extrudePath: path 
        };
        console.log(path);
        var g = new THREE.ExtrudeGeometry( shape, settings );
        g.mergeVertices();
        //VDS.module.calculate.computeVertexNormals( g , 70 );

        return g;

    }

    _p.instance.prototype.buildBarPath = function( start , points , finish , tension ) {

        var c = new THREE.CatmullRomCurve3();
        c.curveType = "catmullrom";
        c.tension = tension;
        var pts = [];

        var sp = start.clone();
        pts.push( sp );

        var p, np;
        for( var i = 0 ; i < points.length; i++ ) {

            p = points[i];
            // Format: { direction: Vector3() , length: Number ,  }

            np = pts[ pts.length-1 ].clone().add( new THREE.Vector3().copy( p.direction ).multiplyScalar( p.length ) );
            pts.push( np );

        }

        if( finish !== null ) {
            pts.push( finish.clone() );
        }

        // FIX for curves with straight bars - tension must be set high otherwise twisting of geometry occurs (strange bug internal to THREE.js)
        if( pts.length == 2 ) {
            c.tension = 0.8;
        }

        c.points = pts;
        return c;

    }

    _p.instance.prototype.constructCageMesh = function() {

        var g = new THREE.Group();

        for( var id in this.bars ) {

            g.add( this.bars[id].mesh );

        }
 
        return g;

    }

    return _p;

})({});