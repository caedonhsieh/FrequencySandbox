var WIDTH = 300;
var HEIGHT = 300;
var started = false;
var analyserNode;

const canvas = document.querySelector(".visualizer");
const canvasCtx = canvas.getContext("2d");

function startAudio() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    analyserNode = context.createAnalyser();
    const audio = new Audio("project-22955.wav");
    const source = context.createMediaElementSource(audio);
    console.log(context.sampleRate);
    analyserNode.fftSize = 16384;
    source.connect(analyserNode);
    source.connect(context.destination);
    audio.play();
}

function visualize() {
    WIDTH = canvas.width;
    HEIGHT = canvas.height;
    var bufferLength = analyserNode.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    var drawAlt = function() {
        drawVisual = requestAnimationFrame(drawAlt);

        analyserNode.getByteFrequencyData(dataArray);
        var logLength = 80;
        var logArray = computeLogArray(dataArray);

        var barWidth = (WIDTH / logLength);
        var barHeight;
        var x = 0;

        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        for (var i = 0; i < logLength; i++) {
            barHeight = logArray[i] * 10;

            canvasCtx.fillStyle = "rgb(' + (barHeight+100) + ', 50, 50)";
            canvasCtx.fillRect(x,HEIGHT-barHeight/10,barWidth,barHeight/10);

            x += barWidth + 1;
        }
    }
    drawAlt();
}

function computeLogArray(array) {
    var logArray = new Uint8Array(80);
    logArray.fill(0);
    var li, start, offset;
    for (var i = 8; i < array.length; i++) {
        li = Math.floor(Math.log2(i)) - 3;
        start = 8 * li;
        offset = Math.floor(i/Math.pow(2, li)) - 8;
        logArray[start+offset] = array[i]
        // logArray[start+offset] += Math.floor(array[i]/(li+1));
    }
    // console.log(logArray);
    return logArray;
}

window.onclick = function() {
    if (!started) {
        started = true;
        this.startAudio();
        this.visualize();
    }
}