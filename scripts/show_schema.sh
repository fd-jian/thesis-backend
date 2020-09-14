#!/bin/sh

## Retrieve schema information from the registry. If no arguments are
## specified, A list of all subjects will be queried from a hardcoded URL. 

## If URL and subject are provided, the list of versions for the subject will
## be queried. If URL, subject, and version are specified, the specific version
## of the subject will be retrieved. 

## To omit the URL argument, use `-` followed by the other argument.

## Usage: ./show_schema.sh [URL|-] [SUBJECT] [VERSION]

URL="$1"
[ "$URL" = "-" ] && URL='http://localhost:8081'
URL=$URL/subjects

JQ_STR=
! test -z "$2" && {
    URL=$URL/$2/versions
    ! test -z "$3" && {
        URL=$URL/$3 
        JQ_STR='.schema'
    }
}

curl -sfS "$URL" \
    | jq --raw-output "$JQ_STR" | jq
