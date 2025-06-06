#!/usr/bin/env python3
import boto3, hashlib
from botocore.exceptions import ClientError
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

MINIO_ENDPOINT = "localhost:9000"
ACCESS_KEY = "minioadmin"
SECRET_KEY = "minioadmin"
BUCKET_NAME = "raw-data"
# Define the files to upload
FILES_TO_UPLOAD = {
    "sample_data.csv": "data_source/sample_data.csv",
    "customers_source.csv": "data_source/customers_source.csv"
}

def get_file_md5(file_path):
    """Calculates the MD5 hash of a file."""
    hash_md5 = hashlib.md5()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except FileNotFoundError:
        logging.error(f"Error: File not found at {file_path}")
        raise
    except Exception as e:
        logging.error(f"Error calculating MD5 for {file_path}: {e}")
        raise

def main():
    """
    Connects to MinIO, creates a bucket if it doesn't exist,
    and uploads files if they are new or changed.
    """
    logging.info(f"Connecting to MinIO at {MINIO_ENDPOINT}...")
    s3 = boto3.client('s3',
                      endpoint_url=f"http://{MINIO_ENDPOINT}",
                      aws_access_key_id=ACCESS_KEY,
                      aws_secret_access_key=SECRET_KEY,
                      region_name='us-east-1')
    
    # Create bucket if it doesn't exist
    try:
        s3.head_bucket(Bucket=BUCKET_NAME)
        logging.info(f"Bucket '{BUCKET_NAME}' already exists.")
    except ClientError as e:
        error_code = int(e.response['Error']['Code'])
        if error_code == 404:
            logging.info(f"Bucket '{BUCKET_NAME}' not found. Creating it...")
            s3.create_bucket(Bucket=BUCKET_NAME)
            logging.info(f"Bucket '{BUCKET_NAME}' created successfully.")
        else:
            logging.error(f"Error checking/creating bucket: {e}")
            raise

    # Iterate through each file to upload
    for object_name, file_path in FILES_TO_UPLOAD.items():
        if not os.path.exists(file_path):
            logging.warning(f"Skipping upload for '{file_path}': File does not exist locally.")
            continue

        try:
            file_md5 = get_file_md5(file_path)
        except Exception:
            logging.error(f"Exiting due to error reading file: {file_path}")
            continue # Continue to next file if one fails

        etag = None
        try:
            response = s3.head_object(Bucket=BUCKET_NAME, Key=object_name)
            etag = response['ETag'].strip('"')
            logging.info(f"Found existing object '{object_name}' with ETag: {etag}")
        except ClientError as e:
            error_code = int(e.response['Error']['Code'])
            if error_code == 404:
                logging.info(f"Object '{object_name}' not found in bucket. Will upload.")
            else:
                logging.warning(f"Unexpected error when checking object in MinIO for '{object_name}': {e}")
        
        if etag != file_md5:
            logging.info(f"File '{file_path}' new or changed. Uploading new version as '{object_name}'...")
            try:
                s3.upload_file(file_path, BUCKET_NAME, object_name)
                logging.info(f"Successfully uploaded '{file_path}' to '{BUCKET_NAME}/{object_name}'.")
            except Exception as e:
                logging.error(f"Error uploading file '{file_path}' to Minio: {e}")
                raise
        else:
            logging.info(f"No changes detected for '{file_path}'. Skipping upload.")

if __name__ == '__main__':
    main()
