var context;
var filters;
var handles;
var started = false;

var canvas;
var canvasContext;
var canvasWidth = 0;
var canvasHeight = 0;

// color definitions
var curveColor = "rgb(224,27,106)";
var gridColor = "rgb(100,100,100)";
var textColor = "rgb(81,127,207)";
var rtColor = "rgb(40, 200, 40)";

var defaultQ = 5;
var nfilters = 5;
var noctaves = 11;
var dbScale = 60;


// these variables are set during init()
var pixelsPerDb;
var width;
var height;

// set up audio + audio events
const audio = new Audio("project-22955.wav");
document.getElementById('play').onclick = function() { audio.play(); };
document.getElementById('pause').onclick = function() { audio.pause(); };
document.getElementById('reset').onclick = function() { audio.currentTime = 0; };
audio.addEventListener("ended", function() { audio.currentTime = 0; });

// set up the page on load
window.onload = init;

function init() {
  // set up canvas
  canvas = document.getElementById('canvasID');
  canvasContext = canvas.getContext('2d');
  canvasWidth = parseFloat(window.getComputedStyle(canvas, null).width);
  canvasHeight = parseFloat(window.getComputedStyle(canvas, null).height);

  // set variables according to canvas size
  width = canvas.width;
  height = canvas.height;
  pixelsPerDb = (0.5 * height) / dbScale;
  
  // set up audio context
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  context = new AudioContext();

  // add handles
  let container = document.querySelector("#eq-svg");
  handles = []
  for (var i = 0; i < nfilters; i++) {
    handle = new FilterHandle(80+80*i, 125, 6, i, i);
    handles.push(handle);
    container.append(handle.parent);
  }

  // set up audio node chains
  initAudio();

  // set up HTML for filters
  var filterHTML = "";
  for (var i = 0; i < nfilters; i++) {
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
        <span id="Q-value${i}" style="position:relative; top:-5px; display: inline-block; width: 100px;">Q = ${defaultQ} dB</span>
        <input id="QSlider${i}" type="range" min="0" max="20" step="0.01" value="0" style="height: 20px; width: 160px;">
      </div>`;
  }
  document.getElementById('filterSettings').innerHTML = filterHTML;
  
  // set up Q sliders
  for (var i = 0; i < nfilters; i++) {
      configureSlider("Q", defaultQ, 0, 20, resonanceHandler, i);
  }

  drawCurve();
}

function initAudio() {
  const source = context.createMediaElementSource(audio);

  // set up analyser node
  analyserNode = context.createAnalyser();
  analyserNode.fftSize = 8192; //determines resolution for real time curve

  // create filters
  filters = []
  for (var i = 0; i < nfilters; i++) {
    var filter = context.createBiquadFilter();
    filter.type = "allpass";
    filter.Q.value = defaultQ;
    filter.frequency.value = handles[i].frequency;
    filter.gain.value = handles[i].gain;
    filters.push(filter);
  }

  // connect filter chain
  filters[nfilters-1].connect(context.destination);
  filters[nfilters-1].connect(analyserNode);
  for (var i = nfilters-1; i >=1; i--) {
    filters[i-1].connect(filters[i])
  }
  source.connect(filters[0]);
}

function drawCurve() {
    // draw center
    canvasContext.clearRect(0, 0, width, height);
    canvasContext.strokeStyle = curveColor;
    canvasContext.lineWidth = 3;
    canvasContext.beginPath();
    canvasContext.moveTo(0, 0);
    
    // set up for the filter response curve
    var frequencyHz = new Float32Array(width); // the frequencies at which we get the filter response
    var magResponse = new Float32Array(width); // the magnitudes of the frequency responses
    var phaseResponse = new Float32Array(width); // the phase of the frequency response
    var nyquist = 0.5 * context.sampleRate;
    // pick what frequencies we will get the filter responses at
    for (var i = 0; i < width; ++i) {
        var f = i / width;
        // convert to log frequency scale (octaves).
        f = nyquist * Math.pow(2.0, noctaves * (f - 1.0));
        frequencyHz[i] = f;
    }

    var dbResponses = new Array(width).fill(0);
    // convert magnitude response to dB and iteratively add them to combine response curves
    for (var i = 0; i < nfilters; i++) {
        filters[i].getFrequencyResponse(frequencyHz, magResponse, phaseResponse);
        dbResponses = magResponse.map(function (response, idx) {
            return 20.0 * Math.log(response) + dbResponses[idx];
          });
    }
    
    // draw response curve
    for (var i = 0; i < width; ++i) {
        var x = i;
        var y = dbToY(dbResponses[i]);
        
        if ( i == 0 )
            canvasContext.moveTo(x, y);
        else
            canvasContext.lineTo(x, y);
    }
    canvasContext.stroke();

    // set up for drawing real-time curve
    canvasContext.beginPath();
    canvasContext.lineWidth = 1;
    canvasContext.strokeStyle = rtColor;

    // get real-time response in dB from analyser
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyserNode.getFloatFrequencyData(dataArray);

    // draw real-time curve
    for (var i = 0; i < width; i++) {
      var index = Math.round(frequencyHz[i]/nyquist * dataArray.length);
      value = dataArray[index];
      // arbitrarily add 50 so that values are high enough to show. they generally seem lower than expected
      y = dbToY(value+50)
      if ( i == 0 )
          canvasContext.moveTo(i, y);
      else
          canvasContext.lineTo(i, y);
    }
    canvasContext.stroke();
    canvasContext.beginPath();
    canvasContext.lineWidth = 1;
    canvasContext.strokeStyle = gridColor;
    
    
    // draw frequency scale.
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

    // draw 0dB line.
    canvasContext.beginPath();
    canvasContext.moveTo(0, 0.5 * height);
    canvasContext.lineTo(width, 0.5 * height);
    canvasContext.stroke();
    
    // draw decibel scale.
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
    // continually draw curve
    setTimeout(drawCurve, 50);
}

function frequencyUIValueToCutoff(value) {
  // maps UI value [0, 1] to frequency
  var nyquist = context.sampleRate * 0.5;
  var v2 = Math.pow(2.0, noctaves * (value - 1.0));
  var cutoff = v2*nyquist;
  return cutoff;
}

function updateFrequency(value, index) {
  var info = document.getElementById("frequency-value" + index);
  info.innerHTML = "freq = " + (Math.floor(value*100)/100) + " Hz";
  filters[index].frequency.value = value;
}

function updateResonance(value, index) {
  var info = document.getElementById("Q-value" + index);
  info.innerHTML = "Q = " + (Math.floor(value*100)/100) + " dB";
  filters[index].Q.value = value;
}

function updateGain(value, index) {
  var info = document.getElementById("gain-value" + index);
  info.innerHTML = "gain = " + (Math.floor(value*100)/100);
  filters[index].gain.value = value;
}

function changeFilterType( value, index ) {
  filters[index].type = value;
}

function resonanceHandler(event, ui, index) {
  var value = ui.value;
  updateResonance(value, index);
}

function dbToY(db) {
  return (0.5 * height) - pixelsPerDb * db;
}

function yToDb(y) {
  return ((0.5 * height) - y) / pixelsPerDb;
}

function configureSlider(name, value, min, max, handler, index) {
    var divName = name + "Slider" + index;

    var slider = document.getElementById(divName);

    slider.min = min;
    slider.max = max;
    slider.value = value;
    slider.oninput = function() { handler(0, this, index); };
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

    // create the dot
    this.dot = document.createElementNS(svgns, 'circle');
    this.dot.setAttribute('cx', 0);
    this.dot.setAttribute('cy', 0);
    this.dot.setAttribute('r', radius);
    this.dot.classList.add("filter-dot");

    // create the text
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
    // update the filter parameters when we move the handle
    if (this.dragging) {
      let touch = this.screenToSVG(e.clientX, e.clientY);
      this.x = Math.min(width, Math.max(touch.x, 0));
      this.y = Math.min(height, Math.max(touch.y, 0));
      this.frequency = frequencyUIValueToCutoff(this.x/width)
      this.gain = yToDb(this.y)
      updateFrequency(this.frequency, this.index);
      updateGain(this.gain, this.index)
      this.parent.setAttribute("transform", `translate(${this.x}, ${this.y})`);
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
