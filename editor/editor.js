var VDS = VDS || {};

VDS.editor = (function( _p ){

    _p.instance = function( target , projectName ) {
 
        this.units = "imperial";
        
        this.projectName = projectName;

        this.container = $( target );
        this.editorWidth = 0;
        this.editorHeight = 0;
        this.calculateEditorDims();
 
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.lights = {};
        this.grid = null;
        this.materials = {};
        this.maxAnisotropy = 0;

        this.composer = null;
        this.effectFXAA = null;
        this.outlinePass = null;

        this.loading = this.container.find("#loading").dimmer({closable:false});
        this.reload = this.loading.find("#reload");
        this.reload.click(function(){
            this.preloadResources();
        }.bind(this));
 
        // Ability to pause/resume editor
        this.paused = false;
        this.setupPause();

        this.createScene();
        this.createLights();
        this.createGrid( 10 , 50 , "#666" , "#222" );

        // Loaders - Models, Textures, etc
        /* ---------------------------------------------------------------------------------- */
            this.loaders = {
                obj: new THREE.OBJLoader(),
                font: new THREE.FontLoader()
            };
        /* ---------------------------------------------------------------------------------- */
 
        // Fonts
        /* ---------------------------------------------------------------------------------- */
            this.fonts = {};
            this.loadFont( "fonts/helvetiker_regular.typeface.json" , "helvetiker" );
        /* ---------------------------------------------------------------------------------- */
         
        // Parts - Tires, Rims 
        /* ---------------------------------------------------------------------------------- */
            this.parts = {
                tires: {},
                rims: {},
                engines: {},
                transmissions: {}
            };

            this.selected = {
                tire: null,
                rim: null
            };

            this.current = null;
        /* ---------------------------------------------------------------------------------- */

        // Preload Models - Engines, Transmissions
        /* ---------------------------------------------------------------------------------- */
            this.preloadResources();
        /* ---------------------------------------------------------------------------------- */

        // Edit mode - which component is being edited (master switch)
        /* ---------------------------------------------------------------------------------- */
            this.editMode = "free"; // default mode is free edit.
        /* ---------------------------------------------------------------------------------- */

        // Transform Widget
        /* ---------------------------------------------------------------------------------- */
            this.transform = new THREE.TransformControls( this.camera, this.renderer.domElement );
            this.transforming = false;
            this.currentComponent = null;
            this.transformEvents = {};
            this.setupTransform();
        /* ---------------------------------------------------------------------------------- */

        // Materials library
        /* ---------------------------------------------------------------------------------- */
            this.materials = new VDS.module.materials.instance( this , { maxMaterials: 24 } );
        /* ---------------------------------------------------------------------------------- */  

        // Chassis - Axles and Frame
        /* ---------------------------------------------------------------------------------- */
            this.chassis = new VDS.module.chassis.instance( this );
            this.createDefaultAxles();
            this.createDefaultFrame();
            // Used by the editor for selection purposes (-1 is default => no axle is selected)
            this.activeAxle = -1;
            /*
            this.chassis.setAxleMaterials(
                VDS.materials.highlight,
                VDS.materials.active,
                VDS.materials.chrome,
                VDS.materials.default
            );
            */ 
 
        /* ---------------------------------------------------------------------------------- */

        // Drivetrain - Engine, Transmission
        /* ---------------------------------------------------------------------------------- */
            this.drivetrain = new VDS.module.drivetrain.instance( this );
        /* ---------------------------------------------------------------------------------- */
        
        // Body - Panels, Windshields
        /* ---------------------------------------------------------------------------------- */
            this.body = new VDS.module.body.instance( this );

            this.body.addGroup("hood");
            this.body.addGroup("roof");
            this.body.addGroup("windshields");
            this.body.addGroup("doors");
            this.body.addGroup("bumpers");
            this.body.addGroup("quarter-panels");
        /* ---------------------------------------------------------------------------------- */

        // Cage - Rollbars, Scaffolding for body
        /* ---------------------------------------------------------------------------------- */
            this.cage = new VDS.module.cage.instance( this );
        /* ---------------------------------------------------------------------------------- */
        
        // Weight Distribution - Center of Gravity ; Axle Loads
        /* ---------------------------------------------------------------------------------- */
            this.COG = {
                point: new THREE.Vector3(),
                mass: 0,
                mesh: new THREE.Mesh( new THREE.SphereGeometry(5,20,20) , VDS.materials.COG ),
                axleLoad: []
            };
            this.COG.mesh.name = "COG_Helper"; // Use: this.scene.getObjectByName('object_name');
            this.scene.add(this.COG.mesh);
            this.COG.mesh.visible = false;

             
        /* ---------------------------------------------------------------------------------- */

        // Aerodynamics - Frontal Area, Drag Coefficient, Downforce
        /* ---------------------------------------------------------------------------------- */
            this.aerodynamics = new VDS.module.aerodynamics.instance( this );
            this.aeroSim = null;
        /* ---------------------------------------------------------------------------------- */

         
            
        // Scene statistics.
        /* ---------------------------------------------------------------------------------- */
            this.stats = this.container.find("#scene-stats");
            this.showStats = true;
        /* ---------------------------------------------------------------------------------- */

        // Start the editor's update loop
        /* ---------------------------------------------------------------------------------- */
            this.update();
        /* ---------------------------------------------------------------------------------- */

        // GUI - Menus, Buttons, Events
        /* ---------------------------------------------------------------------------------- */
            this.gui = new VDS.gui.instance( this );
        /* ---------------------------------------------------------------------------------- */

        // 2D Drawing canvas - Body 
        /* ---------------------------------------------------------------------------------- */
            this.panelCanvas = new VDS.module.canvas.instance( this.container.find("#edit-body") , this );
            this.panelCanvas.events.build = this.buildPanelFromCanvas.bind(this);
        /* ---------------------------------------------------------------------------------- */

        // 2D Drawing canvas - Body 
        /* ---------------------------------------------------------------------------------- */
            this.rimCanvas = new VDS.module.canvas.instance( this.container.find("#edit-rims") , this );
            this.rimCanvas.setMode("polygons");
            var outerPts = this.rimCanvas.shapes.ellipse(60,300,300,300,300);
            var innerPts = this.rimCanvas.shapes.ellipse(40,50,50,300,300);
            this.rimCanvas.addBoundary( "outerBoundary" , outerPts , 0 );
            this.rimCanvas.addBoundary( "innerBoundary" , innerPts , 1 );
            this.rimCanvas.events.build = this.buildRimFromCanvas.bind(this);
        /* ---------------------------------------------------------------------------------- */

        // Color Picker
        /* ---------------------------------------------------------------------------------- */
            this.colorpicker = new VDS.module.colorpicker.instance( this.container.find("#color-wheel") , this );
            this.cpOverlay = this.container.find("#color-picker").dimmer({closable:false});
            this.cpClose = this.cpOverlay.find("#close");
            this.cpClose.click(function(){
                this.cpOverlay.dimmer("hide");
            }.bind(this));
             
        /* ---------------------------------------------------------------------------------- */    
        
        // Raycast Input
        /* ---------------------------------------------------------------------------------- */
            this.createDefaultMaterials();
            this.materialsRaycastInput();
            this.axleRaycastInput();
            this.frameRaycastInput();
            this.tireInstanceRaycastInput();
            this.drivetrainRaycastInput();
            this.panelsRaycastInput();
        /* ---------------------------------------------------------------------------------- */
         
         
    }

    // --------------------------------------------------------------- INSTANCE END ------------------------------------------------------------

    _p.instance.prototype.setupPause = function() {

        this.pauseOverlay = this.container.find("#pause-overlay").dimmer({closable:false});

        var resume = this.pauseOverlay.find("#resume");
        resume.click(function(){
            this.resume();
        }.bind(this));

    }

    _p.instance.prototype.pause = function() {

        this.paused = true;
        this.pauseOverlay.dimmer("show");

    }

    _p.instance.prototype.resume = function() {

        this.paused = false;
        this.pauseOverlay.dimmer("hide");

    }

    /**
     * Get an object reference in the scene by UUID
     * 
     * @param {*} uuid 
     */
    _p.instance.prototype.getObjectByUUID = function( uuid ) {
        var c = this.scene.children;
        for( var i = 0 ; i<c.length;i++) {
            if( c[i].uuid == uuid ) {
                return c[i];
            }
        }
        return null;

    }

    _p.instance.prototype.createDefaultAxles = function() {

        // Create some axles to start with (every vehicle must have at least 2 axles)
        this.chassis.addAxle({
            width: 65,
            suspensionHeight: 5,
            position: 10,
            steering: true,
            maxSteeringAngle: 30,
            driven: false,
            powerDistribution: 0,
        } , this ); // Axles have to be added within the editor module, otherwise there won't be acces to the editor instance

        this.chassis.addAxle({
            width: 70,
            suspensionHeight: 5,
            position: 110,
            steering: false,
            driven: true,
            powerDistribution: 1.0,
        } , this );
   

    }

    _p.instance.prototype.createDefaultFrame = function() {

        // Frame beams
        this.chassis.createLongitudinalMembers({
            shapePoints: 24,
            shape: VDS.module.shape.IBeam( 3 , 4.5 , 0.5 , 0.5 , 0.2 , 24 ), 
            controlPoints: 10,
            offsetY: 3,
            frameWidth: 40, 
            frameLength: 160,
            frontOverhang: 25, 
            rearOverhang: 25,
            nodeConstraints: {
                yMin: -5,
                yMax: 10,
                zMin: -10,
                zMax: 10
            }
        });

        this.chassis.createCrossMember({
            position: 0 
        });
        this.chassis.createCrossMember({
            position: 0.1 
        });
        this.chassis.createCrossMember({
            position: 0.25 
        });
        this.chassis.createCrossMember({
            position: 0.5 
        });
        this.chassis.createCrossMember({
            position: 0.8
        });
        this.chassis.createCrossMember({
            position: 1 
        });

        this.chassis.createUnderbody([ 
            {min:0.3,max:0.7,points:20},
            {min:0.0,max:0.2,points:20}
        ]);

    }

    _p.instance.prototype.createDefaultMaterials = function() {

        this.materials.newMaterial( "white" , {
            color: "white",
            envMapIntensity: 0.5,
            metalness: 0.3,
            roughness: 0.3
        });

        this.materials.newMaterial( "grey" , {
            color: "#444",
            envMapIntensity: 0.5,
            metalness: 0.3,
            roughness: 0.3
        });

        this.materials.newMaterial( "black" , {
            color: "#111",
            envMapIntensity: 0.5,
            metalness: 0.3,
            roughness: 0.3
        });

        this.materials.newMaterial( "red" , {
            color: "#d6000e",
            envMapIntensity: 0.5,
            metalness: 0.3,
            roughness: 0.1
        });

        this.materials.newMaterial( "green" , {
            color: "#0ad826",
            envMapIntensity: 0.5,
            metalness: 0.3,
            roughness: 0.1
        });

        this.materials.newMaterial( "blue" , {
            color: "#0045d1",
            envMapIntensity: 0.5,
            metalness: 0.3,
            roughness: 0.1
        });

        this.materials.newMaterial( "yellow" , {
            color: "#fcb000",
            envMapIntensity: 0.5,
            metalness: 0.3,
            roughness: 0.1
        });

        this.materials.newMaterial( "glass-50" , {
            color: "#444",
            envMapIntensity: 0.5,
            metalness: 0.3,
            roughness: 0.1,
            transparent: true,
            opacity: 0.5
        });

        this.materials.renderMaterialMeshes(
            new THREE.Vector3(0,0,-100),
            new THREE.Vector3(1,0,0),
            25,
            8
        );
 
    }

    _p.instance.prototype.preloadResources = function() {

        var txt = this.loading.find(".text");
        var progress = this.loading.find(".progress");
          
        VDS.predefined.resources.preloadResources( this.parts , this.loaders.obj , {
            
            onLoadStart: function( e ) {

                this.loading.dimmer("show");
                
                progress.progress({
                    total: e.numComponents,
                    value: 0
                });

                this.reload.hide();

            }.bind(this),

            onEachLoaded: function( e ) {
                
                if( !txt.hasClass("loader") ) {
                    //txt.addClass("loader");
                }
                this.loading.find(".text").html(
                    "Loading ... " + e.type.charAt(0).toUpperCase() + e.type.slice(1) + " : "+e.id + " " + e.categoryProgress + "/" + e.categoryComponents
                );

                progress.progress("set progress" , e.totalProgress );

            }.bind(this),

            onCategoryLoaded: function( e ) {

            }.bind(this),

            onAllLoaded: function( e ){

                setTimeout( function(){
                    this.loading.dimmer("hide");
                 
                }.bind(this) , 100 );
                 

                //this.drivetrain.setEngine("generic_v8_2" , this.parts.engines , 0.2 );
                 
            }.bind(this),

            onError: function( e ) {

                if( txt.hasClass("loader") ) {
                    txt.removeClass("loader");
                }

                this.loading.find(".text").html(
                 '<span style="color:#FFF;"><i class="ban icon big"></i> ' +
                  e.type.charAt(0).toUpperCase() + e.type.slice(1) + " : "+e.id +
                 ' couldn\'t be loaded!</span>'
                );

                 
                this.reload.show(); 
                  
            }.bind(this)
    
        });


    }

    _p.instance.prototype.loadFont = function( file , id ) {

        this.loaders.font.load( file , function ( font ) {

            this.fonts[ id ] = font;

        }.bind(this));

    }

    _p.instance.prototype.resetScene = function() {
        
        if( this.aeroSim !== null ) {
            this.aeroSim.airflow.removeArrows();
            this.aeroSim.airflow.removeCurveLines();
        }

        this.transform.detach();
        this.setHighlightedObjects( [] );

        this.materials.removeMaterials();
        this.body.removePanels();

    }

    _p.instance.prototype.getSceneStats = function() {

        var stats = {
            verts:0,
            tris:0,
            objects:0
        };

        var mesh;
        for( var i = 0 ; i < this.scene.children.length; i++ ) {

            mesh = this.scene.children[i];

            if( mesh.type !== "Mesh" ) { continue; }

            if( mesh.geometry == undefined ) { continue; }

            stats.verts += mesh.geometry.vertices.length;
            stats.tris += mesh.geometry.faces.length;
            stats.objects += 1;

        }

        return stats;

    }
    
     

    _p.instance.prototype.createAxleLoadHelpers = function() {

        var wheelbase = VDS.module.calculate.vehicleWheelbase( this.chassis.axles );

        var zO = 0;
        var zLen = 0;
        var yO = 3;
        var yLen = 40;

        var g = new THREE.Geometry();
        g.vertices.push(
            new THREE.Vector3( this.chassis.axles[0].position , yO , zO ),
            new THREE.Vector3( this.chassis.axles[0].position , yO+yLen , zO + zLen ),
            new THREE.Vector3( this.chassis.axles[1].position , yO+yLen , zO + zLen ),
            new THREE.Vector3( this.chassis.axles[1].position , yO , zO )
        );

        var m = VDS.module.helpers.lineMesh( g , VDS.materials.outline.blue );
        this.scene.add(m);
         
        for( var i = 0 ; i < this.chassis.axles.length; i++ ) {

            var spritey = VDS.module.helpers.makeTextSprite( this.COG.axleLoad[i].toFixed(0)+"lbs", 
            { fontsize: 18, fontface: "Georgia", borderColor: {r:0, g:0, b:255, a:1.0} } );

            spritey.position.set( this.chassis.axles[i].position , yO + yLen + 3 , 0 );
            this.scene.add( spritey );
  

        }
  
    }

    _p.instance.prototype.removeObjectsByName = function( name , limit ) {
        // This is a safety switch to avoid infinite loops. You can also use it to remove only a certain number of duplicates from a scene
        limit = THREE.Math.clamp( limit , 100 , 10000 );

        var o = 0;
        var iter = 0;
        while( o !== undefined ) { 
            
            if( iter > limit ) { break; }
            o = editor.scene.getObjectByName( name );
            editor.scene.remove(o);
            iter++;

        }
        // Return the number of objects removed
        return iter;

    }

    _p.instance.prototype.moveVehicle = function( x , y , z ) {

        var parts = this.compilePartsList({
            frame: true,
            axles: true,
            tires: true,
            rims: true,
            body: true,
            drivetrain: true 
        });
 

        var origPos = new Array( parts.length );
        for( var i = 0 ; i < parts.length; i++ ) {
            origPos[ i ] = new THREE.Vector3( parts[i].position );
            parts[i].position.y += y;
        }

    }

    _p.instance.prototype.calculateCOG = function( target ) {

        var list = this.compilePartsList({
            frame: true,
            drivetrain: true,
            body: true
        })

        var result = VDS.module.calculate.objectsCOG( list );

        this.COG.point = result.COG;
        this.COG.mass = result.totalMass;
        this.COG.axleLoad = VDS.module.calculate.axleLoad( this.chassis.axles , result.COG , result.totalMass );

        if( this.COG.mesh !== undefined ) {
            this.COG.mesh.position.copy(this.COG.point);
            this.COG.mesh.visible=true;
        }

        if( target !== undefined ) {
            target = this.COG;
        }


    }

    _p.instance.prototype.aerodynamicSimulation = function( cfg ) {

        cfg = cfg || {};

        var list = this.compilePartsList({
            frame: false,
            axles: false,
            tires: false,
            rims: false,
            body: true,
            drivetrain: false
        });
        

        var txt = this.loading.find(".text");
        var progress = this.loading.find(".progress");
        progress.progress("set progress" , 0 );

        var raySim = this.aerodynamics.raySimulation( 100,100, new THREE.Vector3(-150,0,0) , new THREE.Vector3(1,0,0) , list , 150 , 2 , 2 );            
        // Simulations with high accuracy tend to take a long time. As such, a worker is necessary to avoid interference with the GUI.
        var t1,t2;
        var worker = new VDS.module.aerodynamics.raySimulationWorker( this , raySim , 500 , {
            "onStart":function(editor,worker) {

                console.log("worker started!");

                editor.loading.dimmer("show");
        
                progress.progress({
                    total: worker.sim.numRaysTotal,
                    value: 0
                });
                editor.loading.find(".text").html(
                    "Calculating aerodynamics...this may take a while."
                );
                editor.reload.hide();

                t1 = performance.now();

            },
            "onBatchDone":function(editor,worker) {

                console.log("worker batch done!");
                
                progress.progress("set progress" , worker.totalDone );

            },
            "onFinish":function(editor,worker) {

                t2 = performance.now();
                 
                console.log("worker done!");
                console.log("total time: "+(t2-t1)+"ms");
                console.log(worker.sim);

                editor.aeroSim = worker.sim; // Store the simulation data 

                editor.loading.dimmer("hide");

                if( cfg.onFinish !== undefined && typeof cfg.onFinish == 'function') {
                    cfg.onFinish(editor,worker);
                }

            }
        });
    

        //this.aerodynamics.renderRaySimulationHits( raySim , new THREE.IcosahedronGeometry( 0.4 ) , VDS.materials.highlight );
        //this.aerodynamics.renderRaySimulationHelpers( raySim );
        var aeroBPG = VDS.module.helpers.boundBox( 100 , 100 , 300 , 0 , 0 , 0 );
        var aeroBPM = VDS.module.helpers.lineMesh( aeroBPG , VDS.materials.outline.blue );
        //aeroBPM.rotation.z = Math.PI/2;
        aeroBPM.position.set(0,100/2,0);
        this.scene.add(aeroBPM);

    }


    /**
     * Compile a list of object references to specified components of the design.
     * Used for exporting, aerodynamic calculations, etc.
     * 
     * @param {*} incl Object of properties with boolean values denoting if a certain component should be included or not.
     */
    _p.instance.prototype.compilePartsList = function( incl ) {

        var list = [];
        // Frame - Longitudinal and Cross members
        if( incl.frame == true ) {

            list.push(
                this.chassis.frame.longitudinal.meshL,
                this.chassis.frame.longitudinal.meshR
            );
            for( var i = 0 ; i < this.chassis.frame.cross.length ; i++ ) {
                list.push(this.chassis.frame.cross[i].mesh);
            }

        }
        // Axles (only, not the wheels)
        if( incl.axles == true ) {
            for( var i = 0 ; i < this.chassis.axles.length; i++ ) {
                list.push(
                    this.chassis.axles[i].axleMesh 
                );
            }
        }
        // Tires (only) for all axles
        var w;
        if( incl.tires == true ) {
            for( var i = 0 ; i < this.chassis.axles.length; i++ ) {
                w = this.chassis.axles[i].wheels;
                if( w.left.tireMesh == null || w.right.tireMesh == null ) {
                    continue;
                }
                list.push(
                    w.left.tireMesh,
                    w.right.tireMesh
                );
            }
        }
        // Rims (only) for all axles
        if( incl.rims == true ) {
            for( var i = 0 ; i < this.chassis.axles.length; i++ ) {
                w = this.chassis.axles[i].wheels;
                if( w.left.rimMesh == null || w.right.rimMesh == null ) {
                    continue;
                }
                list.push(
                    w.left.rimMesh,
                    w.right.rimMesh
                );
            }
        }
        // Brakes for all axles
        if( incl.brakes == true ) {

            for( var i = 0 ; i < this.chassis.axles.length; i++ ) {
                w = this.chassis.axles[i].wheels;
                if( w.left.brakeMesh == null || w.right.brakeMesh == null ) {
                    continue;
                }
                list.push(
                    w.left.brakeMesh,
                    w.right.brakeMesh
                );
            }

        }

        if( incl.drivetrain == true ) {
            if( this.drivetrain.engine !== null && this.drivetrain.engine.mesh !== null ) {
                list.push(this.drivetrain.engine.mesh);
            }
            if( this.drivetrain.transmission !== null && this.drivetrain.transmission.mesh !== null ) {
                list.push(this.drivetrain.transmission.mesh);
            }
        }

         
 
        if( incl.body == true ) {

            var group, panel;
            // Panel Groups
            for( var g in this.body.parts ) {
    
                group = this.body.parts[g];

                // Panels in group
                var pid = 0;
                for( var p in group.panels ) {
    
                    //panel = group.panels[p];
                    panel = this.body.panelGetRender( g , p , "last" );
                    if( panel.mesh !== null ) {
                        panel.mesh.name = "panel-"+g+"-"+pid;
                        list.push(panel.mesh);
                        pid++;
                    }

                }

            }

        }

        // New addition: 02.09.2018
        if( incl.cage == true ) {
            
            var b;
            // Cage bars
            for( var i in this.cage.bars ) {
                b = this.cage.bars[i];
                if( b.mesh !== undefined && b.mesh !== null ) {
                    list.push(b.mesh);
                }

            }

        }

        return list;

    }

    _p.instance.prototype.buildRimFromCanvas = function( canvas ) {
        
        var cuts = [];
        cuts.push(VDS.module.shape.circle(rdPoints,8,0,0));
        for( var i=0;i<canvas.polygons.length;i++){
            var pts = VDS.module.canvas.convertPointsToVectors(canvas.polygons[i].points,THREE.Vector2);
            VDS.module.shape.moveShape( pts , new THREE.Vector2(-300,-300) );
            var shape = VDS.module.shape.polygonShape(pts,0,0);
            cuts.push(shape);
        }

        // Rim design
        var rdRadius = 300;
        var rdPoints = 60;
        var rdg = VDS.module.body.buildRimDesign({
           
            radius: rdRadius,
            points: rdPoints,
            thickness: 1,
            cuts: cuts,
            boltRadius: 25,
            boltSize: 3,
            numBolts: 5,
            boltSegments: 12,
            bevel: {
                enabled:true,
                segments: 1,
                steps: 1,
                size:0.8,
                thickness:0.8,
                front:true,
                back:true
            },
            removeFront: false,
            removeBack: false,
            removeSidewall: false,
            removeContour: true
        });
         
        var check = this.scene.getObjectByName( "RimProcedural" );
        if( check !== undefined ) {
            this.scene.remove(check);
        }
        var rdm = new THREE.Mesh(rdg,VDS.materials.chrome);
        rdm.name = "RimProcedural";
        rdm.scale.set(0.1,-0.1,0.5);
        this.scene.add(rdm);

    }

    _p.instance.prototype.buildPanelFromCanvas = function( canvas ) {
                
        if( canvas.lines.length < 2 ) { return false; }
          
        var curves = [];
        var order = [];
        var cps;
        var l;
        for( var i = 0 ; i < canvas.lines.length; i++ ) {
            l = canvas.lines[i];
            cps = [];
            for( var p = 0 ; p < l.points.length; p++ ) {
                    
                var vec3 = new THREE.Vector3( l.points[p][0]/9 , (canvas.height - l.points[p][1])/9 , 0 );
                cps.push(
                    vec3
                );

            }
                
            curves.push( new THREE.CatmullRomCurve3( cps ) );
            order.push(i); // Subject to change later

        }

        var panel = new VDS.module.panel.instance( this , {
            curves: curves,
            order: order,
            numPoints: 40,
            stepsBetweenCurves: 10,
            offset: new THREE.Vector3(0,5,0) 
        });
 
        panel.mesh.castShadows = true;
     
        this.scene.add( panel.mesh );

        var group = "bumpers"; // Make this selectable
        // VDS properties object (used by raycasters to determine which is which)
        panel.mesh["vds"] = {
            group: group,
            id: panel.id
        };

        this.body.addPanel( panel.id , group , panel , true );

        panel.rotate(new THREE.Vector3(-Math.PI/2,0,0));

        //this.body.activeGroup = group;
        //this.body.activePanel = panel.id;

        //panel.renderPointHandles();
        //panel.constructTrim();
 
        var hList = panel.pointHandlesToList();
        this.gui.setClickableObjects( "panel-control-points" , hList );

    }

     

    // ----------------------------------------------------------------- RAYCAST INPUT --------------------------------------------------------------------------

    _p.instance.prototype.panelsRaycastInput = function() {

        this.gui.setClickableGroup( "panels" , []  , {

            onHit: function( ev ) {

                if( this.editMode !== "panels" ) { return; }
                if( transformTarget !== "panel" ) { return; } // hack to avoid clicking objects while editing points
                if( isSelecting == false ) { return; }

                if( this.transforming === true ) {
                    return;
                }
                
                this.currentComponent = "panel-points";
                this.resetTransformAxes();

                var obj = ev.hit[0].object;
                this.setHighlightedObjects( [obj] );
                this.transform.detach();

                this.body.activeGroup = obj["vds"].group;
                this.body.activePanel = obj["vds"].id;
                var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
                if( panel === false ) { 
                    this.body.activeGroup = null;
                    this.body.activePanel = null;
                    return; 
                }
                
                //panel.renderPointHandles();
                var hList = panel.pointHandlesToList();
                this.gui.setClickableObjects( "panel-control-points" , hList );

                this.container.find("#panel-mass").html("Mass: "+obj.mass.toFixed(0)+" LBS");
                
                var hit = ev.hit[0];
                var dir = hit.face.normal.clone().negate();

                var rnd = Math.random();
                if( rnd < 0.5 ) {
                    decalFactory.decalMaterial = VDS.materials.decal;
                } else {
                    decalFactory.decalMaterial = VDS.materials.decal2;
                }
 
                var size = 15 + Math.random()*10;
                decalFactory.projectOnMesh( 
                    hit.object, 
                    hit.point, 
                    dir, 
                    Math.PI, // angle 
                    new THREE.Vector3(size, size, size+5) 
                );

                /*
                var decID = THREE.Math.generateUUID();
                decals.newDecal("base", decID , {
                    position: hit.point,
                    orientation: dir,
                    target: hit.object,
                    size: new THREE.Vector3(15,15,15),
                    material: VDS.materials.decal
                });

                decals.drawDecal( "base" , decID , this.scene );
                */

            }.bind(this)

        } );

        this.gui.setClickableGroup( "panel-control-points" , []  , {

            onHit: function( ev ) {

                if( this.editMode !== "panels" ) { return; }
                 

                if( this.transforming === true ) {
                    return;
                }
                
                this.currentComponent = "panel-points";
                this.resetTransformAxes();

                var obj = ev.hit[0].object;
                this.setHighlightedObjects( [obj] );
                this.transform.detach();
                this.transform.attach( obj );

                var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
                if( panel === false ) { return; }

                // Get the curve index and the position on the curve for this point
                var p = panel.getPointHandleID( obj );
                console.log(p);
                if( p.curveID == null || p.pointID == null ) { return; }

                pointCurveID = p.curveID;
                pointID = p.pointID;

            }.bind(this)

        } );

    }

    _p.instance.prototype.materialsRaycastInput = function() {
        
        var createMat = this.container.find("#create-material");
        var matTools = this.container.find("#material-tools");
        var mtLabel = matTools.find("#label");
         
        var edit = matTools.find("#edit");
        var apply = matTools.find("#apply");
        var remove = matTools.find("#remove");
        var cancel = matTools.find("#cancel"); 

        var opacity = this.cpOverlay.find('#opacity');
        var metalness = this.cpOverlay.find('#metalness');
        var roughness = this.cpOverlay.find('#roughness');

        opacity.css("opacity",0.25);

        var transparent = this.cpOverlay.find('#toggle-transparent').checkbox({
            onChecked: function(){
                opacity.attr("disabled",false);
                opacity.css("opacity",1);
                var ref = this.materials.active; if( ref == null ) { return; }
                var mat = this.materials.getMaterial( ref );
                mat.transparent = true;
            }.bind(this),
            onUnchecked: function() {
                opacity.attr("disabled",true);
                opacity.css("opacity",0.25);
                var ref = this.materials.active; if( ref == null ) { return; }
                var mat = this.materials.getMaterial( ref );
                mat.transparent = false;
            }.bind(this)
        });

        opacity.on("change",function(){

            var ref = this.materials.active; if( ref == null ) { return; }
            var mat = this.materials.getMaterial( ref );
            mat.opacity = THREE.Math.clamp(opacity.val(),0.05,1);

        }.bind(this));

        metalness.on("change",function(){

            var ref = this.materials.active; if( ref == null ) { return; }
            var mat = this.materials.getMaterial( ref );
            mat.metalness = THREE.Math.clamp(metalness.val(),0,1);

        }.bind(this));

        roughness.on("change",function(){

            var ref = this.materials.active; if( ref == null ) { return; }
            var mat = this.materials.getMaterial( ref );
            mat.roughness = THREE.Math.clamp(roughness.val(),0,1);

        }.bind(this));
 

        // Hide the materials initially. They will be shown when the editmode is changed to panels.
        this.materials.hideMaterials();

        this.colorpicker.events["selectColor"] = function( picker , color , block ) {
 
            //console.log("color selected: "+color);
            //this.cpOverlay.dimmer("hide");

            var ref = this.materials.active;
            if( ref == null ) { return; }

            this.materials.setMaterialColor( ref , color );
            picker.setViewerColor( color , true , color.toUpperCase() );
            

        }.bind(this);

        edit.click(function(){

            if( this.materials.active == null ) { return; }
            this.cpOverlay.dimmer("show");
     

        }.bind(this));

        apply.click(function(){

            if( this.materials.active == null ) { return; }
            if( this.body.activeGroup == null || this.body.activePanel == null ) {
                return;
            }

            var inst = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            //inst.mesh.material = this.materials.getMaterial( this.materials.active );
            this.materials.applyMaterial( this.materials.active , inst.mesh );

        }.bind(this));

        cancel.click(function(){

            this.materials.active = null;
            matTools.hide();
     

        }.bind(this));

        remove.click(function(){

            if(this.materials.active ==  null) { return; }
            if( this.materials.countMaterials() <= 1 ) { return; }

            this.materials.removeMaterial( this.materials.active );
       
            matTools.hide();

            this.materials.renderMaterialMeshes(
                new THREE.Vector3(0,0,-100),
                new THREE.Vector3(1,0,0),
                25,
                8
            );
    
            var clickable = this.materials.buildClickables();
            this.gui.setClickableObjects("materials-clickable",clickable);

        }.bind(this));


         

        var clickable = this.materials.buildClickables();
        this.gui.setClickableGroup( "materials-clickable" , clickable , {

            onHit: function( ev ) {

                if( this.editMode !== "panels" ){ return; }

                if( this.transforming === true ) {
                    return;
                }

                this.currentComponent = "materials";
                
                this.hideGUITools();
                matTools.show();
                this.showGUITool("create-material");
                this.showGUITool("edit-panel");

                this.chassis.toggleFrameNodes(false); 

                var highlights = [ev.hit[0].object];

                var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
                if( panel !== false ) { 
                    highlights.push(panel.mesh);
                }

                this.setHighlightedObjects( highlights );
                this.transform.detach();

                var ref = ev.hit[0].object.matRef;
                this.materials.active = ref;
                mtLabel.html("MATERIAL: <b>"+ ref+"</b>");

                var mat = this.materials.getMaterial( ref );
                 
                // Apply the materials properties to the editor upon selection
                if( mat.transparent == true ) {
                    transparent.checkbox("check");
                } else {
                    transparent.checkbox("uncheck");
                }

                opacity.val(mat.opacity);
                metalness.val(mat.metalness);
                roughness.val(mat.roughness);

                var color = "#"+mat.color.getHexString();
                this.colorpicker.setViewerColor( color , true , color.toUpperCase() );

            }.bind(this)

        } );

    }

    _p.instance.prototype.tireInstanceRaycastInput = function() {
         
        var addTires = this.container.find("#axles-add-tires");
        addTires.hide();

        this.gui.setClickableGroup( "tire-instances" , [] , {

            onHit: function( ev ) {

                if( this.editMode !== "free" ) { return; }

                if( this.transforming === true ) {
                    return;
                }

                this.currentComponent = "tires";

                this.hideGUITools();
                addTires.show();
 

                var lon = this.chassis.frame.longitudinal;
                var lonMeshes = [ lon.meshL , lon.meshR ];
                var frameNodes = lon.pointHandles;

                this.gui.hideObjects( frameNodes );

                this.setHighlightedObjects( [ev.hit[0].object] );
                this.transform.detach();

                var tire = this.getPart( "tires" , ev.hit[0].object.VDS.uuid );
                this.selected.tire = tire;
                
                // 1. Show the GUI buttons for each axle
                // 2. 

            }.bind(this)

        } );

    }

    _p.instance.prototype.frameRaycastInput = function() {

        var lon = this.chassis.frame.longitudinal;
        var clickable = [ lon.meshL , lon.meshR ];

        var nodes = lon.pointHandles;

        this.transform.detach();
        this.gui.hideObjects( nodes );

     
        this.gui.setClickableGroup( "frame-longitudinal" , clickable , {

            onHit: function( ev ) {

                if( this.editMode !== "free" ) { return; }

                if( this.transforming === true ) {
                    return;
                }

                this.currentComponent = "frame";

                this.hideGUITools();
              
                this.setHighlightedObjects( clickable );
                this.transform.detach();
                this.gui.showObjects( nodes );

            }.bind(this)

        } );
 
        this.gui.setClickableGroup( "frame-longitudinal-nodes" , nodes , {

            onHit: function( ev ) {

                if( this.editMode !== "free" ) { return; }

                if( this.transforming === true ) {
                    return;
                }

                this.currentComponent = "frame-longitudinal";
                this.setTransformAxes( false , true , true );

                this.hideGUITools();
                 

                this.setHighlightedObjects( [ev.hit[0].object] );

                this.transform.attach( ev.hit[0].object );
    
            }.bind(this)

        } );

    }
 
    _p.instance.prototype.axleRaycastInput = function() {

        var edit = this.container.find("#edit-axles");
        var mforward = this.container.find("#axle-move-forward");
        var mback = this.container.find("#axle-move-back");
        var linc = this.container.find("#axle-length-increase");
        var ldec = this.container.find("#axle-length-decrease");
        var sraise = this.container.find("#suspension-raise");
        var slower = this.container.find("#suspension-lower");
        var driven = this.container.find("#set-driven");
        
        function noActive() {
            if( this.activeAxle < 0 || this.activeAxle >= this.chassis.axles.length ) {
                return true;
            }
            return false;
        }

        driven.click(function(){
            
            if( noActive.bind(this)() ) {return;}
            this.chassis.setDrivenAxle( this.activeAxle , true );
 
        }.bind(this));

        mforward.click(function(){
            
            if( noActive.bind(this)() ) {return;}
            this.chassis.moveAxle( this.activeAxle , this.chassis.axles[ this.activeAxle ].position -1 );
 
        }.bind(this));
        mback.click(function(){
            
            if( noActive.bind(this)() ) {return;}
            this.chassis.moveAxle( this.activeAxle , this.chassis.axles[ this.activeAxle ].position +1 );
 
        }.bind(this));
        linc.click(function(){
            
            if( noActive.bind(this)() ) {return;}
            this.chassis.scaleAxle( this.activeAxle , this.chassis.axles[ this.activeAxle ].width +1 , this );
 
        }.bind(this));
        ldec.click(function(){
            
            if( noActive.bind(this)() ) {return;}
            this.chassis.scaleAxle( this.activeAxle , this.chassis.axles[ this.activeAxle ].width -1 , this );
 
        }.bind(this));

        sraise.click(function(){
            
            if( noActive.bind(this)() ) {return;}
            this.chassis.setAxleSuspensionHeight( this.activeAxle , this.chassis.axles[ this.activeAxle ].suspensionHeight-1 , this );
 
        }.bind(this));
        slower.click(function(){
            
            if( noActive.bind(this)() ) {return;}
            this.chassis.setAxleSuspensionHeight( this.activeAxle , this.chassis.axles[ this.activeAxle ].suspensionHeight+1 , this );
 
        }.bind(this));


        this.gui.setClickableGroup( "axles" , this.compileClickableObjects( "axles" ) , {
            onHit: function( ev ) {

                if( this.editMode !== "free" ) { return; }

                if( this.transforming === true ) {
                    return;
                }

                this.currentComponent = "axles";
                this.hideGUITools();
                this.setHighlightedObjects([ev.hit[0].object]);

                var id = this.chassis.getAxleIDfromUUID( ev.hit[0].object.VDS.uuid );
                if( id > -1 ) {

                    this.transform.detach();
                    this.gui.hideObjects( this.chassis.frame.longitudinal.pointHandles );
                   
                    
                    edit.show();
                    this.activeAxle = id;
                    // Add controls to move axles manually here

                }

            }
        } );

       
    }

    _p.instance.prototype.drivetrainRaycastInput = function() {

        var lon = this.chassis.frame.longitudinal;
        var nodes = lon.pointHandles;

        this.transform.detach();
        this.gui.hideObjects( nodes );

        var editAxles = this.container.find("#edit-axles");
        var mforward = this.container.find("#engine-move-forward");
        var mback = this.container.find("#engine-move-back");

        var addTires = this.container.find("#axles-add-tires");
        var editDrivetrain = this.container.find("#edit-drivetrain");

        mforward.mousedown(function(){
            
            if( this.drivetrain.engine == null || this.drivetrain.engine.mesh == null ) {
                return;
            }
            this.drivetrain.moveEngine( this.drivetrain.engine.position-0.025 );
 
        }.bind(this));
        mback.mousedown(function(){
            
            if( this.drivetrain.engine == null || this.drivetrain.engine.mesh == null ) {
                return;
            }
            this.drivetrain.moveEngine( this.drivetrain.engine.position+0.025 );
 
        }.bind(this));        

        // Clickable objects will be added later (upon engine placement)
        this.gui.setClickableGroup( "drivetrain-engine" , [] , {

            onHit: function( ev ) {

                if( this.editMode !== "free" ) { return; }

                if( this.transforming === true ) {
                    return;
                }

                this.currentComponent = "engine";

                editDrivetrain.show();
                editAxles.hide();
                addTires.hide();
                
                this.gui.hideObjects( this.chassis.frame.longitudinal.pointHandles );
                this.setHighlightedObjects( ev.hit[0].object ); // Won't work on complex objects

                this.transform.detach();

            }.bind(this)

        } );

    }

    /* --------------------------------------------------------------------------------------------------------------------------- */
    /* --------------------------------------------------------[ PARTS ]---------------------------------------------------------- */
    /* --------------------------------------------------------------------------------------------------------------------------- */

    _p.instance.prototype.categoryExists = function( cat ) { 

        if( this.parts[ cat ] == undefined ) { return false; }
        return true;

    }

    _p.instance.prototype.partExists = function( cat , part ) { 

        if( !this.categoryExists(cat) ) { return false; }
        if( this.parts[cat][part] == undefined ) { return false; }
        return true;

    }


    _p.instance.prototype.addPart = function( cat , partID , partInstance ) {

        if( this.partExists(cat,partID) || partInstance == undefined ) {
            return -1;
        }

        this.parts[ cat ][ partID ] = partInstance;

    } 

    _p.instance.prototype.getPart = function( cat , partID ) {

        if( !this.partExists(cat,partID) ) {
            return -1;
        }

        return this.parts[ cat ][ partID ];

    } 

    _p.instance.prototype.getPartGeometry = function( cat , partID ) {

        var part = this.getPart( cat , partID );
        if( part == -1 ) { return false; }

        // Some parts give instant access to the geometry. Others use a rendering system to help with undo/redo funcitions
        var geo = part.geometry == undefined ? part.getLastRender() : part.geometry;
        return geo;

    }

    /* --------------------------------------------------------------------------------------------------------------------------- */
    /* ----------------------------------------------------[ EDITOR SCENE ]------------------------------------------------------- */
    /* --------------------------------------------------------------------------------------------------------------------------- */

        _p.instance.prototype.calculateEditorDims = function() {
            this.editorWidth = this.container.width();
            this.editorHeight = this.container.height();
        }

        _p.instance.prototype.orbitControls = function( camera , renderer , maxDist , minDist , panSpeed , rotSpeed ) {

            var c = new THREE.OrbitControls( camera, renderer.domElement );
            c.maxDistance = maxDist;
            c.minDistance = minDist;
            c.panSpeed = panSpeed;
            c.rotateSpeed = rotSpeed;
            c.enableDamping = false;
            c.dampingFactor = 0.95;

            return c;
        }
    
        _p.instance.prototype.createScene = function() {

            // THREE.JS Initialization
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera( 45, this.container.width() / this.container.height() , 0.1, 2000 );
    
            this.renderer = new THREE.WebGLRenderer({
                antialias: true
            });

            var postprocessing = { enabled: true, onlyAO: false, radius: 32, aoClamp: 0.25, lumInfluence: 0.7 };
             
                
            this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy(); 

            //this.renderer.setPixelRatio( window.devicePixelRatio );
            this.renderer.setSize( this.container.width(), this.container.height() );

            this.container.append( this.renderer.domElement );

            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

            var fogColor = new THREE.Color("#b4765a");
            this.scene.background = new THREE.Color("#151515");
            this.scene.fog = new THREE.Fog(fogColor,  150, 800);
    
            this.controls = this.orbitControls( this.camera , this.renderer , 400 , 10 , 0.8 , 0.5 );
            /*
            this.controls.mouseButtons = {
                ORBIT: THREE.MOUSE.RIGHT,
                ZOOM: THREE.MOUSE.MIDDLE,
                PAN: THREE.MOUSE.LEFT
            }
            */

            this.composer = new THREE.EffectComposer( this.renderer );
            var renderPass = new THREE.RenderPass( this.scene, this.camera );
            this.composer.addPass( renderPass );
            this.outlinePass = new THREE.OutlinePass( new THREE.Vector2( this.container.width() , this.container.height() ), this.scene, this.camera );
            this.composer.addPass( this.outlinePass );
            /* Too slow for mobile devices
             // Setup SSAO pass
             var ssaoPass = new THREE.SSAOPass( this.scene, this.camera );
             ssaoPass.renderToScreen = true;
             ssaoPass.setSize( this.container.width(), this.container.height() );
             ssaoPass.radius = 16;
             ssaoPass.lumInfluence = 0.5;
             this.composer.addPass( ssaoPass );
            */
            this.effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
            this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / this.container.width(), 1 / this.container.height() );
            this.effectFXAA.renderToScreen = true;
            this.composer.addPass( this.effectFXAA );
            this.setOutlinePass();

            

            // Resize editor when browser window/container dimensions change
            function onWindowResize(){

                var w = this.container.width();
                var h = this.container.height();

                this.calculateEditorDims();
                this.camera.aspect = w / h;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize( w, h );

                this.composer.setSize( w, h );
                this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / w, 1 / h );

            }
            window.addEventListener( 'resize', onWindowResize.bind(this), false );

            
            this.setCameraView("default");
   

        }


        _p.instance.prototype.setCameraView = function( view ) {

            var dist = 100;
    
            if( view == "default" ) {
                this.camera.position.set( 0, dist, dist );
                this.camera.lookAt(0,0,0);
            } else if( view == "top" ) {
                this.camera.position.set( 0, dist, 0 );
                this.camera.lookAt(0,0,0);
            } else if( view == "side" ) {
                this.camera.position.set( 0, 0, dist );
                this.camera.lookAt(0,0,0);
            } else if( view == "front" ) {
                this.camera.position.set( -dist, 0, 0 );
                this.camera.lookAt(0,0,0);
            } else if( view == "back" ) {
                this.camera.position.set( dist, 0, 0 );
                this.camera.lookAt(0,0,0);
            }
            // Necessary to reset the state of the orbit controls after the cameraview has changed
            this.controls.target = new THREE.Vector3(0,0,0);
    
        }
    
        _p.instance.prototype.createLights = function() {
    
            this.lights.directional = new THREE.DirectionalLight( "#c9b4a4"  );
            this.lights.directional.position.set( -10, 10, 10 );
              
            
            this.lights.directional.castShadow = true;
            this.lights.directional.shadow.camera.near = 1;
            this.lights.directional.shadow.camera.far = 100;
            this.lights.directional.shadow.camera.right = 150;
            this.lights.directional.shadow.camera.left = - 150;
            this.lights.directional.shadow.camera.top	= 150;
            this.lights.directional.shadow.camera.bottom = - 150;
    
            //Set up shadow properties for the light
            this.lights.directional.shadow.mapSize.width = 512;  // default
            this.lights.directional.shadow.mapSize.height = 512; // default
            this.lights.directional.shadow.camera.near = 0.5;    // default
            this.lights.directional.shadow.camera.far = 500;     // default   
    
            this.lights.ambient = new THREE.AmbientLight( "#f1f1f1" ); // soft white light
            this.lights.ambient.intensity = 1;
            
            hemiLight = new THREE.HemisphereLight( '#4a6a9b', 'blue', 0.3 );
				//hemiLight.color.setHSL( 0.6, 1, 0.6 );
				//hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
				hemiLight.position.set( 0, 50, 0 );
				this.scene.add( hemiLight );
    
            this.scene.add( this.lights.directional );
            //this.scene.add( this.lights.ambient );


            var vertexShader = document.getElementById( 'vertexShader' ).textContent;
            var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
            var uniforms = {
                topColor:    { value: new THREE.Color( '#555' ) },
                bottomColor: { value: new THREE.Color( '#111' ) },
                offset:      { value: 0 },
                exponent:    { value: 1 }
            };
                

            var skyGeo = new THREE.SphereGeometry( 400, 32, 15 );
            var skyMat = new THREE.ShaderMaterial( { vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );

            var sky = new THREE.Mesh( skyGeo, skyMat );
            //this.scene.add( sky );
            
            var boxg = new THREE.BoxGeometry(1000,500,1000);
            //var modifier = new THREE.BufferSubdivisionModifier(3);
             //var smooth = modifier.modify( boxg );

            var box = new THREE.Mesh( boxg , VDS.materials.grey );
            box.scale.set(-1,-1,-1);
            box.position.y = 230;
            box.receiveShadow=true;
            this.scene.add(box);

            var light = new THREE.PointLight( "#5c422d", 1, 500 );
            light.intensity = 2;
            light.position.set( 0, 150, 0 );
            this.scene.add( light );
    
        }
    
        _p.instance.prototype.createGrid = function( squareSize , numSquares , centerLineColor , gridColor ) {
     
            if( this.grid != null && this.scene != null ) {
                this.scene.remove( this.grid );
            }
    
            var size = squareSize * numSquares;
            this.grid = new THREE.GridHelper( size, numSquares , centerLineColor , gridColor );
            this.scene.add( this.grid );
    
            
            var pg = new THREE.PlaneGeometry( size, size );
            var pmat = new THREE.MeshStandardMaterial( {color: "#151515", side: THREE.DoubleSide} );
            var plane = new THREE.Mesh( pg, VDS.materials.asphalt );
            plane.rotation.x = Math.PI/2;
            plane.receiveShadow = true;
            plane.position.y = -15;
            //this.scene.add( plane );
    
        }

        _p.instance.prototype.setOutlinePass = function() {

            this.outlinePass.edgeStrength = 3;
            this.outlinePass.edgeGlow  = 0.5;
            this.outlinePass.edgeThickness  = 0.5;
            this.outlinePass.pulsePeriod  = 3;
            //this.outlinePass.usePatternTexture = false;
            this.outlinePass.visibleEdgeColor.set( "#fff" );
            this.outlinePass.hiddenEdgeColor.set( "#fff" );
            
        }

    /* --------------------------------------------------------------------------------------------------------------------------- */
    
    _p.instance.prototype.setHighlightedObjects = function( list ) {

        this.outlinePass.selectedObjects = list;

    }

    _p.instance.prototype.compileClickableObjects = function( type ) {

        var res = [];

        if( type == "axles" ) {

            for( var i = 0 ; i < this.chassis.axles.length; i++ ) {
                res.push(this.chassis.axles[i].axleMesh);
            }

        } else if ( type == "engine" ) {

            if( this.drivetrain.engine !== null && this.drivetrain.engine.mesh !== undefined ) {
                res.push(this.drivetrain.engine.mesh);
            }

        }

        return res;

    }

    _p.instance.prototype.hideGUITools = function() {

        // more concise way to hide/show all tools when another is clicked.
        var guiTools = this.container.find("[vds-tool]");
        guiTools.hide();

    }
 
    _p.instance.prototype.toggleGUITool = function( id , visible ) {

        // more concise way to hide/show all tools when another is clicked.
        var tool = this.container.find('[vds-tool="'+id+'"]');
        if( visible == true ) { tool.show(); }
        else { tool.hide(); }

    }

    _p.instance.prototype.showGUITool = function( id ) {
        this.toggleGUITool(id,true);
    }

    _p.instance.prototype.hideGUITool = function( id ) {
        this.toggleGUITool(id,false);
    }

    
    var _t0 = performance.now();
    var _t1;
    var _stms = 0;
    var _fps = 0;

    _p.instance.prototype.update_stats = function() {

        _fps++;
        _t1 = performance.now() - _t0;
        _stms += _t1;
        if( _stms >= 1000 ) {
            
            var stats = this.getSceneStats();

            this.stats.html("<b>Scene Stats:</b><br/>FPS: "+_fps + "<br/>Tris: "+stats.tris+" / 50000" + "<br/>Objects: "+stats.objects+" / 100" );

            _stms = 0;
            _fps = 0;
        }
        _t0 = performance.now();

    }

    /**
     * 
     * @param {*} type 
     * @param {*} event 
     */
    _p.instance.prototype.callCustomTransformEvents = function( type , event ) {

        var evs = this.transformEvents;
        if( evs == undefined ) { 
            return false; 
        }

        if( this.currentComponent == undefined || this.currentComponent == null || evs[ this.currentComponent ] == undefined ) { 
            return false; 
        }

        var method = evs[ this.currentComponent ][ type ];
        if( method !== undefined && typeof method == 'function' ) {

            method( this , event ); // params: editor , event

        }


    }

    /**
     * 
     */
    _p.instance.prototype.setupTransform = function() {

        this.scene.add( this.transform );

        this.transform.addEventListener('change', function ( e ) {
            
            this.callCustomTransformEvents( "change" , e );

        }.bind(this));

        this.transform.addEventListener('mouseDown', function ( e ) {

            this.controls.enabled = false;
            this.transforming = true;

            this.callCustomTransformEvents( "mouseDown" , e );

        }.bind(this));

        this.transform.addEventListener('mouseUp', function ( e ) {

            this.controls.enabled = true;
            this.transforming = false;

            this.callCustomTransformEvents( "mouseUp" , e );

        }.bind(this));
 
     
    }

    /**
     * 
     */
    _p.instance.prototype.resetTransformAxes = function() {
         
        for( var a = 0 ; a < this.transform.children.length ; a++ ) {

            for( var b = 0 ; b < this.transform.children[a].children.length; b++ ) {

                for( var c = 0 ; c < this.transform.children[a].children[b].children.length; c++ ) {

                    this.transform.children[a].children[b].children[c].visible = true;

                }

            }

        }

    }

    /**
     * 
     * @param {*} xVis 
     * @param {*} yVis 
     * @param {*} zVis 
     */
    _p.instance.prototype.setTransformAxes = function( xVis , yVis , zVis ) {

        this.resetTransformAxes();

        if( xVis === false && yVis === true && zVis === true ) { 

            this.transform.children[0].children[0].children[0].visible = false;
            this.transform.children[0].children[0].children[1].visible = false;
            this.transform.children[0].children[0].children[7].visible = false;
            this.transform.children[0].children[0].children[9].visible = false;

            this.transform.children[0].children[1].children[4].visible = false;
            this.transform.children[0].children[1].children[0].visible = false;
            this.transform.children[0].children[1].children[6].visible = false;

            this.transform.children[0].children[2].children[3].visible = false;

        }

    }
 
    
    var t1 = performance.now();
    var t2 = 0;
 
    _p.instance.prototype.update = function() {
     
        requestAnimationFrame( this.update.bind(this) );

        if( this.paused === true ) { return; }
       
        this.transform.update();
        this.controls.update();
        //this.renderer.render( this.scene , this.camera );
        this.composer.render();

        if( decalFactory !== undefined ) {
            decalFactory.update();
        }

        if( this.aerodynamics !== undefined ) {
            this.aerodynamics.update();
        }

        if( this.showStats === true ) { 
            this.update_stats();
        }

        t2 = performance.now() - t1;
        t1 = performance.now();
         

    }

     

    return _p;

})( {} );