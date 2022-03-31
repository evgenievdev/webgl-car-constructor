<div id="edit-drivetrain" vds-tool="edit-drivetrain" style="display:none;left:50%;top:50%; position:absolute;border:solid 2px rgba(255,255,255,0.5);border-radius:5px;padding:25px;background:rgba(0,0,0,0.5);color:#FFF;">

    <button id="close" class="ui inverted blue basic icon button" style="position:absolute;top:-40px;left:0px;">x</button>

    <b>ENGINE POSITION:</b><br/>
    <button id="engine-move-forward" class="ui inverted blue basic icon button medium"> <i class="angle double left icon"></i> </button>
    <button id="engine-move-back" class="ui inverted blue basic icon button medium"> <i class="angle double right icon"></i> </button>
    
</div>

<div class="ui dimmer" id="edit-engine" style="z-index:1000000;overflow:auto;">
    <button class="ui inverted red basic button" id="close" style="margin-bottom:20px;">Close</button>
    <div class="ui cards"></div>
</div>

<div class="ui dimmer" id="edit-transmission" style="z-index:1000000;overflow:auto;">
    <button class="ui inverted red basic button" id="close" style="margin-bottom:20px;">Close</button>
    <div class="ui cards"></div>  
</div>