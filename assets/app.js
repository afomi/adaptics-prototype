var activeObject;

var defaultZoom = 12;
var mymap = L.map('mapid', {
  zoomControl: false,
  crs: L.CRS.Simple
}).setView([51.505, 0], defaultZoom);
mymap.scrollWheelZoom.disable();
mymap.dragging.disable();

// var cardsLayer = mymap.addLayer(new L.Layer());
var cardsLayerGroup = L.layerGroup().addTo(mymap);

mymap.createPane("overlayPane");

overlayPane = {
  "orange stickies": cardsLayerGroup,
  "yellow stickies": cardsLayerGroup,
};
layerControl = L.control.layers(null, overlayPane, { position: 'topleft' });
layerControl.addTo(mymap);

function resetZoom() {
  mymap.setZoom(defaultZoom);
}

// takes a L.LatLng
// returns Bounds [L.LatLng, L.LatLng]
//   with an offset based on visual pixels
//   with an offset based on visual pixels
function dynamicBounds(originLatLng) {
  var originPoint = mymap.project(originLatLng, mymap.getZoom());
  var targetPoint = L.point(originPoint.x + cardDimensionsAsPx, originPoint.y + cardDimensionsAsPx);
  var targetLatLng = mymap.unproject(targetPoint, mymap.getZoom());
  var bounds = L.latLngBounds(originLatLng, targetLatLng);
  return bounds;
}

// Create an red rectangle in the center of the map
function drawCenterPoint() {
  var center = mymap.getCenter();
  var bounds = dynamicBounds(center);
  var box = L.rectangle(bounds, {color: "#ff0000", weight: 1}).addTo(mymap);
}

var popup = L.popup();
function displayPopup(latlng) {
  popup
    .setLatLng(latlng)
    .setContent("displayPopup at " + latlng.toString())
    .openOn(mymap);
}

mymap.on('resize', function(e) {
  mapHeight = $("#mapid").height();
  mapWidth = $("#mapid").width();
});

mymap.on("mousedown", function(e) {
  clickHandler(e);
});

// Translate LatLng to Point
// Adjust point by 1/2 the size of the Stickie
// Recast as Latlng
function clickHandler(e) {
  var point = e.layerPoint;
  var halfCardWidth = cardDimensionsAsPx / 2;
  var adjustedLatLng = mymap.layerPointToLatLng(L.point(point.x - halfCardWidth, point.y - halfCardWidth));

  var bounds = dynamicBounds(adjustedLatLng);
  drawRectangle(bounds);
}

// Draw a line between this rectangle and Box1
function drawLineToBox1(box) {
  // draw a polyline between the centers of box1 and box
  var latlngs = [
    box.getCenter(),
    box1.getCenter(),
  ];
  var polyline = L.polyline(latlngs, {color: 'black'}).addTo(mymap);

  // NEEDS TO BE SPLIT OUT
  var myIcon = L.divIcon({className: 'my-div-icon', html: "EFFORT=" + box.attributes.effort + " VALUE=" + box.attributes.businessValue + " DAYSOLD= " + box.attributes.daysOld});
  // you can set .my-div-icon styles in CSS
  L.marker(box.getCenter(), {icon: myIcon}).addTo(mymap);
}

