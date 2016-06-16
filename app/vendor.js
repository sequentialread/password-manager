"use strict";

import angular from 'angular'
import 'angular-sanitize'
import 'angular-ui-router'
import 'angular-ui/bootstrap-bower'

var vendor = angular.module('vendor', [
  'ui.router',
  'ui.bootstrap',
  'ngSanitize',
]);

window.angular = angular;
