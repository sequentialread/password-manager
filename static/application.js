'use strict';


(function(window, navigator, undefined){

  window.sequentialReadPasswordManager = window.sequentialReadPasswordManager || {};
  window.sequentialReadPasswordManager.localStorageKeyPrefix = "sequentialread-pwm:";
  window.sequentialReadPasswordManager.s3InterceptorSymbol =  "/awsS3/";
  window.sequentialReadPasswordManager.storageBaseUrl = "/storage";

  window.addEventListener('load', () => {
    if (!('serviceWorker' in navigator)) {
      console.log('service workers not supported 😣')
      return
    }
  
    navigator.serviceWorker.register('/serviceworker.js', {scope: "/"}).then(
      (reg) => {
        if(reg.installing) {
          console.log('Service worker installing, will reload');
          
          document.getElementById('progress-container').style.display = 'block';
          window.setTimeout(function(){
            window.location = window.location.origin;
          }, 2000);
        } else if(reg.waiting) {
          console.log('Service worker installed');
          
        } else if(reg.active) {
          console.log('Service worker active');
        }
      },
      err => {
        console.error('service worker registration failed! 😱', err)
      }
    );
    navigator.serviceWorker.addEventListener('message', event => {
      if(event.data.log) {
        console.log(`serviceworker: ${event.data.log}`);
      }
    });
  });

})(window, navigator);


