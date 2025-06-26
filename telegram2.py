from telethon import TelegramClient
import asyncio
import os

api_id = '29444654'
api_hash = 'c6b01218be0f632de83f78cee65b0a72'

client = TelegramClient('session_name', api_id, api_hash)

group_name = "Buy sell alert group"  # Use the exact name from your dialog list
last_id_file = "last_message_id.txt"

async def main():
    await client.start()
    # Find the dialog by name
    async for dialog in client.iter_dialogs():
        if dialog.name == group_name:
            group_entity = dialog.entity
            print(f"Group '{group_name}'found.")
            break
    else:
        print(f"Group '{group_name}' not found.")
        return

    # Load last processed message ID
    last_id = 0
    if os.path.exists(last_id_file):
        with open(last_id_file, "r") as f:
            try:
                last_id = int(f.read().strip())
                print(f"Last Id '{last_id}'.")
            except:
                last_id = 0

    new_last_id = last_id
    messages = []
    async for message in client.iter_messages(group_entity, limit=50):
        if message.id <= last_id:
            break
        if message.text:
            messages.append((message.id, message.text))
            print(f"message '{messages}'")
        if message.id > new_last_id:
            new_last_id = message.id

    # Sort messages by ID in ascending order
    messages.sort(key=lambda x: x[0])

    # Write messages in ascending order
    if messages:
        with open("group_messages.txt", "a", encoding="utf-8") as f:
            for _, text in messages:
                f.write(f"{text}\n\n")

    # Save the latest processed message ID
    if new_last_id > last_id:
        with open(last_id_file, "w") as f:
            f.write(str(new_last_id))

    print("New messages saved to group_messages.txt")
    await client.disconnect()  # Ensure the client is disconnected before closing the loop
if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(main())
    finally:
        loop.close()