#!/usr/bin/env python3
"""
Diagnostic script to test Piper TTS installation and functionality.
Run this to verify that Piper is properly installed and can generate speech.
"""

import os
import subprocess
import sys
import tempfile

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def check_file(path, description):
    exists = os.path.exists(path)
    status = "✓ FOUND" if exists else "✗ MISSING"
    print(f"{status:12} {description}")
    print(f"             {path}")
    return exists

print_section("PIPER TTS DIAGNOSTIC")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PIPER_EXE = os.path.abspath(os.path.join(BASE_DIR, "..", "piper", "piper.exe"))
MODEL_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "piper", "models", "en_US-lessac-medium.onnx"))
ESPEAK_DATA = os.path.abspath(os.path.join(BASE_DIR, "..", "piper", "espeak-ng-data"))

print_section("PATH VERIFICATION")
piper_ok = check_file(PIPER_EXE, "Piper executable")
model_ok = check_file(MODEL_PATH, "Model file (ONNX)")
espeak_ok = check_file(ESPEAK_DATA, "Espeak data directory")

all_ok = piper_ok and model_ok and espeak_ok

if not all_ok:
    print_section("MISSING FILES ERROR")
    print("❌ Cannot proceed - required files are missing.")
    print("\nExpected structure:")
    print("  facelessvideo/")
    print("  ├── piper/")
    print("  │   ├── piper.exe")
    print("  │   ├── models/")
    print("  │   │   └── en_US-lessac-medium.onnx")
    print("  │   └── espeak-ng-data/")
    print("  └── tts-service/")
    sys.exit(1)

print_section("TESTING PIPER EXECUTABLE")

test_text = "Hello, this is a test of the Piper text to speech system."
test_output = None

try:
    # Create temporary file for output
    fd, test_output = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    
    print(f"Test text: '{test_text}'")
    print(f"Output file: {test_output}")
    print()
    print("Executing: piper --model [model] --output_file [output] --espeak_data [data]")
    print("Input: (via stdin)")
    print()
    
    # Run Piper
    cmd = [
        PIPER_EXE,
        "--model", MODEL_PATH,
        "--output_file", test_output,
        "--espeak_data", ESPEAK_DATA,
    ]
    
    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    
    stdout, stderr = process.communicate(input=test_text, timeout=30)
    
    print(f"Exit code: {process.returncode}")
    if stdout:
        print(f"STDOUT: {stdout.strip()}")
    if stderr:
        print(f"STDERR: {stderr.strip()}")
    
    if process.returncode != 0:
        print_section("PIPER EXECUTION FAILED")
        print(f"❌ Piper exited with code {process.returncode}")
        print("\nPossible causes:")
        print("  1. Piper executable is corrupted or not compatible with Windows")
        print("  2. Required dependencies missing (e.g., Visual C++ Runtime)")
        print("  3. Model file is corrupted")
        print("  4. Insufficient disk space")
        sys.exit(1)
    
    # Check output file
    if os.path.exists(test_output):
        file_size = os.path.getsize(test_output)
        if file_size > 0:
            print_section("SUCCESS ✓")
            print(f"✓ Piper generated {file_size} bytes of audio")
            print(f"✓ Output file: {test_output}")
            print()
            print("Piper TTS is working correctly!")
            print("\nYou can now:");
            print("  1. Start the TTS service: uvicorn main:app --port 8000")
            print("  2. Test it at: http://localhost:8000/docs")
            print("  3. Or call: GET http://localhost:8000/tts?text=Hello")
        else:
            print_section("ERROR - EMPTY OUTPUT")
            print("❌ Piper generated an empty audio file")
            print("Check that the model file is not corrupted")
            sys.exit(1)
    else:
        print_section("ERROR - NO OUTPUT FILE")
        print("❌ Piper did not create the output file")
        print(f"Expected: {test_output}")
        sys.exit(1)

except subprocess.TimeoutExpired:
    print_section("TIMEOUT ERROR")
    print("❌ Piper timed out after 30 seconds")
    print("The system may be too slow or Piper is hanging")
    sys.exit(1)

except Exception as e:
    print_section("ERROR")
    print(f"❌ {type(e).__name__}: {str(e)}")
    sys.exit(1)

finally:
    # Cleanup
    if test_output and os.path.exists(test_output):
        try:
            os.remove(test_output)
        except:
            pass

print_section("COMPLETE")
sys.exit(0)
