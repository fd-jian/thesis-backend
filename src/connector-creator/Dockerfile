FROM dwdraju/alpine-curl-jq
WORKDIR /entry
COPY entrypoint.sh .

RUN apk update && \
        apk add gettext 

CMD ["/entry/entrypoint.sh"]

