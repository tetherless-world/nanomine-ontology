'use strict';

String.prototype.unCamelCase = function(){
    return this
    // insert a space between lower & upper
	.replace(/([a-z])([A-Z])/g, '$1 $2')
    // space before last upper in a sequence followed by lower
	.replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3')
    // uppercase the first character
	.replace(/^./, function(str){ return str.toUpperCase(); })
}

var nanomineD3 = angular.module('adf.widget.nanomine-d3', ['adf.provider', 'nvd3']);

nanomineD3.value('nanomineEndpoint', "http://localhost:9999/bigdata/sparql");

function appendTransform(defaults, transform) {

  // We can't guarantee that the default transformation is an array
  defaults = angular.isArray(defaults) ? defaults : [defaults];

  // Append the new transformation to the defaults
  return defaults.concat(transform);
}

nanomineD3.config(function(dashboardProvider){
    dashboardProvider
        .widget('nanomine-d3', {
            title: 'Nanomine Visualization',
            description: 'Visualize properties and aspects of nanomaterials from the Nanomine knowledge graph.',
            templateUrl: '{widgetsPath}/nanomine-d3/src/view.html',
            controller: 'nanominedD3Controller',
            controllerAs: 'nanomineD3',
            reload: true,
            resolve: {
                data: function(loadData, config) {
                    return loadData(config);
                }
            },
            edit: {
                controller: 'nanomineD3EditController',
                controllerAs: 'nanomineD3',
                templateUrl: '{widgetsPath}/nanomine-d3/src/edit.html'
            },
            config: {
                x: null,
                y: null,
                groupBy: {
                    materialType: 'http://nanomine.tw.rpi.edu/ns/Polymer',
                    type: 'type'
                },
            }
        });
});

nanomineD3.controller('nanominedD3Controller', [
    '$scope', 'data', 'config',
    function($scope, data, config) {
        this.data = data;
        this.chart = {
            'chart' : {
                "type": "scatterChart",
                "height": 450,
                "color": [
                    "#1f77b4",
                    "#ff7f0e",
                    "#2ca02c",
                    "#d62728",
                    "#9467bd",
                    "#8c564b",
                    "#e377c2",
                    "#7f7f7f",
                    "#bcbd22",
                    "#17becf"
                ],
                "scatter": {
                    "onlyCircles": false
                },
                "showDistX": true,
                "showDistY": true,
                "duration": 350,
                "xAxis": {
                    "axisLabel": "",
                    "tickFormat": function (d) {
                        var prefix = d3.formatPrefix(d);
                        return prefix.scale(d) + " " + prefix.symbol;
                    }
                },
                "yAxis": {
                    "axisLabel": "",
                    "axisLabelDistance": -5,
                    "tickFormat": function (d) {
                        var prefix = d3.formatPrefix(d);
                        return prefix.scale(d) + " " + prefix.symbol;
                    }
                },
                "zoom": {
                    "enabled": true,
                    "scaleExtent": [ 1, 10 ],
                    "useFixedDomain": true,
                    "useNiceScale": false,
                    "horizontalOff": false,
                    "verticalOff": false,
                    "unzoomEventType": "dblclick.zoom"
                }
            }
        };
        console.log(this);
        if (data.config.x)
            this.chart.chart.xAxis.axisLabel = data.config.x.label;
        if (data.config.y)
            this.chart.chart.yAxis.axisLabel = data.config.y.label;
        console.log(this);
    }]);

nanomineD3.controller('nanomineD3EditController', [
    '$scope', 'loadAttributes', 'config',
    function($scope, loadAttributes, config) {
        $scope.config = config;
        loadAttributes().then(function(attributes) {
            $scope.attributes = attributes;
            console.log(attributes);
        });
        console.log($scope.config);
    }]);

nanomineD3.factory('conf', function() {
    var config = {
        endpoint : "http://localhost:9999/bigdata/sparql"
    };
    return config;
})

