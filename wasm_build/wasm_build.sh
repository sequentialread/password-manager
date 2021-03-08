#!/bin/bash -e

if [ ! -f wasm_build.sh ]; then
  printf "Please run this script from the wasm_build folder.\n"
fi

if [ ! -d scrypt-wasm ]; then
  printf "Cloning https://github.com/MyEtherWallet/scrypt-wasm... \n"
  git clone https://github.com/MyEtherWallet/scrypt-wasm
fi

cd scrypt-wasm

rust_is_installed="$(which rustc | wc -l)"

if [ "$rust_is_installed" == "0" ]; then
  printf "rust language compilers & tools will need to be installed."
  printf "using rustup.rs: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh \n"
  read -p "is this ok? [y] " -n 1 -r
  printf "\n"
  if [[ $REPLY =~ ^[Yy]$ ]]
  then
      curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  else
      printf "exiting due to no rust compiler"
      exit 1
  fi
fi

if [ ! -d pkg ]; then
  printf "running Makefile for MyEtherWallet/scrypt-wasm... \n"
  make
fi

cd ../

cp scrypt-wasm/pkg/scrypt_wasm_bg.wasm "../static/vendor/scrypt_wasm_bg.wasm"

printf "\n\n"
printf "built ../static/vendor/scrypt_wasm_bg.wasm successfully!\n\n"

# --------------------------------------------------------------------------
# Output the composited webworker JS

# first, include the warning about this file being automatically generated

echo '

// THIS FILE IS GENERATED AUTOMATICALLY
// Dont edit this file by hand. 
// Either edit scryptWebWorkerStub.js or edit the build located in the wasm_build folder.

' > "../static/scryptWebWorker.js"

# add the actual webworker logic at the top, while filtering out comments

cat "../static/scryptWebWorkerStub.js" | grep -v -E '^//' >>  "../static/scryptWebWorker.js"


# Now its time to load the wasm module. download it and tell WebAssembly to load it
# https://www.sitepen.com/blog/using-webassembly-with-web-workers
echo '

// Everything below this line is created by the build scripts in the wasm_build folder. 


// Polyfill instantiateStreaming for browsers missing it
if (!WebAssembly.instantiateStreaming) {
  WebAssembly.instantiateStreaming = async (resp, importObject) => {
    const source = await (await resp).arrayBuffer();
    return await WebAssembly.instantiate(source, importObject);
  };
}

scryptPromise = WebAssembly.instantiateStreaming(fetch("/static/vendor/scrypt_wasm_bg.wasm"), {}).then(instantiatedModule => {
  const wasm = instantiatedModule.instance.exports;

' >>  "../static/scryptWebWorker.js"

# Output the WASM wrapper JS code that came from the Rust WASM compiler, 
# slightly modified to use global namespace instead of es6 modules
cat scrypt-wasm/pkg/scrypt_wasm_bg.js \
 | grep -v -E '^import ' | sed 's/export function scrypt/scrypt = function/' \
 | sed 's/^/  /g'  >>  "../static/scryptWebWorker.js"

# finish off by closing scryptPromise// finish off by closing scryptPromise
echo '
});
' >>  "../static/scryptWebWorker.js"

printf "built ../static/scryptWebWorker.js successfully!\n\n"


