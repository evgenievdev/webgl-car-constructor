var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.materials = (function( _p ){
  

    _p.instance = function( editor , cfg ) {

        cfg = cfg || {};

        this.editor = editor;
        this.active = null;
        this.lib = {}; 

        this.maxMaterials = cfg.maxMaterials == undefined ? 10 : cfg.maxMaterials;
        this.displayGeometry = cfg.displayGeometry == undefined ? new THREE.SphereGeometry(7,12,12) : cfg.displayGeometry;

    }

    _p.instance.prototype.materialExists = function( ref ) {

        if( this.lib[ref] !== undefined ) {
            return true;
        } 
        return false;

    }

    _p.instance.prototype.getMaterialObject = function( ref ) {

        if( !this.materialExists(ref) ) { return false; }
        
        return this.lib[ref];

    }


    _p.instance.prototype.getMaterial = function( ref ) {

        if( !this.materialExists(ref) ) { return false; }
        
        return this.lib[ref].mat;

    }

    _p.instance.prototype.removeMaterial = function( ref ) {

        if( !this.materialExists(ref) ) { return false; }
        
        var obj = this.lib[ref];
        this.editor.scene.remove( obj.mesh );
 
        for( var i = 0 ; i < obj.appliedTo.length; i++ ) {
            // remove references and swap with default material
            obj.appliedTo[i].material = VDS.materials.default;
        }

        if( this.active == ref ) { this.active = null; }

        delete this.lib[ref];

        return true;

    }

    _p.instance.prototype.removeMaterials = function() {

        for( var m in this.lib ) {
            this.removeMaterial(m);
        }

    }

    _p.instance.prototype.newMaterial = function( ref , cfg ) {

        if( this.countMaterials() >= this.maxMaterials ) { 
            return false; 
        }

        if( this.materialExists(ref) ) { return false; }

        var mat = new THREE.MeshStandardMaterial( {
            color: cfg.color ,
            envMap: VDS.materials.environmentMap,
            envMapIntensity: cfg.envMapIntensity == undefined ? 0.8 : THREE.Math.clamp( cfg.envMapIntensity , 0 , 1 ),
            metalness: cfg.metalness,
            roughness: cfg.roughness,
            transparent: cfg.transparent === true ? true : false,
            opacity: cfg.opacity == undefined ? 1.0 : THREE.Math.clamp(cfg.opacity,0,1),
            side:THREE.DoubleSide,
            wireframe: cfg.wireframe === true ? true : false   
        } );

        var mesh = new THREE.Mesh( this.displayGeometry , mat );
        mesh["matRef"] = ref;

        this.lib[ref] = {
            mesh: mesh, // A clickable sphere on the scene
            mat: mat, // Material instance
            appliedTo: [] // List of meshes this material is applied to. 
        };
 

        return true;

    }

    _p.instance.prototype.removeMeshReference = function( mesh ) {

        if( mesh == undefined ) { return false; }

        // Check all other materials to see if this mesh has any applied 
        var matRef = mesh["matRef"];
        if( matRef == undefined || this.lib[matRef] == undefined ) { return false; }

        var mat = this.lib[matRef];
        for( var i = 0 ; i < mat.appliedTo.length; i++ ) {

            if( mat.appliedTo[i].uuid == mesh.uuid ) {
                mat.appliedTo.splice(i,1);
                break;
            }

        }
        

    }

    _p.instance.prototype.applyMaterial = function( ref , mesh ) {

        if( !this.materialExists(ref) ) { return false; }
        
        this.removeMeshReference( mesh );

        // See if the material exists in appliedTo array
        var obj = this.lib[ref];
        var inArr = false;
        for( var i = 0 ; i < obj.appliedTo.length; i++ ) {
            if( obj.appliedTo[i].uuid == mesh.uuid ) {
                inArr=true;
                break;
            }
        }

         
              

        if( !inArr ) {
            obj.appliedTo.push(mesh);
        }

        mesh.material = obj.mat;
        mesh["matRef"] = ref;

        return true;

    }

    _p.instance.prototype.setMaterialColor = function( ref , col ) {

        if( !this.materialExists(ref) ) { return false; }

        this.lib[ref].mat.color.set( col );
        return true;

    }

    _p.instance.prototype.removeMaterialMeshes = function( pos ) {

        var obj;
        for( var ref in this.lib ) {
            obj = this.lib[ref];
            this.editor.scene.remove(obj.mesh);
        }
 
    }

    _p.instance.prototype.renderMaterialMeshes = function( pos , dir , margin , maxPerRow ) {

        this.removeMaterialMeshes();

        var obj;
        var i = 0;
        var row = 0;
        for( var ref in this.lib ) {

            obj = this.lib[ref];

            this.editor.scene.add(obj.mesh);
            var pos3 = new THREE.Vector3().copy(pos).add( new THREE.Vector3().copy(dir).multiplyScalar(margin * i) );
            pos3.y = pos.y + margin * row;
            obj.mesh.position.copy(pos3);

            i++;
            // Stack in a grid
            if( maxPerRow > 0 ) {
                if( i >= maxPerRow ) {
                    i = 0;
                    row++;
                }
            }

        }
 
    }

    _p.instance.prototype.buildClickables = function() {
        var list = [];
        var obj;
        for( var ref in this.lib ) {
            obj = this.lib[ref];
            list.push(obj.mesh);
        }
        return list;
 
    }

    _p.instance.prototype.countMaterials = function() {

        var c = 0;
        for( var r in this.lib ) {
            c++;
        }
        return c;

    }

    _p.instance.prototype.toggleMaterials = function( visible ) {

        var obj;
        for( var ref in this.lib ) {
            obj = this.lib[ref];
            if( obj.mesh == undefined || obj.mesh == null ) { continue; }
            obj.mesh.visible = visible == false ? false : true;
        }

    }

    _p.instance.prototype.hideMaterials = function( ) {

        return this.toggleMaterials( false );         

    }

    _p.instance.prototype.showMaterials = function( ) {

        return this.toggleMaterials( true );         

    }



    return _p;

})({});