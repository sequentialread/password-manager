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

nodejs_is_installed="$(which node | wc -l)"
npm_is_installed="$(which npm | wc -l)"

if [ "$nodejs_is_installed" == "0" ] || [ "$npm_is_installed" == "0"  ]; then
  printf "nodejs and npm are required for the next step. Please install them manually 😇"
  exit 1
fi

if [ ! -d node_modules ]; then
  printf "running npm install \n"
  npm install
fi

node wasm_build_webworker.js > "../static/scryptWebWorker.js"

printf "\n\nbuilt ../static/scryptWebWorker.js successfully!\n\n"


