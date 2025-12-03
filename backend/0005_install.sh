#!/bin/bash

source pythonenv/bin/activate

pip3 install coqui-tts

cp ../../VITS/config.json     ./thorsten.json
cp ../../VITS/model_file.pth  ./thorsten.pth


