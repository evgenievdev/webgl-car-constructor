

<!-- Editor Menu -->
<button id="editor-menu"  class="ui inverted blue basic icon button big" style="position:absolute;top:30px;left:20px;">
    <i class="file outline icon"></i>
</button>

<div id="editor-options" style="position:absolute;top:30px;left:80px;white-space: nowrap;">

    <button id="pause" class="ui inverted blue basic icon button sm-right">
        <i class="pause circle outline icon"></i> Pause
    </button><br class="sm-br"/>

    <button id="load"  class="ui inverted blue basic icon button sm-right">
        <i class="folder open outline icon"></i> Open
    </button><br class="sm-br"/>

    <button id="save"  class="ui inverted blue basic icon button sm-right">
        <i class="save outline icon"></i> Save
    </button><br class="sm-br"/>
 
    <button id="export"  class="ui inverted blue basic icon button sm-right">
        <i class="download icon"></i> Export
    </button><br class="sm-br"/>
    <button id="reset"  class="ui inverted red icon button sm-right">
        <i class="trash alternate outline icon"></i> Reset
    </button><br class="sm-br"/> 

</div>

<!-- Physics Simulations -->
<button id="physics-menu"  class="ui inverted blue basic icon button big" style="position:absolute;top:90px;left:20px;">
    <i class="dolly icon"></i>
</button>
<div id="physics-options" style="position:absolute;top:90px;left:80px;white-space: nowrap;">
    <button id="weight-distribution"  class="ui inverted blue basic icon button sm-right">
        <i class="balance scale icon"></i> Centre of Gravity
    </button><br class="sm-br"/>
    <button id="wind-tunnel"  class="ui inverted blue basic icon button sm-right">
        <i class="car icon"></i> Aerodynamics
    </button><br class="sm-br"/>
     
</div>

<!-- Edit Mode -->
<button id="edit-mode-menu"  class="ui inverted blue basic icon button big" style="position:absolute;top:150px;left:20px;">
    <i class="edit icon"></i>
</button>
<div id="edit-mode-options" style="position:absolute;top:150px;left:80px;white-space: nowrap;">
    <button id="free"  class="ui inverted blue basic icon button sm-right tiny">
        FREE
    </button><br class="sm-br"/>
    <button id="panels"  class="ui inverted blue basic icon button sm-right tiny">
        PANELS
    </button><br class="sm-br"/>
    <button id="cage"  class="ui inverted blue basic icon button sm-right tiny">
        CAGE
    </button><br class="sm-br"/>
</div>


<button id="select-component" class="ui inverted blue basic icon button big" style="position:absolute;top:30px;right:20px;z-index:10001;">
    <i class="bars icon"></i>
</button>
<div id="component-options" class="circular-menu" style="position:absolute;left:50%;top:50%;z-index:10000;">
    <div class='selector'>
        <ul>
            <li>
                <input id='c1' type='checkbox'>
                <label for='c1' id="component-chassis"><br/><img src="icons/chassis.svg"></label>
            </li>
            <li>
                <input id='c2' type='checkbox'>
                <label for='c2' id="component-engine"><br/><img src="icons/engine.svg" ></label>
            </li>
            <li>
                <input id='c3' type='checkbox'>
                <label for='c3' id="component-transmission"><br/><img src="icons/transmission.svg" ></label>
            </li>
            <li>
                <input id='c4' type='checkbox'>
                <label for='c4' id="component-body"><br/><img src="icons/exterior.svg" ></label>
            </li>
            <li>
                <input id='c5' type='checkbox'>
                <label for='c5' id="component-paint"><br/><img src="icons/paint.svg"></label>
            </li>
            <li>
                <input id='c6' type='checkbox'>
                <label for='c6' id="component-rims"><br/><img src="icons/rim.svg" ></label>
            </li>
            <li>
                <input id='c7' type='checkbox'>
                <label for='c7' id="component-tires"><br/><img src="icons/wheels.svg"></label>
            </li>
            <li>
                <input id='c8' type='checkbox'>
                <label for='c8' id="component-axles"><br/><img src="icons/suspension.svg"></label>
            </li>
            
        </ul>
    </div>
</div>

<button id="change-language"  class="ui inverted blue basic icon button big" style="position:absolute;bottom:90px;right:20px;">
    <i class="language icon"></i>
</button>

<div id="language-options" style="position:absolute;bottom:90px;right:80px;white-space: nowrap;">
    <button id="english"  class="ui inverted blue basic icon button sm-right">
        EN
    </button><br class="sm-br"/> 
    <button id="german"  class="ui inverted blue basic icon button sm-right">
        DE
    </button><br class="sm-br"/>
    <button id="bulgarian"  class="ui inverted blue basic icon button sm-right">
        BG
    </button><br class="sm-br"/>
</div>

<button id="change-camera"  class="ui inverted blue basic icon button big" style="position:absolute;bottom:30px;right:20px;">
    <i class="camera icon"></i>
</button>

<div id="camera-options" style="position:absolute;bottom:30px;right:80px;white-space: nowrap;">
    <button id="default"  class="ui inverted blue basic icon button sm-right">
        Freeview
    </button><br class="sm-br"/> 
    <button id="side"  class="ui inverted blue basic icon button sm-right">
        Side
    </button><br class="sm-br"/>
    <button id="top"  class="ui inverted blue basic icon button sm-right">
        Top
    </button><br class="sm-br"/>
    <button id="front"  class="ui inverted blue basic icon button sm-right">
        Front
    </button><br class="sm-br"/>
    <button id="back"  class="ui inverted blue basic icon button sm-right">
        Back
    </button>
</div>