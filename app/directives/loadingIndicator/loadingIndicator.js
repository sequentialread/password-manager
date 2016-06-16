"use strict";

import template from './loadingIndicator.tmpl.html!text'

export default function registerDirective(module) {
  module.directive(
    'loadingIndicator',
    function () {
      return {
        restrict: 'E',
        template: template,
        controllerAs: "vm",
        scope: {},
        bindToController: {
          loadingCount: "="
        },
        controller: function(){}
      }
    }
  );
}
