# 1. Specify a base image (e.g., for Node.js or Python)
# This is the starting point for your application.
FROM python:3.9-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy your application's dependency files
COPY requirements.txt .

# 4. Install the dependencies
RUN pip install -r requirements.txt

# 5. Copy the rest of your application code into the container
COPY . .

# 6. Expose the port your app runs on (Cloud Run uses 8080 by default)
ENV PORT 8080
EXPOSE $PORT

# 7. Define the command to start your application
CMD ["python", "your_main_app_file.py"]
