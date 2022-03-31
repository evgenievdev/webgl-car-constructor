var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.drivetrain = (function( _public , resources ) {

    _public.instance = function(editor) {

        this.editor = editor;

        this.engine = null;
        this.transmission = null;
        this.differentials = null; // Ignored for now (left for later implementation)
 
    }

    _public.instance.prototype.removeEngine = function() {
        
        if( this.engine == null ) { return false; }
 
        if( this.engine.helper !== undefined ) {
            this.editor.scene.remove( this.engine.helper );
        }
        
        // Remove the old mesh, if one exists
        if( this.engine.mesh !== undefined ) {
            this.editor.scene.remove( this.engine.mesh );
        }

        this.engine = null;
        return true;
 
    }

    /**
     * 
     * 
     * @param {*} id 
     * @param {*} repo 
     * @param {*} position 
     */
    _public.instance.prototype.setEngine = function( id , repo , position ) {

        // There is no such engine ==> exit method
        if( resources.componentExists("engines",id) === false || repo[id] == undefined ) {
            return false;
        }

        this.removeEngine();

       
        this.engine = resources.getComponent("engines",id);
        this.engine.position = THREE.Math.clamp( position , 0 , 1 );
        
        this.engine.partIndex = id;

        // Set the mesh and a mass property and add it to the scene. 
        // Uses the repository where the engine geometry is preloaded
        // The engine's mesh MUST BE preloaded or this method will return false at the beginning.
        this.engine.mesh = repo[ id ].clone();
        this.engine.mesh.name = "engine";
        this.engine.mesh.mass = this.engine.mass; // used for center of gravity calculations
        
        // Position engine along frame with any added offsets, rotations and scaling
        this.moveEngine( this.engine.position );
         
        // Attempt to reposition the transmission (only works if one is installed)
        this.mountTransmission();

        this.editor.scene.add( this.engine.mesh );
 

        // Add clickable objects
        this.editor.gui.setClickableObjects("drivetrain-engine" , [this.engine.mesh] );

    }

    /**
     * 
     * @param {*} id 
     * @param {*} repo 
     */
    _public.instance.prototype.setTransmission = function( id , repo ) {

        // You need an engine mounted first.
        if( this.engine == null ) { return false; }

        if( resources.componentExists("transmissions",id) === false || repo[id] == undefined ) {
            return false;
        }

        if( this.transmission == null ) { this.transmission = {}; }

        // Remove the old mesh, if one exists
        if( this.transmission.mesh !== undefined ) {
            this.editor.scene.remove( this.transmission.mesh );
        }

        this.transmission = resources.getComponent("transmissions",id);

        this.transmission.partIndex = id;

        this.transmission.mesh = repo[ id ].clone();
        this.transmission.mesh.name = "transmission";
        this.transmission.mesh.mass = this.transmission.mass; // used for center of gravity calculations

        this.mountTransmission();
        

        this.editor.scene.add( this.transmission.mesh );

    }

    _public.instance.prototype.moveEngine = function( position ) {

        if( this.engine == null || this.engine.mesh == undefined ) { return false; }

        position = THREE.Math.clamp( position , 0 , 1 );

        var posVec = this.editor.chassis.getPointOnLongitudinalMember( position );
        
        var eLim = this.engine.bounds;
        var lon = this.editor.chassis.frame.longitudinal;
        var fO = lon.frontOverhang;
        var rO = lon.rearOverhang;
        var wheelbase = lon.wheelbase;

        var tLimX = 0;
        if( this.transmission !== null ) {
            tLimX = this.transmission.bounds[0];
        }

        if( posVec.x - eLim[0]/2 < -fO ) { return false; }
        if( posVec.x + eLim[0]/2> rO+wheelbase -30 ) { return false; }

        posVec.add(this.engine.offset);
        this.engine.mesh.position.copy( posVec );

        this.engine.position = position;

        this.mountTransmission();

        // Can remove this later
        if( this.engine.helper !== undefined ) {
            this.editor.scene.remove(this.engine.helper);
        }
        this.engine.helper = new THREE.BoxHelper( this.engine.mesh, "#ff4200" );
        this.editor.scene.add( this.engine.helper );

    }

    /**
     * Mount transmission to the engine
     */
    _public.instance.prototype.mountTransmission = function() {

        if( this.transmission == null || this.transmission.mesh == undefined ) {
            return false;
        }

        this.transmission.mesh.position.copy( new THREE.Vector3().addVectors(this.engine.mesh.position , this.engine.transmissionMount ) );
        return true;

    }   

    return _public;
    
})( {} , VDS.predefined.resources );