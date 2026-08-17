#!/bin/bash

rm -rf backend_data
mkdir -p backend_data/config/
cp backend/config-templates/*.json backend_data/config/

