# Use the official Node.js 18 image as the base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on (usually 8080 for Cloud Run)
EXPOSE 8080

# The command to start your application
# Ensure your package.json has a "start" script, or change this to: CMD ["node", "index.js"]
CMD ["npm", "start"]

