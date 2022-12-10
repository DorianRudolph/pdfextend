#!/bin/sh

URL="https://github.com/paulocoutinhox/pdfium-lib/releases/latest/download/wasm.tgz"

curl -L "$URL" | tar zxf - -C static --strip-components=1 release/node/pdfium.{wasm,js}