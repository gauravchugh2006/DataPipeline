
# Prerequisites:
#### - Python 3.6 or higher
#### - Required packages: pandas, numpy, scikit-learn, matplotlib, seaborn
#### - Data files in CSV format

# Project Structure:
#### /project_root
####   /data                  # Contains input data files
####   /src                   # Source code files  
####   /notebooks            # Jupyter notebooks
####   /models               # Saved model files
####   /results              # Output files and visualizations
####   requirements.txt      # Project dependencies
####   README.md             # Project documentation
project-root/
│
├── docker-compose.yml         # Spins up the entire stack (Airflow, PostgreSQL, MinIO, etc.)
├── dags/                      # Contains Airflow DAGs and ETL scripts
│   ├── data_pipeline_dag.py   # Orchestrates extraction, loading, transformation, quality checks, enrichment, and notification
│   ├── extract_to_minio.py    # Uploads CSV to object storage (MinIO)
│   ├── load_to_postgres.py    # Loads CSV into PostgreSQL
│   ├── data_quality_check.py  # Validates data with lightweight Pandas checks
│   ├── data_enrichment.py     # Aggregates and enriches data (e.g., computes KPIs)
│   ├── data_source/
│   │   ├── customers_source.csv # Ecommerce Platform customers csv data
│   │   └── sample_data.csv    # Sample orders data from 10-20 customers for past 3 months
│   └── dbt_project/           # Contains DBT configuration and models for data transformation
│       ├── dbt_project.yml  
│       ├── models/
│       │   ├── staging/       # Raw-layer staging models sourced from MinIO data
│       │   │   ├── stg_customers.sql
│       │   │   ├── stg_order_items.sql
│       │   │   ├── stg_payments.sql
│       │   │   └── stg_products.sql
│       │   └── marts/         # Analytics-friendly models and metrics
│       │       ├── fact_order_items.sql
│       │       └── order_metrics.sql
├── data_source/               # Raw input files (e.g., sample_data.csv, customers_source.csv)
├── datahub_ingestion.yml      # Configuration for DataHub metadata ingestion
└── README.md                  # Project documentation
# File Details:

# data_preprocessing.py
"""
Handles data cleaning and preparation:
- Loads raw data from CSV files
- Handles missing values
- Performs feature scaling/normalization 
- Encodes categorical variables
- Splits data into train/test sets
"""

# model_training.py
"""
Contains model training logic:
- Implements machine learning algorithms
- Performs model training and validation
- Tunes hyperparameters
- Saves trained models
"""

# evaluation.py
"""
Evaluates model performance:
- Calculates performance metrics
- Generates evaluation reports
- Creates visualization plots
- Performs error analysis
"""

# utils.py
"""
Helper functions and utilities:
- Data loading/saving functions
- Visualization helpers
- Common preprocessing operations
- Configuration management
"""

# main.py
"""
Main execution script:
- Orchestrates the workflow
- Calls functions from other modules
- Handles command line arguments
- Manages logging and error handling
"""

# config.py
"""
Configuration settings:
- Model parameters
- File paths
- Training parameters
- Evaluation metrics
"""

# tests/
"""
Unit tests and integration tests:
- Test data preprocessing
- Test model training
- Test evaluation metrics
- Test utilities
"""
# Data Pipeline Project

This project implements an end-to-end data pipeline that not only handles the core stages of extraction, loading, transformation, metadata ingestion, and dashboarding but also includes additional stages such as data quality validation, enrichment/aggregation, and logging. The pipeline is built using a modern open-source stack and is orchestrated with Apache Airflow.

---

## Overview

- **Extraction:** Reads data from a CSV source and uploads it into an S3-compatible object store (MinIO) if the file contents have changed.
- **Loading:** Downloads the data from MinIO and loads it into a PostgreSQL data warehouse.
- **Transformation:** Uses DBT to transform raw data into normalized tables with tests and documentation.
- **Data Quality Validation:** Runs automated Pandas-based checks to ensure key business rules (nulls, duplicates, negative values) are caught early.
- **Data Enrichment:** Aggregates key performance indicators (KPIs) from transformed data to support dashboard analytics.
- **Orchestration:** Airflow manages the pipeline tasks in a directed acyclic graph (DAG) to ensure proper execution order.
- **Metadata & Dashboarding:** DataHub ingests metadata while Superset provides interactive dashboards.

