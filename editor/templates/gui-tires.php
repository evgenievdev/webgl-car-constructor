
<div id="create-tire" vds-tool="create-tire" style="position:relative;z-index:100000;display:none;"></div>

<!-- TIRES MODAL -->
<div class="ui dimmer vds-modal" id="edit-tires" style="overflow:auto;z-index:1000000;">
    <button class="ui inverted red basic button" id="close" style="margin-bottom:20px;">Close</button>
        
    <button id="add-tire" class="ui inverted blue basic icon button">New Tire Instance</button>
        
    
    <div class="ui stackable sixteen column grid">
        <div class="four wide column" id="parts-tires"></div>
        <div class="six wide column" id="tire-options">

            <div id="debug"></div>
            <div id="input">
                <br/>
                <b>--- Basic ---</b><br/>
                Compound:<br/> <input id="tireCompound" type="range" min="0" max="2" value="0" step="1" class="slider"/><br/>
                Pressure (psi):<br/> <input id="tirePressure" type="range" min="20" max="40" value="30" step="1" class="slider"/><br/>
                Tire Width (mm):<br/> <input id="tireWidth" type="range" min="115" max="345" value="205" step="5" class="slider"/><br/>
                Tire Profile (percent):<br/> <input id="aspectRatio" type="range" min="25" max="80" value="55" step="5" class="slider"/><br/>
                Rim Size (inches):<br/> <input id="rimDiameter" type="range" min="8" max="26" value="16" step="1" class="slider"/><br/>
                Inner Width:<br/> <input id="innerWidth" type="range" min="0.5" max="1.0" value="0.8" step="0.05" class="slider"/><br/>
                Roundness:<br/> <input id="roundness" type="range" min="0.1" max="0.45" value="0.25" step="0.05" class="slider"/><br/>
                <br/>
                <b>--- Advanced ---</b><br/>
                Circle Segments:<br/> <input id="points" type="range" min="5" max="100" value="50" step="1" class="slider"/><br/>
                Chamfer Segments:<br/> <input id="bevelSegments" type="range" min="2" max="50" value="7" step="1" class="slider" /><br/>
                Tread Repeat:<br/> <input id="treadRepeat" type="range" min="1" max="25" value="6" step="1" class="slider" /><br/>
                Sidewall Repeat:<br/> <input id="sidewallRepeat" type="range" min="1" max="25" value="6" step="1" class="slider" /><br/>
                <br/><br/>
                <button id="update" class="ui inverted blue basic icon button">Create Tire</button>
                <button id="mount" class="ui inverted blue basic icon button">Mount to Axle</button>
            </div> 

        </div>
        <div class="six wide column" >
            <div id="tire-preview" class="ui sixteen wide column" style="width:100%;min-width:320px;height:320px;"></div>                           
        </div>
    </div>

        
</div>