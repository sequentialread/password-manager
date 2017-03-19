'use strict';

(function(app, window, document, undefined){
  var numberOfWordsInPhrase = 9;
  var lengthOfKeySegment = 4;
  var pixelDistanceRequiredForEntropy = 250;
  var hashCountRequiredForEntropy = 3;

  app.cryptoService = new (function CryptoService() {
    var lastKnownOffsetX = 0;
    var lastKnownOffsetY = 0;
    var distanceOffsetX = 0;
    var distanceOffsetY = 0;
    var hashCount = 0;
    var lastTimeStamp = 0;
    document.onmousemove = (mouseEvent) => {
      distanceOffsetX += Math.abs(lastKnownOffsetX - mouseEvent.offsetX);
      distanceOffsetY += Math.abs(lastKnownOffsetY - mouseEvent.offsetY);
      lastKnownOffsetX = mouseEvent.offsetX;
      lastKnownOffsetY = mouseEvent.offsetY;
      lastTimeStamp = mouseEvent.timeStamp;
    };

    var currentUserSecret = null;
    var currentUserSecretId = null;
    this.setSecret = (secret) => {
      currentUserSecret = sjcl.hash.sha256.hash(secret);
      currentUserSecretId = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(currentUserSecret));
    };

    this.getSecretId = () => currentUserSecretId;

    this.encrypt = (plaintextString) => sjcl.encrypt(currentUserSecret, plaintextString);
    this.decrypt = (cyphertextString) => sjcl.decrypt(currentUserSecret, cyphertextString);

    this.hasSecret = () => currentUserSecret != null;

    this.getEntropizer = () => {
      this.entropizer = {entropyScore:0};
      var lastHash = '';
      var entropy = 0;
      var lastCollectedX = 0;
      var lastCollectedY = 0;
      var passphraseArray = [];

      var collectEntropy = window.setInterval(() => {
        if(passphraseArray.length == numberOfWordsInPhrase) {
          this.entropizer.entropyScore = 100;
          this.entropizer.passphrase = passphraseArray.join(' ');
          window.clearInterval(collectEntropy);
        } else {
          if(lastCollectedX != lastKnownOffsetX && lastCollectedY != lastKnownOffsetY) {
            lastCollectedX = lastKnownOffsetX;
            lastCollectedY = lastKnownOffsetY;
            var hashBits = sjcl.hash.sha256.hash(`${lastTimeStamp}${lastKnownOffsetX}${lastKnownOffsetY}${distanceOffsetX}${distanceOffsetY}${lastHash}`);
            lastHash = sjcl.codec.base64.fromBits(hashBits);
            entropy = entropy ^ hashBits[hashBits.length-1];
            hashCount ++;
          }

          if(distanceOffsetX >= pixelDistanceRequiredForEntropy
              && distanceOffsetY >= pixelDistanceRequiredForEntropy
              && hashCount >= hashCountRequiredForEntropy) {
            passphraseArray.push(app.tenThousandMostCommonEnglishWords[Math.abs(entropy) % app.tenThousandMostCommonEnglishWords.length]);
            distanceOffsetX = 0;
            distanceOffsetY = 0;
            hashCount = 0;
          }

          var progress = passphraseArray.length / numberOfWordsInPhrase;
          progress += Math.min(
            distanceOffsetX/pixelDistanceRequiredForEntropy,
            distanceOffsetX/pixelDistanceRequiredForEntropy,
            1
          ) / numberOfWordsInPhrase;
          this.entropizer.entropyScore = Math.min(progress*100, 99);
        }
      }, 50);

      return this.entropizer;
    };
  })();
})(window.sequentialReadPasswordManager, window, document);

(function(app, window, document, undefined){
  app.storageService = new (function StorageService(cryptoService) {

    var baseUrl = "/storage";

    var request = (method, url, content) =>
      new Promise((resolve, reject) => {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = () => {
          if (httpRequest.readyState === XMLHttpRequest.DONE) {
            if (httpRequest.status === 200) {
              if(httpRequest.responseText.length == 0) {
                resolve();
              } else {
                try {
                  resolve(JSON.parse(cryptoService.decrypt(httpRequest.responseText)));
                } catch (err) {
                  resolve(cryptoService.decrypt(httpRequest.responseText));
                }
              }
            } else {
              reject(httpRequest);
            }
          }
        };

        httpRequest.open(method, url);
        if(content && typeof content == 'object') {
          httpRequest.setRequestHeader('Content-Type', 'text/plain');
          httpRequest.send(cryptoService.encrypt(JSON.stringify(content, 0, 2)));
        } else if(content) {
          httpRequest.setRequestHeader('Content-Type', 'text/plain');
          httpRequest.send(cryptoService.encrypt(content));
        } else {
          httpRequest.send();
        }
      });

    this.get = (id) => request('GET', `${baseUrl}/${id}`);
    this.put = (id, content) => request('PUT', `${baseUrl}/${id}`, content);
    this.delete = (id) => request('DELETE', `${baseUrl}/${id}`);
  })(app.cryptoService);
})(window.sequentialReadPasswordManager, window, document);




(function(app, document, undefined){
  app.navController = new (function NavController() {
    var routes = [
      'splash-content',
      'file-list-content',
      'file-content'
    ];
    this.navigate = (target) => {
      routes.forEach(route => document.getElementById(route).style.display = (route == target ? 'block' : 'none'));
    };
  })();
})(window.sequentialReadPasswordManager, document);

(function(app, document, undefined){
  app.fileListController = new (function FileListController(storageService, cryptoService) {

    this.fileListDocument = {
      version: 1,
      files: []
    };

    this.load = () => {
      storageService.get(cryptoService.getSecretId())
      .then(
        renderFileList,
        (xmlHttpRequest) => {
          if(xmlHttpRequest.status == 404) {
            storageService.put(cryptoService.getSecretId(), this.fileListDocument)
            .then(
              () => renderFileList(this.fileListDocument),
              () => null, //TODO error handler
            )
          } else {
            //TODO error handler
          }
        }
      )
    };

    var renderFileList = (fileListDocument) => {
      this.fileListDocument = fileListDocument;
      if(this.fileListDocument.files.length == 0) {
        document.getElementById('file-list').innerHTML = 'There are currently no files.';
      } else {
        //TODO render files html
      }
    };

  })(app.storageService, app.cryptoService);
})(window.sequentialReadPasswordManager, document);

(function(app, window, document, undefined){
  app.splashController = new (function SplashController(cryptoService, navController, fileListController) {

    document.getElementById('generate-encryption-secret-button').onclick = () => {
      document.getElementById('move-mouse-instruction').style.visibility = 'visible';

      var entropizer = cryptoService.getEntropizer();

      var checkInterval = window.setInterval(() => {
        this.generatingNewSecretProgress = document.getElementById('entropy-progress-bar').style.width = `${entropizer.entropyScore}%`;
        if(entropizer.entropyScore >= 100) {
          document.getElementById('encryption-secret').value = entropizer.passphrase;
          window.clearInterval(checkInterval);
          document.getElementById('move-mouse-instruction').style.visibility = 'hidden';
          document.getElementById('entropy-progress-bar').style.width = '0';
        }
      }, 100);
    };

    document.getElementById('splash-continue-button').onclick = () => {
      cryptoService.setSecret(document.getElementById('encryption-secret').value);
      document.getElementById('encryption-secret').value = '';
      navController.navigate('file-list-content');
      fileListController.load();
    };
  })(app.cryptoService, app.navController, app.fileListController);
})(window.sequentialReadPasswordManager, window, document);
