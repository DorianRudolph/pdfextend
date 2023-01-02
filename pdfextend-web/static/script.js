/*
  PDFextend: add margins with grid lines for annotation to a PDF document.
  Copyright (C) 2023  Dorian Rudolph

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
const btnRun = document.getElementById('run');
const fileInput = document.getElementById('file');
const canvas = document.getElementById('canvas');
const downloadLink = document.getElementById('download');

let worker = new Worker('worker.js');
worker.onmessage = (e) => {
  const msg = e.data;
  console.log('receive', msg);
  if (msg.type == 'extend') {
    canvas.width = msg.preview.width;
    canvas.height = msg.preview.height;
    const context = canvas.getContext('2d');
    context.putImageData(msg.preview, 0, 0);
    downloadLink.href = URL.createObjectURL(msg.file);
    document.getElementById('result').hidden = false;
    downloadLink.download = msg.fileName;
  }
};

btnRun.onclick = async (e) => {
  if (!fileInput.files) {
    alert('Open a PDF first');
    return;
  }
  const msg = {
    type: 'extend',
    file: fileInput.files[0],
    command: `pdfextend input.pdf output.pdf --right=50 --grid=squares`
  };
  worker.postMessage(msg);
};
