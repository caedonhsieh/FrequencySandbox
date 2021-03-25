// Events
// init() once the page has finished loading.
// window.onload = init;

var context;
var filters;
var handles;
var started = false;
var frequency = 2000;
var resonance = 5;
var gain = 0;

var canvas;
var canvasContext;
var canvasWidth = 0;
var canvasHeight = 0;

var curveColor = "rgb(224,27,106)";
var playheadColor = "rgb(80, 100, 80)";
var gridColor = "rgb(100,100,100)";
var textColor = "rgb(81,127,207)";
var rtColor = "rgb(40, 200, 40)";

var dbScale = 60;
var pixelsPerDb;
var width;
var height;

var numFilters = 5;
var noctaves = 11;

function dbToY(db) {
  var y = (0.5 * height) - pixelsPerDb * db;
  return y;
}

function yToDb(y) {
  var db = ((0.5 * height)-y)/pixelsPerDb;
  return db;
}

function getFrequencyValue(frequency) {
  var nyquist = context.sampleRate/2;
  var index = Math.round(frequency/nyquist * freqDomain.length);
  return freqDomain[index];
}

function drawCurve() {
    // draw center

    canvasContext.clearRect(0, 0, width, height);

    canvasContext.strokeStyle = curveColor;
    canvasContext.lineWidth = 3;
    canvasContext.beginPath();
    canvasContext.moveTo(0, 0);

    pixelsPerDb = (0.5 * height) / dbScale;
    
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
    canvasContext.strokeStyle = rtColor;

    // Draw real-time curve

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyserNode.getFloatFrequencyData(dataArray);
    for (var i = 0; i < width; i++) {
      var index = Math.round(frequencyHz[i]/nyquist * dataArray.length);
      value = dataArray[index];
      y = dbToY(value+50)
      // y = height - value * height / 255;
      if ( i == 0 )
          canvasContext.moveTo(i, y);
      else
          canvasContext.lineTo(i, y);
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

    setTimeout(drawCurve, 50);
}

function frequencyUIValueToCutoff(value) {
  var nyquist = context.sampleRate * 0.5;
  var v2 = Math.pow(2.0, noctaves * (value - 1.0));
  var cutoff = v2*nyquist;
  return cutoff;
}

function frequencyHandler(event, ui, index) {
  var cutoff = frequencyUIValueToCutoff(ui.value);
  updateFrequency(cutoff, index);
}

function updateFrequency(value, index) {
  var info = document.getElementById("frequency-value" + index);
  info.innerHTML = "freq = " + (Math.floor(value*100)/100) + " Hz";
  filters[index].frequency.value = value;
}

function resonanceHandler(event, ui, index) {
  var value = ui.value;
  updateResonance(value, index);
}

function updateResonance(value, index) {
  var info = document.getElementById("Q-value" + index);
  info.innerHTML = "Q = " + (Math.floor(value*100)/100) + " dB";
  filters[index].Q.value = value;
}

function gainHandler(event, ui, index) {
  var value = ui.value;
  updateGain(value, index);
}

function updateGain(value, index) {
  var info = document.getElementById("gain-value" + index);
  info.innerHTML = "gain = " + (Math.floor(value*100)/100);
  filters[index].gain.value = value;
}

function initAudioContext() {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  context = new AudioContext();
}

function initAudio() {
  const audio = new Audio("project-22955.wav");
  const source = context.createMediaElementSource(audio);
  analyserNode = context.createAnalyser();
  analyserNode.fftSize = 8192;
  analyserNode.minDecibels = -100;
  analyserNode.maxDecibels = 0;

  filters = []
  for (var i = 0; i < numFilters; i++) {
    var filter = context.createBiquadFilter();
    filter.type = "allpass";
    filter.Q.value = 5;
    filter.frequency.value = handles[i].frequency;
    filter.gain.value = handles[i].gain;
    filters.push(filter);
  }
  filters[numFilters-1].connect(context.destination);
  filters[numFilters-1].connect(analyserNode);
  for (var i = numFilters-1; i >=1; i--) {
    filters[i-1].connect(filters[i])
  }
  source.connect(filters[0]);
  audio.play();
}

function init() {
    canvas = document.getElementById('canvasID');
    canvasContext = canvas.getContext('2d');
    canvasWidth = parseFloat(window.getComputedStyle(canvas, null).width);
    canvasHeight = parseFloat(window.getComputedStyle(canvas, null).height);
    width = canvas.width;
    height = canvas.height;

    pixelsPerDb = (0.5 * height) / dbScale;
    initAudioContext();

    let container = document.querySelector("#eq-svg");

    handles = []
    for (var i = 0; i < numFilters; i++) {
      handle = new FilterHandle(80+80*i, 125, 6, i, i);
      handles.push(handle);
      container.append(handle.parent);
    }

    initAudio();
    var filterHTML = "";
    for (var i = 0; i < numFilters; i++) {
        var uiCutoff = Math.floor(handles[i].frequency*100)/100;
        filterHTML += `<div>Filter ${i}: 
          <select onchange="changeFilterType(this.value, ${i});">
            <option value="allpass">AllPass</option>
            <option value="lowpass">LowPass</option>
            <option value="highpass">HighPass</option>
            <option value="bandpass">BandPass</option>
            <option value="lowshelf">LowShelf</option>
            <option value="highshelf">HighShelf</option>
            <option value="peaking">Peaking</option>
            <option value="notch">Notch</option>
          </select>
          <span id="frequency-value${i}" style="position:relative; top:-5px; display: inline-block; width: 150px;">freq = ${uiCutoff} Hz</span>
          <span id="gain-value${i}" style="position:relative; top:-5px; display: inline-block; width: 100px;">gain = 0</span>
          <span id="Q-value${i}" style="position:relative; top:-5px; display: inline-block; width: 100px;">Q = 5 dB</span>
          <input id="QSlider${i}" type="range" min="0" max="20" step="0.01" value="0" style="height: 20px; width: 160px;">
        </div>`;
    }
    document.getElementById('filterSettings').innerHTML = filterHTML;
    
    for (var i = 0; i < numFilters; i++) {
        // configureSlider("frequency", handles[i].x/canvas.width, 0, 1, frequencyHandler, i);
        configureSlider("Q", resonance, 0, 20, resonanceHandler, i);
        // configureSlider("gain", gain, -10, 10, gainHandler, i);
        drawCurve();
    }
}

function changeFilterType( value, index ) {
  filters[index].type = value;
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
        this.init();
    }
}

