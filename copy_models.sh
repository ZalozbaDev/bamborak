#!/bin/bash

git lfs install

if ! [ -e tmp_korla_tts_modele ]; then
	git clone https://huggingface.co/Korla/tts-modele tmp_korla_tts_modele
fi
HF_KORLA_DIR=tmp_korla_tts_modele/

if ! [ -e tmp_thorsten_voice_modele ]; then
	git clone https://huggingface.co/Thorsten-Voice/VITS tmp_thorsten_voice_modele
fi
THORSTEN_DIR=tmp_thorsten_voice_modele/

if ! [ -e tmp_zalozbadev_tts_modele ]; then
	git clone https://huggingface.co/zalozbadev/coqui-tts-modele tmp_zalozbadev_tts_modele
fi
HF_ZSL_DIR=tmp_zalozbadev_tts_modele/

cp $HF_KORLA_DIR/weronika.pth ./tts_models/

cp $HF_KORLA_DIR/korla.pth    ./tts_models/

cp $HF_KORLA_DIR/katka/checkpoint_645000.pth ././tts_models/katka_2025_07.pth

cp $THORSTEN_DIR/model_file.pth ./tts_models/thorsten.pth

cp $HF_KORLA_DIR/korla/model.pth     ./tts_models/korla2.pth

cp $HF_KORLA_DIR/cyril/model.pth     ./tts_models/cyril.pth

cp $HF_ZSL_DIR/arnd/2025_12/checkpoint_8000.pth     ./tts_models/arnd.pth

cp $HF_ZSL_DIR/beno/2025_12/checkpoint_100000.pth   ./tts_models/beno.pth

cp $HF_ZSL_DIR/hanaroza/2025_12/checkpoint_7000.pth ./tts_models/hanaroza.pth

cp $HF_ZSL_DIR/michal/2025_12/checkpoint_90000.pth  ./tts_models/michal.pth

