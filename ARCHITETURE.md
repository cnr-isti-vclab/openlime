HUGE PROBLEMS:

1) viewBox defines the location and size of the annotation layer, and it is not stored in the annotations jsonLD!!!


TODO: for now annotations

1) Create  LayerUI class that manages the UI.
But for annotations it must be kept in sync (add an annotation for example
it needs to be added to the list, also in case of selection.



Annotation

getBBoxFromElements() //compute the bbox from the svg selector!
toJsonLd()              //export the annotation
fromJsonLd(entry)


AnnotationLayer

Skeleton class used for visualization of annotations.

* viewBox:          //define layer bounding box.
* annotations: {},  //set of annotations
* selected: Set     //set of selected annotations.
* hoverable: false, //display info about annotation on mousehover.
* annotationsListEntry //needed to interact with UI... not exactly a good 
design

Methods:

* loadAnnotations(url)  //expect a json containing the annotation data.
* newAnnotation()       //REMOVE: not really needed
* addAnnotation(annotation, selected);
* createAnnotationEntry() //returns html for annotationb list
* createAnnotationsList()  //initialize the annotation list.
* clearSelected
* setSelected(id, on = true)

* annotationsEntry()    //MOVE to layer: return UI entry for the layer or to some UI class.

* getAnnotationById




SvgAnnotationLayer

Manages SVG annotations.
Canvas has an overlayElement (a div) and each svgannotationlayer attaches a shadow node, root which is an svg element,
inside there is a svg group element (used to manage the translations). (is it really needed?)


* svgElement
* svgGroup   //this is 'needed' for transformation and scale.

//when adding annotati0n svg elements in svggroup we use []

* setVisible                 //overrides
* clearSelected              //overrides
* setSelected(id, on = true) //overrides
* loadSVG(url);
* createSVGElement() //initialize the svg element and group

//parameters. save
delete
edit -> either url or function(layer, annotation) (return string to abort, with error message).




//MOVE TO EDITOR
* saveAnnotation
* deleteAnnotation
* editAnnotation


viewBox: defines the size of the annotation area, and it is NEEDED to align it with other layers.
	Problem: you need to specify for the constructor if the annotations are not loaded through an svg.


SvgAnnotationEditor

Edit svg annotations.
When a new annotation is modified, we need to draw it, then it is converted to text and saved to the annotation.




Problems: 
1) ui should be separated by annotationlayer, or at least customizable....
   in particular annotationsEntry() is not exacly easily customizable, not a template...