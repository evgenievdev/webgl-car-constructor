var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.suspension = (function( _p ){
  

    _p.instance = function( editor , cfg ) {

        this.editor = editor;
        this.type = cfg.type; // "double-wishbone" ; "macpherson-strut" ; "swing-axle"
        this.parts = {};

    }

    _p.instance.prototype.build = function() {
 
        if( this.type == "double-wishbone" ) {
            this.buildDoubleWishbone();
        } else if( this.type == "macpherson-strut" ) {
            this.buildMacphersonStrut();
        } else if( this.type == "swing-axle" ) {
            this.buildSwingAxle();
        }

    }

    _p.instance.prototype.buildDoubleWishbone = function() {

        // Top wishbone

        // Bottom wishbone

        // Knuckle 

    }

    _p.instance.prototype.buildMacphersonStrut = function() {

    }

    _p.instance.prototype.buildSwingAxle = function() {

    }

    _p.instance.prototype.buildKnuckle = function( cfg ) {



    }

    _p.instance.prototype.buildWishbone = function( cfg ) {

        // Initial point to create wishbones from
        var boneOrigin = cfg.wishboneOrigin == undefined ? new THREE.Vector3() : cfg.wishboneOrigin;
 
        var degToRad = 0.0174532925;
        var wishboneAngle = cfg.wishboneAngle * degToRad; // Angle in radians between two wishbone arm links 
        var armLength = cfg.armLength;

        var leftDir = new THREE.Vector3( Math.sin(wishboneAngle/2) , 0 , Math.cos(wishboneAngle/2) );
        var rightDir = leftDir.clone();
            rightDir.x *= -1;   // Flip the direction of the right wishbone arm link

        var leftPoint = boneOrigin.clone().add( leftDir.clone().multiplyScalar( armLength ) );
        var rightPoint = boneOrigin.clone().add( rightDir.clone().multiplyScalar( armLength ) );
   
        var wbPts = [ leftPoint , boneOrigin , rightPoint ];
        var bonePath = new THREE.CatmullRomCurve3( wbPts );
        bonePath.curveType = "catmullrom";
        bonePath.tension = cfg.wishboneTension == undefined ? 0.75 : THREE.Math.clamp( cfg.wishboneTension , 0 , 1 );

        var boneRadius = cfg.wishboneRadius == undefined ? 0.5 : cfg.wishboneRadius;
        var boneShape = VDS.module.shape.circle( 12 , boneRadius );

        var boneExt = {
            steps: 20,
            bevelEnabled: false,
            extrudePath: bonePath
        };
 
        var g = new THREE.ExtrudeGeometry( boneShape, boneExt );
        VDS.module.calculate.computeVertexNormals( g , 70 );

        // Build chassis mounts
        var mgL = this.buildMount({
            position: leftPoint,
            outerRadius: 1.0,
            innerRadius: 0.75,
            direction: "x",
            size: cfg.mountLength,
            bevel: true
        });
        
        var mgR = this.buildMount({
            position: rightPoint,
            outerRadius: 1.0,
            innerRadius: 0.75,
            direction: "x",
            size: cfg.mountLength,
            bevel: true
        });

        // Build Ball-joint at origin
        var bJoint = this.buildMount({
            position: boneOrigin,
            outerRadius: 1.0,
            innerRadius: 0.75,
            direction: "y",
            size: 2,
            bevel: true
        });
        // Move ball-joint slightly back.
        bJoint.translate(0,0,-0.75);

        // Add a floor to the wishbone 
        if( cfg.floor === true ) {

            // Create 2D shape based on wishbone curve

            // Create shape hole which is a scaled version of the shape. 

            // Extrude geometry

        }
 
        // Merge details to wishbone
        g.merge( mgL );
        g.merge( mgR );
        g.merge( bJoint );
 
        return g;

    }
 

    _p.instance.prototype.buildMount = function( cfg ) {

        var outerRadius = cfg.outerRadius == undefined ? 1.0 : THREE.Math.clamp( cfg.outerRadius , 0.01 , 10 );
        var innerRadius = cfg.innerRadius == undefined ? 0.5 : THREE.Math.clamp( cfg.innerRadius , 0.01 , outerRadius-0.05 );
        var nPts = cfg.segments == undefined ? 12 : THREE.Math.clamp( cfg.segments , 3 , 200 );
        var size = cfg.size == undefined ? 1.0 : THREE.Math.clamp( cfg.size , 0.01 , 100 );
        var direction = cfg.direction == undefined ? "y" : cfg.direction;   // Orientation of the joint ; "x" ; "y" ; "z" or a rotational Vector3() ; default is "y"
        var position = cfg.position == undefined ? new THREE.Vector3() : cfg.position;

        var bevel = cfg.bevel == undefined ? false : cfg.bevel;
        var bSize = cfg.bevelSize == undefined ? outerRadius/10 : cfg.bevelSize;
        var bThickness = cfg.bevelThickness == undefined ? outerRadius/10 : cfg.bevelThickness;
        var bSegs = cfg.bevelSegments == undefined ? 2 : cfg.bevelSegments;

        var shape = VDS.module.shape.ring( outerRadius , innerRadius , nPts );

        var dir3 = new THREE.Vector3();
        if( direction == "x" || direction == "y" || direction == "z" ) { 
           dir3[direction] = Math.PI/2;       // Typically this is a specified axis on which to apply the curve point offsets from origin
        } else {
            dir3 = direction.clone();         // Otherwise this is a rotational vector
        }
 
        // Add offsets to the points on the curve based on the directional vector. 
        // The origin point is in the middle. This ensure the pivot point for the joint is in the centre of the geometry
        //var p1 = position.clone();   p1.add( dir3.clone().multiplyScalar( -height/2 ) );
        //var p2 = position.clone();   p2.add( dir3.clone().multiplyScalar( height/2 ) );
        //var path = new THREE.CatmullRomCurve3([ p1 , p2 ]);
         
        var ext = {
            //extrudePath: path,
            depth: size,
            curveSegments: 1,
            steps: 1,
            bevelEnabled: bevel,
            bevelThickness: bThickness,
            bevelSize: bSize,
            bevelSegments: bSegs
             
        };


        var g = new THREE.ExtrudeGeometry( shape, ext );
        g.mergeVertices();

        // Centre geometry
        g.translate( 0,0,-size/2);

        // Fix orientation. By default the geometry faces the z-axis due to the nature of 2D shape extrusions.
        if( direction == "y" ) {
            g.rotateX( -Math.PI/2 );
        } else if( direction == "x" ) {
            g.rotateY( Math.PI/2 );
        }
 
        g.translate(position.x , position.y , position.z);

        return g;


    }

    _p.instance.prototype.buildDustCover = function( cfg ) {

        var radius = cfg.radius == undefined ? 3 : cfg.radius;
        var height = cfg.height == undefined ? 10 : cfg.height;
        var waves = cfg.waves == undefined ? 15 : cfg.waves;
        var waveSize = cfg.waveSize == undefined ? 2.0 : cfg.waveSize;

        var wave = new Array(waves);
        var alt = 0;
        var interval = height / (waves-1);
        for( var i = 0 ; i < waves; i++ ) {
            
            wave[i] = new THREE.Vector3( waveSize * alt , interval * i , 0 );
            
            // Alternating variable used to create the waves
            alt++;
            if( alt > 1 ) { alt = 0; }

        }

        // Create the wave curve and smooth it. Then get extract its points for the 2D shape
        var waveCurve = new THREE.CatmullRomCurve3( wave );
        waveCurve.curveType = "catmullrom";
        waveCurve.tension = 0.5;
        var curvePts = waveCurve.getPoints( waves * 4 );

        // Convert Vector3 to Vector2 (might not be necessary)
        for( var i = 0 ; i < curvePts.length; i++ ) {
            curvePts[i] = new THREE.Vector2().copy( curvePts[i] );
        }


        var st = -0.1;
        var shapePts = [ new THREE.Vector2(st,0) ];
        shapePts = shapePts.concat( curvePts );
        shapePts.push( 
            new THREE.Vector2(st , height ),
            new THREE.Vector2(st,0)   // Add a duplicate of the first point in the beginning (necessary for THREE.Shape)
        );
   
        var shape = new THREE.Shape( shapePts );
       
        var ext = {
            steps: 16,
            depth: radius*2*Math.PI, // We need the length to be equal to the circumference of a circle at this radius so it can be bent
            bevelEnabled: false 
        }

        var g = new THREE.ExtrudeGeometry( shape , ext );
        g.mergeVertices();
     
        // Apply a bend modifier
        var m = new THREE.Mesh( g , VDS.materials.default ); // Create a temporary mesh to apply bend modifier

        var modifier = new ModifierStack(m);
        var bend = new Bend(2, 0, 0);   // Apply a bend modifier on the x-axis for a 360 degree rotation.
        bend.constraint = ModConstant.LEFT;
        modifier.addModifier(bend);
        modifier.apply();
        m.geometry.mergeVertices(); // Merge the last vertices

        g = m.geometry.clone();
        g.computeVertexNormals(true);
        g.computeFaceNormals();
        
        // Finally fix the pivot point of the geometry
        g.translate(radius,0,0);

        return g;

    }

    /**
     * Create a shock absorber (used for independent suspension)
     * @param {*} cfg 
     */
    _p.instance.prototype.buildShockAbsorber = function( cfg ) {

        // Physics
        var compressionLimit = 10000; // Maximum compression force (in Lbs)
        var damping = 1.0;
        var stiffness = 1.0;

        var pistonLength = 0;
        var adjustmentLength = 0; // The maximum adjustment size for the spring position
         
         
         

        var origin = new THREE.Vector3();
        var g = new THREE.Geometry();

        var mountRadius = 1.0;

        // Bottom mount
        var bMount = this.buildMount({
            position: origin,
            outerRadius: mountRadius,
            innerRadius: 0.75,
            direction: "x",
            size: 0.6,
            bevel: true
        });
        bMount.mergeVertices();

        // Piston rod (piston length)

        // Piston chamber + adjuster (moves position of spring)
        var chamberRadius = 1.25;
        var chamberLength = 6;
        var pistonChamber = new THREE.CylinderGeometry( chamberRadius , chamberRadius , chamberLength , 16 );
        pistonChamber.mergeVertices();
        pistonChamber.translate(0,mountRadius + chamberLength/2,0);

        var lbRadius = 1.35;
        var lbHeight = 0.4;
        var lockingBracket = new THREE.CylinderGeometry( lbRadius , lbRadius , lbHeight , 16 );
        lockingBracket.mergeVertices();
        lockingBracket.translate(0,mountRadius + chamberLength + lbHeight/2 ,0);

        var saRadius = 1;
        var saHeight = 4;
        var springAdjustment = new THREE.CylinderGeometry( saRadius , saRadius , saHeight , 16 );
        springAdjustment.mergeVertices();
        springAdjustment.translate(0, mountRadius + chamberLength + lbHeight + saHeight/2 ,0);

        var ssRadius = 1.5;
        var ssHeight = 0.4;
        var springSeat = new THREE.CylinderGeometry( ssRadius , ssRadius , ssHeight , 16 );
        springSeat.mergeVertices();
        springSeat.translate(0, mountRadius + chamberLength + lbHeight + saHeight + ssHeight/2 ,0);

         
        // Coil Spring
        var coilHeight = 8;
        var coilSpring = this.buildCoilSpring({
            radius:1.5,
            height:coilHeight,
            loops: 7,
            thickness:0.2,
            segments:10,
            circlePoints:8,
            steps: 100
        });
        coilSpring.translate(0, mountRadius + chamberLength + lbHeight + saHeight + ssHeight ,0);

        // Dust cover
        var dcRadius = 0.9;
        var dcHeight = 4;
        var dustCover = this.buildDustCover({
            radius: dcRadius,
            height: dcHeight,
            waves: 25,
            waveSize: 0.1 
        });
        dustCover.translate(0, mountRadius + chamberLength + lbHeight + saHeight + ssHeight + coilHeight - dcHeight ,0);

        var upperSeat = springSeat.clone();
        upperSeat.scale(1.2,1,1.2);
        upperSeat.translate(0,coilHeight + ssHeight ,0);

        var prRadius = 0.35;
        var prHeight = coilHeight;
        var pistonRod = new THREE.CylinderGeometry( prRadius , prRadius , prHeight , 16 );
        pistonRod.mergeVertices();
        pistonRod.translate(0, mountRadius + chamberLength + lbHeight + saHeight + ssHeight + coilHeight - prHeight/2 ,0);

        // Top mount
        var tMount = this.buildMount({
            position: origin,
            outerRadius: mountRadius,
            innerRadius: 0.75,
            direction: "x",
            size: 0.6,
            bevel: true
        });
        tMount.mergeVertices();
        tMount.translate(0,mountRadius + chamberLength + lbHeight + saHeight + ssHeight + coilHeight + ssHeight + mountRadius,0);

        // Merge all pieces appropriately
        /*
        g.merge( bMount );
        g.merge( pistonChamber );
        g.merge( lockingBracket );
        g.merge( springAdjustment );
        g.merge( springSeat );
        g.merge( dustCover );
        g.merge( coilSpring );
        g.merge( upperSeat );
        g.merge( pistonRod );
        g.merge( tMount );

        return g;
        */
 

        return {
            bottomMount: bMount,
            topMount: tMount,
            lockingBracket: lockingBracket,
            springAdjustment: springAdjustment,
            springSeat: springSeat,
            dustCover: dustCover,
            coilSpring: coilSpring,
            upperSeat: upperSeat,
            pistonRod: pistonRod,
            pistonChamber: pistonChamber
        };

    }

    /**
     * Create a coil spring geometry (used for independent suspension setups)
     * 
     * @param {*} cfg 
     */
    _p.instance.prototype.buildCoilSpring = function( cfg ) {

        var radius = cfg.radius;
        var height = cfg.height;
        var loops = cfg.loops;
        var thickness = cfg.thickness;
        var segments = cfg.segments;
        var circlepts = cfg.circlePoints;
        var steps = cfg.steps <= 10 || cfg.steps == undefined ? 10 : cfg.steps;

        // params : radius , height , numloops , numsegs
        //var spring = VDS.module.shape.coilSpring( 2 , 12 , 7 , 10 );
        var spring = VDS.module.shape.coilSpring( radius , height , loops , segments );
        var springextr = {
            steps: steps,
            bevelEnabled: false,
            extrudePath: spring
        };
 
        var cshape = VDS.module.shape.circle( circlepts , thickness );

        var gspring = new THREE.ExtrudeGeometry( cshape, springextr );
        VDS.module.calculate.computeVertexNormals(gspring,70);

        return gspring;
 
    }

    return _p;
    
})( {} );