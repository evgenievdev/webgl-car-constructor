var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.physics = (function( _public ) {
    
    _public.geometryToTriangleShapes = function( geo ) {

        var f, v1,v2,v3;
        var phyV, phyF;
        var phyS = [];
        for( var i = 0 ; i < geo.faces.length; i++ ) {

            f = geo.faces[i];
            v1 = geo.vertices[ f.a ];
            v2 = geo.vertices[ f.b ];
            v3 = geo.vertices[ f.c ];

            phyV = [
                v1.x , v1.y , v1.z ,
                v2.x , v2.y , v2.z ,
                v3.x , v3.y , v3.z
            ];

            phyF = [
                0,1,2
            ];

            phyS.push(
                new CANNON.Trimesh( phyV , phyF )
            );

        }

        return phyS;

    }

    _public.bodyFromTriangleShapes = function( shapes , options ) {

        var b = new CANNON.Body( options );

        for( var i = 0 ; i < shapes.length ; i++ ) {

            b.addShape( shapes[i] );

        }

        return b;

    }

    /**
     * Construct a CANNON.Body() physics object to add to the scene from a THREE.Mesh() containing geometry
     * The geometry is triangulated and added to the physics body
     * The body is KINEMATIC
     * Position and Orientation are adjusted from the mesh's properties
     * Scale is not considered!
     * 
     * @param {*} mesh 
     */
    _public.bodyFromMesh = function( mesh ) {

        var fshapes = VDS.module.physics.geometryToTriangleShapes( mesh.geometry );

        var fbody = VDS.module.physics.bodyFromTriangleShapes( fshapes , { 
            mass:0,
            collisionFilterGroup: 2,
            position: mesh.position,
            quaternion:  mesh.quaternion,
            type: CANNON.Body.KINEMATIC
            
        } );

        return fbody;

    }

    /**
     * Reposition and Fix the orientation of a physics body from a THREE.Mesh that is in the scene.
     * 
     * @param {*} body 
     * @param {*} mesh 
     */
    _public.bodyUpdateTransform = function( body , mesh ) {

        body.position.copy( mesh.position );
        body.quaternion.copy( mesh.quaternion );

    }

    return _public;

})({});