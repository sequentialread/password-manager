'use strict';

import template from './home.tmpl.html!text'

var HomeController = ['$state', 'StorageService',
function HomeController($state, StorageService) {
  this.onFilesDropped = (dataTransfer) => {
    Array.prototype.forEach.call(dataTransfer.files, x => {

    });
  };
}];

export default function registerRouteAndController($stateProvider) {
  return $stateProvider.state(
    'home',
    {
      url: '/',
      template: template,
      controller: HomeController,
      controllerAs: 'vm'
    }
  );
}
