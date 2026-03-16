from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import os
import sys
import logging
import traceback
import html
import uuid
import logging
import traceback
import html

# Force UTF-8 output encoding
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='[TTS] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

# edge-tts import
try:
    import edge_tts
    logger.info("edge-tts loaded successfully")
except ImportError as e:
    logger.error(f"Failed to import edge-tts: {e}")
    logger.error("Run: pip install edge-tts")
    raise

app = FastAPI()

# Configuration
BASE_DIR = os.path.dirname(__file__)
OUTPUT_DIR = os.path.abspath(os.path.join(BASE_DIR, "outputs"))
MAX_TEXT_LENGTH = 5000

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Voice map: UI voice IDs → Edge TTS voice names ────────────────────────────
VOICE_MAP: dict[str, str] = {
    # Character exact mappings
    "voice-ben": "en-US-GuyNeural",
    "voice-gojo": "en-GB-RyanNeural",
    "voice-biden": "en-US-RogerNeural",
    "voice-obama": "en-US-ChristopherNeural",
    "voice-peter": "en-US-EricNeural",
    "voice-spongebob": "en-US-SteffanNeural",
    "voice-squidward": "en-US-AndrewNeural",
    "voice-stewie": "en-GB-ArthurNeural",
    "voice-sukuna": "en-US-BrianNeural",
    "voice-trump": "en-US-DavisNeural",
    # Legacy Wavenet IDs kept for backward compatibility
    "en-US-Wavenet-D": "en-US-GuyNeural",
    "en-US-Wavenet-F": "en-US-JennyNeural",
    "en-US-Wavenet-A": "en-US-ChristopherNeural",
    "en-US-Wavenet-C": "en-US-AriaNeural",
    "en-GB-Wavenet-B": "en-GB-RyanNeural",
    "en-GB-Wavenet-C": "en-GB-SoniaNeural",
    "en-AU-Wavenet-B": "en-AU-WilliamNeural",
    "en-AU-Wavenet-A": "en-AU-NatashaNeural",
    # Native Edge TTS voice names pass through directly
}

DEFAULT_VOICE = "en-US-GuyNeural"

logger.info("=" * 60)
logger.info("  TTS SERVICE — edge-tts backend")
logger.info("=" * 60)
logger.info(f"Output Dir : {OUTPUT_DIR}")
logger.info(f"Default Voice: {DEFAULT_VOICE}")
logger.info("=" * 60)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "backend": "edge-tts",
        "output_dir": OUTPUT_DIR,
        "output_dir_exists": os.path.exists(OUTPUT_DIR),
    }


@app.get("/voices")
async def list_voices():
    """Return all available Edge TTS voices."""
    try:
        voices = await edge_tts.list_voices()
        return {"voices": voices}
    except Exception as e:
        logger.error(f"Failed to list voices: {e}")
        raise HTTPException(status_code=500, detail=f"Could not fetch voices: {str(e)[:200]}")


@app.get("/tts")
async def tts(text: str, voice: str = DEFAULT_VOICE, rate: str = "+0%"):
    """
    Generate speech from text using Microsoft Edge TTS.

    Params:
      text  — the text to synthesize (required)
      voice — Edge TTS voice name or legacy Wavenet ID (optional, default: en-US-GuyNeural)
      rate  — speed alteration, e.g. '+10%' or '-10%'


    Returns: MP3 audio stream
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="text parameter is required and must not be empty")
    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail=f"text must not exceed {MAX_TEXT_LENGTH} characters")

    # Resolve voice: check map, otherwise use as-is (allow native Edge voice names)
    resolved_voice = VOICE_MAP.get(voice, voice)

    import re
    # Clean up any potential AI-generated SSML tags so that Edge TTS doesn't read them aloud.
    # We replace <break> with ellipses (...) which forces Microsoft Neural TTS to pause naturally.
    clean_text = text
    clean_text = re.sub(r'<break[^>]*>', '... ', clean_text)
    clean_text = re.sub(r'</?(speak|voice|prosody|emphasis)[^>]*>', '', clean_text)

    filename = f"{uuid.uuid4()}.mp3"
    output_path = os.path.join(OUTPUT_DIR, filename)

    logger.info(f"TTS: voice='{resolved_voice}' rate='{rate}' text='{clean_text[:60]}{'...' if len(clean_text) > 60 else ''}'")

    try:
        # Edge TTS creates its own SSML internally and escapes text, so we pass it clean string + native 'rate' param.
        communicate = edge_tts.Communicate(text=clean_text, voice=resolved_voice, rate=rate)
        await communicate.save(output_path)
    except edge_tts.exceptions.NoAudioReceived:
        # Some voices reject certain rate/text combos — retry with progressively safer settings
        logger.warning(f"NoAudioReceived with rate='{rate}' voice='{resolved_voice}', retrying...")
        if os.path.exists(output_path):
            os.remove(output_path)

        # Fallback voice map — if a voice keeps failing, swap to a reliable alternative
        FALLBACK_VOICE: dict[str, str] = {
            "en-US-DavisNeural":       "en-US-GuyNeural",
            "en-US-BrianNeural":       "en-US-ChristopherNeural",
            "en-GB-ArthurNeural":      "en-GB-RyanNeural",
            "en-US-SteffanNeural":     "en-US-EricNeural",
            "en-US-AndrewNeural":      "en-US-RogerNeural",
        }

        retries = [
            (resolved_voice, "+0%"),
            (FALLBACK_VOICE.get(resolved_voice, resolved_voice), "+0%"),
            ("en-US-GuyNeural", "+0%"),
        ]

        success = False
        for retry_voice, retry_rate in retries:
            try:
                logger.info(f"Retry: voice='{retry_voice}' rate='{retry_rate}'")
                communicate = edge_tts.Communicate(text=clean_text, voice=retry_voice, rate=retry_rate)
                await communicate.save(output_path)
                success = True
                logger.info(f"Retry succeeded with voice='{retry_voice}'")
                break
            except Exception as retry_err:
                logger.warning(f"Retry failed (voice='{retry_voice}'): {retry_err}")
                if os.path.exists(output_path):
                    os.remove(output_path)

        if not success:
            raise HTTPException(status_code=500, detail="TTS generation failed after all retries: No audio received")
    except Exception as e:
        logger.error(f"edge-tts generation failed: {e}")
        logger.error(traceback.format_exc())
        # Clean up partial file if it exists
        if os.path.exists(output_path):
            os.remove(output_path)
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)[:200]}")

    # Verify output
    if not os.path.exists(output_path):
        raise HTTPException(status_code=500, detail="TTS output file was not created")

    file_size = os.path.getsize(output_path)
    if file_size == 0:
        os.remove(output_path)
        raise HTTPException(status_code=500, detail="TTS output file is empty")

    logger.info(f"TTS: SUCCESS {file_size} bytes -> {filename}")

    return FileResponse(
        path=output_path,
        media_type="audio/mpeg",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal error: {str(exc)[:200]}"},
    )
