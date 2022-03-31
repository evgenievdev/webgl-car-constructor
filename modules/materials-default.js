var VDS = VDS || {};

VDS.materials = (function( _public ) {

    // Base textures preload
    var environmentMap = new THREE.TextureLoader().load( "textures/environment.jpg" );
    environmentMap.mapping = THREE.SphericalReflectionMapping; // OR THREE.EquirectangularReflectionMapping
    _public.environmentMap = environmentMap;

    var asphaltAlbedo = new THREE.TextureLoader().load( "textures/asphalt_albedo.jpg" );
    var asphaltBump = new THREE.TextureLoader().load( "textures/asphalt_bump.jpg" );
    var asphaltNormal = new THREE.TextureLoader().load( "textures/asphalt_normal.jpg" );

    var decalTexture = new THREE.TextureLoader().load( "textures/decal.png" );
    var decalTexture2 = new THREE.TextureLoader().load( "textures/decal2.png" );

    asphaltAlbedo.anisotropy = 16;
    asphaltBump.anisotropy = 16;
    asphaltNormal.anisotropy = 16;
    asphaltAlbedo.wrapS = THREE.RepeatWrapping;
    asphaltAlbedo.wrapT = THREE.RepeatWrapping;
    asphaltBump.wrapS = THREE.RepeatWrapping;
    asphaltBump.wrapT = THREE.RepeatWrapping;
    asphaltNormal.wrapS = THREE.RepeatWrapping;
    asphaltNormal.wrapT = THREE.RepeatWrapping;

    var asphaltRepeat = 20;
    asphaltAlbedo.repeat.set( asphaltRepeat,asphaltRepeat );
    asphaltBump.repeat.set( asphaltRepeat,asphaltRepeat );
    asphaltNormal.repeat.set( asphaltRepeat,asphaltRepeat );

    var tireDiffuse = new THREE.TextureLoader().load( "textures/tire.png" );
    var tireNormal = new THREE.TextureLoader().load( "textures/tire_n.png" );
    tireNormal.wrapS = THREE.RepeatWrapping;
    tireNormal.wrapT = THREE.RepeatWrapping;
    tireDiffuse.wrapS = THREE.RepeatWrapping;
    tireDiffuse.wrapT = THREE.RepeatWrapping;
    //tireDiffuse.repeat.set( 1, 1 );

    var tireVDiffuse = new THREE.TextureLoader().load( "textures/tire_vintage.jpg" );
    tireVDiffuse.wrapS = THREE.RepeatWrapping;
    tireVDiffuse.wrapT = THREE.RepeatWrapping;

    var brushedSteel = new THREE.TextureLoader().load( "textures/steel.jpg" );
    brushedSteel.wrapS = THREE.RepeatWrapping;
    brushedSteel.wrapT = THREE.RepeatWrapping;
    brushedSteel.repeat.set( 0.25, 0.25 );

    _public.decal = new THREE.MeshPhongMaterial( {
        map: decalTexture,
        metalness: 0.1,
        roughness: 0.1,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: - 4,
        side:THREE.DoubleSide,
        wireframe:false   
    } );

    _public.decal2 = new THREE.MeshPhongMaterial( {
        map: decalTexture2,
        metalness: 0.1,
        roughness: 0.1,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: - 4,
        side:THREE.DoubleSide,
        wireframe:false   
    } );

    _public.default = new THREE.MeshStandardMaterial( {
        color: "#555",
        envMap: environmentMap,
        envMapIntensity: 0.2,
        metalness: 0.9,
        roughness: 0.5,
        //side:THREE.DoubleSide,
        wireframe:false   
    } );

    _public.grey = new THREE.MeshStandardMaterial( {
        color: "#111",
        //envMap: environmentMap,
        envMapIntensity: 0.2,
        metalness: 0.0,
        roughness: 0.0,
        side:THREE.DoubleSide,
        wireframe:false   
    } );

    _public.white = new THREE.MeshStandardMaterial( {
        color: "#FFF",
        envMap: environmentMap,
        envMapIntensity: 0.1,
        metalness: 0.3,
        roughness: 0.1,
        side:THREE.DoubleSide,
        wireframe:false   
    } );

    _public.wireframe = new THREE.MeshStandardMaterial( {
        color: "#FFF",
        metalness: 0.3,
        roughness: 0.1,
        side:THREE.DoubleSide,
        wireframe:true   
    } );

    _public.asphalt = new THREE.MeshPhysicalMaterial( {
        color: "#444",
        emissive: "#000",
        //envMap: environmentMap,
        map: asphaltAlbedo,
        bumpMap: asphaltBump,
        normalMap: asphaltNormal,
        metalness: 0.1,
        roughness: 0.6,
        reflectivity: 0.1,
        side:THREE.DoubleSide,
        wireframe:false   
    } );

    _public.highlight = new THREE.MeshStandardMaterial( {
        color: "#d4f442",
        envMap: environmentMap,
        envMapIntensity: 0.4,
        metalness: 0.5,
        roughness: 0.15,
        side:THREE.DoubleSide,
        wireframe:false   
    } );

    _public.red = new THREE.MeshStandardMaterial( {
        color: "#d10000",
        envMap: environmentMap,
        envMapIntensity: 0.4,
        metalness: 0.35,
        roughness: 0.1,
        side:THREE.DoubleSide,
        wireframe:false   
    } );

    _public.transform = new THREE.MeshStandardMaterial( {
        color: "#66FF00",
        metalness: 0.5,
        roughness: 0.5,
        side:THREE.DoubleSide,
        wireframe:false   
    } );

    _public.active = new THREE.MeshStandardMaterial( {
        color: "#fd5217",
        envMap: environmentMap,
        metalness: 0.5,
        roughness: 0.2,
        side:THREE.DoubleSide,
        wireframe:true   
    } );

    _public.COG = new THREE.MeshStandardMaterial( {
        color: "#001eff",
        envMap: environmentMap,
        metalness: 0.5,
        roughness: 0.2,
        side:THREE.DoubleSide,
        wireframe:false   
    } );


    _public.chrome = new THREE.MeshStandardMaterial( {
        color: "#EEE",
        envMap: environmentMap,
        metalness: 0.8,
        roughness: 0.3,
        //side:THREE.DoubleSide,
        wireframe:false   
    } );

    _public.discBrakeClean = new THREE.MeshStandardMaterial( {
        color: "#999",
        //map: brushedSteel,
        envMap: environmentMap,
        metalness: 0.7,
        roughness: 0.2,
        //side:THREE.DoubleSide,
        wireframe:false   
    } );

    _public.discBrakeCaliper = new THREE.MeshStandardMaterial( {
        color: "#c10b0b",
        envMap: environmentMap,
        metalness: 0.8,
        roughness: 0.3,
        //side:THREE.DoubleSide,
        wireframe:false   
    } );


    _public.glass = {

        default: new THREE.MeshStandardMaterial( {
            color: "#444",
            envMap: environmentMap,
            metalness: 0.8,
            roughness: 0.1,
            opacity:0.5,
            transparent: true,
            side:THREE.DoubleSide,
            wireframe:false   
        } ),

        tinted50: new THREE.MeshStandardMaterial( {
            color: "#222",
            envMap: environmentMap,
            metalness: 0.8,
            roughness: 0.1,
            opacity:0.65,
            transparent: true,
            side:THREE.DoubleSide,
            wireframe:false   
        } ),

        tinted100: new THREE.MeshStandardMaterial( {
            color: "#111",
            envMap: environmentMap,
            metalness: 0.8,
            roughness: 0.1,
            opacity:0.85,
            transparent: true,
            side:THREE.DoubleSide,
            wireframe:false   
        } )

    };

    _public.steel = {

        default: new THREE.MeshStandardMaterial( {
            color: "#EEE",
            envMap: environmentMap,
            envMapIntensity: 0.1,
            metalness: 1,
            roughness: 0.6,
            side:THREE.DoubleSide,
            wireframe:false  
        } )

    }

    _public.outline = {

        red: new THREE.LineDashedMaterial( {
            color: "#ff0000",
            linewidth: 1,
            scale: 1,
            dashSize: 3,
            gapSize: 1,
        } ),
        orange: new THREE.LineDashedMaterial( {
            color: "#fd5217",
            linewidth: 1,
            scale: 1,
            dashSize: 3,
            gapSize: 1,
        } ),
        blue: new THREE.LineDashedMaterial( {
            color: "#2a00ff",
            linewidth: 1,
            scale: 1,
            dashSize: 3,
            gapSize: 1,
        } )

    };

    _public.outlineRed = new THREE.LineDashedMaterial( {
        color: "#ff0000",
        linewidth: 1,
        scale: 1,
        dashSize: 3,
        gapSize: 1,
    } );

    _public.outlineGreen = new THREE.LineDashedMaterial( {
        color: "#66FF00",
        linewidth: 1,
        scale: 1,
        dashSize: 3,
        gapSize: 1,
    } );

     
    
    _public.tireStreet = new THREE.MeshStandardMaterial( {
        color: "#888",
        map: tireDiffuse,
        normalScale: new THREE.Vector2(1,1),
        normalMap: tireNormal,
        metalness: 0.2,
        roughness: 0.65,
        wireframe:false,
        side:THREE.DoubleSide
    } );

    return _public;

})({});