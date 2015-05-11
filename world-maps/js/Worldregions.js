function Worldregions(_width, _height, _projection, _divId, _root, callBack)
{
	var _this = this;
	var worldHigh;
	var worldLow;
	var countries;

	var zoom = d3.behavior.zoom()
	.scaleExtent([1, 18])
	.on("zoomstart", function() {
		console.log("zoom start")
		countries.data(worldLow);
		redraw()
		
	})
	.on("zoom", function() {
		move();
	})
	.on("zoomend", function() {
		console.log("zoom end")
		countries.data(worldHigh);
		redraw()

	});

	var projection = d3.geo.robinson()
	.rotate([0,0])
	.translate([_width/2, _height/2])
	.scale(_width / 2 / Math.PI);

	var path = d3.geo.path()
	.projection(projection);

	var svg = d3.select("#" + _divId)
	.append("svg")
	.attr("width", _width)
	.attr("height", _height)
	.call(zoom)
	.append("g")
	.attr("class","world");

	queue()
	.defer(d3.json, _root + "gm_world_raw.topojson")
	.defer(d3.json, _root + "gu_world.topojson")
	.defer(d3.json, _root + 'gm_disputed_areas.topojson') // geojson points
	.await(function(error, low, world, disputed)
	{
		worldHigh = topojson.feature(world, world.objects.gu_world).features;
		worldLow = topojson.feature(low, low.objects.gm_world).features;
		svg.selectAll('.country')
		.data(worldHigh)
		.enter()
		.insert("path", ".world")
		.attr("class", function(d){return "country " + d.properties.adm0_a3})
		.attr("d", path);

		countries = d3.selectAll('.country');

		svg
    	.datum(topojson.mesh(world, world.objects.gu_world, function(a,b){return a !== b}))//this is the way to avoid border lines at the sea
    	.insert("path", ".world")
    	.attr("class", "boundary")
    	.attr("d", path)

    	svg.selectAll(".border")
    	.data(topojson.feature(disputed, disputed.objects.gm_disputed_areas).features)
    	.enter()
    	.insert("path", ".world")
    	.attr("class", "border")
    	.attr("d", path);

    	callBack();
    });


    function redraw()
    {
    	countries.attr("d", path);
    }

	function move()
	{

		var t = d3.event.translate;
		var s = d3.event.scale; 
		zscale = s;
		var h = _height/4;

		t[0] = Math.min(
			(_width/_height)  * (s - 1), 
			Math.max( _width * (1 - s), t[0] )
			);

		t[1] = Math.min(
			h * (s - 1) + h * s, 
			Math.max(_height  * (1 - s) - h * s, t[1])
			);

		zoom.translate(t);
		svg.attr("transform", "translate(" + t + ")scale(" + s + ")");

		d3.selectAll(".boundary").style("stroke-width", 1 / s);
		d3.selectAll(".border").style("stroke-width", 1 / s);

	}




}