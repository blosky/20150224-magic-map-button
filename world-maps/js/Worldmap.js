function Worldmap(_width, _height, _initScale, _projection, _divId, _root, callBack)
{
	var _this = this;
	this.width = _width;
	this.height = _height;
	this.initScale = _initScale;
	this.projections = [];

	var div = d3.select("#"+_divId);
	var ratio = window.devicePixelRatio || 1;
	var origin_point = [0,0];
	var oposite_point = [0,0];
	var countries;
	var borders;
	var conflict_borders;
	var conflict_bordersbg;
	var border;
    var cities;
    var pinpoints;
    var countryname;
    var city;
    var circles;
    var root = _root;
    var cont = 0;
    var countryNames = []

    this.projections['Mercator'] = d3.geo.mercator();
    this.projections['Robinson'] = d3.geo.robinson();

    var projection = this.projections[_projection]
    .rotate([0, 0])
    .translate([_this.width / 2, _this.height / 2])
    .scale(this.width / 2 / Math.PI)
    .clipExtent([[-ratio, -ratio], [this.width + ratio, this.height + ratio]]);

    var path = d3.geo.path()
    .projection(projection);

    var zoom = d3.geo.zoom()
    .projection(projection)
    .scaleExtent([this.initScale, Infinity])
    .on("zoomstart", function() {
      countries.data(worldLow);
  })
    .on("zoom", function() {
      redraw();
  })
    .on("zoomend", function() {
      countries.data(_this.worldHigh);
      redraw();
  });

    var drag = d3.behavior.drag()
    .on("dragstart", function(){d3.event.sourceEvent.stopPropagation();})
    .on("drag", dragmove);

    var svg = div.append("svg")
    .attr("width", this.width)
    .attr("height", this.height)
    .call(zoom);

    this.worldHigh;
    var worldLow;
    var world = svg.append("g").attr("class", "world");

    queue()
    .defer(d3.json, root + "gm_world_raw.topojson")
    .defer(d3.json, root + "gu_world.topojson")
    .defer(d3.json, root + 'gm_disputed_areas.topojson') // geojson points
    .defer(d3.json, root + 'populated_places.topojson') 
    .await(function(error, low, high, disputed, populated)
    {

    	worldLow = topojson.feature(low, low.objects.gm_world).features;
    	_this.worldHigh = topojson.feature(high, high.objects.gu_world).features;
    	border = topojson.feature(disputed, disputed.objects.gm_disputed_areas).features;
    	city = topojson.feature(populated, populated.objects.populated_places).features;

    	world.selectAll(".country")
    	.data(_this.worldHigh)
    	.enter()
    	.insert("path", ".world")
    	.attr("class", function(d){countryNames[d.properties.adm0_a3]=d.properties.name;return "country " + d.properties.adm0_a3})
    	.attr("d", path)
    	.on("dblclick",_this.clicked);

    	countries = d3.selectAll(".country");

    	world
    	.datum(topojson.mesh(high, high.objects.gu_world, function(a,b){return a !== b}))
    	.insert("path", ".world")
    	.attr("class", "boundary")
    	.attr("d", path)

    	borders = d3.selectAll(".boundary")

    	world.selectAll(".borderbg")
    	.data(border)
    	.enter()
    	.insert("path", ".world")
    	.attr("class", "borderbg")
    	.attr("d", path);

    	world.selectAll(".border")
    	.data(border)
    	.enter()
    	.insert("path", ".world")
    	.attr("class", "border")
    	.attr("d", path);

    	conflict_borders = d3.selectAll(".border");
    	conflict_bordersbg = d3.selectAll(".borderbg");

    	circles = d3.selectAll(".circle");

    	callBack();
    });

function zoomBounds(projection, o)
{
	var centroid = d3.geo.centroid(o);
	var clip = projection.clipExtent();

	projection
	.clipExtent(null)
	.scale(1)
	.translate([0, 0]);

	var b = path.bounds(o),
	k = Math.min(Infinity, .45 / Math.max(Math.max(Math.abs(b[1][0]), Math.abs(b[0][0])) / _this.width, Math.max(Math.abs(b[1][1]), Math.abs(b[0][1])) / _this.height));

	projection
	.clipExtent(clip)
	.scale(k)
	.translate([_this.width / 2, _this.height / 2]);

	zoom.scale(k);
}

function redraw()
{
 countries.attr("d", path);
 borders.attr("d", path);
 conflict_borders.attr("d", path);
 conflict_bordersbg.attr("d", path);

     if(cities)
     {
        //console.log(origin_point)
        cities.attr("transform", function(d,i) {return "translate(" + projection(d.geometry.coordinates) + ")"; })
        pinpoints.attr("transform", function(d) {return "translate(" + [projection(d.geometry.coordinates)[0] - 8, projection(d.geometry.coordinates)[1]] + ")"; })
        //countryname.attr("transform", function(d){return "translate(" + projection(d3.geo.centroid(d)) + ")"})
        arrangeLabels();
      }
}

function arrangeLabels() {
  var move = 1;
  while(move > 0) {
    move = 0;
    svg.selectAll(".place-label")
    .each(function() {
     var that = this,
     a = this.getBoundingClientRect();
     svg.selectAll(".place-label")
     .each(function() {
      if(this != that) {
        var b = this.getBoundingClientRect();
        if((Math.abs(a.left - b.left) * 2 < (a.width + b.width)) &&
           (Math.abs(a.top - b.top) * 2 < (a.height + b.height))) {
                  // overlap, move labels
              var dx = (Math.max(0, a.right - b.left) +
               Math.min(0, a.left - b.right)) * 0.01,
              dy = (Math.max(0, a.bottom - b.top) +
               Math.min(0, a.top - b.bottom)) * 0.02,
              tt = d3.transform(d3.select(this).attr("transform")),
              to = d3.transform(d3.select(that).attr("transform"));
              move += Math.abs(dx) + Math.abs(dy);

              to.translate = [ to.translate[0] + dx, to.translate[1] + dy ];
              tt.translate = [ tt.translate[0] - dx, tt.translate[1] - dy ];
              d3.select(this).attr("transform", "translate(" + tt.translate + ")");
              d3.select(that).attr("transform", "translate(" + to.translate + ")");
              a = this.getBoundingClientRect();
          }
      }
  });
});
}
}

function typeOf(value)
 {
     return Object.prototype.toString.call(value).slice(8, -1);
 }

 function dragmove(d)
 {
    var text = d3.select(this);
    var posX = 0;
    if(this.getBBox().x >= 0) posX = d3.event.x - this.getBBox().width/2;
    else posX = d3.event.x + this.getBBox().width/2;
    text.attr("transform", function(d){return "translate(" + [posX, d3.event.y] + ")"});
}



d3.select("svg").on("mousedown.log", function() {
  //console.log(projection.invert(d3.mouse(this)));
});
    //---------------------------------------------------------------------------------------------
    //PUBLIC METHODS
    //---------------------------------------------------------------------------------------------



    this.clicked = function(d)
    {

         console.log(d);

        if(cities)d3.selectAll(".place-label").remove();
        if(cities)d3.selectAll(".square").remove();
        if(cities)d3.selectAll(".countryname").remove();
        origin_point = d3.geo.centroid(d);
        oposite_point= [-origin_point[0], -origin_point[1]];

        //console.log(origin_point,oposite_point)



        projection.rotate(oposite_point);  
        zoomBounds(projection, d)

        var selected = d.properties.adm0_a3;
        d3.select(".selected").classed("selected", false);
        d3.select("." + selected).classed("selected", true);

        var selected_cities = city.filter(function(d) { return d.properties.adm0_a3 == selected });
        selected_cities = selected_cities.sort(function(a, b){return b.properties.pop_max - a.properties.pop_max}).filter(function(d,i){return i<3 || d.properties.featurecla == "Admin-0 capital";});

        d3.select(".world")
        .append("text")
        .attr("class", "countryname")
        .text(d.properties.name )
        .attr("transform","translate(" + projection(origin_point) + ")")
        .call(drag)

        world.selectAll(".cities")
        .data(selected_cities)
        .enter().insert("text", ".world")
        .attr("class", function(d){return 'place-label ' + d.properties.featurecla})
        .text(function(d) { return d.properties.name; })
        .attr("transform", function(d) {return "translate(" + projection(d.geometry.coordinates) + ")"; })
        .attr("x", function(d) { console.log(d.geometry.coordinates[0], projection([d.geometry.coordinates[0], 0]));return d.geometry.coordinates[0] > -1 ? 3 : -10; })
        .attr("y", 8)
        .style("text-anchor", function(d) { return d.geometry.coordinates[0] > -1 ? "start" : "end"; })
        .on("dblclick", function(d){this.remove()})
        .call(drag);

        world.selectAll(".pinpoints")
        .data(selected_cities)
        .enter()
        .insert("rect", ".world")
        .attr("class", function(d){return d.properties.featurecla=='Admin-0 capital' ?  "square" : "square rounded"})
        .attr("width", function(d){return d.properties.featurecla=='Admin-0 capital' ? 9 : 7; })
        .attr("height", function(d){return d.properties.featurecla=='Admin-0 capital' ? 9 : 7; })
        .attr("rx", function(d){return d.properties.featurecla=='Admin-0 capital' ?  0 : 20})
        .attr("ry", function(d){return d.properties.featurecla=='Admin-0 capital' ?  0 : 20})
        .on("click", function(d){this.remove()});

        cities = d3.selectAll(".place-label");
        pinpoints = d3.selectAll(".square");
        countryname = d3.select(".countryname");

        redraw();
        //arrangeLabels();
    }

    this.reset = function()
    {
    	oposite_point= [0,0];
    	zoom.scale(this.initScale);
        if(cities)d3.selectAll(".place-label").remove();  
        if(cities)d3.select(".countryname").remove();  
        d3.selectAll(".square").remove();  
        d3.select(".selected").classed("selected", false)

        projection.rotate([0, 0]);
        projection.translate([_this.width / 2, _this.height / 2]);
        projection.scale(this.initScale);

        redraw();
    }

    this.resetPorjection = function(string)
    {
    	projection = this.projections[string];
    	projection.rotate(origin_point);
    	projection.scale(zoom.scale())

    	path.projection(projection);
    	zoom.projection(projection);

    	projection.translate([_this.width / 2, _this.height / 2]);

    	redraw();
    }

    this.zoomClick = function(direction)
    {
    	var factor = 0.2;
    	var target_zoom = 1;
    	var center = [_this.width / 2 ,  _this.height / 2];

    	d3.event.preventDefault();
    	target_zoom = zoom.scale() * (1 + factor * direction);

    	if(direction == 1)cont++;
    	else cont--;

    	if(target_zoom < zoom.scaleExtent()[0] || target_zoom > zoom.scaleExtent()[1]) return false;

    	var iScale = d3.interpolate(zoom.scale(), target_zoom);
    	if(cont<=0)cont=0;
    	var scale = iScale(cont);
    	if(scale<=this.initScale)scale = this.initScale;


    	projection.scale(iScale(cont))
    	zoom.scale(scale);
    	redraw();
    }

    this.resetView = function()
    {
     projection
     .translate([_this.width / 2, _this.height / 2])
     .clipExtent([[-ratio, -ratio], [_this.width + ratio, _this.height + ratio]]);

     svg
     .attr("width", _this.width)
     .attr("height",_this.height);

     redraw();
    }

 this.setWidth = function(w)
 {
     if (typeOf(w) === "Number" && w >= 100)
         _this.width = w;
 }


 this.setHeight = function(h)
 {
     if (typeOf(h) === "Number" && h >= 100)
         _this.height = h;
 }

 

}