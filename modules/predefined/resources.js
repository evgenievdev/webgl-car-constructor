var VDS = VDS || {};
VDS.predefined = VDS.predefined || {};

VDS.predefined.resources = (function( _public ) {
 
    var components = {
          /*
        "engines" : {

            "generic_v8": {
                name: "Ford LS2 small-block V8", // A name for the engine 
                cylinders: 8, // Number of total cylinders ; For rotary engine type 0!\
                configuration: "V", // I (inline) , V , F (flat - boxer engine) , VR (V with small angle ~15deg [e.g. VW Golf MK3 VR6])
                displacement: 4.3, // Total engine displacement (default in liters)
                idle: 500, // Minimum operating RPM (Idle RPM)
                redline: 6000, // Redline (usually electronic limiter)
                maximum: 7000, // Maximum safe operating RPM ; Past this point damage to internal components is expected
                torqueCurve: [0,100,150,195,250,310,435,400,440,390,320,260], // A torque curve which will be distributed across the RPM band
                forcedInduction: false, // Set to true to use the induction properties. False if you want the engine to be naturally aspirated
                inductionType: "single-turbo", // single-turbo ; twin-turbo ; sequential-turbo ; single-supercharger ; twin-supercharger ; twincharger (a.k.a turbo+superchager)
                inductionCurve: [1 , 1.1 , 1.4 , 1.8 , 2.0 , 2.0 , 2.1 , 1.7 , 1.5], // A curve showing how the forced induction affects torque (again distributed across RPM band) ; NOTE! Values are used as multipliers => min: 1.0 ; max : keep under 5.0
                exhaustPorts: [], // This is used for future implementation of custom exhausts. This array contains the connecting point(s) for the exhaust pipe(s)
                mass: 450, // Total mass of engine 
                model: "models/engines/generic_v8.obj", // The 3D model for this engine. Has to be in .obj format
                offset: new THREE.Vector3(0,0,0), // Sometimes the 3d model is not centered correctly. Use this vector to set any adjustments needed
                rotation: new THREE.Vector3(0,0,0), // Sometimes the 3d model is facing the wrong way. Use this vector to set any adjustments needed (in radians)
                scale: new THREE.Vector3(2.5,2.5,2.5), // The initial scale for the mesh. Use 1,1,1 if you don't want any scaling
                bounds: [28,20,15], // Width, Height, Depth ; dimensions of engine
                transmissionMount: new THREE.Vector3(12,5,0) // The offset point from the pivot point of the engine where the transmission is mounted
            },

            "generic_i4": {
                name: "Generic Inline-4", // A name for the engine (not an ID!)
                cylinders: 4, // Number of total cylinders ; For rotary engine type 0!\
                configuration: "I", // I (inline) , V , F (flat - boxer engine) , VR (V with small angle ~15deg [e.g. VW Golf MK3 VR6])
                displacement: 2.0, // Total engine displacement (default in liters)
                idle: 800, // Minimum operating RPM (Idle RPM)
                redline: 8000, // Redline (usually electronic limiter)
                maximum: 8500, // Maximum safe operating RPM ; Past this point damage to internal components is expected
                torqueCurve: [0,100,150,195,200,210,235,300,340,190,120,60], // A torque curve which will be distributed across the RPM band
                forcedInduction: true, // Set to true to use the induction properties. False if you want the engine to be naturally aspirated
                inductionType: "single-turbo", // single-turbo ; twin-turbo ; sequential-turbo ; single-supercharger ; twin-supercharger ; twincharger (a.k.a turbo+superchager)
                inductionCurve: [1 , 1.1 , 1.4 , 1.8 , 2.0 , 2.0 , 2.1 , 1.7 , 1.5], // A curve showing how the forced induction affects torque (again distributed across RPM band) ; NOTE! Values are used as multipliers => min: 1.0 ; max : keep under 5.0
                exhaustPorts: [], // This is used for future implementation of custom exhausts. This array contains the connecting point(s) for the exhaust pipe(s)
                mass: 320, // Total mass of engine 
                model: "models/engines/generic_v8_2.obj", // The 3D model for this engine. Has to be in .obj format
                offset: new THREE.Vector3(0,10,0), // Sometimes the 3d model is not centered correctly. Use this vector to set any adjustments needed
                rotation: new THREE.Vector3(0,Math.PI/2,0), // Sometimes the 3d model is facing the wrong way. Use this vector to set any adjustments needed (in radians)
                scale: new THREE.Vector3(2.5,2.5,2.5), // The initial scale for the mesh. Use 1,1,1 if you don't want any scaling
                bounds: [28,20,18], // Width, Height, Depth ; dimensions of engine
                transmissionMount: new THREE.Vector3(12,-4,0) // The offset point from the pivot point of the engine where the transmission is mounted
            }

        },
        "transmissions" : {

            "generic_5spd": {
                name: "Generic 5-speed Manual",
                gears: [-4.3 , 4.1 , 2.57 , 1.86 , 1.0 , 0.87 ], // Gear ratios. First element is always the ratio for reverse!
                type: "manual",
                mass: 200,
                model: "models/transmissions/generic_5spd.obj", // The 3D model for this transmission. Has to be in .obj format
                offset: new THREE.Vector3(0,0,0), // Sometimes the 3d model is not centered correctly. Use this vector to set any adjustments needed
                rotation: new THREE.Vector3(0,0,0), // Sometimes the 3d model is facing the wrong way. Use this vector to set any adjustments needed (in radians)
                scale: new THREE.Vector3(0.85,0.85,0.85), // The initial scale for the mesh. Use 1,1,1 if you don't want any scaling
                bounds: [40,10,121]
            }

        }
        */    
   
    }

    _public.typeExists = function( type ) {

        if( components[type] !== null && typeof components[type] === 'object' ) {
            return true;
        }

        return false;

    }

    _public.addType = function( type ) {

        if( _public.typeExists(type) ) {return false;}

        components[type] = {};
        return true;

    }

    _public.addComponent = function( type , id , properties ) {

        if( _public.componentExists(type,id) ) {return false;}

        components[type][id] = JSON.parse(JSON.stringify(properties));
        return true;

    }

    _public.componentExists = function( type , id ) {

        if( !_public.typeExists(type) ) {return false;}

        if( components[type][id] == undefined ) {
            return false;
        }

        return true;

    }

    _public.getComponent = function( type , id ) {

        if( !_public.componentExists(type,id) ) { return false; }

        return JSON.parse( JSON.stringify( components[type][id] ) );

    }

    _public.getComponents = function( type ) {

        var res = {};
        if( !_public.typeExists(type) ) {return res;}
        for( var e in components[type] ) {

            res[ e ] = _public.getComponent( type , e );

        }
        
        return res;
    }

    _public.countComponents = function() {

        var n = 0;
        for( var c in components) {
            for( var o in components[c] ) {
                n++;
            }
        }

        return n;

    }

    _public.preloadResources = function( repo , loader , events ) {

        var totalProgress = 0;
        var categoryProgress = 0;
        var categoriesLoaded = 0;

        // Count number of components in all categories
        var countTotal = _public.countComponents();
        var countCategory = 0;
        var numCategories = Object.keys( components ).length;
        // Get the time it took to load each component, category, etc
        var sT = performance.now();
        var tD = 0;
        var totalTime = 0;
        var ev1 = 0;
        let cat, o;
        // IMPORTANT! USE "let" instead of "var" to avoid async callback problem with loops. ES6 required!!!
        for( let type in components ) { 
 
            cat = components[type];
            countCategory = Object.keys( cat ).length;
            // Make sure the repository has the necessary structure
            if( repo[type] == undefined ) {
                repo[type] = {};
            }

            if( ev1 == 0 ) {
                if( events.onLoadStart !== undefined && typeof events.onLoadStart == 'function' ) {
                    events.onLoadStart({ 
                        numCategories: numCategories,
                        numComponents: countTotal
                    });
                }
                ev1++;
            }
             

            for( let id in cat ) { 

                o = cat[id];
                // If there is no model to load, skip this and decrease counters
                if( o.model == undefined ) {
                    countCategory--;
                    countTotal--;
                    continue;
                }

                // Start loading process (asynchronous)
                loader.load(
                    // resource URL
                    o.model,
                    // called when resource is loaded
                    function ( object ) {
                        
                        object.material = VDS.materials.default;
                        object.castShadow = true;

                        object = VDS.module.calculate.groupToMesh(object,VDS.materials.default);
                         
                        object.rotation.set(this.rotation.x , this.rotation.y,this.rotation.z);
                        object.scale.set(this.scale.x,this.scale.y,this.scale.z);
                        object.position.set(this.offset.x,this.offset.y,this.offset.z);
                        object.matrixWorldNeedsUpdate = true;
                        object.geometry.mergeVertices();
                        object.geometry.computeBoundingBox(); 
                        repo[ type ][ id ] = object;
 
                        // ---------------------------------------- EVENTS -----------------------------------------

                            tD = performance.now() - sT - totalTime;
                            totalTime += tD;

                            totalProgress++;
                            categoryProgress++;

                            // For each element loaded.
                            if( events.onEachLoaded !== undefined && typeof events.onEachLoaded == 'function' ) {
                                events.onEachLoaded({ 
                                    id: id, 
                                    object: object,
                                    type: type,
                                    categoryProgress: categoryProgress,
                                    categoryComponents: countCategory,
                                    totalProgress: totalProgress,
                                    numComponents: countTotal,
                                    loadTime: tD
                                });
                            }
                            if( categoryProgress >= countCategory ) {

                                categoryProgress = 0;
                                categoriesLoaded++;

                                if( events.onCategoryLoaded !== undefined && typeof events.onCategoryLoaded == 'function' ) {
                                    events.onCategoryLoaded({
                                        name: type,
                                        categoriesLoaded: categoriesLoaded,
                                        numCategories: numCategories,
                                        numComponents: countTotal,
                                        totalProgress: totalProgress
                                    });
                                }
                            }

                            if( totalProgress >= countTotal ) {

                                if( events.onAllLoaded !== undefined && typeof events.onAllLoaded == 'function' ) {
                                    events.onAllLoaded({
                                        numCategories: numCategories,
                                        numComponents: countTotal,
                                        totalTime: totalTime
                                    });
                                }

                            }
                        // ------------------------------------------------------------------------------------------
                        
                    }.bind(o),
                    // called when loading is in progresses
                    function ( xhr ) {  

                    },
                    // called when loading has errors
                    function ( error ) {

                        if( events.onError !== undefined && typeof events.onError == 'function' ) {
                            events.onError({
                                id: id, 
                                type: type,
                                categoryProgress: categoryProgress,
                                totalProgress: totalProgress,
                                numComponents: countTotal
                            });
                        }

                    }.bind(o)
                );

            }
            

        }

    }

 
    return _public;
    
})( {} );