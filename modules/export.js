var VDS = VDS || {};

VDS.export = (function( _public ) {
    
    /**
     * Export all 3D objects from an editor instance into a directory.
     * The objects considered must be loaded into the editor's scene.
     * 
     */
    _public.designFromEditor = function( editor , dir ) {

         
        var onFinish = function( editor, worker ) {

            var exporter = new THREE.OBJExporter();
            //var result = exporter.parse( editor.scene );

            // Compile a list with all models
            var files = editor.compilePartsList({
                frame: true,
                axles: true,
                tires: true,
                rims: true,
                brakes: true,
                body: true,
                drivetrain: true // Exporting very large models will cause out of memory exception
            });
            // Get the file names
            var names = new Array( files.length );
            for( var i = 0 ; i < files.length; i++ ) {

                names[i] = files[i][ "name" ];
            
            }

            
            
            // Export 3D model data for each model in the files list (string format)
            var objData = [];
            var fData;
            var fName;
            for( var i = 0 ; i < files.length; i++ ) {
    
                fName = names[i] + ".obj";
                if( names[i] == undefined || names[i].trim() === "" ) {
                    fName = "file-"+i+".obj";
                }
                fData = exporter.parse(files[i]);
                objData.push(fData);

                $.post( "../modules/exportData.php" , {
                    "path": dir,
                    "filename": fName,
                    "data": fData
                }).done(function( response ) {
                    console.log( response );
                });
            

            }
 
            var vConfigData = _public.designXML( editor );
            console.log(dir);
            $.post( "../modules/exportData.php" , {
                "path": dir,
                "filename": "vehicle-configuration.xml",
                "data": vConfigData
            })

        };

        editor.calculateCOG();
        editor.aerodynamicSimulation({
            onFinish: onFinish
        });
 
    }

    var appendResources = function( editor,xml ) {

        xml += '\t<resources>\n';

        xml += '\t</resources>\n';
        return xml;

    }

    var appendChassis = function( editor,xml ) {

        xml += '\t<chassis>\n';

        xml += '\t</chassis>\n';
        return xml;
    }

    var appendDrivetrain = function( editor,xml ) {

        xml += '\t<drivetrain>\n';

        var dt = editor.drivetrain;
        var e = dt.engine;
        var t = dt.transmission;

        xml += '\t\t<engine \n';
        if( e !== null ) { 
            xml += '\t\t\t name="'+e.name+'" model="'+e.mesh.name+'" mass="'+e.mass+'" cylinders="'+e.cylinders+'" displacement="'+e.displacement+'" \n';
            xml += '\t\t\t idle="'+e.idle+'" redline="'+e.redline+'" maximum="'+e.maximum+'" position="'+e.position+'" \n';
            xml += '\t\t\t torque="'+e.torqueCurve.join(",")+'" forced-induction="'+e.forcedInduction+'" \n';
            if( e.forcedInduction == true ) {
                xml += '\t\t\t induction-type="'+e.inductionType+'" induction-curve="'+e.inductionCurve.join(",")+'" \n';
            }
        }
        xml += '\t\t/>\n';

        xml += '\t\t<transmission \n';
        if( t !== null ) { 
            xml += '\t\t\t name="'+t.name+'" model="'+t.mesh.name+'" mass="'+t.mass+'" type="'+t.type+'" gear-ratios="'+t.gears.join(",")+'" \n';
             
        }
        xml += '\t\t/>\n';

        xml += '\t</drivetrain>\n';
        return xml;
    }

    var appendWheels = function( editor,xml ) {

        xml += '\t<wheels>\n';

        xml += '\t</wheels>\n';
        return xml;
    }

    var appendBody = function( editor,xml ) {

        xml += '\t<body>\n';

        var group, panel;
        // Panel Groups
        for( var g in editor.body.parts ) {

            group = editor.body.parts[g];

            xml += '\t\t<panel-group id="'+g+'">\n';
            // Panels in group
            for( var p in group.panels ) {

                panel = group.panels[p];
                var render = editor.body.panelGetRender(g,p,"last");
                var mass = render.mesh.mass;
                var name = render.mesh.name;

                xml += '\t\t\t<panel id="'+p+'" \n';
                xml += '\t\t\t mat-id="-1" mass="'+mass+'" object="'+name+'" \n'; // Position
                xml += '/>\n';

            }

            xml += '\t\t</panel-group>\n';

        }

        xml += '\t</body>\n';
        return xml;
    }

    var appendPhysics = function( editor,xml ) {

        var sim = editor.aeroSim;

        var sqIn2sqFt = 0.00694444;
        var Fa = sim.frontalArea * sqIn2sqFt;
        var Cd = sim.dragCoefficient;

        xml += '\t<physics>\n';

        xml += '\t\t<aerodynamics frontal-area="'+Fa+'" drag-coefficient="'+Cd+'" downforce="0" lift="0" />\n';
        xml += '\t\t<center-of-gravity x="'+editor.COG.point.x+'" y="'+editor.COG.point.y+'" z="'+editor.COG.point.z+'" />\n';
        xml += '\t\t<weight distribution="50:50" total-mass="'+editor.COG.mass+'" />\n';

        xml += '\t</physics>\n';
        return xml;
    }

    _public.designXML = function( editor ) {

        var xml = '<vds-vehicle name="'+editor.projectName+'">\n';

        // first add all the resources (3D models , textures used, etc)
        xml = appendResources(editor,xml);
        xml = appendChassis(editor,xml);
        xml = appendDrivetrain(editor,xml);
        xml = appendWheels(editor,xml);
        xml = appendBody(editor,xml);
        xml = appendPhysics(editor,xml);

        xml += '</vds-vehicle>\n';

        return xml;

    }

    return _public;

})({});