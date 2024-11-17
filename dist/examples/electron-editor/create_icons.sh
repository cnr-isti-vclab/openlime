#!/bin/bash

# Check for dependencies
if ! command -v magick &> /dev/null || ! command -v png2icns &> /dev/null; then
  echo "Error: This script requires ImageMagick (magick) and png2icns (libicns) to be installed."
  echo "Install them on Arch Linux: sudo pacman -S imagemagick; yay -S libicns"
  exit 1
fi

# Ensure a PNG file is provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <path_to_1024x1024_png> <icon>"
  exit 1
fi

mkdir -p build

SOURCE_PNG="$1"
OUTPUT_FNAME="$2"
ICONS_DIR="build/icons"
OUTPUT_ICNS="build/$OUTPUT_FNAME".icns
OUTPUT_ICO="build/$OUTPUT_FNAME".ico
OUTPUT_PNG="build/$OUTPUT_FNAME".png

if [ ! -f "$SOURCE_PNG" ]; then
  echo "Error: File '$SOURCE_PNG' not found."
  exit 1
fi

# Create build directory if it doesn't exist
mkdir -p "$ICONS_DIR"

# Create standard PNG and ICO files
magick "$SOURCE_PNG" -resize "512x512!" "$OUTPUT_PNG"
echo "Successfully created $OUTPUT_PNG"
magick "$SOURCE_PNG" -resize "512x512!" "$OUTPUT_ICO"
echo "Successfully created $OUTPUT_ICO"
echo

# Create temporary directory for ICNS creation
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# Define all required sizes
# Standard ICNS sizes:
# 16x16 - 16x16 (16pt@1x) [is32]
# 32x32 - 32x32 (16pt@2x, 32pt@1x) [il32]
# 128x128 - 128x128 (128pt@1x) [it32]
# 256x256 - 256x256 (256pt@1x, 128pt@2x) [ic08]
# 512x512 - 512x512 (512pt@1x, 256pt@2x) [ic09]
# 1024x1024 - 1024x1024 (512pt@2x) [ic10]

# Additional Linux sizes:
# 24x24, 48x48, 64x64, 96x96 for better desktop integration
SIZES=(16 24 32 48 64 96 128 256 512 1024)

# Generate icons for each size
echo "Generating PNG variants..."
for SIZE in "${SIZES[@]}"; do
  # Generate for ICNS (only standard sizes)
  if [[ $SIZE == 16 || $SIZE == 32 || $SIZE == 128 || $SIZE == 256 || $SIZE == 512 || $SIZE == 1024 ]]; then
    magick "$SOURCE_PNG" -resize "${SIZE}x${SIZE}!" "${TMP_DIR}/icon_${SIZE}x${SIZE}.png"
  fi
  
  # Generate for Linux icons directory
  magick "$SOURCE_PNG" -resize "${SIZE}x${SIZE}!" "${ICONS_DIR}/${SIZE}x${SIZE}.png"
  echo "Created ${SIZE}x${SIZE} icon"
done

# Create symlinks for Linux icons
echo "Creating symlinks..."
for SIZE in "${SIZES[@]}"; do
  ln -sf "${SIZE}x${SIZE}.png" "${ICONS_DIR}/icon_${SIZE}.png"
done

# Verify ICNS dimensions
echo "Verifying ICNS dimensions..."
ICNS_SIZES=(16 32 128 256 512 1024)
for SIZE in "${ICNS_SIZES[@]}"; do
  DIM=$(identify -format "%wx%h" "${TMP_DIR}/icon_${SIZE}x${SIZE}.png")
  if [ "$DIM" != "${SIZE}x${SIZE}" ]; then
    echo "Error: File ${TMP_DIR}/icon_${SIZE}x${SIZE}.png has incorrect dimensions: $DIM"
    exit 1
  fi
done

# Generate ICNS file
echo "Creating .icns file..."
png2icns "$OUTPUT_ICNS" "${TMP_DIR}/icon_"*.png 2>/dev/null

if [ $? -eq 0 ]; then
  echo "Successfully created $OUTPUT_ICNS"
else
  echo "Error: Failed to create .icns file."
  exit 1
fi

echo
echo "All icons created successfully:"
echo "- Windows ICO: $OUTPUT_ICO"
echo "- macOS ICNS: $OUTPUT_ICNS"
echo "- Linux PNG:  $OUTPUT_PNG"
echo "- Linux icons directory: $ICONS_DIR"

exit 0