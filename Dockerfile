FROM alpine

COPY sequentialread-password-manager index.appcache.gotemplate index.html.gotemplate ./
COPY static static

EXPOSE 8073

CMD [ "./sequentialread-password-manager", "-headless", "true"]
