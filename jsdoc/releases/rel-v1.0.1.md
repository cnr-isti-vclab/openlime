## OpenLIME Rel v1.0.1

**OpenLIME** (Open Layered IMage Explorer) is an open-source library for the efficient display of high resolution relightable images. 
For this purpose, **OpenLIME** uses optimized functions that exploit the capabilities of the latest graphics cards.

**OpenLIME** helps people to quickly display high resolution images in a web browser. 
The idea behind **OpenLIME** is to allow the developer to create a "visualization graph": data (images) are inputs to a network of interconnected blocks (called *layers*), and the outputs of the layers can then be visualized on the canvas. The task of the layers is to perform processing on the data they receive as input.

**OpenLIME** supports all image formats used by the most popular web browsers (*jpg*, *png*, *gif*, etc...) as well as the most common multi-resolution image formats (*deepzoom*, *zoomify*, *IIIF*, *google maps*), which are more suitable for web transmission.

For the average developer **OpenLIME** provides a set of ready-to-use layers that allow you to quickly create a visualization network.
Openlime is designed to be highly configurable, so it will be easy for the experienced developer to build their own custom layers. 

The ready-to-use layers are of different types, ranging from those for reading images (in various formats), to the more complex ones for reading multi-channel data (such as, for example, RTI or BRDF) or for the combination of more layers or for visualization through lenses.

In addition, the **OpenLIME** library also provides a class to easily create a highly customizable user interface. The interface has been designed to work well with both desktop monitors and multitouch systems. 

**OpenLIME** comes with documentation for its use (work in progress) and a convenient set of examples that can be used both to understand how the library works and as a starting point for programming with **OpenLIME** itself.

### What's new
#### Example of Annotation Editor (client + server). 
This relese adds a complete example of an Annotation Editor (examples/annotation-editor).
Two simple db servers are also provided (php and express) with their instructions.
#### Easing transitions
This release adds easing transitions to interpolate camera movements.
#### Migrating to Webpack 5.x
The development environment now uses Webpack 5.x in order to improve build time and reduce chunk sizes.
#### Bug fixing
This release fixes some bugs related to handling of click events on LayerSvgAnnotation and problems saving SVG objects on Gooogle Chrome browser.
