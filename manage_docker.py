import subprocess
import json
import time
import os
import sys
import logging

# ── Configuration ────────────────────────────────────────────────────────────
# Adjust this to your actual project root directory
# For Windows, use raw string or double backslashes: r"C:\Project\DataPipeline" or "C:\\Project\\DataPipeline"
PROJECT_ROOT = "C:\\Project\\DataPipeline"

# This should match the 'name' in your docker-compose.yml if explicitly defined,
# otherwise it defaults to the directory name where docker-compose.yml resides.
# Based on your `docker ps` output, 'datapipeline' seems to be your project name.
DOCKER_COMPOSE_PROJECT_NAME = "datapipeline"
LOG_FILE = os.path.join(PROJECT_ROOT, "manage_docker.log")

# ── Logging Setup ────────────────────────────────────────────────────────────
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# ── Helper: generic command runner (your original kept) ──────────────────────
def run_command(
    command, cwd=None, check_output=False, suppress_error=False
):
    """
    Executes a shell command and returns output or boolean success.
    (UNCHANGED except we now add logging)
    """
    try:
        if check_output:
            result = subprocess.run(
                command,
                cwd=cwd,
                capture_output=True,
                text=True,
                check=True,
                shell=True,
            )
            logging.info(f"CMD OK: {command}")
            return result.stdout.strip()
        else:
            result = subprocess.run(
                command,
                cwd=cwd,
                check=False,
                shell=True,
                capture_output=True,
            )
            if result.returncode != 0 and not suppress_error:
                print(
                    f"Command '{command}' failed ({result.returncode}).\n"
                    f"Stderr: {result.stderr.strip()}"
                )
                logging.warning(
                    f"CMD FAIL {result.returncode}: {command}\n"
                    f"STDERR: {result.stderr.strip()}"
                )
            else:
                logging.info(f"CMD OK: {command}")
            return result.returncode == 0
    except subprocess.CalledProcessError as e:
        if not suppress_error:
            print(f"❌ Command failed: {command}\n{e.stderr.strip()}")
        logging.error(f"CALLEDPROC ERROR on '{command}': {e.stderr.strip()}")
        return False
    except Exception as e:
        print(f"Unexpected error running '{command}': {e}")
        logging.error(f"UNEXPECTED ERR on '{command}': {e}")
        return False

# small wrapper that always returns stdout string (unchanged except logging)
def run_command2(command, cwd=None, check_output=False, suppress_error=False):
    return run_command(command, cwd, check_output, suppress_error)

# ── Helper: list networks (unchanged) ────────────────────────────────────────
def get_project_networks(project_name):
    """Returns a list of network names associated with a given Docker Compose project."""
    try:
        # Filter networks by the label that docker-compose adds to them
        network_ids_raw = run_command(
            f"docker network ls -q --filter label=com.docker.compose.project={project_name}",
            check_output=True, suppress_error=True
        )
        if not isinstance(network_ids_raw, str) or not network_ids_raw.strip():
            return []
        network_ids = network_ids_raw.splitlines()

        # Now inspect each network ID to get its name
        network_names = []
        for net_id in network_ids:
            net_inspect_output = run_command(f"docker network inspect {net_id}", check_output=True, suppress_error=True)
            if isinstance(net_inspect_output, str):
                net_info = json.loads(net_inspect_output)
                if net_info and 'Name' in net_info[0]:
                    network_names.append(net_info[0]['Name'])
        return network_names
    except Exception as e:
        print(f"Error getting networks for project {project_name}: {e}")
        return []

