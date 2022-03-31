var VDS = VDS || {};
VDS.module = VDS.module || {};

/**
 * Decal layering system to apply to 3D models.
 */
VDS.module.decals = (function( _p ){

    _p.instance = function() {
 
        this.targets = [];
        this.layers = {};

    }

    _p.instance.prototype.targetExists = function( mesh , remove ) {

        if( mesh == undefined || mesh.uuid == undefined ) { return false; }
        for( var i = 0; i < this.targets.length; i++ ) {

            if( this.targets[i].uuid !== undefined && this.targets[i].uuid == mesh.uuid ) {
                if( remove === true ) {
                    this.targets.splice(i,1);
                }
                return true;
            }

        }
        return false;

    }

    /**
     * 
     * @param {*} mesh 
     */
    _p.instance.prototype.addTarget = function( mesh ) {

        if( this.targetExists(mesh,false) ) { return false; }
        this.targets.push(mesh);
        return true;

    }

    _p.instance.prototype.removeTarget = function( mesh ) {

        return this.targetExists( mesh , true );

    }

    /**
     * 
     * @param {*} targets 
     */
    _p.instance.prototype.setTargets = function( targets ) {

        if( !targets.length ) { return false; }
        this.targets = targets;
        return true;

    }

    /**
     * 
     * @param {*} id 
     */
    _p.instance.prototype.layerExists = function(id) {

        if( this.layers[id] == undefined ) { return false; }
        return true;

    }

    /**
     * 
     * @param {*} id 
     */
    _p.instance.prototype.newLayer = function( id ) {

        if( this.layerExists(id) ) { return false; }
        this.layers[id] = {};

    }

    /**
     * 
     * @param {*} layer 
     * @param {*} ref 
     */
    _p.instance.prototype.decalExists = function( layer , ref ) {

        if( !this.layerExists(layer) ) { return false; }
        if( this.layers[layer][ref] == undefined ) { return false; }
        return true;
    
    }

    /**
     * 
     * @param {*} layer 
     * @param {*} ref 
     * @param {*} cfg 
     */
    _p.instance.prototype.newDecal = function( layer , ref , cfg ) {

        if( this.decalExists(layer,ref) ) { return false; }
        
        // Base construction for the decal object
        this.layers[layer][ref] = {
            mesh: false,             // THREE.Mesh
            geometry: false,         // THREE.Geometry
            position: false,         // THREE.Vector3
            orientation: false,      // THREE.Euler
            target: false,           // THREE.Mesh
            size: false,             // THREE.Vector3
            material: false          // THREE.Material (any type)
        };

        // Set this decal's properties
        this.setDecal( layer, ref , cfg );

        return true;

    }
 
    /**
     * 
     * @param {*} layer 
     * @param {*} ref 
     * @param {*} cfg 
     */
    _p.instance.prototype.setDecal = function( layer , ref , cfg ) {

        if( !this.decalExists(layer,ref) ) { return false; }
      
        var nk = Object.keys(cfg).length;
        // If the cfg object doesn't have adequate structure, don't do anything
        if( nk <= 0 || nk > 10 ) { return false; }

        var dec = this.layers[layer][ref];
        for( var k in cfg ) {

            // no such property exists OR geometry/mesh => skip this property
            if( dec[k] == undefined || k == "geometry" || k == "mesh" ) { continue; }
            // otherwise add the value
            dec[k] = cfg[k];

        }
 
        // Reset the decal's geometry
        dec.geometry = new THREE.DecalGeometry( dec.target , dec.position , dec.orientation , dec.size )
        dec.geometry.vertices = [];
        dec.geometry.faces = [];

        if( dec.mesh == false ) { 
            dec.mesh = new THREE.Mesh( dec.geometry , dec.material ); 
            dec.mesh.name = "DecalMesh";        // Important for GUI
        } else {
            dec.mesh.geometry.dispose();
            dec.mesh.geometry = dec.geometry;
            dec.mesh.material = material;
        }

        return true;

    }

    _p.instance.prototype.drawDecals = function( scene ) {
       
        for( var l in this.layers ) {
            this.drawLayer( l , scene );
        }

    }

    _p.instance.prototype.drawLayer = function( id , scene ) {

        if( !this.layerExists(id) ) { return false; }
        
        var layer = this.layers[id];
        for( var d in layer ) {

            this.drawDecal( id , d , scene );
            
        }

    }

    _p.instance.prototype.drawDecal = function( layer , ref , scene ) {

        if( !this.decalExists(layer,ref) ) { return false; }

        var decal = this.layers[layer][ref];
        if( decal.mesh == false ) { return false; }

        scene.remove( decal.mesh );
        scene.add( decal.mesh ); 

        return true;

    }

    /**
     * 
     * @param {*} obj 
     */
    _p.instance.prototype.decalObjectEmpty = function( obj ) {

        var nk = Object.keys(cfg).length;
        if( nk <= 0 ) { return true; }
        for( var k in obj ) {
            if( obj[k] == null ) { return true; }
        }
        return false;

    }

    /**
     * 
     * @param {*} layer 
     * @param {*} ref 
     */
    _p.instance.prototype.decalEmpty = function( layer , ref ) {

        if( !this.decalExists(layer,ref) ) { return false; }
        return this.decalObjectEmpty( this.layers[layer][ref] );

    }

    /**
     * 
     * @param {*} layer 
     * @param {*} ref 
     */
    _p.instance.prototype.getDecal = function( layer , ref ) {

        if( !this.decalExists(layer,ref) ) { return false; }
        var o = this.layers[layer][ref];
        if( this.decalObjectEmpty(o) ) {
            console.warn("Decal [" + ref + "] does not have set properties yet.");
            return false;
        }
        return o;

    }

    /**
     * 
     * @param {*} layer 
     * @param {*} decal 
     * @param {*} action 
     * @param {*} value 
     */
    _p.instance.prototype.transformDecal = function( layer , decal , action , value ) {

        // An undefined value shouldn't allow the user to do anything
        if( value == undefined ) { return false; }
        if( !this.decalExists(layer,decal) ) { return false; }
        // Get the decal object
        var decal = this.layer[layer][decal];
        // If this object doesn't contain the right properties, exit
        if( this.decalObjectEmpty(decal) ) { return false; }

        // Transform actions: move, scale, flip, rotate
        if( action == "rotate" ) {

            decal.orientation.z = value;    // Angle in radians

        } else if( action == "scale" ) {

            decal.size = value;             // Vector3 scale (default should be Vector3(1,1,1) )

        } else if( action == "flip" ) {
 
            // Value becomes the axis on which to flip the decal
            if( value !== "x" && value !== "y" ) { return false; }
            decal.size[value] *= -1;        // Flip the current scale on the specified axis.

        }

    }

    /**
     * Use a raycaster to project a point on the screen and check for collisions relative to the camera
     * 
     * @param {*} screen Object containing an x and y property (screen coordinates in normalized coordinates (i.e. between -1 and 1 , 0 being center)
     * @param {*} camera THREE.Camera instance
     * @returns 
     */
    _p.instance.prototype.projectCoords = function( screen , camera ) {

        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera( screen , camera );

        var hits = raycaster.intersectObjects( this.targets );

        if ( hits.length > 0 ) {

            var hit = hits[0];  
            var obj = hit.object;
            var pos = hit.point.clone();
            var dir = hit.face.normal.clone();

            // Add a little bit of distance between surface and decal
            //pos.add( new THREE.Vector3().copy(dir).multiplyScalar(1) );
            
            return {
                object: obj,
                position: pos,
                orientation: new THREE.Euler().setFromVector3( dir )
            };

        }

        return false;

    }


    return _p;

})({});