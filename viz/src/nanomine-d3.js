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

nanomineD3.value('nanomineEndpoint', "http://nanomine.northwestern.edu:8001/blazegraph/sparql");
//nanomineD3.value('nanomineEndpoint', "http://localhost:9999/blazegraph/sparql");

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
            $scope.xAttributes = attributes;
            $scope.yAttributes = attributes;
            console.log(attributes);
        });
        $scope.$watch("config.x",function(attr) {
            loadAttributes($scope.config.x).then(function(attributes) {
                $scope.yAttributes = attributes;
                console.log("Setting new y attributes", attributes);
            });
        });
        $scope.$watch("config.y",function(attr) {
            loadAttributes($scope.config.y).then(function(attributes) {
                $scope.xAttributes = attributes;
                console.log("Setting new x attributes", attributes);
            });
        });
        
        console.log($scope.config);
    }]);

nanomineD3.factory('conf', function() {
    var config = {
        endpoint : "http://nanomine.northwestern.edu:8001/blazegraph/sparql"
//        endpoint : "http://localhost:9999/blazegraph/sparql"
    };
    return config;
})

nanomineD3.factory('sparqlValuesBinder', function() {
    function sparqlValuesBinder(objects, keys) {
        var values = 'VALUES (' + keys.map(function(d) { return "?"+d[1]}).join(" ") +') { \n';
        console.log(objects);
        values = values + objects.map(function(o) {
            var value = "(" + keys.map(function(key) {
                if (!o[key[0]]) return "UNDEF";
                return "<" + o[key[0]] + ">";
            }).join(" ") + ")";
            return value;
        }).join("\n") + ' }';
        return values;
    }
    return sparqlValuesBinder;
});

nanomineD3.factory('loadData', ['$http', 'conf', '$q', function($http, conf, $q) {
    var query = 'prefix nanomine: <http://nanomine.tw.rpi.edu/ns/>\n\
prefix sio: <http://semanticscience.org/resource/>\n\
prefix prov: <http://www.w3.org/ns/prov#>\n\
select distinct ?composite ?ParticleType ?ParticleTypeLabel ?PolymerType ?PolymerTypeLabel ?SurfaceTreatmentType ?SurfaceTreatmentTypeLabel ?type ?materialType ?value ?unit ?generalization where {\n\
  {\n\
    ?p sio:hasRole [ a ?materialType ; sio:inRelationTo ?composite].\n\
  } union {\n\
    ?p a ?materialType\n\
  }\n\
  ?p sio:hasAttribute ?attr.\n\
  ?attr a ?type.\n\
  ?attr sio:hasValue ?value.\n\
  optional {\n\
    ?attr sio:hasUnit ?unit.\n\
  }\n\
  ?composite a nanomine:PolymerNanocomposite.\n\
  ?composite prov:specializationOf?/sio:hasComponentPart?/sio:isSurroundedBy? ?p.\n\
  optional {\n\
    ?composite prov:specializationOf ?generalization.\n\
  }\n\
  optional {\n\
    ?composite prov:specializationOf?/sio:hasComponentPart ?filler.\n\
    ?filler a ?ParticleType; sio:hasRole [a nanomine:Filler].\n\
    ?ParticleType rdfs:label ?ParticleTypeLabel.\n\
  }\n\
  optional {\n\
    ?composite prov:specializationOf?/sio:hasComponentPart ?matrix.\n\
    ?matrix a ?PolymerType; sio:hasRole [a nanomine:Matrix].\n\
    ?PolymerType rdfs:label ?PolymerTypeLabel.\n\
  }\n\
  optional {\n\
    ?composite prov:specializationOf?/sio:hasComponentPart/sio:isSurroundedBy ?surfaceTreatment.\n\
    ?surfaceTreatment a ?SurfaceTreatmentType; sio:hasRole [a nanomine:SurfaceTreatment].\n\
    ?SurfaceTreatmentType rdfs:label ?SurfaceTreatmentTypeLabel.\n\
  }\n\
}';
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
                "http://nanomine.tw.rpi.edu/ns/SurfaceTreatment" : {},
                rows : []
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
                        if (row.value.value == "None") return;
                        var composite = getComposite(row.composite.value);
                        ['Particle','SurfaceTreatment','Polymer'].forEach(function(t) {
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
                        if (row.unit && row.unitLabel) {
                            var unit = getUnit(row.unit.value, row.unitLabel.value);
                            composite[row.materialType.value][row.type.value].unit = unit;
                        }
                        composite.rows.push(row);
                        composites[row.composite.value] = composite;
                    });
                    var groupMap = {}, result = [];
                    console.log(composites);
                    result.config = vizconfig;
                    d3.values(composites).forEach(function(composite) {
                        var groupBy = composite[vizconfig.groupBy.materialType][vizconfig.groupBy.type];
                        if (!groupBy || !groupBy.uri) {
                            groupBy = {
                                label: "",
                                uri: "None"
                            };
                        }
                        if (!groupMap[groupBy.uri]) {
                            groupMap[groupBy.uri] = {
                                key : groupBy.label,
                                group: groupBy,
                                values: []
                            };
                            result.push(groupMap[groupBy.uri]);
                        }
                        var value = {
                            entity : composite
                        }
                        var complete = true;
                        dimensions.forEach(function(dim) {
                            if (vizconfig[dim]) {
                                if (composite[vizconfig[dim].materialType][vizconfig[dim].type]) {
                                    value[dim] = composite[vizconfig[dim].materialType][vizconfig[dim].type].value;
                                    vizconfig[dim].unit = composite[vizconfig[dim].materialType][vizconfig[dim].type].unit;
                                } else {
                                    complete = false;
                                }
                            }
                        });
                        if (complete) {
                            //console.log(value);
                            groupMap[groupBy.uri].values.push(value);
                        }
                    });
                    resolve(result);
                });
            });
    }
    return fn;
}]);

