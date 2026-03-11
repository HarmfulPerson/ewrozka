#!/bin/bash
# ── Jednorazowy setup VPS OVH (Ubuntu 22.04) ──────────────────────────────────
# Uruchom jako root: bash setup-server.sh
set -e

echo "🚀 Konfiguracja serwera eWróżka..."

# ── 1. Aktualizacja systemu ────────────────────────────────────────────────────
apt-get update && apt-get upgrade -y
apt-get install -y git curl wget ufw fail2ban

# ── 2. Docker ────────────────────────────────────────────────────────────────
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# ── 3. Utwórz użytkownika deploy (bezpieczniejszy niż root) ──────────────────
useradd -m -s /bin/bash deploy || true
usermod -aG docker deploy

# Skopiuj SSH klucze roota do deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/ || true
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# ── 4. Firewall ───────────────────────────────────────────────────────────────
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# ── 5. Docker sieć dla Caddy ──────────────────────────────────────────────────
docker network create web || true

# ── 6. Katalog projektu ───────────────────────────────────────────────────────
mkdir -p /opt/ewrozka
chown deploy:deploy /opt/ewrozka

# ── 7. Klonowanie repo ────────────────────────────────────────────────────────
# ZASTĄP poniższy URL swoim repozytorium GitHub
su - deploy -c "
  git clone https://github.com/TWOJ_USER/TWOJE_REPO.git /opt/ewrozka
"

echo ""
echo "✅ Serwer skonfigurowany!"
echo ""
echo "Następne kroki:"
echo "1. Skopiuj pliki .env na serwer:"
echo "   scp deploy/env.production.example deploy@TWOJ_IP:/opt/ewrozka/.env.production"
echo "   scp deploy/env.staging.example    deploy@TWOJ_IP:/opt/ewrozka/.env.staging"
echo ""
echo "2. Edytuj pliki .env z prawdziwymi wartościami:"
echo "   nano /opt/ewrozka/.env.production"
echo "   nano /opt/ewrozka/.env.staging"
echo ""
echo "3. Pierwsze uruchomienie:"
echo "   cd /opt/ewrozka"
echo "   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build"
echo "   docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build"
echo ""
echo "4. Dodaj sekrety GitHub (Settings → Secrets):"
echo "   VPS_HOST    = TWOJ_IP"
echo "   VPS_USER    = deploy"
echo "   VPS_SSH_KEY = (zawartość ~/.ssh/id_rsa)"
