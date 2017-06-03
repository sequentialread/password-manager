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
      currentUserSecretId = this.sha256Hex(currentUserSecret);
    };

    this.getKeyId = () => currentUserSecretId;

    this.encrypt = (plaintextString) => sjcl.encrypt(currentUserSecret, plaintextString);
    this.decrypt = (cyphertextString) => sjcl.decrypt(currentUserSecret, cyphertextString);

    this.hasSecret = () => currentUserSecret != null;

    this.sha256Hex = (input) => sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(input))

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
  app.storageService = new (function StorageService(cryptoService, awsClient, awsS3BucketName, awsS3BucketRegion) {

    var baseUrl = "/storage";

    var s3InterceptorSymbol = "/awsS3/";

    var localStorageKeyPrefix = "sequentialread-pwm:";

    var requestsCurrentlyInFlight = 0;

    function RequestFailure(httpRequest, isTimeout) {
      this.httpRequest = httpRequest;
      this.isTimeout = isTimeout
    }

    // request ALWAYS resolves, if it fails it will resolve a RequestFailure.
    var request = (method, url, headers, content) =>
      new Promise((resolve, reject) => {

        requestsCurrentlyInFlight += 1;
        document.getElementById('progress-container').style.display = 'block';

        var resolveAndPopInFlight = (result) => {
          requestsCurrentlyInFlight -= 1;
          if(requestsCurrentlyInFlight == 0) {
            document.getElementById('progress-container').style.display = 'none';
          }
          resolve(result);
        };

        headers = headers || {};
        var httpRequest = new XMLHttpRequest();
        httpRequest.onloadend = () => {
          //console.log(`httpRequest.onloadend: ${httpRequest.status} ${url}`);
          if (httpRequest.status === 200) {
            if(httpRequest.responseText.length == 0) {
              resolveAndPopInFlight();
            } else {
              var jsonFailed = false;
              try {
                resolveAndPopInFlight(JSON.parse(cryptoService.decrypt(httpRequest.responseText)));
              } catch (err) {
                jsonFailed  = true;
              }
              if(jsonFailed) {
                try {
                  resolveAndPopInFlight(cryptoService.decrypt(httpRequest.responseText));
                } catch (err) {
                  window.onerror(`unable to decrypt '${url}': ${err.message} `, null, null, null, err);
                  resolveAndPopInFlight(new RequestFailure(httpRequest, false));
                }
              }
            }
          } else {
            resolveAndPopInFlight(new RequestFailure(httpRequest, false));
          }
        };
        //httpRequest.onerror = () => {
        //  console.log(`httpRequest.onerror: ${httpRequest.status} ${url}`);
        //  resolveAndPopInFlight(new RequestFailure(httpRequest, false));
        //};
        httpRequest.ontimeout = () => {
          //console.log(`httpRequest.ontimeout: ${httpRequest.status} ${url}`);
          resolveAndPopInFlight(new RequestFailure(httpRequest, true));
        };

        // Encrypt Content first
        if(content) {
          if(typeof content == "object") {
            content = JSON.stringify(content, 0, 2);
          }
          content = cryptoService.encrypt(content);
        }

        // AWS S3 request interceptor
        if(url.startsWith(s3InterceptorSymbol)) {
          var path = url.replace(s3InterceptorSymbol, '');
          var s3Request = awsClient.s3Request(method, awsS3BucketRegion, awsS3BucketName, path, content);
          headers = s3Request.headers;
          url = s3Request.endpointUri;
        }

        httpRequest.open(method, url);
        httpRequest.timeout = 2000;

        Object.keys(headers)
          .filter(key => key.toLowerCase() != 'host' && key.toLowerCase() != 'content-length')
          .forEach(key => httpRequest.setRequestHeader(key, headers[key]));

        if(content) {
          httpRequest.send(content);
        } else {
          httpRequest.send();
        }
      });

    this.get = (id) => {
      // request() ALWAYS resolves, if it fails it will resolve a RequestFailure.
      return Promise.all([
        request('GET', `${baseUrl}/${id}`, {'Accept': 'application/json'}),
        request('GET', `${s3InterceptorSymbol}${id}`, {'Accept': 'application/json'})
      ]).then((results) => {
        return new Promise((resolve, reject) => {
          var localCopyCiphertext = window.localStorage[`${localStorageKeyPrefix}${id}`];
          var localCopy;
          try {
            localCopy = localCopyCiphertext ? JSON.parse(cryptoService.decrypt(localCopyCiphertext)) : null;
          } catch (err) {
            window.onerror(`unable to decrypt 'window.localStorage["${localStorageKeyPrefix}${id}"]': ${err.message} `, null, null, null, err);
          }
          var sequentialreadCopy = results[0];
          var s3Copy = results[1];
          var allCopies = [];
          if(localCopy) {
            allCopies.push(localCopy);
          }
          if(!(sequentialreadCopy instanceof RequestFailure)) {
            allCopies.push(sequentialreadCopy);
          }
          if(!(s3Copy instanceof RequestFailure)) {
            allCopies.push(s3Copy);
          }
          if(allCopies.length == 0) {
            reject();
            return;
          }

          var latestCopy = {lastUpdated:0};
          allCopies.forEach(x => {
            if(x.lastUpdated && x.lastUpdated > latestCopy.lastUpdated) {
              latestCopy = x;
            }
          });

          if(latestCopy.lastUpdated == 0) {
            reject();
            return;
          }

          if(allCopies.filter(x => x.lastUpdated < latestCopy.lastUpdated).length > 0 || allCopies.length < 3) {
            this.put(id, latestCopy).then(() => resolve(latestCopy));
          } else {
            resolve(latestCopy);
          }
        });
      });
    };
    this.put = (id, content) => {
      content.lastUpdated = new Date().getTime();
      // request() ALWAYS resolves, if it fails it will resolve a RequestFailure.
      window.localStorage[`${localStorageKeyPrefix}${id}`] = cryptoService.encrypt(JSON.stringify(content));
      return Promise.all([
        request('PUT', `${baseUrl}/${id}`, {'Content-Type': 'application/json'}, content),
        request('PUT', `${s3InterceptorSymbol}${id}`, {'Content-Type': 'application/json'}, content)
      ]).then(() => content)
    };
    this.delete = (id) => {
      window.localStorage.removeItem(`${localStorageKeyPrefix}${id}`);
      return Promise.all([
        request('DELETE', `${baseUrl}/${id}`),
        request('DELETE', `${s3InterceptorSymbol}${id}`)
      ]).then(() => null);
    };
  })(app.cryptoService, app.awsClient, app.S3BucketName, app.S3BucketRegion);
})(window.sequentialReadPasswordManager, window, document);

