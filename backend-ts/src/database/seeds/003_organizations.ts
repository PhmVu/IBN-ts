import { Knex } from 'knex';
import logger from '../../core/logger';

export async function seed(knex: Knex): Promise<void> {
  // Check if organizations already exist
  const existingOrgs = await knex('organizations').select('id');
  
  if (existingOrgs.length > 0) {
    logger.info('Organizations already seeded, skipping...');
    return;
  }

  logger.info('Seeding organizations...');

  // Insert default organizations matching the network configuration
  const organizations = [
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Organization 1',
      msp_id: 'Org1MSP',
      domain: 'org1.example.com',
      ca_url: 'https://ca.org1.example.com:7054',
      description: 'Default Organization 1 - For development and testing',
      config: JSON.stringify({
        peers: ['peer0.org1.example.com:7051', 'peer1.org1.example.com:8051'],
        orderers: ['orderer.example.com:7050'],
        ca: {
          name: 'ca-org1',
          url: 'https://ca.org1.example.com:7054',
        },
      }),
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Organization 2',
      msp_id: 'Org2MSP',
      domain: 'org2.example.com',
      ca_url: 'https://ca.org2.example.com:8054',
      description: 'Default Organization 2 - For development and testing',
      config: JSON.stringify({
        peers: ['peer0.org2.example.com:9051', 'peer1.org2.example.com:10051'],
        orderers: ['orderer.example.com:7050'],
        ca: {
          name: 'ca-org2',
          url: 'https://ca.org2.example.com:8054',
        },
      }),
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ];

  await knex('organizations').insert(organizations);

  logger.info(`Seeded ${organizations.length} organizations`);

  // Get Org1MSP id for updating admin user
  const org1 = await knex('organizations')
    .where({ msp_id: 'Org1MSP' })
    .first();

  if (!org1) {
    logger.warn('Org1MSP not found, skipping admin user update');
    return;
  }

  // Update admin user to be part of Org1
  const adminUser = await knex('users')
    .where({ username: 'admin' })
    .first();

  if (adminUser) {
    await knex('users')
      .where({ id: adminUser.id })
      .update({
        organization_id: org1.id,
        updated_at: knex.fn.now(),
      });

    logger.info(`Updated admin user to be part of ${org1.name}`);
  } else {
    logger.warn('Admin user not found, skipping organization assignment');
  }
}
