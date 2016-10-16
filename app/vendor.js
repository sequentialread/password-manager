"use strict";

import angular from 'angular'
import 'angular-sanitize'
import 'angular-ui-router'
import 'angular-ui/bootstrap-bower'
import sjcl from './vendor/sjcl.js'
import words from './vendor/words.txt!text'

var vendor = angular.module('vendor', [
  'ui.router',
  'ui.bootstrap',
  'ngSanitize',
]);

vendor.service('words', [() => words.split('\n').map(x => x.trim())]);
vendor.service('sjcl', [() => sjcl]);

window.angular = angular;
