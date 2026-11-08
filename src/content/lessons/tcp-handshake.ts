import type { Lesson } from '@/lib/schema'

/** Synthetic. Addresses from the RFC 5737 documentation ranges. */
export const tcpHandshake: Lesson = {
  slug: 'tcp-handshake',
  title: 'TCP, reliably',
  tagline: 'Three packets to agree where to start counting',
  domain: 'networking',
  level: 'foundations',
  minutes: 9,
  prerequisites: ['ip-and-routing'],
  related: ['tls-handshake', 'http-request', 'recon'],

  overview: {
    full: 'Transmission Control Protocol',
    description:
      'IP will deliver a packet if it can and shrug if it cannot. TCP turns that into an ordered stream that either arrives completely or fails loudly, by numbering every byte and acknowledging what arrives. Watch the three packets that set it up, and see why the same three packets make port scanning possible.',
    facts: [
      ['Layer', 'Transport (4)'],
      ['Setup', 'three-way handshake'],
      ['Reliability', 'sequence numbers and acknowledgements'],
      ['Header', '20 to 60 bytes'],
      ['Defined in', 'RFC 9293'],
    ],
  },

  nodes: [
    { id: 'client', label: 'Laptop', sub: '203.0.113.7:49185', role: 'client', x: 14, y: 42 },
    { id: 'fw', label: 'Firewall', sub: 'logs every flow', role: 'infra', x: 46, y: 42 },
    { id: 'server', label: 'Web server', sub: '198.51.100.9:443', role: 'server', x: 78, y: 42 },
    { id: 'soc', label: 'SOC', sub: 'reads the flow log', role: 'defender', x: 46, y: 84 },
  ],
  start: ['client', 'server'],
  legend: [
    ['signal', 'Handshake'],
    ['defender', 'Established'],
    ['anomalous', 'Refused or dropped'],
  ],

  steps: [
    {
      id: 'syn',
      title: 'SYN',
      desc: 'An opening offer, with a starting number',
      detail:
        'The client picks a random starting sequence number and sends a packet with the SYN flag set and no data. Random rather than zero, because a predictable starting number lets an off-path attacker inject data into a connection they cannot see. The packet also states the largest segment the client can receive and what options it supports.',
      perspective: 'both',
      duration: 2800,
      reveal: ['fw', 'soc'],
      highlight: ['client'],
      transit: [{ from: 'client', to: 'server', label: 'SYN', payload: ['seq=1280455 (random)', 'no data'], intent: 'signal' }],
      facts: [
        ['Flags', 'SYN'],
        ['Sequence', '1280455, random'],
        ['Payload', 'none'],
        ['Source port', '49185, ephemeral'],
      ],
      artifact: {
        kind: 'packet',
        label: 'TCP header: SYN',
        sub: '20 bytes of header, no payload',
        hex: 'c0 21 01 bb 00 13 8b 07 00 00 00 00 a0 02 ff d7 00 00 00 00',
        fields: [
          { name: 'Source Port', value: '49185', note: 'Chosen at random from the ephemeral range. Together with the four other address and port values it identifies this connection uniquely.', offset: 0, length: 2, group: 'Header', intent: 'signal' },
          { name: 'Destination Port', value: '443', note: 'Says which service is wanted. The port, not the content, is what a basic firewall rule acts on.', offset: 2, length: 2, group: 'Header', intent: 'signal' },
          { name: 'Sequence Number', value: '1280455', note: 'Where this side will start counting. Random on purpose: a predictable value would let someone who cannot see the connection guess the right number and inject data into it.', offset: 4, length: 4, group: 'Header', intent: 'signal' },
          { name: 'Acknowledgement', value: '0', note: 'Nothing to acknowledge yet, so the field is unused. It only becomes meaningful once the ACK flag is set.', offset: 8, length: 4, group: 'Header', intent: 'signal' },
          { name: 'Flags', value: '0x002 — SYN', note: 'One flag, and it means "I want to start counting here". A packet with SYN alone is the only way a TCP connection can begin.', offset: 13, length: 1, group: 'Header', intent: 'signal' },
          { name: 'Window', value: '65,495 bytes', note: 'How much the client can take before it has to be acknowledged. It is how TCP keeps a fast sender from drowning a slow receiver.', offset: 14, length: 2, group: 'Header', intent: 'signal' },
          { name: 'Checksum', value: '0x0000 — offloaded', note: 'Zero here because the network card computes it on the way out. Captured on the sending host, TCP checksums are usually blank for this reason and it is not a fault.', offset: 16, length: 2, group: 'Header', intent: 'inert' },
        ],
      },
      telemetry: [
        { source: 'firewall', code: 'flow-start', severity: 'info', message: 'new flow 203.0.113.7:49185 → 198.51.100.9:443 proto=tcp action=allow', fields: [{ name: 'action', value: 'allow', note: 'Decided on the ports and addresses. The firewall has no idea what will travel inside.' }] },
      ],
      branches: [
        {
          id: 'scan',
          label: 'Send SYN to 1,000 ports',
          note: 'Keep the SYN, change only the destination port, and watch the replies.',
          steps: [
            {
              id: 'scan-result',
              title: 'Three answers',
              desc: 'Open, closed, and silence',
              detail:
                'A SYN to a closed port gets RST; a SYN to an open port gets SYN-ACK; a SYN to a port behind a drop rule gets nothing at all. Those three outcomes map the host, and none of them requires completing a single connection. This is why a firewall that drops rather than rejects is slower to scan, and why SYN scanning leaves a very clear shape in a flow log: one source, hundreds of destination ports, almost no established connections.',
              perspective: 'defender',
              duration: 3400,
              highlight: ['client', 'fw', 'soc'],
              transit: [{ from: 'client', to: 'server', label: 'SYN ×1000', payload: ['one port each', '4 seconds'], intent: 'attacker' }],
              facts: [
                ['Ports probed', '1,000'],
                ['SYN-ACK — open', '3'],
                ['RST — closed', '941'],
                ['No reply — dropped', '56'],
                ['Connections completed', '0'],
              ],
              artifact: {
                kind: 'packet',
                label: 'The three replies',
                sub: 'each one tells the scanner something',
                fields: [
                  { name: 'SYN-ACK (0x012)', value: 'port 443, 80, 22', note: 'Open. Something is listening, and the scanner now knows what to come back to.', intent: 'attacker' },
                  { name: 'RST-ACK (0x014)', value: '941 ports', note: 'Closed but reachable. The host is up and the kernel is answering — which also confirms the address is live.', intent: 'anomalous' },
                  { name: 'no reply', value: '56 ports', note: 'A firewall dropped it silently. Slower for the scanner, because it must wait for a timeout on each one, and it reveals nothing about whether anything is listening.', intent: 'defender' },
                  { name: 'Handshakes completed', value: '0', note: 'The scanner never sends the third packet. On older systems that meant nothing was logged by the application — the firewall flow log sees it regardless.', intent: 'anomalous' },
                ],
              },
              telemetry: [
                { source: 'firewall', code: 'flow', severity: 'warning', message: '203.0.113.7 → 198.51.100.9: 1000 flows, 997 with 0 bytes transferred, 4s', suspicious: true, fields: [{ name: 'zero_byte_flows', value: '997', note: 'The signature. Real connections carry data; a scan sets up almost none.' }] },
                { source: 'siem', code: 'NET-T1046', severity: 'alert', message: 'Port scan: 1000 distinct destination ports from 203.0.113.7 in 4s', suspicious: true, fields: [{ name: 'technique', value: 'T1046', note: 'ATT&CK: Network Service Discovery.' }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'syn-ack',
      title: 'SYN-ACK',
      desc: 'Agreed, and here is my number',
      detail:
        'The server answers with both flags set: SYN for its own starting number, ACK for the client\'s. The acknowledgement is the client\'s sequence plus one, which means "I have your number, send the next byte from there". The server now holds half-open state for this connection, and the amount of that state is finite — which is the whole basis of a SYN flood.',
      perspective: 'both',
      duration: 2800,
      highlight: ['server'],
      transit: [{ from: 'server', to: 'client', label: 'SYN-ACK', payload: ['seq=3301887, ack=1280456'], intent: 'signal' }],
      facts: [
        ['Flags', 'SYN, ACK'],
        ['Server sequence', '3301887, random'],
        ['Acknowledgement', '1280456 = client seq + 1'],
        ['State held', 'half-open, finite'],
      ],
      artifact: {
        kind: 'packet',
        label: 'TCP header: SYN-ACK',
        sub: 'two flags, two numbers',
        hex: '01 bb c0 21 00 32 61 bf 00 13 8b 08 a0 12 ff ff 00 00 00 00',
        fields: [
          { name: 'Sequence Number', value: '3301887', note: "The server's own random starting point. Each direction counts separately, so a connection has two independent sequences.", offset: 4, length: 4, group: 'Header', intent: 'signal' },
          { name: 'Acknowledgement', value: '1280456', note: "The client's sequence plus one: not \"I received byte 1280455\" but \"the next byte I expect is 1280456\". Everything before it has arrived.", offset: 8, length: 4, group: 'Header', intent: 'signal' },
          { name: 'Flags', value: '0x012 — SYN, ACK', note: 'The only packet in the connection with both set. It is simultaneously the server opening its own direction and confirming the client\'s.', offset: 13, length: 1, group: 'Header', intent: 'signal' },
          { name: 'Window', value: '65,535 bytes', note: 'The server stating its own capacity. The two sides do not have to agree, and each respects the other\'s number.', offset: 14, length: 2, group: 'Header', intent: 'signal' },
        ],
      },
      telemetry: [
        { source: 'firewall', code: 'flow', severity: 'info', message: '198.51.100.9:443 → 203.0.113.7:49185 syn-ack, flow half-open' },
      ],
    },
    {
      id: 'ack',
      title: 'ACK',
      desc: 'Both sides counting, connection open',
      detail:
        'The third packet acknowledges the server\'s sequence number and carries no data. Both directions are now established and either side may send. The handshake cost one and a half round trips before a single useful byte moved, which is exactly why TLS 1.3 works so hard to need only one round trip of its own, and why QUIC folds the two together.',
      perspective: 'both',
      duration: 2800,
      highlight: ['client', 'fw', 'server'],
      transit: [{ from: 'client', to: 'server', label: 'ACK', payload: ['ack=3301888', 'established'], intent: 'defender' }],
      facts: [
        ['Flags', 'ACK'],
        ['State', 'ESTABLISHED, both directions'],
        ['Cost so far', '1.5 round trips, 0 bytes of data'],
        ['Next', 'TLS, then HTTP'],
      ],
      artifact: {
        kind: 'packet',
        label: 'TCP header: ACK',
        sub: 'the connection is open after this',
        hex: 'c0 21 01 bb 00 13 8b 08 00 32 61 c0 50 10 10 00 00 00 00 00',
        fields: [
          { name: 'Acknowledgement', value: '3301888', note: "The server's sequence plus one. With both sides acknowledged, each knows the other is reachable and counting from the agreed point.", offset: 8, length: 4, group: 'Header', intent: 'signal' },
          { name: 'Flags', value: '0x010 — ACK', note: 'ACK alone. From here until the connection closes, every packet carries this flag, because every packet also acknowledges what has arrived.', offset: 13, length: 1, group: 'Header', intent: 'defender' },
          { name: 'Data Offset', value: '5 words — 20 bytes', note: 'The header is back to its minimum: the options that were negotiated in the first two packets are not repeated.', offset: 12, length: 1, group: 'Header', intent: 'signal' },
          { name: 'Payload', value: '0 bytes', note: 'Nothing useful has yet been sent. A connection that is opened and immediately closed with no payload is the shape of a scan rather than a client.', group: 'Payload', intent: 'anomalous' },
        ],
      },
      telemetry: [
        { source: 'firewall', code: 'flow', severity: 'info', message: 'flow established 203.0.113.7:49185 ↔ 198.51.100.9:443 state=ESTABLISHED', fields: [{ name: 'state', value: 'ESTABLISHED', note: 'The transition a scan never reaches, which is why counting established versus attempted flows per source finds scanning cheaply.' }] },
      ],
    },
  ],

  outro: {
    title: 'Connection established',
    desc: 'Three packets, no data yet',
    text:
      'Two random numbers were exchanged and acknowledged, and both sides now agree where their byte counts begin. Nothing useful has crossed. The same three packets that open a connection also leak whether a port is listening, which is why a flow log that counts attempted against established connections per source is one of the cheapest detections available — it needs no payload, no decryption and no agent.',
    facts: [
      ['Packets', '3'],
      ['Round trips', '1.5'],
      ['Payload bytes', '0'],
      ['Leaks', 'whether a port is listening'],
      ['Cheapest detection', 'attempted vs established per source'],
    ],
  },

  challenge: {
    kind: 'toggle',
    prompt:
      'Your firewall currently answers connections to closed ports with RST. Someone proposes dropping them silently instead. What does that actually change for an attacker scanning you?',
    options: [
      {
        label: 'It slows the scan down and hides which ports are closed',
        correct: true,
        why: 'Right, and that is the whole of it. The scanner must wait for a timeout on each silent port instead of getting an instant RST, so a full scan takes far longer, and it can no longer tell "closed" from "filtered". It does not hide the open ports — those still answer with SYN-ACK — and it does not stop the scan.',
      },
      {
        label: 'It stops the scan from finding open ports',
        why: 'No. Open ports still answer with SYN-ACK, because something is genuinely listening and the firewall is letting it through. Dropping affects only the ports with nothing behind them.',
      },
      {
        label: 'It prevents the scan from appearing in the flow log',
        why: 'Backwards — the firewall logs the attempt whether it answers or drops. Dropping changes what the attacker learns, not what you record.',
      },
      {
        label: 'It makes the host look offline',
        why: 'Only if every port is dropped, including the open ones, which would also mean no service works. With any port answering, the host is plainly up.',
      },
    ],
  },
}
