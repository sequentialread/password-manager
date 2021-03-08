'use strict';

(function(app, document, undefined) {

   /**
   * [js-md5]{@link https://github.com/emn178/js-md5}
   *
   * @namespace md5
   * @version 0.7.3
   * @author Chen, Yi-Cyuan [emn178@gmail.com]
   * @copyright Chen, Yi-Cyuan 2014-2017
   * @license MIT
   */
  // slightly modified the raw minified version of this script 
  (function(app){"use strict";
    function t(t){if(t)d[0]=d[16]=d[1]=d[2]=d[3]=d[4]=d[5]=d[6]=d[7]=d[8]=d[9]=d[10]=d[11]=d[12]=d[13]=d[14]=d[15]=0,this.blocks=d,this.buffer8=l;else if(a){var r=new ArrayBuffer(68);this.buffer8=new Uint8Array(r),this.blocks=new Uint32Array(r)}else this.blocks=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];this.h0=this.h1=this.h2=this.h3=this.start=this.bytes=this.hBytes=0,this.finalized=this.hashed=!1,this.first=!0}var r="input is invalid type",e="object"==typeof window,i=e?window:{};i.JS_MD5_NO_WINDOW&&(e=!1);var s=!e&&"object"==typeof self,h=!i.JS_MD5_NO_NODE_JS&&"object"==typeof process&&process.versions&&process.versions.node;h?i=global:s&&(i=self);var f=!i.JS_MD5_NO_COMMON_JS&&"object"==typeof module&&module.exports,o="function"==typeof define&&define.amd,a=!i.JS_MD5_NO_ARRAY_BUFFER&&"undefined"!=typeof ArrayBuffer,n="0123456789abcdef".split(""),u=[128,32768,8388608,-2147483648],y=[0,8,16,24],c=["hex","array","digest","buffer","arrayBuffer","base64"],p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split(""),d=[],l;if(a){var A=new ArrayBuffer(68);l=new Uint8Array(A),d=new Uint32Array(A)}!i.JS_MD5_NO_NODE_JS&&Array.isArray||(Array.isArray=function(t){return"[object Array]"===Object.prototype.toString.call(t)}),!a||!i.JS_MD5_NO_ARRAY_BUFFER_IS_VIEW&&ArrayBuffer.isView||(ArrayBuffer.isView=function(t){return"object"==typeof t&&t.buffer&&t.buffer.constructor===ArrayBuffer});var b=function(r){return function(e){return new t(!0).update(e)[r]()}},v=function(){var r=b("hex");h&&(r=w(r)),r.create=function(){return new t},r.update=function(t){return r.create().update(t)};for(var e=0;e<c.length;++e){var i=c[e];r[i]=b(i)}return r},w=function(t){var e=eval("require('crypto')"),i=eval("require('buffer').Buffer"),s=function(s){if("string"==typeof s)return e.createHash("md5").update(s,"utf8").digest("hex");if(null===s||void 0===s)throw r;return s.constructor===ArrayBuffer&&(s=new Uint8Array(s)),Array.isArray(s)||ArrayBuffer.isView(s)||s.constructor===i?e.createHash("md5").update(new i(s)).digest("hex"):t(s)};return s};t.prototype.update=function(t){if(!this.finalized){var e,i=typeof t;if("string"!==i){if("object"!==i)throw r;if(null===t)throw r;if(a&&t.constructor===ArrayBuffer)t=new Uint8Array(t);else if(!(Array.isArray(t)||a&&ArrayBuffer.isView(t)))throw r;e=!0}for(var s,h,f=0,o=t.length,n=this.blocks,u=this.buffer8;f<o;){if(this.hashed&&(this.hashed=!1,n[0]=n[16],n[16]=n[1]=n[2]=n[3]=n[4]=n[5]=n[6]=n[7]=n[8]=n[9]=n[10]=n[11]=n[12]=n[13]=n[14]=n[15]=0),e)if(a)for(h=this.start;f<o&&h<64;++f)u[h++]=t[f];else for(h=this.start;f<o&&h<64;++f)n[h>>2]|=t[f]<<y[3&h++];else if(a)for(h=this.start;f<o&&h<64;++f)(s=t.charCodeAt(f))<128?u[h++]=s:s<2048?(u[h++]=192|s>>6,u[h++]=128|63&s):s<55296||s>=57344?(u[h++]=224|s>>12,u[h++]=128|s>>6&63,u[h++]=128|63&s):(s=65536+((1023&s)<<10|1023&t.charCodeAt(++f)),u[h++]=240|s>>18,u[h++]=128|s>>12&63,u[h++]=128|s>>6&63,u[h++]=128|63&s);else for(h=this.start;f<o&&h<64;++f)(s=t.charCodeAt(f))<128?n[h>>2]|=s<<y[3&h++]:s<2048?(n[h>>2]|=(192|s>>6)<<y[3&h++],n[h>>2]|=(128|63&s)<<y[3&h++]):s<55296||s>=57344?(n[h>>2]|=(224|s>>12)<<y[3&h++],n[h>>2]|=(128|s>>6&63)<<y[3&h++],n[h>>2]|=(128|63&s)<<y[3&h++]):(s=65536+((1023&s)<<10|1023&t.charCodeAt(++f)),n[h>>2]|=(240|s>>18)<<y[3&h++],n[h>>2]|=(128|s>>12&63)<<y[3&h++],n[h>>2]|=(128|s>>6&63)<<y[3&h++],n[h>>2]|=(128|63&s)<<y[3&h++]);this.lastByteIndex=h,this.bytes+=h-this.start,h>=64?(this.start=h-64,this.hash(),this.hashed=!0):this.start=h}return this.bytes>4294967295&&(this.hBytes+=this.bytes/4294967296<<0,this.bytes=this.bytes%4294967296),this}},t.prototype.finalize=function(){if(!this.finalized){this.finalized=!0;var t=this.blocks,r=this.lastByteIndex;t[r>>2]|=u[3&r],r>=56&&(this.hashed||this.hash(),t[0]=t[16],t[16]=t[1]=t[2]=t[3]=t[4]=t[5]=t[6]=t[7]=t[8]=t[9]=t[10]=t[11]=t[12]=t[13]=t[14]=t[15]=0),t[14]=this.bytes<<3,t[15]=this.hBytes<<3|this.bytes>>>29,this.hash()}},t.prototype.hash=function(){var t,r,e,i,s,h,f=this.blocks;this.first?r=((r=((t=((t=f[0]-680876937)<<7|t>>>25)-271733879<<0)^(e=((e=(-271733879^(i=((i=(-1732584194^2004318071&t)+f[1]-117830708)<<12|i>>>20)+t<<0)&(-271733879^t))+f[2]-1126478375)<<17|e>>>15)+i<<0)&(i^t))+f[3]-1316259209)<<22|r>>>10)+e<<0:(t=this.h0,r=this.h1,e=this.h2,r=((r+=((t=((t+=((i=this.h3)^r&(e^i))+f[0]-680876936)<<7|t>>>25)+r<<0)^(e=((e+=(r^(i=((i+=(e^t&(r^e))+f[1]-389564586)<<12|i>>>20)+t<<0)&(t^r))+f[2]+606105819)<<17|e>>>15)+i<<0)&(i^t))+f[3]-1044525330)<<22|r>>>10)+e<<0),r=((r+=((t=((t+=(i^r&(e^i))+f[4]-176418897)<<7|t>>>25)+r<<0)^(e=((e+=(r^(i=((i+=(e^t&(r^e))+f[5]+1200080426)<<12|i>>>20)+t<<0)&(t^r))+f[6]-1473231341)<<17|e>>>15)+i<<0)&(i^t))+f[7]-45705983)<<22|r>>>10)+e<<0,r=((r+=((t=((t+=(i^r&(e^i))+f[8]+1770035416)<<7|t>>>25)+r<<0)^(e=((e+=(r^(i=((i+=(e^t&(r^e))+f[9]-1958414417)<<12|i>>>20)+t<<0)&(t^r))+f[10]-42063)<<17|e>>>15)+i<<0)&(i^t))+f[11]-1990404162)<<22|r>>>10)+e<<0,r=((r+=((t=((t+=(i^r&(e^i))+f[12]+1804603682)<<7|t>>>25)+r<<0)^(e=((e+=(r^(i=((i+=(e^t&(r^e))+f[13]-40341101)<<12|i>>>20)+t<<0)&(t^r))+f[14]-1502002290)<<17|e>>>15)+i<<0)&(i^t))+f[15]+1236535329)<<22|r>>>10)+e<<0,r=((r+=((i=((i+=(r^e&((t=((t+=(e^i&(r^e))+f[1]-165796510)<<5|t>>>27)+r<<0)^r))+f[6]-1069501632)<<9|i>>>23)+t<<0)^t&((e=((e+=(t^r&(i^t))+f[11]+643717713)<<14|e>>>18)+i<<0)^i))+f[0]-373897302)<<20|r>>>12)+e<<0,r=((r+=((i=((i+=(r^e&((t=((t+=(e^i&(r^e))+f[5]-701558691)<<5|t>>>27)+r<<0)^r))+f[10]+38016083)<<9|i>>>23)+t<<0)^t&((e=((e+=(t^r&(i^t))+f[15]-660478335)<<14|e>>>18)+i<<0)^i))+f[4]-405537848)<<20|r>>>12)+e<<0,r=((r+=((i=((i+=(r^e&((t=((t+=(e^i&(r^e))+f[9]+568446438)<<5|t>>>27)+r<<0)^r))+f[14]-1019803690)<<9|i>>>23)+t<<0)^t&((e=((e+=(t^r&(i^t))+f[3]-187363961)<<14|e>>>18)+i<<0)^i))+f[8]+1163531501)<<20|r>>>12)+e<<0,r=((r+=((i=((i+=(r^e&((t=((t+=(e^i&(r^e))+f[13]-1444681467)<<5|t>>>27)+r<<0)^r))+f[2]-51403784)<<9|i>>>23)+t<<0)^t&((e=((e+=(t^r&(i^t))+f[7]+1735328473)<<14|e>>>18)+i<<0)^i))+f[12]-1926607734)<<20|r>>>12)+e<<0,r=((r+=((h=(i=((i+=((s=r^e)^(t=((t+=(s^i)+f[5]-378558)<<4|t>>>28)+r<<0))+f[8]-2022574463)<<11|i>>>21)+t<<0)^t)^(e=((e+=(h^r)+f[11]+1839030562)<<16|e>>>16)+i<<0))+f[14]-35309556)<<23|r>>>9)+e<<0,r=((r+=((h=(i=((i+=((s=r^e)^(t=((t+=(s^i)+f[1]-1530992060)<<4|t>>>28)+r<<0))+f[4]+1272893353)<<11|i>>>21)+t<<0)^t)^(e=((e+=(h^r)+f[7]-155497632)<<16|e>>>16)+i<<0))+f[10]-1094730640)<<23|r>>>9)+e<<0,r=((r+=((h=(i=((i+=((s=r^e)^(t=((t+=(s^i)+f[13]+681279174)<<4|t>>>28)+r<<0))+f[0]-358537222)<<11|i>>>21)+t<<0)^t)^(e=((e+=(h^r)+f[3]-722521979)<<16|e>>>16)+i<<0))+f[6]+76029189)<<23|r>>>9)+e<<0,r=((r+=((h=(i=((i+=((s=r^e)^(t=((t+=(s^i)+f[9]-640364487)<<4|t>>>28)+r<<0))+f[12]-421815835)<<11|i>>>21)+t<<0)^t)^(e=((e+=(h^r)+f[15]+530742520)<<16|e>>>16)+i<<0))+f[2]-995338651)<<23|r>>>9)+e<<0,r=((r+=((i=((i+=(r^((t=((t+=(e^(r|~i))+f[0]-198630844)<<6|t>>>26)+r<<0)|~e))+f[7]+1126891415)<<10|i>>>22)+t<<0)^((e=((e+=(t^(i|~r))+f[14]-1416354905)<<15|e>>>17)+i<<0)|~t))+f[5]-57434055)<<21|r>>>11)+e<<0,r=((r+=((i=((i+=(r^((t=((t+=(e^(r|~i))+f[12]+1700485571)<<6|t>>>26)+r<<0)|~e))+f[3]-1894986606)<<10|i>>>22)+t<<0)^((e=((e+=(t^(i|~r))+f[10]-1051523)<<15|e>>>17)+i<<0)|~t))+f[1]-2054922799)<<21|r>>>11)+e<<0,r=((r+=((i=((i+=(r^((t=((t+=(e^(r|~i))+f[8]+1873313359)<<6|t>>>26)+r<<0)|~e))+f[15]-30611744)<<10|i>>>22)+t<<0)^((e=((e+=(t^(i|~r))+f[6]-1560198380)<<15|e>>>17)+i<<0)|~t))+f[13]+1309151649)<<21|r>>>11)+e<<0,r=((r+=((i=((i+=(r^((t=((t+=(e^(r|~i))+f[4]-145523070)<<6|t>>>26)+r<<0)|~e))+f[11]-1120210379)<<10|i>>>22)+t<<0)^((e=((e+=(t^(i|~r))+f[2]+718787259)<<15|e>>>17)+i<<0)|~t))+f[9]-343485551)<<21|r>>>11)+e<<0,this.first?(this.h0=t+1732584193<<0,this.h1=r-271733879<<0,this.h2=e-1732584194<<0,this.h3=i+271733878<<0,this.first=!1):(this.h0=this.h0+t<<0,this.h1=this.h1+r<<0,this.h2=this.h2+e<<0,this.h3=this.h3+i<<0)},t.prototype.hex=function(){this.finalize();var t=this.h0,r=this.h1,e=this.h2,i=this.h3;return n[t>>4&15]+n[15&t]+n[t>>12&15]+n[t>>8&15]+n[t>>20&15]+n[t>>16&15]+n[t>>28&15]+n[t>>24&15]+n[r>>4&15]+n[15&r]+n[r>>12&15]+n[r>>8&15]+n[r>>20&15]+n[r>>16&15]+n[r>>28&15]+n[r>>24&15]+n[e>>4&15]+n[15&e]+n[e>>12&15]+n[e>>8&15]+n[e>>20&15]+n[e>>16&15]+n[e>>28&15]+n[e>>24&15]+n[i>>4&15]+n[15&i]+n[i>>12&15]+n[i>>8&15]+n[i>>20&15]+n[i>>16&15]+n[i>>28&15]+n[i>>24&15]},t.prototype.toString=t.prototype.hex,t.prototype.digest=function(){this.finalize();var t=this.h0,r=this.h1,e=this.h2,i=this.h3;return[255&t,t>>8&255,t>>16&255,t>>24&255,255&r,r>>8&255,r>>16&255,r>>24&255,255&e,e>>8&255,e>>16&255,e>>24&255,255&i,i>>8&255,i>>16&255,i>>24&255]},t.prototype.array=t.prototype.digest,t.prototype.arrayBuffer=function(){this.finalize();var t=new ArrayBuffer(16),r=new Uint32Array(t);return r[0]=this.h0,r[1]=this.h1,r[2]=this.h2,r[3]=this.h3,t},t.prototype.buffer=t.prototype.arrayBuffer,t.prototype.base64=function(){for(var t,r,e,i="",s=this.array(),h=0;h<15;)t=s[h++],r=s[h++],e=s[h++],i+=p[t>>>2]+p[63&(t<<4|r>>>4)]+p[63&(r<<2|e>>>6)]+p[63&e];return t=s[h],i+=p[t>>>2]+p[t<<4&63]+"=="};var _=v();
    app.md5=_;
  })(app);

  app.s3Client = new (function s3Client(sjcl, BackblazeAccessKeyId, BackblazeSecretAccessKey ) {
    var EMPTY_BODY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    var SCHEME = "AWS4";
    var ALGORITHM = "HMAC-SHA256";
    var TERMINATOR = "aws4_request";
    var X_Amz_Date = "X-Amz-Date";
    var CompressWhitespaceRegex = /\s+/g;

    var headersToSign = {
      "content-md5": true,
      "host": true,
      "x-amz-content-sha256": true,
      "x-amz-date": true
    };

    function canonicalizeHeaderNames(headers) {
      return Object.keys(headers).map(x => x.toLowerCase()).filter(x => headersToSign[x]).sort().join(";");
    }

    function canonicalizeHeaders(headers)
    {
        if (headers == null || Object.keys(headers).length == 0) {
          return "";
        }

        var headersLowerCase = {};
        Object.entries(headers).map(([k,v]) => [k.toLowerCase(), v]).filter(([k]) => headersToSign[k])
                            .forEach(([k,v]) => headersLowerCase[k] = v);
        return Object.keys(headersLowerCase)
          .sort()
          .map(k => `${k}:${headersLowerCase[k].replace(CompressWhitespaceRegex, " ").trim()}\n`)
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
        var ksecret = `${SCHEME}${BackblazeSecretAccessKey}`

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

    this.s3Request = (httpMethod, region, bucketName, objectKey, objectValue) => {

      var regionUrlPart = (region && region.toLowerCase() != "us-east-1") ? `.${region}` : "";
      var endpointUri = `https://${bucketName}.s3${regionUrlPart}.backblazeb2.com/${objectKey}`;
      var headers = {};

      var bodyHash = EMPTY_BODY_SHA256;
      if(httpMethod == "PUT" || httpMethod == "POST") {
        let objectValueBytes;
        if(objectValue instanceof Uint8Array) {
          objectValueBytes = objectValue
        } else {
          if(typeof objectValue == "object") {
            headers["content-type"] = "application/json";
            objectValue = JSON.stringify(objectValue, 0, 2);
          } else {
            headers["content-type"] = "text/plain";
          }

          objectValueBytes = sjcl.codec.bytes.fromBits(sjcl.codec.utf8String.toBits(objectValue));
        }

        headers["Content-MD5"] = sjcl.codec.base64.fromBits(sjcl.codec.hex.toBits(app.md5(objectValueBytes)));

        headers["content-length"] = String(objectValueBytes.length);

        // I migrated to using the "unsigned payload" option
        // because my implementation wasn't working with backblaze.
        // https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
        bodyHash = "UNSIGNED-PAYLOAD";
      } else {
        headers["content-type"] = "text/plain";
      }

      headers["X-Amz-Content-SHA256"] = bodyHash;

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

      var authorization = `${SCHEME}-${ALGORITHM} Credential=${BackblazeAccessKeyId}/${scope}, `
                        + `SignedHeaders=${canonicalizedHeaderNames}, Signature=${signatureString}`;

      // console.log(`\nAuthorization:\n${authorization}`);
      return authorization;
    };
  })(app.sjcl, app.BackblazeAccessKeyId, app.BackblazeSecretAccessKey);
})(window.sequentialReadPasswordManager, document);
