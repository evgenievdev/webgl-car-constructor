var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.colorpicker = (function( _p ) {

    _p.instance = function( target , editor ) {

        this.editor = editor;
        this.target = target;
        this.viewer = null;
        this.activeColor = null;
        this.events = {};
        
        this.generateWheel({
            circles: 5,
            colors: 32,
            blockSize: 25,
            startAngle: 0,
            endAngle: Math.PI*2 
        });

    }

    _p.instance.prototype.hexToRgb = function(hex) {

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;

    }
    
    _p.instance.prototype.setViewerColor = function( col , write , text ) {

        if( this.viewer == null || this.viewer == undefined ) {
            return false;
        }

        if( write === true ) {
            this.viewer.html('<span class="stroke">'+text+'</span>');
        } 
        this.viewer.css("background",col);

        return true;
    }

    _p.instance.prototype.generateWheel = function( cfg ) {

        var h = '';

        var nCircles = cfg.circles;
        var cPerCircle = cfg.colors;
        var cSize = cfg.blockSize; 

        var aStart = cfg.startAngle == undefined ? 0 : cfg.startAngle;
        var aEnd = cfg.endAngle == undefined ? Math.PI*2 : cfg.endAngle;
        var aRange = Math.abs( aEnd - aStart );

        var aInt = aRange / cPerCircle;

        var color, x , y;

        // Create a color palette
        var pal = palette('rainbow', cPerCircle*nCircles );
        // Add white-black range
        var gray = new Array(cPerCircle);
        for( var i = 0; i < cPerCircle ;i++ ) {
            var x = (i/cPerCircle);
            gray[i] = palette.rgbColor(x,x,x);
        }
        pal.unshift(...gray);
        // 
        nCircles++;

        var tw = this.target.width();
        var th = this.target.height();
        
         
        var xRad = (tw/2) ;
        var yRad = (th/2) ;

        var arcL = Math.PI*2 * xRad;
         
 
        var aDeg = 0;

         
        
         

        var rgb, bg;
        var colID, adjSize;
        for( var c = 0 ; c < nCircles; c++ ) {

            for( var i = 0 ; i < cPerCircle ; i++ ) {

                // Radians to degrees 
                aDeg = (aInt * i)*57.2957795;
                
                colID = cPerCircle * c + i;

                color = '#'+pal[ colID ];
                rgb = this.hexToRgb(color);
                bg = 'rgba( '+rgb.r+' , '+rgb.g+' , '+rgb.b+' , 0.4 );';

                adjSize = cSize + c*2;

                x = Math.cos( aStart + aInt * i ) * (xRad + c*adjSize - cSize*nCircles ) + xRad - cSize/2;
                y = Math.sin( aStart + aInt * i ) * (yRad + c*adjSize  - cSize*nCircles) + yRad - cSize/2;

                 

                h += '<div vds-type="color-block" vds-color="'+color+'" class="color-block" style="transform: rotate('+aDeg+'deg);background:'+bg+';border-color:'+color+';top:'+y+'px;left:'+x+'px;width:'+adjSize+'px;height:'+adjSize+'px;"></div>';

            }

        }

        h += '<div id="color-viewer" class="color-viewer" style="left:'+xRad+'px;top:'+yRad+'px;transform: translate(-50%,-50%);color:white;"> COLOUR </div>';
        this.target.append(h);
        
        this.viewer = this.target.find("#color-viewer");
        var blocks = this.target.find('[vds-type="color-block"]');

        blocks.each(function(index){

            var b = $(blocks[index]);
            var col = b.attr("vds-color");

            b.hover(function(){

                //this.viewer.html(col);
                //this.viewer.css("background",col);

            }.bind(this));

            b.click(function(){
                
                this.activeColor = col;
                this.setViewerColor( col ,true, col.toUpperCase() );

                if( this.events !== undefined && this.events["selectColor"] !== undefined && typeof this.events["selectColor"] == 'function' ) {
                    this.events["selectColor"]( this , col , b );
                }

            }.bind(this));
             


        }.bind(this));


    }

    return _p;

})({});