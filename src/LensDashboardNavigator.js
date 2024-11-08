import { Util } from "./Util"
import { LensDashboard } from "./LensDashboard"

/*
 * @fileoverview
 * LensDashboardNavigator module provides an enhanced lens dashboard with navigation controls and tools.
 * Extends the base LensDashboard with additional UI elements for camera control, lighting, and annotation navigation.
 */

/**
 * LensDashboardNavigator class creates an interactive lens dashboard with navigation controls.
 * Provides:
 * - Camera movement control
 * - Light direction control
 * - Annotation switching and navigation
 * - Toolbar UI elements positioned around the lens
 * @extends LensDashboard
 */
class LensDashboardNavigator extends LensDashboard {
   /**
    * Creates a new LensDashboardNavigator instance.
    * @param {Viewer} viewer - The OpenLIME viewer instance
    * @param {Object} [options] - Configuration options
    * @param {number} [options.toolboxHeight=22] - Height of the toolbox UI elements in pixels
    * @param {number} [options.angleToolbar=30] - Angle of toolbar position in degrees
    * @param {Object} [options.actions] - Configuration for toolbar actions
    * @param {Object} [options.actions.camera] - Camera control action
    * @param {string} options.actions.camera.label - Action identifier
    * @param {Function} options.actions.camera.task - Callback for camera action
    * @param {Object} [options.actions.light] - Light control action
    * @param {string} options.actions.light.label - Action identifier
    * @param {Function} options.actions.light.task - Callback for light action
    * @param {Object} [options.actions.annoswitch] - Annotation toggle action
    * @param {string} options.actions.annoswitch.label - Action identifier
    * @param {string} options.actions.annoswitch.type - Action type ('toggle')
    * @param {string} options.actions.annoswitch.toggleClass - CSS class for toggle element
    * @param {Function} options.actions.annoswitch.task - Callback for annotation toggle
    * @param {Object} [options.actions.prev] - Previous annotation action
    * @param {string} options.actions.prev.label - Action identifier
    * @param {Function} options.actions.prev.task - Callback for previous action
    * @param {Object} [options.actions.down] - Download annotation action
    * @param {string} options.actions.down.label - Action identifier
    * @param {Function} options.actions.down.task - Callback for download action
    * @param {Object} [options.actions.next] - Next annotation action
    * @param {string} options.actions.next.label - Action identifier
    * @param {Function} options.actions.next.task - Callback for next action
    * @param {Function} [options.updateCb] - Callback fired during lens updates
    * @param {Function} [options.updateEndCb] - Callback fired when lens movement ends
    */
   constructor(viewer, options) {
      super(viewer, options);
      options = Object.assign({
         toolboxHeight: 22,
         actions: {
            camera: { label: 'camera', cb_task: (() => { }), task: (event) => { if (!this.actions.camera.active) this.toggleLightController(); this.actions.camera.cb_task() } },
            light: { label: 'light', cb_task: (() => { }), task: (event) => { if (!this.actions.light.active) this.toggleLightController(); this.actions.light.cb_task() } },
            annoswitch: { label: 'annoswitch', type: 'toggle', toggleClass: '.openlime-lens-dashboard-annoswitch-bar', task: (event) => { } },
            prev: { label: 'prev', task: (event) => { } },
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
      this.noupdate = false;

      this.angleToolbar = 30.0 * (Math.PI / 180.0);

      this.container.style.display = 'block';
      this.container.style.margin = '0';

      const h1 = document.createElement('div');
      h1.style = `text-align: center; color: #fff`;
      h1.classList.add('openlime-lens-dashboard-toolbox-header');
      h1.innerHTML = 'MOVE';

      const h2 = document.createElement('div');
      h2.style = `text-align: center; color: #fff`;
      h2.classList.add('openlime-lens-dashboard-toolbox-header');
      h2.innerHTML = 'INFO';

      this.toolbox1 = document.createElement('div');
      this.toolbox1.style = `z-index: 10; position: absolute; padding: 4px; left: 0px; width: fit-content; background-color: rgb(20, 20, 20, 1.0); border-radius: 10px; gap: 8px`;
      this.toolbox1.classList.add('openlime-lens-dashboard-toolbox');
      this.container.appendChild(this.toolbox1);
      this.toolbox1.appendChild(h1);

      this.toolbox2 = document.createElement('div');
      this.toolbox2.style = `z-index: 10; position: absolute; padding: 4px; right: 0px; width: fit-content; background-color: rgb(20, 20, 20, 1.0); border-radius: 10px; gap: 8px`;
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

      this.actions.camera.svg = `<!-- Created with Inkscape (http://www.inkscape.org/) -->

<svg
   viewBox="0 0 83.319054 83.319054"
   version="1.1"
   id="svg2495"
   xml:space="preserve"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg"><defs
     id="defs2492" /><path
     d="m 83.319059,41.66005 c 0,23.007824 -18.651718,41.659533 -41.659532,41.659533 C 18.651716,83.319583 -4.9557762e-6,64.667874 -4.9557762e-6,41.66005 -4.9557762e-6,18.651185 18.651716,-5.2882463e-4 41.659527,-5.2882463e-4 64.667341,-5.2882463e-4 83.319059,18.651185 83.319059,41.66005 Z"
     style="fill:#fbfbfb;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0.352778"
     id="path74"
     class="openlime-lens-dashboard-button-bkg" /><g
     id="g1"
     class="openlime-lens-dashboard-camera"><path
       stroke="#000000"
       stroke-width="9.03222"
       d="M 41.659527,5.5306402 V 32.627305 m 0,18.064443 v 27.096665"
       id="path1"
       style="fill:none" /><path
       stroke="#000000"
       stroke-linecap="round"
       stroke-linejoin="round"
       stroke-width="9.03222"
       d="M 30.36925,16.820917 41.659527,5.5306402 52.949804,16.820917 M 30.36925,66.498136 41.659527,77.788413 52.949804,66.498136 M 16.820917,30.36925 5.5306402,41.659527 16.820917,52.949804 M 66.498136,30.36925 77.788413,41.659527 66.498136,52.949804 M 12.304806,41.659527 h 58.709441"
       id="path2"
       style="fill:none" /></g></svg>`;

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
  <path
     d="m 83.319055,41.660582 c 0,23.00782 -18.651715,41.659529 -41.659525,41.659529 C 18.65172,83.320111 -8.5009768e-7,64.668402 -8.5009768e-7,41.660582 -8.5009768e-7,18.651717 18.65172,3.1357422e-6 41.65953,3.1357422e-6 64.66734,3.1357422e-6 83.319055,18.651717 83.319055,41.660582 Z"
     style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0.352778"
     id="path74"
     class="openlime-lens-dashboard-button-bkg" />
  <g
     id="g1"
     transform="matrix(1.4106801,0,0,1.4106801,-164.24813,-100.38311)"
     class="openlime-lens-dashboard-light">
    <path
       d="m 137.44618,117.65204 c 0.139,1.31022 5.28885,5.23911 7.37659,5.43772 2.08632,0.19826 1.80798,0.31679 3.29353,-0.15981 1.48413,-0.47554 6.21488,-3.25367 6.44772,-3.72921 0.59266,-1.21814 0.97296,-2.46098 0.46319,-3.21487 -0.51117,-0.7567 -1.39206,-0.19861 -2.31916,0.0801 -0.92745,0.27693 -4.87009,2.02282 -6.16973,2.4197 -1.01952,0.3115 -3.24661,-0.19862 -3.24661,-0.19862 0,0 11.29312,-3.73168 11.7355,-4.56247 0.46426,-0.87383 0.0924,-2.46133 -0.97437,-2.65959 -0.67945,-0.127 -15.44637,4.72228 -15.81714,5.31777 -0.37218,0.59549 -0.78952,1.26929 -0.78952,1.26929 z"
       style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:0.352778"
       id="path90"/>
    <path
       d="m 138.37505,106.50074 c 0,0 -0.76236,-0.18874 -1.29964,0.0801 -0.53728,0.26882 -0.27834,3.09492 -0.27834,3.09492 l 5.75204,-0.0783 c 0,0 -4.96393,1.26894 -5.42678,2.22109 -0.46461,0.9525 0.58985,2.39395 1.53106,2.61973 0.75353,0.18203 16.15475,-4.7364 16.51282,-5.15938 0.3115,-0.36653 0.51012,-2.38125 0.18627,-2.69804 -0.32527,-0.31715 -1.62349,-0.27834 -1.62349,-0.27834 0,0 -0.51117,0.0399 -0.0469,-1.38783 0.46461,-1.4291 5.38128,-7.103886 6.58707,-10.675761 1.1617,-3.440642 0.4893,-7.948436 -0.83503,-10.118725 -1.39876,-2.294466 -3.38596,-3.770489 -6.12281,-4.841169 -2.74778,-1.076325 -7.82849,-1.683808 -11.87591,-0.556683 -4.03048,1.124655 -7.16844,3.170766 -8.9983,5.873397 -1.64289,2.426405 -1.57797,7.302147 -1.02129,9.206441 0.55668,1.906058 6.2163,8.96973 6.77298,10.39742 0.55668,1.4291 0.18627,2.30117 0.18627,2.30117 z"
       style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:0.352778"
       id="path96"/>
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

      for (let [name, action] of Object.entries(this.actions)) {
         action.element = Util.SVGFromString(action.svg);
         action.element.style = `height: 100%; margin: 0 5px`;
         action.element.classList.add('openlime-lens-dashboard-button');
         if (action.type == 'toggle') {
            const toggleElm = action.element.querySelector(action.toggleClass);
            toggleElm.style.visibility = `hidden`;
            action.active = false;
         }
         action.element.addEventListener('pointerdown', (e) => {
            if (action.type == 'toggle') {
               action.active = !action.active;
               const toggleElm = action.element.querySelector(action.toggleClass);
               if (action.active) {
                  toggleElm.style.visibility = `visible`;
               } else {
                  toggleElm.style.visibility = `hidden`;
               }
               this.noupdate = true;
            }
            action.task(e);
            e.preventDefault();
         });
      }

      this.tools1.appendChild(this.actions.camera.element);
      this.tools1.appendChild(this.actions.light.element);
      this.tools2.appendChild(this.actions.annoswitch.element);
      this.tools2.appendChild(this.actions.prev.element);
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

   /**
    * Retrieves an action configuration by its label.
    * @param {string} label - The action label to find
    * @returns {Object|null} The action configuration object or null if not found
    * @private
    */
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

   /**
    * Enables or disables a specific action button.
    * @param {string} label - The action label to modify
    * @param {boolean} [enable=true] - Whether to enable or disable the action
    */
   setActionEnabled(label, enable = true) {
      const action = this.getAction(label);
      if (action) {
         action.element.classList.toggle('enabled', enable);
      }
   }

   /**
    * Toggles between camera and light control modes.
    * When light control is active, modifies controller behavior for light direction adjustment.
    * @private
    */
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

   /**
    * Updates the dashboard position and UI elements.
    * @private
    * @param {number} x - Center X coordinate in scene space
    * @param {number} y - Center Y coordinate in scene space
    * @param {number} r - Lens radius in scene space
    */
   update(x, y, r) {
      if (this.noupdate) {
         this.noupdate = false;
         return;
      }
      super.update(x, y, r);
      const center = {
         x: this.lensBox.x,
         y: this.lensBox.y
      }
      const radius = this.lensBox.r;
      const sizew = this.lensBox.w;
      const sizeh = this.lensBox.h;

      // Set toolbox position
      const tbw1 = this.toolbox1.clientWidth;
      const tbh1 = this.toolbox1.clientHeight;
      const tbw2 = this.toolbox2.clientWidth;
      const tbh2 = this.toolbox2.clientHeight;
      let cbx = radius * Math.sin(this.angleToolbar);
      let cby = radius * Math.cos(this.angleToolbar);

      let bx1 = this.containerSpace + radius - cbx - tbw1 / 2;
      let by1 = this.containerSpace + radius + cby - tbh1 / 2;
      this.toolbox1.style.left = `${bx1}px`;
      this.toolbox1.style.top = `${by1}px`;

      let bx2 = this.containerSpace + radius + cbx - tbw2 / 2;
      let by2 = this.containerSpace + radius + cby - tbh2 / 2;
      this.toolbox2.style.left = `${bx2}px`;
      this.toolbox2.style.top = `${by2}px`;

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
