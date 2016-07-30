"use strict";
"global angular";


import registerDebounceService from './DebounceService'
import registerStorageService from './StorageService'

var module = angular.module('client.services', []);

registerDebounceService(module);
registerStorageService(module);

export default module;
