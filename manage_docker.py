import subprocess
import json
import time
import os
import sys

# --- Configuration ---
# Adjust this to your actual project root directory
# For Windows, use raw string or double backslashes: r"C:\Project\DataPipeline" or "C:\\Project\\DataPipeline"
PROJECT_ROOT = "C:\\Project\\DataPipeline"

# This should match the 'name' in your docker-compose.yml if explicitly defined,
# otherwise it defaults to the directory name where docker-compose.yml resides.
# Based on your `docker ps` output, 'datapipeline' seems to be your project name.
DOCKER_COMPOSE_PROJECT_NAME = "datapipeline"

# Name of the Airflow webserver container, used for `docker exec` commands
AIRFLOW_WEBSERVER_CONTAINER_NAME = "airflow_webserver"

# --- Helper Functions ---

def run_command(command, cwd=None, check_output=False, suppress_error=False):
    """
    Executes a shell command.
    :param command: The command string to execute.
    :param cwd: Working directory for the command.
    :param check_output: If True, captures and returns stdout.
    :param suppress_error: If True, prints stderr but doesn't raise exception for non-zero exit codes.
    :return: stdout (if check_output) or boolean success status.
    """
    try:
        if check_output:
            result = subprocess.run(
                command,
                cwd=cwd,
                capture_output=True,
                text=True,
                check=True, # Raise CalledProcessError for non-zero exit code
                shell=True
            )
            return result.stdout.strip()
        else:
            result = subprocess.run(
                command,
                cwd=cwd,
                check=False, # Don't raise an exception immediately
                shell=True,
                capture_output=True # Capture output to display stderr if non-zero exit
            )
            if result.returncode != 0 and not suppress_error:
                print(f"Command '{command}' failed with exit code {result.returncode}.")
                print(f"Stderr: {result.stderr.decode().strip()}")
            return result.returncode == 0 # True if command succeeded, False otherwise
    except subprocess.CalledProcessError as e:
        if not suppress_error:
            print(f"Command failed (CalledProcessError): {command}")
            print(f"STDOUT: {e.stdout.strip()}")
            print(f"STDERR: {e.stderr.strip()}")
        return False
    except Exception as e:
        print(f"An unexpected error occurred while running command '{command}': {e}")
        return False

def get_project_networks(project_name):
    """Returns a list of network names associated with a given Docker Compose project."""
    try:
        # Filter networks by the label that docker-compose adds to them
        network_ids_raw = run_command(
            f"docker network ls -q --filter label=com.docker.compose.project={project_name}",
            check_output=True, suppress_error=True
        )
        if not network_ids_raw:
            return []
        network_ids = network_ids_raw.splitlines()

        # Now inspect each network ID to get its name
        network_names = []
        for net_id in network_ids:
            net_inspect_output = run_command(f"docker network inspect {net_id}", check_output=True, suppress_error=True)
            if net_inspect_output:
                net_info = json.loads(net_inspect_output)
                if net_info and 'Name' in net_info[0]:
                    network_names.append(net_info[0]['Name'])
        return network_names
    except Exception as e:
        print(f"Error getting networks for project {project_name}: {e}")
        return []

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
    
    if container_ids_raw:
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

def start_docker_compose_project(project_dir, project_name):
    """Starts a Docker Compose project in detached mode."""
    print(f"\n--- Starting Docker Compose Project: '{project_name}' ---")
    print(f"Working directory: {project_dir}")
    start_success = run_command(f"docker-compose -p {project_name} up -d", cwd=project_dir)
    if start_success:
        print(f"Docker Compose project '{project_name}' started successfully.")
    else:
        print(f"Error: Failed to start Docker Compose project '{project_name}'. Please check logs.")
    return start_success

