var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.brake = (function( _p ){
  

    _p.instance = function( editor , cfg ) {

        this.editor = editor;
        this.type = cfg.type; // "disc" ; "drum"
        this.parts = {};
        this.physics = {};

    }

    _p.instance.prototype.build = function( cfg ) {

        if( this.type == "disc" ) {
            this.buildDiscBrake( cfg );
        }

    }

    _p.instance.prototype.buildDiscBrake = function( cfg ) {

        var outerDiam = cfg.outerDiameter;
        var innerDiam = cfg.innerDiameter;
        var outerRad = outerDiam/2;
        var innerRad = innerDiam/2;
        var surfaceLen = outerRad - innerRad;
        var discThickness = cfg.discThickness == undefined ? 1.0 : THREE.Math.clamp( cfg.discThickness , 0.1 , 100 );
        var discSpace = cfg.discSpace == undefined ? 1.0 : THREE.Math.clamp( cfg.discSpace , 0.1 , 100 );
        var discPoints = cfg.discPoints; 
 
        var drilled = cfg.drilled == true ? true : false;
        var slotted = cfg.slotted == true ? true : false;

        // number of drills per line
        var drillsPerLine = cfg.drillsPerLine == undefined ? 1 : THREE.Math.clamp( cfg.drillsPerLine , 1 , 20 );
        // The proportion of the surface length for each drill path (centered)
        var drillLineWidth = cfg.drillLineWidth == undefined ? 0.8 : THREE.Math.clamp( cfg.drillLineWidth , 0.2 , 0.9 );
        // A curve path to use to apply the drill shapes
        var drillPath = cfg.drillPath == undefined ? new THREE.CatmullRomCurve3([ new THREE.Vector3(0,0,0) , new THREE.Vector3((surfaceLen/2)*drillLineWidth,0.2,0) , new THREE.Vector3(surfaceLen*drillLineWidth,0,0) ]) : cfg.drillPath;
        var drillLines = cfg.drillLines == undefined ? 10 : THREE.Math.clamp( cfg.drillLines , 2 , 20 );
        var drillDiam = cfg.drillDiameter == undefined ? 1.0 : THREE.Math.clamp( cfg.drillDiameter , 0.1 , 100 );
        var drillRad = drillDiam/2;
        var drillShapePoints = cfg.drillShapePoints;
         
        var drillPathAngle = cfg.drillPathAngle == undefined ? 0 : cfg.drillPathAngle;
        // Rotate the drill path to its initial offset angle (if one is specified)
        if( drillPathAngle !== 0 ) {
            VDS.module.shape.rotateCurve( drillPath , new THREE.Vector3( 0 , 0 , drillPathAngle ) );
        }

        var angInt = (Math.PI*2) / drillLines;

        var drillShapes = [];
        var drillArea = 0;
        if( drilled == true ) { 

             
            var drillPaths = new Array( drillLines );
 
            var dshape;
            var pathPoint, dx, dy, cx, cy, angle;
            for( var i = 0 ; i < drillLines ; i++ ) {

                // Add the rotated path with the appropriate position and rotation
                angle = i * angInt;
                cx = Math.cos( angle ) * (innerRad+(surfaceLen*drillLineWidth)/2 + surfaceLen*((1.0 - drillLineWidth)/2) );
                cy = Math.sin( angle ) * (innerRad+(surfaceLen*drillLineWidth)/2 + surfaceLen*((1.0 - drillLineWidth)/2) );
                drillPaths[i] = drillPath.clone();
                VDS.module.shape.rotateCurve( drillPaths[i] , new THREE.Vector3( 0 , 0 , angle ) );
                VDS.module.shape.moveCurveTo( drillPaths[i] , new THREE.Vector3( cx , cy , 0 ) );

                for( var p = 0 ; p < drillsPerLine ; p++ ) {

                    var u = p / (drillsPerLine-1);
                    pathPoint = drillPaths[i].getPointAt( u );
                    dshape = VDS.module.shape.circle( drillShapePoints , drillRad , pathPoint.x , pathPoint.y );
                    drillShapes.push( dshape );

                    drillArea += drillRad*drillRad*Math.PI; // Area of circle : rad*rad*PI

                }

            }

        }
        
        var slotShapes = [];
        if( slotted == true ) {
           
            // To be added at a later stage (possibly using textures only)

        }

        // ----------------------------------------- Make disc geometry -----------------------------------------

            var outerArea = Math.pow(outerRad,2)*Math.PI;  
            var innerArea = Math.pow(innerRad,2)*Math.PI;

            var discShape = VDS.module.shape.circle( discPoints , outerRad , 0 , 0 );
            discShape.holes = drillShapes;
            // Add the center hole
            discShape.holes.push(
                VDS.module.shape.circle( discPoints , innerRad , 0 , 0 )
            );

            var es = { 
                depth: discThickness/2, 
                bevelEnabled: cfg.bevel, 
                bevelSegments: cfg.bevelSegments, 
                steps: 1, 
                bevelSize: cfg.bevelSize, 
                bevelThickness: cfg.bevelSize,
                // Extra parameters (added by me, won't be available if a different version of THREE.js is used)
                bevelFront: true,
                bevelBack: true,
                removeFrontFaces: false,
                removeBackFaces: false,
                removeSidewallFaces: false,
                removeContourFaces: false
            };

            var disc = new THREE.ExtrudeGeometry( discShape, es );
            disc.mergeVertices();
            VDS.module.calculate.computeVertexNormals(disc,40);
            disc.computeFaceNormals();

            var disc2 = disc.clone();

            disc.translate(0,0, -discThickness +cfg.bevelSize -discSpace/2 );
            disc2.translate(0,0, cfg.bevelSize + discSpace/2 );

            disc.merge(disc2);
        
        // -------------------------------------------------------------------------------------------------------------------
        // Make ventilation slots
        // -------------------------------------------------------------------------------------------------------------------

            var ventilatedSlots = cfg.ventilatedSlots == undefined ? 10 : THREE.Math.clamp( cfg.ventilatedSlots , 5 , 100 );
            var ventDepth = discSpace;
            var ventW = cfg.ventLength;
            var ventH = cfg.ventHeight;
            var ventInset = cfg.ventInset;
            var ventPoints = cfg.ventPoints;
            var ventShapes = new Array(ventilatedSlots);

            var vInt = (Math.PI*2)/ventilatedSlots;
            var vAng, vx , vy;
            for( var i = 0 ; i < ventilatedSlots ; i++ ) {

                vAng = i * vInt;
                vx = Math.cos(vAng) * (outerRad - ventW/2 - ventInset );
                vy = Math.sin(vAng) * (outerRad - ventW/2 - ventInset  );
                // a new shape has to be used every time because the vector references can't be cloned without a deep copy ; this is faster
                ventShapes[i] = VDS.module.shape.rectangleRoundedPoints( ventW , ventH , 0.4 , ventPoints , new THREE.Vector3() , true );
                VDS.module.shape.rotateShape( ventShapes[i] , vAng );
                VDS.module.shape.moveShapeTo( ventShapes[i] , new THREE.Vector2(vx,vy) );
                ventShapes[i] = new THREE.Shape(ventShapes[i]);

            }
         
            var vES = { 
                depth: ventDepth, 
                bevelEnabled: false, 
                // Extra parameters (added by me, won't be available if a different version of THREE.js is added)
                removeFrontFaces: true,
                removeBackFaces: true,
                removeSidewallFaces: false,
                removeContourFaces: false
            };
            var vents = new THREE.ExtrudeGeometry( ventShapes, vES );
            vents.translate(0,0,-ventDepth/2);
            vents.mergeVertices();
            VDS.module.calculate.computeVertexNormals(vents,60);
            vents.computeFaceNormals();

            disc.merge(vents);

        // -------------------------------------------------------------------------------------------------------------------

         
        // -------------------------------------------------------------------------------------------------------------------
        // Make hub (with bolt pattern)
        // -------------------------------------------------------------------------------------------------------------------
          
            var boltPattern = cfg.boltPattern == undefined ? 5 : THREE.Math.clamp( cfg.boltPattern , 3 , 10 );
            var boltDiameter = cfg.boltDiameter;
            var bearingDiameter = cfg.bearingDiameter;
            var bearingRad = bearingDiameter/2;
            var boltPoints = cfg.boltPoints;
            var hubDepth = cfg.hubDepth;

            var hubShape = VDS.module.shape.circle( discPoints , innerRad , 0 , 0 );
            
            var boltPatternArea = 0;
            var bearingArea = Math.pow( bearingRad , 2 ) * Math.PI;

            var boltHoles = new Array(boltPattern);
            var bInt = (Math.PI*2)/boltPattern;
            var bAng, bx , by;
            for( var i = 0 ; i < boltPattern; i++ ) {

                bAng = i * bInt;
                bx = Math.cos(bAng) * ( bearingRad + (innerRad-bearingRad)/2 );
                by = Math.sin(bAng) * ( bearingRad + (innerRad-bearingRad)/2 );
                boltHoles[i] = VDS.module.shape.circle( boltPoints , boltDiameter/2 , bx , by );

                boltPatternArea += Math.pow( boltDiameter/2 , 2 ) * Math.PI;

            }

            hubShape.holes = boltHoles;
            hubShape.holes.push(
                VDS.module.shape.circle( discPoints , bearingRad , 0 , 0 )
            );

            var hES = { 
                depth: hubDepth, 
                bevelEnabled: true, 
                bevelSegments: 1, 
                steps: 1, 
                bevelSize: 0.1, 
                bevelThickness: 0.1,
                // Extra parameters (added by me, won't be available if a different version of THREE.js is added)
                bevelFront: true,
                bevelBack: true,
                removeFrontFaces: false,
                removeBackFaces: true,
                removeSidewallFaces: false,
                removeContourFaces: false
            };
            var hub = new THREE.ExtrudeGeometry( hubShape, hES );
            //hub.translate(0,0,-ventDepth/2);
            hub.mergeVertices();
            VDS.module.calculate.computeVertexNormals(hub,40);
            hub.computeFaceNormals();

            disc.merge(hub);

        // -------------------------------------------------------------------------------------------------------------------
        
        // -------------------------------------------------------------------------------------------------------------------
        // Make caliper geometry
        // -------------------------------------------------------------------------------------------------------------------

            var caliperThickness = cfg.caliperThickness == undefined ? 0.35 : THREE.Math.clamp( cfg.caliperThickness , 0.1 , 50 );
            var caliperWidth = cfg.caliperWidth == undefined ? 0.8 : THREE.Math.clamp( cfg.caliperWidth , 0.25 , 1.5 );
            var caliperHeight = cfg.caliperHeight == undefined ? 1.0 : THREE.Math.clamp( cfg.caliperHeight , 0.25 , 1.5 );
            var caliperOffsetY = cfg.caliperOffsetY == undefined ? 0.4 : cfg.caliperOffsetY; 

            // Create left side of points
            var cPts = [
                new THREE.Vector2( 1  , 1 ),
                new THREE.Vector2( 0 , 0 ),
                new THREE.Vector2( -4 , 1.5 ),
                new THREE.Vector2( -4.5 , 3 ),
                new THREE.Vector2( -2.5 , 4.4 ),
                new THREE.Vector2( -1 , 5.1 ),
                new THREE.Vector2( 0 , 5.5 ),
                new THREE.Vector2( 2 , 6 )
            ];
            // Lazy developer's way: copy left side and mirror points and reposition
            var cPts2 = VDS.module.shape.cloneShape( cPts );
            // Mirror second half horizontally
            VDS.module.shape.flipShape(cPts2,"x");
            // Reverse the position of each element in the second half's array to match the clockwise order of the shape
            cPts2.reverse();
            VDS.module.shape.moveShape( cPts2 , new THREE.Vector2(10,0) );
            // Add second half to first half array
            cPts = cPts.concat( cPts2 );
            // Move entire shape to origin (0,0)
            VDS.module.shape.moveShapeTo( cPts , new THREE.Vector2(0,0) );

            var caliperArea = THREE.ShapeUtils.area( cPts );

            // get the boundaries of the caliper shape (to re-scale to fit the discs)
            var cB = VDS.module.shape.shapeBounds(cPts);
            // use the width of the caliper shape to re-scale it according to the rotor dimensions
            var cScaleX = (outerDiam*caliperWidth) / cB.width;
            var cScaleY = (surfaceLen*caliperHeight) / cB.height;
            VDS.module.shape.scaleShape( cPts, new THREE.Vector2(cScaleX,cScaleY) );
            // recalculate bounds again (neede for correct positioning)
            cB = VDS.module.shape.shapeBounds(cPts);

            var caliperShape1 = VDS.module.shape.polygonShape( cPts );

            caliperShape1.holes.push(
                VDS.module.shape.circle( 8 , 0.3 , cB.x.min + 1 , cB.y.max - 1.3 ),
                VDS.module.shape.circle( 8 , 0.3 , cB.x.max - 1 , cB.y.max - 1.3 ),
                VDS.module.shape.circle( 8 , 0.3 , 0 , cB.y.max - 0.3 )
            );
 

            var cES1 = { 
                depth: caliperThickness, 
                bevelEnabled: true, 
                bevelSegments: 1, 
                steps: 1, 
                bevelSize: 0.1, 
                bevelThickness: 0.1,
                // Extra parameters (added by me, won't be available if a different version of THREE.js is added)
                bevelFront: true,
                bevelBack: true,
                removeFrontFaces: false,
                removeBackFaces: false 
            };
            var caliper1 = new THREE.ExtrudeGeometry( caliperShape1, cES1 );
        
            caliper1.mergeVertices();
             

            // Caliper details
            var cdPts = VDS.module.shape.cloneShape( cPts );
            VDS.module.shape.scaleShape( cdPts , new THREE.Vector2(0.65 , 0.5) );
            var cdShape = new THREE.Shape( cdPts );

            var cdES = { 
                depth: caliperThickness*0.75, 
                bevelEnabled: true, 
                bevelSegments: 3, 
                steps: 1, 
                bevelSize: 0.1, 
                bevelThickness: 0.1,
                // Extra parameters (added by me, won't be available if a different version of THREE.js is added)
                bevelFront: true,
                bevelBack: false,
                removeFrontFaces: false,
                removeBackFaces: true 
            };
            var caliperDetail = new THREE.ExtrudeGeometry( cdShape, cdES );
            caliperDetail.translate(0,0,caliperThickness);
            caliper1.merge(caliperDetail);
            
            var caliper2 = caliper1.clone();
 
            //caliper1.scale(1,1,-1);
            VDS.module.calculate.mirrorGeometry( caliper2 , false, false,true);

            // When mirroring, the face order needs to be adjusted for the normal calculations
            // Must be done before recalculating normals
            VDS.module.calculate.reverseFaceOrder( caliper2 );
             
            // recalculate normals after mirroring the caliper
            VDS.module.calculate.computeVertexNormals(caliper1,40);
        
            VDS.module.calculate.computeVertexNormals(caliper2,40);
         
            var calPosZ = caliperThickness + 0.1 + discSpace/2;
            var cong = new THREE.BoxGeometry(2,0.1, calPosZ*2 + caliperThickness*2 );
            cong.translate(0,outerRad+caliperOffsetY-0.1,0);
             
            caliper1.translate(0, outerRad-cB.height/2+caliperOffsetY, calPosZ );
            caliper2.translate(0, outerRad-cB.height/2+caliperOffsetY , -calPosZ );
             
            caliper1.merge(caliper2);
            caliper1.merge(cong);
           
        // -------------------------------------------------------------------------------------------------------------------

        // Calculate physical properties of brake assembly
        this.physics = {};

        this.physics.drillVolume = drillArea*discThickness;
        this.physics.discVolume = ( outerArea - innerArea )*discThickness;
        this.physics.rotorVolume = this.physics.discVolume - this.physics.drillVolume;
        this.physics.rotorsMass = this.physics.rotorVolume * 0.28 * 2; // Steel (carbon) mass per cubic inch (there are 2 rotors)
        
        this.physics.hubVolume = (innerArea - boltPatternArea - bearingArea)*hubDepth;
        this.physics.hubMass = this.physics.hubVolume * 0.28;

        this.physics.caliperVolume = caliperArea * caliperThickness;
        this.physics.calipersMass = this.physics.caliperVolume * 0.28 * 2;

        // Brake performance parameters
        this.performance = {};

        /*
            By applying resistance, or friction, to a turning wheel, a vehicle's brakes cause the wheel to slow down and eventually stop, creating heat as a byproduct. 
            The rate at which a wheel can be slowed depends on several factors including vehicle weight, braking force and total braking surface area. 
            It also depends heavily on how well a brake system converts wheel movement into heat (by way of friction) and, 
            subsequently, how quickly this heat is removed from the brake components. 

            The greater the diameter of the disc, the further from the centre of the wheel the braking force can be applied. 
            This in turn will generate a greater braking force, or torque, on the disc, 
            since torque is a force applied at a radius to a rotational member.

        */
        this.performance.brakingForce = (outerRad-innerRad) / 100;  // larger disc => larger braking force
        this.performance.rotorStrength = (outerArea-innerArea-drillArea) / (outerArea-innerArea); // Drilled rotors can cause stress fractures. The larger the drilled area, the more prone to cracking the rotors are
        this.performance.padWear = 0; // Drilled and slotted rotors increase pad-wear
        this.performance.heatDissipation = 0;

        console.log( this.physics );
        console.log( this.performance );

        // Set parts references
        this.parts["disc"] = disc;
        this.parts["caliper"] = caliper1;

    }

    return _p;

})({});