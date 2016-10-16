"use strict";
"global angular";

import './routes/routes.module'
import './directives/directives.module'
import './services/services.module'

var app = angular.module('client', [
  'vendor',
  'client.directives',
  'client.services',
  'client.routes'
]);

var apply = Function.prototype.apply;
var flatten = apply.bind(Array.prototype.concat, []);

Array.prototype.selectMany = function (fn) {
    return flatten(this.map(fn));
};
