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
};

function visualize() {
    WIDTH = canvas.width;
    HEIGHT = canvas.height;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    const drawAlt = function() {
        drawVisual = requestAnimationFrame(drawAlt);

        analyserNode.getByteFrequencyData(dataArray);
        const logLength = 80;
        const logArray = computeLogArray(dataArray);

        const barWidth = (WIDTH / logLength);

        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        for (var i = 0; i < logLength; i++) {
            let barHeight = logArray[i] * 10;

            canvasCtx.fillStyle = "rgb(' + (barHeight+100) + ', 50, 50)";
            canvasCtx.fillRect(i * (barWidth + 1), HEIGHT-barHeight/10, barWidth, barHeight/10);
        }
    };
    drawAlt();
};

function computeLogArray(array) {
    var logArray = new Uint8Array(80);
    logArray.fill(0);
    
    for (var i = 0; i < 80; i++) {
        logArray[i] = array[Math.floor(Math.pow(2, i/8+3))];
    }
    
    return logArray;
};

window.onclick = function() {
    if (!started) {
        started = true;
        this.startAudio();
        this.visualize();
    }
};
