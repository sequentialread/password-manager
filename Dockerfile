
FROM golang:1.15.2-alpine as build
ARG GOARCH=
ARG GO_BUILD_ARGS=

RUN mkdir /build
WORKDIR /build
COPY . .
RUN  go build -v $GO_BUILD_ARGS -o /build/sequentialread-password-manager .

FROM alpine
WORKDIR /app
COPY --from=build /build/sequentialread-password-manager /app/sequentialread-password-manager
COPY --from=build /build/index.html.gotemplate /app/index.html.gotemplate
COPY --from=build /build/static /app/static
RUN chmod +x /app/sequentialread-password-manager
ENTRYPOINT ["/app/sequentialread-password-manager"]
 
CMD [ "-headless", "true"]