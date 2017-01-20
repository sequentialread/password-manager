"use strict";
"global angular";


import registerDebounceService from './debounceService'
import registerCryptoService from './cryptoService'

var module = angular.module('client.services', []);

registerDebounceService(module);
registerCryptoService(module);

export default module;
