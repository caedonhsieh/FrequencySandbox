var WIDTH = 300;
var HEIGHT = 300;

const canvas = document.querySelector(".visualizer");
const canvasCtx = canvas.getContext("2d");

function visualize() {
    WIDTH = canvas.width;
    HEIGHT = canvas.height;

    // var visualSetting = visualSelect.value;
    const visualSetting = "frequencybars";
    // console.log(visualSetting);

    if (visualSetting == "frequencybars") {
    //   analyser.fftSize = 256;
        const bufferLengthAlt = 10;
    //   var bufferLengthAlt = analyser.frequencyBinCount;
    //   var dataArrayAlt = new Uint8Array(bufferLengthAlt);
        const dataArrayAlt = [1, 5, 7, 4, 3, 1, 6, 4, 9, 10];

        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        var drawAlt = function() {
            drawVisual = requestAnimationFrame(drawAlt);

            // analyser.getByteFrequencyData(dataArrayAlt);

            // canvasCtx.fillStyle = "rgb(0, 0, 0)";
            // canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

            var barWidth = (WIDTH / bufferLengthAlt);
            var barHeight;
            var x = 0;

            for (var i = 0; i < bufferLengthAlt; i++) {
                barHeight = dataArrayAlt[i] * 10;
                console.log(barHeight);

                canvasCtx.fillStyle = "rgb(' + (barHeight+100) + ', 50, 50)";
                canvasCtx.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight/2);

                x += barWidth + 1;
            }
        };

        drawAlt();
    }
    // else if (visualSetting == "off") {
    //   canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    //   canvasCtx.fillStyle = "red";
    //   canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    // }

}

visualize();