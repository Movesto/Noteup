#!/bin/bash
set -euo pipefail

# Install Docker
apt-get update -y
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable --now docker

# Directory layout
mkdir -p /opt/monitoring/{prometheus,loki,promtail,grafana/provisioning/{datasources,dashboards},grafana/dashboards}

# ── Prometheus config ──────────────────────────────────────────────────────
cat > /opt/monitoring/prometheus/prometheus.yml << 'PROM'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: [localhost:9090]

  - job_name: fastapi-backend
    static_configs:
      - targets: [${backend_target}]
    metrics_path: /metrics
PROM

# ── Loki config ────────────────────────────────────────────────────────────
cat > /opt/monitoring/loki/loki-config.yml << 'LOKI'
auth_enabled: false
server:
  http_listen_port: 3100
  grpc_listen_port: 9096
common:
  instance_addr: 127.0.0.1
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
analytics:
  reporting_enabled: false
LOKI

# ── Grafana datasources ────────────────────────────────────────────────────
cat > /opt/monitoring/grafana/provisioning/datasources/datasources.yml << 'DS'
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
  - name: Loki
    type: loki
    uid: loki
    access: proxy
    url: http://loki:3100
    editable: false
DS

cat > /opt/monitoring/grafana/provisioning/dashboards/dashboards.yml << 'DBP'
apiVersion: 1
providers:
  - name: amor
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
DBP

# ── Docker Compose ─────────────────────────────────────────────────────────
cat > /opt/monitoring/docker-compose.yml << 'DC'
services:
  prometheus:
    image: prom/prometheus:v2.54.1
    restart: unless-stopped
    ports: ["9090:9090"]
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --storage.tsdb.retention.time=30d
      - --web.enable-lifecycle

  loki:
    image: grafana/loki:3.2.0
    restart: unless-stopped
    ports: ["3100:3100"]
    volumes:
      - ./loki:/etc/loki
      - loki_data:/loki
    command: -config.file=/etc/loki/loki-config.yml

  grafana:
    image: grafana/grafana:11.3.0
    restart: unless-stopped
    ports: ["3000:3000"]
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: ${grafana_admin_password}
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards

volumes:
  prometheus_data:
  loki_data:
  grafana_data:
DC

cd /opt/monitoring && docker compose up -d
