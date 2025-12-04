#!/bin/bash

source pythonenv/bin/activate

# pip3.11 install -r requirements_pinned_macos.txt
pip3.13 install  -r requirements_pinned_macos.txt

rm -rf tts_models/
mkdir -p tts_models/

cp ../../VITS/config.json     tts_models/thorsten.json
cp ../../VITS/model_file.pth  tts_models/thorsten.pth


