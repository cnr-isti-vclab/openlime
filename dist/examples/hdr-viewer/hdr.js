(function (global, factory) {

  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :

  typeof define === 'function' && define.amd ? define(factory) :

  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.HDRjs = factory());

})(this, (function () { 'use strict';


  function frexp(v) {

      v = Number(v);

      var result = { f: v, e: 0 };

      if (v !== 0 && Number.isFinite(v)) {

          var absV = Math.abs(v);

          var log2 = Math.log2 || function log2(n) { return Math.log(n) * Math.LOG2E; };

          // Math.pow(2, -exp) === Infinity when exp <= -1024

          var e = Math.max(-1023, Math.floor(log2(absV)) + 1);

          var f = absV * Math.pow(2.0, -e);

          while (f >= 1.0) {

              f *= 0.5;

              e++;

          }

          while (f < 0.5) {

              f *= 2;

              e--;

          }

          if (v < 0) {

              f = -f;

          }

          result.f = f;

          result.e = e;

      }

      return result;

  }


  function ldexp(f, e) {

      return f * Math.pow(2.0, e);

  }

  /**

   * Convert 4 byte uint8 buffer to 3 channels float data

   * @param rgbe input uint8 buffer

   * @param float output float data

   */

  function rgbe2float(rgbe, float) {

      if (rgbe[3] !== 0) {

          var f1 = ldexp(1.0, rgbe[3] - (128 + 8));

          float[0] = rgbe[0] * f1;

          float[1] = rgbe[1] * f1;

          float[2] = rgbe[2] * f1;

      }

      else {

          float[0] = float[1] = float[2] = 0.0;

      }

  }

  /**

   * Convert 3 channels float data to 4 byte uint8 buffer

   * @param float input float data

   * @param rgbe output uint8 buffer

   */

  function float2rgbe(float, rgbe) {

      var red = float[0];

      var green = float[1];

      var blue = float[2];

      var v = Math.max(red, Math.max(green, blue));

      if (v < 1e-32) {

          rgbe[0] = rgbe[1] = rgbe[2] = rgbe[3] = 0;

      }

      else {

          var _a = frexp(v), f = _a.f, e = _a.e;

          var s = f / v * 256.0;

          rgbe[0] = red * s;

          rgbe[1] = green * s;

          rgbe[2] = blue * s;

          rgbe[3] = e + 128;

      }

  }

  /**

   * Write float data to RGBE(.hdr) file buffer

   * @param x image width

   * @param y image height

   * @param data float data, RGB 3 channels.

   * @returns file buffer

   */

  function write_hdr(x, y, data) {

      var s = [];

      var comp = 3;

      write_hdr_core(s, x, y, comp, data);

      return new Uint8Array(s);

  }

  function write_hdr_core(s, x, y, comp, data) {

      if (y <= 0 || x <= 0 || !data) {

          return;

      }

      var header = '#?RADIANCE\n' +

          '# Written by hdr.js\n' +

          'FORMAT=32-bit_rle_rgbe\n' +

          'EXPOSURE=1.0\n' +

          '\n' +

          '-Y ' + y + ' +X ' + x + '\n';

      header

          .split('')

          .forEach(function (c) {

          var charCode = c.charCodeAt(0);

          s.push(charCode);

      });

      var scratch = new Uint8Array(x * 4);

      for (var i = 0; i < y; i++) {

          write_hdr_scanline(s, x, comp, scratch, data.subarray(comp * x * (i)));

      }

  }

  function write_hdr_scanline(s, width, ncomp, scratch, scanline) {

      var scanlineheader = new Uint8Array([2, 2, 0, 0]);

      var rgbe = new Uint8Array(4);

      var linear = new Float32Array(3);

      var x;

      scanlineheader[2] = (width & 0xff00) >> 8;

      scanlineheader[3] = (width & 0x00ff);

      /* skip RLE for images too small or large */

      if (width < 8 || width >= 32768) {

          for (x = 0; x < width; x++) {

              switch (ncomp) {

                  case 4: /* fallthrough */

                  case 3:

                      linear[2] = scanline[x * ncomp + 2];

                      linear[1] = scanline[x * ncomp + 1];

                      linear[0] = scanline[x * ncomp + 0];

                      break;

                  default:

                      linear[0] = linear[1] = linear[2] = scanline[x * ncomp + 0];

                      break;

              }

              float2rgbe(linear, rgbe);

              s.push(rgbe[0], rgbe[1], rgbe[2], rgbe[3]);

          }

      }

      else {

          var c = void 0, r = void 0;

          /* encode into scratch buffer */

          for (x = 0; x < width; x++) {

              switch (ncomp) {

                  case 4: /* fallthrough */

                  case 3:

                      linear[2] = scanline[x * ncomp + 2];

                      linear[1] = scanline[x * ncomp + 1];

                      linear[0] = scanline[x * ncomp + 0];

                      break;

                  default:

                      linear[0] = linear[1] = linear[2] = scanline[x * ncomp + 0];

                      break;

              }

              float2rgbe(linear, rgbe);

              scratch[x + width * 0] = rgbe[0];

              scratch[x + width * 1] = rgbe[1];

              scratch[x + width * 2] = rgbe[2];

              scratch[x + width * 3] = rgbe[3];

          }

          s.push(scanlineheader[0], scanlineheader[1], scanlineheader[2], scanlineheader[3]);

          /* RLE each component separately */

          for (c = 0; c < 4; c++) {

              var comp = scratch.subarray(width * c);

              x = 0;

              while (x < width) {

                  // find first run

                  r = x;

                  while (r + 2 < width) {

                      if (comp[r] === comp[r + 1] && comp[r] === comp[r + 2])

                          break;

                      ++r;

                  }

                  if (r + 2 >= width)

                      r = width;

                  // dump up to first run

                  while (x < r) {

                      var len = r - x;

                      if (len > 128)

                          len = 128;

                      write_dump_data(s, len, comp.subarray(x));

                      x += len;

                  }

                  // if there's a run, output it

                  if (r + 2 < width) { // same test as what we break out of in search loop, so only true if we break'd

                      // find next byte after run

                      while (r < width && comp[r] == comp[x])

                          ++r;

                      // output run up to r

                      while (x < r) {

                          var len = r - x;

                          if (len > 127)

                              len = 127;

                          write_run_data(s, len, comp[x]);

                          x += len;

                      }

                  }

              }

          }

      }

  }

  function write_dump_data(s, length, data) {

      var lengthbyte = length & 0xff;

      if (!(length <= 128))

          throw new Error('length is greater than 128');

      s.push(lengthbyte);

      for (var i = 0; i < length; i++) {

          s.push(data[i]);

      }

  }

  function write_run_data(s, length, databyte) {

      var lengthbyte = (length + 128) & 0xff;

      if (!(length + 128 <= 255))

          throw new Error('length is greater than 128');

      s.push(lengthbyte, databyte);

  }

  /**

   * Load a RGBE(.hdr) file from URL.

   * @param url the URL.

   * @returns The promise of the resolved data.

   */

  function load(url) {

      return new Promise(function (resolve, reject) {

          if (typeof XMLHttpRequest === 'undefined') {

              reject('XMLHttpRequest is undefined, use HDRjs.read instead.');

          }

          var req = new XMLHttpRequest();

          req.responseType = 'arraybuffer';

          req.onload = function () {

              if (req.status >= 400)

                  return reject('Load successfully, but HTTP status code >= 400, status: ' + req.status);

              var parsed = read_hdr(new Uint8Array(req.response));

              typeof parsed === 'string' ? reject(parsed) : resolve(parsed);

          };

          req.onerror = function (e) {

              reject('Failed to load: ' + url);

          };

          req.open('GET', url, true);

          req.send();

      });

  }

  /**

   * Save a hdr file to disk

   * @param float float data, RGB 3 channels.

   * @param width image width.

   * @param height image height.

   * @param filename file name.

   * @returns Whether the save was successful

   */

  function save(float, width, height, filename) {

      if (!(document === null || document === void 0 ? void 0 : document.createElement) || !(URL === null || URL === void 0 ? void 0 : URL.createObjectURL)) {

          console.warn('NO document.createElement or URL.createObjectURL');

          return false;

      }

      var uint8 = write_hdr(width, height, float);

      var url = URL.createObjectURL(new Blob([uint8]));

      var a = document.createElement('a');

      a.href = url;

      a.download = filename + '.hdr';

      a.rel = 'noopener'; // tabnabbing

      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4E4); // 40s

      setTimeout(function () { click(a); }, 0);

      return true;

  }

  // `a.click()` doesn't work for all browsers (https://github.com/eligrey/FileSaver.js/issues/465)

  function click(node) {

      try {

          node.dispatchEvent(new MouseEvent('click'));

      }

      catch (e) {

          var evt = document.createEvent('MouseEvents');

          evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);

          node.dispatchEvent(evt);

      }

  }

  function testMagic(uint8, signature) {

      var l = signature.length;

      for (var i = 0; i < l; i++) {

          if (uint8[i] !== signature.charCodeAt(i)) {

              return false;

          }

      }

      return true;

  }

  function isHdr(uint8) {

      var r = testMagic(uint8, '#?RADIANCE\n');

      if (!r) {

          r = testMagic(uint8, '#?RGBE\n');

      }

      return r;

  }

  var MAX_HEADER_LENGTH = 1024 * 10;

  var MAX_DIMENSIONS = 1 << 24;

  /**

   * Read a RGBE(.hdr) file from buffer

   * @param uint8 RGBE(.hdr) file buffer

   * @returns Failure reason or resolved data.

   */

  function read_hdr(uint8) {

      var header = '';

      var pos = 0;

      if (!isHdr(uint8)) {

          return 'Corrupt HDR image.';

      }

      // read header

      while (!header.match(/\n\n[^\n]+\n/g) && pos < MAX_HEADER_LENGTH) {

          header += String.fromCharCode(uint8[pos++]);

      }

      // check format

      var format = header.match(/FORMAT=(.*)$/m)[1];

      if (format !== '32-bit_rle_rgbe') {

          return 'Unsupported HDR format: ' + format;

      }

      // parse resolution

      var rez = header.split(/\n/).reverse()[1].split(' ');

      if (rez[0] !== '-Y' || rez[2] !== '+X') {

          return 'Unsupported HDR format';

      }

      var width = Number.parseFloat(rez[3]);

      var height = Number.parseFloat(rez[1]);

      if (width > MAX_DIMENSIONS || height > MAX_DIMENSIONS) {

          return 'Very large image (corrupt?)';

      }

      var i, j;

      var c1 = uint8[pos];

      var c2 = uint8[pos + 1];

      var len = uint8[pos + 2];

      // not run-length encoded, so we have to actually use THIS data as a decoded

      // pixel (note this can't be a valid pixel--one of RGB must be >= 128)

      var notRLE = c1 !== 2 || c2 !== 2 || !!(len & (0x80)); // not run-length encoded

      var hdrData = new Float32Array(width * height * 3);

      if (width < 8 || width >= 32768 || notRLE) { // 32768: 2^15

          // Read flat data

          for (j = 0; j < height; ++j) {

              for (i = 0; i < width; ++i) {

                  var rgbe = uint8.subarray(pos, pos + 4);

                  pos += 4;

                  var start = (j * width + i) * 3;

                  rgbe2float(rgbe, hdrData.subarray(start, start + 3));

              }

          }

      }

      else {

          // Read RLE-encoded data

          var scanline = void 0;

          var c1_1;

          var c2_1;

          var len_1;

          for (var j_1 = 0; j_1 < height; j_1++) {

              c1_1 = uint8[pos++];

              c2_1 = uint8[pos++];

              len_1 = uint8[pos++];

              if (c1_1 !== 2 || c2_1 !== 2 || len_1 & (0x80)) {

                  return 'Invalid scanline';

              }

              len_1 = len_1 << 8;

              len_1 |= uint8[pos++];

              if (len_1 !== width) {

                  return 'invalid decoded scanline length';

              }

              if (!scanline) {

                  scanline = new Uint8Array(width * 4);

              }

              var count = void 0;

              var value = void 0;

              for (var k = 0; k < 4; k++) {

                  var nLeft = void 0;

                  i = 0;

                  while ((nLeft = width - i) > 0) {

                      count = uint8[pos++];

                      if (count > 128) {

                          // is RUN

                          value = uint8[pos++];

                          count -= 128;

                          if (count > nLeft) {

                              return 'bad RLE data in HDR';

                          }

                          for (var z = 0; z < count; z++) {

                              scanline[i++ * 4 + k] = value;

                          }

                      }

                      else {

                          // is DUMP

                          if (count > nLeft) {

                              return 'bad RLE data in HDR';

                          }

                          for (var z = 0; z < count; z++) {

                              scanline[i++ * 4 + k] = uint8[pos++];

                          }

                      }

                  }

              }

              for (var i_1 = 0; i_1 < width; i_1++) {

                  rgbe2float(scanline.subarray(i_1 * 4), hdrData.subarray((j_1 * width + i_1) * 3));

              }

          }

      }

      return {

          rgbFloat: hdrData,

          width: width,

          height: height,

      };

  }

  var HDRjs = Object.freeze({

      load: load,

      save: save,

      read: read_hdr,

      write: write_hdr,

      float2rgbe: float2rgbe,

      rgbe2float: rgbe2float,

  });


  return HDRjs;


}));