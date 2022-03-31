var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.save = (function( _p ) {

    _p.project = function( cfg ) {

        cfg = cfg || {};

        var editor = cfg.editor;
        var directory = cfg.directory || "projects/";
        var projectName = cfg.projectName || editor.projectName;
        var fileName = cfg.fileName || "project-data.json";

        var path = directory + projectName + "/";

        var data = {};

        data.panels = _p.panels( editor );
        data.materials = _p.materials( editor );
        data.tires = _p.tires( editor );
        data.drivetrain = _p.drivetrain(editor);

        $.post( "../modules/exportData.php" , {

            "path": path,
            "filename": fileName,
            "data": JSON.stringify( data, null, 4)

        }).done(function( response ) {
            console.log( response );
        });

    }

    _p.drivetrain = function( editor ) {

        var dt = editor.drivetrain;

        var res = {};

        if( dt.engine !== null ) {

            res.engine = {
                id: dt.engine.partIndex,
                position: dt.engine.position
            }

        }

        if( dt.transmission !== null ) {

            res.transmission = {
                id: dt.transmission.partIndex
            }

        }

        return res;

    }

    _p.tires = function( editor ) {

        var tires = editor.parts.tires;

        var res = {};

        for( var t in tires ) {

            var tire = tires[t].getLastRender();

            // Lazy way to set properties
            res[t] = JSON.parse( JSON.stringify( tire ) );
            // Need to remove some pieces (mainly geometry)
            delete res[t]["_geometry"];

        }
        console.log(res);
        return res;

    }

    _p.materials = function( editor ) {

        var mats = editor.materials.lib;
        var res = {};

        for( var m in mats ) {

            var obj = mats[m];
            var mat = obj.mat;
            var color = mat.color.getHexString();

            var appTo = []; // a list of UUIDs (have to be converted to meshes upon loading - searched through scene)

            for( var i=0;i<obj.appliedTo.length;i++) {
                appTo.push(obj.appliedTo[i].uuid);
            }

            res[m] = {

                appliedTo: appTo,

                opacity: mat.opacity,
                transparent: mat.transparent,
                metalness: mat.metalness,
                roughness: mat.roughness,
                wireframe: mat.wireframe,
                envMapIntensity: mat.envMapIntensity,
                color: "#"+ color

            };

        }

        return res;

    }

    _p.panels = function( editor ) {

        var body = editor.body;
        var res = {};

        for( var g in body.parts ) {

            var group = body.parts[g];
            res[g] = {};
            for( var p in group.panels ) {

                var panel = body.panelGetRender( g , p , "last" );

                var cpts = new Array(panel.curves.length);
                for( var i = 0 ; i < panel.curves.length; i++ ) {
                    cpts[i] = new Array(panel.curves[i].points.length);
                    for(var j = 0 ; j < panel.curves[i].points.length; j++ ) {

                        cpts[i][j] = panel.curves[i].points[j].clone();

                    }
                }

                res[g][p] = {
                    id: panel.id,
                    curves: cpts,
                    order: panel.order,
                    numPoints: panel.numPoints,
                    stepsBetweenCurves: panel.stepsBetweenCurves,
                    offset: panel.offset
                }

            }

        }

         

        return res;

    }

    return _p;

})({})