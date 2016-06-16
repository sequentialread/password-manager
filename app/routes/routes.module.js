"use strict";
"global angular";

import RegisterHome from './home.js'

var routes = angular.module('client.routes', []);

routes.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise(function($injector, $location) {
      console.log("Could not find route '" + ((typeof $location) == 'object' ? $location.$$path : $location) + "'");
      $location.path('/');
    });

    var stateProvider = RegisterHome($stateProvider);


}]);

export default routes;