(function(app, document, window, undefined){
  app.modalService = new (function ModalService() {

    var modalIsOpen = false;
    var enterKeyAction;
    var escapeKeyAction;
    var KEYCODE_ESCAPE = 27;
    var KEYCODE_ENTER = 13;

    window.addEventListener("keydown", (event) => {
      if(event.keyCode == KEYCODE_ENTER && enterKeyAction) {
        enterKeyAction();
      }
      if(event.keyCode == KEYCODE_ESCAPE && escapeKeyAction) {
        escapeKeyAction();
      }
    }, false);

    this.open = (title, body, controller, buttons) => {
      return new Promise((resolve, reject) => {
        modalIsOpen = true;
        document.getElementById('modal-container').style.display = 'block';
        document.getElementById('modal-title').innerHTML = title;
        document.getElementById('modal-body').innerHTML = body;
        var footer = document.getElementById('modal-footer');

        var closeModal = () => {
          modalIsOpen = false;
          enterKeyAction = null;
          escapeKeyAction = null;
          document.getElementById('modal-container').style.display = 'none';
          footer.innerHTML = '';
        };

        var buttonResolve = (arg) => {
          closeModal();
          resolve(arg);
        };
        var buttonReject = (arg) => {
          closeModal();
          reject(arg);
        };

        buttons.reverse();
        buttons.forEach(button => {
          var buttonElement = document.createElement("button");
          if(button.id) {
            buttonElement.id = button.id;
          }
          buttonElement.style.float = "right";
          buttonElement.innerHTML = button.innerHTML;
          var clickAction = () => {
            if(!buttonElement.disabled) {
              button.onclick(buttonResolve, buttonReject);
            }
          };
          buttonElement.onclick = clickAction;
          if(button.enterKey) {
            enterKeyAction = clickAction;
          }
          if(button.escapeKey) {
            escapeKeyAction = clickAction;
          }
          footer.appendChild(buttonElement);
        });

        controller(buttonResolve, buttonReject);
      });
    };

  })();
})(window.sequentialReadPasswordManager, document, window);


