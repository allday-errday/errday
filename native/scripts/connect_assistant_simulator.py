#!/usr/bin/env python3
"""Provision this developer's simulator Keychain, without printing/bundling a key."""
import argparse
import os
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--simulator', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
key = None
for line in (root / '.env.local').read_text().splitlines():
    name, sep, value = line.partition('=')
    if sep and name.strip() == 'OPENAI_API_KEY':
        key = value.strip().strip('"').strip("'")
if not key or not key.startswith('sk-'):
    raise SystemExit('No API key configured.')
env = os.environ.copy()
env['SIMCTL_CHILD_ERRDAY_TEST_API_KEY'] = key
subprocess.run(['xcrun', 'simctl', 'terminate', args.simulator, 'com.errday.native'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
result = subprocess.run(['xcrun', 'simctl', 'launch', args.simulator, 'com.errday.native'], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print('Assistant key provisioning launched.' if result.returncode == 0 else 'Simulator launch failed; no key was printed.')
raise SystemExit(result.returncode)
