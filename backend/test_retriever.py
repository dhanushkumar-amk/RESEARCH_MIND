import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    client = AsyncIOMotorClient('mongodb+srv://nirjavijaykumar1311_db_user:ZNNAvS1JphexPXJc@cluster-ai.yvtwmjg.mongodb.net/ResearchMind?appName=cluster-ai')
    count = await client.ResearchMind.chunks.count_documents({})
    print("CHUNK COUNT:", count)

asyncio.run(test())
