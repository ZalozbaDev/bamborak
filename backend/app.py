use_tts = True

import flask
from flask import request, jsonify, send_file
from flask_cors import CORS, cross_origin
import os
import subprocess
import json
import torch

if use_tts:
    from TTS.api import TTS
import uuid
import threading
import time
from utils import number_to_text, year_to_text
import subprocess
import random
import re


import logging
import sys
from logging.handlers import RotatingFileHandler

import voicechanger
from voicechanger import change_voice

from managed_tts import ManagedTTS

logger = None


def init_logging(logdir):
    global logger
    # create logger
    logger = logging.getLogger("log_bamborak")

    # set logging level
    logger.setLevel(logging.DEBUG)

    # create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    stream_handler = logging.StreamHandler(stream=sys.stdout)
    stream_handler.setLevel(logging.DEBUG)
    stream_handler.setFormatter(formatter)
    # create rotating file handler and set level to debug

    rot_handler = RotatingFileHandler(
        logdir + "/bamborak.log", maxBytes=20000000, backupCount=10
    )
    rot_handler.setLevel(logging.DEBUG)
    rot_handler.setFormatter(formatter)

    logger.addHandler(stream_handler)
    logger.addHandler(rot_handler)

    logger.debug("logging initialized")


synthesizer_insts = {}
synth_lock = threading.Lock()

IDLE_TIMEOUT = 60 # (seconds, increase as necessary) 

MODEL_DIR = "tts_models"

LIMIT_CHARS = 10_000

app = None
speaker_config = {}
timbre_config = {}
synthesizers = {}

device = "cuda" if torch.cuda.is_available() else "cpu"

app = flask.Flask(__name__)


# CORS
def init_app():
    CORS(app)
    app.config['CORS_HEADERS'] = 'Content-Type'

def cleanup_worker():
    while True:
        time.sleep(30)  # check every 30s
        with synth_lock:
            to_delete = [
                key for key, managed in synthesizer_insts.items()
                if managed.can_delete(IDLE_TIMEOUT)
            ]

            for key in to_delete:
                logger.debug("removing idle instance from GPU memory: " + key)
                managed = synthesizer_insts.pop(key)
                managed.destroy()

def init_config():
    global speaker_config
    global timbre_config
    global names
    with open("./config.json") as f:
        speaker_config = json.load(f)
        logger.debug("speaker_config " + str(speaker_config))
    with open("./config-timbres.json") as f:
        timbre_config = json.load(f)
        logger.debug("timbre-config " + str(timbre_config))
    with open("./names.json") as f:
        names = json.load(f)
        logger.debug("names " + str(names))

def get_synthesizer(speaker_id, speaker_model, speaker_cfg, device):
    with synth_lock:
        if speaker_id not in synthesizer_insts:
            synthesizer_insts[speaker_id] = ManagedTTS(
                model_path=f"{MODEL_DIR}/{speaker_model}",
                config_path=f"{MODEL_DIR}/{speaker_cfg}",
                device=device,
            )

        managed = synthesizer_insts[speaker_id]

    tts = managed.acquire()
    return managed, tts

def init_synthesiszers():
    for speaker in list(speaker_config.items()):
        if use_tts:
            cur_model_path = f"{MODEL_DIR}/{speaker[1]['model']}"
            cur_config_path = f"{MODEL_DIR}/{speaker[1]['config']}"
            logger.debug(
                "init_synthesiszers: "
                + str(speaker[0])
                + " config_path: "
                + cur_config_path
                + " model_path: "
                + cur_model_path
            )
            logger.debug("prepare synthesiser ...: " + str(speaker[1]))
#            logger.debug("using device: " + device)
#            synthesizers[speaker[0]] = {
#                "tts": TTS(
#                    model_path=cur_model_path,
#                    config_path=cur_config_path,
#                ).to(device)
#            }
            synthesizers[speaker[0]] = {
                "model":  speaker[1]['model'],
                "config": speaker[1]['config']
            }
            if speaker[1]["multi_speaker"]:
                synthesizers[speaker[0]]["speakers"] = synthesizers[speaker[0]][
                    "tts"
                ].speakers

            # synthesizers[speaker[0]]["tts"].is_multi_lingual = False


