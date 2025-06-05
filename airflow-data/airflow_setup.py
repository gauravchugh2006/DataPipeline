import subprocess
import sys

AIRFLOW_VERSION = "2.10.5"
PYTHON_VERSION = f"{sys.version_info.major}.{sys.version_info.minor}"
CONSTRAINT_URL = f"https://raw.githubusercontent.com/apache/airflow/constraints-{AIRFLOW_VERSION}/constraints-{PYTHON_VERSION}.txt"

# Run pip install using subprocess
subprocess.run(["pip", "install", f"apache-airflow=={AIRFLOW_VERSION}", "--constraint", CONSTRAINT_URL])