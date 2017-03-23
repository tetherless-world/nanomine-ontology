angular
    .module('nanomine', ['adf', 'adf.structures.base', 'adf.widget.nanomine-d3', 'adf.widget.markdown', 'adf.widget.linklist', 'LocalStorageModule'])
    .config(function(dashboardProvider, localStorageServiceProvider){
        localStorageServiceProvider.setPrefix('adf.nanomine-d3');
        //dashboardProvider.structure('1', {
        //    rows: [{
        //        columns: [{
        //            styleClass: 'col-md-12',
        //            widgets: []
        //        }]
        //    }]
        //})
    }).controller('dashboardController', function($scope, localStorageService){
        var model = localStorageService.get('widgetSampleDashboard');
        if (!model){
            model = {
                rows: [{
                    columns: [
                        {
                            styleClass: 'col-md-6',
                            widgets: [{
                                type: 'nanomine-d3',
                                title: 'Nanomine Visualization',
                                config: {
                                    groupBy: {
                                        materialType: 'http://nanomine.tw.rpi.edu/ns/Polymer',
                                        type: 'type'
                                    }
                                }
                            }]
                        },
                        {
                            styleClass: 'col-md-6',
                            widgets: [
                                // {
                                //     type: 'nanomine-d3',
                                //     title: 'Nanomine Visualization',
                                //     config: {
                                //         groupBy: {
                                //             materialType: 'http://nanomine.tw.rpi.edu/ns/Particle',
                                //             type: 'type'
                                //         }
                                //     }
                                // }
                            ]
                        }
                    ]
                }]
            };
        }
        $scope.dashboard = {
            model: model
        };
        $scope.$on('adfDashboardChanged', function (event, name, model) {
            localStorageService.set(name, model);
        });
    });
