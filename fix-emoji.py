#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix broken emoji encoding in breed/page.tsx"""

import re

# Mapping of broken encodings to correct emojis
EMOJI_MAP = {
    'рџ§¬': '🧬',  # DNA
    'вЂў': '•',   # bullet point
    'вљЎ': '⚗️',  # test tube/flask
    'вњ…': '✅',  # check mark
    'рџ"—': '📗',  # green book
    'рџ'ё': '💸',  # money flying
    'вљҐ': '⚥',   # gender symbols
    'рџЋІ': '🎲',  # dice
    'вЏ±пёЏ': '⏱️',  # stopwatch
    'вљ пёЏ': '⚠️',  # warning
    'вљ°пёЏ': '⚰️',  # coffin
    'рџљ«': '🚫',  # prohibited
    'вЏі': '⏳',   # hourglass
    'рџ"'': '🔒',  # locked
    'OCTAAвЂ"WMON': 'OCTAA–WMON',  # em dash
}

def fix_emoji_encoding(file_path):
    """Fix broken emoji encoding in file"""
    print(f"Fixing emoji encoding in {file_path}...")
    
    # Read file with UTF-8 encoding
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Count replacements
    total_replacements = 0
    
    # Replace broken encodings with correct emojis
    for broken, correct in EMOJI_MAP.items():
        count = content.count(broken)
        if count > 0:
            content = content.replace(broken, correct)
            total_replacements += count
            print(f"  Replaced '{broken}' → '{correct}' ({count} times)")
    
    # Write back to file
    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    
    print(f"✅ Done! Total replacements: {total_replacements}")
    return total_replacements

if __name__ == '__main__':
    file_path = 'app/breed/page.tsx'
    total = fix_emoji_encoding(file_path)
    
    if total == 0:
        print("⚠️ No broken emojis found. File may already be fixed.")
    else:
        print(f"🎉 Fixed {total} broken emojis!")
