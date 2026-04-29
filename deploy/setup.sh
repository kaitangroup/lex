#!/bin/bash
# =============================================================
#  lex — DigitalOcean Droplet Setup Script
#  Run this ONCE on a fresh Ubuntu 22.04 droplet as root:
#    bash setup.sh
# =============================================================

set -e
echo "=============================="
echo "  lex Server Setup"
echo "=============================="

 # --- 1. System update ---
echo "[1/9] Updating system packages..."
apt-get update -y && apt-get upgrade -y 



# --- 6. Create app directory ---
echo "[6/9] Creating app directory..."

mkdir -p /var/log/lex



# --- 8. Setup Nginx ---
echo "[8/9] Configuring Nginx..."
cp /var/www/lex/deploy/nginx.conf /etc/nginx/sites-available/lex
ln -sf /etc/nginx/sites-available/lex /etc/nginx/sites-enabled/lex
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# --- 9. Firewall ---
echo "[9/9] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "=============================="
echo "  Setup complete!"
echo ""
echo "  NEXT STEPS:"
echo "  1. Upload your project to /var/www/lex/"
echo "  2. Run: bash /var/www/lex/deploy/deploy.sh"
echo "  3. Get SSL cert: certbot --nginx -d whatsthepayout.com -d www.whatsthepayout.com"
echo "=============================="
