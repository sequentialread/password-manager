"use strict";
"global angular";

import registerDragAndDropFile from './dragAndDropFile/dragAndDropFile'

var module = angular.module('client.directives', []);

registerDragAndDropFile(module);

export default module;