# (The entire cleanup_docker_compose_project function is kept AS-IS) ----------
def cleanup_docker_compose_project(project_dir, project_name):
    """
    Attempts to bring down a Docker Compose project and forcefully remove
    any lingering containers or networks if `docker-compose down` fails.
    """
    print(f"\n--- Initiating Docker Compose Project Cleanup: '{project_name}' ---")
    print(f"Working directory: {project_dir}")

    # Step 1: Attempt initial docker-compose down with full cleanup
    print("Attempting 'docker-compose down --volumes --remove-orphans' to stop and remove services...")
    compose_down_success = run_command(
        f"docker-compose -p {project_name} down --volumes --remove-orphans", # --volumes removes anonymous volumes
        cwd=project_dir
    )

    if compose_down_success:
        print(f"Docker Compose project '{project_name}' brought down successfully.")
        return True
    
    print("Initial 'docker-compose down' failed or had issues. Initiating deeper cleanup...")

    # Step 2: Identify and forcefully remove lingering containers associated with the project
    print(f"Searching for all containers belonging to project '{project_name}' (running or stopped)...")
    # Use labels to find all containers created by this docker-compose project
    project_container_ids_cmd = (
        f"docker ps -a -q --filter label=com.docker.compose.project={project_name}"
    )
    container_ids_raw = run_command(project_container_ids_cmd, check_output=True, suppress_error=True)
    
    if isinstance(container_ids_raw, str) and container_ids_raw.strip():
        container_ids = container_ids_raw.splitlines()
        print(f"Found {len(container_ids)} container(s) linked to project '{project_name}'. Stopping and removing...")
        for container_id in container_ids:
            print(f"  - Stopping and removing container ID: {container_id}...")
            run_command(f"docker stop {container_id}", check_output=False, suppress_error=True)
            run_command(f"docker rm -f {container_id}", check_output=False, suppress_error=True)
            time.sleep(0.5) # Small delay for Docker to process
    else:
        print(f"No containers explicitly found for project '{project_name}'.")

    # Give Docker a moment for resource release after forceful removal
    print("Waiting 5 seconds for Docker resources to settle after container removal...")
    time.sleep(5) 

    # Step 3: Retry docker-compose down to ensure network and volumes are removed after container removal
    print("Retrying 'docker-compose down' to ensure full project teardown (networks, volumes etc.)...")
    final_compose_down_success = run_command(
        f"docker-compose -p {project_name} down --volumes --remove-orphans",
        cwd=project_dir
    )

    if final_compose_down_success:
        print(f"Docker Compose project '{project_name}' successfully brought down after container cleanup.")
    else:
        print(f"Warning: 'docker-compose down' still failed after attempting container cleanup.")
        print("Attempting to clean up project-specific networks.")
        
        # Step 4: If still failing, identify and forcibly remove project-specific networks
        project_networks = get_project_networks(project_name)
        if project_networks:
            print(f"Found {len(project_networks)} network(s) linked to project '{project_name}': {', '.join(project_networks)}. Attempting to forcibly remove them...")
            for net_name in project_networks:
                print(f"  - Attempting to remove network: {net_name}...")
                if run_command(f"docker network rm {net_name}", check_output=False, suppress_error=True):
                    print(f"    Network '{net_name}' forcibly removed.")
                else:
                    print(f"    Failed to forcibly remove network '{net_name}'. Manual intervention might be needed.")
        else:
            print(f"No project-specific networks found that need forceful removal.")

    print("\n--- Cleanup process finished. ---")
    return final_compose_down_success # Return status of the last `docker-compose down` attempt

# ── NEW: retry wrapper for Airflow DB init ───────────────────────────────────
def retry_airflow_db_init(retries=3, delay=5):
    attempts = 0
    while attempts < retries:
        attempts += 1
        print(f"📌 Airflow DB init (attempt {attempts}/{retries}) …")
        ok = run_command(
            f"docker-compose run --rm airflow airflow db init",
            cwd=PROJECT_ROOT,
        )
        if ok:
            print("✅ Airflow DB initialized.")
            logging.info("Airflow DB init succeeded.")
            return True
        logging.warning(f"Airflow DB init failed attempt {attempts}.")
        time.sleep(delay)
    print("❌ Airflow DB init failed after retries!")
    logging.error("Airflow DB init failed after all retries.")
    return False

