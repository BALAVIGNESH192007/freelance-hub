import sqlite3
import os
from flask import g

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'freelance_hub.db')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE_PATH)
        db.row_factory = dict_factory
        # Enable Foreign Key support in SQLite
        db.execute("PRAGMA foreign_keys = ON;")
    return db

def init_db():
    print(f"Initializing database at: {DATABASE_PATH}")
    db = sqlite3.connect(DATABASE_PATH)
    with open(SCHEMA_PATH, 'r') as f:
        schema = f.read()
    db.executescript(schema)
    db.commit()
    db.close()
    print("Database initialized successfully.")

def query_db(query, args=(), one=False):
    db = get_db()
    cur = db.execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

def insert_db(query, args=()):
    db = get_db()
    cur = db.execute(query, args)
    db.commit()
    last_row_id = cur.lastrowid
    cur.close()
    return last_row_id

def modify_db(query, args=()):
    db = get_db()
    cur = db.execute(query, args)
    db.commit()
    rowcount = cur.rowcount
    cur.close()
    return rowcount
