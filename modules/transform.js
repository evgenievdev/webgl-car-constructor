var FOUR = FOUR || {};

FOUR.Transform3D = function( options ) {

    options = options || {};

    // Reference to the THREE.Scene and THREE.Camera instances
    this.renderer = options.renderer;
    this.scene = options.scene;
    this.camera = options.camera;

    // Configuration 
    this.cfg = {
        axes: [],       // Active axes 
        mode: 0,        // 0 = move , 1 = rotate , 2 = scale
        targets: []     // An array of objects
    };

    // Pivot point used for translations of objects (important for multi-select)
    this.pivot = new THREE.Group();   
    this.scene.add( this.pivot );

    // Event methods assigned for various 
    this.events = {
        onInit: [],
        onTransformStart: [],
        onTransforming: [],
        onTransformEnd: [],
        onDestroy: []
    };

    // All 3D objects used by Raycaster to indicate transform mode
    this.gizmos = new Array(3);

    // The current rotation 
    this.rotation = new THREE.Euler();

    // Record the transformations for undo, redo
    this.history = [];
    this.currentStep = 0;

    this.build();
    this.gizmoEvents();
    

}

FOUR.Transform3D.prototype.setEvents = function( on , callback , append ) {

    if( this.events[on] == undefined ) { return false; }

    if( append !== true ) { this.events[on] = []; }

    // You can add a single event, or an array of events to be executed consecutively
    if( typeof callback == "function" ) { callback = [callback]; }

    for( var i = 0 ; i < callback.length; i++ ) {

        this.events[on].push(
            callback[i]
        );

    }

    return true;

};