def initialize_airflow_db(container_name):
    """Initializes the Airflow metadata database."""
    print(f"\n--- Initializing Airflow Database in '{container_name}' ---")
    # Wait for the database to be ready
    print("Waiting for Airflow webserver container to be fully running and responsive (up to 180 seconds)...") # Increased total wait

    max_retries = 15 # Increased retries
    retry_delay = 12 # 12 seconds * 15 retries = 180 seconds max wait
    
    container_ready = False
    for i in range(max_retries):
        print(f"  Attempt {i+1}/{max_retries}: Checking container status and Airflow CLI readiness...")
        try:
            # Check container status using `docker ps --format` to get the 'Status' column
            ps_output = run_command(f"docker ps --filter name={container_name} --format '{{.Status}}'", check_output=True, suppress_error=True)
            if not ps_output:
                print(f"  Container '{container_name}' not found or not listed by `docker ps`. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                continue
            
            # ps_output will contain something like "Up 45 seconds" or "Restarting (1) 3 seconds ago"
            # We are looking for "Up X (healthy)" or "Up X"
            if "Up" not in ps_output: # Check if 'Up' is present in the status string
                print(f"  Container '{container_name}' is not in 'Up' state. Current Status: '{ps_output}'. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                continue

            # If container is 'Up', check if Airflow CLI is responsive
            # This needs to be run only if the container is confirmed to be 'Up'
            health_check_command = f"docker exec {container_name} airflow version"
            health_check_output = run_command(health_check_command, check_output=True, suppress_error=True)
            
            if "Airflow" in health_check_output and "version" in health_check_output: # More specific keyword check
                print(f"  Container '{container_name}' is 'Up' and Airflow CLI responsive.")
                container_ready = True
                break # Exit loop, container and CLI are ready
            else:
                print(f"  Container '{container_name}' is 'Up' but Airflow CLI not fully responsive yet. (Output: {health_check_output[:50]}...) Retrying in {retry_delay}s...")
                time.sleep(retry_delay)

        except Exception as e:
            print(f"  An unexpected error occurred during readiness check: {e}. Retrying in {retry_delay}s...")
            time.sleep(retry_delay)

    if not container_ready:
        print(f"WARNING: Airflow webserver container '{container_name}' did not become fully ready within the timeout.")
        # If it didn't become ready, let's dump its logs to help diagnose
        print(f"--- Dumping logs for '{container_name}' for diagnosis ---")
        logs = run_command(f"docker logs {container_name}", check_output=True, suppress_error=True)
        print(logs if logs else "No logs available or error fetching logs.")
        print("--- End of logs ---")
        print("  Skipping database initialization and user creation due to unready webserver.")
        return # Exit the function if webserver isn't ready

    # Run the `airflow db init` command inside the webserver container
    init_command = f"docker exec {container_name} airflow db init"
    print(f"Executing: {init_command}")
    init_success = run_command(init_command)
    if init_success:
        print("Airflow database initialized successfully.")
    else:
        print("WARNING: Airflow database initialization failed. Airflow may not function correctly.")

def create_airflow_user(container_name):
    """Creates an Airflow admin user."""
    print(f"\n--- Creating Airflow Admin User in '{container_name}' ---")
    # Airflow 2.x user creation command.
    # Assumes default username 'airflow' and password 'airflow'.
    # Adjust as necessary.
    create_user_command = (
        f"docker exec {container_name} airflow users create "
        f"--username airflow --firstname Air --lastname Flow --role Admin --email airflow@example.com -p airflow"
    )
    print(f"Executing: {create_user_command}")
    # Suppress error for this command as it might fail if user already exists
    create_user_success = run_command(create_user_command, suppress_error=True)
    if create_user_success:
        print("Airflow admin user 'airflow' created successfully (or already existed).")
    else:
        print("WARNING: Failed to create Airflow admin user. It might already exist, or there's an issue.")


# --- Main execution logic ---
if __name__ == '__main__':
    print("Starting Docker Compose management script...")

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

    # Step 2: Bring up the services with the new configuration
    start_success = start_docker_compose_project(PROJECT_ROOT, DOCKER_COMPOSE_PROJECT_NAME)

    if start_success:
        # Step 3: Initialize Airflow DB and create user after services are up
        # The `initialize_airflow_db` function now includes its own robust wait logic
        initialize_airflow_db(AIRFLOW_WEBSERVER_CONTAINER_NAME)
        create_airflow_user(AIRFLOW_WEBSERVER_CONTAINER_NAME) # User creation runs after DB init

        print("\nDocker environment re-launched and Airflow setup complete. Please check:")
        print(f"  - Docker Desktop to ensure all containers are green (Up).")
        print(f"  - Airflow UI: http://localhost:8082 (give it another minute to fully load after DB init)")
        print(f"  - DataHub UI: http://localhost:9002")
        print(f"  - MinIO UI: http://localhost:9001")
    else:
        print("\nFailed to start Docker Compose project. Please review the output and logs.")
