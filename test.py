# from telethon import TelegramClient
# import asyncio

# api_id = '29444654'
# api_hash = 'c6b01218be0f632de83f78cee65b0a72'

# client = TelegramClient('session_name', api_id, api_hash)

# async def main():
#     await client.start()
#     async for dialog in client.iter_dialogs():
#         print(f"Name: {dialog.name}, ID: {dialog.id}, Username: {dialog.entity.username}")

# asyncio.run(main())

from telethon import TelegramClient
import asyncio

api_id = '29444654'
api_hash = 'c6b01218be0f632de83f78cee65b0a72'

client = TelegramClient('session_name', api_id, api_hash)

group_name = "Buy sell alert group"  # Use the exact name from your dialog list

async def main():
    await client.start()
    # Find the dialog by name
    async for dialog in client.iter_dialogs():
        if dialog.name == group_name:
            group_entity = dialog.entity
            break
    else:
        print(f"Group '{group_name}' not found.")
        return

    with open("group_messages.txt", "w", encoding="utf-8") as f:
        async for message in client.iter_messages(group_entity, limit=10):
            if message.text:
                f.write(f"{message.text}\n\n")
    print("Messages saved to group_messages.txt")

asyncio.run(main())
