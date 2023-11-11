import flask
from flask import request, jsonify, send_file
from flask_cors import CORS
import os
import subprocess
import json
from TTS.api import TTS
import uuid
import threading
import time
from utils import number_to_text
import subprocess
import random

app = flask.Flask(__name__)

# CORS
CORS(app)

with open("./config.json") as f:
    speaker_config = json.load(f)


synthesizers = {}

MODEL_DIR = "models"

LIMIT_CHARS = 10_000

for speaker in list(speaker_config.items()):
    synthesizers[speaker[0]] = {
        "tts": TTS(
            model_path=f"models/{speaker[1]['model']}",
            config_path=f"models/{speaker[1]['config']}",
        )
    }
    if speaker[1]["multi_speaker"]:
        synthesizers[speaker[0]]["speakers"] = synthesizers[speaker[0]]["tts"].speakers

char_to_spoken = {
    "a": "a",
    "b": "be",
    "c": "ce",
    "će": "će",
    "č": "čet",
    "d": "de",
    "e": "e",
    "f": "ef",
    "g": "ge",
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
    "p": "pe",
    "r": "er",
    "ř": "eř",
    "s": "es",
    "š": "eš",
    "t": "te",
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


def exec(cmd):
    print(f">>> exec {cmd}")
    subprocess.run(cmd, shell=True, check=True)
    print(f"<<< exec")


@app.route("/api/info/", methods=["GET"])
def info():
    res = {"version": "0.0.2", "model": speaker_config}
    return res


@app.route("/api/fetch_speakers/", methods=["GET"])
def fetch_speakers():
    speakers = []
    for speaker in list(speaker_config.items()):
        try:
            for idx, sub_speaker in enumerate(synthesizers[speaker[0]]["speakers"]):
                speakers.append(
                    {
                        "name": f"{speaker[1]['speaker']} {idx}",
                        "id": f"{speaker[1]['speaker_id']}/{sub_speaker}",
                        "info": speaker[1]["info"],
                    }
                )
        except:
            speakers.append(
                {
                    "name": speaker[1]["speaker"],
                    "id": speaker[1]["speaker_id"],
                    "info": speaker[1]["info"],
                }
            )
    return jsonify(speakers)


def err_msg(msg):
    return {"errmsg": msg}


@app.route("/api/tts/", methods=["POST"])
def main():
    try:
        if "text" not in request.json:
            return err_msg("missing text")
        if "speaker_id" not in request.json:
            return err_msg("missing speaker_id")
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

        text = request.json["text"]

        if LIMIT_CHARS > 0 and len(text) > LIMIT_CHARS:
            return err_msg(f"input text too long (max {LIMIT_CHARS} characters)")

        if text[-1] == "." or text[-1] == "," or text[-1] == "!":
            pass
        else:
            text = f"{text}."

        abbr_start = None
        num_start = None
        res_text = ""
        curstate = "char"
        laststate = ""
        for index in range(len(text)):
            char = text[index]
            # print(f".. {index} {char}")
            if char.isupper():
                if abbr_start is None:
                    abbr_start = index
                    curstate = "abbr"
                    # print(f"starting abbreviation at {index}")
            elif is_number(char):
                if num_start is None:
                    num_start = index
                    curstate = "num"
                    # print(f"starting number at {index}")
            else:
                curstate = "char"
            # print(f"{laststate} -> {curstate}")

            if curstate != laststate:
                if laststate == "abbr":
                    written_abbr = ""
                    abbr = text[abbr_start:index]
                    # print(f"found abbreviation {abbr}")
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
                    # print(f"found number {num}")
                    res_text = res_text + " " + number_to_text(num) + " "
                    num_start = None

            if curstate == "char":
                res_text = res_text + char
            # print(f"res_text: {res_text}")

            laststate = curstate

        res_text = res_text.lower()
        res_text = res_text.replace("  ", " ")
        res_text = res_text.replace("\xad", "-")
        temp_wav_file_path = f"temp/{uuid.uuid4().hex}.wav"
        temp_mp3_file_path = f"temp/{uuid.uuid4().hex}.mp3"
        if multi_speaker:
            synthesizers[speaker_id]["tts"].tts_to_file(
                text=text,
                file_path=temp_wav_file_path,
                speaker=sub_speaker,
            )
        else:
            synthesizers[speaker_id]["tts"].tts_to_file(
                text=text, file_path=temp_wav_file_path
            )
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
        print(str(ret))
        return ret


if __name__ == "__main__":
    print("starting webserver ...")
    app.run(port=int(os.environ.get("PORT", 8080)), host="0.0.0.0", debug=False)
