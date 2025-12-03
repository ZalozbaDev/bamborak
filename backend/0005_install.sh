#!/bin/bash

source pythonenv/bin/activate

pip3.11 install -r requirements_pinned_macos.txt

cp ../../VITS/config.json     ./thorsten.json
cp ../../VITS/model_file.pth  ./thorsten.pth


