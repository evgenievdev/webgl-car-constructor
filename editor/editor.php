<?php
    ob_start("ob_gzhandler");
?>

<html>
    <head>
        <title>Editor</title>

        <meta http-equiv="Content-Type" content="text/html;charset=utf-8"> 
        <meta name="viewport" content="width=device-width, initial-scale=1.0">


        <link rel="stylesheet" type="text/css" href="../dependencies/semantic-ui/semantic.min.css">
        <link rel="stylesheet" type="text/css" href="editor.css">

        <?php require "templates/js-libraries.php"; ?>
 

    </head>
    <body>
         
       
        <div id="editor" class="pusher noselect nooutline ui segment" style="padding:0;margin:0;border:0;width:100vw;height:100vh;cursor:pointer;position:relative!important;">
            
            <!-- this will prevent the menu divs to be clicked once selecting, unless the div is rendered before them or the z-index is lower! -->
            <div id="multiselect-outline" style="position:absolute;top:0;left:0;display:none;border:dashed 1px rgba(255,255,255,0.5);"></div>
            
            <?php require "templates/gui-menus.php"; ?>

            <?php require "templates/gui-axles.php"; ?>
            <?php require "templates/gui-drivetrain.php"; ?>
            <?php require "templates/gui-tires.php"; ?>
            <?php require "templates/gui-body.php"; ?>
            <?php require "templates/gui-rims.php"; ?>

            <?php require "templates/gui-materials.php"; ?>
            <?php require "templates/gui-colorpicker.php"; ?>
            <?php require "templates/gui-panel.php"; ?>
             

            <?php require "templates/gui-stats.php"; ?>
            <?php require "templates/gui-loading.php"; ?>
            <?php require "templates/gui-pause.php"; ?>
     
        </div>
 
         

        <?php require "templates/shaders.php"; ?>

        <script>
      

        var editor = new VDS.editor.instance( "#editor" , "VW-Beetle" );

        var decalFactory = new THREE.DecalFactory( {
            material: VDS.materials.decal,
            maxDecals: 10 
        });


        // FOUR library testing
        var splineTest = new FOUR.Spline({
            points: [
                new THREE.Vector3(0,40,0),
                new THREE.Vector3(20,60,0),
                new THREE.Vector3(80,35,-10)
            ]
        });
        splineTest.draw( editor.scene );

        // ------------------------------------------------------------------------------------------------------
        // TRANSFORM TOOL DEMO
        // ------------------------------------------------------------------------------------------------------
            
            // Create an instance of the tool
            var transform3D = new FOUR.Transform3D({
                renderer: editor.renderer,
                scene: editor.scene,
                camera: editor.camera
            });

            // Setup some events (optional)
            transform3D.setEvents("onTransformStart", function( e ) {
                console.log("Transform Started");
            });

            transform3D.setEvents("onTransforming", [
                function( e ) {
                    console.log("Transforming (event 1)");
                },
                function( e ) {
                    console.log("Transforming (event 2)");
                }
            ]);

            // Attach an object/list of objects to transform
            transform3D.attach( splineTest.handles );

        // ------------------------------------------------------------------------------------------------------


        editor.container.on("mousedown",function(e){
            
            var px = (e.clientX / e.target.width - 0.5)*2;
            var py = (0.5 - e.clientY / e.target.height)*2;

            var sc = { x : px , y : py };
            var hit = FOUR.Generic.projectCoordinates( sc , editor.camera , splineTest.segments );
            if( hit === false ) { return false; }
            
            var o = hit[0];
            console.log(o);

            var pm =  new THREE.Mesh( new THREE.IcosahedronGeometry(0.5), VDS.materials.active );
            pm.position.copy( o.point );
            editor.scene.add(
                pm
            );
            
        });
 
        // Test Cage
        var cage = editor.cage;

        cage.createBar({
            id: "bar1",
            origin: "frame-left",
            startPoint: 0.3,
            finish: "frame-left",
            endPoint: 0.85,
            points: [
                { direction: new THREE.Vector3(0.3,0.7,-0.2) , length: 30 },
                { direction: new THREE.Vector3(1,0,0) , length: 60 } 
            ],
            steps: 20,
            tension: 0.3
        });

        cage.createBar({
            id: "bar2",
            origin: "frame-right",
            startPoint: 0.3,
            finish: "frame-right",
            endPoint: 0.85,
            points: [
                { direction: new THREE.Vector3(0.3,0.7,0.2) , length: 30 },
                { direction: new THREE.Vector3(1,0,0) , length: 60 } 
            ],
            steps: 20,
            tension: 0.3
        });

        cage.createBar({
            id: "bar3",
            origin: "bar2",
            startPoint: 0.8,
            finish: "bar1",
            endPoint: 0.8,
            points: [ ],
            steps: 10,
            tension: 0.1
        });

        cage.createBar({
            id: "bar4",
            origin: "bar1",
            startPoint: 0.0,
            finish: "bar1",
            endPoint: 0.5,
            points: [ ],
            steps: 10,
            tension: 0.1
        });

        cage.createBar({
            id: "bar5",
            origin: "bar2",
            startPoint: 0.0,
            finish: "bar2",
            endPoint: 0.5,
            points: [ ],
            steps: 10,
            tension: 0.1
        });

        cage.createBar({
            id: "bar6",
            origin: "bar4",
            startPoint: 0.6,
            finish: "bar5",
            endPoint: 0.6,
            points: [ ],
            steps: 10,
            tension: 0.1
        });

        //var cageMesh = cage.constructCageMesh();
        //editor.scene.add(cageMesh);

        cage.createGroup( "rollcage" , ["bar1","bar2","bar3","bar4","bar5","bar6"] );
        var rcMesh = cage.getGroupMesh("rollcage");
        if( rcMesh !== false ) {

            editor.scene.add( rcMesh );

            // Make some real-time edits
            //cage.removeBarsFromGroup( "rollcage" , ["bar1" ]);

        }


        var epTools = editor.container.find("#edit-panel-tools");
        var eppTools = editor.container.find("#edit-panel-point");

        var selectMulti = eppTools.find("#select-multiple");
        var insertPoint = eppTools.find("#insert-point");
        var removePoint = eppTools.find("#remove-point");
        var removeCurve = eppTools.find("#remove-curve");
        var extend = eppTools.find("#extend-cps");
        var reduce = eppTools.find("#reduce-cps");
        var extendCurves = eppTools.find("#extend-curves");
        var reduceCurves = eppTools.find("#reduce-curves");

        // -----------------------------------------
        var pointCurveID = null;
        var pointID = null;
    
        var transformMode = "translate";
        var transformTarget = "panel";
        var transforming = false;

        var isSelecting = false;
        var drawCurves = false;
 
        var lastTransform = new THREE.Vector3();
        // -----------------------------------------

        var select = epTools.find("#select");
        var move = epTools.find("#move");
        var scale = epTools.find("#scale");
        var rotate = epTools.find("#rotate");
        var ep = epTools.find("#edit-points");
        var remove = epTools.find("#remove");
        var outline = epTools.find("#toggle-outline");
        var clonePanel = epTools.find("#clone");
        var symmetry = epTools.find("#symmetry");

        var rotButtons = epTools.find('[vds-transform="rotate"]');
        var flipButtons = epTools.find('[vds-transform="flip"]');

        var _selectMulti = function(){

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }

            var sm = this.gui.getSelectMode();
            if( sm == "multi" ) {
                selectMulti.addClass("basic");
                this.gui.setSelectMode("single");
            } else {
                selectMulti.removeClass("basic");
                this.gui.setSelectMode("multi");
            }
            

        };
         
        
        var _toggleOutline = function(){

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }

            if( drawCurves ) {
                drawCurves = false;
                panel.removeCurveLines();
            } else {
                drawCurves = true;
                panel.drawCurves({
                    useCPs: false,
                    color: new THREE.Color("#00FF00")
                });
            }

        };
        
        var _removeCurve = function(){

            if( pointCurveID == null || pointCurveID < 0 || pointID == null || pointID < 0 ) { return; }

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }
            //console.time("removeCurve");
            this.transform.detach();
            panel.removeCurve( pointCurveID );
            panel.renderPointHandles();
            //console.timeEnd("removeCurve");
            var hList = panel.pointHandlesToList();
            this.gui.setClickableObjects( "panel-control-points" , hList );

            if( drawCurves ) {
                panel.drawCurves({
                    useCPs: false,
                    color: new THREE.Color("#00FF00")
                });
            }

        };

        var _extendCPs = function(){

            if( pointCurveID == null || pointCurveID < 0 || pointID == null || pointID < 0 ) { return; }

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }

            var dir; // first or last or nothing
            if( panel.curves[ pointCurveID ].points.length-1 == pointID ) {
                dir = "last";
            } else if( pointID == 0 ) {
                dir = "first";
            } else {
                return;
            }
            
            this.transform.detach();
            panel.extendCurvePoints( dir , 5 , [] );
            panel.renderPointHandles();

            var hList = panel.pointHandlesToList();
            this.gui.setClickableObjects( "panel-control-points" , hList );

            if( drawCurves ) {
                panel.drawCurves({
                    useCPs: false,
                    color: new THREE.Color("#00FF00")
                });
            }

        };

        var _reduceCPs = function(){

            if( pointCurveID == null || pointCurveID < 0 || pointID == null || pointID < 0 ) { return; }

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }

            var dir; // first or last or nothing
            if( panel.curves[ pointCurveID ].points.length-1 == pointID ) {
                dir = "last";
            } else if( pointID == 0 ) {
                dir = "first";
            } else {
                return;
            }
 
            this.transform.detach();
            panel.reduceCurvePoints( dir , [] );
            panel.renderPointHandles();

            var hList = panel.pointHandlesToList();
            this.gui.setClickableObjects( "panel-control-points" , hList );

            if( drawCurves ) {
                panel.drawCurves({
                    useCPs: false,
                    color: new THREE.Color("#00FF00")
                });
            }

        };

        var _insertPoint = function(){

            if( pointCurveID == null || pointCurveID < 0 || pointID == null || pointID < 0 ) { return; }

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }
            
            panel.insertPoint( pointCurveID , pointID );
            panel.renderPointHandles();

            var hList = panel.pointHandlesToList();
            this.gui.setClickableObjects( "panel-control-points" , hList );

            if( drawCurves ) {
                panel.drawCurves({
                    useCPs: false,
                    color: new THREE.Color("#00FF00")
                });
            }

        };

        var _removePoint = function(){

            if( pointCurveID == null || pointCurveID < 0 || pointID == null || pointID < 0 ) { return; }

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }

            this.transform.detach();
            panel.removePoint( pointCurveID , pointID );
            panel.renderPointHandles();

            var hList = panel.pointHandlesToList();
            this.gui.setClickableObjects( "panel-control-points" , hList );

            if( drawCurves ) {
                panel.drawCurves({
                    useCPs: false,
                    color: new THREE.Color("#00FF00")
                });
            }

        };

        var _extendCurves = function() {

            if( pointCurveID == null || pointCurveID < 0 || pointID == null || pointID < 0 ) { return; }

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }

            var dir; // first or last or nothing
            if( pointCurveID == panel.curves.length-1 ) {
                dir = "last";
            } else if( pointCurveID == 0 ) {
                dir = "first";
            } else {
                return;
            }
            
            this.transform.detach();
            panel.extendCurves( dir , 5 , "auto" , [] );
            panel.renderPointHandles();

            var hList = panel.pointHandlesToList();
            this.gui.setClickableObjects( "panel-control-points" , hList );

            if( drawCurves ) {
                panel.drawCurves({
                    useCPs: false,
                    color: new THREE.Color("#00FF00")
                });
            }
        };

        var _reduceCurves = function() {

        }

        var _symmetry = function() {

            if( pointCurveID == null || pointCurveID < 0 || pointID == null || pointID < 0 ) { return; }

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }

            var dir; // first or last or nothing
            if( pointCurveID == panel.curves.length-1 ) {
                dir = 1;
            } else if( pointCurveID == 0 ) {
                dir = -1;
            } else {
                return;
            }

            this.transform.detach();
            panel.applySymmetry( "z" , dir , 2);
            panel.renderPointHandles();

            var hList = panel.pointHandlesToList();
            this.gui.setClickableObjects( "panel-control-points" , hList );

            if( drawCurves ) {
                panel.drawCurves({
                    useCPs: false,
                    color: new THREE.Color("#00FF00")
                });
            }

        }

        selectMulti.click(_selectMulti.bind(editor));
        outline.click( _toggleOutline.bind(editor));
        removeCurve.click(_removeCurve.bind(editor));
        extend.click(_extendCPs.bind(editor));
        reduce.click(_reduceCPs.bind(editor));
        extendCurves.click(_extendCurves.bind(editor));
        reduceCurves.click(_reduceCurves.bind(editor));
        insertPoint.click(_insertPoint.bind(editor));
        removePoint.click(_removePoint.bind(editor));
        symmetry.click(_symmetry.bind(editor));

        rotButtons.each(function(index){

            var b = $(rotButtons[index]);
            var axis = b.attr("vds-axis");
            var dir = parseInt( b.attr("vds-direction") );
            
            b.click(function(){

                isSelecting = false;

                var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
                if( panel === false ) { return; }

                var factor = new THREE.Vector3();
                factor[axis] = 1;
                var angle = (Math.PI/18) * dir; // 10 degree increments in the specified direction
                var amount = new THREE.Vector3(angle,angle,angle);
                amount.multiply(factor);
                panel.rotate( amount , [] );

                if( drawCurves ) {
                    panel.drawCurves({
                        useCPs: false,
                        color: new THREE.Color("#00FF00")
                    });
                }

            }.bind(this));

        }.bind(editor));

        flipButtons.each(function(index){

            var b = $(flipButtons[index]);
            var axis = b.attr("vds-axis");

            b.click(function(){

                isSelecting = false;

                var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
                if( panel === false ) { return; }

                var factor = new THREE.Vector3();
                factor[axis] = 1;
                panel.flip( factor );

                if( drawCurves ) {
                    panel.drawCurves({
                        useCPs: false,
                        color: new THREE.Color("#00FF00")
                    });
                }

            }.bind(this));

        }.bind(editor));
        
        var _clonePanel = function(){

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }
            
            var clone = this.body.clonePanel( this.body.activeGroup , this.body.activePanel );
            this.scene.add(clone.mesh);

            var panelList = this.compilePartsList({body:true});
            this.gui.setClickableObjects( "panels" , panelList );
            
            this.transform.detach(); // hide transform gizmo
            this.setHighlightedObjects( [] ); // reset higlights
            drawCurves=false;
            panel.removeCurveLines();
            panel.removePointHandles();

        };

        var _removePanel = function(){

            isSelecting = false;

            this.currentComponent = "panel-points";
            this.transform.detach(); // hide transform gizmo
            this.setHighlightedObjects( [] ); // reset higlights

            var panelList = this.compilePartsList({body:true});
            this.gui.setClickableObjects( "panels" , panelList );

            editor.hideGUITools();
            editor.showGUITool("edit-panel");

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }

            drawCurves=false;
            panel.removeCurveLines();

            this.body.removePanel( this.body.activeGroup , this.body.activePanel );
            this.gui.setClickableObjects( "panel-control-points" , [] );

        }
         
        
        var _selectPanel = function(){

            isSelecting = true;
            transformTarget = "panel";

            this.currentComponent = "panel-points";
            this.transform.detach(); // hide transform gizmo
            this.setHighlightedObjects( [] ); // reset higlights
            var panelList = this.compilePartsList({body:true});
            this.gui.setClickableObjects( "panels" , panelList );

            editor.hideGUITools();
            editor.showGUITool("edit-panel");

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }

            drawCurves=false;
            panel.removeCurveLines();
            panel.removePointHandles();
            //panel.constructTrim();

        };
         

        var _movePanel = function(){

            isSelecting = false;

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }

            transformMode = "translate";
            transformTarget = "panel";
            transforming = false;

            this.transform.setSpace( "world" );

            this.currentComponent = "panel-points";
            this.transform.attach( panel.pivot );
            this.setHighlightedObjects( [panel.mesh] );
            this.transform.setMode( "translate" );

            editor.hideGUITools();
            editor.showGUITool("edit-panel");

            panel.removePointHandles();


        };
         

        var _scalePanel = function(){
            
            isSelecting = false;

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }
 
            transformMode = "scale";
            transformTarget = "panel";
            transforming = false;

            this.transform.setSpace( "local" );

            this.currentComponent = "panel-points";
            this.transform.attach( panel.pivot );
            this.setHighlightedObjects( [panel.mesh] );
            this.transform.setMode( "scale" );

            editor.hideGUITools();
            editor.showGUITool("edit-panel");

            panel.removePointHandles();

            

        };
         

        var _rotatePanel = function(){
            
            isSelecting = false;

            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }
 
            transformMode = "rotate";
            transformTarget = "panel";
            transforming = false;
            
            this.transform.setSpace( "local" );

            this.currentComponent = "panel-points";
            this.transform.attach( panel.pivot );
            this.setHighlightedObjects( [panel.mesh] );
            this.transform.setMode( "rotate" );

            editor.hideGUITools();
            editor.showGUITool("edit-panel");

            panel.removePointHandles();

        };
         
        
        var _editPoints = function(){
            
            isSelecting = false;
            
            editor.showGUITool("edit-panel-point");

            transformMode = "translate";
            transformTarget = "point"; 
            transforming = false;

            this.transform.setSpace( "world" );

            this.currentComponent = "panel-points";
            this.transform.detach();
            this.setHighlightedObjects( [] );
            this.transform.setMode( "translate" );
            
            var panel = this.body.panelGetRender( this.body.activeGroup , this.body.activePanel , "last" );
            if( panel === false ) { return; }

            panel.renderPointHandles();

        };
        
        remove.click( _removePanel.bind(editor));
        select.click(_selectPanel.bind(editor));
        move.click(_movePanel.bind(editor));
        scale.click(_scalePanel.bind(editor));
        rotate.click(_rotatePanel.bind(editor));
        clonePanel.click(_clonePanel.bind(editor));
        ep.click(_editPoints.bind(editor));


        /* Doesn't work well ---
        console.time("DocGen");
        var docs = new docGenerator.instance( VDS );
        console.timeEnd("DocGen");
        */

        // Define an event for the transform tool

         
        editor.transformEvents["panel-points"] = {

            "change" : function( editor , event ) {

                var gID = editor.body.activeGroup;
                var pID = editor.body.activePanel;

                var panel = editor.body.panelGetRender( gID , pID , "last" );
                if( panel === true ) { return; }
                
                 

                if( transformMode == "scale" && transforming == true ) {
                    
                    // Get the difference in scale between the last event and the current one
                    var delta = new THREE.Vector3().copy(panel.pivot.scale).sub(lastTransform);
                    // Use the previous information to create a directional vector
                    var factor = new THREE.Vector3().copy(delta).normalize();
                    // Scale the magnitude to give the user more precise scaling
                    factor.divideScalar(60);
                    // Add the factor vector to a base scale vector (1,1,1 = retains current scale)
                    var magnitude = new THREE.Vector3(1,1,1).add(factor);
                    // Scale Panel
                    panel.scale( magnitude );
                    // Record this scale to use for the next frame
                    lastTransform = new THREE.Vector3().copy(panel.pivot.scale);

                } else if( transformMode == "rotate" && transforming == true ) {

                    var delta = new THREE.Vector3().copy(panel.pivot.rotation).sub(lastTransform);
                    var factor = new THREE.Vector3().copy(delta).normalize();
                    factor.divideScalar(40);
                    panel.rotateTo( panel.pivot.rotation );
                    lastTransform = new THREE.Vector3().copy(panel.pivot.rotation);

                } else if( transformMode == "translate" && transforming == true ) {

                    if( transformTarget == "panel" ) {
                        panel.moveTo( panel.pivot.position );
                    }

                }

            },
            "mouseDown" : function( editor , event ) {
                
                var gID = editor.body.activeGroup;
                var pID = editor.body.activePanel;

                var panel = editor.body.panelGetRender( gID , pID , "last" );
                if( panel === true ) { return; }
                
                transforming = true;
                editor.controls.enabled = false;
                
                editor.hideGUITool("edit-panel");
                editor.hideGUITool("create-material");
                editor.hideGUITool("edit-panel-point");
               
                

            },
            "mouseUp" : function( editor , event ) {

                var gID = editor.body.activeGroup;
                var pID = editor.body.activePanel;

                var panel = editor.body.panelGetRender( gID , pID , "last" );
                if( panel === true ) { return; }
                
           
                if( transformMode == "translate" ) {
                    
                    if( transformTarget == "point" ) {
                        panel.updateControlPoints();
                        editor.showGUITool("edit-panel-point");
                    }

                } 

                transforming = false;
                editor.controls.enabled = true;
                
                editor.showGUITool("edit-panel");
                editor.showGUITool("create-material");

            }
            
        };

        editor.transformEvents["frame-longitudinal"] = {

            "change" : function( editor , event ) {

                var c = editor.chassis.frame.longitudinal.nodeConstraints;

                if( event.target.object.position.y < c.yMin ) {
                    event.target.object.position.y = c.yMin;
                }
                if( event.target.object.position.y > c.yMax ) {
                    event.target.object.position.y = c.yMax;
                }

                if( event.target.object.position.z < c.zMin ) {
                    event.target.object.position.z = c.zMin;
                }
                if( event.target.object.position.z > c.zMax ) {
                    event.target.object.position.z = c.zMax;
                }

            },
            "mouseDown" : function( editor , event ) {},
            "mouseUp" : function( editor , event ) {

                editor.chassis.updateLongitudinalGeometry();
                 
                
                var dt = editor.drivetrain;
                if( dt.engine !== null ) { 
                    var vec3 = editor.chassis.getPointOnLongitudinalMember( dt.engine.position );
                    
                    dt.engine.mesh.position.set(
                        vec3.x,
                        vec3.y+dt.engine.offset.y,
                        0
                    );
                
                    if( dt.transmission !== null ) {
                        dt.transmission.mesh.position.copy(
                            new THREE.Vector3().addVectors(dt.engine.mesh.position , dt.engine.transmissionMount )
                        );
                         
                    }
 
                }

            }

        };

      
  
        /*
        var tread = new THREE.Mesh( new THREE.PlaneGeometry(60 , 5 , 15 , 1 ) , VDS.materials.default );
        editor.scene.add(tread);
        var modifier = new ModifierStack(tread);
        var bend = new Bend(2, 0, 0);
        bend.constraint = ModConstant.LEFT;
        modifier.addModifier(bend);
        modifier.apply();
        tread.geometry.mergeVertices(); // Merge the last vertices
        console.log(tread.geometry.vertices.length);
        */
        
        var line = VDS.module.helpers.lineMesh( VDS.module.helpers.boundPlane( 100 , 200 , 50 , 3 , 0 ), VDS.materials.outlineGreen );
        editor.scene.add( line );

        line = new THREE.Line( VDS.module.helpers.boundPlane( 50 , 300 , 50 , 3 , -150 ), VDS.materials.outlineGreen );
        line.computeLineDistances();
        editor.scene.add( line );
         
      
       
       
        
        
         
        var sus = new VDS.module.suspension.instance( editor , "double-wishbone" );
        
        
        var wishbone = sus.buildWishbone({
            wishboneAngle: 60,
            armLength: 15,
            wishboneRadius: 0.8,
            wishboneTension: 0.5,
            mountLength: 3
        });
        var wb1Mesh = new THREE.Mesh( wishbone , VDS.materials.highlight );
        wb1Mesh.position.y = 25;

        var wb2Mesh = wb1Mesh.clone();
        wb2Mesh.position.y = 44.5;

        editor.scene.add( wb1Mesh );
        editor.scene.add( wb2Mesh );

        var shock = sus.buildShockAbsorber({
            // Settings to be added
        });
        var shockg = new THREE.Group();
        shockg.add( new THREE.Mesh( shock.bottomMount , VDS.materials.highlight ) );
        shockg.add( new THREE.Mesh( shock.topMount , VDS.materials.highlight ) );
        shockg.add( new THREE.Mesh( shock.pistonRod , VDS.materials.highlight ) );
        shockg.add( new THREE.Mesh( shock.coilSpring , VDS.materials.highlight ) );
        shockg.add( new THREE.Mesh( shock.dustCover , VDS.materials.highlight ) );
        shockg.add( new THREE.Mesh( shock.springSeat , VDS.materials.highlight ) );
        shockg.add( new THREE.Mesh( shock.upperSeat , VDS.materials.highlight ) );
        shockg.add( new THREE.Mesh( shock.springAdjustment , VDS.materials.highlight ) );
        shockg.add( new THREE.Mesh( shock.lockingBracket , VDS.materials.highlight ) );
        shockg.add( new THREE.Mesh( shock.pistonChamber , VDS.materials.highlight ) );

        shockg.position.y = 25;
        shockg.position.z = 5;
        shockg.rotation.x = 0.4;
        editor.scene.add(shockg);
      



        
        </script>

    </body>
</html>
<?php
    ob_end_flush();
?>