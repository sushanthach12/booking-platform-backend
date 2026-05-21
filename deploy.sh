#!/bin/bash
docker pull sushanthach12/api-bp:latest
docker stop api-bp && docker rm api-bp
docker run -d \
  --name api-bp \
  --restart always \
  -p 8000:8000 \
  --env-file /home/rdj/booking-platform-backend/.env \
  sushanthach12/api-bp:latest
echo "✅ Deployed!"