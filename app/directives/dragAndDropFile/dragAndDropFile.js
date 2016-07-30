"use strict";

import template from './dragAndDropFile.tmpl.html!text'

export default function registerDirective(module) {
  module.directive(
    'dragAndDropFile',
    function () {
      return {
        restrict: 'E',
        template: template,
        controllerAs: "vm",
        controller: function(){},
        transclude: true,
        scope: {},
        bindToController: {
          callback: "&"
        },
        link: {
         post: function postLink(scope, iElement, iAttrs, controller) {
           Array.prototype.forEach.call(iElement.children(), x => {
             x.addEventListener('dragenter', function (e) {
                controller.dragHover = true;
             }, false);

             x.addEventListener('dragover', function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
             }, false);

             x.addEventListener('dragleave', function (e) {
                controller.dragHover = false;
             }, false );

             x.addEventListener('drop', function (e) {
                e.stopPropagation();
                e.preventDefault();
                controller.callback({
                  dataTransfer: e.dataTransfer
                });
                controller.dragHover = false;
             }, false);
           });
          }
        }
      }
    }
  );
}
