import os
import torch
from openvoice import se_extractor
from openvoice.api import ToneColorConverter
import sys

def change_voice(wavfilename, speaker_id, timbre_id, emotion, model, logger):
    
    # have this the only supported changer model for now
    ckpt_converter = "voice_changer/models/checkpoints_v2/converter"
    device="cuda:0" if torch.cuda.is_available() else "cpu"
    
    tone_color_converter = ToneColorConverter(f'{ckpt_converter}/config.json', device=device)
    tone_color_converter.load_ckpt(f'{ckpt_converter}/checkpoint.pth')

    base_speaker = wavfilename
    source_se, audio_name = se_extractor.get_se(base_speaker, tone_color_converter, vad=True)

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
    target_se, audio_name = se_extractor.get_se(reference_speaker, tone_color_converter, vad=True)

    save_path = wavfilename + ".changed.wav"

    # Run the tone color converter
    encode_message = "@MyShell"
    tone_color_converter.convert(
        audio_src_path=wavfilename, 
        src_se=source_se, 
        tgt_se=target_se, 
        output_path=save_path,
        message=encode_message)

    torch.cuda.empty_cache()
    
    logger.debug("overwriting original file: mv " + save_path + " " + wavfilename)
    
    os.rename(save_path, wavfilename)
    
    return
