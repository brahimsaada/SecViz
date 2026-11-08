import type { Lesson } from '@/lib/schema'

/**
 * Canonical in Active Directory, referenced from authentication. One copy,
 * two domains --- which is the point of `alsoIn` in the schema.
 *
 * The ticket contents are invented. No real encryption types, keys or
 * principals from any directory appear here.
 */
export const kerberos: Lesson = {
  slug: 'kerberos',
  title: 'Kerberos',
  tagline: 'A ticket you cannot read, for a service you never authenticate to',
  domain: 'active-directory',
  alsoIn: ['authentication'],
  level: 'advanced',
  minutes: 16,
  prerequisites: ['ldap-queries', 'symmetric-encryption'],
  related: ['ntlm', 'attack-path-graph', 'windows-event-decode', 'lateral-movement'],
  attack: ['T1558.003'],
  detectionCounterpart: 'ad-hardening',

  overview: {
    full: 'Kerberos version 5',
    description:
      'Kerberos lets a user prove who they are once and then reach dozens of services without any of them ever seeing a password or calling the domain controller. It does this with tickets encrypted to keys the holder cannot read. Understanding which key encrypts which part is the whole of Kerberos --- and it is also the whole of why a service account with a weak password is a domain-wide problem.',
    facts: [
      ['Version', 'Kerberos 5 (RFC 4120)'],
      ['Rounds', 'AS exchange, then TGS, then AP'],
      ['Password crosses the network', 'never'],
      ['Service contacts the DC to verify', 'never'],
      ['Clock skew allowed', '5 minutes by default'],
    ],
  },

  nodes: [
    { id: 'client', label: 'Workstation', sub: 'j.reyes', role: 'client', x: 11, y: 46 },
    { id: 'kdc', label: 'Domain controller', sub: 'KDC: AS + TGS', role: 'identity', x: 42, y: 20 },
    { id: 'service', label: 'File server', sub: 'cifs/fs01', role: 'server', x: 76, y: 46 },
    { id: 'soc', label: 'SOC', sub: 'reads DC security log', role: 'defender', x: 42, y: 85 },
  ],
  start: ['client', 'kdc'],
  legend: [
    ['signal', 'Request'],
    ['defender', 'Ticket issued'],
    ['anomalous', 'Readable by the holder'],
    ['attacker', 'Offline-crackable'],
  ],

  steps: [
    {
      id: 'as-req',
      title: 'AS-REQ',
      desc: 'Proof of the password, without the password',
      detail:
        'The workstation asks the KDC for a ticket-granting ticket. It proves it knows the password by encrypting the current timestamp with a key derived from it. The KDC derives the same key from its own copy and decrypts; if it gets a plausible recent timestamp back, the password was right. The password itself never crosses the network, and neither does anything an eavesdropper can replay later.',
      perspective: 'both',
      duration: 3400,
      reveal: ['soc'],
      highlight: ['client', 'kdc'],
      transit: [{ from: 'client', to: 'kdc', label: 'AS-REQ', payload: ['pre-auth timestamp', 'encrypted with the user key'], intent: 'signal' }],
      facts: [
        ['Principal', 'j.reyes@CORP.EXAMPLE'],
        ['Pre-auth', 'encrypted timestamp (PA-ENC-TIMESTAMP)'],
        ['Key', 'derived from the password, AES256'],
        ['Replay window', '5 minutes of clock skew'],
      ],
      artifact: {
        kind: 'ticket',
        label: 'AS-REQ',
        sub: 'the only message tied to the password',
        fields: [
          { name: 'cname', value: 'j.reyes', note: 'Who is asking, in the clear. Enumerating valid usernames works because the KDC answers differently for a name that does not exist.', group: 'Request', intent: 'anomalous' },
          { name: 'realm', value: 'CORP.EXAMPLE', note: 'The domain. Also in the clear, and a free piece of reconnaissance for anyone watching the network.', group: 'Request', intent: 'anomalous' },
          { name: 'sname', value: 'krbtgt/CORP.EXAMPLE', note: 'The ticket-granting service. Asking for krbtgt is what makes this an AS exchange rather than a request for an ordinary service.', group: 'Request', intent: 'signal' },
          { name: 'PA-ENC-TIMESTAMP', value: 'enc(user_key, 2026-11-08T09:12:44Z)', note: 'The proof. Only someone who knows the password can produce a timestamp the KDC can decrypt, and because it is a timestamp it cannot be replayed beyond the skew window.', group: 'Pre-authentication', intent: 'defender' },
          { name: 'etype', value: 'AES256-CTS-HMAC-SHA1-96', note: 'The encryption type the client offers. A request that offers RC4 instead is worth alerting on: modern Windows does not ask for it, and downgrade is a step in several ticket attacks.', group: 'Pre-authentication', intent: 'anomalous' },
          { name: 'Pre-auth required', value: 'yes', note: 'When an account has this disabled, the KDC will return encrypted material to anyone who asks for it, with no proof at all. That is AS-REP roasting, and it is one LDAP query to find.', group: 'Pre-authentication', intent: 'attacker' },
        ],
      },
      telemetry: [
        { source: 'windows', code: '4768', severity: 'info', message: 'A Kerberos authentication ticket (TGT) was requested. Account: j.reyes, Result: 0x0, Encryption: 0x12 (AES256)', fields: [{ name: 'Result', value: '0x0', note: 'Success. A burst of 4768 failures across many accounts from one address is password spraying.' }, { name: 'Encryption', value: '0x12', note: 'AES256. A 0x17 here means RC4, which on a modern domain is worth a look.' }] },
      ],
    },
    {
      id: 'as-rep',
      title: 'AS-REP',
      desc: 'Two copies of a key, in two different envelopes',
      detail:
        'The KDC sends back a ticket-granting ticket and a session key, and this is the structure worth slowing down for. The reply contains the same session key twice: once encrypted to the user, who can read it, and once sealed inside the TGT under the krbtgt key, which only the KDC holds. The client stores a ticket it cannot open and uses it anyway, because the KDC can.',
      perspective: 'both',
      duration: 3800,
      highlight: ['kdc'],
      transit: [{ from: 'kdc', to: 'client', label: 'AS-REP', payload: ['TGT + session key', 'two envelopes'], intent: 'defender' }],
      facts: [
        ['TGT encrypted with', 'the krbtgt account key'],
        ['Readable by the client', 'no'],
        ['Session key', 'sent twice, two different keys'],
        ['Lifetime', '10 hours, renewable to 7 days'],
      ],
      artifact: {
        kind: 'ticket',
        label: 'AS-REP',
        sub: 'the same key in two envelopes',
        fields: [
          { name: 'ticket (TGT)', value: 'enc(krbtgt_key, …)', note: 'Opaque to the client, which stores it and presents it later without ever reading it. Only the krbtgt key opens this, and only domain controllers have it.', group: 'The TGT', intent: 'defender' },
          { name: '  ↳ session key', value: 'AES256, 32 bytes', note: 'Inside the TGT. When the client comes back for a service ticket, the KDC opens the TGT and finds this key waiting --- which is why it does not have to remember anything about the session.', group: 'The TGT', intent: 'defender' },
          { name: '  ↳ PAC', value: 'user SID + group SIDs, signed', note: "The authorisation data: which groups the user is in. The service trusts this rather than asking the directory, so forging it would grant any membership --- which is what a golden ticket does, and why the krbtgt key is the most valuable secret in a domain.", group: 'The TGT', intent: 'attacker' },
          { name: '  ↳ flags', value: 'forwardable, renewable, pre-authent', note: 'Forwardable lets a service act as the user elsewhere. Unconstrained delegation on a server means a TGT with this flag ends up cached on it, and that is a well-worn path to domain admin.', group: 'The TGT', intent: 'anomalous' },
          { name: 'enc-part', value: 'enc(user_key, session key + times)', note: 'The second envelope, encrypted to the user key. The client decrypts this with the key derived from the password to learn the session key it needs.', group: 'For the client', intent: 'signal' },
          { name: 'endtime', value: '2026-11-08T19:12:44Z', note: 'Ten hours. A ticket with an unusually long lifetime is a sign of forgery: an attacker minting tickets offline often picks a round number far in the future.', group: 'For the client', intent: 'anomalous' },
        ],
      },
      telemetry: [
        { source: 'windows', code: '4768', severity: 'info', message: 'TGT issued to j.reyes from 10.20.4.71, ticket lifetime 10h, flags 0x40a10000' },
      ],
    },
    {
      id: 'tgs-req',
      title: 'TGS-REQ',
      desc: 'Asking for a service, with no password in sight',
      detail:
        'The user wants the file server. The workstation sends the TGT back with a fresh authenticator encrypted under the session key, naming the service it wants. The password is not involved --- it was used once, hours ago. This is single sign-on: the KDC opens the TGT, finds the session key, checks the authenticator, and issues a ticket for the service without the user doing anything.',
      perspective: 'both',
      duration: 3400,
      highlight: ['client', 'kdc'],
      transit: [{ from: 'client', to: 'kdc', label: 'TGS-REQ', payload: ['TGT + authenticator', 'sname: cifs/fs01'], intent: 'signal' }],
      facts: [
        ['Presents', 'the TGT, unmodified'],
        ['Proves freshness with', 'an authenticator, session key'],
        ['Requests', 'cifs/fs01.corp.example'],
        ['Password used', 'no'],
      ],
      artifact: {
        kind: 'ticket',
        label: 'TGS-REQ',
        sub: 'the TGT, returned',
        fields: [
          { name: 'ticket', value: 'the TGT from the AS-REP', note: 'Handed back exactly as received. The client cannot have altered it, because it cannot read it --- which is what makes passing it around safe and also what makes stealing it sufficient.', group: 'Request', intent: 'signal' },
          { name: 'authenticator', value: 'enc(session_key, cname + timestamp)', note: 'Proves the sender holds the session key and is sending this now, not replaying a capture. Without it, anyone who copied the TGT off the wire could use it.', group: 'Request', intent: 'defender' },
          { name: 'sname', value: 'cifs/fs01.corp.example', note: 'The service principal name. Any authenticated user may ask for a ticket to any SPN, and the KDC will issue it --- authorisation is the service\'s job, not the KDC\'s.', group: 'Request', intent: 'anomalous' },
          { name: 'etype requested', value: 'AES256', note: 'If this said RC4 the reply would be encrypted with an RC4 key derived straight from the service account password, which is crackable offline. Requesting the weaker type on purpose is the first move in Kerberoasting.', group: 'Request', intent: 'attacker' },
        ],
      },
      telemetry: [
        { source: 'windows', code: '4769', severity: 'info', message: 'A Kerberos service ticket was requested. Account: j.reyes, Service: cifs/fs01, Encryption: 0x12, Result: 0x0', fields: [{ name: 'Service', value: 'cifs/fs01', note: 'One per service a user touches. The volume is why 4769 is usually sampled rather than kept in full --- and why the ones with RC4 are worth keeping all of.' }] },
      ],
      branches: [
        {
          id: 'kerberoast',
          label: 'Ask for every service account',
          note: 'Request RC4 tickets for every SPN in the domain, and look at what comes back.',
          steps: [
            {
              id: 'roast-request',
              title: 'Tickets for services never used',
              desc: 'Every request is legitimate',
              detail:
                'Any authenticated user may request a service ticket for any SPN. So a single LDAP query lists every account with an SPN, and then a ticket is requested for each one, asking for RC4. Nothing here is an exploit: these are ordinary, valid requests, answered correctly. The problem is what the reply contains.',
              perspective: 'defender',
              duration: 3400,
              highlight: ['client', 'kdc'],
              transit: [{ from: 'client', to: 'kdc', label: 'TGS-REQ ×31', payload: ['31 SPNs, RC4', 'in 9 seconds'], intent: 'attacker' }],
              facts: [
                ['SPNs found by one LDAP query', '31'],
                ['Tickets requested', '31'],
                ['Elapsed', '9 seconds'],
                ['Requests refused', '0'],
                ['Privilege needed', 'any domain user'],
              ],
              artifact: {
                kind: 'ticket',
                label: 'TGS-REP for a service account',
                sub: 'valid, and crackable offline',
                fields: [
                  { name: 'sname', value: 'MSSQLSvc/sql01.corp.example:1433', note: 'A service account with an SPN. The requesting user has no business with this service and does not need any.', intent: 'attacker' },
                  { name: 'etype', value: 'RC4-HMAC (0x17)', note: 'Requested deliberately. The RC4 key is the NT hash of the service account password with no salt and no iteration, so guesses can be tested at billions per second on a GPU.', intent: 'attacker' },
                  { name: 'enc-part', value: 'enc(service_account_key, …)', note: 'The whole attack. This is encrypted with a key derived from the service account password, so it can be taken away and cracked offline --- with no further contact with the domain, and nothing to lock out or log.', intent: 'attacker' },
                  { name: 'Outcome if the password is weak', value: 'plaintext service account password', note: 'And service accounts are often over-privileged and their passwords rarely change. A 25-year-old gMSA or a 120-bit random password breaks this attack entirely; "Summer2019!" does not.', intent: 'attacker' },
                ],
              },
              telemetry: [
                { source: 'windows', code: '4769', severity: 'warning', message: 'Service ticket requested. Account: j.reyes, Service: MSSQLSvc/sql01, Encryption: 0x17 (RC4), Result: 0x0', suspicious: true, fields: [{ name: 'Encryption', value: '0x17', note: 'RC4 on a domain where everything else uses AES. This single field is the detection.' }] },
                { source: 'siem', code: 'KRB-T1558.003', severity: 'alert', message: 'Kerberoasting: 31 RC4 service tickets requested by j.reyes in 9s across 31 distinct SPNs', suspicious: true, fields: [{ name: 'distinct_spns', value: '31', note: 'A normal user touches a handful of services a day. Thirty-one in nine seconds is not a user.' }, { name: 'technique', value: 'T1558.003', note: 'ATT&CK: Steal or Forge Kerberos Tickets — Kerberoasting.' }] },
              ],
            },
            {
              id: 'roast-fix',
              title: 'The counter',
              desc: 'Make the reply not worth cracking',
              detail:
                'You cannot stop the requests --- they are a legitimate part of the protocol, and an authenticated user asking for a service ticket is the whole design. What you can do is make the answer useless and the attempt loud. Remove RC4 so the reply is AES. Give every service account a password long enough that offline cracking is pointless, or better, a managed account whose password rotates itself and is 240 bits. Then alert on RC4 requests, because after the first two changes there should be none.',
              perspective: 'defender',
              duration: 3400,
              highlight: ['kdc', 'soc'],
              transit: [{ from: 'kdc', to: 'client', label: 'TGS-REP', payload: ['AES256, gMSA key', 'not crackable'], intent: 'defender' }],
              facts: [
                ['Remove', 'RC4 from the domain etypes'],
                ['Replace', 'service accounts with group-managed ones'],
                ['Result', 'the reply is AES over a 240-bit key'],
                ['Then alert on', 'any 4769 with etype 0x17'],
                ['Requests still allowed', 'yes — and now harmless'],
              ],
              artifact: {
                kind: 'config',
                label: 'The hardening, and what each part does',
                fields: [
                  { name: 'Domain etypes', value: 'AES128, AES256 only', note: 'With RC4 gone, the reply is encrypted under an AES key with proper salting and iteration. Cracking it is not merely slower, it is not worth attempting.', intent: 'defender' },
                  { name: 'Service accounts', value: 'gMSA, 240-bit, auto-rotated', note: 'The password is generated by the directory, never known by a person, and changes on its own. There is nothing to guess and nothing to leak in a runbook.', intent: 'defender' },
                  { name: 'SPNs on user accounts', value: 'removed where unused', note: 'Each one is an account that can be roasted. Most estates carry SPNs for services decommissioned years ago.', intent: 'defender' },
                  { name: 'Detection', value: 'alert on 4769 etype 0x17', note: 'Only worth having after the first two changes: before them, RC4 is normal traffic and the rule is noise. Afterwards, any RC4 request is either a misconfiguration or an attacker.', intent: 'defender' },
                  { name: 'Honeypot SPN', value: 'an SPN on an unused account', note: 'Nothing legitimate will ever request it, so a single 4769 for that SPN is a high-confidence alert with no tuning at all.', intent: 'defender' },
                ],
              },
              telemetry: [
                { source: 'windows', code: '4769', severity: 'info', message: 'Service ticket requested. Service: MSSQLSvc/sql01, Encryption: 0x12 (AES256), Result: 0x0' },
                { source: 'siem', code: 'KRB-HONEY', severity: 'alert', message: 'Honeypot SPN requested: MSSQLSvc/decom-sql07 by j.reyes — no legitimate caller exists', suspicious: true, fields: [{ name: 'false_positive_rate', value: '0', note: 'The appeal of a honeypot SPN. There is no tuning, because there is no legitimate traffic to tune against.' }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'ap-req',
      title: 'AP-REQ',
      desc: 'The service checks a ticket it can open, and asks nobody',
      detail:
        'The workstation presents the service ticket to the file server. The server decrypts it with its own key --- which it has had since it joined the domain --- reads the session key and the PAC inside, checks the authenticator, and grants access. It does not contact the domain controller. That is what makes Kerberos scale, and it is also why a forged ticket works: there is nobody to ask.',
      perspective: 'both',
      duration: 3600,
      reveal: ['service'],
      highlight: ['client', 'service'],
      transit: [{ from: 'client', to: 'service', label: 'AP-REQ', payload: ['service ticket + authenticator'], intent: 'signal' }],
      facts: [
        ['Ticket decrypted with', "the file server's own key"],
        ['DC contacted', 'no'],
        ['Groups taken from', 'the PAC inside the ticket'],
        ['Replay prevented by', 'the authenticator timestamp'],
      ],
      artifact: {
        kind: 'ticket',
        label: 'AP-REQ, as the service reads it',
        sub: 'everything needed, nothing asked',
        fields: [
          { name: 'ticket', value: 'enc(fs01_key, session key + PAC)', note: "The server decrypts this with its own machine account key. It has never seen this user before and does not need to: the ticket contains everything.", group: 'Presented', intent: 'defender' },
          { name: '  ↳ PAC group SIDs', value: 'Domain Users, Finance-RW', note: "Authorisation, delivered inside the ticket. The server grants access from this list without checking the directory --- so whoever can forge a PAC can claim any membership.", group: 'Presented', intent: 'attacker' },
          { name: 'authenticator', value: 'enc(session_key, timestamp)', note: 'Proves the presenter holds the session key and is live. A captured ticket replayed outside the skew window fails here.', group: 'Presented', intent: 'defender' },
          { name: 'Clock skew tolerance', value: '5 minutes', note: 'The replay window. It is also why a domain with broken time has broken authentication, and why an attacker who can skew a clock gains room to work.', group: 'Checks', intent: 'anomalous' },
          { name: 'DC lookup', value: 'none', note: 'The design decision that gives Kerberos its scale and its sharpest edge. No verification call means no chance to notice a ticket the KDC never issued.', group: 'Checks', intent: 'attacker' },
        ],
      },
      telemetry: [
        { source: 'windows', code: '4624', severity: 'info', message: 'An account was successfully logged on. Account: j.reyes, Logon Type: 3 (Network), Auth Package: Kerberos, Workstation: WKS-4471', fields: [{ name: 'Logon Type', value: '3', note: 'A network logon, on the file server. Note this is the only record on the service side — and the DC logged nothing at all for this step.' }] },
        { source: 'siem', code: 'corr', severity: 'info', message: 'Kerberos chain complete: 4768 → 4769 → 4624 for j.reyes within 4s', fields: [{ name: 'note', value: 'a 4624 with no matching 4769 is worth investigating', note: 'A network logon with Kerberos and no preceding service-ticket request means a ticket the KDC did not issue. That is how golden and silver tickets surface.' }] },
      ],
    },
  ],

  outro: {
    title: 'Access granted',
    desc: 'One password, three exchanges, no lookups',
    text:
      'The password was used once, to encrypt a timestamp. After that the user reached a file server that had never heard of them, and the file server granted access without asking anyone. The whole structure rests on which key encrypts which part: the user key, the krbtgt key, and each service key. Weak service keys give you Kerberoasting; the krbtgt key gives you the domain. The hardening lesson for this is AD detection and hardening, and the detection that catches the branch above is a single field in event 4769.',
    facts: [
      ['Exchanges', 'AS, TGS, AP'],
      ['Keys involved', 'user, krbtgt, service'],
      ['Password on the wire', 'never'],
      ['Service-to-DC verification', 'none'],
      ['Weakest link in practice', 'service account passwords'],
      ['Detection counterpart', 'AD detection and hardening'],
    ],
  },

  challenge: {
    kind: 'log-picker',
    prompt:
      'Five lines from a domain controller security log, on a domain that uses AES everywhere. Which one is the Kerberoasting attempt?',
    lines: [
      { text: '4768  Account: j.reyes  Service: krbtgt/CORP.EXAMPLE  Encryption: 0x12  Result: 0x0', why: 'A normal TGT request at the start of the day. AES256, successful, for krbtgt — this is what every logon looks like.' },
      { text: '4769  Account: j.reyes  Service: cifs/fs01  Encryption: 0x12  Result: 0x0', why: 'An ordinary service ticket for a file share, with AES. One user reaching one service they plausibly use.' },
      { text: '4769  Account: j.reyes  Service: MSSQLSvc/sql01:1433  Encryption: 0x17  Result: 0x0', correct: true, why: 'This one. RC4 (0x17) on a domain that uses AES everywhere, for a database service this user has no reason to touch. The downgrade is deliberate: it makes the reply crackable offline. In the real event stream there would be thirty more of these within seconds.' },
      { text: '4771  Account: a.novak  Service: krbtgt/CORP.EXAMPLE  Failure Code: 0x18', why: 'A pre-authentication failure — a wrong password. Worth watching in volume, because many of these across many accounts is spraying, but a single one is someone fumbling their password.' },
      { text: '4624  Account: j.reyes  Logon Type: 3  Auth Package: Kerberos  Workstation: WKS-4471', why: 'The successful network logon that completes the chain. Interesting only if there were no matching 4769 before it, which would suggest a ticket the KDC never issued.' },
    ],
  },
}
