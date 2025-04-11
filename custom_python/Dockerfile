# Use the official Python 3.11 slim image
FROM python:3.11-slim

WORKDIR /app

# Copy your requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your application code
COPY . .

# Define the default command
CMD ["python", "your_script.py"]