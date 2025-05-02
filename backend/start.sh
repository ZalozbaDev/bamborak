#!/bin/bash
nvidia-smi
source bin/activate
python3 app.py $1
