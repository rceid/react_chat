from flask import Flask, render_template, request, jsonify
from functools import wraps
import mysql.connector  
import bcrypt
import configparser
import io
import random
import string
import datetime
from datetime import timedelta
import json

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

config = configparser.ConfigParser()
config.read('secrets.cfg')
DB_NAME = config['secrets']['DB_USERNAME']
DB_USERNAME = config['secrets']['DB_USERNAME']
DB_PASSWORD = config['secrets']['DB_PASSWORD']
PEPPER = config['secrets']['PEPPER']


def create_key():
    key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return key

def authenticate(cursor, identifier):
    query = "SELECT token_expires from users WHERE username=%s"
    cursor.execute(query, (identifier,))
    fetch = cursor.fetchone()
    if isinstance(fetch, dict):
        expiry = fetch['token_expires']
    else:
        expiry = fetch[0]
    try:
        if expiry < datetime.datetime.now(): #if token has expired
            return 403
        else:
            return 200
    except:
        return 404


@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/channel_name=<channel_name>')
@app.route('/channel_name=<channel_name>/<int:thread_id>')
def index_channel(channel_name=None, thread_id=None):
    return app.send_static_file('index.html')

# -------------------------------- API ROUTES ----------------------------------

@app.route('/api/signup', methods=['POST'])
def signup():
    body = request.get_json()
    email = body['email']
    username = body['username']
    password = body['password'] + PEPPER
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    try:
        connection = mysql.connector.connect(user=DB_USERNAME,
                                             database=DB_NAME,
                                             password=DB_PASSWORD)
        cursor = connection.cursor()
        query = "INSERT into users (email, username, password, token_session, token_expires) \
            VALUES (%s, %s, %s, %s, %s)"

        channel_query = "INSERT into last_viewed (username, channel_id) VALUES(%s, %s)"
    except:
        return {}, 302
    try:
        toke_sesh = create_key()
        expiry = datetime.datetime.now() + timedelta(hours=6)
        cursor.execute(query, (email, username, hashed, toke_sesh, expiry))
        cursor.execute('select channel_id from channels')
        channels = cursor.fetchall()
        q_params = [(username, c_id[0]) for c_id in channels]
        cursor.executemany(channel_query, (q_params))
        connection.commit()

        return {'sessionToken': toke_sesh}, 200
    except Exception as e:
        print(e)
        return {}, 303
    finally:
        cursor.close()
        connection.close()


@app.route('/api/login', methods=['POST'])
def login():
    body = request.get_json()
    email = body['email']
    password = body['password']
    try:
        connection = mysql.connector.connect(user=DB_USERNAME,
                                             database=DB_NAME,
                                             password=DB_PASSWORD)
        cursor = connection.cursor()
    except:
        return {}, 302

    query = "SELECT password FROM users WHERE email=%s"
    un_query = "SELECT username FROM users WHERE email=%s"
    session_update = "UPDATE users SET token_session=%s, token_expires=%s WHERE email=%s"
   
    try:
        cursor.execute(query, (email, ))
        hashed = cursor.fetchone()[0]

        cursor.execute(un_query, (email, ))
        username = cursor.fetchone()[0]

        if bcrypt.checkpw((password + PEPPER).encode('utf-8'),
                          hashed.encode('utf-8')):
            toke_sesh = create_key()  #creating session token
            expiry = datetime.datetime.now() + timedelta(hours=6)
            cursor.execute(session_update, (toke_sesh, expiry, email))
            connection.commit()
            return {"username": username, "sessionToken": toke_sesh}, 200
        return {}, 300
    except Exception as e:
        print(e)
        return {}, 303
    finally:
        cursor.close()
        connection.close()


