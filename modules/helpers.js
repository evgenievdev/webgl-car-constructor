var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.helpers = (function( _public ) {

    _public.pointLine = function( points ) {

        var g = new THREE.Geometry();
        
        g.vertices = points;
        
        return g;

    }

    _public.boundPlane = function( w , l , x , y , z ) {

        var wh = w/2;
        var lh = l/2;

        var g = new THREE.Geometry();
        g.vertices.push(

            new THREE.Vector3( -lh+x, y, -wh+z ),
            new THREE.Vector3( lh+x, y, -wh+z ),
            new THREE.Vector3( lh+x, y, wh+z ),
            new THREE.Vector3( -lh+x, y, wh+z ),
            new THREE.Vector3( -lh+x, y, -wh+z )

        );
        
        return g;

    }

    _public.boundBox = function( w , h , l , x , y , z ) {

        var wh = w/2;
        var lh = l/2;
        var hh = h/2;

        var g = new THREE.Geometry();
        g.vertices.push(

            new THREE.Vector3( -lh+x, y-hh, -wh+z ),
            new THREE.Vector3( lh+x, y-hh, -wh+z ),
            new THREE.Vector3( lh+x, y-hh, wh+z ),
            new THREE.Vector3( -lh+x, y-hh, wh+z ),
            new THREE.Vector3( -lh+x, y-hh, -wh+z ),

            new THREE.Vector3( -lh+x, y+hh, -wh+z ),
            new THREE.Vector3( lh+x, y+hh, -wh+z ),
                new THREE.Vector3( lh+x, y-hh, -wh+z ),
                new THREE.Vector3( lh+x, y+hh, -wh+z ),
            new THREE.Vector3( lh+x, y+hh, wh+z ),
                new THREE.Vector3( lh+x, y-hh, wh+z ),
                new THREE.Vector3( lh+x, y+hh, wh+z ),
            new THREE.Vector3( -lh+x, y+hh, wh+z ),
                new THREE.Vector3( -lh+x, y-hh, wh+z ),
                new THREE.Vector3( -lh+x, y+hh, wh+z ),
            new THREE.Vector3( -lh+x, y+hh, -wh+z ),
                new THREE.Vector3( -lh+x, y-hh, -wh+z )

        );

        return g;

    }

    _public.lineMesh = function( geometry , material ) {

        var line = new THREE.Line( geometry, material );
        line.computeLineDistances();

        return line;

    }

    _public.makeTextSprite = function( message, parameters ) {

        if ( parameters === undefined ) parameters = {};
        
        var fontface = parameters.hasOwnProperty("fontface") ? 
            parameters["fontface"] : "Arial";
        
        var fontsize = parameters.hasOwnProperty("fontsize") ? 
            parameters["fontsize"] : 18;
        
        var borderThickness = parameters.hasOwnProperty("borderThickness") ? 
            parameters["borderThickness"] : 4;
        
        var borderColor = parameters.hasOwnProperty("borderColor") ?
            parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
        
        var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
            parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };

   
            
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        context.font = "Bold " + fontsize + "px " + fontface;
        
        // get size data (height depends only on font size)
        var metrics = context.measureText( message );
        var textWidth = metrics.width;
        
        // background color
        context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
                                    + backgroundColor.b + "," + backgroundColor.a + ")";
        // border color
        context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
                                    + borderColor.b + "," + borderColor.a + ")";

        context.lineWidth = borderThickness;
        //roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
        // 1.4 is extra height factor for text below baseline: g,j,p,q.
        
        // text color
        context.fillStyle = "rgba(0, 0, 0, 1.0)";

        context.fillText( message, borderThickness, fontsize + borderThickness);
        
        // canvas contents will be used for a texture
        var texture = new THREE.Texture(canvas) 
        texture.needsUpdate = true;

        var spriteMaterial = new THREE.SpriteMaterial( 
            { map: texture, useScreenCoordinates: false } );
        var sprite = new THREE.Sprite( spriteMaterial );
        sprite.scale.set(100,50,1.0);
        return sprite;	
    }

    return _public;

})({})