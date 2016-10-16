// 9 chosen out of a dictionary with over 9000 words ~= 128 bits
var numberOfWordsInPhrase = 9;
var lengthOfKeySegment = 4;
var pixelDistanceRequiredForEntropy = 250;
var hashCountRequiredForEntropy = 3;

var CryptoService = ['sjcl', 'words', '$document', '$interval', function (sjcl, words, $document, $interval) {

  var lastKnownOffsetX = 0;
  var lastKnownOffsetY = 0;
  var distanceOffsetX = 0;
  var distanceOffsetY = 0;
  var hashCount = 0;
  var lastTimeStamp = 0;
  angular.element($document).on('mousemove', (mouseEvent) => {
    distanceOffsetX += Math.abs(lastKnownOffsetX - mouseEvent.offsetX);
    distanceOffsetY += Math.abs(lastKnownOffsetY - mouseEvent.offsetY);
    lastKnownOffsetX = mouseEvent.offsetX;
    lastKnownOffsetY = mouseEvent.offsetY;
    lastTimeStamp = mouseEvent.timeStamp;
  });

  var currentUserPassphrase = '';
  this.setPassphrase = (passphrase) => {
    currentUserPassphrase = passphrase;
  };

  this.isLoggedIn = () => currentUserPassphrase != '';

  this.getPassphraseEntropizer = () => {
    this.entropizer = {entropyScore:0};
    var lastHash = '';
    var entropy = 0;
    var lastCollectedX = 0;
    var lastCollectedY = 0;
    var passphraseArray = [];

    var collectEntropy = $interval(() => {
      if(passphraseArray.length == numberOfWordsInPhrase) {
        this.entropizer.entropyScore = 100;
        this.entropizer.passphrase = passphraseArray.join(' ');
        $interval.cancel(collectEntropy);
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
          passphraseArray.push(words[Math.abs(entropy) % words.length]);
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




}];

export default function registerService (module) {
  module.service('CryptoService', CryptoService);
}
