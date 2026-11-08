import type { Lesson } from '@/lib/schema'

/** Synthetic throughout. The addresses are from the RFC 5737 documentation ranges. */
export const dnsResolution: Lesson = {
  slug: 'dns-resolution',
  title: 'DNS resolution',
  tagline: 'Four questions to turn a name into an address',
  domain: 'networking',
  level: 'foundations',
  minutes: 10,
  prerequisites: ['ip-and-routing'],
  related: ['dns-logs', 'tls-handshake', 'exfiltration'],

  overview: {
    full: 'Domain Name System',
    description:
      'Nothing on the internet is reached by name. Before a connection can open, a name has to become an address, and that takes a chain of questions starting from a server that knows almost nothing. Watch a resolver walk down from the root, and see why DNS is the single richest log source a defender has.',
    facts: [
      ['Transport', 'UDP port 53, TCP when the answer is large'],
      ['Queries to resolve one name', '4'],
      ['Cached afterwards', 'yes, for the TTL'],
      ['Encrypted by default', 'no'],
      ['Defined in', 'RFC 1035, and forty years of additions'],
    ],
  },

  nodes: [
    { id: 'client', label: 'Laptop', sub: '203.0.113.7', role: 'client', x: 9, y: 50 },
    { id: 'resolver', label: 'Resolver', sub: '203.0.113.1', role: 'infra', x: 33, y: 50 },
    { id: 'root', label: 'Root', sub: 'knows the TLDs', role: 'server', x: 76, y: 14 },
    { id: 'tld', label: '.example TLD', sub: 'knows the zones', role: 'server', x: 76, y: 50 },
    { id: 'auth', label: 'Authoritative', sub: 'ns1.shop.example', role: 'server', x: 76, y: 86 },
    { id: 'soc', label: 'SOC', sub: 'reads the resolver log', role: 'defender', x: 9, y: 86 },
  ],
  start: ['client', 'resolver'],
  legend: [
    ['signal', 'Question'],
    ['defender', 'Answer'],
    ['anomalous', 'Referral — not the answer'],
  ],

  steps: [
    {
      id: 'query',
      title: 'The question',
      desc: 'One name, one type, one random id',
      detail:
        'The laptop asks its configured resolver for the A record of shop.example and then waits. The query carries a random 16-bit id and comes from a random source port; the answer must match both, which is the only thing standing between this query and a forged reply from anyone who can guess them.',
      perspective: 'both',
      duration: 3000,
      reveal: ['soc'],
      highlight: ['client'],
      transit: [{ from: 'client', to: 'resolver', label: 'QUERY', payload: ['shop.example A', 'UDP, 29 bytes'], intent: 'signal' }],
      facts: [
        ['Name', 'shop.example'],
        ['Type', 'A — an IPv4 address'],
        ['Transaction id', '0x8f2a, random'],
        ['Source port', '49185, random'],
      ],
      artifact: {
        kind: 'packet',
        label: 'DNS query',
        sub: 'the whole message is 29 bytes',
        hex: '8f 2a 01 00 00 01 00 00 00 00 00 00 04 73 68 6f 70 07 65 78 61 6d 70 6c 65 00 00 01 00 01',
        fields: [
          { name: 'Transaction ID', value: '0x8f2a', note: 'Picked at random. The reply must carry the same value, so an attacker who wants to forge an answer has to guess this and the source port before the real answer arrives.', offset: 0, length: 2, group: 'Header', intent: 'signal' },
          { name: 'Flags', value: '0x0100 — query, recursion desired', note: 'The recursion-desired bit asks the resolver to do the whole walk itself rather than returning a referral. A server that honours this for anyone on the internet is an open resolver, and gets used in amplification attacks.', offset: 2, length: 2, group: 'Header', intent: 'anomalous' },
          { name: 'Questions', value: '1', note: 'Always one in practice. The format allows more; no implementation uses it.', offset: 4, length: 2, group: 'Header', intent: 'signal' },
          { name: 'Answer RRs', value: '0', note: 'Empty in a query. The counts are in the same header shape for questions and answers, which is why a reply can be parsed without knowing which it is.', offset: 6, length: 2, group: 'Header', intent: 'signal' },
          { name: 'QNAME', value: 'shop.example', note: 'Not a dotted string: each label is preceded by its length, so 04 "shop" 07 "example" 00. The trailing zero is the root label, which is why every name technically ends in a dot.', offset: 12, length: 14, group: 'Question', intent: 'signal' },
          { name: 'QTYPE', value: '0x0001 — A', note: 'An IPv4 address. Asking for TXT or NULL instead is unremarkable on its own, and is how data gets smuggled out over DNS.', offset: 26, length: 2, group: 'Question', intent: 'signal' },
          { name: 'QCLASS', value: '0x0001 — IN', note: 'Internet. The other classes were for networks that no longer exist, and the field has been a constant for decades.', offset: 28, length: 2, group: 'Question', intent: 'signal' },
        ],
      },
      telemetry: [
        {
          source: 'resolver',
          code: 'query',
          severity: 'info',
          message: '203.0.113.7 query: shop.example IN A + (203.0.113.1)',
          fields: [
            { name: 'client', value: '203.0.113.7', note: 'Which host asked. This is why DNS logs are so useful: they tie a name to a machine even when the traffic that follows is encrypted.' },
          ],
        },
      ],
    },
    {
      id: 'root-referral',
      title: 'Ask the root',
      desc: 'It does not know, but it knows who might',
      detail:
        'The resolver has nothing cached, so it starts at the top. A root server does not know about shop.example and will not look it up; it answers with the names of the servers for .example and stops. This is the whole design: each level knows only the level below it, so no single server has to hold the internet.',
      perspective: 'actor',
      duration: 3000,
      reveal: ['root'],
      highlight: ['resolver', 'root'],
      transit: [{ from: 'resolver', to: 'root', label: 'QUERY', payload: ['shop.example A', 'no recursion'], intent: 'signal' }],
      facts: [
        ['Asked', 'a root server'],
        ['Answer section', 'empty'],
        ['Authority section', 'the .example name servers'],
        ['Response code', 'NOERROR — a referral, not a failure'],
      ],
      artifact: {
        kind: 'packet',
        label: 'DNS referral from the root',
        sub: 'no answer, but a direction',
        hex: '8f 2b 80 00 00 01 00 00 00 02 00 02 04 73 68 6f 70',
        fields: [
          { name: 'Flags', value: '0x8000 — response, not authoritative', note: 'The authoritative-answer bit is clear: this server is not responsible for the name and is not claiming to answer for it.', offset: 2, length: 2, group: 'Header', intent: 'anomalous' },
          { name: 'Answer RRs', value: '0', note: 'The thing that makes this a referral. An empty answer section with a populated authority section means "not me, try these".', offset: 6, length: 2, group: 'Header', intent: 'anomalous' },
          { name: 'Authority RRs', value: '2', note: 'The name servers for .example. The resolver will pick one and ask it the same question.', offset: 8, length: 2, group: 'Header', intent: 'signal' },
          { name: 'Additional RRs', value: '2', note: 'The addresses of those name servers, included so the resolver does not have to resolve the names it was just given --- which would be circular.', offset: 10, length: 2, group: 'Header', intent: 'signal' },
          { name: 'NS a.gtld.example', value: '198.51.100.30', note: 'A glue record. Without it the resolver would need to look up a.gtld.example, which would need the .example servers, which is what it is trying to find.', group: 'Authority and glue', intent: 'signal' },
        ],
      },
    },
    {
      id: 'tld-referral',
      title: 'Ask the TLD',
      desc: 'One step closer, same answer',
      detail:
        'The .example servers know which name servers were registered for shop.example, and nothing about what they contain. Another referral, one level down. A resolver starting cold does this walk once per zone and then caches it, which is why the first lookup of the day is slow and the rest are not.',
      perspective: 'actor',
      duration: 2800,
      reveal: ['tld'],
      highlight: ['resolver', 'tld'],
      transit: [{ from: 'resolver', to: 'tld', label: 'QUERY', payload: ['shop.example A'], intent: 'signal' }],
      facts: [
        ['Authority section', 'ns1.shop.example, ns2.shop.example'],
        ['Delegation set at', 'registration'],
        ['Still not an answer', 'one more hop'],
      ],
      artifact: {
        kind: 'packet',
        label: 'DNS referral from .example',
        sub: 'the delegation',
        fields: [
          { name: 'NS', value: 'ns1.shop.example', note: 'The delegation: the registry saying these servers are responsible for this zone. Whoever controls them controls every name under it.', group: 'Authority', intent: 'signal' },
          { name: 'NS', value: 'ns2.shop.example', note: 'A second server, required by most registries. The resolver picks whichever answers fastest and remembers.', group: 'Authority', intent: 'signal' },
          { name: 'Glue A', value: 'ns1.shop.example → 198.51.100.53', note: 'Supplied by the registry, not the zone, so a stale glue record can keep traffic going to a name server the owner no longer uses.', group: 'Additional', intent: 'anomalous' },
        ],
      },
    },
    {
      id: 'authoritative',
      title: 'The authoritative answer',
      desc: 'The server that actually holds the record',
      detail:
        'ns1.shop.example holds the zone, so it answers for real: an address and a time to live. The authoritative-answer bit is set this time. The resolver caches the answer for the TTL and hands it back to the laptop, which can finally open a connection.',
      perspective: 'both',
      duration: 3200,
      reveal: ['auth'],
      highlight: ['resolver', 'auth'],
      transit: [{ from: 'auth', to: 'resolver', label: 'ANSWER', payload: ['198.51.100.9', 'TTL 300'], intent: 'defender' }],
      facts: [
        ['Answer', 'shop.example A 198.51.100.9'],
        ['TTL', '300 seconds'],
        ['Authoritative', 'yes'],
        ['Total queries', '4'],
      ],
      artifact: {
        kind: 'packet',
        label: 'DNS answer',
        sub: 'authoritative, with a lifetime',
        hex: '8f 2a 84 00 00 01 00 01 00 00 00 00 c0 0c 00 01 00 01 00 00 01 2c 00 04 c6 33 64 09',
        fields: [
          { name: 'Transaction ID', value: '0x8f2a', note: 'Matches the original query, which is how the resolver knows this reply belongs to that question and not to another in flight.', offset: 0, length: 2, group: 'Header', intent: 'signal' },
          { name: 'Flags', value: '0x8400 — response, authoritative', note: 'The authoritative bit is set. This server holds the zone rather than passing on something it was told.', offset: 2, length: 2, group: 'Header', intent: 'defender' },
          { name: 'Answer RRs', value: '1', note: 'One record. A name with several addresses returns several, and the resolver may reorder them, which is the oldest form of load balancing.', offset: 6, length: 2, group: 'Header', intent: 'defender' },
          { name: 'NAME (compressed)', value: '0xc00c → offset 12', note: 'A pointer, not a name. The top two bits set mean "the rest of this name is at that offset in the message", which keeps replies small enough to fit in a single datagram.', offset: 12, length: 2, group: 'Answer', intent: 'signal' },
          { name: 'TYPE', value: '0x0001 — A', note: 'Matches what was asked. A reply carrying records that were not asked for is how cache poisoning used to work, so resolvers now discard anything out of scope.', offset: 14, length: 2, group: 'Answer', intent: 'anomalous' },
          { name: 'TTL', value: '300 seconds', note: 'How long this may be cached. A very low TTL is normal for failover and also typical of malware command-and-control, which is why resolver logs are watched for it.', offset: 18, length: 4, group: 'Answer', intent: 'anomalous' },
          { name: 'RDLENGTH', value: '4', note: 'Four bytes follow. An A record is always four; an AAAA is sixteen.', offset: 22, length: 2, group: 'Answer', intent: 'signal' },
          { name: 'RDATA', value: '198.51.100.9', note: 'The address, as four raw bytes: c6 33 64 09. Everything the laptop wanted, after four questions.', offset: 24, length: 4, group: 'Answer', intent: 'defender' },
        ],
      },
      telemetry: [
        {
          source: 'resolver',
          code: 'answer',
          severity: 'info',
          message: 'shop.example IN A 198.51.100.9 ttl=300 cached=false elapsed_ms=84',
          fields: [
            { name: 'cached', value: 'false', note: 'A cold lookup. The next one from any client on this resolver answers in under a millisecond.' },
            { name: 'ttl', value: '300', note: 'Logged because unusually low TTLs on unfamiliar domains are one of the cheapest signals a SOC has.' },
          ],
        },
      ],
      branches: [
        {
          id: 'tunnel',
          label: 'Look at a tunnel instead',
          note: 'Replace the query with the kind of lookup that carries data out, and watch the log.',
          steps: [
            {
              id: 'tunnel-queries',
              title: 'Data in the name',
              desc: 'The question is the payload',
              detail:
                'DNS is allowed out of almost every network, which makes it a channel. Instead of asking for an address, a compromised host asks for TXT records under a domain it controls, with data encoded into the label itself. Each query carries a few dozen bytes out; each answer can carry some back. Nothing here is malformed --- every packet is a valid DNS query, which is exactly why this is detected by pattern rather than by protocol error.',
              perspective: 'defender',
              duration: 3600,
              highlight: ['client', 'resolver', 'soc'],
              transit: [{ from: 'client', to: 'resolver', label: 'QUERY ×240', payload: ['TXT, 63-char labels', 'one domain'], intent: 'attacker' }],
              facts: [
                ['Query type', 'TXT, not A'],
                ['Label length', '63 characters, the maximum'],
                ['Rate', '240 queries in 60 seconds'],
                ['Distinct names', '240 — none repeated'],
                ['Protocol errors', 'none'],
              ],
              artifact: {
                kind: 'packet',
                label: 'DNS query carrying data',
                sub: 'valid in every respect',
                fields: [
                  { name: 'QNAME', value: 'k7f3m2qp…x9.t.exfil.example', note: 'The first label is base32-encoded data, padded to the 63-character maximum. The name is unique every time, so nothing is ever served from cache and every query reaches the attacker\'s server.', intent: 'attacker' },
                  { name: 'QTYPE', value: '0x0010 — TXT', note: 'TXT records can hold arbitrary text, so the reply is a return channel. A host making hundreds of TXT queries to one domain is doing something no ordinary application does.', intent: 'attacker' },
                  { name: 'Label length', value: '63 of 63 bytes', note: 'The protocol maximum, used on every query. Legitimate names are rarely at the limit, and never consistently.', intent: 'anomalous' },
                  { name: 'Cache hit rate', value: '0 of 240', note: 'The clearest signal in the whole pattern. Normal traffic repeats names constantly; a tunnel cannot repeat any.', intent: 'anomalous' },
                ],
              },
              telemetry: [
                { source: 'resolver', code: 'query', severity: 'warning', message: '203.0.113.7 query: k7f3m2qp…x9.t.exfil.example IN TXT + (203.0.113.1)', suspicious: true, fields: [{ name: 'qtype', value: 'TXT', note: 'One TXT query is nothing. The two-hundredth in a minute, to one domain, is the finding.' }] },
                { source: 'siem', code: 'DNS-T1071.004', severity: 'alert', message: 'High-entropy subdomain volume: 240 unique names under exfil.example from 203.0.113.7 in 60s', suspicious: true, fields: [{ name: 'unique_subdomains', value: '240', note: 'Counting distinct labels per parent domain per host is the detection. It needs no payload inspection and no TLS interception.' }, { name: 'technique', value: 'T1071.004', note: 'ATT&CK: Application Layer Protocol — DNS.' }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'cached',
      title: 'The second lookup',
      desc: 'No questions asked',
      detail:
        'A minute later another host asks for the same name. The resolver answers from cache without touching the root, the TLD or the authoritative server, and the TTL in the reply counts down rather than restarting. Caching is what makes DNS survivable at internet scale, and it is also why a bad record keeps being served after it has been corrected.',
      perspective: 'both',
      duration: 2600,
      highlight: ['client', 'resolver'],
      transit: [{ from: 'resolver', to: 'client', label: 'ANSWER', payload: ['198.51.100.9', 'TTL 241, from cache'], intent: 'defender' }],
      facts: [
        ['Upstream queries', '0'],
        ['TTL returned', '241 — counting down'],
        ['Elapsed', 'under 1 ms'],
        ['Risk', 'a wrong record persists for its TTL'],
      ],
      artifact: {
        kind: 'packet',
        label: 'DNS answer from cache',
        sub: 'the same record, less time left',
        fields: [
          { name: 'Flags', value: '0x8180 — response, recursion available', note: 'The authoritative bit is clear this time: the resolver is passing on what it was told, not answering for the zone.', intent: 'signal' },
          { name: 'TTL', value: '241 seconds', note: 'Decremented by the 59 seconds the record has been held. A resolver that returns the original TTL every time is caching wrongly and will serve a stale record indefinitely.', intent: 'defender' },
          { name: 'RDATA', value: '198.51.100.9', note: 'Identical. The client cannot tell a cached answer from a fresh one except by how fast it arrived.', intent: 'defender' },
        ],
      },
      telemetry: [
        { source: 'resolver', code: 'answer', severity: 'info', message: 'shop.example IN A 198.51.100.9 ttl=241 cached=true elapsed_ms=0', fields: [{ name: 'cached', value: 'true', note: 'Most of a healthy resolver log looks like this. The interesting lines are the ones that never hit cache.' }] },
      ],
    },
  ],

  outro: {
    title: 'Name resolved',
    desc: 'Four questions, then none',
    text:
      'A cold lookup walked from the root down to the server that holds the zone, each level knowing only the next, and cached the result so the next lookup cost nothing. That design is why DNS scales --- and why the resolver log is the most valuable thing a defender has when everything else is encrypted: it records which host asked for which name at which second, whatever happens inside the connection that follows.',
    facts: [
      ['Queries, cold', '4'],
      ['Queries, warm', '0'],
      ['Encrypted', 'no — unless DoH or DoT is used'],
      ['Logged per lookup', 'client, name, type, TTL, cache status'],
      ['Why it matters to defence', 'a name per host, even under TLS'],
    ],
  },

  challenge: {
    kind: 'rule',
    prompt:
      'You are writing the detection for the tunnel in the what-if branch. The tunnel sends hundreds of unique subdomains under one parent domain. Which clause makes this rule catch it without drowning in false positives?',
    template: 'resolver.query\n| where ___\n| summarize names = dcount(qname) by client_ip, parent_domain, bin(timestamp, 1m)\n| where names > 100',
    options: [
      { label: 'qtype == "TXT"', why: 'Too narrow. It catches this tunnel but misses the same technique over A or CNAME records, which is a configuration change away. Type is a weak signal on its own.' },
      { label: 'strlen(qname) > 40', correct: true, why: 'Right. Tunnels need long labels to carry useful data, and the length filter cuts the volume of ordinary short names before the expensive distinct-count runs. Combined with the count of unique names per parent domain per minute, it catches the pattern whatever record type is used.' },
      { label: 'response_code != "NOERROR"', why: 'Backwards. A working tunnel gets valid answers, so every one of these queries is NOERROR. Filtering on errors would hide it completely.' },
      { label: 'client_ip !in (known_servers)', why: 'A reasonable tuning clause, but not the one that finds the behaviour. On its own it just narrows which hosts you look at, and the tunnel on a known server would be excluded.' },
    ],
    sample: [
      '09:14:02  203.0.113.7  k7f3m2qp5r8twv2x9jh4nb6ms0dlq7zc3fy8gk1pw.t.exfil.example  TXT  NOERROR',
      '09:14:02  203.0.113.7  m2x9jh4nb6ms0dlq7zc3fy8gk1pwk7f3m2qp5r8tw.t.exfil.example  TXT  NOERROR',
      '09:14:03  203.0.113.7  q7zc3fy8gk1pwk7f3m2qp5r8twv2x9jh4nb6ms0d.t.exfil.example  TXT  NOERROR',
      '09:14:03  203.0.113.22 shop.example                                                A    NOERROR',
      '09:14:04  203.0.113.19 cdn.example                                                 A    NOERROR',
    ],
  },
}
