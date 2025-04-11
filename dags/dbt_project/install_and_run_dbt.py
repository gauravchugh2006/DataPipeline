import subprocess
import sys
import logging

# List of required packages
REQUIRED_PACKAGES = [
    "dbt-postgres",  # DBT adapter for PostgreSQL
    "psycopg2-binary",  # PostgreSQL connector
    "boto3",  # AWS SDK (for MinIO interaction)
    "great_expectations",  # Data validation tool
    "pandas",  # DataFrame processing
    "sqlalchemy"  # SQL toolkit
]

# Set up logging
logging.basicConfig(filename="dbt_setup.log", level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def install_package(package):
    """Install a package and log results."""
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", package], check=True, capture_output=True)
        logging.info(f"Successfully installed {package}")
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to install {package}: {str(e)}")

def ensure_packages():
    """Check and install missing packages."""
    for package in REQUIRED_PACKAGES:
        try:
            logging.info(f"check and install {package}, installing...")
            __import__(package.split("-")[0])  # Import by package name prefix
        except ImportError:
            logging.warning(f"{package} not found, installing...")
            install_package(package)

def run_dbt():
    """Run DBT build after package verification."""
    try:
        subprocess.run(["dbt", "build"], check=True)
        logging.info("DBT build executed successfully.")
    except subprocess.CalledProcessError as e:
        logging.error(f"DBT build failed: {str(e)}")

if __name__ == "__main__":
    logging.info("Starting package verification...")
    ensure_packages()
    logging.info("All packages installed. Running DBT...")
    run_dbt()