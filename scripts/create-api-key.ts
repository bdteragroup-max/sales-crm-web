import { generateApiKey } from '../src/lib/apiKey'
import prisma from '../src/app/lib/db'

async function main() {
  const { plaintext, hashed } = generateApiKey()

  await prisma.externalApiKey.create({
    data: {
      name: 'hr-checkin-web',
      hashedKey: hashed,
      scope: ['ticket:create'],
    },
  })

  console.log('='.repeat(60))
  console.log('API Key created successfully!')
  console.log('Save this value and put it in the .env of hr-checkin-web')
  console.log('(Will not be displayed again):')
  console.log('')
  console.log(plaintext)
  console.log('='.repeat(60))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
