#!/bin/sh

URL="https://github.com/paulocoutinhox/pdfium-lib/releases/latest/download/wasm.tgz"

curl -L "$URL" | tar zxf - --strip-components=2 release/node/pdfium.{wasm,js}