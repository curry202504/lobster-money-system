# -*- coding: utf-8 -*-
"""Check WeChat database for Official Account article content"""
import sqlite3, os

base = os.path.join(os.environ['USERPROFILE'], 'Documents', 'WeChat Files', 'tujiaxin0903')

# Check PublicMsg.db
db_path = os.path.join(base, 'PublicMsg.db')
if os.path.exists(db_path):
    print(f'PublicMsg.db: {os.path.getsize(db_path)} bytes')
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        print(f'Tables: {[t[0] for t in tables]}')
        
        for table in tables:
            name = table[0]
            cols = cursor.execute(f'PRAGMA table_info({name})').fetchall()
            print(f'  {name} columns: {[c[1] for c in cols]}')
            count = cursor.execute(f'SELECT COUNT(*) FROM {name}').fetchone()[0]
            print(f'  {name} rows: {count}')
            if count > 0:
                sample = cursor.execute(f'SELECT * FROM {name} LIMIT 2').fetchall()
                print(f'  Sample: {sample[0] if sample else "empty"}')
        conn.close()
    except Exception as e:
        print(f'Error: {e}')

# Check MPPageFastLoad  
mp_dir = os.path.join(base, 'MPPageFastLoad')
if os.path.exists(mp_dir):
    files = os.listdir(mp_dir)
    print(f'\nMPPageFastLoad files: {len(files)}')
    for f in files[:10]:
        print(f'  {f}')

# Check FileStorage for any article images
fs_dir = os.path.join(base, 'FileStorage')
if os.path.exists(fs_dir):
    print(f'\nFileStorage contents:')
    for item in os.listdir(fs_dir)[:10]:
        print(f'  {item}')
