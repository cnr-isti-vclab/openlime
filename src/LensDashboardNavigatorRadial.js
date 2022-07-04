import { Util } from "./Util"
import { LensDashboard } from "./LensDashboard"

class LensDashboardNavigatorRadial extends LensDashboard {
   /**
     * Manages creation and update of a lens dashboard.
     * An object literal with Layer `options` can be specified.
   * This class instatiates an optional element of {@link LayerLens}
     * @param {Object} options An object literal with Lensdashboard parameters.
     * @param {number} options.toolboxHeight=25 The extra border thickness (in pixels) around the square including the lens.
     */
   constructor(viewer, options) {
      super(viewer, options);
      options = Object.assign({
         toolSize: 30,
         toolPadding: 2,
         group: [-65, 0],
         actions: {
            camera: { label: 'camera', group: 0, angle: -25, task: (event) => { if (!this.actions.camera.active) this.toggleLightController(); } },
            light: { label: 'light', group: 0, angle: 0, task: (event) => { if (!this.actions.light.active) this.toggleLightController(); } },
            annoswitch: { label: 'annoswitch', group: 1, angle: 0, type: 'toggle', toggleClass: '.openlime-lens-dashboard-annoswitch-bar', task: (event) => { } },
            prev: { label: 'prev', group: 1, angle: 25, task: (event) => { } },
            down: { label: 'down', group: 1, angle: 50, task: (event) => { } },
            next: { label: 'next', group: 1, angle: 75, task: (event) => { } },
         },
          updateCb: null,
         updateEndCb: null
      }, options);
      Object.assign(this, options);

      this.moving = false;
      this.delay = 400;
      this.timeout = null; // Timeout for moving

      // TOOLBOX BKG
 		const col = [255.0 * this.borderColor[0], 255.0 * this.borderColor[1], 255.0 * this.borderColor[2], 255.0 * this.borderColor[3]];
      col[3]=0.4;
      this.toolboxBkgSize = 48;
      this.toolboxBkg = new Object();
      this.toolboxBkg.svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
         <svg
            viewBox="0 0 200 200"
            fill="none"
            version="1.1"
            id="svg11"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:svg="http://www.w3.org/2000/svg">
           <path id="shape-dashboard-bkg" d="" stroke="none" fill="rgb(${col[0]},${col[1]},${col[2]},${col[3]})"/>
         </svg>`;
      this.toolboxBkg.element = Util.SVGFromString(this.toolboxBkg.svg);
      this.container.appendChild(this.toolboxBkg.element);

      // TOOLBOX ITEMS
      this.actions.camera.svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <!-- Created with Inkscape (http://www.inkscape.org/) -->
        
        <svg
           viewBox="0 0 83.319054 83.319054"
           version="1.1"
           id="svg2495"
           xmlns="http://www.w3.org/2000/svg"
           xmlns:svg="http://www.w3.org/2000/svg">
          <defs
             id="defs2492" />
          <g
             id="layer1"
             transform="translate(-69.000668,-98.39946)">
            <g
               id="g2458"
               transform="matrix(0.35277777,0,0,0.35277777,46.261671,-65.803422)"
               class="openlime-lens-dashboard-camera">
              <path class="openlime-lens-dashboard-button-bkg"
                 d="m 300.637,583.547 c 0,65.219 -52.871,118.09 -118.09,118.09 -65.219,0 -118.09,-52.871 -118.09,-118.09 0,-65.219 52.871,-118.09 118.09,-118.09 65.219,0 118.09,52.871 118.09,118.09 z"
                 style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none"
                 id="path50" />
              <g
                 id="g52">
                <path
                   d="M 123.445,524.445 H 241.652 V 642.648 H 123.445 Z"
                   style="fill:#ffffff;fill-opacity:0;fill-rule:nonzero;stroke:#000000;stroke-width:16.7936;stroke-linecap:butt;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
                   id="path54" />
              </g>
              <g
                 id="g56"
                 transform="scale(1,0.946694)">
                <path
                   d="m 190.449,581.031 h -15.793 c -0.011,7.563 0,27.472 0,27.472 0,0 -17.133,0 -25.609,0.025 v 15.779 c 8.476,-0.009 25.609,-0.009 25.609,-0.009 0,0 0,19.881 -0.011,27.485 h 15.793 c 0.011,-7.604 0.011,-27.485 0.011,-27.485 0,0 17.125,0 25.598,0 v -15.795 c -8.473,0 -25.598,0 -25.598,0 0,0 -0.023,-19.904 0,-27.472"
                   style="fill:#000000;fill-opacity:1;fill-rule:nonzero;stroke:#000000;stroke-width:0.52673;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
                   id="path58" />
              </g>
              <path
                 d="m 269.254,557.93 22.332,21.437 c 2.098,2.071 2.195,5.344 0,7.504 l -22.332,21.008 c -1.25,1.25 -5.004,1.25 -6.254,-2.504 v -46.273 c 1.25,-3.672 5.004,-2.422 6.254,-1.172 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path60" />
              <path
                 d="M 95.844,607.395 73.508,585.957 c -2.094,-2.07 -2.192,-5.34 0,-7.504 l 22.336,-21.008 c 1.25,-1.25 5,-1.25 6.254,2.504 v 46.274 c -1.254,3.672 -5.004,2.422 -6.254,1.172 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path62" />
              <path
                 d="m 157.59,494.32 21.437,-22.332 c 2.071,-2.097 5.344,-2.191 7.504,0 l 21.008,22.332 c 1.25,1.254 1.25,5.004 -2.504,6.254 h -46.273 c -3.672,-1.25 -2.422,-5 -1.172,-6.254 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path64" />
              <path
                 d="m 207.055,671.785 -21.438,22.336 c -2.07,2.094 -5.344,2.191 -7.504,0 l -21.008,-22.336 c -1.25,-1.25 -1.25,-5 2.504,-6.25 h 46.274 c 3.672,1.25 2.422,5 1.172,6.25 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path66" />
            </g>
          </g>
        </svg>`;

      this.actions.light.svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <!-- Created with Inkscape (http://www.inkscape.org/) -->
        
        <svg
           viewBox="0 0 83.319054 83.320114"
           version="1.1"
           id="svg5698"
           xmlns="http://www.w3.org/2000/svg"
           xmlns:svg="http://www.w3.org/2000/svg">
          <defs
             id="defs5695" />
          <g
             id="layer1"
             transform="translate(-104.32352,-59.017909)">
            <g
               id="g2477"
               transform="matrix(0.35277777,0,0,0.35277777,-16.220287,-105.16169)"
               class="openlime-lens-dashboard-light">
              <path class="openlime-lens-dashboard-button-bkg"
                 d="m 577.879,583.484 c 0,65.219 -52.871,118.09 -118.09,118.09 -65.219,0 -118.09,-52.871 -118.09,-118.09 0,-65.222 52.871,-118.093 118.09,-118.093 65.219,0 118.09,52.871 118.09,118.093 z"
                 style="fill:#fbfbfb;fill-opacity:1;fill-rule:nonzero;stroke:none"
                 id="path74" />
              <path
                 d="m 546.496,558.359 22.332,21.438 c 2.098,2.066 2.192,5.34 0,7.504 l -22.332,21.004 c -1.25,1.254 -5.004,1.254 -6.254,-2.5 v -46.274 c 1.25,-3.672 5.004,-2.422 6.254,-1.172 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path76" />
              <path
                 d="M 373.082,607.82 350.75,586.383 c -2.094,-2.067 -2.191,-5.34 0,-7.504 l 22.332,-21.004 c 1.254,-1.25 5.004,-1.25 6.254,2.5 v 46.277 c -1.25,3.672 -5,2.422 -6.254,1.168 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path78" />
              <path
                 d="m 434.832,494.75 21.438,-22.332 c 2.07,-2.098 5.339,-2.195 7.503,0 l 21.008,22.332 c 1.25,1.25 1.25,5.004 -2.504,6.254 h -46.273 c -3.672,-1.25 -2.422,-5.004 -1.172,-6.254 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path80" />
              <path
                 d="m 484.297,672.215 -21.438,22.332 c -2.07,2.098 -5.343,2.195 -7.507,0 l -21.004,-22.332 c -1.25,-1.25 -1.25,-5.004 2.504,-6.254 h 46.273 c 3.672,1.25 2.422,5.004 1.172,6.254 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path82" />
              <path
                 d="m 438.223,599.988 c 0,0 -2.161,-0.535 -3.684,0.227 -1.523,0.762 -0.789,8.773 -0.789,8.773 l 16.305,-0.222 c 0,0 -14.071,3.597 -15.383,6.296 -1.317,2.7 1.672,6.786 4.34,7.426 2.136,0.516 45.793,-13.426 46.808,-14.625 0.883,-1.039 1.446,-6.75 0.528,-7.648 -0.922,-0.899 -4.602,-0.789 -4.602,-0.789 0,0 -1.449,0.113 -0.133,-3.934 1.317,-4.051 15.254,-20.137 18.672,-30.262 3.293,-9.753 1.387,-22.531 -2.367,-28.683 -3.965,-6.504 -9.598,-10.688 -17.356,-13.723 -7.789,-3.051 -22.191,-4.773 -33.664,-1.578 -11.425,3.188 -20.32,8.988 -25.507,16.649 -4.657,6.878 -4.473,20.699 -2.895,26.097 1.578,5.403 17.621,25.426 19.199,29.473 1.578,4.051 0.528,6.523 0.528,6.523 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path84" />
              <g
                 id="g86"
                 transform="scale(1,0.855493)">
                <path
                   d="m 438.223,701.337 c 0,0 -2.161,-0.626 -3.684,0.265 -1.523,0.89 -0.789,10.255 -0.789,10.255 l 16.305,-0.26 c 0,0 -14.071,4.205 -15.383,7.36 -1.317,3.155 1.672,7.931 4.34,8.68 2.136,0.603 45.793,-15.693 46.808,-17.095 0.883,-1.215 1.446,-7.89 0.528,-8.94 -0.922,-1.051 -4.602,-0.923 -4.602,-0.923 0,0 -1.449,0.133 -0.133,-4.598 1.317,-4.735 15.254,-23.538 18.672,-35.373 3.293,-11.402 1.387,-26.337 -2.367,-33.529 -3.965,-7.603 -9.598,-12.493 -17.356,-16.041 -7.789,-3.566 -22.191,-5.579 -33.664,-1.844 -11.425,3.725 -20.32,10.506 -25.507,19.46 -4.657,8.041 -4.473,24.196 -2.895,30.506 1.578,6.315 17.621,29.721 19.199,34.451 1.578,4.735 0.528,7.626 0.528,7.626 z"
                   style="fill:none;stroke:#f8f8f8;stroke-width:8.1576;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.00677317"
                   id="path88" />
              </g>
              <path
                 d="m 435.59,631.598 c 0.394,3.714 14.992,14.851 20.91,15.414 5.914,0.562 5.125,0.898 9.336,-0.453 4.207,-1.348 17.617,-9.223 18.277,-10.571 1.68,-3.453 2.758,-6.976 1.313,-9.113 -1.449,-2.145 -3.946,-0.563 -6.574,0.227 -2.629,0.785 -13.805,5.734 -17.489,6.859 -2.89,0.883 -9.203,-0.563 -9.203,-0.563 0,0 32.012,-10.578 33.266,-12.933 1.316,-2.477 0.262,-6.977 -2.762,-7.539 -1.926,-0.36 -43.785,13.386 -44.836,15.074 -1.055,1.688 -2.238,3.598 -2.238,3.598 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path90" />
              <g
                 id="g92"
                 transform="scale(1,0.855493)">
                <path
                   d="m 435.59,738.285 c 0.394,4.343 14.992,17.361 20.91,18.018 5.914,0.658 5.125,1.05 9.336,-0.529 4.207,-1.576 17.617,-10.781 18.277,-12.356 1.68,-4.037 2.758,-8.155 1.313,-10.653 -1.449,-2.507 -3.946,-0.657 -6.574,0.265 -2.629,0.918 -13.805,6.703 -17.489,8.018 -2.89,1.032 -9.203,-0.658 -9.203,-0.658 0,0 32.012,-12.365 33.266,-15.118 1.316,-2.895 0.262,-8.155 -2.762,-8.812 -1.926,-0.421 -43.785,15.648 -44.836,17.62 -1.055,1.973 -2.238,4.205 -2.238,4.205 z"
                   style="fill:none;stroke:#f8f8f8;stroke-width:8.1576;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.00677317"
                   id="path94" />
              </g>
              <path
                 d="m 438.223,599.988 c 0,0 -2.161,-0.535 -3.684,0.227 -1.523,0.762 -0.789,8.773 -0.789,8.773 l 16.305,-0.222 c 0,0 -14.071,3.597 -15.383,6.296 -1.317,2.7 1.672,6.786 4.34,7.426 2.136,0.516 45.793,-13.426 46.808,-14.625 0.883,-1.039 1.446,-6.75 0.528,-7.648 -0.922,-0.899 -4.602,-0.789 -4.602,-0.789 0,0 -1.449,0.113 -0.133,-3.934 1.317,-4.051 15.254,-20.137 18.672,-30.262 3.293,-9.753 1.387,-22.531 -2.367,-28.683 -3.965,-6.504 -9.598,-10.688 -17.356,-13.723 -7.789,-3.051 -22.191,-4.773 -33.664,-1.578 -11.425,3.188 -20.32,8.988 -25.507,16.649 -4.657,6.878 -4.473,20.699 -2.895,26.097 1.578,5.403 17.621,25.426 19.199,29.473 1.578,4.051 0.528,6.523 0.528,6.523 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path96" />
              <g
                 id="g98"
                 transform="scale(1,0.855493)">
                <path
                   d="m 438.223,701.337 c 0,0 -2.161,-0.626 -3.684,0.265 -1.523,0.89 -0.789,10.255 -0.789,10.255 l 16.305,-0.26 c 0,0 -14.071,4.205 -15.383,7.36 -1.317,3.155 1.672,7.931 4.34,8.68 2.136,0.603 45.793,-15.693 46.808,-17.095 0.883,-1.215 1.446,-7.89 0.528,-8.94 -0.922,-1.051 -4.602,-0.923 -4.602,-0.923 0,0 -1.449,0.133 -0.133,-4.598 1.317,-4.735 15.254,-23.538 18.672,-35.373 3.293,-11.402 1.387,-26.337 -2.367,-33.529 -3.965,-7.603 -9.598,-12.493 -17.356,-16.041 -7.789,-3.566 -22.191,-5.579 -33.664,-1.844 -11.425,3.725 -20.32,10.506 -25.507,19.46 -4.657,8.041 -4.473,24.196 -2.895,30.506 1.578,6.315 17.621,29.721 19.199,34.451 1.578,4.735 0.528,7.626 0.528,7.626 z"
                   style="fill:none;stroke:#f8f8f8;stroke-width:8.1576;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.00677317"
                   id="path100" />
              </g>
              <path
                 d="m 435.59,631.598 c 0.394,3.714 14.992,14.851 20.91,15.414 5.914,0.562 5.125,0.898 9.336,-0.453 4.207,-1.348 17.617,-9.223 18.277,-10.571 1.68,-3.453 2.758,-6.976 1.313,-9.113 -1.449,-2.145 -3.946,-0.563 -6.574,0.227 -2.629,0.785 -13.805,5.734 -17.489,6.859 -2.89,0.883 -9.203,-0.563 -9.203,-0.563 0,0 32.012,-10.578 33.266,-12.933 1.316,-2.477 0.262,-6.977 -2.762,-7.539 -1.926,-0.36 -43.785,13.386 -44.836,15.074 -1.055,1.688 -2.238,3.598 -2.238,3.598 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path102" />
              <g
                 id="g104"
                 transform="scale(1,0.855493)">
                <path
                   d="m 435.59,738.285 c 0.394,4.343 14.992,17.361 20.91,18.018 5.914,0.658 5.125,1.05 9.336,-0.529 4.207,-1.576 17.617,-10.781 18.277,-12.356 1.68,-4.037 2.758,-8.155 1.313,-10.653 -1.449,-2.507 -3.946,-0.657 -6.574,0.265 -2.629,0.918 -13.805,6.703 -17.489,8.018 -2.89,1.032 -9.203,-0.658 -9.203,-0.658 0,0 32.012,-12.365 33.266,-15.118 1.316,-2.895 0.262,-8.155 -2.762,-8.812 -1.926,-0.421 -43.785,15.648 -44.836,17.62 -1.055,1.973 -2.238,4.205 -2.238,4.205 z"
                   style="fill:none;stroke:#f8f8f8;stroke-width:8.1576;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.00677317"
                   id="path106" />
              </g>
            </g>
          </g>
        </svg>`;

      this.actions.annoswitch.svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <!-- Created with Inkscape (http://www.inkscape.org/) -->
      
      <svg
         viewBox="0 0 83.319054 83.320114"
         version="1.1"
         id="svg11415"
         xml:space="preserve"
         xmlns="http://www.w3.org/2000/svg"
         xmlns:svg="http://www.w3.org/2000/svg"><defs
           id="defs11412"><marker
             style="overflow:visible"
             id="TriangleStart"
             refX="0"
             refY="0"
             orient="auto-start-reverse"
             markerWidth="5.3244081"
             markerHeight="6.155385"
             viewBox="0 0 5.3244081 6.1553851"
             preserveAspectRatio="xMidYMid"><path
               transform="scale(0.5)"
               style="fill:context-stroke;fill-rule:evenodd;stroke:context-stroke;stroke-width:1pt"
               d="M 5.77,0 -2.88,5 V -5 Z"
               id="path135" /></marker><marker
             style="overflow:visible"
             id="TriangleStart-5"
             refX="0"
             refY="0"
             orient="auto-start-reverse"
             markerWidth="5.3244081"
             markerHeight="6.155385"
             viewBox="0 0 5.3244081 6.1553851"
             preserveAspectRatio="xMidYMid"><path
               transform="scale(0.5)"
               style="fill:context-stroke;fill-rule:evenodd;stroke:context-stroke;stroke-width:1pt"
               d="M 5.77,0 -2.88,5 V -5 Z"
               id="path135-3" /></marker></defs><g
           id="g327"
           transform="translate(129.83427,13.264356)"><g
             id="g346"><path
               d="m -46.51522,28.396234 c 0,23.007813 -18.65172,41.659526 -41.65953,41.659526 -23.00782,0 -41.65952,-18.651713 -41.65952,-41.659526 0,-23.00887 18.6517,-41.66059 41.65952,-41.66059 23.00781,0 41.65953,18.65172 41.65953,41.66059 z"
               style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0.352778"
               id="path68"
               class="openlime-lens-dashboard-button-bkg" /><g
               aria-label="i"
               id="text430"
               style="font-size:50.8px;line-height:1.25;font-family:'Palace Script MT';-inkscape-font-specification:'Palace Script MT';font-variant-ligatures:none;letter-spacing:0px;word-spacing:0px;stroke-width:0.264583"
               transform="matrix(1.9896002,0,0,1.9896002,-378.32178,-41.782121)"><path
                 d="m 149.74343,19.295724 c -1.4224,1.1176 -2.5908,2.032 -3.5052,2.6416 0.3556,1.0668 0.8128,1.9304 1.9304,3.556 1.4224,-1.27 1.5748,-1.4224 3.302,-2.7432 -0.1524,-0.3048 -0.254,-0.508 -0.6604,-1.1684 -0.3048,-0.6096 -0.3556,-0.6096 -0.762,-1.6256 z m 1.9304,25.4 -0.8636,0.4572 c -3.5052,1.9304 -4.1148,2.1844 -4.7244,2.1844 -0.5588,0 -0.9144,-0.5588 -0.9144,-1.4224 0,-0.8636 0,-0.8636 1.6764,-7.5692 1.8796,-7.7216 1.8796,-7.7216 1.8796,-8.128 0,-0.3048 -0.254,-0.508 -0.6096,-0.508 -0.8636,0 -3.8608,1.6764 -8.0264,4.4704 l -0.1016,1.4224 c 3.0988,-1.6764 3.2512,-1.7272 3.7084,-1.7272 0.4064,0 0.6096,0.3048 0.6096,0.8636 0,0.7112 -0.1524,1.4224 -0.9144,4.318 -2.3876,8.8392 -2.3876,8.8392 -2.3876,10.16 0,1.2192 0.4572,2.032 1.2192,2.032 0.8636,0 2.2352,-0.6604 4.9276,-2.3876 0.9652,-0.6096 1.9304,-1.2192 2.8956,-1.8796 0.4572,-0.254 0.8128,-0.508 1.4224,-0.8636 z"
                 style="font-weight:bold;font-family:Z003;-inkscape-font-specification:'Z003 Bold'"
                 id="path495" /></g><path
               style="fill:none;stroke:#000000;stroke-width:17.09477;stroke-linecap:butt;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
               d="M -66.121922,49.608737 -110.22757,7.1826674"
               id="path465"
               class="openlime-lens-dashboard-annoswitch-bar" /></g></g></svg>`;

      this.actions.prev.svg = `<svg
      viewBox="0 0 83.319054 83.320114"
      version="1.1"
      id="svg11415"
      xml:space="preserve"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:svg="http://www.w3.org/2000/svg"><defs
        id="defs11412"><marker
          style="overflow:visible"
          id="TriangleStart"
          refX="0"
          refY="0"
          orient="auto-start-reverse"
          markerWidth="5.3244081"
          markerHeight="6.155385"
          viewBox="0 0 5.3244081 6.1553851"
          preserveAspectRatio="xMidYMid"><path
            transform="scale(0.5)"
            style="fill:context-stroke;fill-rule:evenodd;stroke:context-stroke;stroke-width:1pt"
            d="M 5.77,0 -2.88,5 V -5 Z"
            id="path135" /></marker><marker
          style="overflow:visible"
          id="TriangleStart-5"
          refX="0"
          refY="0"
          orient="auto-start-reverse"
          markerWidth="5.3244081"
          markerHeight="6.155385"
          viewBox="0 0 5.3244081 6.1553851"
          preserveAspectRatio="xMidYMid"><path
            transform="scale(0.5)"
            style="fill:context-stroke;fill-rule:evenodd;stroke:context-stroke;stroke-width:1pt"
            d="M 5.77,0 -2.88,5 V -5 Z"
            id="path135-3" /></marker></defs><g
        id="g417"
        transform="matrix(3.3565779,0,0,3.3565779,129.92814,-51.220758)"><g
          id="g335"><path
            d="m -172.71351,100.60243 c 0,23.00781 -18.65172,41.65952 -41.65953,41.65952 -23.00782,0 -41.65952,-18.65171 -41.65952,-41.65952 0,-23.00887 18.6517,-41.66059 41.65952,-41.66059 23.00781,0 41.65953,18.65172 41.65953,41.66059 z"
            style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0.352778"
            id="path68"
            class="openlime-lens-dashboard-button-bkg"
            transform="matrix(0.29792248,0,0,0.29792248,37.569341,-2.3002842)" /><path
            style="fill:#030104"
            d="m -35.494703,28.624414 c 0,-0.264 0.213,-0.474 0.475,-0.474 h 2.421 c 0.262,0 0.475,0.21 0.475,0.474 0,3.211 2.615,5.826 5.827,5.826 3.212,0 5.827,-2.615 5.827,-5.826 0,-3.214 -2.614,-5.826 -5.827,-5.826 -0.34,0 -0.68,0.028 -1.016,0.089 v 1.647 c 0,0.193 -0.116,0.367 -0.291,0.439 -0.181,0.073 -0.383,0.031 -0.521,-0.104 l -4.832,-3.273 c -0.184,-0.185 -0.184,-0.482 0,-0.667 l 4.833,-3.268 c 0.136,-0.136 0.338,-0.176 0.519,-0.104 0.175,0.074 0.291,0.246 0.291,0.438 v 1.487 c 0.34,-0.038 0.68,-0.057 1.016,-0.057 5.071,0 9.198,4.127 9.198,9.198 0,5.07 -4.127,9.197 -9.198,9.197 -5.07,10e-4 -9.197,-4.126 -9.197,-9.196 z"
            id="path415" /></g></g></svg>`;

      this.actions.down.svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <!-- Created with Inkscape (http://www.inkscape.org/) -->
        
        <svg
           viewBox="0 0 83.319054 83.320114"
           version="1.1"
           id="svg11415"
           xml:space="preserve"
           xmlns="http://www.w3.org/2000/svg"
           xmlns:svg="http://www.w3.org/2000/svg"><defs
             id="defs11412"><marker
               style="overflow:visible"
               id="TriangleStart"
               refX="0"
               refY="0"
               orient="auto-start-reverse"
               markerWidth="5.3244081"
               markerHeight="6.155385"
               viewBox="0 0 5.3244081 6.1553851"
               preserveAspectRatio="xMidYMid"><path
                 transform="scale(0.5)"
                 style="fill:context-stroke;fill-rule:evenodd;stroke:context-stroke;stroke-width:1pt"
                 d="M 5.77,0 -2.88,5 V -5 Z"
                 id="path135" /></marker><marker
               style="overflow:visible"
               id="TriangleStart-5"
               refX="0"
               refY="0"
               orient="auto-start-reverse"
               markerWidth="5.3244081"
               markerHeight="6.155385"
               viewBox="0 0 5.3244081 6.1553851"
               preserveAspectRatio="xMidYMid"><path
                 transform="scale(0.5)"
                 style="fill:context-stroke;fill-rule:evenodd;stroke:context-stroke;stroke-width:1pt"
                 d="M 5.77,0 -2.88,5 V -5 Z"
                 id="path135-3" /></marker></defs><g
             id="g4652"
             transform="translate(145.46385,95.197966)"><g
               id="g4846"
               transform="translate(-126.60931,52.756264)"><path
                 d="m 64.464511,-106.29364 c 0,23.007813 -18.65172,41.659526 -41.65953,41.659526 -23.0078196,0 -41.659526,-18.651713 -41.659526,-41.659526 0,-23.00887 18.6517064,-41.66059 41.659526,-41.66059 23.00781,0 41.65953,18.65172 41.65953,41.66059 z"
                 style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0.352778"
                 id="path68"
                 class="openlime-lens-dashboard-button-bkg" /><g
                 id="g2392-5"
                 transform="matrix(0.26458333,0,0,0.26458333,-283.58108,-263.57207)"><path
                   style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:40;stroke-linecap:round;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
                   d="m 1072.4033,509.27736 h 171.1826"
                   id="path351-6" /><path
                   style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:30;stroke-linecap:round;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
                   d="m 1185.0215,568.3701 h 59.6026"
                   id="path351-3-2" /><path
                   style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:30;stroke-linecap:round;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
                   d="m 1184.2167,621.15576 h 59.6026"
                   id="path351-3-2-0" /><path
                   style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:40;stroke-linecap:round;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
                   d="m 1072.4033,679.59496 h 171.1826"
                   id="path351-3-6-7-1" /><path
                   style="display:inline;fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:11.4448;stroke-linecap:butt;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1;marker-end:url(#TriangleStart-5)"
                   d="m 1074.9115,570.87447 54.1203,-0.0275"
                   id="path1366-2" /><path
                   style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:14;stroke-linecap:butt;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
                   d="m 1080.0425,521.28147 v 54.87857"
                   id="path1402-7" /><path
                   style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"
                   d="m 1150.8866,623.00688 0.3956,-5.02729"
                   id="path2545" /><path
                   style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:30;stroke-linecap:round;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
                   d="m 1185.0215,567.71656 h 59.6026"
                   id="path2720" /></g></g></g></svg>`;

      this.actions.next.svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <!-- Created with Inkscape (http://www.inkscape.org/) -->
      
      <svg
         viewBox="0 0 83.319054 83.320114"
         version="1.1"
         id="svg11415"
         xml:space="preserve"
         xmlns="http://www.w3.org/2000/svg"
         xmlns:svg="http://www.w3.org/2000/svg"><defs
           id="defs11412"><marker
             style="overflow:visible"
             id="TriangleStart"
             refX="0"
             refY="0"
             orient="auto-start-reverse"
             markerWidth="5.3244081"
             markerHeight="6.155385"
             viewBox="0 0 5.3244081 6.1553851"
             preserveAspectRatio="xMidYMid"><path
               transform="scale(0.5)"
               style="fill:context-stroke;fill-rule:evenodd;stroke:context-stroke;stroke-width:1pt"
               d="M 5.77,0 -2.88,5 V -5 Z"
               id="path135" /></marker></defs><g
           id="g4652"
           transform="translate(-12.647874,74.762541)"><path
             d="m 95.96693,-33.101955 c 0,23.007813 -18.65172,41.6595258 -41.65953,41.6595258 -23.00782,0 -41.659526,-18.6517128 -41.659526,-41.6595258 0,-23.008872 18.651706,-41.660586 41.659526,-41.660586 23.00781,0 41.65953,18.651714 41.65953,41.660586 z"
             style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0.352778"
             id="path68"
             class="openlime-lens-dashboard-button-bkg" /><g
             id="g4636"
             transform="translate(173.74831,-50.897484)"><path
               style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:10.5833;stroke-linecap:round;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
               d="m -142.08694,-4.7366002 h 45.292059"
               id="path351" /><path
               style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:10.5833;stroke-linecap:round;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
               d="m -142.08694,40.326598 h 45.292059"
               id="path351-3-6-7" /><path
               style="display:inline;fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:3.20746;stroke-linecap:butt;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1;marker-end:url(#TriangleStart)"
               d="m -136.09942,8.7192481 0.008,14.9721889"
               id="path1366" /><path
               style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:3.70417;stroke-linecap:butt;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
               d="M -136.07283,-1.5605128 V 24.204958"
               id="path1402" /><path
               style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:7.9375;stroke-linecap:round;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
               d="m -111.69142,24.864565 h 15.76985"
               id="path351-3-2-0-3" /><path
               style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:7.9375;stroke-linecap:round;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1"
               d="m -111.37623,10.725444 h 15.76986"
               id="path2720-9" /></g></g></svg>`;

      if (queueMicrotask) queueMicrotask(() => { this.init() }); //allows modification of actions and layers before init.
      else setTimeout(() => { this.init(); }, 0);

   }

   init() {
      this.container.style.display = 'block';
      this.container.style.margin = '0';

      for (let [name, action] of Object.entries(this.actions)) {
         this.addAction(action);
      }

      // Set Camera movement active
      this.actions.camera.active = this.actions.camera.element.classList.toggle('openlime-lens-dashboard-camera-active');
      this.actions.light.active = false;

      // Enable camera, light, next buttons
      this.setActionEnabled('camera');
      this.setActionEnabled('light');
      this.setActionEnabled('annoswitch');
      this.setActionEnabled('next');
   }

   static degToRadians(angle) {
      return angle * (Math.PI / 180.0);
   }

   setToolboxBkg(r, sizew, sizeh) {
      const e = this.toolboxBkg.element;
      e.setAttributeNS(null, 'viewBox', `0 0 ${sizew} ${sizeh}`);
      const shape = e.querySelector('#shape-dashboard-bkg');
      const cs = this.containerSpace;
      const b =  this.toolboxBkgSize;
      shape.setAttributeNS(null, 'd', `M ${sizew*0.5-r-b},${sizeh*0.5} a1,1 0 0,1 ${2*(r+b)},0 h ${-b} a1,1 0 1,0 ${-2*r},0 Z`);
   }

   addAction(action) {
      action.element = Util.SVGFromString(action.svg);
      action.element.style = `position:absolute; height: ${this.toolSize}px; margin: 0`;
      action.element.classList.add('openlime-lens-dashboard-button');
      if (action.type == 'toggle') {
         const toggleElm = action.element.querySelector(action.toggleClass);
         toggleElm.style.visibility = `hidden`;
         action.active = false;
      }
      action.element.addEventListener('click', (e) => {
         if (action.type == 'toggle') {
            action.active = !action.active;
            const toggleElm = action.element.querySelector(action.toggleClass);
            if (action.active) {
               toggleElm.style.visibility = `visible`;
            } else {
               toggleElm.style.visibility = `hidden`;
            }
            this.noupdate=true;
         }
         action.task(e);
         e.preventDefault();
      });
      this.container.appendChild(action.element);
   }

   getAction(label) {
      let result = null;
      for (let [name, action] of Object.entries(this.actions)) {
         if (action.label === label) {
            result = action;
            break;
         }
      }
      return result;
   }

   setActionEnabled(label, enable = true) {
      const action = this.getAction(label);
      if (action) {
         action.element.classList.toggle('enabled', enable);
      }
   }

   toggleLightController() {
      let active = this.actions.light.element.classList.toggle('openlime-lens-dashboard-light-active');
      this.actions.light.active = active;
      this.actions.camera.active = this.actions.camera.element.classList.toggle('openlime-lens-dashboard-camera-active');

      for (let layer of Object.values(this.viewer.canvas.layers))
         for (let c of layer.controllers)
            if (c.control == 'light') {
               c.active = true;
               c.activeModifiers = active ? [0, 2, 4] : [2, 4];  //nothing, shift and alt
            }
   }

   setToggleClassVisibility(t) {
      for (let [name, action] of Object.entries(this.actions)) {
         if (action.type == 'toggle' && action.active) {
            const toggleElm = action.element.querySelector(action.toggleClass);
            if (t) {
               toggleElm.style.visibility = `visible`;
            } else {
               toggleElm.style.visibility = `hidden`;
            }
         }
      }
   }

   toggle() {
      const t = this.container.classList.toggle('closed');
      this.setToggleClassVisibility(!t);
   }

   setToolboxElm(radius, sizew, sizeh) {
      
        // Toolbox Background
      this.setToolboxBkg(radius - this.borderWidth - 2, sizew, sizeh);
      this.first = false;

      // Set tool position
      const alphaDelta = 2.0*Math.asin((this.toolSize*0.5+this.toolPadding)/(radius));
      for (let i = 0; i < this.group.length; i++) {
         const gArr = Object.entries(this.actions).filter( ([key, value]) => value.group == i);
         if(Math.abs(this.group[i]) > 90) gArr.reverse();
         let idx = 0;
         for (let [name, action] of gArr) {
            // const tw = action.element.clientWidth;
            // const th = action.element.clientHeight;
            const th = this.toolSize;
            const tw = this.toolSize;
            const rad = LensDashboardNavigatorRadial.degToRadians(this.group[i]) + idx * alphaDelta;
            let cbx = (radius+this.toolSize*0.5) * Math.sin(rad);
            let cby = (radius+this.toolSize*0.5) * Math.cos(rad);
            let bx = sizew * 0.5 + cbx - tw / 2;
            let by = sizeh * 0.5 - cby - th / 2;
            action.element.style.left = `${bx}px`;
            action.element.style.top = `${by}px`;
            idx++;
         }
      }
   }

   /** @ignore */
   update(x, y, r) {
      if(this.noupdate) {
         this.noupdate = false;
         return;
      }
      super.update(x,y,r);
      const center = {
         x: this.lensBox.x,
         y: this.lensBox.y
      }
      const radius = this.lensBox.r;
      const sizew = this.lensBox.w;
      const sizeh = this.lensBox.h;
     
      //this.setToolboxElm(radius, sizew, sizeh);

      if (this.updateCb) {
         // updateCb(c.x, c.y, r, dashboard.w, dashboard.h, canvas.w, canvas.h) all params in canvas coordinates
         this.updateCb(center.x, center.y, radius, sizew, sizeh, this.viewer.camera.viewport.w, this.viewer.camera.viewport.h);
      }

      if (!this.moving) {
         this.toggle();
         this.moving = true;
      }
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
         this.toggle();
         this.moving = false;
         this.setToolboxElm(radius, sizew, sizeh);
         if (this.updateEndCb) this.updateEndCb(center.x, center.y, radius, sizew, sizeh, this.viewer.camera.viewport.w, this.viewer.camera.viewport.h);
      }, this.delay);
   }
}

export { LensDashboardNavigatorRadial }
