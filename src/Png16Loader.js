// Png16Loader.js
// Utility class to load a 16-bit PNG (RGB/RGBA) with UTIF and (optionally) create a WebGL2 texture.

import * as UTIF from "utif";

export class Png16Loader {

  /**
   * Load a 16-bit PNG using UTIF.
   * @param {string} url - URL of the PNG file.
   * @returns {Promise<{width:number, height:number, data16:Uint16Array, components:number}>}
   */
  static async load(url) {
    // Fetch PNG as ArrayBuffer
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Png16Loader: failed to fetch ${url} (${res.status})`);
    }
    const buffer = await res.arrayBuffer();

    // Decode with UTIF
    const ifds = UTIF.decode(buffer);
    if (!ifds || ifds.length === 0) {
      throw new Error("Png16Loader: no IFDs found in PNG");
    }

    // Decode image data into the first IFD
    const ifd = ifds[0];
    UTIF.decodeImage(buffer, ifd);

    // UTIF usually exposes raw data in ifd.data
    // For 16-bit PNG this should be an ArrayBuffer / TypedArray with 16-bit samples
    const raw = ifd.data;
    if (!raw) {
      throw new Error("Png16Loader: decoded image has no data");
    }

    // Make sure we have a Uint16Array view
    const data16 = raw instanceof Uint16Array ? raw : new Uint16Array(raw.buffer || raw);

    const width = ifd.width;
    const height = ifd.height;

    // Try to infer number of components (3 = RGB, 4 = RGBA)
    const components = data16.length / (width * height);
    if (components !== 3 && components !== 4) {
      console.warn(
        `Png16Loader: unexpected component count (${components}), data length = ${data16.length}, w=${width}, h=${height}`
      );
    }

    return { width, height, data16, components };
  }

  /**
   * Create a WebGL2 texture from a 16-bit image previously loaded with load().
   * It uses integer texture formats, so you must sample it with usampler2D in the shader.
   *
   * @param {WebGL2RenderingContext} gl
   * @param {{width:number, height:number, data16:Uint16Array, components:number}} img
   * @returns {WebGLTexture}
   */
  static createTexture(gl, img) {
    const { width, height, data16, components } = img;

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Choose internal format based on number of components
    let internalFormat, format;
    if (components === 3) {
      internalFormat = gl.RGB16UI;
      format = gl.RGB_INTEGER;
    } else {
      // fallback to RGBA if 4 components
      internalFormat = gl.RGBA16UI;
      format = gl.RGBA_INTEGER;
    }

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      width,
      height,
      0,
      format,
      gl.UNSIGNED_SHORT,
      data16
    );

    // Dict/lookup texture: we usually want nearest sampling
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }
}
