param(
    [string]$MySqlPassword = $env:MYSQL_ROOT_PASSWORD,
    [string]$AirflowDbPassword = $env:AIRFLOW_DB_PASSWORD
)

if (-not $MySqlPassword) {
    throw "MySQL root password must be provided via the MySqlPassword parameter or MYSQL_ROOT_PASSWORD environment variable."
}

if (-not $AirflowDbPassword) {
    throw "Airflow database password must be provided via the AirflowDbPassword parameter or AIRFLOW_DB_PASSWORD environment variable."
}

Write-Host "Starting Docker Compose services..."
docker-compose up -d

# Wait for services to start
Start-Sleep -Seconds 10

function Check-Service {
    param (
        [string]$ServiceName
    )
    $running = docker ps --format "{{.Names}}" | Select-String -Pattern $ServiceName
    return $running -ne $null
}

function Check-MySQL-Health {
    $health = docker exec -it mysql mysqladmin ping -h mysql -u root --password=$MySqlPassword 2>&1 | Select-String "mysqld is alive"
    return $health -ne $null
}

function Check-PostgreSQL-Health {
    $health = docker exec -it postgres_airflow pg_isready -U postgres 2>&1 | Select-String "accepting connections"
    return $health -ne $null
}

# Ensure all required services are running
$services = @("airflow", "postgres_dw", "postgres_airflow", "mysql")

Write-Host "Checking running services..."
while ($true) {
    $allRunning = $true

    foreach ($service in $services) {
        if (-not (Check-Service -ServiceName $service)) {
            Write-Host "$service is not running yet. Retrying..."
            $allRunning = $false
            Start-Sleep -Seconds 5
        }
    }

    if ($allRunning -and (Check-MySQL-Health) -and (Check-PostgreSQL-Health)) {
        break
    }
}

Write-Host "All required services are running!"

# Install Python dependencies
Write-Host "Installing Python packages from requirements.txt..."
pip install --no-cache-dir -r requirements.txt

Write-Host "Setup completed successfully!"