/**
 * 1. Draw polygons and curves (closed splines should be included)
 * 2. Implement blueprints which can be scrolled along the canvas for reference.
 */
var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.canvas = (function( _p ) {
    
    var instances = [];

    _p.instance = function( wrapper , editor ) {

        this.editor = editor;
        this.wrapper = wrapper;
        this.events = {};

        this.canvasID = "canvas-editor-"+(instances.length + 1);
        this.div = this.wrapper.find(".canvas-editor");
        this.div.attr("id" , this.canvasID );
 

        this.width = this.div.width();
        this.height = this.div.height();

        this.lines = [];
        this.polygons = [];
        this.boundaries = [];

        this.mode = "lines"; // lines ; polygons
  
        this.buttons = {
            newPath: wrapper.find("#create"),
            clearCanvas: wrapper.find("#clear-canvas"),
            build: wrapper.find("#build"),
            clonePath: this.wrapper.find("#clone"),
            snap: this.wrapper.find("#snap"),
            move: this.wrapper.find("#move"),
            moveAxis: this.wrapper.find("#move-axis"),
            scale: this.wrapper.find("#scale"),
            scaleAxis: this.wrapper.find("#scale-axis"),
            flipH: this.wrapper.find("#flip-horizontal"),
            flipV: this.wrapper.find("#flip-vertical"),
            rotateL: this.wrapper.find("#rotate-left"),
            rotateR: this.wrapper.find("#rotate-right")

        }
 
        this.active = {
            lines: -1,
            polygons: -1
        };

        this.trees = {
            lines: wrapper.find("#line-tree"),
            polygons: wrapper.find("#polygon-tree")
        };

        this.dragged = null;
        this.selected = null;
        this.mouseDown = false;
        this.mouseStart = [0,0];
        this.mousePos = [0,0];

        this.moveLine = false; // true if the user can move an entire line.
        this.moveAxis = 0; // 0 = Both , 1 = X only , 2 = Y only

        this.scaleLine = false; // true if the user can move an entire line.
        this.scaleAxis = 0; // 0 = Both , 1 = X only , 2 = Y only

        this.showGrid = true;
        this.snapToGrid = false;
        this.gridSize = 10;

        this.registerEvents();
        this.buttonEvents();
     
        this.svg = d3.select("#"+this.canvasID).append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("tabindex", 1);
          
        // Event Handler to add points on the canvas
        this.svg.append("rect")
            .attr("width", this.width)
            .attr("height", this.height)
            .on("mousedown", this.mousedown.bind(this) )
            .style("pointer-events", "all")
            .call(  d3.zoom().scaleExtent([1, 3]).on("zoom", function(){  } ));
          
        this.svg 
            .on("mousemove", this.mousemove.bind(this))
            .on("mouseup", this.mouseup.bind(this))
            .on("keydown", this.keydown.bind(this));
          
        
        this.defs = this.svg.append("svg:defs");

        var pat = this.defs.append("pattern");
        pat.attr("id","hash4_4")
           .attr("width",8)
           .attr("height",8)
           .attr("patternUnits","userSpaceOnUse")
           .attr("patternTransform","rotate(60)");
        var rect = pat.append("rect");
        rect.attr("width",4)
            .attr("height",8)
            .attr("transform","translate(0,0)")
            .attr("fill","#88AAEE");
 
    
        this.defs.append("svg:marker")
              .attr("id", "triangle")
              .attr("viewBox","0 0 10 10")
              .attr("refX", 1)
              .attr("refY", 5)
              .attr("markerWidth", 6)
              .attr("markerHeight", 6)
              .attr("orient", "auto")
              .append("path")
              .attr("d", "M 0 0 L 10 5 L 0 10 z")
              .style("stroke", "red")
              .style("fill","none");

        this.svg.node().focus();

        this.drawGrid();

        this.createPolygonComponents();
 
        this.setMode("lines");

        instances.push(this);

    }

    _p.instance.prototype.shapes = {

        "ellipse": function( n , xrad , yrad , x , y ) {

            var pts = new Array(n);
            var s = (Math.PI*2) / n;
            var a = 0;
            for( var i = 0 ; i < n ; i++ ) {
                a = s * i;
                pts[i] = [
                    x + Math.cos(a)*xrad,
                    y + Math.sin(a)*yrad
                ];
            }

            return pts;

        },

        "rectangle": function(w,h,x,y) {

            var ptsVec2 = VDS.module.shape.rectanglePoints(x,y,w,h,true);
            return _p.convertVectorsToPoints(ptsVec2);

        },

        "rectangle-rounded": function( n , w , h , r , x , y ) {

            var ptsVec2 = VDS.module.shape.rectangleRoundedPoints( w,h,r, n , new THREE.Vector2(x,y) , true );
            return _p.convertVectorsToPoints( ptsVec2 );

        }

    };

    _p.instance.prototype.createPolygonComponents = function() {

        this.shapesDiv = this.wrapper.find("#shapes");

        for( var s in this.shapes ) {

            var html = '<button vds-shape="'+s+'" class="ui basic inverted button">'+s+'</button>';

            this.shapesDiv.append(html);

        }

        var shapeTemplates = {

            "ellipse": function() {
                return this.shapes.ellipse( 25 , 80,80, 200,200 );
            }.bind(this),

            "rectangle": function() {
                return this.shapes.rectangle( 80,80, 200,200 ,true );
            }.bind(this),

            "rectangle-rounded": function() {
                return this.shapes["rectangle-rounded"]( 15 , 100,100, 0.2, 200,200 );
            }.bind(this)
    
        };

        this.shapeButtons = this.wrapper.find('[vds-shape]');
        this.shapeButtons.each(function(index){

            var b = $(this.shapeButtons[index]);
            var shape = b.attr("vds-shape");

            b.click(function(){

                var spts = shapeTemplates[ shape ]();
                var color = "rgba( "+Math.random()*255+" , "+Math.random()*255+" , "+Math.random()*255+" , 1.0 )";
                var pathID = this.addPath( "polygons" , "Polygon ("+shape+")" , color , spts );
                this.active[ "polygons" ] = pathID;
         
                this.addToList( "Polygon ("+shape+") "+this.active[ "polygons" ] , "star half outline icon" , color , this[ "polygons" ][ pathID ].uuid , "polygons" );
            
                this.redraw();

            }.bind(this));

        }.bind(this));

    }
     

    _p.instance.prototype.setMode = function( mode ) {

        mode = mode.toLowerCase().trim();

        if( mode !== "lines" && mode !== "polygons" ) { return false; }

        this.mode = mode;

        if( mode == "polygons" ) {
            this.shapesDiv.show();
            this.trees.polygons.show();
            this.trees.lines.hide();
        } else {
            this.shapesDiv.hide();
            this.trees.polygons.hide();
            this.trees.lines.show();
        }

        this.redraw();

        return true;

    }

    /**
     * Button events (tools)
     */
    _p.instance.prototype.buttonEvents = function() {
        
        this.buttons.newPath.click(function(){

            var randCol = "rgba( "+Math.random()*255+" , "+Math.random()*255+" , "+Math.random()*255+" , 1.0 )";
            var pathID = this.addPath( this.mode , name , randCol );
            this.active[ this.mode ] = pathID;
         
            this.addToList( "Line "+this.active[ this.mode ] , "star half outline icon" , randCol , this[ this.mode ][ pathID ].uuid , this.mode );
            
            this.redraw();
        
        }.bind(this));
        
        this.buttons.clearCanvas.click(function(){
        
            while( this[ this.mode ].length > 0 ) {
                this.removePath( 0 , false , this.trees[ this.mode ] , this.mode );
            }
            this.redraw();
        
        }.bind(this));

        // Toggle Snap-to-Grid feature
        this.buttons.snap.click(function(){
        
            if( this.snapToGrid == true ) {
                this.buttons.snap.removeClass("positive");
                this.snapToGrid = false;
            } else {
                this.buttons.snap.addClass("positive");
                this.snapToGrid = true;
            }
        
        }.bind(this));

        // Toggle Snap-to-Grid feature
        this.buttons.move.click(function(){
        
            if( this.moveLine == true ) {
                this.buttons.move.removeClass("positive");
                this.moveLine = false;
            } else {
                this.buttons.move.addClass("positive");
                this.moveLine = true;
            }

            this.redraw();
        
        }.bind(this));
        // Change the axis on which the user can move the shape. Sometimes its useful to lock movement to one axis
        this.buttons.moveAxis.click(function(){
        
            this.moveAxis++;
            if( this.moveAxis > 2 ) { this.moveAxis = 0; }

            var icon = this.buttons.moveAxis.find("i");
            if( this.moveAxis == 0 ) {
                icon.attr("class","arrows alternate icon");
            } else if( this.moveAxis == 1 ) {
                icon.attr("class","arrows alternate horizontal icon");
            } else if( this.moveAxis == 2 ) {
                icon.attr("class","arrows alternate vertical icon");
            }
        
        }.bind(this));

        // Toggle Snap-to-Grid feature
        this.buttons.scale.click(function(){
        
            if( this.scaleLine == true ) {
                this.buttons.scale.removeClass("positive");
                this.scaleLine = false;
            } else {
                this.buttons.scale.addClass("positive");
                this.scaleLine = true;
            }

            this.redraw();
        
        }.bind(this));
        // Change the axis on which the user can move the shape. Sometimes its useful to lock movement to one axis
        this.buttons.scaleAxis.click(function(){
        
            this.scaleAxis++;
            if( this.scaleAxis > 2 ) { this.scaleAxis = 0; }

            var icon = this.buttons.scaleAxis.find("i");
            if( this.scaleAxis == 0 ) {
                icon.attr("class","expand arrows alternate icon");
            } else if( this.scaleAxis == 1 ) {
                icon.attr("class","arrows alternate horizontal icon");
            } else if( this.scaleAxis == 2 ) {
                icon.attr("class","arrows alternate vertical icon");
            }
        
        }.bind(this));

        this.buttons.clonePath.click(function(){
            
            var active = this.active[ this.mode ];

            if( active < 0 || active >= this[ this.mode ].length ) { return; }
            this.clonePath( this[ this.mode ][ active ].uuid , true , this.mode );
            this.redraw();
        
        }.bind(this));

        // Flip Horizontally
        this.buttons.flipH.click(function(){
            
            var active = this.active[ this.mode ];
            this.flipLine( this.mode , active , "x" );
            this.redraw();
        
        }.bind(this));
        // Flip Vertically
        this.buttons.flipV.click(function(){
            
            var active = this.active[ this.mode ];
            this.flipLine( this.mode , active , "y" );
            this.redraw();
        
        }.bind(this));
        // Rotate Left 10deg
        this.buttons.rotateL.click(function(){
            
            var active = this.active[ this.mode ];
            this.rotateLine( this.mode , active , -Math.PI/18 );
            this.redraw();
        
        }.bind(this));
        // Rotate Right 10deg
        this.buttons.rotateR.click(function(){
            
            var active = this.active[ this.mode ];
            this.rotateLine( this.mode , active , Math.PI/18 );
            this.redraw();
        
        }.bind(this));

    }


    _p.instance.prototype.pointAtLength = function( path , l ) {

        var xy = path.getPointAtLength(l);
        return [xy.x, xy.y];

    }
    
    // Approximate tangent
    _p.instance.prototype.angleAtLength = function( path , l ) {

        var a = pointAtLength( path , Math.max(l - 0.01,0) ), // this could be slightly negative
            b = pointAtLength( path , l + 0.01 ); // browsers cap at total length

        return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;

    }


    /**
     * Can be used for both Vector3 and Vector2. Just type THREE.Vector2 or THREE.Vector3 for the vecType parameter
     * 
     * @param {*} list 
     * @param {*} vecType 
     */
    _p.convertPointsToVectors = function( list , vecType ) {
        var res = [];
        var v;
        for( var i = 0 ; i < list.length ; i++ ) {

            v = new vecType();
            v.x = list[i][0];
            v.y = list[i][1];
            res.push( v );
             
        }
        return res;
    };

    _p.convertVectorsToPoints = function( list ) {
        var f = [];
        for( var i = 0 ; i < list.length ; i++ ) {
            f.push( [ list[i].x , list[i].y ] );
        }
        return f;
    };

    _p.instance.prototype.pathBoundaries = function( points ) {

        var b = {
            x: [0,0],
            y: [0,0]
        };
        if( points.length <= 0 ) { return b; }

        var xmin = points[0][0];
        var xmax = points[0][0];
        var ymin = points[0][1];
        var ymax = points[0][1];
        for( var i = 0 ; i < points.length ; i++ ) {

            if( points[i][0] < xmin ) { xmin = points[i][0]; }
            if( points[i][0] > xmax ) { xmax = points[i][0]; }
            if( points[i][1] < ymin ) { ymin = points[i][1]; }
            if( points[i][1] > ymax ) { ymax = points[i][1]; }

        }

        b.x = [xmin,xmax];
        b.y = [ymin,ymax];

        return b;

    }

    /**
     * Add a polygonal boundary to the canvas. This can be used to keep shapes inside it or outside it.
     * Points format: [ [x,y] , [x,y] , ... ]
     * 
     * @param {*} name 
     * @param {*} points 
     * @param {*} type 
     */
    _p.instance.prototype.addBoundary = function( name , points , type ) {
        // Minimum point count is 3 for a polygon (aka triangle)
        if( points.length < 3 ) { return false; }

        this.boundaries.push({
            name: name,
            points: points,
            type: type // 0 = Outer ; 1 = Inner 
        });

        return true;

    }

    _p.instance.prototype.removeBoundaryById = function( id ) {

        if( id < 0 || id >= this.boundaries.length ) { return false; }
        this.boundaries.splice( id , 1 );
        return true;

    }

    _p.instance.prototype.removeBoundaryByName = function( name ) {

        var remd = 0;
        for( var i = 0 ; i < this.boundaries.length; i++ ) {

            if( this.boundaries.name == name ) {
                this.boundaries.splice( i , 1 );
                remd++;
            }

        }

        return remd;

    }

    _p.instance.prototype.transformLine = function( repo , id , cfg ) {

        if( id < 0 || id >= this[repo].length ) { return false; }

        var actions = ["flip","rotate","scale","move","place"];
        var action = cfg.action.trim().toLowerCase();
        if( actions.indexOf( action ) < 0 ) { return false; }

        var line = this[repo][ id ];
        var pts = line.points;
        var converted = _p.convertPointsToVectors( pts , THREE.Vector2 );

        VDS.module.shape[ action+"Shape" ]( converted , cfg.value );

        var reverted = _p.convertVectorsToPoints( converted ); // Necessary non-sense due to D3.js structural inconsistencies with THREE.js
        line.points = reverted;
        line.path.datum( line.points ); // Update the curve shape (visual only)

    }

    _p.instance.prototype.flipLine = function( repo , id , axis ) {

        this.transformLine( repo , id , {
            action: "flip",
            value: axis
        });

    }
    _p.instance.prototype.rotateLine = function( repo , id , amount ) {

        this.transformLine( repo , id , {
            action: "rotate",
            value: amount
        });

    }
    _p.instance.prototype.placeLine = function( repo , id , position ) {

        this.transformLine( repo , id , {
            action: "place",
            value: position
        });

    }
     
    _p.instance.prototype.registerEvents = function() {

        var buttons = this.wrapper.find('[vds-type="event"]');

        buttons.each(function(index){

            var b = $(buttons[index]);
            var id = b.attr("id");

            b.click(function(){

                if( this.events !== undefined && this.events[id] !== undefined && typeof this.events[id] == 'function' ) {

                    this.events[id]( this );
    
                }

            }.bind(this));
             

        }.bind(this));
  
 

    }
 

    _p.instance.prototype.addToList = function( id , icon , color, uuid , repo ) {

        var target = this.trees[ repo ];

        var h = '';
        h += '<div class="item" id="path-'+uuid+'">';
        h += '   <div class="left floated content"><i class="'+icon+' ui avatar image"></i></div>';
        h+= '    <div class="left floated content color-icon" style="background:'+color+';"></div>';
        h += '   <div class="right floated content" id="remove-path-'+uuid+'"><div class="ui button"><i class="trash alternate outline icon"></i></div></div>';

        h += '    <div class="content">';
        h += '      <a class="header" id="select-path-'+uuid+'" style="font-size:16px;padding-top:3px;"> &nbsp; '+id+'</a>';
        h += '    </div>';
        h += ' </div>';

        target.prepend(h);
    
        target.find("#select-path-"+uuid).click( function() {
 
            this.active[ repo] = this.getPathIndex( uuid , repo );
            this.redraw();

        }.bind(this));

        target.find("#remove-path-"+uuid).click( function() {
            
            this.removePath( uuid , true , target , repo );
            this.redraw();

        }.bind(this));

    }

    _p.instance.prototype.removePath = function( id , isUUID , tree , repo ) {

        var id = isUUID == true ? this.getPathIndex( id , repo ) : id;
        if( id < 0 || id >= this[repo].length ) { return false; }
        var uuid = this[repo][id].uuid;
        this[repo][id].path.remove();
        this[repo].splice( id , 1 );

         
        this.active[ this.mode ] = this[repo].length > 0 ? this[repo].length-1 : -1;

        tree.find("#path-"+uuid).remove();

    }

    _p.instance.prototype.getPathIndex = function( uuid , repo ) {

        if( this[repo] == undefined ) { return -1; }

        for( var i = 0 ; i < this[repo].length; i++ ) {
            if( this[repo][i].uuid == uuid ) {
                return i;
            } 
        }
        return -1;

    }

    _p.instance.prototype.getLineIndex = function( uuid ) {
        return this.getPathIndex(uuid,"lines");
    }

    _p.instance.prototype.addPath = function( type , name , color , points ) {

        var line = d3.line();

        if( type == "lines" ) {

            line.curve(d3.curveCatmullRom);

        } else if( type == "polygons" ) {
            line.curve(d3.curveLinearClosed);
            
        }

         

      
        var defPts = type == "lines" ? [ [50+ 20*this[type].length,50] , [50+ 20*this[type].length,200] ] : [ [100,100] , [200,100] , [200,200] ];
        var pts = points == undefined ? defPts : points;

        var id = this[type].push({
            type: type,
            name: name, 
            line: line,
            path: null,
            color: color,
            uuid: THREE.Math.generateUUID(),
            points: pts,
            closed: false,
            tension: 0.0 
        }) - 1;
        
        this.appendSVGPath( type , id , color );

        return id;

    }

    _p.instance.prototype.appendSVGPath = function( type , id ) {

        var path = this.svg.append("path");
        this[type][id].path = path;

        path.datum( this[type][id].points )
        .attr("class", type )
        .attr("stroke", this[type][id].color )
        .attr("id", this[type][id].uuid )
        .attr("marker-end", "url(#triangle)");
        

    }

    _p.instance.prototype.clonePath = function( index , useUUID , repo ) {

        var id = useUUID == undefined || useUUID == false ? index : this.getPathIndex( index , repo );
        if( id < 0 || id >= this[repo].length ) { return false; }

        var pts = JSON.parse(JSON.stringify(this[repo][ id ].points));

        var randCol = "rgba( "+Math.random()*255+" , "+Math.random()*255+" , "+Math.random()*255+" , 1.0 )";
        var lineID = this.addPath( this[repo][id].type , "CatmullRomCurve" , randCol , pts );
         
        this.active[ this.mode ] = lineID;
         
        this.addToList( "Line "+this.active[ this.mode ] , "star half outline icon" , randCol , this[repo][lineID].uuid , repo );

    }

    _p.instance.prototype.addEdge = function( p1 , p2 ) {

        var eline = d3.line();
        var edge = this.svg.append("path");
        edge.datum([ 
            p1,
            p2
        ])
        .attr("class","edge")
        .attr("d",eline); // Must be added after the datum component

    }

    _p.instance.prototype.drawBoundaryPolygon = function( p , type ) {
        
        if( p.length < 3 ) { return false; }

        var eline = d3.line();
        eline.curve(d3.curveLinearClosed);
        var path = this.svg.append("path");

        path.datum(p)
            .attr("class","boundary")
            .attr("d",eline); // Must be added after the datum component

        if( type == 1 ) {
            path.attr("fill","url(#hash4_4)");
        }

    }

    _p.instance.prototype.pointIsLegal = function( p ) {

        var legal = true;
        for( var i = 0 ; i < this.boundaries.length; i++ ) {

            legal = VDS.module.calculate.pointInPolygon( p , this.boundaries[i].points );
            if( this.boundaries[i].type == 1 ) {
                legal = !legal;
            }
            if( !legal ) { break; }
 
        }

        return legal;

    }
 

    _p.instance.prototype.redraw = function() {
        
        var _root = this;
        var active = this.active[ this.mode ];

        var lines = this.svg.selectAll("path.lines");
        var polygons = this.svg.selectAll("path.polygons");
        lines.remove();
        polygons.remove();
 
        for( var i = 0 ; i < this[ this.mode ].length; i++ ) {

            this.appendSVGPath( this.mode , i );

            this[ this.mode ][i].path.attr("d", this[ this.mode ][i].line );

        }
 
         
        /*
         

        paths.each(function(d){

            var p = d3.select(this);
            var uuid = p.attr("id");
            var id = _root.getPathIndex(uuid , _root.mode );
            if( id < 0 ) { return; }
            
            p.attr("d", _root[ _root.mode ][id].line );

        });
        */

        var bounds = this.svg.selectAll("path.boundary").remove();

        for( var i = 0 ; i < this.boundaries.length; i++ ) {

            this.drawBoundaryPolygon( this.boundaries[i].points , this.boundaries[i].type );

        }

        var edges = this.svg.selectAll("path.edge").remove();
        if( this.mode == "lines") { 

            if( this[ this.mode ].length >= 2 ) {
    
                for( var i = 0 ; i < this[ this.mode ].length-1; i++ ) {
                    if( this[ this.mode ][i].points.length < 2 || this[ this.mode ][i+1].points.length < 2 ) { continue; }
                    // Top edge
                    this.addEdge(
                        this[ this.mode ][i].points[0],
                        this[ this.mode ][i+1].points[0]
                    );
                    // Bottom edge
                    this.addEdge(
                        this[ this.mode ][i].points[ this[ this.mode ][i].points.length-1 ],
                        this[ this.mode ][i+1].points[ this[ this.mode ][i+1].points.length-1 ]
                    );

                }

            }

        }
    
        if( this[ this.mode ].length == 0 || active < 0 ) {

            this.svg.selectAll("circle").remove();
            return;

        }

        var circle = this.svg.selectAll("circle").data( this[ this.mode ][ active ].points, function(d) { return d; } );
        
         
        var handleRad = this.mode == "lines" ? 13 : 9;

        circle.enter().append("circle")
            .attr("r", 1e-6)
            .attr("cx", 55)
            .attr("cy", 55)
            .on("mousedown", function(d) { _root.selected = _root.dragged = d; _root.redraw(); })
            .on("touchstart", function(d) { _root.selected = _root.dragged = d; _root.redraw(); })
            .transition(d3.easeLinear)
            .duration(500)
             
            .attr("r", handleRad);
       

        circle
            .classed("selected", function(d) { return d === _root.selected; })
            .attr("cx", function(d) { return d[0]; })
            .attr("cy", function(d) { return d[1]; });

        circle.exit().remove();

        // Place handles in the right locations when a curve is created/selected
        var i = 0;
        var cc = this.svg.selectAll("circle");
        cc.each(function(d){
            var p = d3.select(this);
            var pos = _root[ _root.mode ][ _root.active[ _root.mode ] ].points[i];
            p.attr("cx",pos[0] )
             .attr("cy",pos[1]);
            i++
        });

        if (d3.event) {
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }

    }

     

    _p.instance.prototype.mousedown = function() {
        
        var active = this.active[ this.mode ];
        if( active < 0 || active >= this[ this.mode ].length ) {
            return;
        }

        var m = d3.mouse( this.svg.node() );
        
        if( this.moveLine == true ) {
            this.mouseDown = true;
            
            this.mouseStart = m;
            return;
        }

        var legal = this.pointIsLegal(m);
 
        if( legal ) { 
            this[ this.mode ][ active ].points.push( this.selected = this.dragged = m );
        } else {
            console.log("You can't create a point here. The boundaries don't permit it!")
        }

        this.redraw();

    }

    _p.instance.prototype.mousemove = function() {
         
        var active = this.active[ this.mode ];
        if( this.moveLine == true && active >= 0 && active < this[ this.mode ].length ) {

            var m = d3.mouse( this.svg.node() );
         
            if( this.mouseDown ) {

                // Get the initial points and center of the shape (necessary for boundary calculations)
                var conv = _p.convertPointsToVectors( this[ this.mode ][ active ].points , THREE.Vector2 );
                var startPos = VDS.module.shape.shapeCenter( conv );

                // Get the mouse movement speed and direction per frame
                var md = [ m[0] - this.mousePos[0] , m[1] - this.mousePos[1] ];
                var vec2 = new THREE.Vector2();
                // Fix the movement plane (x,y or both axis allowed)
                if( this.moveAxis == 0 ) { vec2.x = md[0]; vec2.y = md[1]; }
                if( this.moveAxis == 1 ) { vec2.x = md[0]; vec2.y = 0; }
                if( this.moveAxis == 2 ) { vec2.x = 0; vec2.y = md[1]; }
                
                // Transform the path 
                this.transformLine( this.mode , active , {
                    action: "move",
                    value: vec2
                });

                // Check for any boundaries on the canvas and stop any movement if an illegal move is made
                var lpts = this[ this.mode ][ active ].points;
                var lptsFix = lpts.slice(0);
                lptsFix.push(lpts[0]); // Important fix (copy the points array and add an extra element to close the shape). Done for collision checks only

                var illegal;
                for( var i = 0 ; i < this.boundaries.length; i++ ) {
                                    
                    if( this.boundaries[i].type == 0 ) {

                        illegal = VDS.module.calculate.pathPointOutsidePolygon( lpts , this.boundaries[i].points );

                    } else if( this.boundaries[i].type == 1 ) {
  
                        illegal = VDS.module.calculate.polygonsOverlap( lptsFix , this.boundaries[i].points );
                    }
                    // If there is any point outside/inside of the polygon boundary (depending on boundary type)
                    // Place the path back to its previous position (which is assumed to be legal)
                    if( illegal ) {
                        this.placeLine( this.mode , active , startPos );
                    }
                
                }

                this.redraw();

            }
             
            this.mousePos = [ m[0] , m[1] ];

            return; // Important
        } 

        if (!this.dragged) { return; }
        var m = d3.mouse( this.svg.node() );

        var x = m[0];
        var y = m[1];
        var gsize = this.gridSize;
        if( this.snapToGrid == true ) {
            x = Math.floor(x / gsize)*gsize;
            y = Math.floor(y / gsize)*gsize;
        }

        var legal = this.pointIsLegal( [x,y] );
         
        if( legal ) { 
            this.dragged[0] = Math.max(0, Math.min( this.width, x ));
            this.dragged[1] = Math.max(0, Math.min( this.height, y ));
        }
        this.redraw();

    }

    _p.instance.prototype.mouseup = function() {
        this.mouseDown = false;
        if (!this.dragged) { return; }
        this.mousemove();
        this.dragged = null;
    }

    _p.instance.prototype.keydown = function() {

        if (!this.selected) { return; }
        var active = this.active[ this.mode ];
        if( active < 0 ) { return; }

        switch (d3.event.keyCode) {
            case 8: // backspace
            case 46: { // delete
            var i = this[ this.mode][ active ].points.indexOf(this.selected);
            this[ this.mode ][ active ].points.splice(i, 1);
            this.selected = this[ this.mode][ active ].points.length ? this[ this.mode][ active ].points[i > 0 ? i - 1 : 0] : null;
            this.redraw();
            break;
            }
        }

    }

    _p.instance.prototype.drawGrid = function() {

        
        // domain is the actual viewport center point and the start and end of the 
        // range is the length visible - see docs https://github.com/d3/d3-scale/blob/master/README.md#_continuous
        var xScale = d3.scaleLinear()
        .domain([-this.width / 2, this.width / 2])
        .range([0, this.width]);
        
        // we'll do the same thing for the y axis except the positive values start from the top with height first in the range
        // this allows us to have all positive coordinates (e.g [2,2]) in the top right hand corner.
        var yScale = d3.scaleLinear()
            .domain([-this.height / 2, this.height / 2])
            .range([this.height, 0]);
        // this allows us to configure our axis and frequency of the lines in th grid,
        // notice the tick size streteches the length of the canvas. 
        var xAxis = d3.axisBottom(xScale)
            .ticks((this.width + 2) / (this.height + 2) * 10)
            .tickSize(this.height)
            .tickPadding(8 - this.height);
        var yAxis = d3.axisRight(yScale)
            .ticks(10)
            .tickSize(this.width)
            .tickPadding(8 - this.width);
            // finally we can append our axis onto an svg group tag. 
        var gX = this.svg.append("g")
            .attr("class", "axis axis--x")
            .call(xAxis);
        var gY = this.svg.append("g")
            .attr("class", "axis axis--y")
            .call(yAxis);

    }
 
    return _p;

})({});