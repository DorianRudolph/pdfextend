#!/bin/sh

URL="https://github.com/bblanchon/pdfium-binaries/releases/latest/download/pdfium-linux-x64.tgz"

mkdir -p target/debug
mkdir -p target/release

curl -L "$URL" | tar zxf - -C target/debug --strip-components=1 lib/libpdfium.so
ln -s target/{debug,release}/libpdfium.so