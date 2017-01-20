'use strict';

import template from './home.tmpl.html!text'

var HomeController = ['$interval', 'CryptoService',
function HomeController($interval, CryptoService) {

  this.loggedIn = CryptoService.isLoggedIn() ;

  this.files = [];
  this.errorFiles = [];

  this.generateNewPassphrase = () => {
    this.generatingNewPassphrase = true;

    var entropizer = CryptoService.getPassphraseEntropizer();

    var checkInterval = $interval(() => {
      this.generatingNewPassphraseProgress = entropizer.entropyScore;
      if(entropizer.entropyScore >= 100) {
        this.passphrase = entropizer.passphrase;
        $interval.cancel(checkInterval);
        this.generatingNewPassphrase = false;
      }
    }, 100);
  };

  this.login = () => {
    CryptoService.setPassphrase(this.passphrase);
    this.passphrase = '';
    this.loggedIn = true;
  };

  this.onFilesDropped = (dataTransfer) => {
    Array.prototype.forEach.call(dataTransfer.files, file => {
      var reader = new FileReader();
      reader.readAsText(file);
      reader.onload = (resultEvent) => {
        file.decoratedData = CSVIntelligenceService.parseAndDecorate(resultEvent.target.result);
        this.files.push(file);
      };
      reader.onerror = (errorEvent) => {
        file.error = errorEvent.target.error;
        this.errorFiles.push(file);
      };
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
