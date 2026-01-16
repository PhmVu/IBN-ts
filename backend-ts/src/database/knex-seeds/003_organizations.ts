import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  console.log('[seed-orgs] start');
  const result: Array<{ count: string }> = await knex('organizations').count('* as count');
  const count = parseInt(result[0]?.count ?? '0', 10);
  if (count > 0) {
    console.log('Organizations already exist; skipping seed.');
    return;
  }

  const rows = [
    {
      id: uuidv4(),
      name: 'IBN',  // Short name so ca_name becomes "ca-ibn"
      msp_id: 'IBNMSP',
      domain: 'ibn.ictu.edu.vn',
      ca_url: 'http://ca.ibn.ictu.edu.vn:7054',
      description: 'ICTU Blockchain Network Organization',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ];

  await knex('organizations').insert(rows);
  console.log('[seed-orgs] inserted orgs');

  const ibnOrg = await knex('organizations').where({ msp_id: 'IBNMSP' }).first();
  const admin = await knex('users').where({ username: 'admin' }).first();

  if (ibnOrg && admin) {
    await knex('users').where({ id: admin.id }).update({ organization_id: ibnOrg.id, updated_at: knex.fn.now() });
  }

  console.log('Seeded organizations and assigned admin to IBNMSP');
}
