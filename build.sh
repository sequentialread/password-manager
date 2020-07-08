#!/bin/bash

GOOS=linux GOARCH=amd64 go build -v -o sequentialread-password-manager -tags netgo  server.go \
  && docker build -t sequentialread/sequentialread-password-manager:1.2.0 .