FOUR.Transform3D.prototype.gizmoEvents = function() {

    var rc = new THREE.Raycaster();
    var transforming = false;

    // The renderer is needed to calculate cursor/touch coordinates accurately
    var div = this.renderer.domElement;
    var w = div.offsetWidth;
    var h = div.offsetHeight;

    var sx = 0;
    var sy = 0;
    var cx = 0;
    var cy = 0;
    var px,py,px2,py2;
    var axis, mode;
    var startPoint;
    var pivotStart;
    var startTime, endTime;
    var screen, dScreen;

    var transformStart = function( e ) {

        if( transforming ) { return; }

        sx = e.clientX == undefined ? e.touches[0].clientX : e.clientX;
        sy = e.clientY == undefined ? e.touches[0].clientY : e.clientY;

        px = (sx/ w - 0.5)*2;
        py = (0.5 - sy / h)*2;
         
        screen = { x: px , y: py };
        var targets = this.getGizmoComponents();
        var hit = FOUR.Generic.projectCoordinates( screen, this.camera , targets );
        if( hit === false ) { return; }
        transforming = true;
      
        var o = hit[0];
        startPoint = o.point;
        pivotStart = this.pivot.position.clone();
        axis = o.object.axis;
        mode = this.getMode();
        startTime = performance.now();
        dScreen = { x: 0 , y: 0 };

        // ---------------------------------------------------------------------------------------------------------------
        // Call custom events on TRANSFORM START
        // ---------------------------------------------------------------------------------------------------------------
            var ce = this.events.onTransformStart;
            if( ce.length ) {

                for(var i=0;i<ce.length;i++) {

                    if( typeof ce[i] !== "function" ) {continue;}

                    ce[i]({
                        targets: this.pivot.children,
                        pivot: this.pivot,
                        axis: axis,
                        mode: mode,
                        screen: screen
                    });
                    
                }

            }
        // ---------------------------------------------------------------------------------------------------------------
 

    };

    var transformChange = function( e ) {

        if( !transforming ) { return; }
        e.stopPropagation();
        e.preventDefault();

        var t1 = performance.now();

        cx = e.clientX == undefined ? e.touches[0].clientX : e.clientX;
        cy = e.clientY == undefined ? e.touches[0].clientY : e.clientY;
        px2 = (cx/ w - 0.5)*2;
        py2 = (0.5 - cy / h)*2;
         
        // Translate
        if( mode == 0 ) { 

            var offset = new THREE.Vector3().subVectors( startPoint, pivotStart );
            var plane;
            var fixed1 = false;
            var fixed2 = false;
            if( axis == "xz" || axis == "z" ) { plane = "z"; if(axis=="z"){ fixed1 = "x"; fixed2 = "y"; } else { fixed1 = "y"; fixed2 = false; } }
            if( axis == "xy" || axis == "x" ) { plane = "x"; if(axis=="x"){ fixed1 = "y"; fixed2 = "z"; } else { fixed1 = "z"; fixed2 = false; } }
            if( axis == "yz" ) { plane = "y"; fixed1 = "x"; fixed2 = false; }
            if( axis == "y" ) { plane = "x"; fixed1 = "x"; fixed2 = "z"; }

            this.gizmos[ mode ].hitplanes[plane].visible=true;
            var hit = FOUR.Generic.projectCoordinates( screen, this.camera , [this.gizmos[ mode ].hitplanes[plane]] );
            this.gizmos[ mode ].hitplanes[plane].visible=false;
            if( hit == false ) { return; }
             
            var pt = hit[0].point;
             
            var vec3 = pt.clone().sub( offset );
            if( fixed1 !== false ) { 
                vec3[fixed1] = this.pivot.position[fixed1];
            }
            if( fixed2 !== false ) { 
                vec3[fixed2] = this.pivot.position[fixed2];
            }

            this.transformTargets("position",vec3);
        
        } 
        // Rotate
        else if( mode == 1 ) {

            var oang = Math.atan2( py2-py , px2-px );

            var nr = this.pivot.rotation.clone();
            if( axis == "x" ) { nr.set( nr.x , nr.y  , nr.z - dScreen.x ); }
            if( axis == "y" ) { nr.set( nr.x , nr.y + dScreen.x , nr.z ); }
            if( axis == "z" ) { nr.set( nr.x - dScreen.x , nr.y , nr.z ); }

            this.transformTargets("rotation", nr );

        }
        // Scale
        else if( mode == 2 ) {

            var ns = this.pivot.scale.clone();

            if( axis == "x" ) { ns.x += dScreen.x; }
            else if( axis == "y" ) { ns.y += dScreen.y; }
            else if( axis == "z" ) { ns.z += -dScreen.y; }
            else if( axis == "xy" ) { ns.x += dScreen.x; ns.y += dScreen.y; }
            else if( axis == "xz" ) { ns.x += dScreen.x; ns.z += -dScreen.y; }
            else if( axis == "yz" ) { ns.z += dScreen.x; ns.y += -dScreen.y; }

            this.transformTargets("scale", ns );

        }
        
        var t2 = performance.now() - t1;

        dScreen.x = px2 - screen.x;
        dScreen.y = py2 - screen.y;
        screen = { x: px2 , y: py2 };


        // ---------------------------------------------------------------------------------------------------------------
        // Call custom events on TRANSFORMING
        // ---------------------------------------------------------------------------------------------------------------
            var ce = this.events.onTransforming;
            if( ce.length ) {

                for(var i=0;i<ce.length;i++) {

                    if( typeof ce[i] !== "function" ) {continue;}

                    ce[i]({
                        targets: this.pivot.children,
                        pivot: this.pivot,
                        axis: axis,
                        mode: mode,
                        value: vec3,
                        screen: screen
                    });
                    
                }

            }
        // ---------------------------------------------------------------------------------------------------------------

    };

    var transformEnd = function( e ) {

        if( !transforming ) { return; }
        transforming = false;
        endTime = performance.now();

        // Once the objects are transformed, if the current step is not the last in the history array, anything past it should be removed
        // Example: Transform -> Transform -> Transform -> Undo -> Undo -> Transform -> Result: Remove last element from history array
        var hisLast = this.history.length-1;
        if( this.currentStep < hisLast ) {
            this.history.splice( this.currentStep+1 , hisLast );
        }
        // Add the transformation step to history and set the current step index to the last element in the array
        this.currentStep = this.history.push({
            position: this.pivot.position.clone(),
            rotation: this.pivot.rotation.clone(),
            scale: this.pivot.scale.clone()
        }) - 1;


        // ---------------------------------------------------------------------------------------------------------------
        // Call custom events on TRANSFORM END
        // ---------------------------------------------------------------------------------------------------------------
            var ce = this.events.onTransformEnd;
            if( ce.length ) {

                for(var i=0;i<ce.length;i++) {

                    if( typeof ce[i] !== "function" ) {continue;}

                    ce[i]({
                        targets: this.pivot.children,               // The target objects attached to the transform tool
                        pivot: this.pivot,                          // The pivot group (holding all targets)
                        axis: axis,                                 // The final transformation axis
                        mode: mode,                                 // The transform mode
                        transformDuration: endTime - startTime,     // Total time it took for this transformation (in milliseconds)
                    });
                    
                }

            }
        // ---------------------------------------------------------------------------------------------------------------


    };

    // Desktop mouse events
    div.onmousedown = transformStart.bind(this);
    div.onmousemove = transformChange.bind(this);
    div.onmouseup   = transformEnd.bind(this);
    // Touch screen events
    div.ontouchstart = transformStart.bind(this);
    div.ontouchmove  = transformChange.bind(this);
    div.ontouchend   = transformEnd.bind(this);

}

