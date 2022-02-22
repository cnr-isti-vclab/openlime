The **OpenLIME framework** is designed to make image viewers easy to use, even for inexperienced users. A very simple interface allows you to create visualisation tools without having to deal with the complexity of the application.
Here is how to get a complete viewer in a few lines of code!
```
const lime = new OpenLIME('#openlime', { background: 'black', canvas: { preserveDrawingBuffer: true} });
const layer0 = new Layer({layout: 'deepzoom1px', type: 'image',  url: './img/duck.dzi'});
lime.canvas.addLayer('img', layer0);
const ui = new UIBasic(lime);
lime.draw();
```
### Useful videos
[![Tutorial](http://img.youtube.com/vi/h33Srr5J9nY/0.jpg)](http://www.youtube.com/watch?v=h33Srr5J9nY "JavaScript ES6 Arrow Functions Tutorial")
