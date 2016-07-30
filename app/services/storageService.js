

var StorageService = ['levelup', function (levelup) {

  var dbPromise = promiseFromCallback(levelup, "/", {createIfMissing: true});
  var initPromise = dbPromise.then(db => {
    this.
  });

  this.accrete =

  function promiseFromCallback () {
    var argumentsArray = Array.prototype.slice.call(arguments);
    var fn = argumentsArray.shift();
    return new Promise((resolve, reject) => {
      argumentsArray.push(function() {
        var resultArgumentsArray = Array.prototype.slice.call(arguments);
        var err = resultArgumentsArray.shift();
        if(err) {
          reject(err);
        } else {
          var result = resultArgumentsArray.length != 0 ?
            (resultArgumentsArray.length > 1 ? resultArgumentsArray : resultArgumentsArray[0])
            : undefined;
          resolve(result);
        }
      });
      fn.apply(self, argumentsArray);
    });
  };
}];

export default function registerService (module) {
  module.service('StorageService', StorageService);
}
