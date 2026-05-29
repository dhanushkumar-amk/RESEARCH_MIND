import os
import time
import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
from app.core.config import settings

class S3Service:
    def __init__(self):
        self.bucket_name = settings.aws_s3_bucket
        self.region = settings.aws_region
        
        # Check if AWS credentials are provided
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=self.region
            )
            self.use_mock = False
        else:
            # Fallback to local file storage for mock/local development
            self.use_mock = True
            self.local_upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "local_storage")
            os.makedirs(self.local_upload_dir, exist_ok=True)
            print(f"AWS credentials not configured. Falling back to local storage: {self.local_upload_dir}")

    def _execute_with_retry(self, operation, *args, retries=3, backoff=2, **kwargs):
        """
        Helper method to execute S3 operations with exponential backoff retry logic.
        """
        sleep_time = backoff
        for attempt in range(retries):
            try:
                return operation(*args, **kwargs)
            except ClientError as e:
                # Do not retry client auth/permission errors
                status_code = e.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
                if status_code in {403, 401, 404}:
                    raise e
                if attempt == retries - 1:
                    raise e
            except Exception as e:
                if attempt == retries - 1:
                    raise e
            
            print(f"S3 operation failed: {args}. Retrying in {sleep_time}s... (Attempt {attempt+1}/{retries})")
            time.sleep(sleep_time)
            sleep_time *= 2

    async def upload_file(self, file: UploadFile, s3_key: str) -> str:
        """
        Uploads an UploadFile to S3 (or local storage in mock mode).
        """
        if self.use_mock:
            # Create subdirectories locally to mirror the S3 path structure
            file_path = os.path.join(self.local_upload_dir, s3_key)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            try:
                content = await file.read()
                with open(file_path, "wb") as f:
                    f.write(content)
                await file.seek(0)
                return f"file:///{file_path.replace(os.sep, '/')}"
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save file locally: {str(e)}"
                )
        else:
            try:
                await file.seek(0)
                # Upload with retries
                self._execute_with_retry(
                    self.s3_client.upload_fileobj,
                    file.file,
                    self.bucket_name,
                    s3_key,
                    ExtraArgs={"ContentType": file.content_type}
                )
                return s3_key  # Store the key in MongoDB to generate presigned URLs on retrieval
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to upload file to S3: {str(e)}"
                )

    async def upload_bytes(self, data: bytes, s3_key: str, content_type: str = "text/plain") -> str:
        """
        Uploads raw bytes (e.g. scraped text or YouTube transcripts) to S3.
        """
        if self.use_mock:
            file_path = os.path.join(self.local_upload_dir, s3_key)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            try:
                with open(file_path, "wb") as f:
                    f.write(data)
                return f"file:///{file_path.replace(os.sep, '/')}"
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save scraped content locally: {str(e)}"
                )
        else:
            try:
                self._execute_with_retry(
                    self.s3_client.put_object,
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=data,
                    ContentType=content_type
                )
                return s3_key
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to upload data to S3: {str(e)}"
                )

    def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> str:
        """
        Generates a secure presigned S3 URL for temporary file access.
        """
        if self.use_mock:
            # Local file URL is returned as-is
            file_path = os.path.join(self.local_upload_dir, s3_key)
            return f"file:///{file_path.replace(os.sep, '/')}"
        
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": s3_key},
                ExpiresIn=expiration
            )
            return url
        except Exception as e:
            print(f"Error generating presigned URL for {s3_key}: {e}")
            # Fallback to standard URL
            return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"

    async def delete_file(self, s3_key: str):
        """
        Deletes a file from S3 or local mock storage.
        """
        if self.use_mock:
            file_path = os.path.join(self.local_upload_dir, s3_key)
            if os.path.exists(file_path):
                os.remove(file_path)
        else:
            try:
                self._execute_with_retry(
                    self.s3_client.delete_object,
                    Bucket=self.bucket_name,
                    Key=s3_key
                )
            except Exception as e:
                print(f"Warning: Failed to delete S3 object {s3_key}: {e}")