nanomineD3.factory('loadAttributes', ['$http', 'conf', '$q', "sparqlValuesBinder", function($http, conf, $q, sparqlValuesBinder) {
    var unconstrainedQuery = 'prefix nanomine: <http://nanomine.tw.rpi.edu/ns/>\n\
prefix sio: <http://semanticscience.org/resource/>\n\
prefix prov: <http://www.w3.org/ns/prov#>\n\
select distinct ?type (count(?c) as ?count) (sample(?label) as ?label) ?materialType (sample(?materialTypeLabel) as ?materialTypeLabel) ?unit (sample(?unitLabel) as ?unitLabel) where {\n\
  ?c a nanomine:PolymerNanocomposite.\n\
  ?c prov:specializationOf?/sio:hasComponentPart?/sio:isSurroundedBy? ?p.\n\
  {\n\
    ?p sio:hasRole [ a ?materialType ; sio:inRelationTo ?composite].\n\
  } union {\n\
    ?p a nanomine:PolymerNanocomposite.\n\
    BIND(nanomine:PolymerNanocomposite as ?materialType)\n\
  }\n\
  ?p sio:hasAttribute ?attr.\n\
  ?attr a ?type.\n\
  ?attr sio:hasValue ?value.\n\
  optional { ?attr sio:hasUnit ?unit. ?unit rdfs:label ?unitLabel}\n\
  optional { ?type rdfs:label ?label}\n\
  optional { ?materialType rdfs:label ?materialTypeLabel }\n\
  optional { ?sc rdfs:subClassOf ?materialType}\n\
  filter(!BOUND(?sc))\n\
} group by ?type ?materialType ?unit order by desc(?count)';

    var constrainedQuery = 'prefix nanomine: <http://nanomine.tw.rpi.edu/ns/>\n\
prefix sio: <http://semanticscience.org/resource/>\n\
prefix prov: <http://www.w3.org/ns/prov#>\n\
select distinct ?type (count(?c) as ?count) (sample(?label) as ?label) ?materialType (sample(?materialTypeLabel) as ?materialTypeLabel) ?unit (sample(?unitLabel) as ?unitLabel) where {\n\
  ?c a nanomine:PolymerNanocomposite.\n\
  ?c prov:specializationOf?/sio:hasComponentPart?/sio:isSurroundedBy? ?p.\n\
  {\n\
    ?p sio:hasRole [ a ?materialType ; sio:inRelationTo ?composite].\n\
  } union {\n\
    ?p a nanomine:PolymerNanocomposite.\n\
    BIND(nanomine:PolymerNanocomposite as ?materialType)\n\
  }\n\
  ?p sio:hasAttribute ?attr.\n\
  ?attr a ?type.\n\
  ?attr sio:hasValue ?value.\n\
  optional { ?attr sio:hasUnit ?unit. ?unit rdfs:label ?unitLabel}\n\
  optional { ?type rdfs:label ?label}\n\
  optional { ?materialType rdfs:label ?materialTypeLabel }\n\
  optional { ?sc rdfs:subClassOf ?materialType}\n\
  ?c prov:specializationOf?/sio:hasComponentPart?/sio:isSurroundedBy? [\n\
    a ?selectedMaterialType; sio:hasAttribute [a ?selectedType]\n\
  ].\n\
  filter(!BOUND(?sc))\n\
} group by ?type ?materialType ?unit order by desc(?count)';
    function fn(otherVariable) {
        var query = unconstrainedQuery;
        console.log(otherVariable);
        if (otherVariable) {
            query = constrainedQuery + sparqlValuesBinder([otherVariable],
                                                          [['materialType','selectedMaterialType'],['type','selectedType']]);
        }
        console.log(query);
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
                            id: [row.type.value, row.materialType.value].join(' '),
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
                                id : [row[0] , 'type'].join(" "),
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
