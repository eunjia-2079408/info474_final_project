// select svg
var svg = d3.select("#svg");

var { width, height } = document
    .getElementById("svg")
    .getBoundingClientRect();

// select the dropdown menu
var dropdown = d3.select("#city-dropdown");
// selectElement = document.querySelector('#select1')

// load the initial city data
loadCityData("./weather_data/CLT.csv");

// listen for changes to the dropdown selection
dropdown.on("change", function () {
    document.getElementById("svg").innerHTML = ""
    // get the selected value
    var selected = d3.select(this).property("value");
    // load the selected city data
    city_csv = "./weather_data/" + selected
    loadCityData(city_csv);
});

function convert(str) {
    var date = new Date(str),
        mnth = ("0" + (date.getMonth() + 1)).slice(-2),
        day = ("0" + date.getDate()).slice(-2);
    return [date.getFullYear(), mnth, day].join("-");
}

var category = 'actual_mean_temp'


function loadCityData(cityFilename) {

    // load the CSV file using d3.csv
    d3.csv(cityFilename, dataPreprocessor).then(function (dataset) {
        data = dataset
        console.log(dataset)
        // this is where the data goes
        draw(category);
    })
}


function onCategoryChanged() {
    document.getElementById("svg").innerHTML = ""
    var select = d3.select('#categorySelect').node();
    console.log(select)
    // Get current value of select element
    category = select.options[select.selectedIndex].value;
    // Update chart with the selected category of letters
    console.log(category)

    // Make 2 draw function and use the if statement to 
    // run either.
    draw(category)

}



