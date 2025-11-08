import { fromURL } from 'png-es6';

export class Png16Loader {
  /**
   * Load native 16-bit PNG directly from a URL using png-es6.
   * @param {string} url - URL of the PNG image.
   * @returns {Promise<{width: number, height: number, data16: Uint16Array, components: number}>}
   */
  static async load(url) {
    // Decode the PNG image from URL
    const pngData = await fromURL(url);
    console.log('PNG bit depth:', pngData.bits, 'type:', pngData.colorType, 'first bytes:', pngData.pixels.slice(0, 10));

    // Validate if bit depth is 16
    if (pngData.bits !== 16) {
      throw new Error(`Png16Loader: Expected 16-bit PNG but got ${pngData.bits}-bit`);
    }

    const { width, height, colors: components, pixels: src } = pngData;

    // Convert byte pairs (big-endian) to Uint16Array for native 16-bit values
    const pixelCount = width * height;
    const data16 = new Uint16Array(pixelCount * components);

    for (let i = 0; i < pixelCount; ++i) {
      for (let c = 0; c < components; ++c) {
        data16[i * components + c] = (src[2 * (i * components + c)] << 8) | src[2 * (i * components + c) + 1];
      }
    }

    console.log('Loaded pixel data length:', data16.length);
    console.log('First 10 pixels values:', data16.slice(0, 10));

    // Return image properties and native 16-bit pixel data
    return {
      width,
      height,
      data16,
      components
    };
  }
}