@app.route('/api/create', methods=['POST'])
def create():
    body = request.get_json()
    channel_name = body['channelName']
    channel_name = channel_name.replace(" ", "_")
    username = body['username']
    try:
        connection = mysql.connector.connect(user=DB_USERNAME,
                                             database=DB_NAME,
                                             password=DB_PASSWORD)
        cursor = connection.cursor()
    except:
        return {}, 302
    
    auth_response = authenticate(cursor, username)
    if auth_response == 404 or auth_response == 403:
        return {}, auth_response

    query = "INSERT into channels (channel_name, creator) VALUES (%s, %s)"
    id_query = "SELECT channel_id FROM channels WHERE channel_name=%s"
    un_query = "SELECT username FROM users"
    channel_query = "INSERT into last_viewed (username, channel_id) VALUES(%s, %s)"

    try:
        cursor.execute(query, (channel_name, username))
        cursor.execute(id_query, (channel_name, ))
        channel_id = cursor.fetchone()[0]
        cursor.execute(un_query)
        users = cursor.fetchall()
        q_params = [(user[0], channel_id) for user in users]
        cursor.executemany(channel_query, (q_params))
        connection.commit()
        return {}, 200
    except Exception as e:
        print(e)
        return {}, 303
    finally:
        cursor.close()
        connection.close()


@app.route('/api/channels', methods=['GET'])
def channels():
    username = request.headers.get('username')
    try:
        connection = mysql.connector.connect(user=DB_USERNAME,
                                             database=DB_NAME,
                                             password=DB_PASSWORD)
        cursor = connection.cursor(dictionary=True)
    except:
        return {}, 302
    query = "SELECT creator, ch.channel_name, ch.channel_id, \
        (SELECT count(*) from messages WHERE message_id > last_read AND reply_to IS NULL AND channel_id=ch.channel_id) \
        as new_messages FROM last_viewed lv LEFT JOIN channels ch ON lv.channel_id = ch.channel_id WHERE lv.username=%s \
        ORDER BY ch.channel_id;"

    cursor.execute(query, (username, ))
    users = cursor.fetchall()
    cursor.close()
    connection.close()
    return json.dumps(users)


@app.route('/api/chats', methods=['GET'])
def chats():
    channel_id = request.headers.get('channel_id')
    username = request.headers.get("username")
    try:
        connection = mysql.connector.connect(user=DB_USERNAME,
                                             database=DB_NAME,
                                             password=DB_PASSWORD)
        cursor = connection.cursor(dictionary=True)
    except:
        return {}, 302
    last_viewed = "SELECT last_read FROM last_viewed WHERE username=%s AND channel_id=%s"
    cursor.execute(last_viewed, (username, channel_id))
    last = cursor.fetchone()['last_read']

    query = "SELECT * FROM messages m LEFT join \
        (SELECT reply_to, count(*) as replies FROM messages WHERE reply_to IS NOT NULL GROUP BY reply_to)\
        rep ON m.message_id=rep.reply_to WHERE channel_id=%s AND m.reply_to IS NULL and m.message_id <=%s;"
    cursor.execute(query, (channel_id, last))
    messages = cursor.fetchall()
    msg_query = "SELECT count(*) as total from messages WHERE channel_id=%s AND reply_to IS NULL"
    cursor.execute(msg_query, (channel_id,))
    total = cursor.fetchone()['total']
    new = total - len(messages)
    cursor.close()
    connection.close()
    return {"chats":messages, "newMsgs": new}


@app.route('/api/last_read', methods=['POST'])
def update_last():
    body = request.get_json()
    channel_id = body['channel']
    username = body['username']
    try:
        connection = mysql.connector.connect(user=DB_USERNAME,
                                             database=DB_NAME,
                                             password=DB_PASSWORD)
        cursor = connection.cursor()
    except:
        return {}, 302
    
    auth_response = authenticate(cursor, username)
    if auth_response == 404 or auth_response == 403:
        return {}, auth_response
    max_query = "SELECT max(message_id) from messages WHERE channel_id=%s AND reply_to IS NULL"
    cursor.execute(max_query, (channel_id,))
    last_msg = cursor.fetchone()[0]
    update = "UPDATE last_viewed SET last_read=%s WHERE channel_id=%s and username=%s"
    cursor.execute(update, (last_msg, channel_id, username))
    connection.commit()
    cursor.close()
    connection.close()
    return {}, 200


@app.route('/api/post_msg', methods=['POST'])
def post_msg():
    body = request.get_json()
    channel_id = body['channel_id']
    username = body['username']
    content = body['content']
    try:
        connection = mysql.connector.connect(user=DB_USERNAME,
                                             database=DB_NAME,
                                             password=DB_PASSWORD)
        cursor = connection.cursor(dictionary=True)
    except:
        return {}, 302

    auth_response = authenticate(cursor, username)
    if auth_response == 404 or auth_response == 403:
        return {}, auth_response

    query = "INSERT INTO messages (channel_id, author, body) VALUES (%s, %s, %s)"

    cursor.execute(query, (channel_id, username, content))
    connection.commit()
    cursor.close()
    connection.close()
    return {}, 200