function drawRectangle(bounds) {
  // create an orange rectangle
  var box = L.rectangle(bounds, {color: "#ff7800", weight: 1}).addTo(mymap);
  console.log("drawRectangle", bounds);
  cardsLayerGroup.addLayer(box);
  // debugger;
  // L.DomUtil.setPosition(box.getElement(), box.getCenter());
  box.attributes = {};
  // free form
  box.attributes.freeFormX = (mymap.project(box.getCenter()).x, mymap.getZoom()); // not pixel X (map X)
  box.attributes.freeFormY = (mymap.project(box.getCenter()).y, mymap.getZoom());
  box.attributes.location = box.getCenter();
  // 2X2 attributes (x, y axes)
  box.attributes.effort =  parseInt(Math.random() * 90);
  box.attributes.businessValue = parseInt(Math.random() * 90);
  // Aging (horizontally)
  box.attributes.daysOld = parseInt(Math.random() * 365);
  // Sort by Story Size (vertically)
  box.attributes.storySize = parseInt(Math.random() * 10);
  box.attributes.storySize = parseFloat(Math.random() * 10).toFixed(2);

  var draggable = new L.Draggable(box.getElement(), box.getElement());
  draggable.enable();

  draggable.on("dragend", function (e) {
    // on mouse up, capture the xy of the screen
    // move the dragged rectangle to the xy spot on the screen
    debugger;
    console.log("DRAG END", e);
  });

  // Prevent the event from Propagating, so Map Click handler doesn't also fire
  box.on("mousedown", function(e) {
    L.DomEvent.stopPropagation(e);
  });

  // box.on("mouseup", function (e) {
  // 	// find the point i clicked
  // 	// translate that to px
  // 	// e.target.attributes.location = e.target.getCenter();
  // 	// e.target.attributes.location = e.target.getCenter();
  // 	// debugger;
  // 	// e.target.
  // 	// var point = mymap.layerPointToLatLng(L.point(e.layerPoint.x, e.layerPoint.y));
  //
  // 	L.DomUtil.setPosition(e.target.getElement(), L.point(e.target.attributes.freeFormX, e.target.attributes.freeFormY));
  // 	var point = mymap.layerPointToLatLng(L.point(e.layerPoint.x - 17, e.layerPoint.y - 17));
  // 	tweenPoly(e.target, point)
  // 	console.log("MOUSEUP", e);
  // });

  box.on("mouseover", function(e) {
    popup
      .setLatLng(L.latLng(e.target.getBounds().getNorth(), e.target.getCenter().lng))
      .setContent("Days Old= " + e.target.attributes.daysOld + " Story Size= " + e.target.attributes.storySize + " Effort= " + e.target.attributes.effort + " BusinessValue= " + e.target.attributes.businessValue)
      .openOn(mymap);
  });

  box.on("mouseout", function(e) {
    mymap.closePopup();
  });

  // drawLineToBox1(box);
}

// Set the Space type...

// TRIGGER 2X2
// TRIGGER SIZE SORT
// TRIGGER AGE SORT
// TRIGGER FREE FORM

// re-draw each Rectangle based on map coords
function drawFreeForm() {
  resetZoom();
  mymap.eachLayer(function(layer) {
    if(!layer.attributes || (layer.attributes && !layer.attributes.location)) {
      return true;
    }
    // use the coordinates from the FreeFrom `Space`
    tweenPoly(layer, layer.attributes.location);
  })
}

function draw2x2Background() {
  mymap.closePopup();

  var northPoint = L.latLng(mymap.getBounds().getNorth(), mymap.getCenter().lng);
  var southPoint = L.latLng(mymap.getBounds().getSouth(), mymap.getCenter().lng);
  var westPoint = L.latLng(mymap.getCenter().lat, mymap.getBounds().getWest());
  var eastPoint = L.latLng(mymap.getCenter().lat, mymap.getBounds().getEast());
  var latlngs = [
    northPoint,
    southPoint,
  ];
  var latlngs2 = [
    westPoint,
    eastPoint,
  ];
  var xAxis = L.polyline(latlngs, {color: 'green'}).addTo(mymap);
  var yAxis = L.polyline(latlngs2, {color: 'green'}).addTo(mymap);

  // containerPointToLayerPoint
  // L.DomUtil.setPosition().
}

