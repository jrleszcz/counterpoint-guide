var d3 = require('d3')

//Width and height
var w = 600;
var h = 250;

var dataset = [ { key: 0, value: 5 },   //dataset is now an array of objects.
      { key: 1, value: 10 },    //Each object has a 'key' and a 'value'.
      { key: 2, value: 13 },
      { key: 3, value: 19 },
      { key: 4, value: 21 },
      { key: 5, value: 25 },
      { key: 6, value: 22 },
      { key: 7, value: 18 },
      { key: 8, value: 15 },
      { key: 9, value: 13 },
      { key: 10, value: 11 },
      { key: 11, value: 12 },
      { key: 12, value: 15 },
      { key: 13, value: 20 },
      { key: 14, value: 18 },
      { key: 15, value: 17 },
      { key: 16, value: 16 },
      { key: 17, value: 18 },
      { key: 18, value: 23 },
      { key: 19, value: 25 } ];

var xScale = d3.scale.ordinal()
      .domain(d3.range(dataset.length))
      .rangeRoundBands([0, w], 0.05);
var yScale = d3.scale.linear()
      .domain([0, d3.max(dataset, function(d) { return d.value; })])
      .range([0, h]);

//Define key function, to be used when binding data
var key = function(d) {
return d.key;
};

//Create SVG element
var svg = d3.select("body")
    .append("svg")
    .attr("width", w)
    .attr("height", h);
//Create bars
svg.selectAll("rect")
 .data(dataset, key)    //Bind data with custom key function
 .enter()
 .append("rect")
 .attr("x", function(d, i) {
    return xScale(i);
 })
 .attr("y", function(d) {
    return h - yScale(d.value);
 })
 .attr("width", xScale.rangeBand())
 .attr("height", function(d) {
    return yScale(d.value);
 })
 .attr("fill", function(d) {
  return "rgb(0, 0, " + (d.value * 10) + ")";
 });
//Create labels
svg.selectAll("text")
 .data(dataset, key)    //Bind data with custom key function
 .enter()
 .append("text")
 .text(function(d) {
    return d.value;
 })
 .attr("text-anchor", "middle")
 .attr("x", function(d, i) {
    return xScale(i) + xScale.rangeBand() / 2;
 })
 .attr("y", function(d) {
    return h - yScale(d.value) + 14;
 })
 .attr("font-family", "sans-serif")
 .attr("font-size", "11px")
 .attr("fill", "white");
//On click, update with new data
d3.select("p")
.on("click", function() {
  //Remove one value from dataset
  dataset.shift();

  //Update scale domains
  xScale.domain(d3.range(dataset.length));
  yScale.domain([0, d3.max(dataset, function(d) { return d.value; })]);
  //Select…
  var bars = svg.selectAll("rect")
    .data(dataset, key);    //Bind data with custom key function

  //Enter…
  bars.enter()
    .append("rect")
    .attr("x", w)
    .attr("y", function(d) {
      return h - yScale(d.value);
    })
    .attr("width", xScale.rangeBand())
    .attr("height", function(d) {
      return yScale(d.value);
    })
    .attr("fill", function(d) {
      return "rgb(0, 0, " + (d.value * 10) + ")";
    });
  //Update…
  bars.transition()
    .duration(500)
    .attr("x", function(d, i) {
      return xScale(i);
    })
    .attr("y", function(d) {
      return h - yScale(d.value);
    })
    .attr("width", xScale.rangeBand())
    .attr("height", function(d) {
      return yScale(d.value);
    });
  //Exit…
  bars.exit()
    .transition()
    .duration(500)
    .attr("x", -xScale.rangeBand())  // <-- Exit stage left
    .remove();
  //Update all labels
  //
  //Exercise: Modify this code to remove the correct label each time!
  //
  svg.selectAll("text")
     .data(dataset, key)    //Bind data with custom key function
     .transition()
     .duration(500)
     .text(function(d) {
        return d.value;
     })
     .attr("x", function(d, i) {
      return xScale(i) + xScale.rangeBand() / 2;
     })
     .attr("y", function(d) {
      return h - yScale(d.value) + 14;
     });
});