(function(app, window, document, undefined){
  app.errorHandler = new (function ErrorHandler(modalService) {

    this.errorContent = "";

    this.onError = (message, fileName, lineNumber, column, err) => {

      this.errorContent += `<p>${message || err.message} at ${fileName || ""}:${lineNumber || ""}</p>`;
      console.log(message, fileName, lineNumber, column, err);
      modalService.open(
        "JavaScript Error",
        `<div>
          <span class="yavascript"></span>
        </div>
        ${this.errorContent}
        `,
        (resolve, reject) => {},
        [{
          innerHTML: "Ok",
          enterKey: true,
          escapeKey: true,
          onclick: (resolve, reject) => resolve()
        }]
      ).then(() => {
        this.errorContent = "";
      });
    };

    window.onerror = this.onError;
    window.addEventListener("unhandledrejection", (unhandledPromiseRejectionEvent, promise) => {
      var err = unhandledPromiseRejectionEvent.reason;
      if(typeof err == "string") {
        err = new Error(err);
      }
      if(err) {
        this.onError(err.message, err.fileName, err.lineNumber, null, err);
      }
    });
  })(app.modalService);
})(window.sequentialReadPasswordManager, window);

(function(app, window, document, undefined){
  app.navController = new (function NavController() {

    document.getElementById('logout-link').onclick = () => window.location = window.location.origin;

    var routes = [
      'splash-content',
      'file-list-content',
      'file-detail-content'
    ];
    this.navigate = (target) => {
      routes.forEach(route => document.getElementById(route).style.display = (route == target ? 'block' : 'none'));
    };
  })();
})(window.sequentialReadPasswordManager, window, document);

(function(app, document, window, undefined){
  app.fileDetailController = new (function FileDetailController(storageService, cryptoService, navController) {

    var savedStatusIndicator = document.getElementById('saved-status-indicator');

    document.getElementById('file-detail-back-link').onclick = () => {
      navController.navigate('file-list-content');
    };

    this.saving = Promise.resolve();

    var lastFileContent = '';
    var markFileContentDirty = () => {
      var doMarkDirty = () => {
        if(this.saveTimeout) {
          window.clearTimeout(this.saveTimeout);
        }
        savedStatusIndicator.className = "saved-status-indicator saving";
        savedStatusIndicator.innerHTML = "Saving...";
        this.saveTimeout = window.setTimeout(() => {
          this.saveTimeout = null;
          this.saving = storageService.put(this.file.id, this.file)
          .then(
            () => {
              savedStatusIndicator.className = "saved-status-indicator saved";
              savedStatusIndicator.innerHTML = "Saved";
            },
            () => {
              savedStatusIndicator.className = "saved-status-indicator error";
              savedStatusIndicator.innerHTML = "Error!";
            }
          );
        }, 750);
      };

      this.file.content = document.getElementById('file-content').value;

      if(this.file.content != lastFileContent) {
        this.saving.then(doMarkDirty, doMarkDirty);
      }
      lastFileContent = this.file.content;
    };

    document.getElementById('file-content').onchange = markFileContentDirty;
    document.getElementById('file-content').onkeyup = markFileContentDirty;

    this.load = (file) => {
      this.file = file;
      lastFileContent = this.file.content;
      document.getElementById('file-detail-file-name').innerHTML = file.name;
      document.getElementById('file-content').value = file.content ? file.content : '';
    };

  })(app.storageService, app.cryptoService, app.navController);
})(window.sequentialReadPasswordManager, document, window);

