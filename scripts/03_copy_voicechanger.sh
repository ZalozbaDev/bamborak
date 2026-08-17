#!/bin/bash

mkdir -p backend_data/voice_changer/

cp -r voice_changer/* backend_data/voice_changer/

# copy voicechanger models
if ! [ -e tmp_openvoice ]; then
	git clone https://github.com/ZalozbaDev/OpenVoice.git tmp_openvoice
fi
pushd tmp_openvoice
cat checkpoints_v2_0417.zip0? > checkpoints_v2_0417.zip
popd

pushd backend_data/voice_changer/
unzip ../../tmp_openvoice/checkpoints_v2_0417.zip
popd
