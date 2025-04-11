#!/usr/bin/env python3
import sys
import pandas as pd
from sqlalchemy import create_engine
import great_expectations as ge

# Connect to Postgres where raw data was loaded
DATABASE_URI = "postgresql+psycopg2://dwh_user:dwh_password@localhost:5432/datamart"
engine = create_engine(DATABASE_URI)

def run_data_quality_checks():
    # Read raw data table
    df = pd.read_sql("SELECT * FROM raw_data", engine)
    ge_df = ge.from_pandas(df)

    # Define expectations, e.g., column1 should not be null and column2 should have unique values.
    expectations = [
        ge_df.expect_column_values_to_not_be_null("column1"),
        ge_df.expect_column_values_to_be_unique("column2")
    ]

    # Check overall success
    for expectation in expectations:
        if not expectation.get("success", False):
            print("Data quality check failed:", expectation)
            sys.exit(1)
    print("Data quality checks passed.")
    sys.exit(0)

if __name__ == '__main__':
    run_data_quality_checks()