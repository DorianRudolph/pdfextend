#!/bin/sh

URL="https://github.com/bblanchon/pdfium-binaries/releases/latest/download/pdfium-mac-arm64.tgz"

mkdir -p target/debug
mkdir -p target/release

curl -L "$URL" | tar zxf - -C target/debug --strip-components=1 lib/libpdfium.dylib
ln -s {../debug,target/release}/libpdfium.dylib