char_to_spoken = {
    "a": "a",
    "b": "bej",
    "c": "cej",
    "će": "ćej",
    "č": "čet",
    "d": "dej",
    "e": "e",
    "f": "ef",
    "g": "gej",
    "h": "ha",
    "i": "i",
    "j": "jot",
    "k": "ka",
    "l": "el",
    "ł": "eł",
    "m": "em",
    "n": "en",
    "ń": "ejn",
    "o": "o",
    "ó": "ót",
    "p": "pej",
    "r": "er",
    "ř": "eř",
    "s": "es",
    "š": "eš",
    "t": "tej",
    "u": "u",
    "w": "w",
    "v": "fau",
    "x": "iks",
    "y": "ypsilon",
    "z": "zet",
    "ž": "žet",
    " ": "",
}


def is_number(s):
    try:
        int(s)
        return True
    except ValueError:
        return False


def delete_temp_files(file0, file1):
    # 120 Sekunden warten, bis dahin sollte das Datei versendet worden sein ....
    time.sleep(120)
    #   exec(f"ls -l temp")
    exec(f"rm {file0}")
    exec(f"rm {file1}")
    torch.cuda.empty_cache()


def exec(cmd):
    logger.debug(f">>> exec {cmd}")
    subprocess.run(cmd, shell=True, check=True)
    logger.debug(f"<<< exec")


@app.route("/api/info/", methods=["GET"])
def info():
    logger.debug(str(request))
    res = {"version": "0.0.4", "model": speaker_config}
    return res


@app.route("/api/fetch_speakers/", methods=["GET"])
def fetch_speakers():
    logger.debug(str(request))
    speakers = []
    for speaker in list(speaker_config.items()):
        if speaker[1]["multi_speaker"]:
            for idx, sub_speaker in enumerate(synthesizers[speaker[0]]["speakers"]):
                if speaker[0] in names:
                    if str(idx) in names[speaker[0]]:
                        speakers.append(
                            {
                                "name": f"{names[speaker[0]][str(idx)]}",
                                "id": f"{speaker[1]['speaker_id']}/{sub_speaker}",
                                "info": speaker[1]["info"],
                                "language": speaker[1]["language"],
                            }
                        )
                # disabled to not publish speakers that are not explicitly listed 
                #else:
                #    speakers.append(
                #        {
                #            "name": f"{speaker[1]['speaker']} {idx}",
                #            "id": f"{speaker[1]['speaker_id']}/{sub_speaker}",
                #            "info": speaker[1]["info"],
                #        }
                #    )
        else:
            speakers.append(
                {
                    "name": speaker[1]["speaker"],
                    "id": speaker[1]["speaker_id"],
                    "info": speaker[1]["info"],
                    "language": speaker[1]["language"],
                }
            )
    return jsonify(speakers)


@app.route("/api/fetch_timbres/", methods=["GET"])
def fetch_timbres():
    logger.debug(str(request))
    timbres = []
    logger.debug("timbre_config: " + str(timbre_config.items()))
    for timbre in list(timbre_config.items()):
        timbres.append(
            {
                "name": timbre[1]["timbre"],
                "id": timbre[1]["timbre_id"],
                "info": timbre[1]["info"],
                "language": timbre[1]["language"],
                "emotions": timbre[1]["emotions"],
            }
        )
        logger.debug("timbre: " + str(timbre))
    logger.debug("timbres: " + str(timbres))
    return jsonify(timbres)


def err_msg(msg):
    logger.debug("errmsg " + str(msg))
    return {"errmsg": msg}


