
const btnRun = document.getElementById('run');
const fileInput = document.getElementById('file');
const canvas = document.getElementById('canvas');
const downloadLink = document.getElementById('download');

let worker = new Worker('worker.js');
worker.onmessage = e => {
    const msg = e.data;
    console.log('receive', msg);
    if (msg.type == 'extend') {
        canvas.width = msg.preview.width;
        canvas.height = msg.preview.height;
        const context = canvas.getContext("2d");
        context.putImageData(msg.preview, 0, 0);
        downloadLink.href = URL.createObjectURL(msg.file);
        document.getElementById("result").hidden = false;
        downloadLink.download = msg.fileName;
    }
}

btnRun.onclick = async e => {
    if (!fileInput.files) {
        alert("Open a PDF first");
        return;
    }
    const msg = {
        type: 'extend',
        file: fileInput.files[0],
        command: `pdfextend input.pdf output.pdf --right=50 --grid=squares`
    }
    worker.postMessage(msg);
};

