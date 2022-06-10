import { LensDashboard } from "./LensDashboard";

class LensDashboardNavigator extends LensDashboard {
	/**
 	* Manages creation and update of a lens dashboard.
 	* An object literal with Layer `options` can be specified.
	* This class instatiates an optional element of {@link LayerLens}
 	* @param {Object} options An object literal with Lensdashboard parameters.
 	* @param {number} options.borderWidth=30 The extra border thickness (in pixels) around the square including the lens.
 	*/
    constructor(viewer, options) {
        super(viewer, options);
        options = Object.assign({
            toolboxHeight: 25,
            actions: {
                camera: { title: 'Camera', clickable: true, display: true, task: (event) => { if (!this.actions.camera.active) this.toggleLightController(); } },
                light: { title: 'Light', clickable: true, display: true, task: (event) => { if (!this.actions.light.active) this.toggleLightController(); } },
                label: { title: 'Label', clickable: false, display: true, task: (event) => { } },
                down: { title: 'Down', clickable: true, display: true, task: (event) => { } },
                next: { title: 'Next', clickable: true, display: true, task: (event) => { } },
            },
        }, options);
        Object.assign(this, options);

        this.moving = false;
        this.pos = [0, 0];
        this.delay = 1000;
        this.timeout = null; // Timeout for moving

        this.container.style.flexDirection = "column-reverse";
        this.container.style.alignItems = "center";

        this.toolbox = document.createElement('div');
        this.toolbox.style = `display: flex; padding: 4px; justify-content: center; height: ${this.toolboxHeight}px;
        background-color: rgb(20, 20, 20, 1.0); border-radius: 10px; gap: 8px`;
		this.toolbox.classList.add('openlime-lens-dashboard-toolbox');		
		this.container.appendChild(this.toolbox);

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

        this.actions.light.svg =`<?xml version="1.0" encoding="UTF-8" standalone="no"?>
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

        this.actions.label.svg =`<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <!-- Created with Inkscape (http://www.inkscape.org/) -->
        
        <svg
           viewBox="0 0 22.007614 80.026932"
           version="1.1"
           id="svg7411"
           xmlns="http://www.w3.org/2000/svg"
           xmlns:svg="http://www.w3.org/2000/svg">
          <defs
             id="defs7408" />
          <g
             id="layer1"
             transform="translate(-5.356358,-56.889074)">
            <g
               id="g2481"
               transform="matrix(0.35277777,0,0,0.35277777,-268.6194,-106.5571)"
               class="openlime-lens-dashboard-label">
              <path
                 d="m 837.234,540.332 -57.132,7.176 -2.036,9.476 11.204,2.082 c 7.308,1.727 8.769,4.383 7.175,11.692 l -18.379,86.496 c -4.828,22.367 2.614,32.906 20.153,32.906 13.593,0 29.363,-6.289 36.539,-14.879 l 2.168,-10.363 c -5.004,4.383 -12.27,6.156 -17.094,6.156 -6.867,0 -9.348,-4.828 -7.574,-13.289 z"
                 style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none"
                 id="path108" />
              <path
                 d="m 839.008,488.246 c 0,13.774 -11.164,24.938 -24.934,24.938 -13.773,0 -24.937,-11.164 -24.937,-24.938 0,-13.769 11.164,-24.934 24.937,-24.934 13.77,0 24.934,11.165 24.934,24.934 z"
                 style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none"
                 id="path110" />
            </g>
          </g>
        </svg>`;

        this.actions.down.svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <!-- Created with Inkscape (http://www.inkscape.org/) -->
        
        <svg
           viewBox="0 0 83.320465 83.320465"
           version="1.1"
           id="svg9049"
           xmlns="http://www.w3.org/2000/svg"
           xmlns:svg="http://www.w3.org/2000/svg">
          <defs
             id="defs9046" />
          <g
             id="layer1"
             transform="translate(-64.051635,-126.97536)">
            <g
               id="g2485"
               transform="matrix(0.35277777,0,0,0.35277777,-244.81765,-40.328086)"
               class="openlime-lens-dashboard-down">
              <path class="openlime-lens-dashboard-button-bkg"
                 d="m 1111.719,592.34 c 0,65.219 -52.871,118.09 -118.09,118.09 -65.223,0 -118.094,-52.871 -118.094,-118.09 0,-65.223 52.871,-118.094 118.094,-118.094 65.219,0 118.09,52.871 118.09,118.094 z"
                 style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none"
                 id="path46" />
              <path
                 d="m 1012.227,509.07 h -37.172 c -0.028,17.813 0,64.668 0,64.668 0,0 -40.332,0 -60.282,0.055 v 37.148 c 19.95,-0.027 60.282,-0.027 60.282,-0.027 0,0 0,46.801 -0.028,64.691 h 37.172 c 0.028,-17.89 0.028,-64.691 0.028,-64.691 0,0 40.304,0 60.253,0 v -37.176 c -19.949,0 -60.253,0 -60.253,0 0,0 -0.051,-46.851 0,-64.668"
                 style="fill:#020202;fill-opacity:1;fill-rule:nonzero;stroke:none"
                 id="path48" />
            </g>
          </g>
        </svg>`;

        this.actions.next.svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <!-- Created with Inkscape (http://www.inkscape.org/) -->
        
        <svg
           viewBox="0 0 83.319054 83.320114"
           version="1.1"
           id="svg11415"
           xmlns="http://www.w3.org/2000/svg"
           xmlns:svg="http://www.w3.org/2000/svg">
          <defs
             id="defs11412" />
          <g
             id="layer1"
             transform="translate(-49.789728,-119.49443)">
            <g
               id="g2490"
               transform="matrix(0.35277777,0,0,0.35277777,-349.02413,-45.919887)"
               class="openlime-lens-dashboard-next">
              <path class="openlime-lens-dashboard-button-bkg"
                 d="m 1366.676,586.984 c 0,65.219 -52.871,118.09 -118.09,118.09 -65.219,0 -118.09,-52.871 -118.09,-118.09 0,-65.222 52.871,-118.093 118.09,-118.093 65.219,0 118.09,52.871 118.09,118.093 z"
                 style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none"
                 id="path68" />
              <path
                 d="m 1193.945,519.488 60.985,58.539 c 5.722,5.649 5.988,14.586 0,20.493 l -60.985,57.355 c -3.418,3.418 -13.66,3.418 -17.078,-6.828 V 522.684 c 3.418,-10.024 13.66,-6.61 17.078,-3.196 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path70" />
              <path
                 d="m 1305.789,515.266 h -18.781 c -8.043,0 -14.516,6.769 -14.516,15.183 v 113.067 c 0,8.414 6.473,15.187 14.516,15.187 h 18.781 c 8.043,0 14.516,-6.773 14.516,-15.187 V 530.449 c 0,-8.414 -6.473,-15.183 -14.516,-15.183 z"
                 style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none"
                 id="path72" />
            </g>
          </g>
        </svg>`;

        for (let [name, action] of Object.entries(this.actions)) {
            action.element = LensDashboardNavigator.svgFromString(action.svg);
            action.element.style = `height: 100%; margin: 0 5px`;
            if(action.clickable) {
                action.element.style.pointerEvents = 'auto';
                action.element.style.cursor = 'pointer';
            }
            action.element.classList.add('openlime-lens-dashboard-button');
            this.toolbox.appendChild(action.element);

            action.element.addEventListener('click', (e) => {
				action.task(e);
				e.preventDefault();
			});
        }

        // Set Camera movement active
		this.actions.camera.active = this.actions.camera.element.classList.toggle('openlime-lens-dashboard-camera-active');
        this.actions.light.active = false;

        // Set left margin to label
        this.actions.label.element.style.marginLeft = '40px';
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


    lightCb = (e) => {
        this.lightButtonActive = !this.lightButtonActive;
        this.lightButton.classList.toggle('active'); // If active then light up
        if(this.lightButtonTask) this.lightButtonTask(e);
    }

    upCb = (e) => {
        if(this.upButtonTask) this.upButtonTask(e);
    }

    leftCb = (e) => {
        if(this.leftButtonTask) this.leftButtonTask(e);
    }

    playCb = (e) => {
        this.playButtonActive = !this.playButtonActive;
        this.playButton.classList.toggle('active'); // If active then show 'pause'
        if(this.playButtonTask) this.playButtonTask(e, this.playButtonActive);
    }

    rightCb = (e) => {
        if(this.rightButtonTask) this.rightButtonTask(e);
    }

    downCb = (e) => {
        if(this.downButtonTask) this.downButtonTask(e);
    }

    hide() {
        this.container.classList.toggle('closed');
    }

    show() {
        this.container.classList.toggle('closed');
    }

	/** @ignore */
    update(x, y, r) {
		const now = performance.now();
		let cameraT = this.viewer.camera.getCurrentTransform(now);
		const p = this.viewer.camera.sceneToCanvas(x, y, cameraT);
		const size = r * cameraT.z;
		const sizew = 2 * size;
        const sizeh = 2 * size + this.borderWidth;
		p.x -= size;
		p.y += size;
		p.y = this.viewer.camera.viewport.h - p.y;
		this.container.style.left = `${p.x}px`;
		this.container.style.top = `${p.y}px`;
		this.container.style.width = `${sizew}px`;
		this.container.style.height = `${sizeh}px`;
        if( x == this.pos[0] && y == this.pos[1]) return;
        if(!this.moving) {
            this.hide();
            this.moving = true;
        }
        if(this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout( () => {
            this.show();
            this.moving = false;
        },
        this.delay
        );
	}
}

export {LensDashboardNavigator}
