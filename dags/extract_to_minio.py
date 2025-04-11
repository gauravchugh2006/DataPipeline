#!/usr/bin/env python3
import boto3, hashlib
from botocore.exceptions import ClientError

MINIO_ENDPOINT = "localhost:9000"
ACCESS_KEY = "minioadmin"
SECRET_KEY = "minioadmin"
BUCKET_NAME = "raw-data"
FILE_PATH = "data_source/sample_data.csv"
OBJECT_NAME = "sample_data.csv"

def get_file_md5(file_path):
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def main():
    s3 = boto3.client('s3',
                      endpoint_url=f"http://{MINIO_ENDPOINT}",
                      aws_access_key_id=ACCESS_KEY,
                      aws_secret_access_key=SECRET_KEY,
                      region_name='us-east-1')
    # Create bucket if it doesn't exist
    try:
        s3.head_bucket(Bucket=BUCKET_NAME)
    except ClientError:
        s3.create_bucket(Bucket=BUCKET_NAME)

    file_md5 = get_file_md5(FILE_PATH)

    try:
        response = s3.head_object(Bucket=BUCKET_NAME, Key=OBJECT_NAME)
        etag = response['ETag'].strip('"')
    except ClientError:
        etag = None

    if etag != file_md5:
        print("File new or changed. Uploading new version...")
        s3.upload_file(FILE_PATH, BUCKET_NAME, OBJECT_NAME)
    else:
        print("No changes detected. Skipping upload.")

if __name__ == '__main__':
    main()