importScripts('pdfium.js', 'pdfextend_web.js');

const { initialize_pdfium_render, extend_pdf } = wasm_bindgen;

const loaded = PDFiumModule().then(async mod => {
    Module = mod;
    wasmTable = Module.asm.__indirect_function_table;

    rustModule = await wasm_bindgen('pdfextend_web_bg.wasm');

    console.assert(
        initialize_pdfium_render(Module, rustModule, false),
        "Initialization of pdfium-render failed!"
    );
    console.log("PDFium initialized.");
});

onmessage = async e => {
    await loaded;
    const msg = e.data;
    console.log('onmessage', msg);
    if (msg.type == 'extend') {
        const res = await extend_pdf(msg.command, msg.file);
        const file = res.get_file();
        const preview = res.get_preview();
        // https://stackoverflow.com/questions/63641798/is-copying-a-large-blob-over-to-a-worker-expensive/63642296#63642296
        postMessage({
            type: 'extend',
            file: file,
            preview: preview
        });
        // TODO: transfer preview, but I get error "ArrayBuffer at index 0 is not detachable and could not be transferred"
        // Tried to return ArrayBuffer directly from rust, but got the same error
    }
}