// Events
// init() once the page has finished loading.
// window.onload = init;

var filters;
var started = false;
var frequency = 2000;
var resonance = 5;
var gain = 2;

var canvas;
var canvasContext;
var canvasWidth = 0;
var canvasHeight = 0;

var curveColor = "rgb(224,27,106)";
var playheadColor = "rgb(80, 100, 80)";
var gridColor = "rgb(100,100,100)";
var textColor = "rgb(81,127,207)";

var dbScale = 60;
var pixelsPerDb;
var width;
var height;

var numFilters = 5;

function startAudio() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    // analyserNode = context.createAnalyser();
    // const audio = new Audio("project-22955.wav");
    // const source = context.createMediaElementSource(audio);
    // console.log(context.sampleRate);
    // analyserNode.fftSize = 16384;
    // source.connect(analyserNode);
    // source.connect(context.destination);
    // audio.play();
}

function dbToY(db) {
    var y = (0.5 * height) - pixelsPerDb * db;
    return y;
}

function drawCurve() {
    // draw center
    width = canvas.width;
    height = canvas.height;

    canvasContext.clearRect(0, 0, width, height);

    canvasContext.strokeStyle = curveColor;
    canvasContext.lineWidth = 3;
    canvasContext.beginPath();
    canvasContext.moveTo(0, 0);

    pixelsPerDb = (0.5 * height) / dbScale;
    
    var noctaves = 11;
    
    var frequencyHz = new Float32Array(width);
    var magResponse = new Float32Array(width);
    var phaseResponse = new Float32Array(width);
    var nyquist = 0.5 * context.sampleRate;
    // First get response.
    for (var i = 0; i < width; ++i) {
        var f = i / width;
        
        // Convert to log frequency scale (octaves).
        f = nyquist * Math.pow(2.0, noctaves * (f - 1.0));
        
        frequencyHz[i] = f;
    }

    var dbResponses = new Array(width).fill(0);

    for (var i = 0; i < numFilters; i++) {
        filters[i].getFrequencyResponse(frequencyHz, magResponse, phaseResponse);
        dbResponses = magResponse.map(function (response, idx) {
            return 20.0 * Math.log(response) + dbResponses[idx];
          });
    }

    
    for (var i = 0; i < width; ++i) {
        var x = i;
        var y = dbToY(dbResponses[i]);
        
        if ( i == 0 )
            canvasContext.moveTo(x, y);
        else
            canvasContext.lineTo(x, y);
    }
    canvasContext.stroke();
    canvasContext.beginPath();
    canvasContext.lineWidth = 1;
    canvasContext.strokeStyle = gridColor;
    
    // Draw frequency scale.
    for (var octave = 0; octave <= noctaves; octave++) {
        var x = octave * width / noctaves;
        
        canvasContext.strokeStyle = gridColor;
        canvasContext.moveTo(x, 30);
        canvasContext.lineTo(x, height);
        canvasContext.stroke();

        var f = nyquist * Math.pow(2.0, octave - noctaves);
        var value = f.toFixed(0);
        var unit = 'Hz';
        if (f > 1000) {
          unit = 'KHz';
          value = (f/1000).toFixed(1);
        }
        canvasContext.textAlign = "center";
        canvasContext.strokeStyle = textColor;
        canvasContext.strokeText(value + unit, x, 20);
    }

    // Draw 0dB line.
    canvasContext.beginPath();
    canvasContext.moveTo(0, 0.5 * height);
    canvasContext.lineTo(width, 0.5 * height);
    canvasContext.stroke();
    
    // Draw decibel scale.
    
    for (var db = -dbScale; db < dbScale - 10; db += 10) {
        var y = dbToY(db);
        canvasContext.strokeStyle = textColor;
        canvasContext.strokeText(db.toFixed(0) + "dB", width - 40, y);
        canvasContext.strokeStyle = gridColor;
        canvasContext.beginPath();
        canvasContext.moveTo(0, y);
        canvasContext.lineTo(width, y);
        canvasContext.stroke();
    }
}

