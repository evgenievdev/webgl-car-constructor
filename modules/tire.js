var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.tire = (function( _public ){

    // An object containing some useful conversions
    var _UNITS = {
        mm2inch: 0.0393700787,
        cm2inch: 0.393700787,
        inch2mm: 25.4,
        inch2cm: 2.54,
        mi2km: 1.609344,
        km2mi: 0.621371192
    };

    // Friction coefficients for some tire compounds
    var _COMPOUNDS = [
         {
            dry: 1.0,
            wet: 0.8,
            ice: 0.25,
            sand: 0.4
        },
         {
            dry: 1.3,
            wet: 0.9,
            ice: 0.15,
            sand: 0.3
        },
         {
            dry: 1.6,
            wet: 0.4,
            ice: 0.1,
            sand: 0.2
        }
    ];

    function circleCircumference( r ) {
        return Math.PI*2*r;
    }

    /**
     * Normally tire dimensions are specified as follows: 205/55R16
     * The first number represents the width of the tire in millimeters
     * The second number is the size of the sidewall as percentage of that width
     * The letter (in this case R) defines the type of tire it is. R means radial.
     * The last number is the diameter of the rim in INCHES.
     *  
     * @param {*} tireWidth Width of the tire in millimeters
     * @param {*} tireSidewall Size of the tire sidewall as a percentage of the tire width (e.g. 55)
     * @param {*} rimDiameter Diameter of the rim in inches
     */
    _public.instance = function( tireWidth , tireSidewall , rimDiameter , tireCompound , tirePressure , options ) {
        
        // In millimeters
        this.tireWidth = tireWidth;
        // As a percentage of the tire width
        this.tireSidewall = tireSidewall;
        // In inches (diameter NOT radius)
        this.rimDiameter = rimDiameter;
        // Tire compound
        this.tireCompound = tireCompound;
        // Tire pressure
        this.tirePressure = tirePressure;
        // Options object containing things like chamfering, etc
        this.options = options;

        this.renders = [];

    }

    _public.instance.prototype.setProperties = function( cfg ) {

        this.tireWidth = cfg.tireWidth;
        this.tireSidewall = cfg.aspectRatio;
        this.rimDiameter = cfg.rimDiameter;
        this.tireCompound = cfg.tireCompound;
        this.tirePressure = cfg.tirePressure;

    }

    _public.instance.prototype.getTractionCoefficents = function( roundness ) {

        if( this.tireCompound < 0 || this.tireCompound >= _COMPOUNDS.length || _COMPOUNDS[ this.tireCompound ] == undefined ) {
            return false;
        }

        var obj = _COMPOUNDS[ this.tireCompound ];

        var wF = this.tireWidth / 200; // Everything is based on a 205/55R16 tire since it is one of the industry standards
        wF *= (1.0-roundness);

        var pF = 30 / this.tirePressure; // Everything is based on a tire with 30 psi. Lower tire pressure means more traction, but higher rolling ressistance and vice versa.
        
        var dF = this.calculateTireDiameter() / 25; // Tire diameter affects the contact patch. A standard tire has a 16 inch rim diameter and 4.5 inch sidewall => 25 inches is its diameter

        var res = {};
        for( var key in obj ) {

            res[ key ] = obj[ key ] * wF * pF * dF;

        }

        return res;

    }

    _public.instance.prototype.getLastRender = function() {

        if( this.renders.length <= 0 ) {
            return false;
        }

        return this.renders[ this.renders.length-1 ];

    }

    _public.instance.prototype.calculateTireWidth = function() {

        // The units need to be converted into a uniform measure for adequate use - in this case inches will be used
        // Since the sidewall is in millimeters, it needs to be converted to inches
        // 1 millimeter = 0.0393700787 inches
        return this.tireWidth * _UNITS.mm2inch;

    };

    _public.instance.prototype.calculateTireSidewall = function() {

        return this.calculateTireWidth() * (this.tireSidewall/100);

    }

    /**
     * Calculate the radius of the entire wheel 
     * 
     * @return The radius of the wheel in inches
     */
    _public.instance.prototype.calculateTireRadius = function() {

         
        return this.calculateTireSidewall() + this.rimDiameter/2;

    };

    _public.instance.prototype.calculateTireDiameter = function() {

        return this.calculateTireRadius() * 2;

    };

    _public.instance.prototype.constructTireGeometry2 = function( cfg ) {
        
        return this.constructTireGeometry( cfg.points , cfg.bevelSegments , cfg.treadRepeat , cfg.sidewallRepeat , cfg.innerWidth , cfg.roundness )

    }

    /**
     * 
     * @param {*} points 
     * @param {*} bevelSegments 
     * @param {*} textureYRepeat 
     * @param {*} innerWidth 
     * @param {*} roundness 
     */
    _public.instance.prototype.constructTireGeometry = function( points , bevelSegments , treadRepeat , sidewallRepeat , innerWidth , roundness ) {

        // Get tire width in inches
        var tireWidth = this.calculateTireWidth();
        var tireSidewall = this.calculateTireSidewall();
        var tireRadius = this.calculateTireRadius();
         

        var innerOffset = (tireWidth - tireWidth * innerWidth) / 2 ;

        var bThickness = tireWidth * roundness;
        var bSize = tireWidth * roundness;

        var extrudeSettings = {
            steps: 1,
            depth: tireWidth - bThickness*2,
            bevelEnabled: true,
            bevelThickness: bThickness,  // How much the geometry goes outside the width of the wheel
            bevelSize: bSize, // How much the geometry goes inside the wheel vertically
            bevelSegments: bevelSegments < 2 ? 2 : bevelSegments // How many lines for chamfering 
        };

        var lineTriCount = extrudeSettings.steps * 2 + extrudeSettings.bevelSegments * 4;
        var lineCount = points < 5 ? 5 : points;

        var bSegWidth = bSize / extrudeSettings.bevelSegments;
        var texBevel = ( bThickness - bSegWidth )  / tireWidth;
        var texThread = 1.0 - texBevel*2;
 

        // Create a circle shape with the radius of the wheel. This will be used to extrude from !CONSIDER MODIFYING!
        var shape = VDS.module.shape.circle( lineCount , tireRadius-bSize );
        // Generate extruded cylinder with chamfering
        var buffer = new THREE.ExtrudeBufferGeometry( shape, extrudeSettings );
        // Convert buffer geometry into regular geometry
        var geo = new THREE.Geometry().fromBufferGeometry( buffer );
        // Typically there are duplicate vertices in the same location. They are not needed and cause slowdowns. Remove them and cleanup the faces array
        geo.mergeVertices();
        // Fix translation of geometry. The bevel is outwards and makes the geometry deviate from the origin point. Move the geometry back to origin
        geo.translate(0,0,extrudeSettings.bevelThickness);
         
        // Remove the center caps on the cylinder, they aren't needed.
        geo.faces.splice( 0 , geo.faces.length - lineTriCount*lineCount );
         
        var seg = Math.PI*2 / lineCount;
        var radInner = this.rimDiameter/2;
 
        for( var i = 0 ; i < lineCount ; i++ ) { 

            // Back faces (at origin point)
            geo.vertices.push( new THREE.Vector3(
                radInner * Math.cos( seg*i ) , 
                radInner * Math.sin( seg*i ),
                0
            ) );
 
        }

        var atan2;
        for( var i = 0 ; i < lineCount ; i++ ) {

            // Front faces
            geo.vertices.push( new THREE.Vector3(
                radInner * Math.cos( seg*i ) , 
                radInner * Math.sin( seg*i ),
                -tireWidth
            ) );

            // Back vertices are generated haphazardly, therefore we need to calculate the angle of each point relative to the origin and use that to reposition
            atan2 = Math.atan2(geo.vertices[i].x, geo.vertices[i].y );
            geo.vertices[i].x = Math.cos( Math.PI/2 - atan2 ) * radInner;
            geo.vertices[i].y = Math.sin( Math.PI/2 - atan2 ) * radInner;
            geo.vertices[i].z = innerOffset;
            // Front vertices are generated in order, therefore an iterator can be used
            geo.vertices[lineCount+i].x = radInner * Math.cos( seg*i );
            geo.vertices[lineCount+i].y = radInner * Math.sin( seg*i );
            geo.vertices[lineCount+i].z += -innerOffset;

        }
 
        geo.verticesNeedUpdate = true;
 
        // Hack! The first first triangle in the first row is actually the last element in the array. 
        // This is wrong. Add it at the end (second last element) of the first row and remove the duplicate from the end.
        var last = geo.faces[ geo.faces.length - 1 ];
        geo.faces.splice( lineTriCount - 2 , 0 , last );
        geo.faces.splice( geo.faces.length - 1 , 1 );
        
        // There is an issue with the order of the faces in each row. The first face in the array is actually the last face in the row. Therefore we need to relocate them.
        fixFaceOrder( geo , lineTriCount , lineCount );
        
        // Make the geometry smooth (not faceted)
        geo.computeFaceNormals();
        geo.computeVertexNormals(false);
        geo.computeBoundingBox();

        generateTireUVs( geo , lineTriCount , lineCount , extrudeSettings.bevelSegments-1 , texBevel , texThread , treadRepeat , sidewallRepeat );
        
        geo.translate(0,0,-tireWidth/2);

        this.renders.push({
            tireWidth: this.tireWidth,
            aspectRatio: this.tireSidewall,
            rimDiameter: this.rimDiameter,
            tireCompound: this.tireCompound,
            tirePressure: this.tirePressure,
            points: points , 
            bevelSegments: bevelSegments , 
            treadRepeat: treadRepeat , 
            sidewallRepeat: sidewallRepeat , 
            innerWidth: innerWidth , 
            roundness: roundness,
            _traction: this.getTractionCoefficents(roundness),  // An object containing traction coefficients for different surfaces (calculated based on tire parameters)
            _mass: _public.calculateTireMass( geo ), // Mass of tire (default in lbs)
            _geometry: geo // The constructed geometry 
        });

        return geo;

    };

    function fixFaceOrder( geo , trisPerLine , lineCount ) {

         // Each line.
         var f;
         for( var i = 1 ; i < lineCount; i++ ) {
        
            f = geo.faces[ i * trisPerLine ];
            geo.faces.splice( i * trisPerLine + trisPerLine -1 , 0 , f ); // Add at the end of the line
            geo.faces.splice( i * trisPerLine , 1 ); // Remove the first one since we moved it already
 
 
        }

    }

    function generateTireUVs( geo , trisPerLine , lineCount , bevelSegs , texBevel , texThread , treadRepeat , sidewallRepeat ) {

        geo.faceVertexUvs[0] = [];
      
        var x = 0, o = 0;
        var s=0,e=0;
        var y1 = 0 , y2 = 0;
        var yseg = 1.0 / lineCount;
        var yrepeat = treadRepeat <= 0 ? 1 : treadRepeat;
        var bseg = texBevel/bevelSegs;

        // Sidewall size
        var sws = 0.25;
        var x1 = 1.0 - sws;
        var treadoffset = (1.0-sws*2);
        // Each line.
        for( var i = 0 ; i < lineCount; i++ ) {

            // Each triangle within the line.
            for( var j = 0 ; j < trisPerLine ; j+=2 ) {
                
                if( j == 0 || j == trisPerLine-2 ) {
                    yrepeat = sidewallRepeat;
                } else {
                    yrepeat = treadRepeat;
                }

                y1 = 1-i*yseg*yrepeat;
                y2 = y1 - yseg*yrepeat;

                // Forward Sidewall
                if( j === trisPerLine-2  ) {

                    geo.faceVertexUvs[0].push([
                        new THREE.Vector2( x1,y1 ),
                        new THREE.Vector2( 1,y2 ),
                        new THREE.Vector2( 1,y1 )
                    ]);
                     
                    geo.faceVertexUvs[0].push([
                        new THREE.Vector2( x1,y1 ),
                        new THREE.Vector2( x1,y2 ),
                        new THREE.Vector2( 1,y2 )
                    ]);
                   
                // Back Sidewall    
                } else if( j === 0 ) {
                
                    geo.faceVertexUvs[0].push([
                        new THREE.Vector2( 0,y1 ),
                        new THREE.Vector2( 0,y2 ),
                        new THREE.Vector2( sws,y1 )
                    ]);
                     
                    geo.faceVertexUvs[0].push([
                        new THREE.Vector2( 0,y2 ),
                        new THREE.Vector2( sws,y2 ),
                        new THREE.Vector2( sws,y1 )
                    ]);
                    x = 0;
                    o = 0;
                // Tire Thread
                } else {
                   
                    // Tire thread (middle polygon)
                    if( j === (bevelSegs+1)*2 ) {

                        s = bevelSegs * bseg*treadoffset + sws;
                        e = s + texThread*treadoffset;

                    // The bevel polygons
                    } else {
                        
                        // Once the second set of bevels is reached on the row, reset the x value and add an offset
                        if( j === 2 + (bevelSegs+1)*2 ) {
                            o = (texBevel + texThread)*treadoffset;
                            x = 0;
                        } 
                         
                        s = (x * bseg)*treadoffset + o + sws;
                        e = s + bseg*treadoffset;
                      
                  

                    }
 

                    geo.faceVertexUvs[0].push([
                        new THREE.Vector2( s,y1 ),
                        new THREE.Vector2( s,y2 ),
                        new THREE.Vector2( e,y1 )
                    ]);
                     
                    geo.faceVertexUvs[0].push([
                        new THREE.Vector2( s,y2 ),
                        new THREE.Vector2( e,y2 ),
                        new THREE.Vector2( e,y1 )
                    ]);

                    x++;

                }
                 
                 

            }
             
 
        }

        geo.uvsNeedUpdate = true;

    }

    _public.calculateTireMass = function( geo ) {

        return VDS.module.calculate.geometry3DArea( geo )/50;

    };

     

    return _public;

})( {} );