FOUR.Transform3D.prototype.applyHistoryStep = function( step ) {

    // No element in the history array => can't transform
    var n = this.history.length;
    if( n <= 0 ) { return false; }
    console.log(step);
    // The current step is out of bounds => can't transform
    if( step < 0 || step >= n ) { return false; }

    // Perform history step transformation
    var d = this.history[step];
    this.transformTargets("position",d.position);
    this.transformTargets("rotation",d.rotation);
    this.transformTargets("scale",d.scale);

    // Update current step index
    this.currentStep = step;

    return true;

}

FOUR.Transform3D.prototype.undoStep = function() {

    return this.applyHistoryStep( this.currentStep-1 );

}

FOUR.Transform3D.prototype.redoStep = function() {

    return this.applyHistoryStep( this.currentStep+1 );

}

FOUR.Transform3D.prototype.firstStep = function() {

    return this.applyHistoryStep( 0 );

}

FOUR.Transform3D.prototype.lastStep = function() {

    return this.applyHistoryStep( this.history.length-1 );

}

FOUR.Transform3D.prototype.build = function() {

    this.buildTranslate();
    this.buildRotate();
    this.buildScale();

    this.addGizmosToScene();

}

FOUR.Transform3D.prototype.buildAxes = function( cfg ) {

    cfg = cfg || {};

    var res = {};

    var arrowOrigin = new THREE.Vector3();
    var arrowLength = cfg.arrowLength == undefined ? 30 : cfg.arrowLength;
    var arrowHL = cfg.arrowHL == undefined ? 4 : cfg.arrowHL;
    var arrowHW = cfg.arrowHW == undefined ? 2 : cfg.arrowHW; 
    var xColor = cfg.xColor == undefined ? "#FF0000" : cfg.xColor;
    var yColor = cfg.yColor == undefined ? "#00FF00" : cfg.yColor;
    var zColor = cfg.zColor == undefined ? "#0000FF" : cfg.zColor;

    var x,y,z;
    if( cfg.circularAxes === true ) {

        var cg = new THREE.Geometry();
        cg.vertices = FOUR.Polygon.circle( 40 , arrowLength );

        x = new THREE.Line( cg , new THREE.LineBasicMaterial({ color: xColor }) ); x.axis = "x";
        y = new THREE.Line( cg , new THREE.LineBasicMaterial({ color: yColor }) ); y.axis = "y"; y.rotation.set( Math.PI/2 , 0 , 0 );
        z = new THREE.Line( cg , new THREE.LineBasicMaterial({ color: zColor }) ); z.axis = "z"; z.rotation.set( 0 , Math.PI/2 , 0 );

    } else { 

        x = new THREE.ArrowHelper( new THREE.Vector3(1,0,0) , arrowOrigin, arrowLength, xColor , arrowHL , arrowHW ); x.axis = "x"; x.children[0].axis="x"; x.children[1].axis="x";
        y = new THREE.ArrowHelper( new THREE.Vector3(0,1,0) , arrowOrigin, arrowLength, yColor , arrowHL , arrowHW ); y.axis = "y"; y.children[0].axis="y"; y.children[1].axis="y"; 
        z = new THREE.ArrowHelper( new THREE.Vector3(0,0,1) , arrowOrigin, arrowLength, zColor , arrowHL , arrowHW ); z.axis = "z"; z.children[0].axis="z"; z.children[1].axis="z";
    
    }

    res.x = x;
    res.y = y;
    res.z = z;

    if( cfg.planes === true ) { 

        // Plane Geometry
        var pw = arrowLength*0.3;
        var ph = arrowLength*0.3;
        var pg;
        // Scale gizmo uses triangles for the plane handles
        if( cfg.triangles === true ) {
            pg = new THREE.Geometry();
            pg.vertices = [
                new THREE.Vector3(-pw/2 , -ph/2 , 0 ),
                new THREE.Vector3( pw/2 , -ph/2 , 0 ),
                new THREE.Vector3( -pw/2 , ph/2 , 0 ) 
            ];
            pg.faces = [ new THREE.Face3( 0,1,2 ) ];
        } else {
            pg = new THREE.PlaneGeometry( pw , ph );
        }
        var pm = new THREE.MeshBasicMaterial( {color: "#FFFF00", transparent: true , opacity: 0.5, side: THREE.DoubleSide} );

        var xy = new THREE.Mesh( pg , pm ); xy.position.set( pw/2 , ph/2 , 0 ); xy.axis = "xy";
        var xz = new THREE.Mesh( pg , pm ); xz.position.set( pw/2 , 0 , ph/2 ); xz.rotation.x = Math.PI/2; xz.axis = "xz";
        var yz = new THREE.Mesh( pg , pm ); yz.position.set( 0 , ph/2 , pw/2 ); yz.rotation.y = -Math.PI/2; yz.axis = "yz";

        res.xy = xy;
        res.xz = xz;
        res.yz = yz;

    }

    return res;
 
}

