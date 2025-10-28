#!/usr/bin/env python3
import logging
import os
from io import BytesIO

import boto3
import pandas as pd
from sqlalchemy import create_engine, text

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
BUCKET_NAME = os.getenv("MINIO_BUCKET", "raw-data")
# Define the objects (files) to download and their corresponding PostgreSQL table names
FILES_TO_PROCESS = {
    "sample_data.csv": "raw_data",          # Main transactional data
    "customers_source.csv": "customers_source"  # Customer detail data
}

POSTGRES_CONN = os.getenv(
    "POSTGRES_DWH_CONN",
    "postgresql+psycopg2://dwh_user:dwh_password@postgres_dw:5432/datamart",
)
RAW_SCHEMA = os.getenv("RAW_SCHEMA", "raw")

def download_file_from_minio(object_name):
    """
    Downloads the specified CSV file from MinIO.
    Returns the file content as bytes.
    """
    logging.info(f"Attempting to download '{object_name}' from MinIO bucket '{BUCKET_NAME}'...")
    s3 = boto3.client(
        's3',
        endpoint_url=f"http://{MINIO_ENDPOINT}",
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name='us-east-1'
    )
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=object_name)
        file_data = response['Body'].read()
        logging.info(f"Successfully downloaded '{object_name}' from MinIO.")
        return file_data
    except Exception as e:
        logging.error(f"Error downloading file from Minio: {e}")
        return None  # Return None if download fails

def load_data_to_postgres():
    """
    Loads data from specified CSV files (downloaded from MinIO) into
    multiple tables in the 'raw' schema of PostgreSQL.
    
    Updated to match the new sources.yml schema:
      - raw_data: order_id, customer_id, order_date, total_amount, order_level_payment_status, product_id
      - products: product_id, product_name, category, price
      - payments: payment_id, order_id, payment_method, transaction_payment_status
      - customers_source: customer_id, email, signup_date
    """
    try:
        engine = create_engine(POSTGRES_CONN)

        # Ensure the raw schema exists in PostgreSQL
        conn = engine.connect()
        try:
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {RAW_SCHEMA};"))
            logging.info(f"Ensured schema '{RAW_SCHEMA}' exists in PostgreSQL.")
        finally:
            conn.close()

        # Process sample_data.csv for raw_data, products, and payments tables
        sample_data_csv = download_file_from_minio("sample_data.csv")
        if sample_data_csv:
            df_full = pd.read_csv(BytesIO(sample_data_csv))
            logging.info(f"sample_data.csv loaded into pandas DataFrame. Shape: {df_full.shape}")

            # --- Load to 'raw_data' table ---
            # Include all required columns as per sources.yml: order_id, customer_id, order_date, total_amount, 
            # order_level_payment_status, product_id
            raw_data_columns = ['order_id', 'customer_id', 'order_date', 'total_amount', 'order_level_payment_status', 'product_id']
            # Only select columns that are present in the CSV
            existing_raw_data_columns = [col for col in raw_data_columns if col in df_full.columns]
            # Do not drop duplicates because orders may have multiple products
            df_raw_data = df_full[existing_raw_data_columns]
            # (No renaming: column order_level_payment_status remains as is.)
            with engine.begin() as conn:
                conn.execute(text(f"DROP TABLE IF EXISTS {RAW_SCHEMA}.raw_data CASCADE;"))
                logging.info(f"Dropped table {RAW_SCHEMA}.raw_data with CASCADE.")
            df_raw_data.to_sql("raw_data", engine, schema=RAW_SCHEMA, if_exists="replace", index=False)
            logging.info(f"Data loaded into '{RAW_SCHEMA}.raw_data' table. Rows: {len(df_raw_data)}")

            # --- Load to 'products' table ---
            products_columns = ['product_id', 'product_name', 'category', 'price']
            existing_products_columns = [col for col in products_columns if col in df_full.columns]
            df_products = df_full[existing_products_columns].drop_duplicates(subset=['product_id'])
            with engine.begin() as conn:
                conn.execute(text(f"DROP TABLE IF EXISTS {RAW_SCHEMA}.products CASCADE;"))
                logging.info(f"Dropped table {RAW_SCHEMA}.products with CASCADE.")
            df_products.to_sql("products", engine, schema=RAW_SCHEMA, if_exists="replace", index=False)
            logging.info(f"Data loaded into '{RAW_SCHEMA}.products' table. Rows: {len(df_products)}")

            # --- Load to 'payments' table ---
            payments_columns = ['payment_id', 'order_id', 'payment_method', 'transaction_payment_status']
            existing_payments_columns = [col for col in payments_columns if col in df_full.columns]
            df_payments = df_full[existing_payments_columns].drop_duplicates(subset=['payment_id'])
            # Do not rename transaction_payment_status so that it remains as per sources.yml
            with engine.begin() as conn:
                conn.execute(text(f"DROP TABLE IF EXISTS {RAW_SCHEMA}.payments CASCADE;"))
                logging.info(f"Dropped table {RAW_SCHEMA}.payments with CASCADE.")
            df_payments.to_sql("payments", engine, schema=RAW_SCHEMA, if_exists="replace", index=False)
            logging.info(f"Data loaded into '{RAW_SCHEMA}.payments' table. Rows: {len(df_payments)}")
        else:
            logging.warning("sample_data.csv not downloaded, skipping loading for raw_data, products, payments.")

        # Process customers_source.csv for customers_source table
        customers_source_csv = download_file_from_minio("customers_source.csv")
        if customers_source_csv:
            df_customers_source = pd.read_csv(BytesIO(customers_source_csv))
            logging.info(f"customers_source.csv loaded into pandas DataFrame. Shape: {df_customers_source.shape}")
            with engine.begin() as conn:
                conn.execute(text(f"DROP TABLE IF EXISTS {RAW_SCHEMA}.customers_source CASCADE;"))
                logging.info(f"Dropped table {RAW_SCHEMA}.customers_source with CASCADE.")
            df_customers_source.to_sql("customers_source", engine, schema=RAW_SCHEMA, if_exists="replace", index=False)
            logging.info(f"Data loaded into '{RAW_SCHEMA}.customers_source' table. Rows: {len(df_customers_source)}")
        else:
            logging.warning("customers_source.csv not downloaded, skipping loading for customers_source.")

        logging.info("All raw data loading process completed.")

    except Exception as e:
        logging.error(f"Error loading data to PostgreSQL: {e}")
        raise

def main():
    """
    Main function to orchestrate downloading data and loading to PostgreSQL.
    """
    load_data_to_postgres()

if __name__ == '__main__':
    main()
