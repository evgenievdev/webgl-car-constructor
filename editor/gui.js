var VDS = VDS || {};

VDS.gui = (function( _p ) {

    _p.instance = function( target ) {

        this.editor = target;

        this.groups = {};

        this.clickable = {};
        this.activeClickable = null;

        this.menuSelectComponent();
        this.menuComponentTires();
        this.menuComponentEngines();
        this.menuComponentTransmissions();
        this.menuComponentBody();

        this.buttons_createTire();
        this.buttons_createMaterial();
        this.buttons_modifyFrame();
        this.buttons_addTiresToAxle();

        this.selectMode = "single";
        this.multiSelect();

        this.createSlideMenu( "#change-camera" , "#camera-options" , {
            "default": function( editor ) {
                editor.setCameraView("default"); 
            },
            "top": function( editor ) {
                editor.setCameraView("top"); 
            },
            "front": function( editor ) {
                editor.setCameraView("front"); 
            },
            "back": function( editor ) {
                editor.setCameraView("back"); 
            },
            "side": function( editor ) {
                editor.setCameraView("side"); 
            }

        });
        
        this.createSlideMenu( "#physics-menu" , "#physics-options" , {
            "weight-distribution": function( editor ) {

                editor.calculateCOG();

            },
            "wind-tunnel": function( editor ) {
 
                editor.aerodynamicSimulation();
     
            }
        });
        
        this.createSlideMenu( "#edit-mode-menu" , "#edit-mode-options" , {
            "free" : function( editor , buttons , button , toggle ) {
                
                buttons.show();
                button.hide();
                toggle.html('F');

                editor.editMode = "free";
                editor.hideGUITools();
                editor.materials.hideMaterials();
                
                editor.transform.detach();
                editor.setHighlightedObjects( [] );
                
                var panel = editor.body.panelGetRender( editor.body.activeGroup , editor.body.activePanel , "last" );
                if( panel === false ) { return; }
                panel.removePointHandles();
                editor.body.activeGroup = null;
                editor.body.activePanel = null;

            },
            "panels" : function( editor , buttons , button , toggle ) {

                buttons.show();
                button.hide();
                toggle.html('P');

                // Change editor mode to work only with panels (+materials for panels)
                editor.editMode = "panels";
                // Reset all effects
                editor.resetTransformAxes();
                editor.setHighlightedObjects( [] );
                editor.transform.detach();
                // Hide all opened tools
                editor.hideGUITools();
                // Panels
                editor.showGUITool("edit-panel");
                // Materials
                editor.showGUITool("create-material");
                editor.materials.showMaterials();

            },
            "cage" : function( editor , buttons , button , toggle ) {

                buttons.show();
                button.hide();
                toggle.html('C');

                editor.editMode = "cage";
                editor.hideGUITools();
                editor.materials.hideMaterials();

            } 
        });

        this.createSlideMenu( "#editor-menu" , "#editor-options" , {
            "pause" : function( editor ) {

                editor.pause();

            },
            "load" : function( editor ) {

                editor.resetScene();

                VDS.module.load.project({
                    editor: editor,
                    directory: "../editor/projects/",
                    //projectName: "VW-Beetle",
                    fileName: "project-data.json"
                });

            },
            "save" : function( editor ) {

                VDS.module.save.project({
                    editor: editor,
                    directory: "../editor/projects/",
                    //projectName: "VW-Beetle",
                    fileName: "project-data.json"
                });

            },
          
            "export" : function( editor ) {
                VDS.export.designFromEditor( editor , "../exports/"+editor.projectName+"/" );
            },
            "reset" : function( editor ) {
                editor.resetScene();
            }
        });

        this.createSlideMenu( "#change-language" , "#language-options" , {
            "english" : function( editor ) {
                
            },
            "german" : function( editor ) {
                
            },
            "bulgarian" : function( editor ) {
                
            }
        });


    }

    _p.instance.prototype.toggleObjects = function( objects , visible ) {

        for( var i = 0 ; i < objects.length ; i++ ) {

            objects[i].visible = visible;

        }

    }

    _p.instance.prototype.showObjects = function( objects , visible ) {

        this.toggleObjects( objects , true );

    }

    _p.instance.prototype.hideObjects = function( objects , visible ) {

        this.toggleObjects( objects , false );

    }

    _p.instance.prototype.addClickableObject = function( group , object ) {

        if( this.clickable[group] == undefined ) { return false; }

        this.clickable[ group ].objects.push(object);

    }

    _p.instance.prototype.addClickableObjects = function( group , objects ) {

        if( this.clickable[group] == undefined ) { return false; }

        for( var i = 0 ; i < objects.length; i++ ) {

            this.clickable[ group ].objects.push(objects[i]);

        }

    }

    _p.instance.prototype.removeClickableObject = function( group , id ) {

        if( this.clickable[group] == undefined ) { return false; }
        this.clickable[ group ].objects.splice( id , 1 );

    }

    _p.instance.prototype.setClickableObjects = function( group , objects ) {

        if( this.clickable[group] == undefined ) { return false; }
        this.clickable[ group ].objects = objects;

    }

    _p.instance.prototype.getClickableObjects = function( group ) {

        if( this.clickable[group] == undefined ) { return []; }
        return this.clickable[ group ].objects;

    }

    _p.instance.prototype.setClickableGroup = function( group , objects , params ) {

        if( this.clickable[ group ] == undefined ) {
            this.clickable[ group ] = {};
        }

        if( typeof this.clickable[ group ].eventmethod == 'function' ) {

            this.editor.renderer.domElement.removeEventListener('mousedown', this.clickable[ group ].eventmethod );
            this.editor.renderer.domElement.removeEventListener('touchstart', this.clickable[ group ].eventmethod );

        }

        this.clickable[ group ] = {
            current: 0,
            objects: [],
            params: params
        }
 
        this.addClickableObjects( group , objects );
 

        var eventmethod = function(event){
            
            event.preventDefault();
            this.clickEvent.bind(this)( event , group , params );

        }.bind(this);

        this.clickable[ group ].eventmethod = eventmethod;

        this.editor.renderer.domElement.addEventListener('mousedown',eventmethod, false);
        this.editor.renderer.domElement.addEventListener('touchstart', eventmethod, false);

         
         

    }

    _p.instance.prototype.clickEvent = function( event , group , params ) {

        var g = this.clickable[ group ];

        var raycaster = new THREE.Raycaster();
        var	mouse = new THREE.Vector2();
        
        var cx = event.clientX;
        var cy = event.clientY;

        if( cx == undefined || cy == undefined ) {
            cx = event.touches[0].clientX;
            cy = event.touches[0].clientY;
        }

        mouse.x = ( cx / this.editor.renderer.domElement.clientWidth ) * 2 - 1;
        mouse.y = - ( cy / this.editor.renderer.domElement.clientHeight ) * 2 + 1;

        raycaster.setFromCamera( mouse, this.editor.camera );
        var hit = raycaster.intersectObjects( g.objects );
        
        if( hit.length ) {

            if( typeof params.onHit == 'function' ) {

                params.onHit.bind( this.editor )({ 
                    hit: hit,
                    group: group,
                    params: params, 
                    mouse: { x : mouse.x , y : mouse.y }
                });

            }
            
        }
    }

    _p.instance.prototype.addGroup = function( group , parent , type ) {

        this.groups[group] = {
            parent: parent,
            type: type,
            buttons: []
        };

    }

    _p.instance.prototype.addButton = function( group , cfg ) {

        var el = document.createElement( cfg.type );
        //el.setAttribute("vds-id",12345);
        el.innerHTML = cfg.html;
        el.id = cfg.id;
        el.className = cfg.classes;
        el.style.position = "absolute";

        this.groups[ group ].buttons.push({
            html: cfg.html,
            element: el
        })

        this.groups[group].parent.append( el );

    }

    _p.instance.prototype.buttons_createTire = function() {

        var lab = this.editor.container.find("#create-material");

        var obj = new THREE.Object3D();
        obj.position.z = -150;
        obj.position.x = -90;
        var objs = [obj];
      

        this.createButtons(
            objs,
            lab,
            [
                
                {
                    type: 'button',
                    innerHTML : '<i class="plus icon"></i> new tire',
                    classes: 'ui inverted blue basic icon button',
                    offsetX: 0,
                    onClick: function( ev ) {
                        
                        var id = THREE.Math.generateUUID();
                         

                    }
                }   
            ]
        );

    }

    _p.instance.prototype.buttons_createMaterial = function() {

        var lab = this.editor.container.find("#create-material");

        var obj = new THREE.Object3D();
        obj.position.z = -100;
        obj.position.x = -30;
        var objs = [obj];
      

        this.createButtons(
            objs,
            lab,
            [
                
                {
                    type: 'button',
                    innerHTML : '<i class="plus icon"></i> new mat',
                    classes: 'ui inverted blue basic icon button',
                    offsetX: 0,
                    onClick: function( ev ) {
                        
                        var id = THREE.Math.generateUUID();
                        this.materials.newMaterial( id , {
                            color: "#FFF",
                            envMapIntensity: 0.5,
                            metalness: 0.3,
                            roughness: 0.1,
                            transparent: false,
                            opacity: 1
                        });

                        this.materials.renderMaterialMeshes(
                            new THREE.Vector3(0,0,-100),
                            new THREE.Vector3(1,0,0),
                            25,
                            8
                        );

                        var clickable = this.materials.buildClickables();
                        this.gui.setClickableObjects("materials-clickable",clickable);

                        this.materials.active = id;
                        this.cpOverlay.dimmer("show");

                    }
                }   
            ]
        );

    }

    _p.instance.prototype.buttons_modifyFrame = function() {

        var lab = this.editor.container.find("#modify-frame");

        var objs = [
            this.editor.chassis.frame.longitudinal.meshL
        ];
      

        this.createButtons(
            objs,
            lab,
            [
                
                {
                    type: 'button',
                    innerHTML : '<i class="arrows alternate horizontal icon"></i>',
                    classes: 'ui inverted blue basic icon button big',
                    offsetX: -60,
                    onClick: function( ev ) {
                        //widen
                    }
                } ,
                {
                    type: 'button',
                    innerHTML : '<i class="plus icon"></i>',
                    classes: 'ui inverted blue basic icon button big',
                    onClick: function( ev ) {
                        
                        //narrow
                         
                    }
                },
                {
                    type: 'button',
                    innerHTML : '<i class="expand icon"></i>',
                    classes: 'ui inverted blue basic icon button big',
                    offsetX: 60,
                    onClick: function( ev ) {
                        //widen
                    }
                } 
            ]
        );

    }

    _p.instance.prototype.buttons_addTiresToAxle = function() {

        var lab = this.editor.container.find("#axles-add-tires");

        var axles = [];
        for( var i = 0 ; i < this.editor.chassis.axles.length ; i++ ) {
            axles.push( this.editor.chassis.axles[i].axleMesh );
        }

        this.createButtons(
            axles,
            lab,
            [
                {
                    type: 'button',
                    innerHTML : '<i class="plus icon"></i>',
                    classes: 'ui inverted blue basic icon button big',
                    onClick: function( ev ) {
                        
                        if( this.selected.tire == null ) {
                            return;
                        }
                        
                        this.chassis.setAxleTire( ev.id , this.selected.tire , VDS.materials.tireStreet , this);

                    }
                },
                {
                    type: 'button',
                    innerHTML : '<i class="expand icon"></i>',
                    classes: 'ui inverted blue basic icon button big',
                    offsetY: 50,
                    onClick: function( ev ) {
                        alert("ok");
                    }
                } 
            ]
        );

    }
 
    _p.instance.prototype.createButtons = function( objects , target , cfg ) {

        target.empty();

        var elements = [];
        var el;
        var pos;
        for( var i = 0 ; i < objects.length ; i++ ) {
 
            pos = this.objectToScreen( objects[i] , this.editor.camera );
            
            elements.push([]);
            for( var j = 0 ; j < cfg.length; j++ ) {

                el = document.createElement( cfg[j].type );
                //el.setAttribute("vds-id",12345);
                el.innerHTML = cfg[j].innerHTML;
                el.className = cfg[j].classes;
                el.style.position = "absolute";
                
                if( typeof cfg[j].onClick == 'function' ) {
                    // This convoluted mess is necessary to avoid the issue of declaration of the iterator within an event, since the event is added after the loop has finished
                    el.onclick = function( args ) {

                        return function() {
                            cfg[args.buttonID].onClick.bind(this.editor)( args );
                        }.bind(this);

                    }.bind(this)({ id: i , screenPos: pos , object: objects[i] , buttonID: j });

                }

                ox = cfg[j].offsetX == undefined ? 0 : cfg[j].offsetX;
                oy = cfg[j].offsetY == undefined ? 0 : cfg[j].offsetY;

                elements[i].push({
                    element: el,
                    offsetX: ox,
                    offsetY: oy
                });
                target.append(el);
 
                // For the offsetWidth/height to work, it must be requested after the element has been appended
                el.style.left = pos.x-el.offsetWidth/2 + ox + "px";
                el.style.top = pos.y-el.offsetHeight/2 + oy +"px";

            }
 
        }

        this.editor.controls.addEventListener( 'change', function(){

            for( var i = 0 ; i < objects.length ; i++ ) {
 
                pos = this.objectToScreen( objects[i] , this.editor.camera );
                 
                for( var j = 0 ; j < elements[i].length; j++ ) {
                
                    elements[i][j].element.style.left = pos.x-elements[i][j].element.offsetWidth/2 + elements[i][j].offsetX + "px";
                    elements[i][j].element.style.top = pos.y-elements[i][j].element.offsetHeight/2 + elements[i][j].offsetY + "px";
                 
                }

            }

        }.bind(this) );

    }

    var selectModes = ["single","multi"];
    _p.instance.prototype.setSelectMode = function( mode ) {

        if( selectModes.indexOf(mode) < 0 ) { return false; }
        this.selectMode = mode;
        return true;

    }
    _p.instance.prototype.getSelectMode = function() {

        return this.selectMode;

    }

    _p.instance.prototype.multiSelect = function() {

        var started = false;
        var offset;
        var sx, sy, cx, cy, fx, fy;
        var selected = [];
        var list;
        var recast = false;

        var outline = this.editor.container.find("#multiselect-outline");

        var down = function( e ){
            
            if( this.selectMode !== "multi" ) { return; }

            started = true;
            offset = this.editor.container.offset();
            
            var px = e.pageX !== undefined ? e.pageX : e.touches[0].pageX;
            var py = e.pageY !== undefined ? e.pageY : e.touches[0].pageY;

            sx = px - offset.left;
            sy = py - offset.top;
            cx = sx;
            cy = sy;

            outline.css({
                top: sy,
                left: sx
            }); 

            recast = false;

            outline.show();
            this.editor.controls.enabled = false;

        };

        var move = function( e ){
            
            if( this.selectMode !== "multi" ) { return; }
            if( !started ) { return; }

            var px = e.pageX !== undefined ? e.pageX : e.touches[0].pageX;
            var py = e.pageY !== undefined ? e.pageY : e.touches[0].pageY;

            cx = px - offset.left;
            cy = py - offset.top;

             
            var w = Math.abs(cx - sx);
            var h = Math.abs(cy - sy);

            if( w <= 5 || h <= 5 ) {
                recast = false;
            } else {
                recast = true;
            }

            var fx = sx;
            var fy = sy;
            if( sx > cx ) { fx = cx; }
            if( sy > cy ) { fy = cy; }
             

            outline.css({
                top: fy,
                left: fx,
                width: w,
                height: h
            });
 

        };

        var up = function( e ){
            
            if( this.selectMode !== "multi" ) { return; }

            started = false;
            outline.hide();
            this.editor.controls.enabled = true;

            outline.css({
                width: 0,
                height: 0
            });

            if( recast ) {

                list = this.getClickableObjects("panel-control-points");
                selected = this.selectByRectangle({
                    targets: list,  
                    sx: sx,
                    sy: sy,
                    ex: cx,
                    ey: cx
                });
                console.log(selected);
    
            }

        };

        this.editor.container.mousedown( down.bind(this) );
        this.editor.container.mousemove( move.bind(this) );
        this.editor.container.mouseup( up.bind(this) );

        this.editor.container.on( "touchstart", down.bind(this) );
        this.editor.container.on( "touchmove", move.bind(this) );
        this.editor.container.on( "touchend" , up.bind(this) );

    }

    _p.instance.prototype.selectByRectangle = function( cfg ) {

        cfg = cfg || {};

        var sx = cfg.sx;
        var sy = cfg.sy;
        var ex = cfg.ex;
        var ey = cfg.ey;
        // Flip values if the rectangle is drawn in the opposite direction on each axis
        if( sx > ex ) { sx = cfg.ex; ex = cfg.sx; }
        if( sy > ey ) { sy = cfg.ey; ey = cfg.sy; }

        var list = cfg.targets;

        var ids = [];
        var objs = [];
        for( var i = 0 ; i < list.length; i++ ) {

            if( this.objectInRectangle( list[i] , sx , sy , ex , ey ) ) {
                objs.push(list[i]);
                ids.push(i);
            }

        }
        return {
            objects: objs,
            indices: ids
        };

    }

    _p.instance.prototype.objectInRectangle = function( obj , sx , sy , ex , ey ) {

        var c = this.objectToScreen( obj , this.editor.camera );
         
        if( c.x >= sx && c.x <= ex && c.y >= sy && c.y <= ey ) {
            return true;
        } 
        return false;

    }

    _p.instance.prototype.objectToScreen = function(obj, camera) {

        var vector = new THREE.Vector3();
        
        // TODO: need to update this when resize window
        var widthHalf = 0.5*this.editor.renderer.context.canvas.width;
        var heightHalf = 0.5*this.editor.renderer.context.canvas.height;
        
        obj.updateMatrixWorld();
        vector.setFromMatrixPosition(obj.matrixWorld);
        vector.project(camera);
        
        vector.x = ( vector.x * widthHalf ) + widthHalf;
        vector.y = - ( vector.y * heightHalf ) + heightHalf;
        
        return { 
            x: vector.x,
            y: vector.y
        };
    
    }

    _p.instance.prototype.alignObjects = function( list , base , margin ) {

        for( var i = 0 ; i < list.length ; i++ ) {

            list[i].position.x = base.x + margin.x*i;
            list[i].position.y = base.y + margin.y*i;
            list[i].position.z = base.z + margin.z*i;

        }

    }

    _p.instance.prototype.menuSelectComponent = function() {
        
        var container = this.editor.container;

        var open = false;
        var menu = container.find("#select-component");
        var content = container.find(".selector");
        content.hide();
        
         
        var delay1 = 300;
        var is_animating = false;
        
        function open_menu( oncomplete ) {

            menu.animate({
                right: "50%", // true = include margins
                top: "50%",
                borderTopLeftRadius: 50, 
                borderTopRightRadius: 50, 
                borderBottomLeftRadius: 50, 
                borderBottomRightRadius: 50
            } , {
                duration: delay1,
                start: function() {

                },
                complete: function(){
                
                    menu.css({transform:"translate("+menu.outerWidth(true)/2+"px,"+"-"+menu.outerHeight(true)/2+"px)"});
                    content.show();
                    menu.html('<i class="times icon"></i>');
                    toggleOptions(content);
                    open=true;
                    is_animating = false;
    
                }.bind(this)
            });

        }

        function close_menu( oncomplete ) {

            toggleOptions(content);

            menu.html('<i class="bars icon"></i>');
                
            menu.delay(500).animate({
                right: "20px",
                top: "30px",
                borderTopLeftRadius: 5, 
                borderTopRightRadius: 5, 
                borderBottomLeftRadius: 5, 
                borderBottomRightRadius: 5
            } , {
                duration: delay1,
                start: function(){
                    content.hide();
                    menu.css({transform:"translate(0px,0px)"});
                }.bind(this),
                complete: function(){
                    
                    if( oncomplete !== undefined && typeof oncomplete == 'function' ) {
                        oncomplete();
                    }
                    open=false;
                    is_animating = false;

                }.bind(this)
            });

        }

        menu.click(function(){

            if( is_animating === true ) {return;}
            is_animating=true;
 
            if( open === false ) {
        
                open_menu.bind(this)();

                
            } else {

                close_menu.bind(this)();

            }
 

        }.bind(this));
        
        var chassis = container.find("#component-chassis");
        var axles = container.find("#component-axles");
        var tires = container.find("#component-tires");
        var rims = container.find("#component-rims");
        var engine = container.find("#component-engine");
        var transmission = container.find("#component-transmission");
        var body = container.find("#component-body");

        var cdiv = container.find("#edit-axles");
        cdiv.css({
            left: "50%",
            top: "50%",
            transform: "translate(-"+cdiv.width()/2+"px,-"+cdiv.height()/2+"px)"
        });

        cdiv.find("#close").click(function(){
            cdiv.fadeOut(300);
        }.bind(this));

        var dtdiv = container.find("#edit-drivetrain");
        dtdiv.css({
            left: "50%",
            top: "50%",
            transform: "translate(-"+dtdiv.width()/2+"px,-"+dtdiv.height()/2+"px)"
        });

        dtdiv.find("#close").click(function(){
            dtdiv.fadeOut(300);
        }.bind(this));

        chassis.click( function() {

            is_animating=true;
            close_menu.bind(this)(
                function() {
 
                    this.current = "frame";
                  
                }.bind(this)
            );

        }.bind(this) ); 

        $('.tabular.menu .item').tab({
            context: $("#edit-axles .content")
        });
        axles.click(function(){
            
            if( this.editor.chassis.axles.length <= 0 ) {

                alert("You need to add axles first.");

                return; // IMPORTANT! Method must exit after this is triggered, otherwise there is no point to it. (Another point: make suspension button disabled at first)
            } 

            is_animating=true;
            close_menu.bind(this)(
                function() {
                    
                    cdiv.fadeIn(300);

                    this.current = "axles";
                     
                }.bind(this)
            );

        }.bind(this));

        var tiresOverlay = container.find("#edit-tires").dimmer({closable:false});
        var tiresClose = tiresOverlay.find("#close");

        tires.click(function(){

            is_animating=true;
            close_menu.bind(this)(
                function() {
                    
                    this.current = "tires";
                    tiresOverlay.dimmer("show");

                }.bind(this)
            );

        }.bind(this));
        tiresClose.click(function(){
            tiresOverlay.dimmer("hide");
        });

        var engineOverlay = container.find("#edit-engine").dimmer({closable:false});
        var transmissionOverlay = container.find("#edit-transmission").dimmer({closable:false});

        var eClose = engineOverlay.find("#close");
        var tClose = transmissionOverlay.find("#close");

        eClose.click(function(){
            engineOverlay.dimmer("hide");
        });
        tClose.click(function(){
            transmissionOverlay.dimmer("hide");
        });

        var engines = VDS.predefined.resources.getComponents("engines");
        var html;
        var e;
        for( var id in engines ) {

            e = engines[id];
         
            html = '<div class="card" id="'+id+'">';
            html += '<div class="image"><img src="images/'+id+'.jpg"></div>';
            html += '    <div class="content">';
            html += '    <div class="header">'+e.name+'</div>';
            html += '    <div class="description" style="text-align:left;">';
            
            html += '       <br/><b>CYLINDERS: </b>'+e.cylinders;
            html += '       <br/><b>CONFIGURATION: </b>'+e.configuration;
            html += '       <br/><b>DISPLACEMENT: </b>'+e.displacement+' L';
            html += '       <br/><b>WEIGHT: </b>'+e.mass+' LBS';
            html += '       <br/><b>TORQUE: </b>'+Math.max(...e.torqueCurve)+' NM';
            html += '       <br/><b>REDLINE: </b>'+e.redline+' RPM';

            if( e.forcedInduction == true ) { 
                html += '       <br/><b>FORCED INDUCTION: </b>'+e.inductionType;
            } else {
                html += '       <br/><b>NATURALLY ASPIRATED</b>';
            }

            html += '   </div>';
            html += '    </div>';
            html += '    <div class="extra content">';
            html += '        <span class="right floated">';
            html += '           <button class="ui green button select-engine">Select</button>';
            html += '        </span>';
            html += '        <span class="">';
                        
            html += '        </span>';
            html += '    </div>';
            html += '</div>';
         

            engineOverlay.find(".cards").append(html);
        }

        var transmissions = VDS.predefined.resources.getComponents("transmissions");
        for( var id in transmissions ) {

            e = transmissions[id];
         
            html = '<div class="card" id="'+id+'">';
            html += '<div class="image"><img src="images/'+id+'.jpg"></div>';
            html += '  <div class="content">';
            html += '    <div class="header">'+e.name+'</div>';
            html += '    <div class="description" style="text-align:left;">';
            
            html += '       <br/><b>TYPE: </b>'+e.type;
            html += '       <br/><b>GEARS: </b>'+(e.gears.length-1);
            html += '       <br/><b>WEIGHT: </b>'+e.mass+' L';
 
 
            html += '    </div>';
            html += '  </div>';
            html += '  <div class="extra content">';
            html += '      <span class="right floated">';
            html += '        <button class="ui green button select-transmission">Select</button>';
            html += '      </span>';
            html += '      <span class="">';
                        
            html += '      </span>';
            html += '   </div>';
            html += '</div>';
         

            transmissionOverlay.find(".cards").append(html);
        }
         

        engine.click(function(){

            is_animating=true;
            close_menu.bind(this)(
                function() {
                     
                    engineOverlay.dimmer("show");

                }.bind(this)
            );

        }.bind(this));

        transmission.click(function(){

            is_animating=true;
            close_menu.bind(this)(
                function() {
                     
                    if( this.editor.drivetrain.engine == null ) {
                        alert("Add an engine first. You can't mount a transmission without one.");
                        return;
                    }

                    transmissionOverlay.dimmer("show");

                }.bind(this)
            );

        }.bind(this));

         
        var bodyContainer = container.find("#edit-body");
        bodyContainer.find('#tab-links .item').tab();
        var bodyOverlay = bodyContainer.dimmer({closable:false});
        var bodyClose = bodyOverlay.find("#close");

        bodyClose.click(function(){
            bodyOverlay.dimmer("hide");
        });
        body.click(function(){

            is_animating=true;
            close_menu.bind(this)(
                function() {
                     
                    bodyOverlay.dimmer("show");

                }.bind(this)
            );

        }.bind(this));


        var rimsOverlay = container.find("#edit-rims").dimmer({closable:false});
        var rimsClose = rimsOverlay.find("#close");

        rimsClose.click(function(){
            rimsOverlay.dimmer("hide");
        });
        rims.click(function(){

            is_animating=true;
            close_menu.bind(this)(
                function() {
                     
                    rimsOverlay.dimmer("show");

                }.bind(this)
            );

        }.bind(this));
         

    }

    _p.instance.prototype.menuComponentBody = function() {

        var container = this.editor.container;
        var compBody = container.find("#component-body");
         

    }

    _p.instance.prototype.menuComponentEngines = function() {

        var container = this.editor.container;

        var compEngine = container.find("#component-engine");
        var editEngine = container.find("#edit-engine");

        var choices = editEngine.find(".card");

        choices.each(function( id ){

            var el = $(choices[id]);
            
            var engineID = el.attr("id");

            var select = el.find(".select-engine");
            select.click(function(){

                var ePos = (this.editor.drivetrain.engine == null || this.editor.drivetrain.engine.position !== undefined) ? 0.2 : this.editor.drivetrain.engine.position;
                this.editor.drivetrain.setEngine( engineID , this.editor.parts["engines"] , ePos );
                editEngine.dimmer("hide");

            }.bind(this));

        }.bind(this));

    }

    _p.instance.prototype.menuComponentTransmissions = function() {

        var container = this.editor.container;

        var compTran = container.find("#component-transmission");
        var editTran = container.find("#edit-transmission");

        var choices = editTran.find(".card");

        choices.each(function( id ){

            var el = $(choices[id]);
            
            var tranID = el.attr("id");

            var select = el.find(".select-transmission");
            select.click(function(){
 
                this.editor.drivetrain.setTransmission( tranID , this.editor.parts["transmissions"] );
                editTran.dimmer("hide");

            }.bind(this));

        }.bind(this));

    }

    _p.instance.prototype.menuComponentTires = function() {
        
        var container = this.editor.container;

        var modal = container.find("#edit-tires");
        var add = modal.find("#add-tire");
        var tires = modal.find("#parts-tires");
        var preview = modal.find("#tire-preview");
        var options = modal.find("#tire-options");
        var debug = modal.find("#debug");
        options.hide();
        preview.hide();
 

        var update = options.find("#update");
        var mount = options.find("#mount");

        var inputDivs = options.find("input");
        var input = {};
        inputDivs.each(function(index){
            var el = $(this);
            var id = el.attr("id");
            input[ id ] = el;
        });
        
        // Viewport initialization for the tires
        var scene, camera, renderer, controls, dirlight, ambient;
        function setupViewport() {

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera( 45, preview.width()/preview.height(), 0.1, 200 );
            renderer = new THREE.WebGLRenderer({antialias: true});
            renderer.setSize( preview.width(), preview.height() );
            preview.append( renderer.domElement );
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
            scene.background = new THREE.Color("#444");
            dirlight = new THREE.DirectionalLight( "#FFFFFF" );
            dirlight.position.set( -10, 10, 10 );
            dirlight.castShadow = true;
            ambient = new THREE.AmbientLight( "#fff" );
            scene.add(dirlight);
            scene.add(ambient);
            controls = this.editor.orbitControls( camera , renderer , 100 , 2 , 0.8 , 0.5 );
            

            var radius = 25;
            var radials = 16;
            var circles = 8;
            var divisions = 64;

            var helper = new THREE.PolarGridHelper( radius, radials, circles, divisions );
            helper.rotation.x = Math.PI/2;
            scene.add( helper );

        }

        setupViewport.bind(this)();
         

        function update_viewport() { 
            requestAnimationFrame( update_viewport );
            renderer.render( scene , camera );
        }
        
        update_viewport();
        // Resize editor when browser window/container dimensions change
        function onWindowResize(){
            camera.aspect = preview.width()/preview.height();
            camera.updateProjectionMatrix();
            renderer.setSize( preview.width(), preview.height() );
        }
        window.addEventListener( 'resize', onWindowResize.bind(this), false );
 
        var currentTire = null;


        function getInputVals() {

            var o = {};
            for( var p in input ) {
                o[p] = parseFloat(input[p].val());
            }
            return o;
   
        }

        function updateInputVals( cfg ) {
            for( var p in input ) {
                input[p].val(cfg[p]);
            }
      
        }
 

        function renderDebug( tire , geo , cfg ) {

            var data = tire.getLastRender();

            // Calculate traction coefficients for this tire 
            tC = data._traction;
            var tctext = "";
            for( var i in tC ) {
                tctext += tC[i].toFixed(2) + " ("+i+") | ";
            }

            debug.html(
                "Triangles: " + geo.faces.length 
                +"<br/> Vertices: " 
                + geo.vertices.length 
                + "<br/> Tire Code: "+cfg.tireWidth+"/"+cfg.aspectRatio+"R"+cfg.rimDiameter 
                + "<br/> Tire Mass: "+data._mass.toFixed(2) + " lbs"
                + "<br/> Traction: " + tctext
            );

        }

        add.click(function(){
            
            var newTire = new VDS.module.tire.instance( 205 , 55 , 16 , 0 , 30 , {} );
            var tireID = "tire-" + THREE.Math.generateUUID();
            this.editor.addPart( "tires" , tireID , newTire );

            // Add an empty mesh to the scene. The geometry will be set later
            var tMesh = new THREE.Mesh( new THREE.Geometry() , VDS.materials.tireStreet );
            var tMesh2 = tMesh.clone();
            tMesh.VDS = {
                type: "tire",
                uuid: tireID
            };

            scene.add(tMesh2);
            this.editor.scene.add(tMesh);
            // Add the clickable events for this mesh and re-align all tires
            this.addClickableObject( "tire-instances" , tMesh );
            this.alignObjects( this.clickable["tire-instances"].objects , new THREE.Vector3(-50,0,-150) , new THREE.Vector3(40,0,0) );
            //dMesh.position.y = tire.calculateTireRadius();

            var b = document.createElement("button");
            b.setAttribute("tire-id" , tireID ); // Internal attribute used to access the editor's parts object
            b.setAttribute("class","ui inverted blue basic icon button");
            b.innerHTML = tireID+'<br/>';

            b.onclick = function(){
  
                options.show(); // Set the column to visible
                preview.show(); // Set the preview scene to visible

                camera.position.set(-40,40,40);
                camera.lookAt(0,0,0);
                controls.target = new THREE.Vector3(0,0,0);

                currentTire = tireID;
                var tire = this.editor.getPart( "tires" , currentTire );
                var cfg = tire.getLastRender();

                if( cfg === false ) {
                    
                    cfg = getInputVals();
                    console.log(cfg);

                } else { 
 
                    updateInputVals( cfg );

                }
                
                tire.setProperties( cfg );

                var geo = tire.constructTireGeometry2( cfg );
                tMesh.geometry.dispose();
                tMesh.geometry = geo.clone();

                tMesh2.geometry.dispose();
                tMesh2.geometry = geo.clone();
                 
                renderDebug( tire , geo , cfg );

            }.bind(this);

            tires.append( b );
       
        }.bind(this));

        // Figure out a way to allow access to tMesh in update without causing a switch from one tire to another to update only the last one.
        update.click(function(){
            
            if( currentTire == null ) {
                return;
            }
 
            var tire = this.editor.getPart( "tires" , currentTire );

            var cfg = getInputVals();
             
            tire.setProperties( cfg );
             
            var geo = tire.constructTireGeometry2( cfg );
            tMesh.geometry.dispose();
            tMesh.geometry = geo;

            renderDebug( tire , geo , cfg );

        }.bind(this));

        function mountTire() {

            if( currentTire == null ) {
                return;
            }
 
            var tire = this.editor.getPart( "tires" , currentTire );
            
            var id = this.editor.activeAxle < 0 ? 0 : this.editor.activeAxle;
            this.editor.chassis.setAxleTire( id , tire , VDS.materials.tireStreet , this.editor );

        }
        
        mount.click(mountTire.bind(this));
 

    }


    _p.instance.prototype.createSlideMenu = function( toggleDiv , menuDiv , clickEvents ) {

        var menu = this.editor.container.find( menuDiv );
        menu.hide();
        var open = false;
        var animating = false;
        var delay = 250;

        var toggle = this.editor.container.find( toggleDiv );

        toggle.click(function(){

            if( animating === true ) {return;}
            animating = true;

            if( open === false ) {
                 
                menu.animate({width:'toggle'},delay,"swing",function(){
                    open = true;
                    animating = false;
                });
                 
            } else {
                 
                menu.animate({width:'toggle'},delay,"swing",function(){
                    open = false;
                    animating = false;
                });
                 
            }

        }.bind(this));

        var buttons = menu.find("button");

        buttons.each( function(index) {
            
            var b = $(buttons[index]);
            var id = b.attr("id");

            b.click(function(){

                if( clickEvents[id] !== undefined && typeof clickEvents[id] == 'function' ) {
                    clickEvents[id]( this.editor , buttons , b , toggle );
                }

            }.bind(this));

        }.bind(this));

    }
   


    var radialMenuAngleStart = -360;

    // jquery rotate animation
    function rotate(li,d) {
        
        $({d:radialMenuAngleStart}).animate({d:d}, {
            step: function(now) {
                $(li)
                .css({ transform: 'rotate('+now+'deg)' })
                .find('label')
                    .css({ transform: 'rotate('+(-now)+'deg)' });
            }, duration: 0
        });

    }

    // show / hide the options
    function toggleOptions(s) {

        s.toggleClass('open');
        var li = s.find('li');
        var deg = s.hasClass('half') ? 180/(li.length-1) : 360/li.length;

        for(var i=0; i<li.length; i++) {
            var d = s.hasClass('half') ? (i*deg)-90 : i*deg;
            s.hasClass('open') ? rotate(li[i],d) : rotate(li[i],radialMenuAngleStart);
        }

    }

    return _p;

})({});