const { exec } = require('child_process');
const fetch = global.fetch || require('node-fetch');

const base = process.env.LOAD_TEST_BASE || 'http://localhost:5000';

const run = async () => {
    const email = `loadtest-${Date.now()}@example.com`;
    const password = 'Password@123';

    // Create a JWT for testing (no need to actually signup/login)
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'placemuxsecret';
    const token = jwt.sign({ companyId: 1, email, role: 'company' }, jwtSecret, { expiresIn: '1h' });

    const idemp = `loadtest-auth-${Date.now()}`;
    const cmd = `npx autocannon -c ${process.env.LOAD_TEST_CONNECTIONS || 50} -d ${process.env.LOAD_TEST_DURATION || 10} -m POST ${base}/api/payments/initiate -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -H "Idempotency-Key: ${idemp}" -b '{"referenceId":"${idemp}","amount":100,"currency":"INR"}'`;

    console.log('Running:', cmd);

    const p = exec(cmd, { maxBuffer: 1024 * 1024 * 10 });
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);

    p.on('exit', (code) => process.exit(code));
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