function draw(category) {

    var dateValues = data.map(dv => ({
        date: d3.timeDay(new Date(dv.date)),
        value: Number(dv[category])
    }));

    // *** START *** //

    // getting list of year
    var years = d3.nest()
        .key(d => d.date.getUTCFullYear())
        .entries(dateValues)
        .reverse();

    var values = dateValues.map(c => c.value);
    var maxValue = d3.max(values);
    var minValue = d3.min(values);

    var cellSize = 15;
    var yearHeight = cellSize * 7;

    var group = svg.append("g");

    var calendarHeatMap = group.selectAll("g")
        .data(years)
        .join("g")
        .attr(
            "transform",
            (d, i) => `translate(50, ${yearHeight * i + cellSize * 1.5})`
        )
        .attr('class', 'heat-map')

        function colorheatmap() {
            // year label
            calendarHeatMap
                .append("text")
                .attr('class', 'year-label')
                .attr("x", -5)
                .attr("y", -30)
                .attr("text-anchor", "end")
                .attr("font-size", 16)
                .attr("font-weight", 550)
                .attr("transform", "rotate(270)")
                .text(d => d.key);
    
            var formatDay = d =>
                ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getUTCDay()];
            var countDay = d => d.getUTCDay();
            var timeWeek = d3.utcSunday;
            var formatDate = d3.utcFormat("%x");
            var colorFn = d3
                //change the color of the heat map here
                .scaleSequential(d3.interpolateOrRd)
                .domain([minValue, maxValue]);
            var format = d3.format("+.2%");
    
            // day label
            calendarHeatMap
                .append("g")
                .attr('class', 'day-label')
                .attr("text-anchor", "end")
                .selectAll("text")
                .data(d3.range(7).map(i => new Date(1995, 0, i)))
                .join("text")
                .attr("x", -5)
                .attr("y", d => (countDay(d) + 0.5) * cellSize)
                .attr("dy", "0.31em")
                .attr("font-size", 12)
                .text(formatDay);
    
            calendarHeatMap
                .append("g")
                .selectAll("rect")
                .data(d => d.values)
                .join("rect")
                .attr("width", cellSize - 1.5)
                .attr("height", cellSize - 1.5)
                .on('mouseover', toolTip.show)
                .on('mouseout', toolTip.hide)
                .attr(
                    "x",
                    (d, i) => timeWeek.count(d3.utcYear(d.date), d.date) * cellSize + 10
                )
                .attr("y", d => countDay(d.date) * cellSize + 0.5)
                .attr("fill", d => colorFn(d.value))
    
                .append("title")
                .text(d => `${formatDate(d.date)}: ${d.value.toFixed(2)}`);
    
            var legend = group
                .append("g")
                .attr('class', 'legend')
                .attr(
                    "transform",
                    `translate(10, ${years.length * yearHeight + cellSize * 4})`
                );
    
            var categoriesCount = 10
            var categories = [...Array(categoriesCount)].map((_, i) => {
                var upperBound = (maxValue / categoriesCount) * (i + 1);
                var lowerBound = (maxValue / categoriesCount) * i;
                return {
                    upperBound,
                    lowerBound,
                    color: d3.interpolateOrRd(upperBound / maxValue),
                    selected: true
                };
            });
    
            var legendWidth = 60;
    
            function toggle(legend) {
                var { lowerBound, upperBound, selected } = legend;
                legend.selected = !selected;
    
                var highlighedDates = years.map(y => ({
                    key: y.key,
                    values: y.values.filter(
                        v => v.value >= lowerBound && v.value <= upperBound
                    )
                }));
    
                calendarHeatMap.data(highlighedDates)
                    .selectAll("rect")
                    .data(d => d.values, d => d.date)
                    .transition()
                    .duration(500)
                    .attr("fill", d => (legend.selected ? colorFn(d.value) : "white"))
            }
    
            legend
                .selectAll("rect")
                .data(categories)
                .enter()
                .append("rect")
                .attr("fill", d => d.color)
                .attr("x", (d, i) => legendWidth * i)
                .attr("width", legendWidth)
                .attr("height", 15)
                .on("click", toggle);
    
            legend
                .selectAll("text")
                .data(categories)
                .join("text")
                .attr("transform", "rotate(90)")
                .attr("y", (d, i) => -legendWidth * i)
                .attr("dy", -30)
                .attr("x", 18)
                .attr("text-anchor", "start")
                .attr("font-size", 11)
                .text(d => `${d.lowerBound.toFixed(2)} - ${d.upperBound.toFixed(2)}`);
    
            legend
                .append("text")
                .attr("dy", -5)
                .attr("font-size", 14)
                .attr("text-decoration", "underline")
                .text("Click on category to select/deselect days");
    
            // *** END *** //
        }


        function colorheatmap2() {
            // year label
            calendarHeatMap
                .append("text")
                .attr('class', 'year-label')
                .attr("x", -5)
                .attr("y", -30)
                .attr("text-anchor", "end")
                .attr("font-size", 16)
                .attr("font-weight", 550)
                .attr("transform", "rotate(270)")
                .text(d => d.key);
    
            var formatDay = d =>
                ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getUTCDay()];
            var countDay = d => d.getUTCDay();
            var timeWeek = d3.utcSunday;
            var formatDate = d3.utcFormat("%x");
            var colorFn = d3
                //change the color of the heat map here
                .scaleSequential(d3.interpolatePuBu)
                .domain([minValue, maxValue]);
            var format = d3.format("+.2%");
    
            // day label
            calendarHeatMap
                .append("g")
                .attr('class', 'day-label')
                .attr("text-anchor", "end")
                .selectAll("text")
                .data(d3.range(7).map(i => new Date(1995, 0, i)))
                .join("text")
                .attr("x", -5)
                .attr("y", d => (countDay(d) + 0.5) * cellSize)
                .attr("dy", "0.31em")
                .attr("font-size", 12)
                .text(formatDay);
    
            calendarHeatMap
                .append("g")
                .selectAll("rect")
                .data(d => d.values)
                .join("rect")
                .attr("width", cellSize - 1.5)
                .attr("height", cellSize - 1.5)
                .on('mouseover', toolTip.show)
                .on('mouseout', toolTip.hide)
                .attr(
                    "x",
                    (d, i) => timeWeek.count(d3.utcYear(d.date), d.date) * cellSize + 10
                )
                .attr("y", d => countDay(d.date) * cellSize + 0.5)
                .attr("fill", d => colorFn(d.value))
    
                .append("title")
                .text(d => `${formatDate(d.date)}: ${d.value.toFixed(2)}`);
    
            var legend = group
                .append("g")
                .attr('class', 'legend')
                .attr(
                    "transform",
                    `translate(10, ${years.length * yearHeight + cellSize * 4})`
                );
    
            var categoriesCount = 10
            var categories = [...Array(categoriesCount)].map((_, i) => {
                var upperBound = (maxValue / categoriesCount) * (i + 1);
                var lowerBound = (maxValue / categoriesCount) * i;
                return {
                    upperBound,
                    lowerBound,
                    color: d3.interpolatePuBu(upperBound / maxValue),
                    selected: true
                };
            });
    
            var legendWidth = 60;
    
            function toggle(legend) {
                var { lowerBound, upperBound, selected } = legend;
                legend.selected = !selected;
    
                var highlighedDates = years.map(y => ({
                    key: y.key,
                    values: y.values.filter(
                        v => v.value >= lowerBound && v.value <= upperBound
                    )
                }));
                console.log(highlighedDates)
    
                calendarHeatMap.data(highlighedDates)
                    .selectAll("rect")
                    .data(d => d.values, d => d.date)
                    .transition()
                    .duration(500)
                    .attr("fill", d => (legend.selected ? colorFn(d.value) : "white"))
            }
    
    
            legend
                .selectAll("rect")
                .data(categories)
                .enter()
                .append("rect")
                .attr("fill", d => d.color)
                .attr("x", (d, i) => legendWidth * i)
                .attr("width", legendWidth)
                .attr("height", 15)
                .on("click", toggle);
    
            legend
                .selectAll("text")
                .data(categories)
                .join("text")
                .attr("transform", "rotate(90)")
                .attr("y", (d, i) => -legendWidth * i)
                .attr("dy", -30)
                .attr("x", 18)
                .attr("text-anchor", "start")
                .attr("font-size", 11)
                .text(d => `${d.lowerBound.toFixed(2)} - ${d.upperBound.toFixed(2)}`);
    
            legend
                .append("text")
                .attr("dy", -5)
                .attr("font-size", 14)
                .attr("text-decoration", "underline")
                .text("Click on category to select/deselect days");
    
            // *** END *** //
        }

    if (category == 'actual_mean_temp') {
        colorheatmap();
    } else {
        colorheatmap2();
    }

};























// 3.1) Instantiate the d3-tip object
var toolTip = d3.tip()
    .attr("class", "d3-tip")
    .offset([-12, 0])
    .html(function (d) {
        return ("<h5>" + "Date: " + convert(d['date']) + "</br>"
            + "Value: " + d['value'] + "</h5>");
    });
// need to .call() the toolTip on the svg to register it
svg.call(toolTip);



function dataPreprocessor(row) {
    return {
        'date': row['date'],
        'actual_mean_temp': +row['actual_mean_temp'],
        'actual_min_temp': +row['actual_min_temp'],
        'actual_max_temp': +row['actual_max_temp'],
        'average_min_temp': +row['average_min_temp'],
        'average_max_temp': +row['average_max_temp'],
        'record_min_temp': +row['record_min_temp'],
        'record_max_temp': +row['record_max_temp'],
        'record_min_temp_year': +row['record_min_temp_year'],
        'record_max_temp_year': +row['record_max_temp_year'],
        'actual_precipitation': +row['actual_precipitation'],
        'average_precipitation': +row['average_precipitation'],
        'record_precipitation': +row['record_precipitation']
    };
}