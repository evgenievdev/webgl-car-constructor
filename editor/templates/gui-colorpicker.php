<div class="ui dimmer" id="color-picker" style="z-index:1000000;overflow:auto;">
    <button id="close"  class="ui inverted blue basic icon button tiny" >
        CLOSE
    </button><br/>
        
    <div class="ui stackable two column grid">
        <div class="column">
            <h4 class="ui horizontal inverted divider">
                PROPERTIES 
            </h4><br/> 
            <form class="ui form">

                <div class="ui segment">

                    <div class="field">
                        <div class="ui toggle checkbox" id="toggle-transparent">
                            <input type="checkbox" name="transparent" tabindex="0" class="hidden">
                            <label>Enable Transparency</label>
                        </div>
                    </div>
                    <br/>Opacity: <br/>
                    <div class="slidecontainer">
                        <input type="range" min="0.05" max="1" value="1" step="0.025" class="slider" id="opacity" disabled="true">
                    </div>
                    <br/>Metalness: <br/>
                    <div class="slidecontainer">
                        <input type="range" min="0" max="1" value="0.5" step="0.02" class="slider" id="metalness">
                    </div>
                    <br/>Roughness: <br/>
                    <div class="slidecontainer">
                        <input type="range" min="0" max="1" value="0.5" step="0.02" class="slider" id="roughness">
                    </div>
                </div>

            </form>
        </div>
        <div class="column">
            <h4 class="ui horizontal inverted divider">
                COLOUR
            </h4><br/><br/><br/>
            <div id="color-wheel" style="width:550px;height:550px;position:relative;margin:0pt auto;border:solid 0px white;" class="scalable"></div>
        </div>
    </div>

        
</div>