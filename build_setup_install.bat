@echo off
setlocal enableDelayedExpansion

echo Starting Docker Compose services...
docker-compose up -d

:: Wait for services to start
echo Waiting for services to be fully running...
timeout /t 10 >nul

:check_services
echo Checking running containers...

:: Check if Airflow, PostgreSQL, MySQL are running
docker ps | findstr /I "airflow postgres_airflow postgres_dw mysql" >nul
if %errorlevel% neq 0 (
    echo Some services are not ready yet. Retrying...
    timeout /t 5 >nul
    goto check_services
)

:: Check MySQL health
docker exec -it mysql mysqladmin ping -h mysql -u root --password=datahub | findstr /I "mysqld is alive" >nul
if %errorlevel% neq 0 (
    echo MySQL is not ready yet. Retrying...
    timeout /t 5 >nul
    goto check_services
)

:: Check PostgreSQL health
docker exec -it postgres_airflow pg_isready -U postgres | findstr /I "accepting connections" >nul
if %errorlevel% neq 0 (
    echo PostgreSQL is not ready yet. Retrying...
    timeout /t 5 >nul
    goto check_services
)

echo All required services are running!

:: Install Python dependencies
echo Installing Python packages from requirements.txt...
pip install --no-cache-dir -r requirements.txt

echo Setup completed successfully!
exit /b 0