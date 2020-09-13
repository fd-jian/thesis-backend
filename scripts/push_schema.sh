#!/bin/sh

## Push one or multiple files or all files in all subdirectories to the local
## schema registry with default port recursively.
## 
## If URL is not specified, a hardcoded default URL will be used and the
## remaining arguments will be seen as a list of files and/or directories.
##
## To omit the URL argument, use `-` followed by the other argument.
## 
## Usage: ./push_schema.sh [URL|-] [FILE|DIRECTORY]...

SUBJECTS_URL="$1"
shift
[ "$SUBJECTS_URL" = "-" ] &&
    SUBJECTS_URL="http://localhost:8081/subjects"

push_file() {
    SUBJECT_NAME="$(basename "$1")"
    SUBJECT_NAME="${SUBJECT_NAME%%.avsc}"
    echo "Pushing schema '$1' to registry." &&
        curl -sfSX POST \
        -H "Content-Type: application/vnd.schemaregistry.v1+json" \
        --data "{\"schema\":$(jq --compact-output '' "$1" | jq --raw-input '')}" \
        "$SUBJECTS_URL/$SUBJECT_NAME/versions" &&
        printf "\nSuccesfully pushed schema for subject '$SUBJECT_NAME' to registry.\n" ||
        printf "\nError pushing schema for subject '$SUBJECT_NAME' to registry.\n"
}

[ $# -lt "1" ] &&
    echo "Missing argument" >&2 &&
    exit 1

# iterate all arguments. pathes with whitespaces need double quotes
for FILEPATH in "$@"; do
    # if argument is a directory, search subdirs for .avsc files to push
    if test -d "$FILEPATH"; then
        find "$FILEPATH" -type f -name "*.avsc" |
            while read FILE; do
                push_file "$FILE"
            done
    # if arugment is a file, push the file
    elif test -f "$FILEPATH"; then
        push_file "$FILEPATH"
    else
        echo "$FILEPATH not found" >&2
        exit 1
    fi
done

