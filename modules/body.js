var VDS = VDS || {};
VDS.module = VDS.module || {};

VDS.module.body = (function( _p ) {

    _p.instance = function( editor ) {

        this.editor = editor;
        this.parts = {};

        this.activeGroup = null;
        this.activePanel = -1;

    }

    _p.instance.prototype.setActiveGroup = function( group ) {

        if( this.groupExists(group) ) { return false; }
        this.activeGroup = group;
        return true;

    }

    _p.instance.prototype.setActivePanel = function( group , panelID ) {

        if( this.setActiveGroup( group ) == false ) { return false; }
        if( this.parts[group].panels[panelID] == undefined ) { return false; }

        this.activePanel = panelID;
        return true;

    }

    _p.instance.prototype.clearActiveGroup = function() {

        this.activeGroup = null;

    }

    _p.instance.prototype.clearActivePanel = function() {

        this.clearActiveGroup();
        this.activePanel = -1;
        
    }
 
    /**
     * 
     * @param {*} group 
     */
    _p.instance.prototype.addGroup = function( group ) {

        if( this.groupExists(group) ) { return false; }

        this.parts[group] = {
            active: null,
            panels: {}
        };

        return true;

    }

    _p.instance.prototype.getGroup = function( group ) {

        if( !this.groupExists(group) ) { return false; }

        return this.parts[group];
 

    }

    _p.instance.prototype.getGroupList = function() {

        var list = [];
        for( var g in this.parts ) {
            list.push(g);
        }
        return list;
 

    }

    /**
     * 
     * @param {*} group 
     */
    _p.instance.prototype.groupExists = function( group ) {

        if( this.parts[group] == undefined ) {
            return false;
        }
        return true;

    }

    /**
     * 
     * @param {*} group 
     * @param {*} panel 
     */
    _p.instance.prototype.panelExists = function( group , panel ) {

        if( !this.groupExists(group) ) { return false; }
        if( this.parts[group].panels[panel] == undefined ) {
            return false;
        }
        return true;

    }
 
    /**
     * 
     * @param {*} group 
     * @param {*} panel 
     * @param {*} render 
     */
    _p.instance.prototype.panelGetRender = function( group , panel , render ) {

        if( !this.panelExists( group, panel ) ) { return false; }
        
        var obj = this.parts[group].panels[panel];
        var len = obj.renders.length;
        if( len <= 0 ) { return false; }
      
        if( render == "last" ) { render = len-1; }
        else if( render == "first" ) { render = 0; }
        else if( render == "prev" ) { 
            obj.activeRender--;
            if( obj.activeRender < 0 ) { obj.activeRender = 0; }
            render = obj.activeRender; 
        } else if( render == "next" ) { 
            obj.activeRender++;
            if( obj.activeRender >= len ) { obj.activeRender = len-1; }
            render = obj.activeRender; 
        } else if( render == "current" ) {
            THREE.Math.clamp( obj.activeRender , 0 , len-1 );
            render = obj.activeRender; 
        }

        if( render < 0 || render >= len ) { 
            return false;
        }

        return this.parts[ group ].panels[ panel ].renders[ render ];

    }

    /**
     * 
     * @param {*} id 
     * @param {*} group 
     * @param {*} instance 
     * @param {*} setActive 
     */
    _p.instance.prototype.addPanel = function( id , group , instance , setActive ) {

        if( !this.groupExists(group) ) { return false; }
        // If this panel doesn't exist yet, create it's structure
        if( this.parts[group].panels[id] == undefined ) {
            this.parts[group].panels[id] = {
                renders: [],
                activeRender: -1
            }
        }
         
        var index = this.parts[group].panels[id].renders.push( instance ) - 1;
        this.parts[group].panels[id].activeRender = index;

        if( setActive === true ) {
            this.parts[group].active = id;
        }

        return true;

    }

    _p.instance.prototype.getPanel = function( group , id ) {

        if( !this.panelExists(group,id) ) { return false; }

        return this.parts[group].panels[id];

    }
 
    _p.instance.prototype.removePanel = function( group , id ) {

        if( !this.panelExists(group,id) ) { return false; }

        var g = this.parts[group];
        var obj = this.getPanel(group,id);

        if( g.active == id )  { g.active = null; }

        while( obj.renders.length > 0 ) {

            var panel = obj.renders[0];

            this.editor.materials.removeMeshReference( panel.mesh );
   
            this.editor.scene.remove(panel.mesh);
            this.editor.scene.remove(panel.pivot);
            panel.removePointHandles();

            obj.renders.splice(0,1);
            
        }

        delete g.panels[id];

    }

    _p.instance.prototype.removePanels = function() {

        this.clearActiveGroup();
        this.clearActivePanel();

        for( var g in this.parts ) {
            this.removeGroup(g);
        }

    }

    _p.instance.prototype.removeGroup = function( group ) {
        
        if( !this.groupExists(group) ) { return false; }

        for( var p in this.parts[group].panels ) {
            this.removePanel( group , p );
        }

    }

    _p.instance.prototype.clonePanel = function( group , id ) {

        var orig = this.panelGetRender(group,id,"last");
        if( orig === false ) { return false; }

        var panel = new VDS.module.panel.instance( this.editor , {
            curves: orig.cloneCurves(),
            order: orig.createOrder(false),
            numPoints: orig.numPoints,
            stepsBetweenCurves: orig.stepsBetweenCurves,
            offset: new THREE.Vector3() 
        });
 
        panel.mesh.castShadows = true;
      
        // VDS properties object (used by raycasters to determine which is which)
        panel.mesh["vds"] = {
            group: group,
            id: panel.id
        };

        this.addPanel( panel.id , group , panel , true );

        return panel;
 
    }
 

    _p.extrudeShapes = function( shapes ) {

    }

    _p.buildCageGeometry = function( curves , connections ) {

    }

     

     

    return _p;

})({});