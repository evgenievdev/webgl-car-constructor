var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.load = (function( _p ) {

    _p.project = function( cfg ) {

        cfg = cfg || {};

        var editor = cfg.editor;
        var directory = cfg.directory || "projects/";
        var projectName = cfg.projectName || editor.projectName;
        var fileName = cfg.fileName || "project-data.json";

        var path = directory + projectName + "/";

        // Load Panels
        $.get( "../modules/importData.php" , {

            "path": path,
            "filename": fileName

       }).done(function( response ) {

            var data = JSON.parse( response );
             
            _p.panels( editor , data.panels );
            _p.materials( editor , data.materials );
            _p.tires( editor , data.tires );
            _p.drivetrain( editor , data.drivetrain );

        });

    } 

    _p.drivetrain = function( editor , data ) {

        if( data == undefined ) { return; }
        if( data.engine == undefined ) { return false; }

        editor.drivetrain.setEngine( data.engine.id, editor.parts["engines"] , parseFloat(data.engine.position) );

        if( data.transmission == undefined ) {
            return false;
        }

        editor.drivetrain.setTransmission( data.transmission.id , editor.parts["transmissions"] );

    }

    _p.tires = function( editor , data ) {

    }

    _p.materials = function( editor , data ) {

        var mats = data;

        for( var m in mats ) {

            var mat = mats[m];

            editor.materials.newMaterial( m , {
                color: mat.color ,
                envMapIntensity: mat.envMapIntensity ,
                metalness: mat.metalness,
                roughness: mat.roughness,
                transparent: mat.transparent,
                opacity: mat.opacity,
                wireframe: mat.wireframe
            });

            
            for( var i = 0 ; i < mat.appliedTo.length; i++ ) {

                // Find the object mesh by UUID.
                var uuid = mat.appliedTo[i];
                var obj = editor.getObjectByUUID( uuid );
               
                if( obj == null || obj == undefined ) { continue; }
                
                editor.materials.applyMaterial( m , obj );

            }

        }
        
        // Update material positions
        editor.materials.renderMaterialMeshes(
            new THREE.Vector3(0,0,-100),
            new THREE.Vector3(1,0,0),
            25,
            8
        );

        // Update clickables
        var clickables = editor.materials.buildClickables();
        editor.gui.setClickableObjects( "materials-clickable" , clickables );

        // Visibility update
        if( editor.editMode == "panels" ) {
            editor.materials.toggleMaterials( true );
        } else {
            editor.materials.toggleMaterials( false );
        }

    }

    _p.panels = function( editor , data ) {
         
        var body = editor.body;
 
        for( var g in data) {

            var group = data[g];
            
            for( var p in group ) {

                var panelData = group[p];

                var cpts = new Array(panelData.curves.length);
                var curves = new Array(panelData.curves.length);

                for( var i = 0 ; i < panelData.curves.length; i++ ) {

                    cpts[i] = new Array(panelData.curves[i].length);
                    for(var j = 0 ; j < panelData.curves[i].length; j++ ) {

                        var pt = panelData.curves[i][j];
                        cpts[i][j] = new THREE.Vector3(pt.x,pt.y,pt.z);

                    }

                    curves[i] = new THREE.CatmullRomCurve3( cpts[i] );

                }


                var panel = new VDS.module.panel.instance( editor , {
                    id: panelData.id,
                    curves: curves,
                    order: panelData.order,
                    numPoints: panelData.numPoints,
                    stepsBetweenCurves: panelData.stepsBetweenCurves,
                    offset: new THREE.Vector3(0,0,0) 
                });
                
                panel.mesh.castShadows = true;
             
                editor.scene.add( panel.mesh );
        
                // VDS properties object (used by raycasters to determine which is which)
                panel.mesh["vds"] = {
                    group: g,
                    id: panel.id
                };
        
                editor.body.addPanel( panel.id , g , panel , true );
 

            }

        }

         

    }

    return _p;

})({});