@app.route("/api/tts/", methods=["POST"])
def main():
    logger.debug(str(request))
    logger.debug("request json payload: " + str(request.json))

    try:
        if "text" not in request.json:
            return err_msg("missing text")
        if "speaker_id" not in request.json:
            return err_msg("missing speaker_id")
        if "format" not in request.json:
            return err_msg("missing format")
        format = request.json["format"]
        
        sample_rate = 48000 # default sample rate
        if "sampleRate" in request.json:
            sample_rate = request.json["sampleRate"]


        try:
            speaker_id, sub_speaker = request.json["speaker_id"].split("/")
            multi_speaker = True
            if speaker_id not in speaker_config:
                return err_msg("invalid speaker_id")
            if sub_speaker not in synthesizers[speaker_id]["speakers"]:
                return err_msg("invalid speaker_id")
        except ValueError:
            speaker_id = request.json["speaker_id"]
            multi_speaker = False
            if speaker_id not in speaker_config:
                return err_msg("invalid speaker_id")

        # save and display timbre / emotion / voiceChangerModel
        if "timbre_id" not in request.json:
            timbre_id = speaker_id
        else:
            timbre_id = request.json["timbre_id"]
        if "emotion" not in request.json:
            emotion = "neutral"
        else:
            emotion = request.json["emotion"]
        if "model" not in request.json:
            voiceChangerModel = "none"
        else:
            voiceChangerModel = request.json["model"]
        
        logger.debug("----> voice changer opts: timbre=" + timbre_id + ", emotion=" + emotion + ",model=" + voiceChangerModel + " <----") 

        # Get language from config
        language = speaker_config[speaker_id]["language"]
        
        text = request.json["text"].strip()

        if LIMIT_CHARS > 0 and len(text) > LIMIT_CHARS:
            return err_msg(f"input text too long (max {LIMIT_CHARS} characters)")

        if text[-1] == "." or text[-1] == "," or text[-1] == "!" or text[-1] == "?":
            pass
        else:
            text = f"{text}."

        # Language-specific text processing
        if language == "hsb":
            logger.debug("processing for: hsb")

            for match in re.findall(r"\b\d{4}-\d{2,4}\b", text):
                first_num, sec_num = match.split("-")
                first_num_txt = year_to_text(first_num, language)
                sec_num_txt = year_to_text(sec_num, language)
                text = text.replace(match, f"{first_num_txt} do {sec_num_txt}")

            for match in re.findall(r"\d{1,2}:\d{2}\s*hodź(?:\.|in)?", text):
                first_num, sec_num = match.split(":")
                sec_num = "".join(char for char in sec_num if char.isdigit())
                first_num_txt = number_to_text(first_num, language)
                if sec_num != "00":
                    sec_num_txt = number_to_text(sec_num, language)
                else:
                    sec_num_txt = ""
                text = text.replace(match, f"{first_num_txt} hodźin {sec_num_txt}")

            abbr_start = None
            num_start = None
            res_text = ""
            curstate = "char"
            laststate = ""
            for index in range(len(text)):
                char = text[index]
                if char.isupper():
                    if abbr_start is None:
                        abbr_start = index
                        curstate = "abbr"
                elif is_number(char):
                    if num_start is None:
                        num_start = index
                        curstate = "num"
                else:
                    curstate = "char"

                if curstate != laststate:
                    if laststate == "abbr":
                        written_abbr = ""
                        abbr = text[abbr_start:index]
                        if len(abbr) > 1:
                            for letter in abbr:
                                written_abbr = (
                                    f"{written_abbr} {char_to_spoken[letter.lower()]}"
                                )
                            res_text = res_text + " " + written_abbr + " "
                        else:
                            res_text = res_text + abbr
                        abbr_start = None
                    elif laststate == "num":
                        num = text[num_start:index]
                        res_text = res_text + " " + number_to_text(num, language) + " "
                        num_start = None

                if curstate == "char":
                    res_text = res_text + char

                laststate = curstate

            if speaker_config[speaker_id]["lower"]:
                res_text = res_text.lower()
            res_text = res_text.replace("  ", " ")
            res_text = res_text.replace("\xad", "")
            res_text = res_text.replace("x", "ks")
        elif language == "de":
          logger.debug("processing for: de")

          for match in re.findall(r"\b\d{4}-\d{2,4}\b", text):
              first_num, sec_num = match.split("-")
              first_num_txt = year_to_text(first_num, language)
              sec_num_txt = year_to_text(sec_num, language)
              text = text.replace(match, f"{first_num_txt} bis {sec_num_txt}")

          for match in re.findall(r"\d{1,2}:\d{2}\s*Uhr?", text):
              first_num, sec_num = match.split(":")
              sec_num = "".join(char for char in sec_num if char.isdigit())
              first_num_txt = number_to_text(first_num, language)
              if sec_num != "00":
                  sec_num_txt = number_to_text(sec_num, language)
              else:
                  sec_num_txt = ""
              text = text.replace(match, f"{first_num_txt} Uhr {sec_num_txt}")

          abbr_start = None
          num_start = None
          res_text = ""
          curstate = "char"
          laststate = ""
          for index in range(len(text)):
              char = text[index]
              if char.isupper():
                  if abbr_start is None:
                      abbr_start = index
                      curstate = "abbr"
              elif is_number(char):
                  if num_start is None:
                      num_start = index
                      curstate = "num"
              else:
                  curstate = "char"

              if curstate != laststate:
                  if laststate == "abbr":
                      written_abbr = ""
                      abbr = text[abbr_start:index]
                      if len(abbr) > 1:
                          for letter in abbr:
                              written_abbr = (
                                  f"{written_abbr} {char_to_spoken[letter.lower()]}"
                              )
                          res_text = res_text + " " + written_abbr + " "
                      else:
                          res_text = res_text + abbr
                      abbr_start = None
                  elif laststate == "num":
                      num = text[num_start:index]
                      res_text = res_text + " " + number_to_text(num, language) + " "
                      num_start = None

              if curstate == "char":
                  res_text = res_text + char

              laststate = curstate

          if speaker_config[speaker_id]["lower"]:
              res_text = res_text.lower()
          res_text = res_text.replace("  ", " ")
          res_text = res_text.replace("\xad", "")
      
        else:
            # TODO: Add language-specific text processing for other languages
            logger.debug("processing for: unknown language")
            res_text = text
  
        temp_wav_file_path = f"temp/{uuid.uuid4().hex}.wav"
        temp_mp3_file_path = f"temp/{uuid.uuid4().hex}.mp3"
        logger.debug(">> calling synthesizer for '" + str(res_text) + "'")
        # cur_tts = synthesizers[speaker_id]["tts"]
        
        spk_model  = synthesizers[speaker_id]["model"]
        spk_config = synthesizers[speaker_id]["config"]
        
        logger.debug("acq inst: " +  spk_model + " / " + spk_config + ".")
        
        managed, cur_tts = get_synthesizer(speaker_id, spk_model, spk_config, device)
        
        logger.debug("tts: " + str(list(cur_tts.__dict__.keys())))
        try:
            if multi_speaker:
                cur_tts.tts_to_file(
                    text=res_text,
                    file_path=temp_wav_file_path,
                    speaker=sub_speaker,
                )
            else:
                try:
                    cur_tts.tts_to_file(text=res_text, file_path=temp_wav_file_path)
                except ValueError:
                    cur_tts.tts_to_file(
                        text=res_text,
                        file_path=temp_wav_file_path,
                        speaker=random.choice(cur_tts.speakers),
                    )
            logger.debug("<< synthesizer called!")
        finally:
            managed.release()
        
        # check whether we need to call the voice changer
        if speaker_id != timbre_id or emotion != "neutral":
            logger.debug("<---- Calling voice changer with args speaker_id=" + speaker_id + ", timbre_id=" + timbre_id + ", emotion=" + emotion + ",model=" + voiceChangerModel + " ---->")
            change_voice(temp_wav_file_path, speaker_id, timbre_id, emotion, voiceChangerModel, logger)
        else:
            logger.debug("<---- NOT calling voice changer - no change requested ---->")     
        
        exec(f"sox {temp_wav_file_path} {temp_mp3_file_path}")
        delete_temp_file_thread = threading.Thread(
            target=delete_temp_files, args=(temp_mp3_file_path, temp_wav_file_path)
        )
        delete_temp_file_thread.start()
        return send_file(temp_mp3_file_path)

    except Exception as ex:
        trace = []
        tb = ex.__traceback__
        while tb is not None:
            trace.append(
                {
                    "filename": tb.tb_frame.f_code.co_filename,
                    "name": tb.tb_frame.f_code.co_name,
                    "lineno": tb.tb_lineno,
                }
            )
            tb = tb.tb_next
        ret = {
            "errmsg": "Exception",
            "exception": {
                "type": type(ex).__name__,
                "message": str(ex),
                "trace": trace,
            },
        }
        logger.debug("Exception: " + str(ret))
        return ret


if __name__ == "__main__":
    logdir = "."
    if len(sys.argv) == 2:
        logdir = sys.argv[1]
    elif len(sys.argv) > 2:
        print("invalid arguments: " + str(sys.argv))
        exit(1)

    print("logdir is " + logdir)

    init_logging(logdir)
    init_config()
    init_app()
    init_synthesiszers()

    threading.Thread(target=cleanup_worker, daemon=True).start()

    logger.debug("starting webserver ...")
    app.run(port=int(os.environ.get("PORT", 8080)), host="0.0.0.0", debug=False)
    logger.debug("exiting ...")
