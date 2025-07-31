#!/bin/bash

ICON_SRC="build/icon.png"
ICON_DST="build/icons"
ICON_ICNS="build/icon.icns"
ICON_ICO="build/icon.ico"

echo "Generating Linux icon set..."

mkdir -p "$ICON_DST"

# Dimensioni standard
sizes=(16 24 32 48 64 96 128 256 512 1024)
for size in "${sizes[@]}"; do
    magick "$ICON_SRC" -resize ${size}x${size} "$ICON_DST/${size}x${size}.png"
    magick "$ICON_SRC" -resize ${size}x${size} "$ICON_DST/icon_${size}.png"
done

echo "Copying essential PNGs for AppImage symlinks..."
cp "$ICON_DST/64x64.png" build/
cp "$ICON_DST/96x96.png" build/
cp "$ICON_DST/128x128.png" build/
cp "$ICON_DST/256x256.png" build/
cp "$ICON_DST/512x512.png" build/

echo "Generating Windows .ico file..."
magick \
    "$ICON_DST/icon_16.png" \
    "$ICON_DST/icon_24.png" \
    "$ICON_DST/icon_32.png" \
    "$ICON_DST/icon_48.png" \
    "$ICON_DST/icon_64.png" \
    "$ICON_DST/icon_128.png" \
    "$ICON_DST/icon_256.png" \
    "$ICON_DST/icon_512.png" \
    "$ICON_DST/icon_1024.png" \
    "$ICON_ICO"

echo "Generating macOS .icns file..."
mkdir -p build/icon.iconset
for size in 16 32 64 128 256 512; do
    magick "$ICON_SRC" -resize ${size}x${size} "build/icon.iconset/icon_${size}x${size}.png"
    magick "$ICON_SRC" -resize $((size*2))x$((size*2)) "build/icon.iconset/icon_${size}x${size}@2x.png"
done

echo "Generating macOS .icns file with png2icns..."
png2icns "$ICON_ICNS" \
    "$ICON_DST/icon_16.png" \
    "$ICON_DST/icon_32.png" \
    "$ICON_DST/icon_128.png" \
    "$ICON_DST/icon_256.png" \
    "$ICON_DST/icon_512.png"

echo "✅ All icons generated successfully."