FOUR.Transform3D.prototype.buildHitplanes = function() {

    var pm = new THREE.MeshBasicMaterial( {color: "#000000", transparent: true , opacity: 0.0, side: THREE.DoubleSide} );
    var bpg = new THREE.PlaneGeometry( 1000000 , 1000000 );
    var px = new THREE.Mesh( bpg , pm ); px.visible = false;
    var py = new THREE.Mesh( bpg , pm ); py.rotation.y = Math.PI/2; py.visible = false;
    var pz = new THREE.Mesh( bpg , pm ); pz.rotation.x = Math.PI/2; pz.visible = false;

    return {
        x:px,
        y:py,
        z:pz
    };

}

FOUR.Transform3D.prototype.buildGizmo = function( mode ) { 

    var group = new THREE.Group();

    if( mode == 0 || mode == 2 ) {
 
        var axes = this.buildAxes({
            triangles: mode == 2 ? true : false,
            planes: true
        });
        for( var k in axes ) {
            group.add( axes[k] );
        }
        
        var planes = this.buildHitplanes();
        for( var k in planes ) {
            group.add( planes[k] );
        }    

        this.gizmos[mode] = {
            group: group,       // Useful for hiding/showing element at once without iterating through object
            axes: axes,
            hitplanes: planes
        }

    } else if( mode == 1 ) {

        var axes = this.buildAxes({
            planes: false,
            circularAxes: true
        });
        for( var k in axes ) {
            group.add( axes[k] );
        }
         
        this.gizmos[mode] = {
            group: group,       
            axes: axes 
        }

    }  

}

