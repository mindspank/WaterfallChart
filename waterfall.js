define(["jquery", "text!./waterfall.css", "./d3.min"], function ($, css) {
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
                        inverse: {
                            label: "Inverse bars",
                            ref: "waterfall.inverse",
                            type: "boolean",
                            defaultValue: false,
                            component: "switch",
                            options: [{
                                "label": "Disabled",
                                value: false
                            }, {
                                    label: "Enabled",
                                    value: true
                                }]
                        },
                        colors: {
                            type: "items",
                            label: "Colors",
                            items: {
                                positive: {
                                    ref: "waterfall.positivecolor",
                                    label: "Positive",
                                    type: "string",
                                    expression: "optional",
                                    defaultValue: "rgb(68,119,170)"
                                },
                                negative: {
                                    ref: "waterfall.negativecolor",
                                    label: "Negative",
                                    type: "string",
                                    expression: "optional",
                                    defaultValue: "rgb(249,63,23)"
                                },
                                total: {
                                    ref: "waterfall.totalcolor",
                                    label: "Color",
                                    type: "string",
                                    expression: "optional",
                                    defaultValue: "rgb(123,122,120)"
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
                                    ref: "waterfall.useoffset",
                                    defaultValue: false
                                },
                                offsetby: {
                                    type: "number",
                                    expression: "optional",
                                    ref: "waterfall.offsetby",
                                    show: function (d) {
                                        return d.waterfall.useoffset;
                                    }
                                }
                            }
                        },
                        total: {
                            type: "items",
                            label: "Show total bar",
                            items: {
                                total: {
                                    type: "string",
                                    component: "switch",
                                    label: "Enable Totals",
                                    ref: "waterfall.total",
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
                                    ref: "waterfall.totalLabel",
                                    label: "Label",
                                    type: "string",
                                    expression: "optional",
                                    defaultValue: "Total",
                                    show: function (d) {
                                        return d.waterfall.total;
                                    }
                                },
                                reverse: {
                                    type: "string",
                                    component: "switch",
                                    label: "Reverse placement",
                                    ref: "waterfall.reverse",
                                    options: [{
                                        value: true,
                                        label: "True"
                                    }, {
                                            value: false,
                                            label: "False"
                                        }],
                                    defaultValue: false,
                                    show: function (d) {
                                        return d.waterfall.total;
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
                                    ref: "waterfall.abbr",
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
                                    ref: "waterfall.dataPoints",
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
                                    ref: "waterfall.xaxis",
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
                                    ref: "waterfall.yaxis",
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
        paint: function ($element, layout) {
            $element.empty();
            //Can't be bothered to bind().
            var that = this;
            
            var maxGlyph = layout.qHyperCube.qDimensionInfo[0].qApprMaxGlyphCount < 5 ? 5 : layout.qHyperCube.qDimensionInfo[0].qApprMaxGlyphCount;
            var maxLabel = maxGlyph * 9;
            var rotateLabels = false;

            var _f = layout.qHyperCube.qDimensionInfo[0].qGroupFieldDefs[0];
            var calculatedDimension = (_f.toLocaleLowerCase().indexOf('=valueloop') == 0 || _f.toLocaleLowerCase().indexOf('=valuelist') == 0)

            var datapoint = layout.waterfall.dataPoints;

            var useTotal = layout.waterfall.total;
            var reverse = layout.waterfall.reverse;

            var useOffest = layout.waterfall.useoffset;
            var offsetBy = (useOffest && layout.waterfall.offsetby != 'NaN') ? layout.waterfall.offsetby : 0;

            var useX = layout.waterfall.xaxis;
            var useY = layout.waterfall.yaxis;

            var format = layout.waterfall.abbr;
            var formatNumber = d3.format(".4s");

            var invert = layout.waterfall.inverse;

            var margins = {
                top: 20,
                right: 55,
                left: 55,
                bottom: 55
            };

            //Filter dimensions and map for cumulative sums
            var data = layout.qHyperCube.qDataPages[0].qMatrix
                .filter(function (d) {
                    return d[0].qText !== undefined;
                })
                .map(function (d, i, arr) {
                    return {
                        label: d[0].qText,
                        value: d[1].qNum,
                        element: d[0].qElemNumber,
                        sum: (i === 0) ? d[1].qNum : arr.map(function (d) {
                            return d[1].qNum;
                        }).reduce(function (prev, curr, idx) {
                            if (idx > i) return prev;
                            return prev + curr
                        })
                    }
                });


            var totalsum = data.map(function (d) {
                return d.value;
            }).reduce(function (prev, curr) {
                return prev + curr;
            });

            //Add totals
            if (useTotal) {
                if (reverse) {
                    data.unshift({
                        label: layout.waterfall.totalLabel,
                        value: totalsum,
                        element: 'total',
                        sum: totalsum
                    })
                } else {
                    data.push({
                        label: layout.waterfall.totalLabel,
                        value: totalsum,
                        element: 'total',
                        sum: totalsum
                    })
                }
            };

            var width = $element.width() - margins.left - margins.right;

            var max = d3.max(data, function (d) {
                return d.sum
            }) * 1.05;

            var min = 0;
            
            var xScale = d3.scale.ordinal()
                .rangeRoundBands([0, width])
                .domain(data.map(function (d) {
                    return d.label
                }));

            if( maxLabel > 55 ) {
               margins.bottom = maxLabel;
               rotateLabels = true;
            }
            
            if( maxLabel < xScale.rangeBand() ) {
              margins.bottom = 55;
              rotateLabels = false;
            };
            
            var height = $element.height() - margins.top - margins.bottom;
                
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
                .attr('id', function (d) {
                    return d.element
                })
                .attr("class", function (d) {
                    return d.label === layout.waterfall.totalLabel ? "total" : (d.value < 0) ? "negative" : "positive";
                })
                .attr("x", function (d) {
                    return xScale(d.label);
                })
                .attr("y", function (d, i) {
                    if (invert) {
                        if (d.label === layout.waterfall.totalLabel) {
                            return (d.value < 0) ? height - yScale(d.sum - d.value) : height - yScale(d.sum);
                        } else if (useTotal && reverse ? i == 1 : i == 0) {
                            return height - yScale(totalsum);
                        } else {
                            return height - yScale(totalsum) + yScale(data[i - 1].sum);
                        }
                    } else {
                        return (d.value < 0) ? height - yScale(d.sum - d.value) : height - yScale(d.sum);
                    };
                })
                .attr("width", xScale.rangeBand())
                .attr("height", function (d, i) {
                    if (useOffest && i === 0) {
                        return yScale(Math.abs(d.value)) - yScale(offsetBy);
                    }
                    return yScale(Math.abs(d.value));
                })
                .style('fill', function (d) {
                    if (d.label === layout.waterfall.totalLabel) return layout.waterfall.totalcolor;
                    var color = (d.value < 0) ? layout.waterfall.negativecolor : layout.waterfall.positivecolor;
                    return color;
                });

            if (!calculatedDimension) {
                svg.selectAll('rect').style('cursor', 'pointer').on('click', handleClick);
            }


            var barLabels = svg.append("g")
                .selectAll('text')
                .data(data)
                .enter()
                .append("text")
                .attr("x", function (d) {
                    return xScale(d.label) + (xScale.rangeBand() / 2);
                })
                .attr("y", function (d, i) {
                    if (invert) {
                        if (d.label === 'Total') {
                            return (d.value < 0) ? height - yScale(d.sum - d.value) : height - yScale(d.sum);
                        } else if (useTotal && reverse ? i == 1 : i == 0) {
                            return height - yScale(totalsum);
                        } else {
                            return height - yScale(totalsum) + yScale(data[i - 1].sum);
                        }
                    } else {
                        return (d.value < 0) ? height - yScale(d.sum - d.value) : height - yScale(d.sum);
                    };
                })
                .attr('dy', -5)
                .attr('text-anchor', 'middle')
                .text(function (d) {
                    var val = '';
                    if (datapoint == 'exp') {
                        val = format ? formatNumber(d.value) : d.value;
                    } else if (datapoint === 'cum') {
                        val = format ? formatNumber(d.sum) : d.sum;
                    };
                    return val;
                });

            if (useY) {
                svg.append("g").attr("class", "yaxis axis").call(yAxis);
            };
            if (useX) {
                svg.append("g")
                    .attr("class", "xaxis axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);
            };
            if (useX && rotateLabels) {
                svg.selectAll(".xaxis text")
                    .style("text-anchor", "end")
                    .attr("transform", function(d) {
                        return "translate(" + -8 + "," + 0 + ")rotate(-45)";
                    });
            };

            function handleClick(d, i) {
                //Break if in edit mode.
                if (that.$scope.$parent.$parent.editmode) return;

                //Can't select the total bar.
                if (d.element == 'total') return;

                that.selectValues(0, [d.element], true);

                if (that.selectedArrays[0].length === 0) {
                    svg.selectAll('rect').style('opacity', 1);
                    return;
                };

                svg.selectAll('rect').style('opacity', 0.4);

                svg.selectAll('rect').each(function () {
                    var e = d3.select(this);
                    var id = e.attr('id');
                    that.selectedArrays[0].forEach(function (d) {
                        if (id == d) {
                            return e.style('opacity', 1);
                        }
                    })
                })
            };

        }
    };
});