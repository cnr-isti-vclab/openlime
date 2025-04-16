#!/bin/bash

# multispectral_convert_to_jpg - Converts multispectral PNG images to composite JPG images
# Usage: ./multispectral_convert_to_png *.png output_prefix

# Display help if no arguments provided
if [ $# -lt 2 ]; then
    echo "Usage: $0 input_files... output_prefix"
    echo "Example: $0 *.png oil_painting_ms"
    exit 1
fi

# Get the output prefix (last argument)
ARGS=("$@")
OUTPUT_PREFIX="${ARGS[${#ARGS[@]}-1]}"

# Remove the last argument to get just the input files
unset "ARGS[${#ARGS[@]}-1]"
INPUT_FILES=("${ARGS[@]}")

# Sort the input files to ensure correct order
IFS=$'\n' INPUT_FILES=($(sort -V <<<"${INPUT_FILES[*]}"))
unset IFS

# Count the number of input files
NUM_FILES=${#INPUT_FILES[@]}
echo "Found $NUM_FILES input files."
echo "Output prefix: $OUTPUT_PREFIX"

# Calculate how many full RGB images we can create (3 channels each)
NUM_FULL_IMAGES=$((NUM_FILES / 3))
REMAINDER=$((NUM_FILES % 3))

echo "Will create $NUM_FULL_IMAGES full RGB images."
if [ $REMAINDER -ne 0 ]; then
    echo "Plus 1 partial image with $REMAINDER channel(s)."
fi

# Create full RGB images (3 channels each)
for i in $(seq 0 $((NUM_FULL_IMAGES - 1))); do
    r_idx=$((i * 3))
    g_idx=$((i * 3 + 1))
    b_idx=$((i * 3 + 2))
    
    # Get the filenames
    r_file="${INPUT_FILES[$r_idx]}"
    g_file="${INPUT_FILES[$g_idx]}"
    b_file="${INPUT_FILES[$b_idx]}"
    
    # Format the output number with leading zeros
    i_pad=$(printf "%02d" $i)
    output_file="${OUTPUT_PREFIX}_${i_pad}.jpg"
    
    echo "Creating $output_file from:"
    echo "  R: $r_file"
    echo "  G: $g_file"
    echo "  B: $b_file"
    
    # Create the RGB image using ImageMagick
    magick \
        "$r_file" \
        "$g_file" \
        "$b_file" \
        -set colorspace RGB -combine \
        -colorspace RGB \
        -depth 16 \
        -quality 100 \
        -sampling-factor 1x1 \
        -define jpeg:dct-method=float \
        "$output_file"
    
    echo "Created $output_file"
done

# Handle remainder files (if any)
if [ $REMAINDER -ne 0 ]; then
    i=$NUM_FULL_IMAGES
    i_pad=$(printf "%02d" $i)
    output_file="${OUTPUT_PREFIX}_${i_pad}.jpg"
    
    echo "Creating $output_file with $REMAINDER channel(s):"
    
    # Start with the first remainder file
    remainder_start=$((NUM_FULL_IMAGES * 3))
    r_file="${INPUT_FILES[$remainder_start]}"
    echo "  R: $r_file"
    
    # For G and B channels, use black if no file is available
    if [ $REMAINDER -ge 2 ]; then
        g_file="${INPUT_FILES[$((remainder_start + 1))]}"
        echo "  G: $g_file"
    else
        g_file="-size 512x512 xc:black"
        echo "  G: [black]"
    fi
    
    if [ $REMAINDER -ge 3 ]; then
        b_file="${INPUT_FILES[$((remainder_start + 2))]}"
        echo "  B: $b_file"
    else
        b_file="-size 512x512 xc:black"
        echo "  B: [black]"
    fi
    
    # Get image dimensions from the first file
    dimensions=$(magick identify -format "%wx%h" "$r_file")
    
    # Create the partial RGB image
    if [ $REMAINDER -eq 1 ]; then
        magick \
            "$r_file" \
            -size $dimensions xc:black \
            -size $dimensions xc:black \
            -set colorspace RGB -combine \
            -colorspace RGB \
            -depth 16 \
            -quality 100 \
            -sampling-factor 1x1 \
            -define jpeg:dct-method=float \
            "$output_file"
    elif [ $REMAINDER -eq 2 ]; then
        magick \
            "$r_file" \
            "$g_file" \
            -size $dimensions xc:black \
            -set colorspace RGB -combine \
            -colorspace RGB \
            -depth 16 \
            -quality 100 \
            -sampling-factor 1x1 \
            -define jpeg:dct-method=float \
            "$output_file"
    fi
    
    echo "Created $output_file"
fi

echo "Conversion complete. Created $((NUM_FULL_IMAGES + (REMAINDER > 0 ? 1 : 0))) JPEG files."