FOUR.Transform3D.prototype.buildTranslate = function() {

    return this.buildGizmo(0);

}

FOUR.Transform3D.prototype.buildScale = function() {

    return this.buildGizmo(2);

}

FOUR.Transform3D.prototype.buildRotate = function() {

    return this.buildGizmo(1);

}
 

FOUR.Transform3D.prototype.addGizmosToScene = function() {

    this.removeGizmosFromScene();

    for( var i = 0 ; i < this.gizmos.length; i++ ) {

        if( this.gizmos[i] !== undefined && this.gizmos[i].group !== undefined ) {
            this.scene.add( this.gizmos[i].group );
        }

    }

}

FOUR.Transform3D.prototype.removeGizmosFromScene = function() {

    for( var i = 0 ; i < this.gizmos.length; i++ ) {

        if( this.gizmos[i] !== undefined && this.gizmos[i].group !== undefined ) {
            this.scene.remove( this.gizmos[i].group );
        }

    }

}

FOUR.Transform3D.prototype.toggleGizmo = function( i , visible ) {

    if( i < 0 || i >= this.gizmos.length || this.gizmos[i] == undefined || this.gizmos[i].group == undefined ) {
        return false;
    }

    this.gizmos[i].group.visible = visible === true ? true : false;

    return true;

}

FOUR.Transform3D.prototype.hideGizmo = function( i ) {

    return this.toggleGizmo( i , false );
}

FOUR.Transform3D.prototype.showGizmo = function( i ) {

    return this.toggleGizmo( i , true );

}

FOUR.Transform3D.prototype.show = function() {

    var m = this.cfg.mode;

    for( var i = 0 ; i < this.gizmos.length; i++ ) {

        if( m === i ) { 
            this.showGizmo( i );
        } else { 
            this.hideGizmo( i );
        }

    }

}

FOUR.Transform3D.prototype.hide = function() {

    for( var i = 0 ; i < this.gizmos.length; i++ ) {
 
        this.hideGizmo( i );

    }

}

FOUR.Transform3D.prototype.setMode = function( mode ) {

    // Illegal mode
    if( mode < 0 || mode > 2 ) { return false; }

    this.cfg.mode = mode;
    this.show();

    return true;

}

FOUR.Transform3D.prototype.getMode = function() {

    var m = this.cfg.mode;
    if( m < 0 || m > 2 ) { return false; }
    return m;

}

FOUR.Transform3D.prototype.setAxes = function( axes ) {

    if( !axes.length ) { axes = [axes]; }
    this.cfg.axes = axes;

    for( var i = 0 ; i < this.gizmos.length; i++ ) {

        if( this.gizmos[i] == undefined || this.gizmos[i].group == undefined ) { continue; }
        
        for( var p in this.gizmos[i].axes ) {
 
            if( this.cfg.axes.indexOf( p ) >= 0 ) { 
                this.gizmos[i].axes[p].visible = true;
            } else {
                this.gizmos[i].axes[p].visible = false;
            }

        }

    }

}

FOUR.Transform3D.prototype.clearTargets = function() {

    // Reset group of children attached to the pivot point
    for( var i = 0 ; i < this.pivot.children.length; i++ ) {
        this.pivot.children[i].remove();
    }
    this.pivot.children = [];

}

FOUR.Transform3D.prototype.getGizmoComponents = function() {

    mode = this.cfg.mode; 
    // Illegal mode
    if( mode < 0 || mode > 2 ) { return false; }

    var l = [];

    var o;
    for( var p in this.gizmos[mode].axes ) {
        
        o = this.gizmos[mode].axes[p];
        if( o.children.length <= 0 ) { 
            l.push( o );
        } else {
            for(var c = 0;c<o.children.length;c++){
                l.push(o.children[c]);
            }
        }

    }

    return l;

}

