"use strict";
"global angular";


import registerDebounceService from './DebounceService'

var module = angular.module('client.services', []);


registerDebounceService(module);

export default module;
