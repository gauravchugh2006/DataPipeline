docker-compose restart airflow &&
docker exec -it airflow airflow db reset &&
docker exec -it airflow airflow db init &&
docker exec -it airflow airflow db upgrade &&
docker exec -it airflow flask fab create-admin \
  --username admin \
  --firstname Admin \
  --lastname User \
  --email admin@example.com \
  --password admin
&& docker-compose restart airflow