@app.route('/api/delete', methods=['POST'])
def delete_chat():
    body = request.get_json()
    channel_id = body['channel']
    username = body['username']

    try:
        connection = mysql.connector.connect(user=DB_USERNAME,
                                             database=DB_NAME,
                                             password=DB_PASSWORD)
        cursor = connection.cursor(dictionary=True)
    except:
        return {}, 302

    auth_response = authenticate(cursor, username)
    if auth_response == 404 or auth_response == 403:
        return {}, auth_response

    query = "DELETE FROM messages WHERE channel_id=%s"
    query2 = "DELETE FROM last_viewed where channel_id=%s"
    query3 = "DELETE FROM channels where channel_id=%s"

    cursor.execute(query, (channel_id, ))
    cursor.execute(query2, (channel_id, ))
    cursor.execute(query3, (channel_id, ))
    connection.commit()
    cursor.close()
    connection.close()
    return {}, 200


@app.route('/api/replies', methods=['GET'])
def get_replies():
    message_id = request.headers.get('message_id')
    username = request.headers.get('username')
    try:
        connection = mysql.connector.connect(user=DB_USERNAME,
                                             database=DB_NAME,
                                             password=DB_PASSWORD)
        cursor = connection.cursor(dictionary=True)
    except:
        return {}, 302
    
    auth_response = authenticate(cursor, username)
    if auth_response == 404 or auth_response == 403:
        return {}, auth_response
        
    query = "SELECT * FROM messages WHERE message_id=%s OR reply_to=%s \
         ORDER BY message_id"

    cursor.execute(query, (message_id, message_id))
    thread = cursor.fetchall()
    cursor.close()
    connection.close()
    return json.dumps(thread), 200


@app.route('/api/post_reply', methods=['POST'])
def post_reply():
    body = request.get_json()
    message_id = body['message']
    username = body['username']
    content = body['content']
    try:
        connection = mysql.connector.connect(user=DB_USERNAME,
                                             database=DB_NAME,
                                             password=DB_PASSWORD)
        cursor = connection.cursor(dictionary=True)
    except:
        return {}, 302

    auth_response = authenticate(cursor, username)
    if auth_response == 404 or auth_response == 403:
        return {}, auth_response

    query = "INSERT INTO messages (reply_to, author, body) VALUES (%s, %s, %s)"

    cursor.execute(query, (message_id, username, content))
    connection.commit()
    cursor.close()
    connection.close()
    return {}, 200

@app.route('/api/change_name_email', methods=['POST'])
def change():
    body = request.get_json()
    new_name = body['name']
    new_email = body['email']
    username = body['user']

    try:
        connection = mysql.connector.connect(user=DB_USERNAME,
                                             database=DB_NAME,
                                             password=DB_PASSWORD)
        cursor = connection.cursor()
    except:
        return {}, 302
    
    auth_response = authenticate(cursor, username)
    if auth_response == 404 or auth_response == 403:
        return {}, auth_response

    if new_name:
        try:
            fk_query = "SET foreign_key_checks = {};"
            cursor.execute(fk_query.format(0))
            user_query = "UPDATE users SET username=%s WHERE username=%s"
            cursor.execute(user_query, (new_name, username))
            channel_query = "UPDATE channels SET creator=%s WHERE creator=%s"
            cursor.execute(channel_query, (new_name, username))
            viewed_query = "UPDATE last_viewed SET username=%s WHERE username=%s"
            cursor.execute(viewed_query, (new_name, username))
            msg_query = "UPDATE messages SET author=%s WHERE author=%s"
            cursor.execute(msg_query, (new_name, username))
            cursor.execute(fk_query.format(1))
            connection.commit()
            cursor.close()
            connection.close()
            return {}, 200
        except:
            return {}, 401

    elif new_email:
        try:
            query = "UPDATE users SET email=%s WHERE username=%s"
            cursor.execute(query, (new_email,username))
            connection.commit()
            cursor.close()
            connection.close()
            return {}, 200
        except:
            return {}, 401
    