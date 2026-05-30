import redis

def test_connection():
    # Constructing standard Upstash Redis TCP SSL URL
    host = "artistic-stingray-92400.upstash.io"
    port = 6379
    password = "gQAAAAAAAWjwAAIgcDI5YmRmOGM2ZTVmNDk0OTFmOTc1OWQ2Mjk3M2ZlZjUxOQ"
    
    url = f"rediss://default:{password}@{host}:{port}"
    print(f"Connecting to: rediss://default:***@{host}:{port}")
    
    try:
        r = redis.Redis.from_url(url, socket_connect_timeout=5.0, socket_timeout=5.0)
        pong = r.ping()
        print(f"Success! Ping response: {pong}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_connection()