# ── Check Airflow tables (your function + logging) ───────────────────────────
def check_airflow_tables():
    print("\n🔍 Checking Airflow metadata tables …")
    cmd = (
        'docker-compose exec postgres_airflow '
        'psql -U airflow -d airflow -c "\\dt"'
    )
    tables_output = run_command2(cmd, cwd=PROJECT_ROOT, check_output=True, suppress_error=True)
    logging.info(f"Airflow tables output:\n{tables_output}")

    if isinstance(tables_output, str) and "dag_run" in tables_output:
        print("✅ Airflow tables exist.")
        logging.info("Airflow tables verified.")
    else:
        print("⚠️  Tables missing; retrying init.")
        logging.warning("Airflow tables missing; will retry init.")
        retry_airflow_db_init()
        # one more verification pass
        tables_output = run_command2(cmd, cwd=PROJECT_ROOT, check_output=True, suppress_error=True)
        if isinstance(tables_output, str) and "dag_run" in tables_output:
            print("✅ Tables present after retry.")
            logging.info("Tables present after retry.")
        else:
            print("❌ Still missing tables!")
            logging.error("Tables still missing after retry.")

# ── NEW: Kafka health check (topic list) ────────────────────────────────────
def check_kafka_health():
    print("\n🔍 Checking Kafka topics …")
    cmd = (
        "docker-compose exec broker "
        "kafka-topics --list --bootstrap-server broker:29092"
    )
    topics = run_command2(cmd, cwd=PROJECT_ROOT, check_output=True, suppress_error=True)
    logging.info(f"Kafka topics:\n{topics}")

    if isinstance(topics, str) and "MetadataChangeEvent" in topics:
        print("✅ Kafka topic 'MetadataChangeEvent' found.")
        logging.info("Kafka health OK.")
    else:
        print("⚠️  Kafka topic not found; DataHub ingestion may not be running.")
        logging.warning("Kafka health check failed.")

# ── Start project (extends your original) ───────────────────────────────────
def start_docker_compose_project(project_dir, project_name):
    print(f"\n--- Starting Docker Compose Project: '{project_name}' ---")
    print(f"Working directory: {project_dir}")
    started = run_command(f"docker-compose -p {project_name} up -d", cwd=project_dir)
    if not started:
        print("❌ Failed to start services.")
        logging.error("Docker-compose up failed.")
        return False

    print("✅ Containers up. Waiting 10 s …")
    logging.info("Docker services started.")
    time.sleep(10)

    # Airflow DB init with retries
    retry_airflow_db_init()
    # Verify tables
    check_airflow_tables()
    # Kafka health
    check_kafka_health()

    # UI links
    print("\n🌐 Airflow  : http://localhost:8082")
    print("🌐 DataHub  : http://localhost:9002")
    print("🌐 MinIO    : http://localhost:9001")
    logging.info("UI links displayed.")
    return True

# ── Main ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🚀 Managing Docker-based Data Pipeline …")
    print("Starting Docker Compose management script (cleanup & down services)...")

    # Step 1: Perform cleanup and bring down services
    logging.info("Cleanup and bring down services Script start.")

    # Step 1: Perform cleanup and bring down services
    cleanup_success = cleanup_docker_compose_project(PROJECT_ROOT, DOCKER_COMPOSE_PROJECT_NAME)

    if not cleanup_success:
        print("\nWARNING: Full cleanup might not have completed successfully. Review logs for manual steps.")
        # Proceed with starting, but alert the user.
        time.sleep(5) # Give some buffer
    else:
        # Give some time for resources to be fully released before starting again
        print("\nWaiting 10 seconds before starting services to ensure resources are free...")
        time.sleep(10)

    # Step 2: Bring up the services with the new configuration.
    # Airflow DB init and user creation are now handled by docker-compose.yml itself via `airflow-init` service.
    start_success = start_docker_compose_project(PROJECT_ROOT, DOCKER_COMPOSE_PROJECT_NAME)

    if start_success:
        print("\n✅Docker environment re-launched. Please check:")
        print(f"  - Docker Desktop to ensure all containers are green (Up), including 'airflow_init' (which will exit).")
        print(f"  - Airflow UI: http://localhost:8082 (give it 1-2 minutes to fully load, as init service runs first)")
        print(f"  - DataHub UI: http://localhost:9002")
        print(f"  - MinIO UI: http://localhost:9001")
        logging.info("Environment relaunched OK.")
    else:
        print("\n ❌Failed to start Docker Compose project. Please review the output and logs.")
        logging.error("Failed to relaunch environment.")
    sys.exit(0 if start_success else 1)
# ── End of manage_docker.py ─────────────────────────────────────────────────