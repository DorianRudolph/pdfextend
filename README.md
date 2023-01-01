# PDFextend

## Building

### CLI

```
cd pdfextend-cli
./getpdfium.sh
cargo build --release --target=x86_64-unknown-linux-gnu
```

### Web

```
cd pdfextend-web
wasm-pack build --target no-modules
cp pkg/pdfextend_web{.js,_bg.wasm} ../webapp/PDFextend/public
cd ../webapp/pdfium-lib
./getpdfium-wasm.sh
cd ../PDFextend
npm install
```
