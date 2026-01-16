#!/bin/bash

# Create test user for frontend testing

echo "Creating test user..."

docker exec -i ibnts-postgres psql -U ibn_user -d ibn_db << EOF
-- Delete existing test user if exists
DELETE FROM users WHERE username = 'testuser';

-- Insert new test user
-- Password: Test123456
-- Hash generated with bcrypt cost 12
INSERT INTO users (
  id,
  username,
  email,
  password_hash,
  enrolled,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'testuser',
  'test@example.com',
  '\$2b\$12\$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
  false,
  NOW(),
  NOW()
);

-- Verify user created
SELECT id, username, email, enrolled FROM users WHERE username = 'testuser';
EOF

echo ""
echo "✅ Test user created!"
echo "Username: testuser"
echo "Password: Test123456"
echo ""
echo "You can now login at: http://localhost:3001/login"
