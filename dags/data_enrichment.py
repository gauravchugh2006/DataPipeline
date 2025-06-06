#!/usr/bin/env python3
import pandas as pd
from sqlalchemy import create_engine

DATABASE_URI = "postgresql+psycopg2://dwh_user:dwh_password@localhost:5432/datamart"

def enrich_data():
    engine = create_engine(DATABASE_URI)
    # Read the transformed (normalized) data from DBT output; adjust table name as needed.
    df = pd.read_sql("SELECT * FROM customers", engine)
    
    # Example enrichment: aggregate a metric by category.
    if "category" in df.columns and "sales" in df.columns:
        kpi = df.groupby("category").agg(total_sales=("sales", "sum")).reset_index()
    else:
        # Fallback: just count the number of rows per unique column1 value.
        kpi = df.groupby("column1").size().reset_index(name="row_count")

    # Write the aggregated KPIs to a new table in the data warehouse
    kpi.to_sql("kpi_metrics", engine, if_exists="replace", index=False)
    print("Data enrichment complete. KPI metrics stored in 'kpi_metrics'.")

if __name__ == '__main__':
    enrich_data()