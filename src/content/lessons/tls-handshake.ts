import type { Lesson } from '@/lib/schema'

/**
 * The flagship lesson, and the reference for every lesson after it.
 *
 * It is the most direct bridge from the networking site this platform is
 * modelled on: a handshake with real record structure, decoded message by
 * message, plus the thing SecViz adds --- what each record looks like to
 * the defender watching the same connection.
 *
 * Every byte here is synthetic. The key shares are not real points, the
 * certificate is not a real certificate, and the random values were made
 * up while writing this file.
 */
export const tlsHandshake: Lesson = {
  slug: 'tls-handshake',
  title: 'The TLS handshake',
  tagline: 'Keys agreed before a single byte of data is read',
  domain: 'cryptography',
  alsoIn: ['networking'],
  level: 'intermediate',
  minutes: 14,
  prerequisites: ['tcp-handshake', 'diffie-hellman', 'certificates'],
  related: ['quic-and-http3', 'certificates', 'pki-chains', 'firewall-and-proxy-logs'],

  overview: {
    full: 'Transport Layer Security 1.3',
    description:
      'A TLS 1.3 handshake takes one round trip. The client offers a key share before it is asked for one; the server answers with its own share, and from that moment every remaining message is encrypted --- including the certificate that proves who the server is. Watch the records cross, take each one apart field by field, and see what a proxy sitting in the middle can still read.',
    facts: [
      ['Version', 'TLS 1.3 (RFC 8446)'],
      ['Round trips', '1 before application data'],
      ['Key exchange', 'X25519 ECDHE, fresh per connection'],
      ['Cipher suite', 'TLS_AES_128_GCM_SHA256'],
      ['Encrypted from', "the server's key share onward"],
      ['What stays visible', 'SNI, versions, cipher list, record sizes'],
    ],
  },

  nodes: [
    { id: 'client', label: 'Laptop', sub: 'curl 203.0.113.7', role: 'client', x: 12, y: 50 },
    { id: 'proxy', label: 'TLS proxy', sub: 'logs, does not decrypt', role: 'infra', x: 40, y: 50 },
    { id: 'server', label: 'Web server', sub: 'shop.example 198.51.100.9', role: 'server', x: 72, y: 50 },
    { id: 'soc', label: 'SOC', sub: 'sees the proxy log', role: 'defender', x: 40, y: 88 },
  ],
  start: ['client', 'server'],
  legend: [
    ['signal', 'In the clear'],
    ['defender', 'Encrypted'],
    ['anomalous', 'Readable by a watcher'],
  ],

  steps: [
    {
      id: 'client-hello',
      title: 'Client Hello',
      desc: 'An offer, and a key share nobody asked for yet',
      detail:
        "The client opens with everything the server needs to finish in one round trip: the versions it speaks, the cipher suites it will accept, and --- this is what makes TLS 1.3 fast --- a Diffie-Hellman public key already generated, guessing that the server will pick X25519. The record's outer version still claims TLS 1.0 so that old middleboxes let it through; the real version is in an extension inside.",
      perspective: 'both',
      duration: 3400,
      reveal: ['proxy', 'soc'],
      highlight: ['client'],
      transit: [
        {
          from: 'client',
          to: 'server',
          label: 'CLIENT HELLO',
          payload: ['key_share, SNI', '256 bytes, in the clear'],
          intent: 'signal',
        },
      ],
      facts: [
        ['Record type', 'Handshake (22)'],
        ['Legacy version', '0x0301, for middleboxes'],
        ['Real version', 'TLS 1.3, in supported_versions'],
        ['Key share', 'X25519, 32 bytes'],
        ['SNI', 'shop.example, in the clear'],
      ],
      artifact: {
        kind: 'record',
        label: 'TLS record: Client Hello',
        sub: 'first 24 bytes of the record, then the fields it carries',
        hex: '16 03 01 01 00 01 00 00 fc 03 03 a1 7f 3e 90 2b 44 c8 15 6d e2 07 b3 59 8a',
        fields: [
          {
            name: 'Content Type',
            value: '0x16 — handshake',
            note: 'Says what the record carries before anything is decrypted. 22 is a handshake, 23 is application data. A watcher reads this on every record.',
            offset: 0,
            length: 1,
            group: 'Record header',
            intent: 'anomalous',
          },
          {
            name: 'Legacy Version',
            value: '0x0301 — TLS 1.0',
            note: 'Deliberately wrong. Middleboxes built before TLS 1.3 drop records that claim a version they do not know, so the real version moved into an extension and this field froze.',
            offset: 1,
            length: 2,
            group: 'Record header',
            intent: 'signal',
          },
          {
            name: 'Record Length',
            value: '256 bytes',
            note: 'How much follows. A watcher that cannot read the contents still learns the size of every message, which is enough to tell one kind of handshake from another.',
            offset: 3,
            length: 2,
            group: 'Record header',
            intent: 'anomalous',
          },
          {
            name: 'Handshake Type',
            value: '0x01 — client_hello',
            note: 'The first message of the handshake. There is exactly one per connection.',
            offset: 5,
            length: 1,
            group: 'Handshake',
            intent: 'signal',
          },
          {
            name: 'Handshake Length',
            value: '252 bytes',
            note: 'Three bytes, not two: a handshake message may be larger than a single record and get split across several.',
            offset: 6,
            length: 3,
            group: 'Handshake',
            intent: 'signal',
          },
          {
            name: 'Client Version',
            value: '0x0303 — TLS 1.2',
            note: 'Frozen for the same reason as the record version. The version that will actually be used is in supported_versions below.',
            offset: 9,
            length: 2,
            group: 'Handshake',
            intent: 'signal',
          },
          {
            name: 'Client Random',
            value: 'a17f3e90 2b44c815 6de207b3 598a…',
            note: '32 bytes the client picked at random for this connection. It goes into the key schedule, so two identical connections never produce the same keys.',
            offset: 11,
            length: 13,
            group: 'Handshake',
            intent: 'signal',
          },
          {
            name: 'ext: server_name',
            value: 'shop.example',
            note: 'The hostname, sent in the clear because the server needs it to choose a certificate before it has one to encrypt with. This is the single most useful field to anyone watching the connection.',
            group: 'Extensions',
            intent: 'anomalous',
          },
          {
            name: 'ext: supported_versions',
            value: '0x0304 — TLS 1.3',
            note: 'The real version negotiation. The server reads this, not the frozen version fields above.',
            group: 'Extensions',
            intent: 'signal',
          },
          {
            name: 'ext: key_share',
            value: 'X25519, 32-byte public key',
            note: 'A public key generated for this connection alone, sent before the server has asked for one. Guessing right is what saves a round trip; guessing wrong costs one retry.',
            group: 'Extensions',
            intent: 'signal',
          },
          {
            name: 'ext: cipher_suites',
            value: 'AES_128_GCM_SHA256, +2 more',
            note: 'What the client will accept. The exact list and its order are stable enough per client library to act as a fingerprint, which is how a proxy can tell curl from a browser without decrypting anything.',
            group: 'Extensions',
            intent: 'anomalous',
          },
        ],
      },
      telemetry: [
        {
          source: 'proxy',
          code: 'tls/handshake',
          severity: 'info',
          message: 'CONNECT shop.example:443 sni=shop.example ja4=t13d1516h2_8daaf6152771 bytes_out=256',
          fields: [
            { name: 'sni', value: 'shop.example', note: 'Read straight out of the Client Hello.' },
            { name: 'ja4', value: 't13d1516h2_8daaf6152771', note: 'A fingerprint of the offered versions, suites and extensions. Identifies the client library without decrypting anything.' },
          ],
        },
      ],
      branches: [
        {
          id: 'no-sni',
          label: 'Send no SNI',
          note: 'Drop the server_name extension and see what the server can still do.',
          steps: [
            {
              id: 'no-sni-result',
              title: 'Server guesses',
              desc: 'One hostname per address, or nothing',
              detail:
                'Without server_name the server has no way to know which certificate to present before it has a key to encrypt with. A host serving one site answers with its only certificate and the handshake continues. A host serving two hundred sites behind one address cannot choose, and either serves a default certificate the client will reject or closes the connection. This is why SNI is in the clear: removing it does not hide the destination, it breaks the handshake.',
              perspective: 'both',
              duration: 3000,
              highlight: ['server'],
              transit: [
                {
                  from: 'server',
                  to: 'client',
                  label: 'ALERT',
                  payload: ['handshake_failure (40)', 'no certificate to choose'],
                  intent: 'attacker',
                },
              ],
              facts: [
                ['Single-site host', 'Works: only one certificate exists'],
                ['Shared host', 'Fails: cannot choose a certificate'],
                ['Hidden from a watcher', 'Nothing. The IP address still identifies the host'],
              ],
              artifact: {
                kind: 'record',
                label: 'TLS record: Alert',
                sub: 'two bytes, sent in the clear',
                hex: '15 03 03 00 02 02 28',
                fields: [
                  { name: 'Content Type', value: '0x15 — alert', note: 'Alerts have their own record type, so an endpoint can report a failure before any keys exist.', offset: 0, length: 1, intent: 'attacker' },
                  { name: 'Level', value: '0x02 — fatal', note: 'Fatal ends the connection. A warning-level alert would let it continue.', offset: 5, length: 1, intent: 'attacker' },
                  { name: 'Description', value: '0x28 — handshake_failure', note: 'Deliberately vague: the server will not say which part it disliked, because a precise error helps an attacker more than it helps a client.', offset: 6, length: 1, intent: 'attacker' },
                ],
              },
              telemetry: [
                {
                  source: 'proxy',
                  code: 'tls/handshake',
                  severity: 'notice',
                  message: 'CONNECT 198.51.100.9:443 sni=- result=handshake_failure alert=40',
                  fields: [
                    { name: 'sni', value: '-', note: 'Absent. Unusual enough that some proxies alert on it by itself.' },
                  ],
                  suspicious: true,
                },
              ],
            },
          ],
        },
      ],
    },

    {
      id: 'server-hello',
      title: 'Server Hello',
      desc: 'The other half of the key, and the last clear message',
      detail:
        "The server picks one cipher suite, answers with its own X25519 public key, and stops talking in the clear. Both sides now combine their private key with the other's public key and arrive at the same shared secret without it ever crossing the wire. Everything after this record is encrypted --- which in TLS 1.3 includes the certificate.",
      perspective: 'both',
      duration: 3400,
      highlight: ['server'],
      transit: [
        {
          from: 'server',
          to: 'client',
          label: 'SERVER HELLO',
          payload: ['key_share, chosen suite', '122 bytes, in the clear'],
          intent: 'signal',
        },
      ],
      facts: [
        ['Chosen suite', 'TLS_AES_128_GCM_SHA256'],
        ['Server key share', 'X25519, 32 bytes'],
        ['Shared secret', 'Computed, never transmitted'],
        ['From here on', 'Encrypted'],
      ],
      artifact: {
        kind: 'record',
        label: 'TLS record: Server Hello',
        sub: 'the server picks, and the clear text ends here',
        hex: '16 03 03 00 7a 02 00 00 76 03 03 5c 91 ab 04 e7 3d 62 f8 1a 95 cc 70 2e',
        fields: [
          { name: 'Content Type', value: '0x16 — handshake', note: 'Still a handshake record, and still readable. It is the last one that will be.', offset: 0, length: 1, group: 'Record header', intent: 'signal' },
          { name: 'Record Length', value: '122 bytes', note: 'Much shorter than the Client Hello: the server states one choice where the client offered a list.', offset: 3, length: 2, group: 'Record header', intent: 'signal' },
          { name: 'Handshake Type', value: '0x02 — server_hello', note: 'There is exactly one of these per handshake, and it settles the version, the suite and the key exchange in one message.', offset: 5, length: 1, group: 'Handshake', intent: 'signal' },
          { name: 'Server Random', value: '5c91ab04 e73d62f8 1a95cc70 2e…', note: "32 bytes from the server, mixed into the key schedule beside the client's. Both sides need both randoms, so neither can fix the keys alone.", offset: 11, length: 13, group: 'Handshake', intent: 'signal' },
          { name: 'Cipher Suite', value: '0x1301 — AES_128_GCM_SHA256', note: 'One suite, chosen from the list the client offered. In TLS 1.3 this names the record cipher and the hash only: the key exchange and the signature are negotiated separately.', group: 'Handshake', intent: 'signal' },
          { name: 'ext: key_share', value: 'X25519, 32-byte public key', note: "The server's half. Combined with the client's private key it yields the shared secret; combined with anything else it yields nothing useful.", group: 'Extensions', intent: 'signal' },
          { name: 'ext: supported_versions', value: '0x0304 — TLS 1.3', note: 'The server confirming the version here rather than in the frozen version field is what keeps old middleboxes from noticing the upgrade.', group: 'Extensions', intent: 'signal' },
        ],
      },
      telemetry: [
        {
          source: 'proxy',
          code: 'tls/handshake',
          severity: 'info',
          message: 'shop.example:443 version=TLS1.3 cipher=TLS_AES_128_GCM_SHA256 bytes_in=122',
          fields: [
            { name: 'version', value: 'TLS1.3', note: 'Read from supported_versions, not from the record header, which still says 1.2.' },
          ],
        },
      ],
    },

    {
      id: 'key-schedule',
      title: 'Keys derived',
      desc: 'The same secret on both sides, never sent',
      detail:
        'Nothing crosses the wire in this step. Each side multiplies its own private key by the other side\'s public key and gets the same 32-byte point; that point goes through HKDF together with a running hash of every handshake message so far, producing separate keys for each direction. Because the hash covers the whole handshake, a middlebox that altered even one earlier byte ends up with different keys and the next record fails to decrypt.',
      perspective: 'actor',
      duration: 3000,
      highlight: ['client', 'server'],
      facts: [
        ['Input', 'ECDHE shared secret + handshake transcript'],
        ['Function', 'HKDF-Extract then HKDF-Expand'],
        ['Output', 'Separate keys per direction, plus IVs'],
        ['On the wire', 'Nothing'],
      ],
      artifact: {
        kind: 'config',
        label: 'Key schedule',
        sub: 'computed locally on both sides',
        fields: [
          { name: 'ECDHE shared secret', value: '32 bytes (never transmitted)', note: 'Both sides reach the same value from different halves. Someone recording the whole connection still cannot derive it from the two public keys alone.', intent: 'defender' },
          { name: 'Transcript hash', value: 'SHA-256 of all handshake bytes so far', note: 'Binds the keys to the exact handshake that happened. Change any earlier byte and both sides derive different keys, so tampering shows up as a decryption failure rather than going unnoticed.', intent: 'defender' },
          { name: 'client_handshake_traffic_secret', value: 'derived', note: 'Protects what the client sends during the rest of the handshake.', intent: 'defender' },
          { name: 'server_handshake_traffic_secret', value: 'derived', note: 'Protects what the server sends, including its certificate. Separate keys per direction mean a captured key from one side does not open the other.', intent: 'defender' },
          { name: 'Forward secrecy', value: 'yes, keys discarded after use', note: "The private halves are thrown away when the connection ends. Stealing the server's long-term key later does not decrypt a recording of this connection.", intent: 'defender' },
        ],
      },
    },

    {
      id: 'certificate',
      title: 'Certificate',
      desc: 'Proof of identity, now encrypted',
      detail:
        'In TLS 1.2 the certificate crossed in the clear and anyone watching could read who the server claimed to be. In 1.3 it comes after the key exchange, so it is encrypted like everything else. The client checks the name against the hostname it asked for, follows the chain to a root it already trusts, and checks the dates --- then verifies a signature the server made over the handshake transcript, which proves it holds the matching private key and is not replaying a certificate it copied.',
      perspective: 'both',
      duration: 3600,
      highlight: ['server'],
      transit: [
        {
          from: 'server',
          to: 'client',
          label: 'CERTIFICATE',
          payload: ['+ CertificateVerify', 'encrypted, 1,480 bytes'],
          intent: 'defender',
        },
      ],
      facts: [
        ['Subject', 'CN=shop.example'],
        ['Issuer', 'CN=Example Trust CA R3'],
        ['Chain', 'leaf → intermediate → trusted root'],
        ['Signature over', 'the handshake transcript'],
        ['Visible to the proxy', 'size only'],
      ],
      artifact: {
        kind: 'record',
        label: 'Certificate + CertificateVerify',
        sub: 'encrypted record; fields shown as the client sees them after decrypting',
        hex: '17 03 03 05 c8 e4 9b 22 7a f0 31 dd 68 ac 5e 13 90 b7 42 cf',
        fields: [
          { name: 'Content Type', value: '0x17 — application_data', note: 'Every encrypted record claims to be application data, whatever it really holds. The true type is inside the encrypted part, so a watcher cannot tell a certificate from a web page.', offset: 0, length: 1, group: 'Record header', intent: 'defender' },
          { name: 'Record Length', value: '1,480 bytes', note: 'Still visible. A record of roughly this size at this point in a handshake is almost certainly a certificate chain, which is how traffic analysis works without any decryption.', offset: 3, length: 2, group: 'Record header', intent: 'anomalous' },
          { name: 'Ciphertext', value: 'e49b227a f031dd68 ac5e1390 b742cf…', note: 'AES-128-GCM output. The last 16 bytes are an authentication tag: change one byte anywhere and the tag check fails, so the client rejects the record rather than reading altered contents.', offset: 5, length: 11, group: 'Record header', intent: 'defender' },
          { name: 'Subject', value: 'CN=shop.example', note: 'Must match the hostname the client put in SNI. A mismatch is fatal, and it is checked before anything in the certificate is trusted.', group: 'Leaf certificate', intent: 'defender' },
          { name: 'Subject Alt Name', value: 'shop.example, www.shop.example', note: 'The field actually used for hostname matching. CN has been advisory for years; a certificate with only a CN and no SAN is rejected by every current client.', group: 'Leaf certificate', intent: 'defender' },
          { name: 'Issuer', value: 'CN=Example Trust CA R3', note: 'Who signed this certificate. The client looks for this name among the certificates it was sent, and then for that one\'s issuer, until it reaches a root in its own store.', group: 'Leaf certificate', intent: 'defender' },
          { name: 'Validity', value: '2026-09-02 to 2026-12-01', note: 'Short lifetimes limit how long a stolen key is useful, which matters because revocation is unreliable in practice.', group: 'Leaf certificate', intent: 'defender' },
          { name: 'Public Key', value: 'ECDSA P-256', note: 'The key the CertificateVerify signature is checked against. It is not used to encrypt anything: the session keys came from the ephemeral exchange two steps ago.', group: 'Leaf certificate', intent: 'defender' },
          { name: 'CertificateVerify', value: 'ECDSA signature over the transcript', note: 'The step that makes the certificate mean something. Anyone can copy a certificate; only the holder of the private key can sign this handshake, and the signature covers the transcript so it cannot be reused on another connection.', group: 'Proof of possession', intent: 'defender' },
        ],
      },
      telemetry: [
        {
          source: 'proxy',
          code: 'tls/cert',
          severity: 'info',
          message: 'shop.example:443 cert_chain_len=2 record_bytes=1480 decrypted=false',
          fields: [
            { name: 'decrypted', value: 'false', note: 'The proxy is not a man in the middle here. It logs what it can see and passes the bytes through.' },
            { name: 'record_bytes', value: '1480', note: 'Size alone places this record. Traffic analysis never needs the contents.' },
          ],
        },
      ],
      branches: [
        {
          id: 'expired-cert',
          label: 'Expire the certificate',
          note: 'Move the validity window into the past and let the client check it.',
          steps: [
            {
              id: 'expired-result',
              title: 'Client refuses',
              desc: 'The chain is sound; the dates are not',
              detail:
                'The signature verifies and the chain reaches a trusted root, so nothing here was forged --- the certificate is simply out of date. The client sends a fatal alert and never sends its request, which is the correct outcome: an expired certificate means nobody can say whether the key behind it is still controlled by the named owner. Note where this failure happens. The handshake is already encrypted, so the proxy sees a connection that set up and then stopped, with no error text at all.',
              perspective: 'both',
              duration: 3200,
              highlight: ['client'],
              transit: [
                {
                  from: 'client',
                  to: 'server',
                  label: 'ALERT',
                  payload: ['certificate_expired (45)', 'encrypted, fatal'],
                  intent: 'attacker',
                },
              ],
              facts: [
                ['Validity', '2025-01-04 to 2025-04-04'],
                ['Checked against', '2026-11-08'],
                ['Chain', 'valid — this is not a forgery'],
                ['Alert', 'certificate_expired (45), fatal'],
                ['Proxy sees', 'a short connection and no reason'],
              ],
              artifact: {
                kind: 'record',
                label: 'TLS record: Alert (encrypted)',
                sub: 'the reason never leaves the encrypted channel',
                hex: '17 03 03 00 13 9c 44 ed 71 0a b8 25 6f',
                fields: [
                  { name: 'Content Type', value: '0x17 — application_data', note: 'Even the alert hides behind the application-data type, so a watcher cannot tell a failure from a very short page.', offset: 0, length: 1, intent: 'anomalous' },
                  { name: 'Record Length', value: '19 bytes', note: 'Two bytes of alert plus the type byte and a 16-byte tag. A record this small right after a certificate is a reliable sign the client rejected something.', offset: 3, length: 2, intent: 'anomalous' },
                  { name: 'Alert Description', value: '0x2d — certificate_expired', note: 'Inside the encryption, so only the two endpoints learn why. This is why an expiry outage looks like a connection problem in the monitoring and like a clear error in the client.', intent: 'attacker' },
                ],
              },
              telemetry: [
                {
                  source: 'proxy',
                  code: 'tls/handshake',
                  severity: 'warning',
                  message: 'shop.example:443 handshake=incomplete duration_ms=41 bytes_in=1602 bytes_out=298',
                  fields: [
                    { name: 'handshake', value: 'incomplete', note: 'All the proxy can say. The reason was encrypted.' },
                  ],
                  suspicious: true,
                },
                {
                  source: 'client',
                  code: 'curl/60',
                  severity: 'alert',
                  message: 'SSL certificate problem: certificate has expired',
                  fields: [
                    { name: 'verify_result', value: '10', note: 'The endpoint knows exactly what went wrong, because it is inside the channel.' },
                  ],
                  suspicious: true,
                },
              ],
            },
          ],
        },
      ],
    },

    {
      id: 'finished',
      title: 'Finished',
      desc: 'Each side proves it derived the same keys',
      detail:
        'Both sides send a MAC over the full handshake transcript, keyed with the secret they derived. Checking it proves two things at once: the other side reached the same keys, and the handshake it saw was byte-for-byte the one you saw. Anything a middlebox changed on the way shows up here as a mismatch rather than as silently weakened security.',
      perspective: 'both',
      duration: 3000,
      highlight: ['client', 'server'],
      transit: [
        {
          from: 'client',
          to: 'server',
          label: 'FINISHED',
          payload: ['HMAC over the transcript', 'encrypted, 52 bytes'],
          intent: 'defender',
        },
      ],
      facts: [
        ['Content', 'HMAC-SHA256 over the transcript'],
        ['Proves', 'same keys, same transcript'],
        ['Tampering', 'shows up as a verify failure'],
        ['Round trips so far', '1'],
      ],
      artifact: {
        kind: 'record',
        label: 'TLS record: Finished',
        sub: 'the handshake checks itself',
        hex: '17 03 03 00 34 b1 7d 08 ff 2c 91 4a 63 de 05 a7',
        fields: [
          { name: 'Content Type', value: '0x17 — application_data', note: 'Indistinguishable from a data record to anyone outside the connection.', offset: 0, length: 1, group: 'Record header', intent: 'defender' },
          { name: 'Record Length', value: '52 bytes', note: '32 bytes of MAC, the inner content type, and the 16-byte tag.', offset: 3, length: 2, group: 'Record header', intent: 'defender' },
          { name: 'verify_data', value: 'HMAC-SHA256(finished_key, transcript)', note: 'The whole handshake condensed into one value. Both sides compute it independently; if the two do not match, something between them altered a message.', group: 'Handshake', intent: 'defender' },
          { name: 'Inner Content Type', value: '0x16 — handshake', note: 'The real type, hidden inside the encrypted part. The outer header lies on purpose so record types leak nothing.', group: 'Handshake', intent: 'defender' },
        ],
      },
      telemetry: [
        {
          source: 'proxy',
          code: 'tls/handshake',
          severity: 'info',
          message: 'shop.example:443 handshake=complete rtt_ms=34 resumption=none',
          fields: [
            { name: 'handshake', value: 'complete', note: 'A successful handshake and a failed one differ only in duration and byte counts from out here.' },
          ],
        },
      ],
    },

    {
      id: 'app-data',
      title: 'Application data',
      desc: 'The request, at last',
      detail:
        'Only now does the HTTP request move. From the outside this record is indistinguishable from the certificate record four steps ago: same type byte, same shape, only a different length. What a watcher keeps is the hostname from the Client Hello, the client fingerprint, the timing and the sizes --- which is a great deal less than the contents, and a great deal more than nothing.',
      perspective: 'both',
      duration: 3200,
      highlight: ['client', 'proxy', 'server'],
      transit: [
        {
          from: 'client',
          to: 'server',
          label: 'GET /orders',
          payload: ['encrypted, 214 bytes'],
          intent: 'defender',
        },
      ],
      facts: [
        ['Request', 'GET /orders HTTP/1.1'],
        ['Visible to the proxy', 'size, timing, direction'],
        ['Hidden', 'path, headers, cookies, body'],
        ['Already logged', 'SNI and client fingerprint'],
      ],
      artifact: {
        kind: 'record',
        label: 'TLS record: application data',
        sub: 'the request, and what it still gives away',
        hex: '17 03 03 00 d6 3f c1 8a 05 7e 2b 94 d0 61 ff 48',
        fields: [
          { name: 'Content Type', value: '0x17 — application_data', note: 'The same byte the certificate record carried. Record type tells a watcher nothing once the handshake is done.', offset: 0, length: 1, group: 'Record header', intent: 'defender' },
          { name: 'Record Length', value: '214 bytes', note: 'The one field that still leaks. A sequence of record sizes can identify which page was fetched from a site whose pages have distinctive sizes, without a single byte being decrypted.', offset: 3, length: 2, group: 'Record header', intent: 'anomalous' },
          { name: 'Ciphertext', value: '3fc18a05 7e2b94d0 61ff48…', note: 'The request headers and path, under AES-128-GCM with a per-record nonce. Reusing a nonce would be fatal, so the sequence number is folded in rather than sent.', offset: 5, length: 11, group: 'Record header', intent: 'defender' },
          { name: 'Request line (decrypted)', value: 'GET /orders HTTP/1.1', note: 'What the two endpoints see. Shown here because you are standing inside the connection; the proxy never has this.', group: 'Plaintext, at the endpoints', intent: 'defender' },
          { name: 'Cookie (decrypted)', value: 'session=…', note: 'In TLS 1.2 without encrypted handshake extensions a watcher learned the hostname and the certificate; the cookie was always encrypted. What 1.3 added is hiding who the server said it was.', group: 'Plaintext, at the endpoints', intent: 'defender' },
        ],
      },
      telemetry: [
        {
          source: 'proxy',
          code: 'tls/flow',
          severity: 'info',
          message: 'shop.example:443 bytes_out=214 bytes_in=8911 duration_ms=96 verdict=allow',
          fields: [
            { name: 'bytes_out', value: '214', note: 'Request size. Enough, with timing, to guess the kind of request.' },
            { name: 'verdict', value: 'allow', note: 'Decided on the hostname and the fingerprint, since the contents were never available.' },
          ],
        },
        {
          source: 'zeek',
          code: 'ssl.log',
          severity: 'info',
          message: 'server_name=shop.example version=TLSv13 cipher=TLS_AES_128_GCM_SHA256 established=T',
          fields: [
            { name: 'established', value: 'T', note: 'Zeek records the handshake outcome, versions and names, and nothing of the payload. This is the realistic ceiling on network-only visibility of TLS.' },
          ],
        },
      ],
    },
  ],

  outro: {
    title: 'Connection secured',
    desc: 'One round trip, and the certificate never seen',
    text:
      'The client offered a key share before being asked, the server answered with its own, and both derived the same secret without it crossing the wire. From the server\'s first reply onward every record was encrypted, including the certificate that proved its identity --- so the proxy that watched the whole exchange logged a hostname, a client fingerprint, some byte counts and some timings. That is what network monitoring of TLS actually yields, and it is why the defence lessons in this platform lean on endpoint and DNS telemetry rather than on reading traffic. Press REPLAY to watch it again, or take one of the what-ifs.',
    facts: [
      ['Round trips before data', '1'],
      ['Records in the clear', '2 of 6'],
      ['Forward secrecy', 'yes — ephemeral keys, discarded'],
      ['Left in the proxy log', 'SNI, JA4, versions, sizes, timings'],
      ['Never in the log', 'path, headers, cookies, body, certificate'],
    ],
  },

  challenge: {
    kind: 'log-picker',
    prompt:
      'These six lines are from the TLS proxy, one connection each. The certificate on shop.example expired at 09:00. Which line is the one that failed because of it?',
    lines: [
      {
        text: 'shop.example:443 handshake=complete rtt_ms=31 cipher=TLS_AES_128_GCM_SHA256 bytes_in=9102',
        why: 'A completed handshake with a normal response size. The expiry would have stopped this before any data moved.',
      },
      {
        text: 'shop.example:443 handshake=incomplete duration_ms=44 bytes_in=1602 bytes_out=298',
        correct: true,
        why: 'This is it. The handshake got far enough for the server to send its certificate chain --- 1,602 bytes in --- and then stopped, with the client sending only a short alert back. The reason was encrypted, so the proxy cannot name it; the shape is the evidence.',
      },
      {
        text: 'shop.example:443 sni=- result=handshake_failure alert=40',
        why: 'A failure, but an earlier and different one: no SNI was sent, so the server never chose a certificate. Note the alert is readable here because it came before the key exchange finished.',
      },
      {
        text: 'cdn.example:443 handshake=incomplete duration_ms=9 bytes_in=0 bytes_out=256',
        why: 'The server never answered at all --- zero bytes in. That is a network or listener problem, not a certificate one.',
      },
      {
        text: 'shop.example:443 handshake=complete rtt_ms=28 resumption=ticket bytes_in=8840',
        why: 'A resumed session, which skips the certificate entirely. It would keep working for the lifetime of the ticket even with the certificate expired, which is a common reason an expiry looks intermittent.',
      },
      {
        text: 'shop.example:80 method=GET status=301 location=https://shop.example/',
        why: 'Plain HTTP on port 80, redirecting to HTTPS. No TLS handshake happened on this line at all.',
      },
    ],
  },
}
