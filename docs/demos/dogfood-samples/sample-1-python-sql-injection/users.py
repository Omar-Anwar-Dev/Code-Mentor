"""Sample 1 — buggy Python web (SQL injection + missing input validation)."""
import sqlite3


def find_user(name):
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")  # SQL injection
    return cursor.fetchall()


def update_email(user_id, email):
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute(f"UPDATE users SET email = '{email}' WHERE id = {user_id}")
    conn.commit()
