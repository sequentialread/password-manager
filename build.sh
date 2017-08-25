#!/bin/bash

GOOS=linux GOARCH=amd64 go build -v -o sequentialread-password-manager server.go \
  && docker build -t sequentialread/sequentialread-password-manager:1.1.0 .
