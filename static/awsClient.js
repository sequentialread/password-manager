'use strict';

(function(app, document, undefined) {
  app.awsClient = new (function AWSClient(sjcl, awsAccessKeyId, awsSecretAccessKey ) {
    var EMPTY_BODY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    var SCHEME = "AWS4";
    var ALGORITHM = "HMAC-SHA256";
    var TERMINATOR = "aws4_request";

    var X_Amz_Algorithm = "X-Amz-Algorithm";
    var X_Amz_Credential = "X-Amz-Credential";
    var X_Amz_SignedHeaders = "X-Amz-SignedHeaders";
    var X_Amz_Date = "X-Amz-Date";
    var X_Amz_Signature = "X-Amz-Signature";
    var X_Amz_Expires = "X-Amz-Expires";
    var X_Amz_Content_SHA256 = "X-Amz-Content-SHA256";
    var X_Amz_Decoded_Content_Length = "X-Amz-Decoded-Content-Length";
    var X_Amz_Meta_UUID = "X-Amz-Meta-UUID";

    var HMACSHA256 = "HMACSHA256";

    var CompressWhitespaceRegex = /\s+/g;

    var CanonicalRequestHashAlgorithm = "SHA-256";

    function canonicalizeHeaderNames(headers) {
      return Object.keys(headers).map(x => x.toLowerCase()).sort().join(";");
    }

    function canonicalizeHeaders(headers)
    {
        if (headers == null || Object.keys(headers).length == 0) {
          return "";
        }

        var headersLowerCase = {};
        Object.keys(headers).forEach(x => headersLowerCase[x.toLowerCase()] = headers[x]);
        return Object.keys(headersLowerCase)
          .sort()
          .map(x => `${x}:${headersLowerCase[x].replace(CompressWhitespaceRegex, " ").trim()}\n`)
          .join("");
    }

    function canonicalizeRequest(httpMethod,
                                 endpointUri,
                                 queryParameters,
                                 canonicalizedHeaders,
                                 canonicalizedHeaderNames,
                                 bodyHash) {
        return `${httpMethod}\n${CanonicalResourcePath(endpointUri)}\n${queryParameters}\n`
             + `${canonicalizedHeaders}\n${canonicalizedHeaderNames}\n${bodyHash}`;
    }

    var dummyElement = document.createElement('a');
    function CanonicalResourcePath(endpointUri) {
      dummyElement.href = endpointUri;
      if(!dummyElement.pathname) {
        return "/";
      }
      return encodeURI(dummyElement.pathname);
    }

    var utf8ToBits = sjcl.codec.utf8String.toBits;
    function deriveSigningKey(date, region, service) {
        var ksecret = `${SCHEME}${awsSecretAccessKey}`

        var hashDate = new sjcl.misc.hmac(utf8ToBits(ksecret), sjcl.hash.sha256).encrypt(utf8ToBits(date));
        var hashRegion = new sjcl.misc.hmac(hashDate, sjcl.hash.sha256).encrypt(utf8ToBits(region));
        var hashService = new sjcl.misc.hmac(hashRegion, sjcl.hash.sha256).encrypt(utf8ToBits(service));
        return new sjcl.misc.hmac(hashService, sjcl.hash.sha256).encrypt(utf8ToBits(TERMINATOR));
    }

    function toHexString(data, lowercase) {
        var toReturn = sjcl.codec.hex.fromBits(data);
        return lowercase ? toReturn : toReturn.toUpperCase();
    }

    // var ISO8601BasicFormat = "yyyyMMddTHHmmssZ";
    function ISO8601BasicFormat(date) {
      return `${date.toISOString().replace(/[-\.:]/g, '').substring(0,15)}Z`;
    }

    function lpad1(n) {
      return (n < 10) ? ("0" + String(n)) : String(n);
    }

    // returns the byte length of an utf8 string
    function byteLength(str) {
      var s = str.length;
      for (var i=str.length-1; i>=0; i--) {
        var code = str.charCodeAt(i);
        if (code > 0x7f && code <= 0x7ff) s++;
        else if (code > 0x7ff && code <= 0xffff) s+=2;
        if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
      }
      return s;
    }

    this.s3Request = (httpMethod, region, bucketName, objectKey, objectValue) => {

      var regionUrlPart = (region && region.toLowerCase() != "us-east-1") ? `-${region}` : "";
      var endpointUri = `https://${bucketName}.s3${regionUrlPart}.amazonaws.com/${objectKey}`;

      var headers = {};

      var bodyHash = EMPTY_BODY_SHA256;
      if(httpMethod == "PUT" || httpMethod == "POST") {
        if(typeof objectValue == "object") {
          headers["content-type"] = "application/json";
          objectValue = JSON.stringify(objectValue, 0, 2);
        } else {
          headers["content-type"] = "text/plain";
        }
        headers["content-length"] = String(byteLength(objectValue));
        bodyHash = toHexString(sjcl.hash.sha256.hash(sjcl.codec.utf8String.toBits(objectValue)), true);
      } else {
        headers["content-type"] = "text/plain";
      }
      headers[X_Amz_Content_SHA256] = bodyHash;

      var request = {
        service: 's3',
        region: region,
        httpMethod: httpMethod,
        endpointUri: endpointUri,
        queryParameters: '',
        headers: headers,
        bodyHash: bodyHash,
        bodyString: objectValue
      };

      headers["Authorization"] = this.awsSignatureV4AuthorizationHeader(request);

      return request;
    };

    // aws4Request is an object which has keys:
    //service, region, httpMethod, endpointUri, queryParameters, headers, bodyHash
    this.awsSignatureV4AuthorizationHeader = (aws4Request) => {
      // this was once used for testing against a known working implementation
      //var dateTime = new Date(1553021296000);

      // update the headers with required 'x-amz-date' and 'host' values
      var dateTime = new Date();
      var dateTimeStamp = ISO8601BasicFormat(dateTime);
      aws4Request.headers[X_Amz_Date] = dateTimeStamp;

      dummyElement.href = aws4Request.endpointUri;
      var hostHeader = dummyElement.host;
      if (dummyElement.port) {
        hostHeader = `${hostHeader}:${dummyElement.port}`
      }
      aws4Request.headers["Host"] = hostHeader;

      // canonicalize the headers; we need the set of header names as well as the
      // names and values to go into the signature process
      var canonicalizedHeaderNames = canonicalizeHeaderNames(aws4Request.headers);
      var canonicalizedHeaders = canonicalizeHeaders(aws4Request.headers);

      // if any query string parameters have been supplied, canonicalize them
      // (note this sample assumes any required url encoding has been done already)
      var canonicalizedQueryParameters = '';
      if (aws4Request.queryParameters) {
          var paramDictionary = {};
          aws4Request.queryParameters.split('&').map(p => p.split('='))
                                    .forEach(kv => paramDictionary[kv[0]] = kv.length > 1 ? kv[1] : "");

          var sortedKeys = Object.keys(paramDictionary).sort();
          return sortedKeys.map(x => `${x}=${paramDictionary[x]}`).join('&');
      }

      // canonicalize the various components of the request
      var canonicalRequest = canonicalizeRequest(aws4Request.httpMethod,
                                                 aws4Request.endpointUri,
                                                 canonicalizedQueryParameters,
                                                 canonicalizedHeaders,
                                                 canonicalizedHeaderNames,
                                                 aws4Request.bodyHash);
      //console.log(`\nCanonicalRequest:\n${canonicalRequest}`);

      // generate a hash of the canonical request, to go into signature computation
      var canonicalRequestHashBits = sjcl.hash.sha256.hash(sjcl.codec.utf8String.toBits(canonicalRequest));

      var dateStamp = dateTimeStamp.substring(0, 8);
      var scope = `${dateStamp}/${aws4Request.region}/${aws4Request.service}/${TERMINATOR}`;
      var stringToSign = `${SCHEME}-${ALGORITHM}\n${dateTimeStamp}\n${scope}\n${toHexString(canonicalRequestHashBits, true)}`;

      //console.log(`\nStringToSign:\n${stringToSign}`);


      var signingKey =  deriveSigningKey(dateStamp, aws4Request.region, aws4Request.service);
      //console.log(`\nKey:\n${toHexString(signingKey, true)}`);

      var signature = new sjcl.misc.hmac(signingKey, sjcl.hash.sha256).encrypt(utf8ToBits(stringToSign));
      var signatureString = toHexString(signature, true);
      //console.log(`\nSignature:\n${signatureString}`);

      var authorization = `${SCHEME}-${ALGORITHM} Credential=${awsAccessKeyId}/${scope}, `
                        + `SignedHeaders=${canonicalizedHeaderNames}, Signature=${signatureString}`;

      //console.log(`\nAuthorization:\n${authorization}`);
      return authorization;
    };
  })(app.sjcl, app.AWSAccessKeyId, app.AWSSecretAccessKey);
})(window.sequentialReadPasswordManager, document);
