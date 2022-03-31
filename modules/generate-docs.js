var docGenerator = (function( _p ){

    var STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
    var ARGUMENT_NAMES = /([^\s,]+)/g;

    var getMethodParams = function( func ) {

        var fnStr = func.toString().replace(STRIP_COMMENTS, '');
        var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
        if(result === null) {
            result = [];
        }
        return result;

    }

    /**
     * Take a javascript object and traverse its properties and prototype values and extract the methods and their arguments.
     * 
     * @param {*} obj 
     */
    _p.instance = function( obj ) {

        this.obj = obj;
        this.struc = {};
        this.traverse( this.obj , this.struc , false , 0 );

        this.html = this.build( this.struc , "" );
         

    }

    _p.instance.prototype.traverse = function( obj , target , proto , n  ) {

        // Max prototype nesting levels
        if( n > 1 ) { return; }

        var o;
        for( var p in obj ) {

            o = obj[p];
            if( target[p] == undefined ) { target[p] = {}; }

            if( typeof o == 'function' ) {

                target[p]["__params"] = getMethodParams( o );
                target[p]["__methods"] = {}; 
                this.traverse( o.prototype , target[p]["__methods"] , true , n+1 );
                 
            } else if( typeof o == 'object') {
                this.traverse( o , target[p] , false , n );
            }
            

        }
        return;

    }

    _p.instance.prototype.build = function( obj , html ) {
          
        var o;
        for( var p in obj ) {

            if( p == "prototype" ) {continue;}

            o = obj[p];

            if( !!o && typeof o =='object' ) {

                if( o["__methods"] !== undefined && o["__params"] !== undefined ) {
                    
                    html += '<div id="">'+p+'('+o["__params"].join(",")+') [constructor]</div>\n';
                    if( Object.keys( o["__methods"] ).length > 0 ) { 

                        this.build( o["__methods"] , html );

                    }

                } else {

                    html += '<div id="">-> '+p+'</div>\n';

                    if( Object.keys( o ).length > 0 ) { 
                        this.build( o , html );
                    }

                }

            }

        }

        return html;

    }

    return _p;

})( {} );
 