function frequencyHandler(event, ui, index) {
  var value = ui.value;
  var nyquist = context.sampleRate * 0.5;
  var noctaves = Math.log(nyquist / 10.0) / Math.LN2;
  var v2 = Math.pow(2.0, noctaves * (value - 1.0));
  var cutoff = v2*nyquist;
  
  var info = document.getElementById("frequency-value" + index);
  info.innerHTML = "frequency = " + (Math.floor(cutoff*100)/100) + " Hz";

  filters[index].frequency.value = cutoff;
  drawCurve();
}

function resonanceHandler(event, ui, index) {
  var value = ui.value;

  var info = document.getElementById("Q-value" + index);
  info.innerHTML = "Q = " + (Math.floor(value*100)/100) + " dB";
  
  filters[index].Q.value = value;
  drawCurve();
}

function gainHandler(event, ui, index) {
  var value = ui.value;

  var info = document.getElementById("gain-value" + index);
  info.innerHTML = "gain = " + (Math.floor(value*100)/100);
  
  filters[index].gain.value = value;
  drawCurve();
}


function initAudio() {
    filters = []
    for (var i = 0; i < numFilters; i++) {
        var filter = context.createBiquadFilter();
        filter.Q.value = 5;
        filter.frequency.value = 2000;
        filter.gain.value = 2;
        filter.connect(context.destination);
        filters.push(filter);
    }
}

function init() {
    context = new window.AudioContext || window.webkitAudioContext;

    initAudio();
    var filterHTML = "";
    for (var i = 0; i < numFilters; i++) {
        filterHTML += `<p>Filter ${i}: 
        <select onchange="changeFilterType(this.value, ${i});">
          <option value="lowpass">LowPass</option>
          <option value="highpass">HighPass</option>
          <option value="bandpass">BandPass</option>
          <option value="lowshelf">LowShelf</option>
          <option value="highshelf">HighShelf</option>
          <option value="peaking">Peaking</option>
          <option value="notch">Notch</option>
          <option value="allpass">AllPass</option>
        </select></p>

        <div>
          <input id="frequencySlider${i}" type="range" min="0" max="1" step="0.01" value="0" style="height: 20px; width: 200px;">
          <span id="frequency-value${i}" style="position:relative; top:-5px;">frequency = 1277.46 Hz</span>
        </div>
        <div>
          <input id="QSlider${i}" type="range" min="0" max="20" step="0.01" value="0" style="height: 20px; width: 200px;">
          <span id="Q-value${i}" style="position:relative; top:-5px;">Q = 8.59 dB</span>
        </div>
        <div>
          <input id="gainSlider${i}" type="range" min="0" max="5" step="0.01" value="0" style="height: 20px; width: 200px;">
          <span id="gain-value${i}" style="position:relative; top:-5px;">gain = 3.12</span>
        </div>`;
    }
    document.getElementById('filterSettings').innerHTML = filterHTML;
    
    canvas = document.getElementById('canvasID');
    canvasContext = canvas.getContext('2d');
    canvasWidth = parseFloat(window.getComputedStyle(canvas, null).width);
    canvasHeight = parseFloat(window.getComputedStyle(canvas, null).height);

    for (var i = 0; i < numFilters; i++) {
        configureSlider("frequency", .68, 0, 1, frequencyHandler, i);
        configureSlider("Q", resonance, 0, 20, resonanceHandler, i);
        configureSlider("gain", gain, -10, 10, gainHandler, i);
        drawCurve();
    }
}

function changeFilterType( value, index ) {
  filters[index].type = value;
  drawCurve();
}

function configureSlider(name, value, min, max, handler, index) {
    var divName = name + "Slider" + index;

    var slider = document.getElementById(divName);

    slider.min = min;
    slider.max = max;
    slider.value = value;
    slider.oninput = function() { handler(0, this, index); };
}

window.onclick = function() {
    if (!started) {
        started = true;
        this.startAudio();
        this.init();
        // this.visualize();
    }
}