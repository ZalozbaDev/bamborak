import os
import torch
from openvoice import se_extractor
from openvoice.api import ToneColorConverter
import sys

def change_voice(wavfilename, speaker_id, timbre_id, emotion, model, logger):
    ckpt_converter = "voice_changer/models/checkpoints_v2/converter"
    device="cuda:0" if torch.cuda.is_available() else "cpu"
    
    tone_color_converter = ToneColorConverter(f'{ckpt_converter}/config.json', device=device)
    tone_color_converter.load_ckpt(f'{ckpt_converter}/checkpoint.pth')

    base_speaker = wavfilename
    source_se, audio_name = se_extractor.get_se(base_speaker, tone_color_converter, vad=True)

    reference_speaker = "voice_changer/katka/katka_" + emotion + ".wav"
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