// re-draw each Rectangle based on Effort/Value functional coordinates
function draw2x2() {
  mymap.closePopup();
  draw2x2Background();

  mymap.eachLayer(function(layer) {
    if(!layer.attributes) {
      return true;
    }
    var xAxis = d3.scaleLinear().domain([0, 100]).range([0 + cardOffsetPx, mapWidth - cardOffsetPx]);
    var yAxis = d3.scaleLinear().domain([100, 0]).range([0 + cardOffsetPx, mapHeight - cardOffsetPx]);
    var x = xAxis(layer.attributes.effort);
    var y = yAxis(layer.attributes.businessValue);
    var point = mymap.layerPointToLatLng(L.point(x, y));
    tweenPoly(layer, point);
  })
}

// re-draw each Rectangle based on daysOld
function drawAgeSort() {
  mymap.closePopup();
  mymap.eachLayer(function(layer) {
    if(!layer.attributes || layer.attributes && !layer.attributes.daysOld) {
      return true;
    }
    var yAxis = d3.scaleLinear().domain([0, 365]).range([0 + cardOffsetPx, mapHeight - cardOffsetPx]);
    var x = mymap.latLngToLayerPoint(mymap.getCenter()).x;
    var y = yAxis(layer.attributes.daysOld);
    var halfCardWidth = cardDimensionsAsPx / 2;
    var point = mymap.layerPointToLatLng(L.point(x - halfCardWidth, y - halfCardWidth));
    tweenPoly(layer, point);
  })
}

// re-draw each Rectangle based on storySize
function drawSizeSort() {
  mymap.closePopup();
  var xAxis = d3.scaleLinear().domain([0, 10]).range([0 + cardOffsetPx, mapWidth - cardOffsetPx]);

  mymap.eachLayer(function(layer) {
    if(!layer.attributes) {
      return true;
    }

    var storySize = layer.attributes.storySize;
    var x = xAxis(storySize);
    var y = mymap.latLngToLayerPoint(mymap.getCenter()).y;
    var halfCardWidth = cardDimensionsAsPx / 2;
    var point = mymap.layerPointToLatLng(L.point(x - halfCardWidth, y - halfCardWidth));
    tweenPoly(layer, point);
  })
}

function tweenPoly(layer, targetLatLng) {
  var x = mymap.latLngToLayerPoint(layer.getCenter()).x;
  var y = mymap.latLngToLayerPoint(layer.getCenter()).y;

  var targetX = mymap.latLngToLayerPoint(targetLatLng).x;
  var targetY = mymap.latLngToLayerPoint(targetLatLng).y;

  var coords = { x: x, y: y }; // Start at (0, 0)
  var tween = new TWEEN.Tween(coords) // Create a new tween that modifies 'coords'.
    .to({ x: targetX, y: targetY }, 1000)
    .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
    .onUpdate(function() { // Called after tween.js updates 'coords'.
        var x = coords.x;
        var y = coords.y;
        var point = mymap.layerPointToLatLng(L.point(x, y));
        var bounds = dynamicBounds(point);
        layer.setBounds(bounds);
    })
    .start();
}

// DUMMY UP SOME OBJECTS
// for(var i=0; i < 10; i++) {
// 	var bounds = [[54.559322, -5.767822 + Math.random() * 5], [56.1210604, -3.021240 +  Math.random() * 5]];
// 	drawRectangle(bounds);
// }

// On Page Load
$(function() {
  // Add button behaviors
  $("#draw2x2").on("click", function() {
    draw2x2();
  });
  $("#drawAgeSort").on("click", function() {
    drawAgeSort();
  });
  $("#drawSizeSort").on("click", function() {
    drawSizeSort();
  });
  $("#drawFreeForm").on("click", function() {
    drawFreeForm();
  });

  mapWidth = $("#mapid").width();
  mapHeight = $("#mapid").height();

  function animate(time) {
      requestAnimationFrame(animate);
      TWEEN.update(time);
  }
  requestAnimationFrame(animate);
});

// Globals
var mapWidth;
var mapHeight;
var cardDimensionsAsPx = 30;
var cardOffsetPx = cardDimensionsAsPx + 4;
