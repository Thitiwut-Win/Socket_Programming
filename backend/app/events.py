from app.users import users
from app.rooms import rooms
from app.ai_service import ask_grok

# all socket events (like connect, register_user, send message) are automatically triggered whenever the client interacts.
def register_socketio_events(sio):

    print("----------------------------------------------")
    print("Current groups : ", rooms)
    print("Current Users : ", users)
    print("----------------------------------------------")

    @sio.event
    async def connect(sid, environ):
        print(f"[+] New connection: {sid}")

    @sio.event
    async def disconnect(sid):
        username = users.pop(sid, None)
        print(f"[-] Disconnected: {username}")

        # Remove user from all rooms
        for group_name in list(rooms.keys()):
            if username in rooms[group_name]:
                rooms[group_name].remove(username)
                # Remove empty rooms
                if not rooms[group_name]:
                    del rooms[group_name]
                    print(f"[🧹 Removed empty group] {group_name}")

        # Send updated lists
        for target_sid, target_name in users.items():
            visible_users = [name for s, name in users.items() if s != target_sid]
            await sio.emit('update_user_list', visible_users, to=target_sid)
        await sio.emit('update_group_list', rooms)

    @sio.event
    async def register_user(sid, data):
        username = data.get("username")
        
        # Check if this username is already in use
        if username in users.values():
            print(f"[⚠️ Duplicate Login Attempt] {username}")
            await sio.emit("error_message", {
                "message": f"Username '{username}' is already taken. Please choose another name."
            }, to=sid)
            return

        users[sid] = username
        print(f"[User Registered] {username}")
        
        # Send updated user list to everyone
        for target_sid, target_name in users.items():
            visible_users = [name for s, name in users.items() if s != target_sid]
            await sio.emit('update_user_list', visible_users, to=target_sid)
        
        await sio.emit("update_group_list", rooms, to=sid)
        
    @sio.event
    async def send_private_message(sid, data):
        sender = users.get(sid)
        receiver_name = data.get("to")

        msg_type = data.get("type", "text")
        text = data.get("message")
        image = data.get("image")

        # find receiver SID
        target_sid = next((s for s, n in users.items() if n == receiver_name), None)

        payload = {"from": sender}

        if msg_type == "text":
            payload["message"] = text
            payload["type"] = "text"

        elif msg_type == "image":
            payload["image"] = image
            payload["type"] = "image"

        await sio.emit("receive_private_message", payload, to=target_sid)


    @sio.event
    async def create_group(sid, data):
        group_name = data.get('group')
        username = users.get(sid)
        
        if not group_name:
            await sio.emit("error_message", {"message": "Group name cannot be empty"}, to=sid)
            return

        if group_name in rooms:
            await sio.emit("error_message", {"message": f"Group '{group_name}' already exists"}, to=sid)
            return

        # create new room
        rooms[group_name] = [username]
        await sio.enter_room(sid, group_name)
        print(f"[Group Created] {group_name} by {username}")

        # notify all users
        await sio.emit("update_group_list", rooms)

    @sio.event
    async def join_group(sid, data):
        group_name = data.get('group')
        username = users.get(sid)

        if group_name not in rooms:
            await sio.emit("error_message", {"message": "Group not found"}, to=sid)
            return

        if username not in rooms[group_name]:
            rooms[group_name].append(username)
            await sio.enter_room(sid, group_name)
            print(f"{username} joined {group_name}")
            await sio.emit("group_notification", {
                "group": group_name,
                "message": f"{username} joined the group"
            }, room=group_name)

        # Update everyone’s group list
        await sio.emit("update_group_list", rooms)

    @sio.event
    async def send_group_message(sid, data):
        group_name = data.get("group")
        sender = users.get(sid)
        msg_type = data.get("type", "text")
        message = data.get("message")
        image = data.get("image")

        if not group_name or group_name not in rooms:
            await sio.emit("error_message", {"message": "Invalid group"}, to=sid)
            return

        if msg_type == "text":
            print(f"[Group {group_name}] {sender}: {message}")
            payload = {"group": group_name, "from": sender, "message": message, "type": "text"}
        elif msg_type == "image":
            print(f"[Group {group_name}] {sender} sent an image")
            payload = {"group": group_name, "from": sender, "image": image, "type": "image"}
        else:
            await sio.emit("error_message", {"message": "Unsupported message type"}, to=sid)
            return

        await sio.emit("receive_group_message", payload, room=group_name, skip_sid=sid)
    
    @sio.event
    async def ask_ai(sid, data):
        message = data.get("message")

        print(f"[AI Chat] User {users.get(sid)}: {message}")

        # Ask Grok
        ai_reply = await ask_grok(message)

        # Send reply back only to this user
        await sio.emit("ai_response", {
            "from": "AI Assistant 🤖",
            "message": ai_reply
        }, to=sid)