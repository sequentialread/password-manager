

var DebounceService = ['$rootScope', function ($rootScope) {

  var applyIfNotInPhase = (action) => {
    if(!$rootScope.$$phase) {
      $rootScope.$apply(action);
    } else {
      action();
    }
  };

  this.create = (func, wait, immediate) => {
  	var timeout;
  	return function() {
  		var context = this, args = arguments;
  		var later = function() {
  			timeout = null;
  			if (!immediate) {
          applyIfNotInPhase(() => func.apply(context, args));
        }
  		};
  		var callNow = immediate && !timeout;
  		clearTimeout(timeout);
  		timeout = setTimeout(later, wait);
  		if (callNow) {
        applyIfNotInPhase(() => func.apply(context, args));
      }
  	};
  };
}]

export default function registerService (module) {
  module.service('DebounceService', DebounceService);
}
