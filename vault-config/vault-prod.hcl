# Vault Production Configuration
ui = true

# File backend for persistent storage
storage "file" {
  path = "/vault/file"
}

# HTTP listener
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

# Disable mlock for Docker
disable_mlock = true

# API address
api_addr = "http://0.0.0.0:8200"

# Log level
log_level = "info"