class FilterHandle {

  constructor(x, y, radius, name, index) {
     let svgns = "http://www.w3.org/2000/svg";
     this.x = x;
     this.y = y;
     this.frequency = frequencyUIValueToCutoff(this.x/width)
     this.gain = yToDb(this.y)
     this.radius = radius;
     this.index = index;

     this.parent = document.createElementNS(svgns, 'g');
     this.parent.setAttribute('transform', `translate(${x}, ${y})`);

     this.dot = document.createElementNS(svgns, 'circle');
     this.dot.setAttribute('cx', 0);
     this.dot.setAttribute('cy', 0);
     this.dot.setAttribute('r', radius);
     this.dot.classList.add("filter-dot");

     let text = document.createElementNS(svgns, 'text');
     text.setAttribute('x', 0);
     text.setAttribute('y', radius + 13);
     text.classList.add("filter-name");
     text.innerHTML = name;

     this.parent.append(this.dot);
     this.parent.append(text);

     this.dragging = false;

     // mouse down event
     let self = this;
     this.dot.onmousedown = function(e) { self.touchDown(e); };
     document.addEventListener("mousemove", (e) => self.touchDrag(e));
     document.addEventListener("mouseup", (e) => self.touchUp(e));
  }
  
  touchDown(e) {
      this.dragging = true;
     this.dot.classList.add('dragging');
  }
  
  touchDrag(e) {
     if (this.dragging) {
        let touch = this.screenToSVG(e.clientX, e.clientY);
        this.x = touch.x;
        this.y = touch.y;
        this.frequency = frequencyUIValueToCutoff(this.x/width)
        this.gain = yToDb(this.y)
        updateFrequency(frequencyUIValueToCutoff(this.x/width), this.index);
        updateGain(yToDb(this.y), this.index)
        this.parent.setAttribute("transform", `translate(${touch.x}, ${touch.y})`);
     }
  }
  
  touchUp(e) {
     if (this.dragging) {
        this.dot.classList.remove('dragging');
        this.dragging = false;
     }
  }

  screenToSVG(sx, sy) {
     let xform = this.parent.ownerSVGElement.createSVGPoint();
     let matrix = this.parent.ownerSVGElement.getScreenCTM().inverse();
     xform.x = sx;
     xform.y = sy;
     return xform.matrixTransform(matrix);
  }
}
