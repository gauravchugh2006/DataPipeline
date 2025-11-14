#!/usr/bin/env python3
import hashlib
import logging
import os

import boto3
from botocore.exceptions import ClientError

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
BUCKET_NAME = os.getenv("MINIO_BUCKET", "raw-data")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILES_TO_UPLOAD = {
    "sample_data.csv": os.path.join(BASE_DIR, "data_source", "sample_data.csv"),
    "customers_source.csv": os.path.join(BASE_DIR, "data_source", "customers_source.csv"),
    "deliveries.csv": os.path.join(BASE_DIR, "data_source", "deliveries.csv"),
    "support_interactions.csv": os.path.join(BASE_DIR, "data_source", "support_interactions.csv"),
    "csr_badges.csv": os.path.join(BASE_DIR, "data_source", "csr_badges.csv"),
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
    logging.info("Connecting to MinIO at %s...", MINIO_ENDPOINT)
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
            logging.info("Bucket '%s' not found. Creating it...", BUCKET_NAME)
            s3.create_bucket(Bucket=BUCKET_NAME)
            logging.info("Bucket '%s' created successfully.", BUCKET_NAME)
        else:
            logging.error("Error checking/creating bucket: %s", e)
            raise

    # Iterate through each file to upload
    for object_name, file_path in FILES_TO_UPLOAD.items():
        if not os.path.exists(file_path):
            logging.warning("Skipping upload for '%s': File does not exist locally.", file_path)
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
            logging.info("Found existing object '%s' with ETag: %s", object_name, etag)
        except ClientError as e:
            error_code = int(e.response['Error']['Code'])
            if error_code == 404:
                logging.info("Object '%s' not found in bucket. Will upload.", object_name)
            else:
                logging.warning("Unexpected error when checking object in MinIO for '%s': %s", object_name, e)

        if etag != file_md5:
            logging.info("File '%s' new or changed. Uploading new version as '%s'...", file_path, object_name)
            try:
                s3.upload_file(file_path, BUCKET_NAME, object_name)
                logging.info("Successfully uploaded '%s' to '%s/%s'.", file_path, BUCKET_NAME, object_name)
            except Exception as e:
                logging.error("Error uploading file '%s' to Minio: %s", file_path, e)
                raise
        else:
            logging.info("No changes detected for '%s'. Skipping upload.", file_path)

if __name__ == '__main__':
    main()
