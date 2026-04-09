from TTS.api import TTS
import os
import torch
import sys

def change_voice(wavfilename, speaker_id, timbre_id, emotion, model, logger):
    
    # hard-coded a.t.m.
    converter = "voice_conversion_models/multilingual/multi-dataset/openvoice_v2"
    device="cuda:0" if torch.cuda.is_available() else "cpu"
    
    tts = TTS(converter).to(device)

    # handle all special cases for emotions
    if timbre_id == "multi_2025_02_11":
    	timbre_id = "hanaroza"
    if timbre_id == "michal_multi_2025_02_20":
    	timbre_id = "michal"
    if timbre_id == "arnd_multi_2025_02_21":
    	timbre_id = "arnd"
    if timbre_id == "katka_2025_07":
    	timbre_id = "katka"

    reference_speaker = "voice_changer/" + timbre_id + "/" + timbre_id + "_" + emotion + ".wav"

    save_path = wavfilename + ".changed.wav"

    tts.voice_conversion_to_file(
        source_wav=wavfilename,
        target_wav=reference_speaker,
        speaker="MyChangedSpeaker",
        file_path=save_path
    )

    torch.cuda.empty_cache()
    
    logger.debug("overwriting original file: mv " + save_path + " " + wavfilename)
    
    os.rename(save_path, wavfilename)
    
    return

