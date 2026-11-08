import type { Lesson } from '@/lib/schema'

/** All hashes here were generated for this lesson over made-up passwords. */
export const passwordStorage: Lesson = {
  slug: 'password-storage',
  title: 'Password storage',
  tagline: 'Four ways to store a secret, three of them wrong',
  domain: 'authentication',
  level: 'foundations',
  minutes: 11,
  related: ['hashing', 'sessions-and-cookies', 'mfa-totp', 'kerberos'],

  overview: {
    description:
      'A password database will eventually be read by someone who should not have it. Everything about how passwords are stored is a bet on that day: not whether the file leaks, but how long the hashes hold once it has. Watch one password stored four ways, and watch each one fall.',
    facts: [
      ['Assumption', 'the database will be read one day'],
      ['Goal', 'make each guess expensive, not impossible'],
      ['Right answer today', 'Argon2id, scrypt, or bcrypt'],
      ['Wrong answer', 'anything fast'],
      ['Data here', 'synthetic, for passwords invented for this lesson'],
    ],
  },

  nodes: [
    { id: 'user', label: 'User', sub: 'sets a password', role: 'client', x: 12, y: 32 },
    { id: 'app', label: 'Application', sub: 'stores it', role: 'server', x: 40, y: 32 },
    { id: 'db', label: 'Database', sub: 'users table', role: 'store', x: 70, y: 32 },
    { id: 'attacker', label: 'Attacker', sub: 'has a copy of the table', role: 'attacker', x: 70, y: 78 },
  ],
  start: ['user', 'app', 'db'],
  legend: [
    ['attacker', 'Falls quickly'],
    ['anomalous', 'Buys some time'],
    ['defender', 'Holds'],
  ],

  steps: [
    {
      id: 'plaintext',
      title: 'Plaintext',
      desc: 'Nothing to crack',
      detail:
        'The password is stored as typed. There is no attack to describe: whoever reads the table has every password, and because people reuse passwords, they also have credentials for other systems those users touch. A system that can email you your existing password is storing it this way, and that is the tell.',
      perspective: 'both',
      duration: 2800,
      reveal: ['attacker'],
      highlight: ['db', 'attacker'],
      transit: [{ from: 'db', to: 'attacker', label: 'users.csv', payload: ['every password', 'readable'], intent: 'attacker' }],
      facts: [
        ['Stored', 'correct-horse-battery'],
        ['Work to recover', 'none'],
        ['Blast radius', 'every reused password elsewhere'],
        ['Tell', 'the site can email your password back'],
      ],
      artifact: {
        kind: 'config',
        label: 'users table — plaintext',
        fields: [
          { name: 'password', value: 'correct-horse-battery', note: 'As typed. No work is required of the attacker and no amount of monitoring helps after the fact.', intent: 'attacker' },
          { name: 'Time to recover all', value: 'immediate', note: 'Not a cracking problem. It is a reading problem.', intent: 'attacker' },
          { name: 'Secondary damage', value: 'credential stuffing elsewhere', note: 'The real cost. Most people reuse passwords, so a plaintext leak at a small site becomes logins at large ones.', intent: 'attacker' },
        ],
      },
      telemetry: [
        { source: 'app', code: 'audit', severity: 'alert', message: 'SELECT email, password FROM users — 48,221 rows returned to 10.20.9.4', suspicious: true, fields: [{ name: 'rows', value: '48221', note: 'A bulk read of the credential table. Alerting on row counts from that table is worth doing whatever the storage format.' }] },
      ],
    },
    {
      id: 'unsalted-hash',
      title: 'Unsalted hash',
      desc: 'Hashed once, and precomputed by someone else',
      detail:
        'SHA-256 is applied and the digest is stored. This is better than plaintext and much less so than it looks. The hash is deterministic and unsalted, so two users with the same password get the same digest — visible straight from the table — and the whole answer may already be in a public lookup table. Nothing has to be cracked if someone has already done it.',
      perspective: 'both',
      duration: 3200,
      highlight: ['db', 'attacker'],
      transit: [{ from: 'db', to: 'attacker', label: 'hashes', payload: ['SHA-256, no salt'], intent: 'attacker' }],
      facts: [
        ['Stored', 'SHA-256 digest, 64 hex characters'],
        ['Same password, same digest', 'yes — across all users'],
        ['Lookup tables', 'already published'],
        ['GPU rate', 'tens of billions of guesses per second'],
      ],
      artifact: {
        kind: 'config',
        label: 'users table — SHA-256, unsalted',
        fields: [
          { name: 'password_hash', value: 'a665a4592042…b4f2f0e9', note: 'A one-way function, so the digest cannot be reversed. It can be guessed at, and SHA-256 was designed to be fast, which is precisely the wrong property here.', intent: 'anomalous' },
          { name: 'Duplicate digests', value: '1,204 users share 1 digest', note: 'Visible from the table alone. Crack that one digest and you have twelve hundred accounts, and you already know it is a common password.', intent: 'attacker' },
          { name: 'Rainbow table', value: 'likely already contains it', note: 'Unsalted digests of common passwords are published. There is nothing to compute: it is a lookup.', intent: 'attacker' },
          { name: 'Time for a weak password', value: 'instant', note: 'Anything in a wordlist falls immediately. Hashing bought nothing for the users who needed it most.', intent: 'attacker' },
        ],
      },
      telemetry: [
        { source: 'app', code: 'audit', severity: 'warning', message: 'password_hash column read in bulk — 48,221 rows', suspicious: true },
      ],
    },
    {
      id: 'salted-hash',
      title: 'Salted hash',
      desc: 'No shared work, but still fast',
      detail:
        'A random salt is generated per user and hashed with the password. This fixes everything the salt is meant to fix: identical passwords now produce different digests, precomputed tables are useless, and the attacker must attack each account separately. What it does not fix is speed. SHA-256 is still fast, so each account falls in its own right — just one at a time.',
      perspective: 'both',
      duration: 3400,
      highlight: ['app', 'db'],
      transit: [{ from: 'app', to: 'db', label: 'STORE', payload: ['salt + digest', 'per user'], intent: 'anomalous' }],
      facts: [
        ['Salt', '16 random bytes per user, stored beside the hash'],
        ['Same password, same digest', 'no'],
        ['Rainbow tables', 'useless'],
        ['Per-account cracking', 'still fast'],
      ],
      artifact: {
        kind: 'config',
        label: 'users table — SHA-256, salted',
        fields: [
          { name: 'salt', value: '7f3a9c21e40b58d6…', note: 'Random per user and stored in the clear. It is not a secret: its only job is to make every user a separate problem, and it does that whether or not the attacker can read it.', intent: 'defender' },
          { name: 'password_hash', value: 'SHA256(salt ‖ password)', note: 'Different for every user even when the password is the same, so the duplicate-digest shortcut and every published table are gone.', intent: 'anomalous' },
          { name: 'Attack now required', value: 'one wordlist run per account', note: 'A real improvement: work no longer amortises across the table. But the per-account work is still measured in seconds.', intent: 'anomalous' },
          { name: 'Rate against one account', value: '~10 billion guesses/second on a GPU', note: 'The remaining problem, and the reason salting alone is not the answer. The hash is fast by design, and the attacker gets to use that.', intent: 'attacker' },
        ],
      },
    },
    {
      id: 'kdf',
      title: 'A password hash',
      desc: 'Slow on purpose, and tunable',
      detail:
        'Argon2id is not a hash function with a salt bolted on; it is built to be expensive. It takes a cost parameter and a memory parameter, so each guess is made to take a set amount of time and a set amount of RAM — and the memory cost is what makes GPUs and custom hardware stop being an advantage. Raise the parameters as hardware improves, and old hashes get re-hashed on next login.',
      perspective: 'both',
      duration: 3600,
      highlight: ['app', 'db'],
      transit: [{ from: 'app', to: 'db', label: 'STORE', payload: ['argon2id, 64 MiB', 't=3, p=4'], intent: 'defender' }],
      facts: [
        ['Function', 'Argon2id'],
        ['Memory', '64 MiB per guess'],
        ['Iterations', '3, parallelism 4'],
        ['Rate on a GPU', 'a few thousand guesses per second'],
        ['Tunable later', 'yes — re-hash on next login'],
      ],
      artifact: {
        kind: 'config',
        label: 'users table — Argon2id',
        fields: [
          { name: 'password_hash', value: '$argon2id$v=19$m=65536,t=3,p=4$…', note: 'The parameters travel with the hash, so the verifier does not need to be told how it was made and old hashes keep verifying after you raise the cost.', group: 'Stored', intent: 'defender' },
          { name: 'm — memory', value: '65536 KiB — 64 MiB', note: 'The parameter that matters most. A GPU has thousands of cores and nowhere near 64 MiB of fast memory each, so the massive parallelism that breaks SHA-256 does not apply.', group: 'Parameters', intent: 'defender' },
          { name: 't — iterations', value: '3', note: 'Time cost. Tuned so one verification takes a few hundred milliseconds on your own hardware — slow enough to hurt an attacker, fast enough that nobody notices logging in.', group: 'Parameters', intent: 'defender' },
          { name: 'p — parallelism', value: '4', note: 'How many lanes the computation uses. It lets a legitimate server use its cores to hit the target time without lowering the memory cost.', group: 'Parameters', intent: 'defender' },
          { name: 'Rate against one account', value: '~3,000 guesses/second', note: 'Three million times slower than fast SHA-256. A random twelve-character password is now out of reach; a password in a wordlist still is not.', group: 'Result', intent: 'defender' },
          { name: 'What it cannot fix', value: 'a password in a wordlist', note: 'Worth being plain about. Slow hashing buys time proportional to how unpredictable the password was. "Summer2024!" falls to any of these four schemes.', group: 'Result', intent: 'anomalous' },
        ],
      },
      telemetry: [
        { source: 'app', code: 'auth', severity: 'info', message: 'login ok user=j.reyes argon2id verify_ms=240 rehash=false', fields: [{ name: 'verify_ms', value: '240', note: 'Worth monitoring. If this drifts down after a hardware upgrade, your cost parameters are now too low for the machine you are running on.' }] },
      ],
      branches: [
        {
          id: 'leak',
          label: 'Leak the table anyway',
          note: 'Assume the database is taken. Compare what the attacker gets from each of the four schemes.',
          steps: [
            {
              id: 'leak-compare',
              title: 'The day it leaks',
              desc: 'What the choice bought you',
              detail:
                'The same 48,221 rows, stored four ways, in the hands of someone with one good GPU for one week. The differences are not subtle. Plaintext and unsalted hashes are a notification letter about every account; salting turns it into a slow grind; Argon2id with real parameters means only the users who chose guessable passwords are exposed, and you have time to force a reset before the rest are.',
              perspective: 'defender',
              duration: 4000,
              highlight: ['attacker'],
              facts: [
                ['Rows taken', '48,221'],
                ['Attacker budget', 'one GPU, one week'],
                ['Plaintext', '48,221 recovered'],
                ['SHA-256 unsalted', '41,800 recovered'],
                ['SHA-256 salted', '22,400 recovered'],
                ['Argon2id', '3,100 recovered — all weak'],
              ],
              artifact: {
                kind: 'config',
                label: 'One week on one GPU',
                sub: 'illustrative figures, same table each time',
                fields: [
                  { name: 'Plaintext', value: '48,221 of 48,221', note: 'No cracking took place. The file was read.', intent: 'attacker' },
                  { name: 'SHA-256, unsalted', value: '41,800 of 48,221', note: 'Mostly lookups rather than cracking, and duplicate digests showed which passwords were worth attacking first.', intent: 'attacker' },
                  { name: 'SHA-256, salted', value: '22,400 of 48,221', note: 'Each account attacked separately, but at ten billion guesses a second that is still most of the table in a week.', intent: 'anomalous' },
                  { name: 'bcrypt, cost 12', value: '4,900 of 48,221', note: 'A sound choice and still widely deployed. It is slow, though its memory use is fixed and low, which is why Argon2id and scrypt are preferred for new systems.', intent: 'defender' },
                  { name: 'Argon2id, 64 MiB', value: '3,100 of 48,221', note: 'Only the genuinely weak passwords. Everyone who chose something unpredictable is still safe, and you have time to force a reset.', intent: 'defender' },
                  { name: 'The common factor', value: 'weak passwords fall under every scheme', note: 'Which is why the storage decision sits alongside a blocklist of known-breached passwords, and why MFA matters more than any of this.', intent: 'anomalous' },
                ],
              },
              telemetry: [
                { source: 'siem', code: 'DB-EXFIL', severity: 'alert', message: 'Bulk read of users table: 48,221 rows to 10.20.9.4, outside maintenance window', suspicious: true },
                { source: 'runbook', code: 'IR', severity: 'notice', message: 'Credential exposure: force reset, revoke sessions, enable MFA, check reuse at federated services', fields: [{ name: 'order', value: 'revoke sessions first', note: 'A password reset does nothing while the stolen session cookies still work.' }] },
              ],
            },
          ],
        },
      ],
    },
  ],

  outro: {
    title: 'Stored properly',
    desc: 'The leak is survivable',
    text:
      'The same password went in four times and came out with wildly different consequences on the day the table leaked. The salt stops work being shared between accounts; the cost and memory parameters stop the attack being cheap; and neither saves a user who chose a password from a wordlist. So store with Argon2id, scrypt or bcrypt, check new passwords against a breach list, and put MFA in front of the whole thing — because the storage decision only buys time, and the time is only worth having if you use it.',
    facts: [
      ['Use', 'Argon2id, scrypt or bcrypt'],
      ['Never', 'SHA-256, MD5, or anything fast'],
      ['Salt', 'per user, random, not a secret'],
      ['Tune so one verification takes', '200–500 ms'],
      ['Still required', 'breach-list checks and MFA'],
    ],
  },

  challenge: {
    kind: 'toggle',
    prompt:
      'A code review turns up this: `sha256(salt + password)`, with a fresh 16-byte random salt per user. The author argues the salt makes rainbow tables useless, so the scheme is sound. What is the right response?',
    options: [
      {
        label: 'The salt does its job; the problem is that SHA-256 is fast',
        correct: true,
        why: 'Exactly the right framing. The salt genuinely works — no precomputation, no shared effort between accounts. But salting was never meant to slow a single guess down, and SHA-256 is built to be fast, so each account can still be attacked at billions of guesses a second. You need a function that is deliberately expensive: Argon2id, scrypt or bcrypt.',
      },
      {
        label: 'The salt is too short and should be 32 bytes',
        why: 'Sixteen random bytes is plenty — the salt only needs to be unique, not unguessable. Arguing about its length distracts from the actual defect, which is the speed of the hash.',
      },
      {
        label: 'The salt should be kept secret in a separate store',
        why: 'That describes a pepper, which is a different and optional measure. A salt stored beside the hash is correct and standard; moving it does not address the speed problem at all.',
      },
      {
        label: 'It should hash twice: sha256(sha256(salt + password))',
        why: 'Two rounds of a fast hash is still a fast hash — you have halved the attacker\'s rate, where you need to divide it by a million. Home-made iteration schemes are also a classic source of subtle weakness. Use a function designed for the job.',
      },
    ],
  },
}
