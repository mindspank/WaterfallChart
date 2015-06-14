define(["jquery", "text!./waterfall.css", "./d3.min"], function($, css) {
    'use strict';
    $("<style>").html(css).appendTo("head");
    return {
        initialProperties: {
            version: 1.0,
            qHyperCubeDef: {
                qDimensions: [],
                qMeasures: [],
                qInitialDataFetch: [{
                    qWidth: 2,
                    qHeight: 500
                }]
            }
        },
        definition: {
            type: "items",
            component: "accordion",
            items: {
                dimensions: {
                    uses: "dimensions",
                    min: 1,
                    max: 1
                },
                measures: {
                    uses: "measures",
                    min: 1,
                    max: 1
                },
                sorting: {
                    uses: "sorting"
                },
                settings: {
                    uses: "settings",
                    items: {
                        colors: {
                            type: "items",
                            label: "Colors",
                            items: {
                                positive: {
                                    ref: "qDef.positivecolor",
                                    label: "Positive",
                                    type: "string",
                                    expression: "optional",
                                    defaultValue: "#4477aa"
                                },
                                negative: {
                                    ref: "qDef.negativecolor",
                                    label: "Negative",
                                    type: "string",
                                    expression: "optional",
                                    defaultValue: "#f93f17"
                                },
                                total: {
                                    ref: "qDef.totalcolor",
                                    label: "Total",
                                    type: "string",
                                    expression: "optional",
                                    defaultValue: "#545352"
                                }
                            }
                        },
                        offset: {
                            type: "items",
                            label: "Offset first bar",
                            items: {
                                useoffset: {
                                    label: "Offset",
                                    type: "boolean",
                                    component: "switch",
                                    options: [{
                                        label: "Disabled",
                                        value: false
                                    }, {
                                        label: "Enabled",
                                        value: true
                                    }],
                                    ref: "qDef.useoffset",
                                    defaultValue: false
                                },
                                offsetby: {
                                    type: "number",
                                    expression: "optional",
                                    ref: "qDef.offsetby",
                                    show: function(d) {
                                        return d.qDef.useoffset;
                                    }
                                }
                            }
                        },
                        total: {
                            type: "items",
                            label: "Show Total",
                            items: {
                                total: {
                                    type: "string",
                                    component: "switch",
                                    label: "Show Totals",
                                    ref: "qDef.total",
                                    options: [{
                                        value: true,
                                        label: "Show"
                                    }, {
                                        value: false,
                                        label: "Hide"
                                    }],
                                    defaultValue: true,
                                },
                                totalLabel: {
                                    ref: "qDef.totalLabel",
                                    label: "Label",
                                    type: "string",
                                    expression: "optional",
                                    defaultValue: "Total",
                                    show: function(d) {
                                        return d.qDef.total;
                                    }
                                },
                                reverse: {
                                    type: "string",
                                    component: "switch",
                                    label: "Reverse placement",
                                    ref: "qDef.reverse",
                                    options: [{
                                        value: true,
                                        label: "True"
                                    }, {
                                        value: false,
                                        label: "False"
                                    }],
                                    defaultValue: false,
                                    show: function(d) {
                                        return d.qDef.total;
                                    }
                                }
                            }
                        },
                        data: {
                            type: "items",
                            label: "Datapoints",
                            items: {
                                abbr: {
                                    type: "string",
                                    component: "switch",
                                    label: "Abbreviate numbers",
                                    ref: "qDef.abbr",
                                    options: [{
                                        value: true,
                                        label: "Yes"
                                    }, {
                                        value: false,
                                        label: "No"
                                    }],
                                    defaultValue: true,
                                },
                                datapoints: {
                                    ref: "qDef.dataPoints",
                                    label: "Datapoints",
                                    component: "dropdown",
                                    options: [{
                                        value: "no",
                                        label: "No datapoints"
                                    }, {
                                        value: "exp",
                                        label: "Expression value"
                                    }, {
                                        value: "cum", //hoho
                                        label: "Cumulative"
                                    }],
                                    type: "string",
                                    defaultValue: "exp"
                                }
                            }
                        },
                        axis: {
                            type: "items",
                            label: "Axis",
                            items: {
                                xaxis: {
                                    type: "string",
                                    component: "switch",
                                    label: "X-Axis",
                                    ref: "qDef.xaxis",
                                    options: [{
                                        value: true,
                                        label: "Show"
                                    }, {
                                        value: false,
                                        label: "Hide"
                                    }],
                                    defaultValue: true
                                },
                                yaxis: {
                                    type: "string",
                                    component: "switch",
                                    label: "Y-Axis",
                                    ref: "qDef.yaxis",
                                    options: [{
                                        value: true,
                                        label: "Show"
                                    }, {
                                        value: false,
                                        label: "Hide"
                                    }],
                                    defaultValue: true
                                }

                            }
                        }
                    }
                }
            }
        },
        snapshot: {
            canTakeSnapshot: true
        },
        paint: function($element, layout) {
            $element.empty();

            //Can't be bothered to bind().
            var that = this;

            var _f = layout.qHyperCube.qDimensionInfo[0].qGroupFieldDefs[0];
            var calculatedDimension = (_f.toLocaleLowerCase().indexOf('=valueloop') == 0 || _f.toLocaleLowerCase().indexOf('=valuelist') == 0)

            var datapoint = layout.qDef.dataPoints;

            var useTotal = layout.qDef.total;
            var reverse = layout.qDef.reverse;

            var useOffest = layout.qDef.useoffset;
            var offsetBy = (useOffest && layout.qDef.offsetby != 'NaN') ? layout.qDef.offsetby : 0;

            var useX = layout.qDef.xaxis;
            var useY = layout.qDef.yaxis;

            var format = layout.qDef.abbr;
            var formatNumber = d3.format(".4s");

            //TODO: Move to properties;
            var invert = false;

            var margins = {
                top: 20,
                right: 55,
                left: 55,
                bottom: 55
            };

            //Filter dimensions and map for cumulative sums
            var data = layout.qHyperCube.qDataPages[0].qMatrix
                .filter(function(d) {
                    return d[0].qText !== undefined;
                })
                .map(function(d, i, arr) {
                    return {
                        label: d[0].qText,
                        value: d[1].qNum,
                        element: d[0].qElemNumber,
                        sum: (i === 0) ? d[1].qNum : arr.map(function(d) {
                            return d[1].qNum;
                        }).reduce(function(prev, curr, idx) {
                            if (idx > i) return prev;
                            return prev + curr
                        })
                    }
                });


            var totalsum = data.map(function(d) {
                return d.value;
            }).reduce(function(prev, curr) {
               return prev + curr;
            });

            //Add totals
            if (useTotal) {
                if (reverse) {
                    data.unshift({
                        label: 'Total',
                        value: totalsum,
                        element: 'total',
                        sum: totalsum
                    })
                } else {
                    data.push({
                        label: 'Total',
                        value: totalsum,
                        element: 'total',
                        sum: totalsum
                    })
                }
            };

            var width = $element.width() - margins.left - margins.right;
            var height = $element.height() - margins.top - margins.bottom;

            var max = d3.max(data, function(d) {
                    return d.sum
                }) * 1.05;

            var min = 0;

            var yScale = d3.scale.linear()
                .domain([min, max])
                .range([min, height]);

            var y = d3.scale.linear()
                .domain([min, max])
                .range([height, min]);

            var yScaleOffset = d3.scale.linear()
                .domain([0, max])
                .range([offsetBy, height]);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickFormat(d3.format("s"));

            var xScale = d3.scale.ordinal()
                .rangeRoundBands([0, width])
                .domain(data.map(function(d) {
                    return d.label
                }));

            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom");

            var svg = d3.select($element.get(0)).selectAll('svg')
                .data([null])
                .enter()
                .append('svg')
                .attr('width', width + margins.left + margins.right)
                .attr('height', height + margins.top + margins.bottom)
                .append("g")
                .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

            svg.selectAll("rect")
                .data(data)
                .enter()
                .append("rect")
                .attr('id', function(d) {
                    return d.element
                })
                .attr("class", function(d) {
                    return d.label === "Total" ? "total" : (d.value < 0) ? "negative" : "positive";
                })
                .attr("x", function(d) {
                    return xScale(d.label);
                })
                .attr("y", function(d, i) {
                    if(invert) {
                        if(d.label === 'Total') {
                            return (d.value < 0) ? height - yScale(d.sum - d.value) : height - yScale(d.sum);
                        } else if ( useTotal && reverse ? i == 1 : i == 0) {
                            return height - yScale(totalsum);
                        } else {
                            return height - yScale(totalsum) + yScale(data[i-1].sum);
                        }
                    } else {
                        return (d.value < 0) ? height - yScale(d.sum - d.value) : height - yScale(d.sum);
                    };
                })
                .attr("width", xScale.rangeBand())
                .attr("height", function(d,i) {
                    if(useOffest && i === 0) {
                        return yScale(Math.abs(d.value)) - yScale(offsetBy);
                    }
                    return yScale(Math.abs(d.value));
                })
                .style('fill', function(d) {
                    if (d.label === layout.qDef.totalLabel) return layout.qDef.totalcolor;
                    var color = (d.value < 0) ? layout.qDef.negativecolor : layout.qDef.positivecolor;
                    return color;
                });

                if(!calculatedDimension) {
                    svg.selectAll('rect').style('cursor', 'pointer').on('click', handleClick);
                }


            var barLabels = svg.append("g")
                .selectAll('text')
                .data(data)
                .enter()
                .append("text")
                .attr("x", function(d) {
                    return xScale(d.label) + (xScale.rangeBand() / 2);
                })
                .attr("y", function(d, i) {
                    if(invert) {
                        if(d.label === 'Total') {
                            return (d.value < 0) ? height - yScale(d.sum - d.value) : height - yScale(d.sum);
                        } else if ( useTotal && reverse ? i == 1 : i == 0) {
                            return height - yScale(totalsum);
                        } else {
                            return height - yScale(totalsum) + yScale(data[i-1].sum);
                        }
                    } else {
                        return (d.value < 0) ? height - yScale(d.sum - d.value) : height - yScale(d.sum);
                    };
                })
                .attr('dy', -5)
                .attr('text-anchor', 'middle')
                .text(function(d) {
                    var val = '';
                    if (datapoint == 'exp') {
                        val = format ? formatNumber(d.value) : d.value;
                    } else if (datapoint === 'cum') {
                        val = format ? formatNumber(d.sum) : d.sum;
                    };
                    return val;
                });

            if (useY) {
                svg.append("g").attr("class", "axis").call(yAxis);
            };
            if (useX) {
                svg.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);
            };

            function handleClick(d, i) {
                //Break if in edit mode.
                if(that.$scope.$parent.$parent.editmode) return;

                //Can't select the total bar.
                if (d.element == 'total') return;

                that.selectValues(0, [d.element], true);

                if (that.selectedArrays[0].length === 0) {
                    svg.selectAll('rect').style('opacity', 1);
                    return;
                };

                svg.selectAll('rect').style('opacity', 0.4);

                svg.selectAll('rect').each(function() {
                    var e = d3.select(this);
                    var id = e.attr('id');
                    that.selectedArrays[0].forEach(function(d) {
                        if (id == d) {
                            return e.style('opacity', 1);
                        }
                    })
                })
            };

        }
    };
});