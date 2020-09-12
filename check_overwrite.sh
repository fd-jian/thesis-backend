#!/bin/sh

## Check if a file exists at a given path and prompt the user to decide if it
## should be overwritten or not. Exits 0 if no file exists or user accepts
## overwriting. Exits 1 if user chooses to not overwrite the file. Script will
## call itself until a valid user input is received.
##
## Usage: check_overwrite.sh [FILE_PATH]

test -f "$1" || exit 0

echo "File at '"$1"' exists. Do you want to overwrite it? [y/n] "

read -r OVERWRITE

echo $OVERWRITE | grep -q -e "^y$" -e "^yes$" && 
    echo "Overwriting file." &&
    exit 0 ||
    echo $OVERWRITE | grep -q -e "^n$" -e "^no$" &&
    echo "Not going to overwrite file." && 
    exit 1 ||
    ./check_overwrite.sh "$1"
