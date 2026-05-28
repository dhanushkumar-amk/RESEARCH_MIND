import os
import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
from app.core.config import settings

class S3Service:
    def __init__(self):
        self.bucket_name = settings.aws_s3_bucket
        self.region = settings.aws_region
        
        # Check if AWS credentials are valid and not placeholders
        has_credentials = (
            settings.aws_access_key_id 
            and settings.aws_access_key_id != "your_aws_access_key_here"
            and settings.aws_secret_access_key 
            and settings.aws_secret_access_key != "your_aws_secret_key_here"
        )
        
        if has_credentials:
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

    async def upload_file(self, file: UploadFile, s3_key: str) -> str:
        """
        Uploads a file to S3 (or saves locally if mock mode is active)
        and returns the S3 public URL or mock local URL.
        """
        if self.use_mock:
            # Save file locally
            file_path = os.path.join(self.local_upload_dir, s3_key.replace("/", "_"))
            try:
                content = await file.read()
                with open(file_path, "wb") as f:
                    f.write(content)
                # Reset file cursor just in case
                await file.seek(0)
                return f"file:///{file_path.replace(os.sep, '/')}"
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save file locally: {str(e)}"
                )
        else:
            # Upload to S3
            try:
                # Reset stream cursor just in case
                await file.seek(0)
                self.s3_client.upload_fileobj(
                    file.file,
                    self.bucket_name,
                    s3_key,
                    ExtraArgs={"ContentType": file.content_type}
                )
                return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            except ClientError as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"AWS S3 Upload failed: {str(e)}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"An error occurred during upload: {str(e)}"
                )

    async def delete_file(self, s3_key: str):
        """
        Deletes a file from S3 or local mock storage.
        """
        if self.use_mock:
            file_path = os.path.join(self.local_upload_dir, s3_key.replace("/", "_"))
            if os.path.exists(file_path):
                os.remove(file_path)
        else:
            try:
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            except Exception as e:
                print(f"Warning: Failed to delete S3 object {s3_key}: {e}")