(function(app, window, document, undefined){


  if(sjcl.beware) {
    sjcl.beware["CBC mode is dangerous because it doesn't protect message integrity."]();
  }
    
  const SUPPORTED_VERSION = 3;
  const bytesInAUint32 = 4;
  const aesBlockSizeInBytes = 16;
  const sha256OutputSizeInBytes = 256/8;

  var numberOfWordsInPhrase = 4;
  var pixelDistanceRequiredForEntropy = 250;
  var hashCountRequiredForEntropy = 6;

  var currentUserSecret = null;
  var currentUserSecretId = null;
  var hexSalt = sjcl.codec.hex.fromBits(sjcl.codec.utf8String.toBits("maple yuan rounds airline few kona ferry volvo hobart regime"));
  var derivationCpuAndMemoryCost = Math.pow(2, 14);
  var derivationBlockSize = 32;
  var prngCpuAndMemoryCost = Math.pow(2, 9);
  var prngBlockSize = 8;
  var scryptKeyLength = 32;


  app.cryptoService = new (function CryptoService() {
    var lastKnownOffsetX = 0;
    var lastKnownOffsetY = 0;
    var distanceOffsetX = 0;
    var distanceOffsetY = 0;
    var hashCount = 0;
    var lastTimeStamp = 0;

    var mouseOrTouchMoved = (mouseOrTouchEvent) => {
      if(!mouseOrTouchEvent.offsetX && (!mouseOrTouchEvent.touches || mouseOrTouchEvent.touches.length == 0)) {
        return;
      }
      var hasTouches = mouseOrTouchEvent.touches && mouseOrTouchEvent.touches[0];
      var offsetX = hasTouches ? mouseOrTouchEvent.touches[0].screenX : mouseOrTouchEvent.offsetX;
      var offsetY = hasTouches ? mouseOrTouchEvent.touches[0].screenY : mouseOrTouchEvent.offsetY;
      distanceOffsetX += Math.abs(lastKnownOffsetX - offsetX);
      distanceOffsetY += Math.abs(lastKnownOffsetY - offsetY);
      lastKnownOffsetX = offsetX;
      lastKnownOffsetY = offsetY;
      lastTimeStamp = new Date().getTime();
    };

    document.addEventListener('mousemove', mouseOrTouchMoved, false);
    document.body.addEventListener('touchmove', mouseOrTouchMoved, false);
    this.scryptPromises = {};
    this.scryptWebWorker = new Worker("./static/scryptWebWorker.js");
    this.scrypt = (input, cpuAndMemoryCost, blockSize) => {
      let promise;
      const hexData = sjcl.codec.hex.fromBits(sjcl.codec.utf8String.toBits(input));
      promise = new Promise((resolve, reject) => {
        this.scryptPromises[hexData] = { promise, resolve, reject }; 
      });

      this.scryptWebWorker.postMessage({
        salt: hexSalt,
        data: hexData,
        cpuAndMemoryCost: cpuAndMemoryCost,
        blockSize: blockSize,
        keyLength: scryptKeyLength
      });

      return promise;
    };
    this.scryptWebWorker.onmessage = (e) => {
      if(e.data.errors && e.data.errors.length > 0) {
        this.scryptPromises[e.data.data].reject(e.data.errors);
      }
      this.scryptPromises[e.data.data].resolve(e.data.result);
    };
    
    this.setSecret = async (secret) => {
      currentUserSecret = sjcl.codec.hex.toBits(await this.scrypt(secret, derivationCpuAndMemoryCost, derivationBlockSize));
      currentUserSecretId = sjcl.hash.sha256.hash(secret);
    };

    this.getKeyId = () => sjcl.codec.hex.fromBits(currentUserSecretId);

    this.encrypt = (plaintextString) => {
      const plaintextBits =  sjcl.codec.utf8String.toBits(plaintextString);
      return encryptBits(plaintextBits, currentUserSecret, currentUserSecretId);
    };
    this.decrypt = (cyphertextBytes) => {
      const plaintextBits = decryptToBits(cyphertextBytes, currentUserSecret, currentUserSecretId);
      return sjcl.codec.utf8String.fromBits(plaintextBits);
    };

    this.hasSecret = () => currentUserSecret != null;

    this.hashWithSecretId = (input) => sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(`${this.getKeyId()}/${input}`));

    this.getEntropizer = () => {
      this.entropizer = {entropyScore:0};
      var lastHash = '';
      var entropy = 0;
      var lastCollectedX = 0;
      var lastCollectedY = 0;
      var currentlyHashing = false;
      var passphraseArray = [];

      var collectEntropy = window.setInterval(() => {
        if(passphraseArray.length == numberOfWordsInPhrase) {
          this.entropizer.entropyScore = 100;
          this.entropizer.passphrase = passphraseArray.join(' ');
          window.clearInterval(collectEntropy);
        } else {
          if(lastCollectedX != lastKnownOffsetX && lastCollectedY != lastKnownOffsetY && !currentlyHashing) {
            lastCollectedX = lastKnownOffsetX;
            lastCollectedY = lastKnownOffsetY;
            currentlyHashing = true;
            const osRandomBytes = new Uint8Array(16);
            window.crypto.getRandomValues(osRandomBytes);
            const osRandomBytesStr = sjcl.codec.base64.fromBits(sjcl.codec.bytes.toBits(osRandomBytes));
            const toHashString = `${osRandomBytesStr}${lastTimeStamp}${lastKnownOffsetX}${lastKnownOffsetY}${distanceOffsetX}${distanceOffsetY}${lastHash}`;
            const toHashHex = sjcl.codec.hex.fromBits(sjcl.codec.utf8String.toBits(toHashString));
            this.scrypt(toHashHex, prngCpuAndMemoryCost, prngBlockSize).then(resultHex => {
              const hashBits = sjcl.codec.hex.toBits(resultHex);
              lastHash = sjcl.codec.base64.fromBits(hashBits);
              entropy = entropy ^ hashBits[hashBits.length-1];
              hashCount ++;
              currentlyHashing = false;
            });
          }

          if(distanceOffsetX >= pixelDistanceRequiredForEntropy
              && distanceOffsetY >= pixelDistanceRequiredForEntropy
              && hashCount >= hashCountRequiredForEntropy) {
            console.log(Math.abs(entropy) % app.cryptoWordList.length);
            passphraseArray.push(app.cryptoWordList[Math.abs(entropy) % app.cryptoWordList.length]);
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
    
    const decryptToBits = (serializedEncryptedBytes, keyBits, keyIdBits) => {
    
      let encrypted;
      try {
        encrypted = parseEncryptedBytes(serializedEncryptedBytes)
      } catch (err) {
        throw new Error(`FormatError: File format was different from expected: ${err}: ${err.stack}`);
      }
    
      const initializationVectorAndCiphertext = new Uint8Array(encrypted.initializationVector.length+encrypted.ciphertext.length);
      initializationVectorAndCiphertext.set(encrypted.initializationVector);
      initializationVectorAndCiphertext.set(encrypted.ciphertext, encrypted.initializationVector.length);
    
      const hmac = new sjcl.misc.hmac(keyIdBits, sjcl.hash.sha256);
    
      hmac.update(sjcl.codec.bytes.toBits(initializationVectorAndCiphertext))
      const messageAuthenticationCode = sjcl.codec.bytes.fromBits(hmac.digest());
    
      if(!uint8ArrayEquals(messageAuthenticationCode, encrypted.messageAuthenticationCode)) {
        const wrongPassphraseError = new Error("WrongPassphraseError: MessageAuthenticationCode does not match");
        wrongPassphraseError.wrongPassphrase = true;
        throw wrongPassphraseError;
      }
    
      return sjcl.mode.cbc.decrypt(
        new sjcl.cipher.aes(keyBits), 
        sjcl.codec.bytes.toBits(encrypted.ciphertext), 
        sjcl.codec.bytes.toBits(encrypted.initializationVector)
      );
    }
    
    const encryptBits = (plaintextBits, keyBits, keyIdBits) => {
    
      let initializationVector = new Uint8Array(aesBlockSizeInBytes);
      window.crypto.getRandomValues(initializationVector);
    
      let hashOfPlaintext = sjcl.codec.bytes.fromBits(sjcl.hash.sha256.hash(plaintextBits))
    
      for(let i = 0; i < initializationVector.length; i++) {
        initializationVector[i] = initializationVector[i] ^ hashOfPlaintext[i % hashOfPlaintext.length]
      }
    
      const ciphertextBytes = sjcl.codec.bytes.fromBits(
        sjcl.mode.cbc.encrypt(
          new sjcl.cipher.aes(keyBits), 
          plaintextBits, 
          sjcl.codec.bytes.toBits(initializationVector)
        )
      );
    
      const initializationVectorAndCiphertext = new Uint8Array(initializationVector.length + ciphertextBytes.length);
      initializationVectorAndCiphertext.set(initializationVector);
      initializationVectorAndCiphertext.set(ciphertextBytes, initializationVector.length);
    
      const hmac = new sjcl.misc.hmac(keyIdBits, sjcl.hash.sha256);
      hmac.update(sjcl.codec.bytes.toBits(initializationVectorAndCiphertext))
      const messageAuthenticationCode = sjcl.codec.bytes.fromBits(hmac.digest());
    
      return serializeEncryptedBytes(initializationVector, ciphertextBytes, messageAuthenticationCode)
    }
    
    function serializeEncryptedBytes(initializationVector, ciphertext, messageAuthenticationCode) {
      const versionNumber = SUPPORTED_VERSION;
    
      const totalLength = (bytesInAUint32 * 4) + initializationVector.length + ciphertext.length + messageAuthenticationCode.length;
      const buffer = new ArrayBuffer(totalLength);
      const dataView = new DataView(buffer);
      let currentOffset = 0;
    
      dataView.setUint32(currentOffset, versionNumber, true);
      currentOffset += bytesInAUint32;
    
      const writeByteArray = (byteArray) => {
        dataView.setUint32(currentOffset, byteArray.length, true);
        currentOffset += bytesInAUint32;
        for(let i = 0; i < byteArray.length; i++) {
          dataView.setUint8(currentOffset + i, byteArray[i], true)
        }
        currentOffset += byteArray.length;
      }
    
      writeByteArray(initializationVector);
      writeByteArray(ciphertext);
      writeByteArray(messageAuthenticationCode);
      
      return new Uint8Array(buffer);
    }
    
    function parseEncryptedBytes(serializedEncryptedBytes) {
      const toReturn = {};
      let dataView;
      if(serializedEncryptedBytes instanceof ArrayBuffer) {
        dataView = new DataView(serializedEncryptedBytes);
      } else if(serializedEncryptedBytes instanceof Uint8Array) {
        dataView = new DataView(serializedEncryptedBytes.buffer);
      } else if(serializedEncryptedBytes instanceof Array && serializedEncryptedBytes.every(x => typeof x == "number" && x >= 0 && x <= 255)) { 
        dataView = new DataView(Uint8Array.from(serializedEncryptedBytes).buffer);
      } else {
        throw new Error("You must pass an ArrayBuffer or other byte-array like object to parseEncryptedBytes.");
      }

      let currentOffset = 0;
      const versionNumber = dataView.getUint32(currentOffset, true);
      currentOffset += bytesInAUint32;
      if(versionNumber != SUPPORTED_VERSION) {
        //console.log(serializedEncryptedBytes.toString('utf-8'))
        throw new Error(`unsupported serialization version number ${versionNumber}`)
      }
    
      const readByteArray = (name, expectedLength) => {
        const length = dataView.getUint32(currentOffset, true);
        currentOffset += bytesInAUint32;
        if(expectedLength > 0 && length != expectedLength) {
          throw new Error(`given ${name}Length (${length}) != expectedLength (${expectedLength})`)
        }
        toReturn[name] = new Uint8Array(length);
        for(let i = 0; i < length; i++) {
          toReturn[name][i] = dataView.getUint8(currentOffset + i, true)
          
        }
        currentOffset += length;
      }
    
      readByteArray("initializationVector", aesBlockSizeInBytes)
      readByteArray("ciphertext", -1)
      readByteArray("messageAuthenticationCode", sha256OutputSizeInBytes)
    
      return toReturn;
    }
    
    function uint8ArrayEquals(a, b) {
      if (a.length != b.length) return false;
      for (var i = 0 ; i != a.length ; i++) {
        if (a[i] != b[i]) {
          return false;
        }
      }
      return true;
    }

  })();
})(window.sequentialReadPasswordManager, window, document);

(function(app, window, document, undefined) {

  app.http = (method, url, headers, content, responseType) =>
    new Promise((resolve, reject) => {
      headers = headers || {};
      var httpRequest = new XMLHttpRequest();
      httpRequest.responseType = responseType || "text";
      httpRequest.onloadend = () => {
        //console.log(`httpRequest.onloadend: ${httpRequest.status} ${url}`);
        if (httpRequest.status < 300) {
          if(httpRequest.getResponseHeader("Content-Length") == "0") {
            resolve();
          } else {
            if(responseType == "arraybuffer") {
              if(httpRequest.response.byteLength == 0) {
                resolve();
                return;
              }
              let jsonFailed = false;
              let responseString;
              try {
                responseString = app.cryptoService.decrypt(httpRequest.response);
              } catch (err) {
                window.onerror(`unable to decrypt '${url}': ${err.message} `, null, null, null, err);
                reject(false);
                return;
              }
              try {
                resolve(JSON.parse(responseString));
              } catch (err) {
                jsonFailed  = true;
              }
              if(jsonFailed) {
                resolve(responseString);
              }
            } else {
              resolve(httpRequest.responseText);
            }
          }
        } else {
          reject(false);
        }
      };
      //httpRequest.onerror = () => {
      //  console.log(`httpRequest.onerror: ${httpRequest.status} ${url}`);
      //  reject(false);
      //};
      httpRequest.ontimeout = () => {
        //console.log(`httpRequest.ontimeout: ${httpRequest.status} ${url}`);
        reject(true);
      };

      // Encrypt Content first
      if(content) {
        if(typeof content == "object") {
          content = JSON.stringify(content, 0, 2);
        }
        content = app.cryptoService.encrypt(content);
      }

      // AWS S3 request interceptor
      if(url.startsWith(app.s3InterceptorSymbol)) {
        var path = url.replace(app.s3InterceptorSymbol, '');
        var s3Request = app.awsClient.s3Request(method, app.S3BucketRegion, app.S3BucketName, path, content);
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

})(window.sequentialReadPasswordManager, window, document);



(function(app, window, document, undefined){
  app.storageService = new (function StorageService(localStorageKeyPrefix, s3InterceptorSymbol, storageBaseUrl, http, cryptoService) {

    function RequestFailure(isTimeout) {
      this.isTimeout = isTimeout;
    }

    var requestsCurrentlyInFlight = 0;

    var httpButAlwaysResolves = (method, url, headers, content, responseType) =>
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

        http(method, url, headers, content, responseType)
        .then(
          (result) => resolveAndPopInFlight(result),
          (isTimeout) => resolveAndPopInFlight(new RequestFailure(isTimeout))
        );

      });

    this.isStoredLocally = (id) => {
      return !!window.localStorage[`${localStorageKeyPrefix}${id}`];
    };

    this.get = (id) => {
      return Promise.all([
        httpButAlwaysResolves('GET', `${storageBaseUrl}/${id}`, {'Accept': 'application/octet-stream'}, null, "arraybuffer"),
        httpButAlwaysResolves('GET', `${s3InterceptorSymbol}${id}`, {'Accept': 'application/octet-stream'}, null, "arraybuffer")
      ]).then((results) => {
        return new Promise((resolve, reject) => {
          const localCopyCiphertext64 = window.localStorage[`${localStorageKeyPrefix}${id}`];
          const localCopyCiphertextBytes = sjcl.codec.bytes.fromBits(sjcl.codec.base64.toBits(localCopyCiphertext64));
          var localCopy;
          try {
            localCopy = localCopyCiphertextBytes ? JSON.parse(cryptoService.decrypt(localCopyCiphertextBytes)) : null;
          } catch (err) {
            window.onerror(`unable to decrypt 'window.localStorage["${localStorageKeyPrefix}${id}"]': ${err.message} `, null, null, null, err);
          }
          var sequentialreadCopy = results[0];
          var s3Copy = results[1];
          var allCopies = [];
          if(localCopy) {
            allCopies.push(localCopy);
          }
          if(!(sequentialreadCopy instanceof RequestFailure) && sequentialreadCopy && sequentialreadCopy.lastUpdated) {
            allCopies.push(sequentialreadCopy);
          }
          if(!(s3Copy instanceof RequestFailure) && s3Copy && s3Copy.lastUpdated) {
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
      const localCopyCiphertextBytes = cryptoService.encrypt(JSON.stringify(content));
      window.localStorage[`${localStorageKeyPrefix}${id}`] = sjcl.codec.base64.fromBits(sjcl.codec.bytes.toBits(localCopyCiphertextBytes));
      return Promise.all([
        httpButAlwaysResolves('PUT', `${storageBaseUrl}/${id}`, {'Content-Type': 'application/octet-stream'}, content, "arraybuffer"),
        httpButAlwaysResolves('PUT', `${s3InterceptorSymbol}${id}`, {'Content-Type': 'application/octet-stream'}, content, "arraybuffer")
      ]).then(() => content)
    };
    this.delete = (id) => {
      window.localStorage.removeItem(`${localStorageKeyPrefix}${id}`);
      return Promise.all([
        httpButAlwaysResolves('DELETE', `${storageBaseUrl}/${id}`),
        httpButAlwaysResolves('DELETE', `${s3InterceptorSymbol}${id}`)
      ]).then(() => null);
    };
  })(app.localStorageKeyPrefix, app.s3InterceptorSymbol, app.storageBaseUrl, app.http, app.cryptoService);
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
      document.getElementById('progress-container').style.display = 'none';
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
})(window.sequentialReadPasswordManager, window, document);

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
            var newId = cryptoService.hashWithSecretId(newName);
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
            id: cryptoService.hashWithSecretId(newFileName),
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
        fileListDocument => {
          // attempt to load all the files that are not already stored locally
          // this way if the user tries to open a file that they have never opened before
          // when they are offline, it should work.

          // console.log(fileListDocument.files
          //   .filter(x => !storageService.isStoredLocally(x.id)).map(x => x.name))

          // console.log(fileListDocument.files
          //   .filter(x => !storageService.isStoredLocally(x.id)).map(x => x.id))

          fileListDocument.files
            .filter(x => !storageService.isStoredLocally(x.id))
            .map(file => storageService.get(file.id).then(
              () => {}, 
              err => console.log(`could not cache file "${file.name}"`, err)
            ));

          return renderFileList(fileListDocument);
        },
        () => {
          modalService.open(
            "New Index File",
            "Are you sure you want to make a new index file?",
            (resolve, reject) => {},
            [{
              innerHTML: "Log Out",
              escapeKey: true,
              onclick: (resolve, reject) => reject()
            },
            {
              innerHTML: "Create & Potentially Overwrite",
              enterKey: false,
              onclick: (resolve, reject) => resolve()
            }]
          )
          .then(
            () => {
              storageService.put(cryptoService.getKeyId(), this.fileListDocument)
              .then(
                () => renderFileList(this.fileListDocument),
                () => null //TODO error handler
              );
            },
            () => {
              window.location = window.location.origin;
              return null;
            }
          );
        }
      );
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

  app.splashController = new (function SplashController(localStorageKeyPrefix, http, cryptoService, navController, fileListController) {

    document.getElementById('generate-encryption-secret-button').onclick = () => {
      document.getElementById('progress-bar-holder').style.display = 'block';

      var entropizer = cryptoService.getEntropizer();

      var checkInterval = window.setInterval(() => {
        this.generatingNewSecretProgress = document.getElementById('entropy-progress-bar').style.width = `${entropizer.entropyScore}%`;
        if(entropizer.entropyScore >= 100) {
          document.getElementById('encryption-secret').value = entropizer.passphrase;
          document.getElementById('encryption-secret').type = 'text';
          window.clearInterval(checkInterval);
          document.getElementById('progress-bar-holder').style.display = 'none';
          document.getElementById('entropy-progress-bar').style.width = '0';
        }
      }, 100);
    };

    var onContinueClicked = () => {
      document.getElementById('progress-container').style.display = 'block';

      cryptoService.setSecret(document.getElementById('encryption-secret').value).then(() => {

        document.getElementById('progress-container').style.display = 'none';

        document.getElementById('logout-link-container').style.display = "inline";
        document.getElementById('encryption-secret').value = '';
        document.getElementById('encryption-secret').type = 'password';
        navController.navigate('file-list-content');
        fileListController.load();
      });
    };

    var KEYCODE_ENTER = 13;
    window.addEventListener("keydown", (event) => {
      if(event.keyCode == KEYCODE_ENTER && document.getElementById('splash-content').style.display != 'none') {
        onContinueClicked();
      }
    }, false);

    document.getElementById('splash-continue-button').onclick = onContinueClicked;

    // Force a reload if the version changed (gets around issues with Application Cache)
    http('GET', 'version', {}, null)
    .then(
      (currentVersion) => {
        var lastVersion = window.localStorage[`${localStorageKeyPrefix}version`];
        if(currentVersion && currentVersion != lastVersion) {
          
          console.log(`reloading service worker due to new app version: ${currentVersion}`)
          window.localStorage[`${localStorageKeyPrefix}version`] = currentVersion;
          if(navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({clearCache: true});
          }
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
              registration.unregister()
            }) 
          });

          document.getElementById('progress-container').style.display = 'block';
          window.setTimeout(function(){
            window.location = window.location.origin;
          }, 1000);
        }
      },
      () => {}
    )

  })(app.localStorageKeyPrefix, app.http, app.cryptoService, app.navController, app.fileListController);
})(window.sequentialReadPasswordManager, window, document);