FOUR.Transform3D.prototype.attach = function( t , append ) {

    // t can be a single mesh or an array of meshes. If it is a single mesh, convert the parameter to an array with 1 element for code simplicity
    if( !t.length || (t.length && t.length <= 0) ) { t = [t]; }
    // If append is set to true, then the objects in "t" will be added to the currently attached objects. Otherwise  
    if( append !== true ) { 
        for( var i = 0 ; i < this.pivot.children.length; i++ ) {
            t.push( this.pivot.children[i] );
        }
    }
    // Clear all targets from the group before adding the new ones. Quick way to recalculate centroids, etc. without extra code
    this.clearTargets();
    // Get the center point of the target objects. 
    var center = FOUR.Generic.getObjectsCenter( t );
    // Move all target objects to Euclidean origin (their centre point is at origin, but the relative structure of the targets array remains)
    FOUR.Generic.moveObjectsTo( t , new THREE.Vector3() );
    // Reset the transform properties of the pivot
    this.pivot.position.set(0,0,0);
    this.pivot.scale.set(1,1,1);
    this.pivot.rotation.set(0,0,0);
    // Add target meshes to the pivot group.
    for( var i = 0 ; i < t.length; i++ ) {
        this.pivot.add( t[i] );
    }
    // Move the pivot group back to the original center point of the target objects after they have been added as children
    // This essentially places the pivot at the center of the target objects, but AFTER they have been added as children.
    // This way their relative positions to the position of the pivot will be the same as their relative positions would be to the center point among all objects.
    // It should be done this way ONLY, and not by positioning the group object in the center before adding the targets, 
    // otherwise the transformation methods for the group will cause calculation inconsistencies!
    this.pivot.position.copy( center );

    // Reset the transform history array and add the initial step
    this.history = [];
    this.currentStep = this.history.push({
        position: this.pivot.position.clone(),
        rotation: this.pivot.rotation.clone(),
        scale: this.pivot.scale.clone()
    })-1;
     
    // Reposition gizmos to the pivot point location
    this.positionGizmos( this.pivot.position );
    // Make the active gizmo visible in the scene.
    this.show();

}

 

FOUR.Transform3D.prototype.detach = function() {

    // Since transform targets are added as children to a pivot group, their position becomes local.
    // When detaching objects it must be converted to global coordinates
    var temp = [];
    var pos = [];
    for( var i = 0 ; i < this.pivot.children.length; i++ ) {
        temp.push( this.pivot.children[i] );
        pos.push( this.pivot.localToWorld(temp[i].position) );
    }

    // Empty the pivot group's children array and hide the gizmos
    this.clearTargets();
    this.hide();
    
    // Position former target objects to correct global location
    for( var i = 0 ; i < temp.length; i++ ) {

        temp[i].position.copy( pos[i] );

    }

    // Reset the transform history array
    this.history = [];

}

FOUR.Transform3D.prototype.transformGizmos = function( action , val ) {

    var actions = ["position","rotation","scale"];
    if( actions.indexOf( action ) < 0 ) { return false; }

    for( var i = 0 ; i < this.gizmos.length; i++ ) {

        if( this.gizmos[i] == undefined || this.gizmos[i].group == undefined ) { continue; }
       
        this.gizmos[i].group[ action ].copy( val );
        

    }

    return true;

}


FOUR.Transform3D.prototype.positionGizmos = function( vec3 ) {

    return this.transformGizmos("position",vec3);

}

FOUR.Transform3D.prototype.scaleGizmos = function( vec3 ) {

    return this.transformGizmos("scale",vec3);

}

FOUR.Transform3D.prototype.rotateGizmos = function( euler ) {

    return this.transformGizmos("rotation",euler);

}

FOUR.Transform3D.prototype.transformTargets = function( action , val ) {

    var actions = ["move","position","rotation","scale"];
    if( actions.indexOf( action ) < 0 || this.pivot.children.length <= 0 ) { return false; }
    
    if( action == "move" ) {
        this.pivot.position.add( val );
    } else {
        this.pivot[action].copy( val );
    }

    this.positionGizmos( this.pivot.position );

    return true;

}
