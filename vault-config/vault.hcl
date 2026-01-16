# Vault server configuration
# Production-ready with file backend for persistence

storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1  # OK for internal Docker network, use TLS in production
}

ui = true
api_addr = "http://0.0.0.0:8200"
disable_mlock = false  # Prevent memory from being swapped to disk

# Optional: Enable audit logging
# audit {
#   file {
#     path = "/vault/logs/audit.log"
#   }
# }
