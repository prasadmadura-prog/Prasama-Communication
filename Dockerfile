# Use a slim Python image as the base
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy the rest of your application code
COPY . .

# Expose the port your application listens on (e.g., 8080 for Cloud Run)
ENV PORT 8080
EXPOSE $PORT

# Define the command to run your application
CMD ["python", "your_app_file.py"]
