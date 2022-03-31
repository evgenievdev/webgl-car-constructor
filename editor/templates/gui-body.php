<div class="ui dimmer" id="edit-body" style="z-index:1000000;overflow:auto;">
    <button class="ui inverted red basic button" id="close" style="margin-bottom:20px;">Close</button>
    <div style="width:90vw;max-width:1400px;border:solid 1px white;">
        
        <div class="ui top attached tabular menu" id="tab-links">
            <a class="item active" data-tab="panel-canvas-tab">2D Prototype</a>
            <a class="item" data-tab="panel-library-tab">Panels</a>
        </div>
        <div class="ui bottom attached tab segment active" data-tab="panel-canvas-tab" style="background:transparent!important;">
            
            <button class="ui basic inverted button" id="create">
                <i class="icon plus"></i>
                New Line
            </button>
            
            <button class="ui basic inverted button" id="clear-canvas">
                <i class="ban icon"></i>
                Clear Canvas
            </button>
            
            <button class="ui basic inverted button" id="build" vds-type="event">
                <i class="gavel icon"></i>
                Build
            </button>
            <div class="ui stackable grid">
                <div class="row"> 
                    <div class="ten wide column">
                        <div style="width:800px;height:600px;position:relative;overflow:hidden;">
                            <div class="canvas-editor" style="position:absolute;width:800px;height:600px;border:solid 1px #CCC;"></div>
                        </div>
                    </div>
                    <div class="six wide column">
                        <div>
                            <button class="ui basic inverted button" id="clone">
                                <i class="clone outline icon"></i>
                            </button>
                                
                            <button class="ui basic inverted button" id="flip-horizontal">
                                <i class="arrows alternate horizontal icon"></i>
                            </button>
                            <button class="ui basic inverted button" id="flip-vertical">
                                <i class="arrows alternate vertical icon"></i>
                            </button>
                            <button class="ui basic inverted button" id="rotate-left">
                                <i class="undo icon"></i>
                            </button>
                            <button class="ui basic inverted button" id="rotate-right">
                                <i class="redo icon"></i>
                            </button>
                            <br/>
                            <button class="ui button" id="move">
                                <i class="hand pointer outline icon"></i>
                            </button>
                            <button class="ui button" id="move-axis">
                                <i class="arrows alternate icon"></i>
                            </button>
                            <button class="ui button" id="scale">
                                <i class="expand icon"></i>
                            </button>
                            <button class="ui button" id="scale-axis">
                                <i class="expand arrows alternate icon"></i>
                            </button>
                            <button class="ui button" id="snap">
                                <i class="bullseye icon"></i>
                            </button>
                        </div><br style="clear:both;"/>

                        <div id="line-tree" class="ui middle aligned divided list"></div>
                        <div id="shapes"></div>
                        <div id="polygon-tree" class="ui middle aligned divided list"></div>
                    </div>
                </div>
            </div>

        </div>
        <div class="ui bottom attached tab segment" data-tab="panel-library-tab" style="background:transparent!important;">
            <div id="panels-library">

            </div>
        </div>
            

            

    </div> 
</div>