nanomineD3.factory('loadData', ['$http', 'conf', '$q', function($http, conf, $q) {
    var query = 'prefix nanomine: <http://nanomine.tw.rpi.edu/ns/>\
prefix sio: <http://semanticscience.org/resource/>\
select distinct ?composite ?ParticleType ?ParticleTypeLabel ?PolymerType ?PolymerTypeLabel ?SurfaceTreatmentType ?SurfaceTreatmentTypeLabel ?type ?materialType ?value ?unit ?unitLabel where {\
  ?composite a nanomine:PolymerNanocomposite.\
  ?composite sio:hasComponentPart?/sio:isSurroundedBy? ?p.\
  optional {\
    ?composite sio:hasComponentPart [a ?particleType].\
    ?ParticleType rdfs:subClassOf nanomine:Particle; rdfs:label ?ParticleTypeLabel.\
  }\
  optional {\
    ?composite sio:hasComponentPart [a ?PolymerType].\
    ?PolymerType rdfs:subClassOf nanomine:Polymer; rdfs:label ?PolymerTypeLabel.\
  }\
  optional {\
    ?composite sio:hasComponentPart/sio:isSurroundedBy [a ?surfaceType].\
    ?SurfaceTreatmentType rdfs:label ?SurfaceTreatmentTypeLabel.\
  }\
  ?p a ?materialType.\
  ?p sio:hasAttribute ?attr.\
  ?attr a ?type.\
  ?attr sio:hasValue ?value.\
  optional {\
    ?attr sio:hasUnit ?unit.\
    ?unit rdfs:label ?unitLabel.\
  }\
}\
';
    var cache = {};
    var nm = "http://nanomine.tw.rpi.edu/ns/";

    function getUnit(unit, label) {
        if (!cache[unit]) {
            cache[unit] = {
                uri: unit,
                label: label
            }
        }
        return cache[unit];
    }
    
    function getComposite(uri) {
        if (!cache[uri]) {
            cache[uri] = {
                uri : uri,
                "http://nanomine.tw.rpi.edu/ns/PolymerNanocomposite" : {},
                "http://nanomine.tw.rpi.edu/ns/Particle": {},
                "http://nanomine.tw.rpi.edu/ns/Polymer" : {},
                "http://nanomine.tw.rpi.edu/ns/SurfaceTreatment" : {}
            };
        }
        return cache[uri];
    };
    function fn(vizconfig) {
        var values = 'VALUES (?materialType ?type) { \n';
        var dimensions = ['x','y', 'size'];
        var hasBindings = false;
        dimensions.forEach(function(dim) {
            if (vizconfig[dim]) {
                console.log(vizconfig[dim]);
                hasBindings = true;
                values = values + "( <"+vizconfig[dim].materialType+"> <"+vizconfig[dim].type+"> )\n";
            }
        });
        values = values + ' }';
        var q = query + values;
        if (!hasBindings) {
            var result = [];
            result.config = vizconfig;
            var p = $q(function(resolve, reject) { resolve(result)});
            return p;
        }
        return $http
            .get(conf.endpoint, {
                params : {query : q, output: 'json'},
                responseType: 'json'})
            .then(function(data) {
                return $q(function( resolve, reject) {
                    var composites = {};
                    data.data.results.bindings.forEach(function(row) {
                        var composite = getComposite(row.composite.value);
                        ['Polymer','SurfaceTreatment','Polymer'].forEach(function(t) {
                            if (row[t+'Type'] && !composite[nm+t].type ) {
                                composite[nm+t].type = {uri: row[t+'Type']};
                                if (row[t+'TypeLabel']) {
                                    composite[nm+t].type.label = row[t+'TypeLabel'].value;
                                } else {
                                    composite[nm+t].type.label = row[t+'Type'].value.split('/').slice(-1)[0].unCamelCase();
                                }
                            }
                        });
                        composite[row.materialType.value][row.type.value] = row.value;
                        var unit = getUnit(row.unit.value, row.unitLabel.value);
                        composite[row.materialType.value][row.type.value].unit = unit;
                        composites[row.composite.value] = composite;
                    });
                    var groupMap = {}, result = [];
                    result.config = vizconfig;
                    d3.values(composites).forEach(function(composite) {
                        var groupBy = composite[vizconfig.groupBy.materialType][vizconfig.groupBy.type];
                        if (!groupMap[groupBy.materialType]) {
                            groupMap[groupBy.materialType] = {
                                key : groupBy.label,
                                group: groupBy,
                                values: []
                            };
                            result.push(groupMap[groupBy.materialType]);
                        }
                        var value = {
                            entity : composite
                        }
                        dimensions.forEach(function(dim) {
                            if (vizconfig[dim] && composite[vizconfig[dim].materialType][vizconfig[dim].type]) {
                                value[dim] = composite[vizconfig[dim].materialType][vizconfig[dim].type].value;
                                vizconfig[dim].unit = composite[vizconfig[dim].materialType][vizconfig[dim].type].unit;
                            }
                        });
                        groupMap[groupBy.materialType].values.push(value);
                    });
                    resolve(result);
                });
            });
    }
    return fn;
}]);

