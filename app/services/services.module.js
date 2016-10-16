"use strict";
"global angular";


import registerDebounceService from './debounceService'
import registerCryptoService from './cryptoService'
import registerCSVIntelligenceService from './csvIntelligenceService'

var module = angular.module('client.services', []);

registerDebounceService(module);
registerCryptoService(module);
registerCSVIntelligenceService(module);

export default module;
