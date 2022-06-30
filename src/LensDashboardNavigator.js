import { Util } from "./Util"
import { LensDashboard } from "./LensDashboard"

class LensDashboardNavigator extends LensDashboard {
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
         toolboxHeight: 22,
         actions: {
            camera: { label: 'camera', task: (event) => { if (!this.actions.camera.active) this.toggleLightController(); } },
            light: { label: 'light', task: (event) => { if (!this.actions.light.active) this.toggleLightController(); } },
            annoswitch: { label: 'annoswitch', type: 'toggle', toggleClass: '.openlime-lens-dashboard-annoswitch-bar', task: (event) => { } },
            down: { label: 'down', task: (event) => { } },
            next: { label: 'next', task: (event) => { } },
         },
         updateCb: null,
         updateEndCb: null
      }, options);
      Object.assign(this, options);

      this.moving = false;
      this.delay = 400;
      this.timeout = null; // Timeout for moving

      this.angleToolbar = 30.0 * (Math.PI / 180.0);

      this.container.style.display = 'block';
      // this.container.style.gridTemplateColumns = '1fr 1fr';
      // this.container.style.gridAutoRows = `${this.toolboxHeight}px`;
      // this.container.style.alignItems = "center";
      // this.container.style.justifyItems = "center";
      this.container.style.margin = '0';


      this.lensElm = Util.createSVGElement('svg', { viewBox: `0 0 100 100` });
      const circle = Util.createSVGElement('circle', { cx: 10, cy: 10, r: 50});
      circle.setAttributeNS(null, 'style', 'fill: none; stroke: blue; stroke-width: 7px;');
      this.lensElm.appendChild(circle);

      // this.lensElm = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      // this.lensElm.setAttributeNS(null, 'cx', 100);
      // this.lensElm.setAttributeNS(null, 'cy', 100);
      // this.lensElm.setAttributeNS(null, 'r', 100);
      // this.lensElm.setAttributeNS(null, 'style', 'fill: none; stroke: blue; stroke-width: 7px;');
      this.container.appendChild(this.lensElm);

      const h1 = document.createElement('div');
      h1.style = `text-align: center; color: #fff`;
      h1.classList.add('openlime-lens-dashboard-toolbox-header');
      h1.innerHTML = 'MOVE';

      const h2 = document.createElement('div');
      h2.style = `text-align: center; color: #fff`;
      h2.classList.add('openlime-lens-dashboard-toolbox-header');
      h2.innerHTML = 'INFO';

      this.toolbox1 = document.createElement('div');
      this.toolbox1.style = `position: absolute; padding: 4px; left: 0px; width: fit-content; background-color: rgb(20, 20, 20, 1.0); border-radius: 10px; gap: 8px`;
      this.toolbox1.classList.add('openlime-lens-dashboard-toolbox');
      this.container.appendChild(this.toolbox1);
      this.toolbox1.appendChild(h1);

      this.toolbox2 = document.createElement('div');
      this.toolbox2.style = `position: absolute; padding: 4px; right: 0px; width: fit-content; background-color: rgb(20, 20, 20, 1.0); border-radius: 10px; gap: 8px`;
      this.toolbox2.classList.add('openlime-lens-dashboard-toolbox');
      this.container.appendChild(this.toolbox2);
      this.toolbox2.appendChild(h2);

      this.tools1 = document.createElement('div');
      this.tools1.style = `display: flex; justify-content: center; height: ${this.toolboxHeight}px`;
      this.tools1.classList.add('openlime-lens-dashboard-toolbox-tools');
      this.toolbox1.appendChild(this.tools1);

      this.tools2 = document.createElement('div');
      this.tools2.style = `display: flex; justify-content: center; height: ${this.toolboxHeight}px`;
      this.tools2.classList.add('openlime-lens-dashboard-toolbox-tools');
      this.toolbox2.appendChild(this.tools2);

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

      for (let [name, action] of Object.entries(this.actions)) {
         action.element = Util.SVGFromString(action.svg);
         action.element.style = `height: 100%; margin: 0 5px`;
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
               if(action.active) {
                  toggleElm.style.visibility = `visible`;
               } else {
                  toggleElm.style.visibility = `hidden`;
               }
            }
            action.task(e);
            e.preventDefault();
         });
      }

      this.tools1.appendChild(this.actions.camera.element);
      this.tools1.appendChild(this.actions.light.element);
      this.tools2.appendChild(this.actions.annoswitch.element);
      this.tools2.appendChild(this.actions.down.element);
      this.tools2.appendChild(this.actions.next.element);

      // Set Camera movement active
      this.actions.camera.active = this.actions.camera.element.classList.toggle('openlime-lens-dashboard-camera-active');
      this.actions.light.active = false;

      // Enable camera, light, next buttons
      this.setActionEnabled('camera');
      this.setActionEnabled('light');
      this.setActionEnabled('annoswitch');
      this.setActionEnabled('next');
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

   toggle() {
      this.container.classList.toggle('closed');
   }

   /** @ignore */
   update(x, y, r) {
      const now = performance.now();
      let cameraT = this.viewer.camera.getCurrentTransform(now);
      const center = this.viewer.camera.sceneToCanvas(x, y, cameraT);
      const radius = r * cameraT.z;
      const sizew = 2 * radius;
      const sizeh = 2 * radius + this.borderWidth;
      const p = { x: 0, y: 0 };
      p.x = center.x - radius;
      p.y = center.y + radius;
      p.y = this.viewer.camera.viewport.h - 1 - p.y;
      this.container.style.left = `${p.x}px`;
      this.container.style.top = `${p.y}px`;
      this.container.style.width = `${sizew}px`;
      this.container.style.height = `${sizeh}px`;

      // Lens circle
      const cx = Math.round(2*radius*0.5)+1;
      const cy = Math.round(2*radius*0.5)+1;
      this.lensElm.setAttributeNS(null, 'viewBox', `0 0 ${sizew} ${sizeh}`);
      const circle = this.lensElm.querySelector('circle');
      circle.setAttributeNS(null, 'cx', cx);
      circle.setAttributeNS(null, 'cy', cy);
      circle.setAttributeNS(null, 'r', radius-7);

      // Set toolbox position
      const tbw1 = this.toolbox1.clientWidth;
      const tbh1 = this.toolbox1.clientHeight;
      const tbw2 = this.toolbox2.clientWidth;
      const tbh2 = this.toolbox2.clientHeight;
      let cbx = radius * Math.sin(this.angleToolbar);
      let cby = radius * Math.cos(this.angleToolbar);

      let bx1 = radius - cbx - tbw1 / 2;
      let by1 = radius + cby - tbh1 / 2;
      this.toolbox1.style.left = `${bx1}px`;
      this.toolbox1.style.top = `${by1}px`;

      let bx2 = radius + cbx - tbw2 / 2;
      let by2 = radius + cby - tbh2 / 2;
      this.toolbox2.style.left = `${bx2}px`;
      this.toolbox2.style.top = `${by2}px`;

            // Lens Mask
      if (this.svgElement != null) {
         // Set the full viewport for outer mask rectangle
         const viewport = this.viewer.camera.viewport;
         this.outMask.setAttribute( 'x', -viewport.w / 2);
         this.outMask.setAttribute( 'y', -viewport.h / 2);
         this.outMask.setAttribute( 'width', viewport.w);
         this.outMask.setAttribute( 'height', viewport.h);

         // Set lens parameter for inner lens
         this.inMask.setAttributeNS(null, 'cx', center.x  - viewport.w / 2);
         this.inMask.setAttributeNS(null, 'cy', -(center.y - viewport.h / 2));
         this.inMask.setAttributeNS(null, 'r', radius - this.borderWidth - 2);

         
         if (this.layerSvgAnnotation != null) {
            // Compensate the mask with the inverse of the annotation svgGroup transformation
            const inverse = true;
            const invTransfStr = this.layerSvgAnnotation.getSvgGroupTransform(cameraT, inverse);
            this.svgGroup.setAttribute("transform", invTransfStr);
         } else {
            console.log("WARNING layerSvgAnnot not set");
         }
      } 
         
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
         if (this.updateEndCb) this.updateEndCb(center.x, center.y, radius, sizew, sizeh, this.viewer.camera.viewport.w, this.viewer.camera.viewport.h);
      }, this.delay);
   }
}

export { LensDashboardNavigator }