---

## Prerequisites

Ensure you have the following installed on your Windows machine:

- **Windows 10/11**
- **Docker Desktop for Windows**  
  - Docker Compose support (v2 or later)
- **Git**  
  - [Git LFS](https://git-lfs.github.com/) if you plan on tracking large files  
- **Python 3.11** (for custom scripts and local testing)
- **Development Tools:**
  - A text/code editor (e.g., Visual Studio Code)
  - (Optional) Overleaf or a LaTeX editor if you require advanced documentation formatting

---

## Quick start (Docker Compose)

1. (Optional) Create a `.env` file to override connection values defined in `docker-compose.yml`.
2. Start the full stack (Postgres, MinIO, Airflow, etc.):
   ```bash
   docker compose up -d --build
   ```
3. Initialize Airflow metadata and create the admin account (only required the first time):
   ```bash
   docker compose run --rm airflow-init
   ```
4. Monitor progress in the Airflow UI at http://localhost:8082/ (the DAGs start automatically; pause/resume from the toggle if needed).
5. Inspect results:
   - Raw tables in Postgres (`postgres_dw`, database `datamart`, schema `raw`).
   - dbt models in schema `analytics`.
   - Enriched KPIs in `analytics.category_kpis`.

### DAG auto-activation

Airflow inside the compose stack now ships with `AIRFLOW__CORE__DAGS_ARE_PAUSED_CREATION=False` and the core DAGs
(`data_pipeline` and `generate_random_orders`) are created with `is_paused_upon_creation=False`. As soon as the scheduler is
healthy the generator DAG will begin writing fresh CSV data every three minutes and the main pipeline will execute on its
configured cadence without any manual clicks in the UI.

If you need to temporarily pause the automation, toggle the DAG switch in the Airflow UI.

### Find the active repository quickly

When you have multiple checkouts open it can be hard to remember which project is in a given terminal. From anywhere inside
the repository run:

```bash
git rev-parse --show-toplevel
# or just the folder name
basename "$(git rev-parse --show-toplevel)"
```

This prints the absolute path (or only the directory name) of the Git repository that the current shell is operating in.

### Local SonarQube scan workflow

1. Start the supporting containers and wait for SonarQube to finish booting (first run can take a few minutes):
   ```bash
   docker compose up -d postgres_sonar sonarqube
   ```
2. Open http://localhost:9000 and create a token (default credentials: `admin` / `admin`).
3. Install the [SonarScanner CLI](https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/scanners/sonarscanner/).
4. Run an analysis from the project root, passing the generated token:
   ```bash
   sonar-scanner -Dsonar.login=<your-token>
   ```
   The bundled `sonar-project.properties` is already aligned with the repository layout.

### OWASP ZAP baseline and full scans

The docker compose file defines ZAP services under the `zap` profile so that they only run when explicitly requested. After
the stack (especially the Airflow webserver) is healthy, launch a scan against the Airflow UI:

```bash
# Baseline passive scan
docker compose --profile zap up zap-baseline

# Full active scan (longer and intrusive)
docker compose --profile zap up zap-full
```

## CI/CD Pipeline

See [CI/CD Documentation](./README-CI-CD.md) for complete setup and deployment instructions.



Reports are written to `security-reports/` as HTML, JSON, and XML files. Adjust the target URL in `docker-compose.yml` if you
want to scan a different service (for example Superset or a custom API).

---

## Directory Structure
dags/data_source/sample_data.csv
order_id,customer_id,order_date,total_amount,order_level_payment_status,product_id,product_name,category,price,payment_id,payment_method,transaction_payment_status
1,101,2025-03-01 10:00:00,150.00,Paid,201,Laptop,Electronics,1200.00,301,Credit Card,Completed
1,101,2025-03-01 10:00:00,150.00,Paid,202,Wireless Mouse,Electronics,30.00,301,Credit Card,Completed
2,102,2025-03-01 11:30:00,50.00,Pending,203,Casual T-Shirt,Apparel,25.00,302,PayPal,Pending
3,103,2025-03-02 12:45:00,200.00,Paid,204,Noise-Cancelling Headphones,Electronics,180.00,303,Bank Transfer,Completed
3,103,2025-03-02 12:45:00,200.00,Paid,205,Mechanical Keyboard,Electronics,60.00,303,Bank Transfer,Completed
4,104,2025-03-02 14:00:00,75.50,Paid,206,Espresso Machine,Home Goods,75.50,304,Credit Card,Completed
5,105,2025-03-03 09:15:00,30.00,Refunded,207,Sci-Fi Novel,Books,15.00,305,PayPal,Refunded
5,105,2025-03-03 09:15:00,30.00,Refunded,208,Reading Light,Books,10.00,305,PayPal,Refunded
6,106,2025-03-03 16:30:00,120.00,Paid,209,Smartwatch,Electronics,120.00,306,Credit Card,Completed
7,107,2025-03-04 08:45:00,45.00,Pending,210,Running Shoes,Apparel,45.00,307,Bank Transfer,Pending
8,108,2025-03-04 13:00:00,80.00,Paid,211,Blender,Home Goods,80.00,308,Credit Card,Completed
9,109,2025-03-05 10:10:00,25.00,Paid,212,Yoga Mat,Sports,25.00,309,PayPal,Completed
10,110,2025-03-05 15:20:00,350.00,Paid,213,Gaming Monitor,Electronics,350.00,310,Credit Card,Completed
11,101,2025-03-06 09:00:00,18.00,Paid,203,Casual T-Shirt,Apparel,25.00,311,PayPal,Completed
12,102,2025-03-06 14:00:00,15.00,Pending,207,Sci-Fi Novel,Books,15.00,312,Credit Card,Pending
13,103,2025-03-07 11:00:00,45.00,Paid,210,Running Shoes,Apparel,45.00,313,Bank Transfer,Completed
14,104,2025-03-07 16:00:00,60.00,Paid,205,Mechanical Keyboard,Electronics,60.00,314,Credit Card,Completed
15,105,2025-03-08 08:30:00,120.00,Refunded,209,Smartwatch,Electronics,120.00,315,PayPal,Refunded
16,106,2025-03-08 13:40:00,80.00,Paid,211,Blender,Home Goods,80.00,316,Credit Card,Completed
17,107,2025-03-09 10:50:00,25.00,Paid,212,Yoga Mat,Sports,25.00,317,PayPal,Completed
18,108,2025-03-09 15:10:00,180.00,Paid,204,Noise-Cancelling Headphones,Electronics,180.00,318,Bank Transfer,Completed
19,109,2025-03-10 09:20:00,30.00,Pending,202,Wireless Mouse,Electronics,30.00,319,Credit Card,Pending
20,110,2025-03-10 14:30:00,1200.00,Paid,201,Laptop,Electronics,1200.00,320,PayPal,Completed


./dags/data_source/customers_source.csv
customer_id,first_name,last_name,email,phone,address,signup_date
101,John,Doe,john.doe@example.com,+11234567890,"123 Main St, Anytown, USA",2022-12-15 08:00:00
102,Jane,Smith,jane.smith@example.com,+19876543210,"456 Oak Ave, Otherville, USA",2023-01-01 09:30:00
103,Peter,Jones,peter.jones@example.com,+15551234567,"789 Pine Ln, Somewhere, USA",2023-01-02 10:00:00
104,Alice,Brown,alice.brown@example.com,+12223334444,"101 Maple Rd, Nowhere, USA",2023-01-03 11:00:00
105,Mohan,Doe,mohan.doe@example.com,+11234567889,"125 Main St, Anytown, USA",2022-11-15 08:00:00
106,Jack,Smith,jack.smith@example.com,+19876543219,"458 Oak Ave, Otherville, USA",2023-02-01 09:30:00
107,Poter,Jones,poter.jones@example.com,+15551234569,"787 Pine Ln, Somewhere, USA",2023-03-02 10:00:00
108,Anna,Brown,anna.brown@example.com,+12223334449,"114 Maple Rd, Nowhere, USA",2023-04-03 11:00:00
109,Michael,Thompson,michael.thompson1000@example.com,+19478623970,"110 Elm St, Riverdale, USA",2022-11-17 11:26:26
110,Jessica,Davis,jessica.davis110@example.com,+19967740298,"939 Elm St, Anytown, USA",2023-12-21 12:53:07
1002,Susan,Davis,susan.davis1002@example.com,+15504447205,"638 Pine Ln, Somewhere, USA",2022-07-14 10:38:20
1003,Susan,Jones,susan.jones1003@example.com,+16112526306,"828 Cedar Dr, Gotham, USA",2022-10-22 19:01:35
1004,Charles,Smith,charles.smith1004@example.com,+14003082916,"792 Cedar Dr, Central City, USA",2023-08-05 07:15:59
1005,John,Williams,john.williams1005@example.com,+13459499331,"363 Poplar Dr, Central City, USA",2023-09-30 03:15:01
1006,Patricia,Jackson,patricia.jackson1006@example.com,+18910306693,"486 Pine Ln, Nowhere, USA",2023-05-19 06:29:32
1007,Robert,Miller,robert.miller1007@example.com,+17989252565,"649 Pine Ln, Central City, USA",2022-11-25 19:41:57
1008,Mary,Wilson,mary.wilson1008@example.com,+15614169141,"259 Spruce Ln, Smallville, USA",2023-03-20 19:54:00
1009,Karen,Thomas,karen.thomas1009@example.com,+17644816859,"803 Main St, Otherville, USA",2023-03-31 08:47:31
1010,David,Clark,david.clark1010@example.com,+12373014188,"269 Elm St, Central City, USA",2023-07-12 01:55:46
1011,Richard,Clark,richard.clark1011@example.com,+11782995709,"147 Willow Way, Nowhere, USA",2023-02-27 06:00:06
1012,James,Thompson,james.thompson1012@example.com,+16877083792,"201 Elm St, Riverdale, USA",2023-02-06 06:31:11
1013,Sarah,Harris,sarah.harris1013@example.com,+15137192746,"241 Poplar Dr, Metropolis, USA",2023-02-22 16:02:17
1014,Robert,Jones,robert.jones1014@example.com,+12744147293,"853 Main St, Gotham, USA",2023-04-27 18:17:52
1015,Elizabeth,Robinson,elizabeth.robinson1015@example.com,+16171573346,"549 Elm St, Metropolis, USA",2023-09-29 12:13:28
1016,Jennifer,Clark,jennifer.clark1016@example.com,+14182476413,"110 Spruce Ln, Springfield, USA",2022-07-09 20:38:43
1017,William,Robinson,william.robinson1017@example.com,+11255568334,"473 Cedar Dr, Metropolis, USA",2022-04-13 21:01:03
1018,Michael,Williams,michael.williams1018@example.com,+18756812037,"442 Pine Ln, Somewhere, USA",2023-10-07 16:49:42
1019,Richard,Thomas,richard.thomas1019@example.com,+12498010731,"646 Willow Way, Central City, USA",2023-07-17 22:53:53
1020,David,Jackson,david.jackson1020@example.com,+11011137946,"736 Cedar Dr, Somewhere, USA",2022-08-07 01:35:25
1021,Robert,Williams,robert.williams1021@example.com,+14599221271,"915 Birch Ct, Central City, USA",2023-01-28 05:19:37
1022,Susan,Wilson,susan.wilson1022@example.com,+19987112488,"799 Oak Ave, Smallville, USA",2022-01-23 20:46:52
1023,Mary,Jones,mary.jones1023@example.com,+15435554351,"745 Main St, Central City, USA",2022-07-12 12:59:24
1024,John,Harris,john.harris1024@example.com,+18632525144,"981 Cedar Dr, Smallville, USA",2023-08-16 07:29:22
1025,Mary,Taylor,mary.taylor1025@example.com,+12500025438,"260 Willow Way, Anytown, USA",2022-01-03 22:02:52
1026,James,Taylor,james.taylor1026@example.com,+11831531041,"242 Maple Rd, Otherville, USA",2023-09-27 00:30:14
1027,Charles,Brown,charles.brown1027@example.com,+18090893970,"113 Elm St, Gotham, USA",2023-01-11 18:42:13
1028,Charles,Martin,charles.martin1028@example.com,+16441895989,"575 Maple Rd, Central City, USA",2022-12-05 18:54:41
1029,Sarah,Miller,sarah.miller1029@example.com,+14997054610,"574 Elm St, Otherville, USA",2022-11-25 22:37:22
1030,Karen,Robinson,karen.robinson1030@example.com,+12679485704,"159 Main St, Central City, USA",2023-03-15 02:52:17
new branch add