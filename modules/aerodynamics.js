var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.aerodynamics = (function( _p , resources ) {

    _p.instance = function( editor ) {

        this.editor = editor;

        this.simulations = [];
        this.workers = [];

    }

    _p.instance.prototype.update = function() {

        for( var i = 0 ; i < this.workers.length; i++ ) {
            this.workers[i].updateWorker();
        }
 
    }
   
    /**
     * Create a set of raycasters which will be used to calculate aerodynamic properties of a list of 3D models.
     * This is a rough approximation which calculates a Frontal Area and a Coefficient of Drag.
     * 
     * For the simulation to be precise, lower values for rayGapX and rayGapY should be used. Default is 10 to avoid excessive performance drops.
     * Ideally both variables should be set to 1, however this would increase computational time exponentially.
     * 
     * NOTE: Make sure that the rectangle area of the ray simulation encompasses the entire vehicle. 
     * Otherwise certain components which fall outside the rectangle will be ignored. 
     * 
     * @param {*} width 
     * @param {*} height 
     * @param {*} position 
     * @param {*} direction 
     * @param {*} targets An array of THREE.js Objects in the scene which will be checked for intersections.
     */
    _p.instance.prototype.raySimulation = function( width , height , position , direction , targets , rayLength , rayGapX , rayGapY ) {

        var t1 = performance.now();

        var casters = [];
        var helpers = [];
        var results = [];
        var airlines = [];

        var x = 0;
        var y = 0;
        var rayPos3, rayDir3, rayLen, raycaster, helper;

        rayLen = rayLength == undefined || rayLength < 10 ? 10 : rayLength;
 
        var rayArea = width*height;
        var numRaysHit = 0;

        rayGapX = rayGapX == undefined || rayGapX < 0.1 ? 10 : rayGapX;
        rayGapY = rayGapY == undefined || rayGapY < 0.1 ? 10 : rayGapY;
 
        for( var r = 0 ; r <= height ; r+=rayGapY ) {
 
            for( var c = 0 ; c <= width ; c+=rayGapX ) {
                 
                rayPos3 = new THREE.Vector3().set( position.x , position.y + r , position.z + c - width/2 );
                rayDir3 = new THREE.Vector3( rayPos3.x + rayLen*direction.x , rayPos3.y + rayLen*direction.y  , rayPos3.z + rayLen*direction.z ).sub(rayPos3).normalize();

                if( c == 0 ) { 
                    casters[x] = []; 
                    results[x] = [];
                    airlines[x] = [];
                }

                raycaster = new THREE.Raycaster(
                    rayPos3,
                    rayDir3
                );
 
                results[x].push(null); // Will be updated by the worker method
                airlines[x].push(null);

                //helper  = new THREE.ArrowHelper( rayDir3, rayPos3, rayLen, "#66FF00" , 5 , 1 );
                //helpers.push(helper);

                casters[x].push(raycaster);
                 
                y++;

                 

            }   
            
            if( r < height ) {
                casters.push([]);
                results.push([]);
                airlines.push([]);
                x++;
            }
            y = 0;

        }

        var rPerRow = casters[0].length;
        var rPerCol = casters.length;
        
        var airflow = new _p.airflow( this.editor , {
            targets: targets,
            rayLen: 4,
            rayPerpLen: 5,
            xMax: rayLen,
            yMax: 300,
            zMax: 300,
            rayMaxSteps: 10000,
            renderArrows: false,
            renderCurves: true
        });

        var res = {

            // Airflow simulation (for drag coefficient mainly)
            airflow: airflow,
            airlines: airlines, // a 2D array for the airflow ray results (hitpoints)

            position: position,
            direction: direction,
            rayLen: rayLen,
            rayGapX: rayGapX,
            rayGapY: rayGapY,
            raysPerRow: rPerRow,
            raysPerColumn: rPerCol,
            rayArea: rayArea,
            raycasters: casters,
            //helpers: helpers,
            targets: targets,
            // results: results, // This is old now
            // numRaysHit: numRaysHit,
            results: results, // Worker based
            numRaysHit: 0, // Worker based
             
            numRaysTotal: rPerRow*rPerCol,
            boundaries: null,
            frontalArea: 0,
            dragCoefficient: 0

        };

    

        var t2 = performance.now();
        var td = t2 - t1;

        res.debug = {
            setupTime: td
        };

        this.simulations.push(res); // Save this simulation
 

        return res;

    }

    var legalWorkerEvents = ["onStart","onBatchDone","onFinish"];

    _p.raySimulationWorker = function( editor , sim , batch , events ) {

        this.editor = editor;
        this.sim = sim;
        this.batch = THREE.Math.clamp( batch , 1 , this.sim.numRaysTotal );
        
        this.setupEvents( events );
        this.startWorker();
        
        //this.editor.aerodynamics.workers.push(this);
        this.editor.aerodynamics.workers[0]=this;
 
    }

    _p.raySimulationWorker.prototype.setupEvents = function( events ) {

        this.events = {};
        
        if( typeof events !== 'object' ) { return false; }

        for( var e in events ) {
            if( legalWorkerEvents.indexOf(e) < 0 || typeof events[e] !== 'function' ) { continue; }
            this.events[ e ] = events[e];
        }

    }

    _p.raySimulationWorker.prototype.startWorker = function() {

        this.done = false;
        this.ready = true;
        this.row = 0;
        this.column = 0;
        this.totalDone = 0;
        this.totalTime = 0;

        this.sim.airflow.removeCurveLines();
        this.sim.airflow.removeArrows();

        if( this.events[ legalWorkerEvents[0] ] !== undefined && typeof this.events[ legalWorkerEvents[0] ] == 'function' ) {
            this.events[ legalWorkerEvents[0] ]( editor , this );
        }

    }

    _p.raySimulationWorker.prototype.updateWorker = function() {
        
        if( this.ready == false ) { return; }

        if( this.done == true && this.ready == true ) {

            this.editor.aerodynamics.calculateFrontalArea( this.sim );
            this.editor.aerodynamics.calculateBoundingPoints( this.sim );
            this.editor.aerodynamics.calculateGroundClearance( this.sim );
            this.editor.aerodynamics.calculateDragCoefficient( this.sim );

            this.sim.airflow.addArrows();
             

            this.sim.debug.simTime = this.totalTime;

            if( this.events[ legalWorkerEvents[2] ] !== undefined && typeof this.events[ legalWorkerEvents[2] ] == 'function' ) {
                this.events[ legalWorkerEvents[2] ]( editor , this );
            }
            
            this.ready = false;
            return;

        }

         
        if( this.done == false && this.ready == true ) {

            var t1 = performance.now();

            var rowsPerBatch = Math.ceil( this.batch / this.sim.raysPerRow  );
            
            var maxID = this.sim.numRaysTotal;
            var rows = this.sim.raysPerColumn;
            var cols = this.sim.raysPerRow;

            var id = this.totalDone;
            var row = 0;
            var col = 0;
            var hits;
            var caster;

            var dc = 0;

            for( var i = 0 ; i < this.batch ; i++ ) {

                this.totalDone++;
                id = this.totalDone - 1; // array indices start at 0
                // convert id to rows and columns in 2D array 
                row = Math.floor( id / rows );
                col = id - row * cols;

                caster = this.sim.raycasters[row][col];
                hits = caster.intersectObjects( this.sim.targets , false );
                if( hits.length ) {
                    this.sim.numRaysHit++;
                }
                this.sim.results[row][col] = hits;

                // Calculate airflow
                if( hits.length && row % 5 == 0 ) {
                    var rayPos3 = new THREE.Vector3().copy(caster.ray.origin);
                    var rayDir3 = new THREE.Vector3(1,0,0);
                    this.sim.airlines[row][col] =  this.sim.airflow.simulate( rayPos3 , rayDir3 );
                }

                if( id >= maxID-1 ) {
                    this.done = true;
                    break;
                }

            }
            var t2 = performance.now();
            this.totalTime += (t2-t1);

            if( this.events[ legalWorkerEvents[1] ] !== undefined && typeof this.events[ legalWorkerEvents[1] ] == 'function' ) {
                this.events[ legalWorkerEvents[1] ]( editor , this );
            }

        }

    }
 
    _p.instance.prototype.calculateFrontalArea = function( sim ) {
 
        var fArea = ( sim.numRaysHit / sim.numRaysTotal ) * sim.rayArea;

        sim.frontalArea = fArea;

        return fArea;

    }

    _p.instance.prototype.calculateDragCoefficient = function( sim ) {
        
       
        var simB = sim.boundaries;
        
        var airflow = sim.airflow;
        var lines = sim.airlines;

        var nr = 0;
        var nc = 0;
        var total = 0;
        var CdSum = 0;
        var dir;

        var allLines = new THREE.Vector3();
        for( var r = 0 ; r < lines.length ; r ++ ) {

            if( lines[r] == null ) {continue;}

            for( var c = 0 ; c < lines[r].length; c++ ) {

                if( lines[r][c] == null ) { continue; }

                // Calculate the average for this array
                var pts = lines[r][c];
                var npts = pts.length;
                var lineSum = new THREE.Vector3();
                for( var p = 0 ; p < npts-1; p++ ) {

                    dir = new THREE.Vector3().subVectors( pts[p+1] , pts[p] ).normalize(); 
                    dir.x = 1 - Math.abs(dir.x); // the slower the vector is moving on x-axis the worse the aerodynamics, therefore flip value 
                    dir.y = Math.abs(dir.y);
                    dir.z = Math.abs(dir.z);


                    lineSum.add(dir);

                }
                lineSum.divideScalar(npts);
                allLines.add( lineSum );

                nc++;
                total++;

            }

            nc = 0;
            nr++;

        }

        allLines.divideScalar( total );
        CdSum = allLines.x + allLines.y + allLines.z;

        console.log(allLines);
        console.log("Cd = "+CdSum);

        sim.dragCoefficient = CdSum;

        return CdSum;

    }

    _p.airflow = function( editor , cfg ) {

        this.editor = editor;
        // Targets for the simulation
        this.targets = cfg.targets;
        // The length of each ray segment. This is the interval for each step of the simulation process. The higher the interval, the less precise.
        this.rayLen = cfg.rayLen;
        // The length of the left and right perpendicular vectors
        this.rayPerpLen = cfg.rayPerpLen;
        // Max x and y value (y is just incase, to avoid infinite loops)
        this.xMax = cfg.xMax;
        this.yMax = cfg.yMax;
        // Hardcoded limit
        this.rayMaxSteps = cfg.rayMaxSteps;
        // Render ray segment arrows
        this.renderArrows = cfg.renderArrows;
        // Render spline constructed from hitpoints
        this.renderCurves = cfg.renderCurves;
        // Arrow helpers for debugging purposes
        this.arrows = [];

    }

    _p.airflow.prototype.removeArrows = function() {

        var editor = this.editor;
        var ar = this.arrows;

        for(var i=0; i< ar.length; i++) {
            editor.scene.remove(ar[i]);
        }
        ar.length = 0;

    }

    _p.airflow.prototype.addArrows = function() {

        var editor = this.editor;
        var ar = this.arrows;

        for(var i=0; i< ar.length; i++) {
            editor.scene.add(ar[i]);
        }

    }

    _p.airflow.prototype.simulate = function( originVec3 , directionVec3 ) {

        var editor = this.editor;
        var targets = this.targets;

        // The array of points of contact (or simply directional) for this raycaster
        var hitPoints = [];
        // Starting point of the raycaster ; The initial starting point will be set depending on the position of the ray in the grid
        var origin = originVec3 == undefined ? new THREE.Vector3( -100 , 0  , 0 ) : originVec3;
        // The starting direction vector
        var direction = directionVec3 == undefined ? new THREE.Vector3( 1 , 0 , 0 ) : directionVec3;
        // The actualy raycaster
        var rayCaster = new THREE.Raycaster( origin , direction , 0 , this.rayLen );
        // Switch to tell us if the ray is done
        var rayDone = false;

        var deviating = false;
        var dVal = 0.05;
        var stepsX = 0;
        
        var firstContact = false;
        var raySteps = 0;

        var devY, devZ;
        var devLock = true;

        // Start simulation
        while( rayDone == false ) {

            raySteps++;
            
            // If the ray has reached it's maximum distance, stop the simulation
            if( rayCaster.ray.origin.x < -this.xMax || rayCaster.ray.origin.x > this.xMax || Math.abs(rayCaster.ray.origin.y) > this.yMax || raySteps > this.rayMaxSteps ) {
                rayDone = true;
                break;
            }
            
            var rayDir = rayCaster.ray.direction;
            var rayPos = rayCaster.ray.origin;

            if( rayDir.x <= 0 ) { rayDone = true; break; }

            if( firstContact == true && deviating == true ) {

                stepsX++;

                rayDir.y -= dVal * devY; // go in the opposite direction of travel
                rayDir.y = THREE.Math.clamp( rayDir.y , -1 , 1 ); // don't allow anything past 90 degrees

                rayDir.z -= dVal * devZ; // go in the opposite direction of travel
                rayDir.z = THREE.Math.clamp( rayDir.z , -1 , 1 ); // don't allow anything past 90 degrees
                
                if( 
                    (devY == 1 && rayPos.y <= origin.y) ||
                    (devY == -1 && rayPos.y >= origin.y )
                ) {
                
                    rayPos.y = origin.y;
                    rayDir.y = 0;
                    devY = 0;
                }

                if( 
                    (devZ == 1 && rayPos.z <= origin.z) ||
                    (devZ == -1 && rayPos.z >= origin.z )
                ) {
                  
                    rayPos.z = origin.z;
                    rayDir.z = 0;
                    devZ = 0;
                }

                if( rayPos.y == origin.y && rayPos.z == origin.z ) {
                    deviating = false;
                }
                
            
            } else {
                stepsX = 0;
            }
            
            if( firstContact == true ) {

                
                //var perpDirR = new THREE.Vector3( rayDir.x - Math.cos(Math.PI/2) ,  rayDir.y - Math.sin(Math.PI/2) , 0 );
                var perpDirR = new THREE.Vector3().copy( rayDir ).applyEuler( new THREE.Euler( 0 , 0 , -Math.PI/2 ) ).normalize();
                var perpDirL = new THREE.Vector3().copy( rayDir ).applyEuler( new THREE.Euler( 0 , 0 , Math.PI/2 ) ).normalize();
                //var perpDirL = new THREE.Vector3( rayDir.x + Math.cos(Math.PI/2) ,  rayDir.y + Math.sin(Math.PI/2) , 0 );
                

                var rayPerpL = new THREE.Raycaster( rayPos.clone() , perpDirL , 0 , this.rayPerpLen );
                var rayPerpR = new THREE.Raycaster( rayPos.clone() , perpDirR , 0 , this.rayPerpLen );
                
                /*
                var phL  = new THREE.ArrowHelper( perpDirL, rayPerpL.ray.origin, rayPerpLen, "#00FFFF" , 1.5 , 0.5 );
                var phR  = new THREE.ArrowHelper( perpDirR, rayPerpR.ray.origin, rayPerpLen , "#00FFFF" , 1.5 , 0.5 );
                editor.scene.add(phL);
                editor.scene.add(phR);
                */

                var perpHitsL = rayPerpL.intersectObjects( targets , false );
                var perpHitsR = rayPerpR.intersectObjects( targets , false );

                if( (perpHitsL.length && Math.abs(rayDir.y) >= 0.0 ) || perpHitsR.length ) {

                    deviating = false;
                    
                    // Always give priority to the left perpendicular vector
                    var phit;
                    if( !perpHitsL.length && perpHitsR.length ) {
                        phit = perpHitsR[0];
                    } else if( perpHitsL.length && !perpHitsR.length ) {
                        phit = perpHitsL[0];
                    } else {
                        phit = perpHitsL[0];
                    }
                    
                    var obj = phit.object;
                    var f3 = phit.face;
                    var normal = f3.normal.clone();
                  
                    var cdir = rayCaster.ray.direction.clone();
                    /*
                    var dot = cdir.clone().dot( normal );
                    var n2 = normal.multiplyScalar(dot);
                    var dir = new THREE.Vector3().copy(cdir).sub(n2).normalize();
                    */
                    dir = new THREE.Vector3().copy(cdir).projectOnPlane( normal ).normalize();
                    // Hack to make the airflow not touch the surface perfectly. This will avoid the curve going under/over the panel when it shouldn't
                    // If it does go under/over under the wrong conditions, it will cause airflow to pass through objects due to registering the wrong contact point (only 1st one)
                    var off = new THREE.Vector3().add(normal).multiplyScalar(1);

                    rayCaster.ray.origin = new THREE.Vector3().copy( phit.point ).add(off);
                    rayCaster.ray.direction = dir;

                    if( perpHitsR.length || perpHitsL.length ) {
                        //hitPoints.push(rayPos.clone());
                    }

                    devLock = false;

                } else {

                    deviating = true;
                    
                    // 1 for upward deviation, -1 for downward
                    if( devLock == false ) {
                        devY = 0;
                        devZ = 0;
                        if( rayPos.y > origin.y ) { devY = 1; } else if( rayPos.y < origin.y ) { devY = -1; }
                        if( rayPos.z > origin.z ) { devZ = 1; } else if( rayPos.z < origin.z ) { devZ = -1; }
                        devLock = true;
                    }

                }

            }

            if( this.renderArrows == true ) {
                var helper  = new THREE.ArrowHelper( rayDir, rayPos, this.rayLen, "#66FF00" , 1.5 , 0.5 );
                this.arrows.push(helper);
            }
            
            var hits = rayCaster.intersectObjects( targets , false );
            var nextOrigin; 
            // If any intersections were recorded, get the intersect point
            if( hits.length ) {
                
                var hit = hits[0];
                var obj = hit.object;
                var f3 = hit.face;
                var normal = f3.normal.clone();
                
                var cdir = rayCaster.ray.direction.clone();
                /*
                    var dot = cdir.clone().dot( normal );
                    var n2 = normal.multiplyScalar(dot);
                    var dir = new THREE.Vector3().copy(cdir).sub(n2).normalize();
                */
                dir = new THREE.Vector3().copy(cdir).projectOnPlane( normal ).normalize();

                nextOrigin = new THREE.Vector3().copy( hit.point );
                rayCaster.ray.direction = dir;

                //hitPoints.push( hit.point.clone() );
                
                firstContact = true; // Tell the simulation that this ray has made an initial contact 
                devLock = false;

            } 
            // Otherwise continue as expected 
            else {
                
                nextOrigin = new THREE.Vector3().copy(rayCaster.ray.origin);

                if( rayPos.y == origin.y && rayPos.x >= -50 && firstContact == false ) {
                    hitPoints.push( rayCaster.ray.origin.clone() );
                }
                
            }

            if( firstContact == true ) { 
                hitPoints.push(rayCaster.ray.origin.clone());
            }

            nextOrigin.add( new THREE.Vector3().copy(rayCaster.ray.direction).multiplyScalar( this.rayLen ) );
            // Increment raycaster position
            rayCaster.ray.origin = nextOrigin;


        }
        
        if( this.renderCurves ) {  
            var curve = new THREE.CatmullRomCurve3( hitPoints );
            curve.curveType = "catmullrom";
            curve.tension = 1;
            var lpts = curve.getPoints( 100 );
            var flowLine = this.createLineCurve( lpts , "#00FF00" );
            editor.scene.add( flowLine );
        }

        return hitPoints;

    }

    _p.airflow.prototype.createLineCurve = function( points , color ) {

        var g = new THREE.Geometry();
        g.vertices = points;

        var mesh = new THREE.Line( g , new THREE.LineBasicMaterial( {
            color: color,
            opacity: 1 
        } ) );
        mesh.name = "AirflowCurveLine";
        return mesh;

    }

    _p.airflow.prototype.removeCurveLines = function() {
        
        this.editor.removeObjectsByName("AirflowCurveLine");

    }

    _p.instance.prototype.renderRaySimulationHits = function( sim , pointGeo , pointMat ) {

        var groupName = "RaySimulationContactPointGroup";
        var pointName = "RaySimulationContactPoint";

        var found = this.editor.scene.getObjectByName( groupName );
        if( found !== undefined ) {
            this.editor.scene.remove(found);
        }

        var g = new THREE.Group();
        g.name = groupName;
        var mesh;
        for( var x = 0 ; x < sim.results.length ; x++ ) {
            
            for( var y = 0 ; y < sim.results[x].length; y++ ) { 

                if( sim.results[x][y].length <= 0 ) { continue; }

                for( var p = 0 ; p < sim.results[x][y].length; p++ ) {
                    mesh = new THREE.Mesh( pointGeo , pointMat );
                    mesh.name = pointName;
                    mesh.position.copy( sim.results[x][y][p].point );
                    g.add(mesh);
                }

            }

        }
        this.editor.scene.add(g);

        return g;

    }

    _p.instance.prototype.renderRaySimulationHelpers = function( sim , color ) {
        
        var groupName = "RaySimulationHelpersGroup";

        var found = this.editor.scene.getObjectByName( groupName );
        if( found !== undefined ) {
            this.editor.scene.remove(found);
        }

        var g = new THREE.Group();
        g.name = groupName;
        for( var i = 0 ; i < sim.helpers.length ; i++ ) {

            if( color !== undefined ) {
                sim.helpers[i].setColor( color );
            }
            g.add( sim.helpers[i] );

        }
        this.editor.scene.add(g);

        return g;

    }

    _p.instance.prototype.objectInArray = function( arr , property , value ) {

        for( var p = 0 ; p < arr.length; p++ ) {
            if( arr[p][property] == value ) {
                return true;
            }
        }

        return false;

    }

    /**
     * Take a column from the ray simulation and create a spline from all contact points
     * @param {*} sim 
     */
    _p.instance.prototype.createCurveFromColumn = function( sim , column ) {

        // First create a list of all contact points with their distances, etc.
        var contacts = [];

        for( var r = 0 ; r < sim.results.length; r++ ) {

            for( var c = 0 ; c < sim.results[r].length; c++ ) {
                
                if( c !== column ) { continue; }

                if( sim.results[r][c].length <= 0 ) { continue; }

                var raypts = [];
                for( var p = 0 ; p < sim.results[r][c].length; p++ ) {
                    // Make sure no duplicate contact points are added (for this specific raycaster)
                    // This is necessary so it doesn't cause a bias in the curve creation process 
                    // Sometimes a ray will pass directly over a vertex point responsible for 2 neighboring triangles and the raycaster will register both
                    // Only one is needed, so we have to avoid duplicates.
                    if( this.objectInArray( raypts , "distance" , sim.results[r][c][p].distance ) == true ) { 
                        continue;
                    }
                    raypts.push(sim.results[r][c][p]);

                    contacts.push(
                        sim.results[r][c][p]
                    )

                }
 

            }

        }
 

        // Then re-arrange elements in the array from the nearest to the furthest distance from the ray simulation start

        // Finally create a spline from the list of contact points

    }

    /**
     * Find the ground clearance of the vehicle (averaged).
     * This is going to determine downforce/lift
     * 
     * @param {*} sim 
     */
    _p.instance.prototype.calculateGroundClearance = function( sim ) {

        var rowHit = -1;
        for( var r = 0 ; r < sim.results.length; r++ ) {

            for( var c = 0 ; c < sim.results[r].length; c++ ) {

                if( sim.results[r][c].length > 0 ) { 
                    rowHit = r;
                    break;
                }

            }

            if( rowHit >= 0 ) { break; }

        }
        // From lowest point of simulation tunnel. If the tunnel does not encompass the entire vehicle, then the ground clearance is not correct
        sim.groundClearance = rowHit * sim.rayGapY;

    }

    /**
     * Find the furthest contact points on all 3 axes based on a ray simulation.
     * This is used by the coefficient of drag approximations.
     * 
     * @param {*} sim 
     */
    _p.instance.prototype.calculateBoundingPoints = function( sim ) {

        // Hardcoded boundary to compare against initially. In practice no design will have a component placed anywhere near this point on any axis.
        var ucase = 10000000;

        var b = {
            x: {min: ucase , max: -ucase , minRef: null, maxRef: null },
            y: {min: ucase , max: -ucase , minRef: null, maxRef: null },
            z: {min: ucase , max: -ucase , minRef: null, maxRef: null }
        };

        var ref,vec3;
        for( var r = 0 ; r < sim.results.length; r++ ) {

            for( var c = 0 ; c < sim.results[r].length; c++ ) {

                if( sim.results[r][c].length <= 0 ) { continue; }

                for( var p = 0 ; p < sim.results[r][c].length; p++ ) {

                    ref = sim.results[r][c][p];
                    vec3 = ref.point;
 
                    if( vec3.x < b.x.min ) { b.x.min = vec3.x; b.x.minRef = ref; }
                    if( vec3.x > b.x.max ) { b.x.max = vec3.x; b.x.maxRef = ref; }
                    if( vec3.y < b.y.min ) { b.y.min = vec3.y; b.y.minRef = ref; }
                    if( vec3.y > b.y.max ) { b.y.max = vec3.y; b.y.maxRef = ref; }
                    if( vec3.z < b.z.min ) { b.z.min = vec3.z; b.z.minRef = ref; }
                    if( vec3.z > b.z.max ) { b.z.max = vec3.z; b.z.maxRef = ref; }

                }

            }

        }

        sim.boundaries = b;
        return b;

    }

    _p.instance.prototype.calculateColumnBounds = function( sim , col ) {

        var ucase = 10000000;

        var b = {
            x: {min: ucase , max: -ucase , minRef: null, maxRef: null },
            y: {min: ucase , max: -ucase , minRef: null, maxRef: null },
            z: 0
        };

        var ref,vec3;
        for( var r = 0 ; r < sim.results.length; r++ ) {
 
            if( sim.results[r][col].length <= 0 ) { continue; }

            for( var p = 0 ; p < sim.results[r][col].length; p++ ) {

                ref = sim.results[r][col][p];
                vec3 = ref.point;

                if( vec3.x < b.x.min ) { b.x.min = vec3.x; b.x.minRef = ref; }
                if( vec3.x > b.x.max ) { b.x.max = vec3.x; b.x.maxRef = ref; }
                if( vec3.y < b.y.min ) { b.y.min = vec3.y; b.y.minRef = ref; }
                if( vec3.y > b.y.max ) { b.y.max = vec3.y; b.y.maxRef = ref; }
                b.z = vec3.z;

            }
 
        }

        return b;

    }


    return _p;

})({});