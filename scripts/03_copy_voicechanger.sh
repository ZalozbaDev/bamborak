#!/bin/bash

mkdir -p backend_data/voice_changer/

cp -r voice_chager/* backend_data/voice_changer/

# copy voicechanger models
if ! [ -e tmp_openvoice ]; then
	git clone git@github.com:ZalozbaDev/OpenVoice tmp_openvoice
fi
pushd tmp_openvoice
cat checkpoints_v2_0417.zip0? > checkpoints_v2_0417.zip
popd

pushd backend_data/voice_changer/
unzip ../../tmp_openvoice/checkpoints_v2_0417.zip
popd
