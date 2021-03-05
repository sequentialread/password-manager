
// IN ORDER FOR CHANGES TO THIS FILE TO "TAKE" AND BE USED IN THE APP, THE BUILD IN wasm_build HAS TO BE RE-RUN

// scrypt and scryptPromise will be filled out by js code that gets appended below this script by the wasm_build process
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
