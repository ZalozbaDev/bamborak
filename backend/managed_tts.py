import time
import threading
import gc
import torch
from TTS.api import TTS

class ManagedTTS:
    def __init__(self, model_path, config_path, device):
        self.tts = TTS(
            model_path=model_path,
            config_path=config_path,
        ).to(device)

        self.device = device
        self.last_used = time.time()
        self.active_users = 0
        self.lock = threading.Lock()

    def acquire(self):
        with self.lock:
            self.active_users += 1
            self.last_used = time.time()
            return self.tts

    def release(self):
        with self.lock:
            self.active_users -= 1
            self.last_used = time.time()

    def can_delete(self, idle_seconds):
        with self.lock:
            return (
                self.active_users == 0
                and (time.time() - self.last_used) > idle_seconds
            )

    def destroy(self):
        with self.lock:
            try:
                self.tts.to("cpu")
            except Exception:
                pass
            del self.tts

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
