from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING

from app.core.config import settings


client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global client, database

    client = AsyncIOMotorClient(settings.mongodb_uri)
    database = client[settings.resolved_mongodb_database]

    await database.users.create_index([("email", ASCENDING)], unique=True)
    await database.email_verifications.create_index("expires_at", expireAfterSeconds=0)
    await database.email_verifications.create_index([("email", ASCENDING)])
    await database.password_resets.create_index("expires_at", expireAfterSeconds=0)
    await database.password_resets.create_index([("email", ASCENDING)])
    await database.refresh_tokens.create_index([("jti", ASCENDING)], unique=True)
    await database.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
    await database.refresh_tokens.create_index([("user_id", ASCENDING)])


async def close_mongo_connection() -> None:
    global client, database

    if client is not None:
        client.close()
    client = None
    database = None


def get_database() -> AsyncIOMotorDatabase:
    if database is None:
        raise RuntimeError("MongoDB connection has not been initialized.")
    return database
