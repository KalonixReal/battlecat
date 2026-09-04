#!/usr/bin/env python3
"""Gemini VLM agent — analyze game screenshots against the original Battle Cats.
   Usage:
     python3 tools/vlm.py <image_path> "prompt"            — single image
     python3 tools/vlm.py <img1> <img2> "prompt"           — compare two images
   Env: GEMINI_API_KEY (required). Model: gemini-2.5-flash.
"""
import os, sys
from google import genai
from google.genai import types
from PIL import Image

MODEL = 'gemini-3.6-flash'
key = os.environ.get('GEMINI_API_KEY')
if not key:
    print("ERROR: GEMINI_API_KEY not set"); sys.exit(1)
client = genai.Client(api_key=key)

args = sys.argv[1:]
if len(args) < 2:
    print("Usage: vlm.py <image...> <prompt>"); sys.exit(1)
prompt = args[-1]
paths = args[:-1]
contents = []
for p in paths:
    im = Image.open(p)
    if im.width > 1400:  # downscale huge screenshots
        r = 1400 / im.width
        im = im.resize((1400, int(im.height * r)))
    contents.append(im)
contents.append(prompt)

try:
    resp = client.models.generate_content(
        model=MODEL, contents=contents,
        config=types.GenerateContentConfig(temperature=0.3, max_output_tokens=2048))
    print(resp.text)
except Exception as e:
    print(f"VLM ERROR: {e}"); sys.exit(2)
