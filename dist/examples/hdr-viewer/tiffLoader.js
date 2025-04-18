/**
 * Custom TIFF loader for 16-bit HDR images in OpenLIME
 * Uses tiff.js library to parse TIFF files and extract 16-bit data
 * 
 * @param {Object} tile - Tile specification
 * @param {WebGL2RenderingContext} gl - WebGL context
 * @param {Object} options - Additional loader options
 * @returns {Promise<Object>} Loaded image data object
 */
function tiffLoader(tile, gl, options = {}) {
  const debug = options.debug || false;
  
  if (debug) {
    console.log("TIFF loader started for:", tile.url);
  }

  return new Promise((resolve, reject) => {
    try {
      // Fetch the TIFF file
      fetch(tile.url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch TIFF: ${response.status} ${response.statusText}`);
          }
          return response.arrayBuffer();
        })
        .then(arrayBuffer => {
          if (debug) {
            console.log(`TIFF file size: ${arrayBuffer.byteLength} bytes`);
          }
          
          // Use tiff.js to parse the TIFF file
          if (typeof Tiff === 'undefined') {
            console.error("Tiff.js library not loaded");
            
            // Create fallback test image (red square)
            const width = 256;
            const height = 256;
            const channels = 3;
            const data = new Uint16Array(width * height * channels);
            
            // Fill with red (at 16-bit scale)
            for (let i = 0; i < data.length; i += 3) {
              data[i] = 65535;    // R (full intensity in 16-bit)
              data[i + 1] = 0;    // G
              data[i + 2] = 0;    // B
            }
            
            if (debug) {
              console.log("Created fallback red test image");
            }
            
            resolve({
              data: data,
              width: width,
              height: height,
              channels: channels
            });
            return;
          }
          
          // Create a Tiff object from the array buffer
          const tiff = new Tiff({ buffer: arrayBuffer });
          
          // Get the first image in the TIFF file
          const width = tiff.width();
          const height = tiff.height();
          
          if (debug) {
            console.log(`TIFF dimensions: ${width}x${height}`);
            console.log("TIFF metadata:", {
              bitsPerSample: tiff.getBitsPerSample(),
              samplesPerPixel: tiff.getSamplesPerPixel(),
              compression: tiff.getCompression(),
              photometricInterpretation: tiff.getPhotometricInterpretation()
            });
          }
          
          // Check if we have 16-bit data
          const bitsPerSample = tiff.getBitsPerSample();
          const is16bit = bitsPerSample === 16;
          
          try {
            // Get the RGBA data
            const raster = tiff.readRGBAImage();
            
            if (debug) {
              console.log(`TIFF data is ${is16bit ? '16-bit' : '8-bit'}`);
              console.log(`Raster data type: ${raster.constructor.name}`);
            }

            // Convert RGBA to RGB or use as is based on options
            const channels = options.useAlpha ? 4 : 3;
            const pixelCount = width * height;
            
            // Create the appropriate storage array based on bit depth
            let data;
            
            if (is16bit) {
              // For 16-bit data, use a Uint16Array
              data = new Uint16Array(pixelCount * channels);
              
              // Copy data from the RGBA raster to RGB or RGBA
              for (let i = 0; i < pixelCount; i++) {
                const srcIdx = i * 4; // Source is always RGBA
                const destIdx = i * channels;
                
                data[destIdx] = raster[srcIdx];         // R
                data[destIdx + 1] = raster[srcIdx + 1]; // G
                data[destIdx + 2] = raster[srcIdx + 2]; // B
                
                if (channels === 4) {
                  data[destIdx + 3] = raster[srcIdx + 3]; // A
                }
              }
            } else {
              // For 8-bit data, use a Uint8Array
              data = new Uint8Array(pixelCount * channels);
              
              // Copy data from the RGBA raster to RGB or RGBA
              for (let i = 0; i < pixelCount; i++) {
                const srcIdx = i * 4; // Source is always RGBA
                const destIdx = i * channels;
                
                data[destIdx] = raster[srcIdx];         // R
                data[destIdx + 1] = raster[srcIdx + 1]; // G
                data[destIdx + 2] = raster[srcIdx + 2]; // B
                
                if (channels === 4) {
                  data[destIdx + 3] = raster[srcIdx + 3]; // A
                }
              }
            }
            
            // Clean up
            tiff.close();
            
            if (debug) {
              console.log(`TIFF loader completed: ${width}x${height}, ${channels} channels`);
            }
            
            // Return the image data
            resolve({
              data: data,
              width: width,
              height: height,
              channels: channels
            });
          } catch (error) {
            console.error("Error reading TIFF data:", error);
            
            // Create fallback test image (red square)
            const width = 256;
            const height = 256;
            const channels = 3;
            const data = new Uint16Array(width * height * channels);
            
            // Fill with red (at 16-bit scale)
            for (let i = 0; i < data.length; i += 3) {
              data[i] = 65535;    // R (full intensity in 16-bit)
              data[i + 1] = 0;    // G
              data[i + 2] = 0;    // B
            }
            
            if (debug) {
              console.log("Created fallback red test image after TIFF error");
            }
            
            resolve({
              data: data,
              width: width,
              height: height,
              channels: channels
            });
          }
        })
        .catch(error => {
          console.error("Error fetching or processing TIFF:", error);
          reject(error);
        });
    } catch (error) {
      console.error("Error in TIFF loader:", error);
      reject(error);
    }
  });
}