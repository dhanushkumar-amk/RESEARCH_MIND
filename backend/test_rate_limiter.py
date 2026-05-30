import logging
import sys

# Configure logging to console to see connection messages
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

sys.path.append(".")

from app.security.rate_limiter import limiter, storage_uri

print("=" * 60)
print("RATE LIMITER CONFIGURATION")
print("=" * 60)
print(f"Resolved Storage URI: {storage_uri}")
if storage_uri.startswith("rediss://"):
    print("Success: Rate limiter resolved to Upstash Redis SSL connection!")
else:
    print("Failed: Rate limiter fell back to MemoryStorage.")
print("=" * 60)
