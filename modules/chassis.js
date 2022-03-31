var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.chassis = (function( _p ){
 
    var LIMITS = {
        maxAxles: 8, // Maximum number of axles
        minAxles: 2, // Minimum number of axles
        minWheelbase: 40, // Absolute minimum wheelbase length (in inches)
        maxWheelbase: 150, // Absolute maximum wheelbase length (in inches)
        minAxleWidth: 30, // Absolute minimum width for every axle (in inches)
        maxAxleWidth: 100, // Absolute maximum width for every axle (in inches)
        maxAxleDelta: 15 // Maximum difference in the width of all axles
    };

    _p.instance = function( editor ) {
        
        this.editor = editor;
        this.axles = [];
        this.frame = {

            longitudinal: null,
            cross: [
                // { geometry: null , mesh: null , path: null , shape: null , position: 0.0-1.0 , diagonalCrossBracing: true,crossBracingPosition: 0.5 }
            ],
            underbody: []

        }
         

    };
 

     

    // ------------------------------------------------------------ UNDERBODY -----------------------------------------------------------
    
    _p.instance.prototype.removeUnderbody = function( reset ) {

        var n = this.frame.underbody.length;
        for( var i = 0 ; i < n; i++ ) {

            this.editor.scene.remove( this.frame.underbody[i].mesh );

        }
        if( reset == true ) { 
            this.frame.underbody = [];
        }

    }

    _p.instance.prototype.renderUnderbody = function() {

        var n = this.frame.underbody.length;
        for( var i = 0 ; i < n; i++ ) {

            this.editor.scene.add( this.frame.underbody[i].mesh );

        }

    }

    _p.instance.prototype.createUnderbody = function( segs ) {

        var lon = this.frame.longitudinal;
        if( lon == undefined || lon.path == undefined ) { return false; }
 
        // Format: array[ { min: 0 , max : 1 } , ... , ... ]
        segs = segs || [{min:0.0,max:1.0,points:50}];
        
        this.removeUnderbody( true );
 
        for( var i = 0 ; i < segs.length; i++ ) {

            this.addUnderbodyPanel( segs[i] );

        }

        this.renderUnderbody();

    }

    _p.instance.prototype.calculateUnderbodyCurves = function( s ) {

        var lon = this.frame.longitudinal;
        if( lon == undefined || lon.path == undefined ) { return false; }

        var path = lon.path;

        var npts = s.points;
        var range = (s.max - s.min);
        var pInt = range/(npts-1);
        var pt,w,hw;
        var c1pts=[];
        var c2pts=[];
        for( var p = 0 ; p < npts; p++ ) {

            pt = path.getPoint( s.min + pInt*p );
            w = pt.z*2 + lon.frameWidth; // Width based on the offset-z of the point on the path
            hw = w/2;

            // two curve point arrays to represent the outline of the geometry
            c1pts.push( new THREE.Vector3( pt.x , pt.y , hw ) );
            c2pts.push( new THREE.Vector3( pt.x , pt.y , -hw ) );

        }

        return [
            new THREE.CatmullRomCurve3(c1pts),
            new THREE.CatmullRomCurve3(c2pts)
        ];

    }

    _p.instance.prototype.addUnderbodyPanel = function( s ) {

        var lon = this.frame.longitudinal;
        if( lon == undefined || lon.path == undefined ) { return false; }
   
        var curves = this.calculateUnderbodyCurves( s );
        var curvePoints = VDS.module.panel.calculateCurvePoints( curves, s.points );
        var g = VDS.module.panel.constructGeometry( curvePoints , 2 , new THREE.Vector3() , true );

        var mesh = new THREE.Mesh( g , VDS.materials.default );
        mesh.position.y = this.frame.longitudinal.meshL.position.y;

        this.frame.underbody.push({
            mesh: mesh,
            geometry: g,
            min: s.min,
            max: s.max,
            points: s.points
        });

    }

    _p.instance.prototype.updateUnderbody = function() {
        
        var ub = this.frame.underbody;
        var n = ub.length;
        var s;
        for( var i = 0 ; i < n ; i++ ) {

            s = ub[i];

            var curves = this.calculateUnderbodyCurves( s );
            var curvePoints = VDS.module.panel.calculateCurvePoints( curves, s.points );
            var g = VDS.module.panel.constructGeometry( curvePoints , 2 , new THREE.Vector3() , true );

            s.geometry = g;
            s.mesh.geometry.dispose();
            s.mesh.geometry = g;

        }
        

    }

    _p.instance.prototype.removeLongitudinalMembers = function() {

        if( this.frame.longitudinal !== null && typeof this.frame.longitudinal === 'object' ) {

            if( this.frame.longitudinal.meshL !== null ) {
                this.editor.scene.remove(meshL);
            }
            if( this.frame.longitudinal.meshR !== null ) {
                this.editor.scene.remove(meshR);
            }

        }

    }

    // ------------------------------------------------------------ LONGITUDINAL -----------------------------------------------------------

    _p.instance.prototype.toggleLongitudinalHandles = function( visible ) {

        if( this.frame.longitudinal == null ) { return false; }
        var ar = this.frame.longitudinal.pointHandles;
        if( ar == undefined ) { return false; }

        for( var i = 0 ; i < ar.length; i++ ) {

            if( visible === true ) {
                this.editor.scene.add( ar[i] );
            } else {
                this.editor.scene.remove( ar[i] );
            }

        }

        
        return true;


    }

    _p.instance.prototype.addLongitudinalHandles = function() {

        return this.toggleLongitudinalHandles( true ); 

    }

    _p.instance.prototype.removeLongitudinalHandles = function() {

        return this.toggleLongitudinalHandles( false ); 

    }

    _p.instance.prototype.calculateLongitudinalPoints = function( cfg , update ) {

        this.removeLongitudinalHandles();

        var hpGeo = new THREE.IcosahedronGeometry(2);
        hpGeo.computeFlatVertexNormals();

        var psX = -cfg.frontOverhang;
        var psY = 0;
        var psZ = 0;

        var frameLength = cfg.frameLength;

        var nCP = cfg.controlPoints;
        var segLen = frameLength / (nCP-1);
   
        var pathPoints = [];
        var pointHandles = [];
        var hpMesh, pVec3;
        for( var i = 0 ; i < nCP ; i++ ) {

            if( update === true ) {
                psY = cfg.pointHandles[i].position.y;
                psZ = cfg.pointHandles[i].position.z;
            }

            pVec3 = new THREE.Vector3(
                psX + segLen * i,
                psY,
                psZ
            );
            
            pathPoints.push(pVec3);

            hpMesh = new THREE.Mesh( hpGeo , VDS.materials.transform );
            hpMesh.position.copy( pVec3 );
            pointHandles.push( hpMesh );           
            
        
        }

        var plg = VDS.module.helpers.pointLine( pathPoints );
        var plm = VDS.module.helpers.lineMesh( plg , VDS.materials.outlineGreen );

        return {
            pathPoints: pathPoints,
            pointHandles: pointHandles,
            helperLine: plm
        }

    }

    _p.instance.prototype.createLongitudinalGeometry = function( shape , path , steps ) {
 
        var settings = {
            steps: steps, // consider increasing count for better accuracy 
            bevelEnabled: false,
            extrudePath: path,
            forceEnds: true, // Optional parameters added by me to ensure the tangents are calculated properly. NOTE! updating THREE.JS will break this 
            tangentDirection: new THREE.Vector3(1,0,0)
        };
        var lon = new THREE.ExtrudeGeometry( shape, settings );
        lon.mergeVertices();
        VDS.module.calculate.computeVertexNormals( lon , 70 );
        lon.computeBoundingBox();

        // Right Longitudinal Member
        // Clone the path and flip it on the z-axis (needed to avoid projection errors on geometry scale)
        var pathR = path.clone();
        VDS.module.shape.flipCurve( pathR , new THREE.Vector3(0,0,1) , new THREE.Vector3() );

        var settingsR = {
            steps: steps, // consider increasing count for better accuracy 
            bevelEnabled: false,
            extrudePath: pathR,
            forceEnds: true, // Optional parameters added by me to ensure the tangents are calculated properly. NOTE! updating THREE.JS will break this 
            tangentDirection: new THREE.Vector3(1,0,0)
        };
        var lonR = new THREE.ExtrudeGeometry( shape, settingsR );
        lonR.mergeVertices();
        VDS.module.calculate.computeVertexNormals( lonR , 70 );
        lonR.computeBoundingBox();

        return {
            left: lon,
            right: lonR
        };

    }

    _p.instance.prototype.createLongitudinalMembers = function( cfg ) {

        this.removeLongitudinalMembers();
         

        var frameLength = cfg.frameLength;
        var lonEdit = this.calculateLongitudinalPoints( cfg );

        var steps = cfg.controlPoints;
        var path = VDS.module.shape.pointCatmullRomCurve(lonEdit.pathPoints);
        var lonGeo = this.createLongitudinalGeometry( cfg.shape , path , steps );


        var meshL = new THREE.Mesh( lonGeo.left , VDS.materials.default );
            meshL.name = "frame-longitudinal-left";
        var meshR = new THREE.Mesh( lonGeo.right , VDS.materials.default );
            meshR.name = "frame-longitudinal-right";

        var frameWidth = cfg.frameWidth == undefined || cfg.frameWidth < 0 ? 40 : cfg.frameWidth;
        meshL.position.z = frameWidth/2;
        meshR.position.z = -frameWidth/2;

        var offsetY = cfg.offsetY == undefined ? 3 : cfg.offsetY;
        meshL.position.y = offsetY;
        meshR.position.y = offsetY;
        
      
        meshL.castShadow=true;
        meshR.castShadow=true;

        var area1 = VDS.module.calculate.mesh3DArea(meshL);
        var mass1 = area1 * 0.025; // mass for each longitudinal member in lbs
        meshL.mass = mass1;
        meshR.mass = mass1;

        this.editor.scene.add(meshL);
        this.editor.scene.add(meshR);
        this.editor.scene.add( lonEdit.helperLine );

        // Don't copy the reference directly, there can be artifacts missing. Check values against editor constraints later...
        var constraints = {
            yMin: cfg.nodeConstraints.yMin,
            yMax: cfg.nodeConstraints.yMax,
            zMin: cfg.nodeConstraints.zMin,
            zMax: cfg.nodeConstraints.zMax
        };

        this.frame.longitudinal = { 
            meshL: meshL, 
            meshR: meshR,
            offsetY: offsetY,
            controlPoints: cfg.controlPoints,
            pathPoints: lonEdit.pathPoints,
            pointHandles: lonEdit.pointHandles,
            path: path, 
            shape: cfg.shape, 
            shapePoints: cfg.shapePoints,
            frontOverhang: cfg.frontOverhang, 
            rearOverhang: cfg.rearOverhang,
            nodeConstraints: constraints,
            frameWidth: frameWidth,
            frameLength: frameLength,
            helperLine: lonEdit.helperLine,
            totalMass: mass1*2
        };
        
        this.addLongitudinalHandles();

        return true;

    }

    _p.instance.prototype.setFrameWidth = function( val ) {

        this.frame.longitudinal.frameWidth = THREE.Math.clamp( val , 20 , 300 );
        this.updateLongitudinalGeometry();

    }

    _p.instance.prototype.setFrameLength = function( val ) {

        this.frame.longitudinal.frameLength = THREE.Math.clamp( val , 20 , 500 );
        this.updateLongitudinalGeometry();

    }
    
    _p.instance.prototype.updateLongitudinalGeometry = function() {

        var cfg = this.frame.longitudinal;
 
       var frameLength = cfg.frameLength;
  
       var nCP = cfg.controlPoints;
       var segLen = frameLength / (nCP-1);

        for( var i = 0 ; i < cfg.pathPoints.length; i++ ) {

            // Update x-position of each node (needed if the frame dimensions have changed)
            cfg.pointHandles[i].position.x = -cfg.frontOverhang + segLen*i;
            // Copy the position of the point handle object as the current node's position (used when reconstructing the path spline)
            cfg.pathPoints[i].copy( cfg.pointHandles[i].position );

        }

       var steps = cfg.controlPoints*5;
       var path = VDS.module.shape.pointCatmullRomCurve( cfg.pathPoints );
       var lonGeo = this.createLongitudinalGeometry( cfg.shape , path , steps );

       this.addLongitudinalHandles();
 
        var plg = VDS.module.helpers.pointLine( cfg.pathPoints );
        cfg.helperLine.geometry.dispose();
        cfg.helperLine.geometry = plg;
 
        cfg.meshL.geometry.dispose();
        cfg.meshR.geometry.dispose();
        cfg.meshL.geometry = lonGeo.left;
        cfg.meshR.geometry = lonGeo.right;
         
        var frameWidth = cfg.frameWidth;
        cfg.meshL.position.z = frameWidth/2;
        cfg.meshR.position.z = -frameWidth/2;

        var offsetY = cfg.offsetY;
        cfg.meshL.position.y = offsetY;
        cfg.meshR.position.y = offsetY;

        var area1 = VDS.module.calculate.mesh3DArea(cfg.meshL);
        var mass1 = area1 * 0.025; // mass for each longitudinal member in lbs
        cfg.meshL.mass = mass1;
        cfg.meshR.mass = mass1;
        cfg.totalMass = mass1*2;

        cfg.path = path;

        this.updateCrossMembers();
        this.updateUnderbody();
 

    }

    _p.instance.prototype.getPointOnLongitudinalMember = function( t ) {

        if( this.frame.longitudinal == null || this.frame.longitudinal.path == null ) {
            return false;
        }

        this.frame.longitudinal.path.updateArcLengths();
        var vec3 = this.frame.longitudinal.path.getPointAt( t );
        vec3.y += this.frame.longitudinal.meshL.position.y;

        return vec3;

    }

    _p.instance.prototype.toggleFrameNodes = function( visible ) {

        var lon = this.frame.longitudinal;
        var frameNodes = lon.pointHandles;
        var fn = visible === true ? "showObjects" : "hideObjects";
        this.editor.gui[fn]( frameNodes );

    }
    
    // ------------------------------------------------------------ CROSSMEMBERS -----------------------------------------------------------

    _p.instance.prototype.createCrossMember = function( cfg ) {

        cfg.position = THREE.Math.clamp( cfg.position , 0 , 1 );
        var pVec3 = this.getPointOnLongitudinalMember( cfg.position );

        var lonOffsetY = this.frame.longitudinal.meshL.position.y;
        var lonOffsetZ = this.frame.longitudinal.meshL.position.z;
        var length = (Math.abs(pVec3.z) + Math.abs(lonOffsetZ)) * 2;
      
         

        var geometry = new THREE.BoxGeometry( 3 , 1.5 , length );
        var mesh = new THREE.Mesh( geometry , VDS.materials.default );  
        mesh.position.x = pVec3.x;
        mesh.position.y = pVec3.y;
        mesh.castShadow = true;
        
        var area = VDS.module.calculate.mesh3DArea(mesh);
        var mass = area * 0.025; // mass for each longitudinal member in lbs
        mesh.mass = mass;

        this.frame.cross.push({
            length: length,
            position: cfg.position,
            geometry: geometry,
            mesh: mesh
        });

        mesh.name = "frame-cross-" + this.frame.cross.length;

        this.editor.scene.add( mesh );
 
    }

    _p.instance.prototype.updateCrossMember = function( id ) {

        if( id < 0 || id >= this.frame.cross.length ) {
            return false;
        }
        var o = this.frame.cross[id];
        var pVec3 = this.getPointOnLongitudinalMember( o.position );

        var lonOffsetY = this.frame.longitudinal.meshL.position.y;
        var lonOffsetZ = this.frame.longitudinal.meshL.position.z;
        var length = (pVec3.z + Math.abs(lonOffsetZ)) * 2;

        var geometry = new THREE.BoxGeometry( 3 , 1.5 , length );
 
        o.mesh.geometry.dispose();
        o.mesh.geometry = geometry;

        o.mesh.position.x = pVec3.x;
        o.mesh.position.y = pVec3.y;

        o.mesh.name = "frame-cross-" + (id+1);

    } 

    _p.instance.prototype.updateCrossMembers = function() {

        for( var i = 0 ; i < this.frame.cross.length; i++ ) {
            this.updateCrossMember(i);
        }

    }
     

    _p.instance.prototype.getAxleIDfromUUID = function( uuid ) {

        var res = -1;
        for( var i = 0 ; i < this.axles.length; i++ ) {
            if( uuid == this.axles[i].uuid) {
                return i;
            }
        }
        return res;

    }

    _p.instance.prototype.constructAxleGeometry = function( cfg ) {

        return new THREE.CylinderGeometry( 1, 1, cfg.width, 10 );

    }

    _p.instance.prototype.addAxle = function( cfg , editor ) {

        // Too many axles on the chassis, return -1 to indicate nothing has been added
        if( this.axles.length >= LIMITS.maxAxles ) {
            return -1;
        }

        var aGeo = this.constructAxleGeometry(cfg);
        var aMesh = new THREE.Mesh( aGeo, VDS.materials.default );
        aMesh.castShadow=true;
         
        var numAxles = this.axles.length;
        var uuid = "axle-"+THREE.Math.generateUUID();

        this.axles.push({
            uuid: uuid,
            // Settings
            width: ( cfg.width == undefined ) ? LIMITS.minAxleWidth : THREE.Math.clamp( cfg.width , LIMITS.minAxleWidth , LIMITS.maxAxleWidth ),
            position: numAxles <= 0 ? 0 : cfg.position, // First axle should be at position 0
            suspensionHeight: cfg.suspensionHeight,
            steering: cfg.steering,
            maxSteeringAngle: ( cfg.maxSteeringAngle == undefined ) ? 0 : THREE.Math.clamp( cfg.maxSteeringAngle , 0 , 60 ), // in degrees
            driven: cfg.driven,
            powerDistribution: ( cfg.powerDistribution == undefined ) ? 0 : THREE.Math.clamp( cfg.powerDistribution , 0 , 1 ), // value between 0.0 and 1.0. 
            
            // Geometry
            axleGeometry: aGeo,
            axleMesh: aMesh,

            wheels: {

                tireInstance: null,
                tireGeometry: null,

                rimInstance: null,
                rimGeometry: null,

                brakeInstance: null,
                brakeGeometry: null,

                suspensionInstance: null,
                suspensionGeometry: null,

                left: {
                    tireMesh: null,
                    rimMesh: null,
                    brakeMesh: null,
                    suspensionMesh: null,
                    offset: new THREE.Vector3(0,0,0)
                    // additional params here
                },
                right: {
                    tireMesh: null,
                    rimMesh: null,
                    brakeMesh: null,
                    suspensionMesh: null,
                    offset: new THREE.Vector3(0,0,0)
                    // additional params here
                },
            }
        });

        if( cfg.steering === true ) {
            this.setSteeringAxle( this.axles.length-1 );
        }

        aMesh.position.z = 0;
        aMesh.position.y = -cfg.suspensionHeight;
        aMesh.rotation.x = Math.PI/2;
        aMesh.position.x = this.axles[ numAxles ].position;
        
        this.setAxleNames();

        aMesh.VDS = {
            type: "axle",
            uuid: uuid
        }
    
        //aMesh.instance = this.axles[ numAxles ];

        this.editor.scene.add( aMesh );

        // Re-define buttons for each axle
        if( this.editor.gui !== undefined ) {
            this.editor.gui.buttons_addTiresToAxle();
            // Update clickable objects
            this.editor.gui.setClickableObjects( "axles" , this.editor.compileClickableObjects( "axles" ) );
        }

        return this.axles.length-1;

    }


    _p.instance.prototype.removeAxle = function( id ) {

        // Minimum number of axles is 2
        if( id < 0 || id >= this.axles.length || this.axles.length-1 < 2 ) {
            return false;
        }

        // The first axle stays
        if( id == 0 ) { return false; }

        var axle = this.axles[id];

        if( axle.axleMesh !== null ) {
            this.editor.scene.remove( axle.axleMesh );
        }

        // Remove tires
        if( axle.wheels.left.tireMesh !== null ) {
            this.editor.scene.remove( axle.wheels.left.tireMesh );
        }
        if( axle.wheels.right.tireMesh !== null ) {
            this.editor.scene.remove( axle.wheels.right.tireMesh );
        }
        // Remove rims
        if( axle.wheels.left.rimMesh !== null ) {
            this.editor.scene.remove( axle.wheels.left.rimMesh );
        }
        if( axle.wheels.right.rimMesh !== null ) {
            this.editor.scene.remove( axle.wheels.right.rimMesh );
        }
        // Remove suspension
        if( axle.wheels.left.suspensionMesh !== null ) {
            this.editor.scene.remove( axle.wheels.left.suspensionMesh );
        }
        if( axle.wheels.right.suspensionMesh !== null ) {
            this.editor.scene.remove( axle.wheels.right.suspensionMesh );
        }
        // Remove brakes
        if( axle.wheels.left.brakeMesh !== null ) {
            this.editor.scene.remove( axle.wheels.left.brakeMesh );
        }
        if( axle.wheels.right.brakeMesh !== null ) {
            this.editor.scene.remove( axle.wheels.right.brakeMesh );
        }


        this.axles.splice( id , 1 );

        // Update axle names
        this.setAxleNames();

        // Re-define buttons for each axle
        if( this.editor.gui !== undefined ) {
            this.editor.gui.buttons_addTiresToAxle();
            // Update clickable objects
            this.editor.gui.setClickableObjects( "axles" , this.editor.compileClickableObjects( "axles" ) );
        }

    }

    _p.instance.prototype.setAxleNames = function() {

        for( var i = 0 ; i < this.axles.length; i++ ) {
            this.axles[i].axleMesh.name = "axle-"+(i+1);
        }

    }
   

    _p.instance.prototype.setAxleMaterials = function( driven , steering , both , none ) {

        var axle;
        for( var i = 0 ; i < this.axles.length; i++ ) {
            axle = this.axles[i];
            if( axle.driven == true && axle.steering == false ) {
                axle.axleMesh.material = driven;
            } else if( axle.driven == true && axle.steering == true ) {
                axle.axleMesh.material = both;
            } else if( axle.driven == false && axle.steering == true ) {
                axle.axleMesh.material = steering;
            } else {
                axle.axleMesh.material = none;
            }

        }

    }
 
    _p.instance.prototype.unstuckAxle = function( id , direction ) {

        if( id < 0 || id >= this.axles.length || direction == 0 ) {
            return false;
        }

        var axle = this.axles[id];

        var unstuck = false;
        var npos = axle.position + 1*direction;
        while( unstuck == false ) {

            unstuck = this.moveAxle( id , npos );
            npos += 1*direction;

        }

    };

    // NOTE! First axle must stay in place always at position 0
    _p.instance.prototype.moveAxle = function( id , position ) {

        if( id < 0 || id >= this.axles.length ) {
            return false;
        }

        var axle = this.axles[id];

        var oldPos = axle.position;
        var newPos = position;

        var delta = newPos - oldPos;
        var dir = THREE.Math.clamp( delta , -1 , 1); // > 1 : right ; < 0 : left ; 0 : nowhere
        // If the new position is the same as the old one, there's no need to reposition anything
        if( dir == 0 ) {
            return false;
        }
        // Can't move axle outside of minimal boundary
        if( newPos < 0 ) {
            return false;
        }
        // Can't move axle outside of maximal boundary
        if( newPos > LIMITS.maxWheelbase ) {
            return false;
        }
        // Can't move axle to a position where another axle exists
        var buffer = 5;
 
        if( this.axleHasTires(id) ) {
            buffer = axle.wheels.tireInstance.calculateTireDiameter();   
        }

        if( this.axleExistsInRange( position , buffer , id ) === true ) {
            return false;
        }
        // The minimum distance between the first axle and the last axle has to be above the min boundary
        if( id > 0 && this.axleDistance( 0 , id ) < LIMITS.minWheelbase ) {
            return false;
        }

        axle.position = newPos;
        axle.axleMesh.position.x = newPos;

        // Update frame front/rear overhang to avoid shrinkage/growth upon axle movement.
        if( id == 0 ) {
            // If the first axle is being moved, change the front overhang
            this.frame.longitudinal.frontOverhang += delta;
        } else if( id == this.axles.length-1 ) {
            // If the last axle is being moved, change the rear overhang
            this.frame.longitudinal.rearOverhang += delta;
        }

        this.positionComponentsOnAxle( id );

    }

    _p.instance.prototype.scaleAxle = function( id , width , editor ) {

        if( id < 0 || id >= this.axles.length ) {
            return false;
        }

        var axle = this.axles[id];

        var oldW = axle.width;
        var newW = width;

        if( newW < LIMITS.minAxleWidth ) {
            return false;
        }

        if( newW > LIMITS.maxAxleWidth ) {
            return false;
        }

        axle.width = newW;

        axle.axleGeometry = this.constructAxleGeometry( { width: newW } );
        axle.axleMesh.geometry.dispose();
        axle.axleMesh.geometry = axle.axleGeometry;

        this.positionComponentsOnAxle( id );

    }

    _p.instance.prototype.axleHasRims = function( id ) {

        return this.axleHasComponent(id,"rim");

    }

    _p.instance.prototype.axleHasTires = function( id ) {

        return this.axleHasComponent(id,"tire");

    }

    _p.instance.prototype.axleHasBrakes = function( id ) {

        return this.axleHasComponent(id,"brake");

    }

    _p.instance.prototype.axleHasSuspension = function( id ) {

        return this.axleHasComponent(id,"suspension");

    }

    _p.instance.prototype.axleHasComponent = function( id , name ) {

        if( id < 0 || id >= this.axles.length ) {
            return false;
        }

        var axle = this.axles[id];

        if(  axle.wheels.left[ name+"Mesh" ] !== null && axle.wheels.right[ name+"Mesh" ] !== null && axle.wheels[ name+"Instance" ] !== null ) {
            return true;
        }

        return false;

    }

    _p.instance.prototype.positionComponentsOnAxle = function( id ) {

        if( id < 0 || id >= this.axles.length ) {
            return false;
        }

        var axle = this.axles[id];

        var hasRims = this.axleHasRims( id );
        var hasTires = this.axleHasTires( id );
        var hasBrakes = this.axleHasBrakes( id );
        var hasSuspension = this.axleHasSuspension( id );

        if( hasRims === true ) { 

            axle.wheels.left.rimMesh.position.copy( axle.axleMesh.position );
            axle.wheels.left.rimMesh.position.z = axle.width/2;
             
            axle.wheels.right.rimMesh.position.copy( axle.axleMesh.position );
            axle.wheels.right.rimMesh.position.z = -axle.width/2;

        }
        if( hasTires === true ) {

            axle.wheels.left.tireMesh.position.copy( axle.axleMesh.position );
            axle.wheels.left.tireMesh.position.z = axle.width/2;

            axle.wheels.right.tireMesh.position.copy( axle.axleMesh.position );
            axle.wheels.right.tireMesh.position.z = -axle.width/2;

        }
        if( hasBrakes === true ) {

            var brakeOffsetZ = 2;
            axle.wheels.left.brakeMesh.position.copy( axle.axleMesh.position );
            axle.wheels.left.brakeMesh.position.z = axle.width/2 - brakeOffsetZ;

            axle.wheels.right.brakeMesh.position.copy( axle.axleMesh.position );
            axle.wheels.right.brakeMesh.position.z = -axle.width/2 + brakeOffsetZ;

        }
        if( hasSuspension === true ) {

            var suspensionOffsetZ = 7;
            axle.wheels.left.suspensionMesh.position.copy( axle.axleMesh.position );
            axle.wheels.left.suspensionMesh.position.z = axle.width/2 - suspensionOffsetZ;

            axle.wheels.right.suspensionMesh.position.copy( axle.axleMesh.position );
            axle.wheels.right.suspensionMesh.position.z = -axle.width/2 + suspensionOffsetZ;

        }

    }

    _p.instance.prototype.setAxleSuspensionHeight = function( id , amount , editor ) {

        if( id < 0 || id >= this.axles.length ) {
            return false;
        }

        var axle = this.axles[id];

        var newHeight = amount;

        axle.suspensionHeight = newHeight;

        axle.axleMesh.position.y = -newHeight;

        this.positionComponentsOnAxle( id );

    }

    _p.instance.prototype.axleExistsInRange = function( position , buffer , exclude ) {

        var res = false;
        var apos = 0;
        var tbuffer = 0;
        var axle;
        for( var i = 0 ; i < this.axles.length; i++ ) {

            if( exclude != undefined && exclude === i ) {
                continue; // Skip this axle if it is set to be excluded
            }

            axle = this.axles[i];
            apos = axle.position;
            // If this axle has a mounted wheel, consider its dimensions
            if( axle.wheels.left.tireMesh !== null && axle.wheels.right.tireMesh !== null && axle.wheels.tireInstance !== null ) {
                tbuffer = axle.wheels.tireInstance.calculateTireDiameter();
            }
            // !NOTE technically it is possible for a narrow axle to fit close to a wide axle with tires mounted, but it isn't a good idea
            if( position <= apos+buffer/2+tbuffer/2  && position >= apos-buffer/2-tbuffer/2 ) {
                return true;
            }

        }

        return res;

    }

    _p.instance.prototype.axleDistance = function( a , b ) {

        if( a < 0 || a >= this.axles.length ) {
            return false;
        }
        if( b < 0 || b >= this.axles.length ) {
            return false;
        }

        return Math.abs( this.axles[a].position - this.axles[b].position );

    }

    _p.instance.prototype.axleRemoveComponent = function( id , name , keepInstance ) {

        if( id < 0 || id >= this.axles.length ) {
            return false;
        }

        var axle = this.axles[id];

        if( axle.wheels.left[ name+"Mesh" ] !== null  ) {
            this.editor.scene.remove( axle.wheels.left[ name+"Mesh" ] );
            axle.wheels.left[ name+"Mesh" ] = null;
        }
        if( axle.wheels.right[ name+"Mesh" ] !== null ) {
            this.editor.scene.remove( axle.wheels.right[ name+"Mesh" ] );
            axle.wheels.right[ name+"Mesh" ] = null;
        }

        if( keepInstance !== true ) {
            axle.wheels.right[ name+"Instance" ] = null;
        }

    }

    _p.instance.prototype.setAxleTire = function( id , tire , tireMat , editor ) {

        if( id < 0 || id >= this.axles.length ) {
            return false;
        }

        var axle = this.axles[id];
        
        this.axleRemoveComponent( id , "tire" , true );
        this.axleRemoveComponent( id , "rim" , true );
        this.axleRemoveComponent( id , "brake" , true );
         
        
        var last = tire.getLastRender();
        var geo = last._geometry;
        axle.wheels.tireInstance = tire;
        axle.wheels.tireGeometry = geo;

        // Create new meshes for the right and left tires on the axle
        var t1 = new THREE.Mesh( geo , tireMat );
        var t2 = new THREE.Mesh( geo , tireMat );
        t1.castShadow = true;
        t2.castShadow = true;

        axle.wheels.left.tireMesh = t1;
        axle.wheels.right.tireMesh = t2;

        editor.scene.add( t1 );
        editor.scene.add( t2 );
 

        // Rim outline
        var rim = new VDS.module.rim.instance();
        var rimGeo = rim.constructRimGeometry( last.points , tire.rimDiameter , tire.calculateTireWidth()*last.innerWidth , 0.5 , 1.5 , 0.5 , 0.5 );
        var r1 = new THREE.Mesh( rimGeo.clone() , VDS.materials.chrome );
        var r2 = new THREE.Mesh( rimGeo.clone() , VDS.materials.chrome );
        r1.castShadow = true;
        r2.castShadow = true;

        // Rim design
        var rdRadius = 20;
        var rdPoints = 50;
        var rdg = rim.buildRimDesign({
            radius: rdRadius,
            points: rdPoints,
            thickness: 0.4,
            cuts: [
                VDS.module.shape.circle(rdPoints,2,0,0),
                {
                    // Add a path to follow instead of just a circle
                    polygon: VDS.module.shape.rectangleRoundedPoints(6,2.5,0.5,20,new THREE.Vector3(0,0,0),true),
                    radius: 16,
                    repeat: 8,
                    rotate: true,
                    angleOffset: Math.PI/2,
                    // Apply a circular queue of various scales depending on the current iteration. 
                    scaleVariety: [
                        [1,1],
                        [0.7,0.7],
                        [0.3,0.3] 
                    ],
                    useScaleVariety: false
                }
            ],
            boltRadius: 6,
            boltSize: 0.75,
            numBolts: 5,
            boltSegments: 12,
            bevel: {
                enabled:true,
                segments: 1,
                steps: 1,
                size:0.2,
                thickness:0.2,
                front:true,
                back:true
            },
            removeFront: false,
            removeBack: false,
            removeSidewall: false,
            removeContour: true
        });
        
        // Rescale the rim design to match the size of the wheel
        var rdScaleXY = (tire.rimDiameter/2) / rdRadius;

        var rdm1 = new THREE.Mesh( rdg , VDS.materials.chrome );
        rdm1.scale.set(rdScaleXY,rdScaleXY,1);

        var rdm2 = new THREE.Mesh( rdg , VDS.materials.chrome );
        rdm2.scale.set(rdScaleXY,rdScaleXY,1);
        // Merge the rim outline with the design into one mesh
        r1.geometry.mergeMesh( rdm1 );
        r2.geometry.mergeMesh( rdm2 );

        var rcapg = new THREE.SphereGeometry( 5.5 , 20, 20, 0, Math.PI*2, 0, Math.PI/2 );
        var rcapm1 = new THREE.Mesh( rcapg , VDS.materials.chrome );
        rcapm1.rotation.x = Math.PI/2;
        rcapm1.scale.y = 0.6;

        var rcapm2 = rcapm1.clone();
        rcapm2.rotation.x = -Math.PI/2;
        r1.geometry.mergeMesh( rcapm1 );
        r2.geometry.mergeMesh( rcapm2 );
 
        axle.wheels.rimInstance = rim;
        axle.wheels.rimGeometry = rimGeo;
        axle.wheels.left.rimMesh = r1;
        axle.wheels.right.rimMesh = r2;

        editor.scene.add( r1 );
        editor.scene.add( r2 );
        
        t1.name = "tire-left-axle-"+(id+1);
        t2.name = "tire-right-axle-"+(id+1);
        r1.name = "rim-left-axle-"+(id+1);
        r2.name = "rim-right-axle-"+(id+1);

        var brakes = this.buildDefaultBrakes();
        axle.wheels.brakeInstance = brakes.instance;
        axle.wheels.left.brakeMesh = brakes.group;
        axle.wheels.right.brakeMesh = brakes.group.clone();
        axle.wheels.right.brakeMesh.rotation.y = Math.PI;
        //axle.wheels.right.brakeMesh.scale.set(1,1,-1);
       

        axle.wheels.left.brakeMesh.name = "brake-left-axle-"+(id+1);
        axle.wheels.right.brakeMesh.name = "brake-right-axle-"+(id+1);

        editor.scene.add( axle.wheels.left.brakeMesh );
        editor.scene.add( axle.wheels.right.brakeMesh );

        this.positionComponentsOnAxle( id );

    };

    _p.instance.prototype.buildDefaultBrakes = function() {

        var brake = new VDS.module.brake.instance( editor , {
            type: "disc"
        });

        brake.build({

            innerDiameter: 7,
            outerDiameter: 13,
            discThickness: 0.2,
            discSpace: 0.5,
            discPoints:40,

            ventilatedSlots: 50,
            ventLength: 2,
            ventHeight: 0.3,
            ventInset: 0.3,
            ventPoints: 16,

            drilled: true,
            drillsPerLine: 5,
            drillLines: 10,
            drillDiameter: 0.35,
            drillPathAngle: -Math.PI/6,
            drillLineWidth: 0.75,
            drillShapePoints: 8,

            slotted: false,

            boltPattern: 5,
            boltDiameter: 0.75,
            bearingDiameter: 3 ,
            boltPoints: 10,
            hubDepth: 1.5,

            bevel: true,
            bevelSize: 0.04,
            bevelSegments: 1

        });

        var group = new THREE.Group();
        var bdMesh = new THREE.Mesh( brake.parts["disc"] , VDS.materials.discBrakeClean );
        var bcMesh = new THREE.Mesh( brake.parts["caliper"] , VDS.materials.discBrakeCaliper );
        group.add(bdMesh);
        group.add(bcMesh);

        return {
            instance: brake,
            group: group
        };

    }

    _p.instance.prototype.renderAxles = function( scene ) {

        if( this.axles.length <= 0 ) {
            return false;
        }

        for( var i = 0 ; i < this.axles.length; i++ ) {

        }

    }

     

    /**
     * Set an axle as a the main axle responsible for steering the vehicle.
     * Only one axle can be set to steer.
     * 
     * @param {*} id 
     */
    _p.instance.prototype.setSteeringAxle = function( id ) {

        if( id < 0 || id >= this.axles.length ) {
            return false;
        }

        for( var i = 0 ; i < this.axles.length; i++ ) {

            if( i === id ) {
                this.axles[i].steering = true;
            } else { 
                this.axles[i].steering = false;
            } 

        }

    }

    /**
     * Set an axle as a driven axle (power is applied to the drivetrain)
     * @param {*} id 
     */
    _p.instance.prototype.setDrivenAxle = function( id , only ) {

        if( id < 0 || id >= this.axles.length ) {
            return false;
        }

        if( only == true ) {
            for(var i = 0 ; i < this.axles.length;i++) {
                this.axles[i].driven = false;
            }
        }

        this.axles[id].driven = true;

    }

    _p.instance.prototype.getSteeringAxleID = function() {

        var id = -1;

        for( var i = 0 ; i < this.axles.length; i++ ) {

            if( this.axles[i].steering === true ) {

                return i;

            }

        }

        return id;
    }

    _p.instance.prototype.getDrivenAxleIDs = function() {

        var result = [];

        for( var i = 0 ; i < this.axles.length; i++ ) {

            if( this.axles[i].driven === true ) {

                return result.push(i);

            }

        }

        return result;

    }

    _p.instance.prototype.setDrivenAxlesEqualPower = function() {

        var driven = this.getDrivenAxleIDs();

        if( driven.length == 0 ) {
            return;
        }

        for( var i = 0 ; i < driven.length; i++ ) {

            this.axles[ driven[i] ].powerDistribution = 1.0 / driven.length;

        }

    }

    _p.instance.prototype.calculateFrameArea = function() {

        var area = 0;

        var lonL = VDS.module.calculate.mesh3DArea( this.frame.longitudinal.meshL );
        var lonR = VDS.module.calculate.mesh3DArea( this.frame.longitudinal.meshR );

        var cross = [];

        for( var i = 0 ; i < this.frame.cross.length; i++ ) {

            cross.push(
                VDS.module.calculate.mesh3DArea(
                    this.frame.cross[i].mesh
                )
            );

            area += cross[i];

        }

        area += lonL + lonR;

        return area;

    }

    return _p;

})( {} );