(function(app, document, undefined){
  app.fileListController = new (function FileListController(
    storageService,
    modalService,
    cryptoService,
    navController,
    fileDetailController
  ) {

    this.fileListDocument = {
      version: 1,
      files: []
    };

    document.getElementById('new-file-button').onclick = () => {
      modalService.open(
        "New File",
        "Name:<br/><input id=\"new-file-name\" type=\"text\" style=\"width:calc(100% - 20px)\"></input>",
        (resolve, reject) => {

          document.getElementById('new-file-create-button').disabled = true;
          var updateDisabled = () => {
            var newName = document.getElementById('new-file-name').value.trim();
            var newId = cryptoService.sha256Hex(newName);
            var idAlreadyExists = this.fileListDocument.files.filter(x => x.id == newId).length > 0;
            var newFileCreateButton = document.getElementById('new-file-create-button');
            if(newFileCreateButton){
              newFileCreateButton.disabled = newName.length == 0 || idAlreadyExists;
            }
          };
          document.getElementById('new-file-name').onkeyup = updateDisabled;
          document.getElementById('new-file-name').onchange = updateDisabled;
        },
        [{
          innerHTML: "Cancel",
          escapeKey: true,
          onclick: (resolve, reject) => reject()
        },
        {
          id: "new-file-create-button",
          innerHTML: "Create",
          enterKey: true,
          onclick: (resolve, reject) => resolve(document.getElementById('new-file-name').value.trim())
        }]
      ).then(
        (newFileName) => {
          var newFile = {
            id: cryptoService.sha256Hex(newFileName),
            name: newFileName
          };
          storageService.put(newFile.id, newFile)
          .then(
            () => {
              this.fileListDocument.files.push(newFile);
              this.fileListDocument.files.sort((a, b) => {
                return a.name.localeCompare(b.name);
              });
              return storageService.put(cryptoService.getKeyId(), this.fileListDocument)
            },
            () => null //TODO error handler
          ).then(
            () => {
              renderFileList(this.fileListDocument);
              navController.navigate('file-detail-content');
              fileDetailController.load(newFile);
            },
            () => null //TODO error handler
          );
        },
        () => {} // cancel is a no-op
      );
    };

    this.load = () => {
      storageService.get(cryptoService.getKeyId())
      .then(
        renderFileList,
        () => {
          storageService.put(cryptoService.getKeyId(), this.fileListDocument)
          .then(
            () => renderFileList(this.fileListDocument),
            () => null //TODO error handler
          );
        }
      )
    };

    var renderFileList = (fileListDocument) => {
      this.fileListDocument = fileListDocument;
      var fileListElement = document.getElementById('file-list');
      if(this.fileListDocument.files.length == 0) {
        fileListElement.innerHTML = 'There are currently no files.';
      } else {
        fileListElement.innerHTML = '';
        var fileListUl = document.createElement('ul');
        fileListElement.appendChild(fileListUl);
        this.fileListDocument.files.forEach(file => {
          var fileLi = document.createElement('li');
          var fileLink = document.createElement('a');
          fileLink.innerText = file.name;
          fileLink.href = "#";
          fileLink.onclick = () => {
            storageService.get(file.id)
            .then(
              (file) => {
                navController.navigate('file-detail-content');
                fileDetailController.load(file);
              },
              () => null //TODO error handler
            );
          };
          fileLi.appendChild(fileLink);
          fileListUl.appendChild(fileLi);
        });
      }
    };

  })(
    app.storageService,
    app.modalService,
    app.cryptoService,
    app.navController,
    app.fileDetailController
  );
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
          document.getElementById('encryption-secret').type = 'text';
          window.clearInterval(checkInterval);
          document.getElementById('move-mouse-instruction').style.visibility = 'hidden';
          document.getElementById('entropy-progress-bar').style.width = '0';
        }
      }, 100);
    };

    var onContinueClicked = () => {
      cryptoService.setSecret(document.getElementById('encryption-secret').value);
      document.getElementById('logout-link-container').style.display = "inline";
      document.getElementById('encryption-secret').value = '';
      document.getElementById('encryption-secret').type = 'password';
      navController.navigate('file-list-content');
      fileListController.load();
    };

    var KEYCODE_ENTER = 13;
    window.addEventListener("keydown", (event) => {
      if(event.keyCode == KEYCODE_ENTER && document.getElementById('splash-content').style.display != 'none') {
        onContinueClicked();
      }
    }, false);

    document.getElementById('splash-continue-button').onclick = onContinueClicked;

  })(app.cryptoService, app.navController, app.fileListController);
})(window.sequentialReadPasswordManager, window, document);
