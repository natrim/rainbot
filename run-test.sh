#!/usr/bin/env sh

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VOWS="$DIR/node_modules/.bin/vows"

if [ ! -f $VOWS ]
then
    echo "VOWS was not installed! Please run: npm install"
    exit
fi

#cd to dir for vows
cd $DIR

#exec the vows in isolated mode
exec $VOWS --spec -i