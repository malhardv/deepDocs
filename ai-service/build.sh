#!/bin/bash
echo "Installing PyTorch for CPU only (~150MB instead of 800MB)..."
pip install torch --index-url https://download.pytorch.org/whl/cpu

echo "Installing remaining requirements..."
pip install -r requirements.txt
