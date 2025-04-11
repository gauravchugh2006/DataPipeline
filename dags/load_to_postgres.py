#!/usr/bin/env python3
import boto3
import pandas as pd
from io import BytesIO
from sqlalchemy import create_engine

MINIO_ENDPOINT = "localhost:9000"
ACCESS_KEY = "minioadmin"
SECRET_KEY = "minioadmin"
BUCKET_NAME = "raw-data"
OBJECT_NAME = "sample_data.csv"

POSTGRES_CONN = "postgresql+psycopg2://dwh_user:dwh_password@localhost:5432/datamart"

def download_file_from_minio():
    s3 = boto3.client('s3',
                      endpoint_url=f"http://{MINIO_ENDPOINT}",
                      aws_access_key_id=ACCESS_KEY,
                      aws_secret_access_key=SECRET_KEY,
                      region_name='us-east-1')
    response = s3.get_object(Bucket=BUCKET_NAME, Key=OBJECT_NAME)
    return response['Body'].read()

def load_to_postgres(csv_data):
    df = pd.read_csv(BytesIO(csv_data))
    engine = create_engine(POSTGRES_CONN)
    df.to_sql("raw_data", engine, if_exists="replace", index=False)
    print("Data loaded successfully into PostgreSQL.")

def main():
    csv_data = download_file_from_minio()
    load_to_postgres(csv_data)

if __name__ == '__main__':
    main()