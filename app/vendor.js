"use strict";

import angular from 'angular'
import 'angular-sanitize'
import 'angular-ui-router'
import 'angular-ui/bootstrap-bower'
import levelup from 'levelup'

var vendor = angular.module('vendor', [
  'ui.router',
  'ui.bootstrap',
  'ngSanitize',
]);

//debugger;
vendor.service('levelup', [() => levelup]);

window.angular = angular;
