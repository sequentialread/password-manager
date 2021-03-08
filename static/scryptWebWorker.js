

// THIS FILE IS GENERATED AUTOMATICALLY
// Don't edit this file by hand. 
// Either edit scryptWebWorkerStub.js or edit the build located in the wasm_build folder.




let scrypt;
let scryptPromise;


onmessage = function(e) {
  const errors = [];
  if(!e.data.data) {
    errors.push("the 'data' field is required.")
  }
  if(!e.data.data.toLowerCase().match(/^[a-f0-9]*$/)) {
    errors.push("the 'data' field must be hexadecimal.")
  }
  if(!e.data.salt) {
    errors.push("the 'salt' field is required.")
  }
  if(!e.data.salt.toLowerCase().match(/^[a-f0-9]*$/)) {
    errors.push("the 'salt' field must be hexadecimal.")
  }
  if(e.data.cpuAndMemoryCost === null || e.data.cpuAndMemoryCost === undefined) {
    errors.push("the 'cpuAndMemoryCost' field is required.")
  } else if(typeof e.data.cpuAndMemoryCost != "number") {
    errors.push("the 'cpuAndMemoryCost' field must be a number.")
  }
  if(e.data.blockSize === null || e.data.blockSize === undefined) {
    errors.push("the 'blockSize' field is required.")
  } else if(typeof e.data.blockSize != "number") {
    errors.push("the 'blockSize' field must be a number.")
  }
  if(e.data.keyLength === null || e.data.keyLength === undefined) {
    errors.push("the 'keyLength' field is required.")
  } else if(typeof e.data.keyLength != "number") {
    errors.push("the 'keyLength' field must be a number.")
  }

  if(errors.length != 0) {
    postMessage({ data: e.data.data, errors: errors });
    return;
  }


  const doTheThing = () => {
    postMessage({
      data: e.data.data,
      result: scrypt(
        e.data.data.toLowerCase(), 
        e.data.salt.toLowerCase(), 
        e.data.cpuAndMemoryCost, 
        e.data.blockSize, 
        1, 
        e.data.keyLength
      )
    });
  }

  if(scrypt) {
    doTheThing()
  } else {
    scryptPromise.then(() => {
      doTheThing();  
    });
  }
}



// Everything below this line is created by the build scripts in the wasm_build folder. 




// Polyfill instantiateStreaming for browsers missing it
if (!WebAssembly.instantiateStreaming) {
  WebAssembly.instantiateStreaming = async (resp, importObject) => {
    const source = await (await resp).arrayBuffer();
    return await WebAssembly.instantiate(source, importObject);
  };
}

scryptPromise = WebAssembly.instantiateStreaming(fetch('/static/vendor/scrypt_wasm_bg.wasm'), {}).then(instantiatedModule => {
  const wasm = instantiatedModule.instance.exports;

  
  let WASM_VECTOR_LEN = 0;
  
  let cachegetUint8Memory0 = null;
  function getUint8Memory0() {
      if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
          cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
      }
      return cachegetUint8Memory0;
  }
  
  const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;
  
  let cachedTextEncoder = new lTextEncoder('utf-8');
  
  const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
      ? function (arg, view) {
      return cachedTextEncoder.encodeInto(arg, view);
  }
      : function (arg, view) {
      const buf = cachedTextEncoder.encode(arg);
      view.set(buf);
      return {
          read: arg.length,
          written: buf.length
      };
  });
  
  function passStringToWasm0(arg, malloc, realloc) {
  
      if (realloc === undefined) {
          const buf = cachedTextEncoder.encode(arg);
          const ptr = malloc(buf.length);
          getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
          WASM_VECTOR_LEN = buf.length;
          return ptr;
      }
  
      let len = arg.length;
      let ptr = malloc(len);
  
      const mem = getUint8Memory0();
  
      let offset = 0;
  
      for (; offset < len; offset++) {
          const code = arg.charCodeAt(offset);
          if (code > 0x7F) break;
          mem[ptr + offset] = code;
      }
  
      if (offset !== len) {
          if (offset !== 0) {
              arg = arg.slice(offset);
          }
          ptr = realloc(ptr, len, len = offset + arg.length * 3);
          const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
          const ret = encodeString(arg, view);
  
          offset += ret.written;
      }
  
      WASM_VECTOR_LEN = offset;
      return ptr;
  }
  
  let cachegetInt32Memory0 = null;
  function getInt32Memory0() {
      if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
          cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
      }
      return cachegetInt32Memory0;
  }
  
  const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;
  
  let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });
  
  cachedTextDecoder.decode();
  
  function getStringFromWasm0(ptr, len) {
      return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
  }
  /**
  * @param {string} password
  * @param {string} salt
  * @param {number} n
  * @param {number} r
  * @param {number} p
  * @param {number} dklen
  * @returns {string}
  */
  scrypt = function(password, salt, n, r, p, dklen) {
      try {
          const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
          var ptr0 = passStringToWasm0(password, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
          var len0 = WASM_VECTOR_LEN;
          var ptr1 = passStringToWasm0(salt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
          var len1 = WASM_VECTOR_LEN;
          wasm.scrypt(retptr, ptr0, len0, ptr1, len1, n, r, p, dklen);
          var r0 = getInt32Memory0()[retptr / 4 + 0];
          var r1 = getInt32Memory0()[retptr / 4 + 1];
          return getStringFromWasm0(r0, r1);
      } finally {
          wasm.__wbindgen_add_to_stack_pointer(16);
          wasm.__wbindgen_free(r0, r1);
      }
  }
  
  
});
