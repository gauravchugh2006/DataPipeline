#!/usr/bin/env python3
import boto3
import pandas as pd
from io import BytesIO
from sqlalchemy import create_engine
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

MINIO_ENDPOINT = "localhost:9000"
ACCESS_KEY = "minioadmin"
SECRET_KEY = "minioadmin"
BUCKET_NAME = "raw-data"
OBJECT_NAME = "sample_data.csv" # The name of the file in MinIO

POSTGRES_CONN = "postgresql+psycopg2://dwh_user:dwh_password@localhost:5432/datamart"
RAW_SCHEMA = "raw" # The schema where raw tables will be loaded

def download_file_from_minio():
    """
    Downloads the specified CSV file from MinIO.
    Returns the file content as bytes.
    """
    logging.info(f"Attempting to download '{OBJECT_NAME}' from MinIO bucket '{BUCKET_NAME}'...")
    s3 = boto3.client('s3',
                      endpoint_url=f"http://{MINIO_ENDPOINT}",
                      aws_access_key_id=ACCESS_KEY,
                      aws_secret_access_key=SECRET_KEY,
                      region_name='us-east-1')
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=OBJECT_NAME)
        csv_data = response['Body'].read()
        logging.info(f"Successfully downloaded '{OBJECT_NAME}' from MinIO.")
        return csv_data
    except Exception as e:
        logging.error(f"Error downloading file from Minio: {e}")
        raise

def load_data_to_postgres(csv_data):
    """
    Loads and splits the CSV data into multiple tables in PostgreSQL.
    Assumes the CSV contains combined data for raw_data, products, and payments.
    """
    try:
        df_full = pd.read_csv(BytesIO(csv_data))
        logging.info(f"CSV data loaded into pandas DataFrame. Shape: {df_full.shape}")

        engine = create_engine(POSTGRES_CONN)

        # Ensure the raw schema exists in PostgreSQL
        # DDL statements like CREATE SCHEMA typically auto-commit.
        # The 'Connection' object returned by engine.connect() in SQLAlchemy 1.4+
        # does not have a .commit() method directly.
        with engine.connect() as conn:
            conn.execute(f"CREATE SCHEMA IF NOT EXISTS {RAW_SCHEMA};")
            # Removed conn.commit() as it's not needed/valid here for DDL
            logging.info(f"Ensured schema '{RAW_SCHEMA}' exists in PostgreSQL.")

        # --- Load to 'raw_data' table ---
        # Assuming raw_data contains general order details
        # Select relevant columns for raw_data and drop duplicates based on order_id
        # Use 'order_level_payment_status' from CSV for 'payment_status' in raw_data table
        raw_data_columns = ['order_id', 'customer_id', 'order_date', 'total_amount', 'order_level_payment_status']
        # Filter for columns that actually exist in the DataFrame
        existing_raw_data_columns = [col for col in raw_data_columns if col in df_full.columns]
        df_raw_data = df_full[existing_raw_data_columns].drop_duplicates(subset=['order_id'])
        # Rename the column to match the dbt model definition if necessary
        if 'order_level_payment_status' in df_raw_data.columns:
            df_raw_data.rename(columns={'order_level_payment_status': 'payment_status'}, inplace=True)

        df_raw_data.to_sql("raw_data", engine, schema=RAW_SCHEMA, if_exists="replace", index=False)
        logging.info(f"Data loaded into '{RAW_SCHEMA}.raw_data' table. Rows: {len(df_raw_data)}")

        # --- Load to 'products' table ---
        # Assuming products data is repeated for each order line item
        products_columns = ['product_id', 'product_name', 'category', 'price']
        existing_products_columns = [col for col in products_columns if col in df_full.columns]
        df_products = df_full[existing_products_columns].drop_duplicates(subset=['product_id'])

        df_products.to_sql("products", engine, schema=RAW_SCHEMA, if_exists="replace", index=False)
        logging.info(f"Data loaded into '{RAW_SCHEMA}.products' table. Rows: {len(df_products)}")

        # --- Load to 'payments' table ---
        # Assuming payments data is also part of the denormalized CSV
        # Use 'transaction_payment_status' from CSV for 'payment_status' in payments table
        payments_columns = ['payment_id', 'order_id', 'payment_method', 'transaction_payment_status']
        existing_payments_columns = [col for col in payments_columns if col in df_full.columns]
        df_payments = df_full[existing_payments_columns].drop_duplicates(subset=['payment_id'])
        # Rename the column to match the dbt model definition if necessary
        if 'transaction_payment_status' in df_payments.columns:
            df_payments.rename(columns={'transaction_payment_status': 'payment_status'}, inplace=True)

        df_payments.to_sql("payments", engine, schema=RAW_SCHEMA, if_exists="replace", index=False)
        logging.info(f"Data loaded into '{RAW_SCHEMA}.payments' table. Rows: {len(df_payments)}")

        logging.info("All raw data loaded successfully into PostgreSQL.")

    except Exception as e:
        logging.error(f"Error loading data to PostgreSQL: {e}")
        raise

def main():
    """
    Main function to orchestrate downloading data and loading to PostgreSQL.
    """
    csv_data = download_file_from_minio()
    if csv_data:
        load_data_to_postgres(csv_data)

if __name__ == '__main__':
    main()