nanomineD3.factory('loadAttributes', ['$http', 'conf', '$q', function($http, conf, $q) {
    var query = 'prefix nanomine: <http://nanomine.tw.rpi.edu/ns/>\
prefix sio: <http://semanticscience.org/resource/>\
select distinct ?type (count(?composite) as ?count) (sample(?label) as ?label) ?materialType (sample(?materialTypeLabel) as ?materialTypeLabel) ?unit (sample(?unitLabel) as ?unitLabel) where {\
  ?composite a nanomine:PolymerNanocomposite.\
    ?composite sio:hasComponentPart?/sio:isSurroundedBy? ?p.\
  ?p a ?materialType.\
  ?p sio:hasAttribute ?attr.\
  ?attr a ?type.\
  ?attr sio:hasValue ?value.\
  optional { ?attr sio:hasUnit ?unit. ?unit rdfs:label ?unitLabel}\
  optional { ?type rdfs:label ?label}\
  optional { ?materialType rdfs:label ?materialTypeLabel }\
  optional { ?sc rdfs:subClassOf ?materialType}\
  filter(!BOUND(?sc))\
} group by ?type ?materialType ?unit order by desc(?count)';
    function fn() {
        return $http.get(conf.endpoint, {params : {query : query, output: 'json'}, responseType: 'json'})
            .then(function(data) {
                return $q(function( resolve, reject) {
                    var result = data.data.results.bindings.map(function(row) {
                        var attr = {
                            type : row.type.value,
                            typeLabel : row.label.value,
                            materialType: row.materialType.value,
                            materialTypeLabel: row.materialTypeLabel.value,
                            count: row.count.value,
                            attrType: "quantity"
                        }
                        if (row.unit) {
                            attr.unit = row.unit.value;
                            attr.unitLabel = row.unitLabel.value;
                        }
                        attr.label = attr.materialTypeLabel + " " + attr.typeLabel;
                        if (attr.unitLabel) attr.label = attr.label + " in " + attr.unitLabel;
                        attr.label = attr.label + " (" + attr.count + ")";
                        return attr;
                    });
                    
                    [["http://nanomine.tw.rpi.edu/ns/PolymerNanocomposite", "Polymer Nanocomposite"],
                     ["http://nanomine.tw.rpi.edu/ns/Particle", "Particle"],
                     ["http://nanomine.tw.rpi.edu/ns/Polymer", "Polymer"],
                     ["http://nanomine.tw.rpi.edu/ns/SurfaceTreatment", "Surface Treatment"]]
                        .forEach(function(row) {
                            result.push({
                                type : 'type',
                                typeLabel : "Type",
                                materialType: row[0],
                                materialTypeLabel: row[1],
                                attrType: "quality",
                                label: row[1] + " Type"
                            });
                        });

                    resolve(result);
                });
            });
    }
    return fn;
}]);
