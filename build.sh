#!/bin/bash

GOOS=linux GOARCH=amd64 GO15VENDOREXPERIMENT=1 go build -v -o sequentialread-password-manager server.go \
  && docker build -t sequentialread/sequentialread-password-manager:0.0.3 .
