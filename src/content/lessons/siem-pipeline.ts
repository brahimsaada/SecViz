import type { Lesson } from '@/lib/schema'

/**
 * Domain 6, built early on purpose: the defender view is what SecViz adds
 * to the model it borrows, so it needed proving before the content scales.
 *
 * Every log line here is synthetic.
 */
export const siemPipeline: Lesson = {
  slug: 'siem-pipeline',
  title: 'How a SIEM works',
  tagline: 'A raw line becomes a field becomes a rule becomes an alert',
  domain: 'detection',
  level: 'foundations',
  minutes: 12,
  related: ['windows-event-decode', 'detection-engineering', 'dns-logs', 'incident-response'],

  overview: {
    full: 'Security Information and Event Management',
    description:
      'A SIEM is four unglamorous stages and one hard problem. The stages take a line of text off a host, give its parts names, line those names up with every other source, and then ask questions of the result. The hard problem is that a rule precise enough to be worth waking someone for is almost always a rule that misses something. Watch one line travel the whole way, and watch where it can go wrong.',
    facts: [
      ['Stages', 'collect, parse, normalise, correlate, alert'],
      ['Input here', 'one Sysmon process-creation event'],
      ['Output', 'one alert, with three events behind it'],
      ['Where most detections fail', 'parsing and normalisation'],
      ['Data in this lesson', 'entirely synthetic'],
    ],
  },

  nodes: [
    { id: 'host', label: 'Endpoint', sub: 'WKS-4471', role: 'client', x: 9, y: 26 },
    { id: 'agent', label: 'Agent', sub: 'ships the log', role: 'infra', x: 29, y: 26 },
    { id: 'parse', label: 'Parser', sub: 'text → fields', role: 'infra', x: 49, y: 26 },
    { id: 'store', label: 'Index', sub: 'normalised events', role: 'store', x: 69, y: 26 },
    { id: 'rules', label: 'Rule engine', sub: 'runs the detections', role: 'infra', x: 69, y: 62 },
    { id: 'soc', label: 'Analyst', sub: 'gets the alert', role: 'defender', x: 29, y: 90 },
  ],
  start: ['host', 'agent'],
  legend: [
    ['inert', 'Raw, unparsed'],
    ['signal', 'Parsed and normalised'],
    ['anomalous', 'Matched a rule'],
    ['defender', 'Alert raised'],
  ],

  steps: [
    {
      id: 'generate',
      title: 'Something happens',
      desc: 'A process starts on a workstation',
      detail:
        'A user opens an attachment. Word launches, and Word launches PowerShell with an encoded command. Nothing has been detected yet --- the endpoint has simply written a line to a log, as it does several thousand times an hour. Everything that follows is about getting this line somewhere it can be compared with the other lines.',
      perspective: 'both',
      duration: 3000,
      highlight: ['host'],
      facts: [
        ['Event', 'Sysmon Event ID 1, process creation'],
        ['Parent', 'WINWORD.EXE'],
        ['Child', 'powershell.exe'],
        ['Events this hour on this host', '~4,000'],
      ],
      artifact: {
        kind: 'log',
        label: 'Raw log line, as written on the host',
        sub: 'one line of text, no structure yet',
        fields: [
          { name: 'Raw', value: '<Event><System><EventID>1</EventID>…</System><EventData>…</EventData></Event>', note: 'XML on disk. It is well-formed but it is not yet data: nothing has decided which parts matter or what they are called.', intent: 'inert' },
          { name: 'Size', value: '2,114 bytes', note: 'Multiply by four thousand an hour and a few thousand hosts, and the volume is the reason every later stage exists.', intent: 'inert' },
        ],
      },
      telemetry: [
        { source: 'sysmon', code: '1', severity: 'info', message: 'Process Create: powershell.exe (parent WINWORD.EXE) on WKS-4471', fields: [{ name: 'status', value: 'written to local log', note: 'At this point it exists only on the machine. If the host is wiped in the next ten minutes, this evidence goes with it.' }] },
      ],
    },
    {
      id: 'collect',
      title: 'Collect',
      desc: 'Get it off the host, intact',
      detail:
        "The agent reads the log and ships it. Two things matter here and are easy to get wrong: the line must leave the host promptly, because an attacker who gets administrator rights can clear the local log, and the agent must add what the line does not say about itself --- which host, which timezone, what the clock was. A perfectly parsed event with no hostname is worthless.",
      perspective: 'both',
      duration: 3000,
      reveal: ['parse'],
      highlight: ['agent'],
      transit: [{ from: 'host', to: 'agent', label: 'RAW EVENT', payload: ['2,114 bytes', 'XML, unparsed'], intent: 'inert' }],
      facts: [
        ['Transport', 'TLS to the collector'],
        ['Added by the agent', 'hostname, agent id, receipt time'],
        ['Buffered if offline', 'yes, to disk'],
        ['Typical delay', 'under 5 seconds'],
      ],
      artifact: {
        kind: 'log',
        label: 'Event with collection metadata',
        sub: 'what the agent wraps around the line',
        fields: [
          { name: '@timestamp', value: '2026-11-08T09:14:02.441Z', note: "The event's own time, converted to UTC. Keeping local time here is the most common cause of an investigation where two hosts appear to disagree about the order of events.", intent: 'signal' },
          { name: 'event.ingested', value: '2026-11-08T09:14:04.102Z', note: 'When the pipeline received it. The gap between this and @timestamp is how you notice a host whose clock is wrong or whose agent is falling behind.', intent: 'signal' },
          { name: 'host.name', value: 'WKS-4471', note: 'Added here, because the log line does not contain it. Without this field the event cannot be joined to anything else about the machine.', intent: 'signal' },
          { name: 'agent.id', value: 'a4f1-… ', note: 'Identifies the shipper. Lets you tell a host that stopped sending from one that has nothing to send --- a distinction that matters when an attacker kills the agent.', intent: 'signal' },
          { name: 'event.original', value: '<Event>…</Event>', note: 'The untouched original, kept alongside the parsed fields. When a parser turns out to be wrong, this is the only thing that lets you re-parse history rather than lose it.', intent: 'defender' },
        ],
      },
      telemetry: [
        { source: 'agent', code: 'ship', severity: 'info', message: 'shipped 1 event to collector (queue=0, lag_ms=1661)', fields: [{ name: 'lag_ms', value: '1661', note: 'Normal. A queue that grows instead of draining is the first sign that collection, not detection, is your problem.' }] },
      ],
    },
    {
      id: 'parse',
      title: 'Parse',
      desc: 'Text becomes named fields',
      detail:
        'The parser pulls the event apart and gives each piece a name. This is the stage that decides what is detectable: a field the parser does not extract cannot be searched, and a rule written against a field name that the parser spells differently silently matches nothing. Most detections that "stopped working" were never broken --- a log format changed and the parser quietly started dropping a field.',
      perspective: 'both',
      duration: 3600,
      reveal: ['store'],
      highlight: ['parse'],
      transit: [{ from: 'agent', to: 'parse', label: 'PARSE', payload: ['2,114 bytes in', '31 fields out'], intent: 'signal' }],
      facts: [
        ['Fields extracted', '31'],
        ['Command line', 'extracted and kept whole'],
        ['Base64 argument', 'decoded into a second field'],
        ['Failure mode', 'a missing field looks like a quiet rule'],
      ],
      artifact: {
        kind: 'log',
        label: 'Parsed event',
        sub: 'the fields a rule can actually reach',
        fields: [
          { name: 'event.code', value: '1', note: 'Sysmon process creation. The single most useful event id on Windows, and the one most detections start from.', group: 'Identity', intent: 'signal' },
          { name: 'process.name', value: 'powershell.exe', note: 'What started. On its own, unremarkable: PowerShell runs legitimately thousands of times a day in any estate.', group: 'Process', intent: 'signal' },
          { name: 'process.parent.name', value: 'WINWORD.EXE', note: 'What started it. This is the field that matters. A document reader spawning a shell is the relationship, not either process alone.', group: 'Process', intent: 'anomalous' },
          { name: 'process.command_line', value: 'powershell -nop -w hidden -enc SQBFAFgA…', note: 'Kept whole and unmodified. Truncating this field is a common pipeline saving and it blinds every command-line detection you will ever write.', group: 'Process', intent: 'anomalous' },
          { name: 'process.args_decoded', value: 'IEX (New-Object Net.WebClient).Downl…', note: 'The encoded argument, decoded at parse time into its own field. Doing it here rather than in each rule means one implementation to get right instead of twenty.', group: 'Process', intent: 'anomalous' },
          { name: 'user.name', value: 'j.reyes', note: 'Who it ran as. Turns a host-level finding into a person to ring.', group: 'Identity', intent: 'signal' },
          { name: 'process.hash.sha256', value: '9f2c…a1', note: 'Lets the event be matched against known-good and known-bad sets without depending on the file name, which an attacker chooses.', group: 'Process', intent: 'signal' },
        ],
      },
      telemetry: [
        { source: 'pipeline', code: 'parse', severity: 'info', message: 'sysmon.v1 parsed ok: 31 fields, 0 dropped', fields: [{ name: 'dropped', value: '0', note: 'Worth alerting on by itself. A rise in parse failures is a detection outage, and nothing else will tell you.' }] },
      ],
      branches: [
        {
          id: 'truncated',
          label: 'Truncate the command line',
          note: 'Cap the field at 256 bytes, as many pipelines do to save space, and re-run the rule.',
          steps: [
            {
              id: 'truncated-result',
              title: 'The rule goes quiet',
              desc: 'Still ingesting, no longer detecting',
              detail:
                'The event still arrives. It still parses. Thirty of the thirty-one fields are correct, and the dashboard counting events per second looks exactly as it did before. But the encoded argument sat past byte 256, so args_decoded is empty, and the rule that matched on it now matches nothing. Nothing failed loudly. This is the most common way a detection stops working, and the only defence against it is testing rules against known-bad samples on a schedule rather than trusting that a green pipeline means a working one.',
              perspective: 'defender',
              duration: 3600,
              highlight: ['parse', 'rules'],
              transit: [{ from: 'parse', to: 'rules', label: 'NO MATCH', payload: ['args_decoded empty'], intent: 'attacker', dropped: true }],
              facts: [
                ['Events ingested', 'unchanged'],
                ['Parse errors', '0'],
                ['Fields populated', '30 of 31'],
                ['Rule matches', '0'],
                ['Alerts', 'none'],
              ],
              artifact: {
                kind: 'log',
                label: 'Parsed event, field capped',
                sub: 'correct in every visible way',
                fields: [
                  { name: 'process.command_line', value: 'powershell -nop -w hidden -enc SQBFAFgA… [truncated at 256]', note: 'Cut mid-argument. The field exists and looks populated, which is why nobody notices.', intent: 'anomalous' },
                  { name: 'process.args_decoded', value: '(empty)', note: 'The decoder had nothing complete to work with. An empty field and an absent field behave the same way in a rule: neither matches.', intent: 'attacker' },
                  { name: 'Rule result', value: 'no match', note: 'The rule is enabled, healthy and wrong. Its hit count simply stays at zero, which looks identical to a quiet week.', intent: 'attacker' },
                ],
              },
              telemetry: [
                { source: 'pipeline', code: 'parse', severity: 'info', message: 'sysmon.v1 parsed ok: 31 fields, 0 dropped', fields: [{ name: 'dropped', value: '0', note: 'The pipeline is telling the truth and the truth is misleading. No field was dropped; one was shortened.' }] },
                { source: 'siem', code: 'rule-health', severity: 'warning', message: 'Rule "Office spawns encoded shell": 0 matches in 30d (previous 30d: 14)', suspicious: true, fields: [{ name: 'delta', value: '-100%', note: 'The only signal available. Alerting on a rule whose hit rate collapses is how this gets caught.' }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'normalise',
      title: 'Normalise',
      desc: 'One name per thing, across every source',
      detail:
        'The firewall calls it src_ip, the proxy calls it c-ip, the endpoint calls it SourceAddress. Normalisation maps all of them onto one agreed name so a single query can span them. This is tedious and it is the whole value of the platform: without it, every question has to be asked once per source and the answers cannot be joined.',
      perspective: 'defender',
      duration: 3200,
      highlight: ['store'],
      transit: [{ from: 'parse', to: 'store', label: 'INDEX', payload: ['schema-mapped', 'searchable'], intent: 'signal' }],
      facts: [
        ['Schema', 'one field name per concept'],
        ['Sources mapped here', 'endpoint, firewall, proxy, DNS, identity'],
        ['Enrichment added', 'asset owner, criticality, geo'],
        ['Why it matters', 'one query can cross sources'],
      ],
      artifact: {
        kind: 'log',
        label: 'Normalised event',
        sub: 'the same concepts, whatever wrote them',
        fields: [
          { name: 'source.ip', value: '10.20.4.71', note: 'Called src_ip by the firewall, c-ip by the proxy and SourceAddress by Windows. One name here means one query later.', group: 'Mapped', intent: 'signal' },
          { name: 'user.name', value: 'j.reyes', note: 'Lowercased and stripped of the domain prefix. Identity fields arrive in four spellings and a rule that does not account for all of them misses three.', group: 'Mapped', intent: 'signal' },
          { name: 'event.category', value: 'process', note: 'A coarse class shared by every source. It is what lets a rule say "any process creation" without naming every product that reports one.', group: 'Mapped', intent: 'signal' },
          { name: 'host.criticality', value: 'standard', note: 'Enrichment, not from the log. The same event on a domain controller deserves a different response, and only the asset inventory knows which this is.', group: 'Enriched', intent: 'defender' },
          { name: 'user.department', value: 'Finance', note: 'Also enrichment. It is what turns "a host downloaded a file" into "a finance workstation downloaded a file", which is the sentence that gets someone out of bed.', group: 'Enriched', intent: 'defender' },
        ],
      },
      telemetry: [
        { source: 'siem', code: 'index', severity: 'info', message: 'indexed 1 event: category=process host=WKS-4471 user=j.reyes', fields: [{ name: 'searchable_in_ms', value: '340', note: 'The delay between an event happening and being findable. It sets the floor on how fast any detection can possibly fire.' }] },
      ],
    },
    {
      id: 'correlate',
      title: 'Correlate',
      desc: 'Three weak signals, one strong one',
      detail:
        'The rule does not fire on the process creation. On its own, Word starting PowerShell happens for legitimate reasons often enough that alerting on it would bury the analyst. It fires on the sequence: that process creation, followed within two minutes by an outbound connection from the same process to an address nobody in the estate has contacted before, followed by a scheduled task created by the same user. Each piece is weak. Together they are not.',
      perspective: 'defender',
      duration: 3800,
      reveal: ['rules'],
      highlight: ['rules'],
      transit: [{ from: 'store', to: 'rules', label: 'MATCH', payload: ['3 events, 94 s apart', 'same host and user'], intent: 'anomalous' }],
      facts: [
        ['Events joined', '3'],
        ['Join keys', 'host.name, user.name, process.entity_id'],
        ['Window', '5 minutes'],
        ['Each alone', 'too noisy to alert on'],
        ['Together', '1 alert'],
      ],
      artifact: {
        kind: 'log',
        label: 'Correlation match',
        sub: 'the sequence, not the events',
        fields: [
          { name: 'Condition 1', value: 'process.parent.name in (office_apps) and process.name == "powershell.exe"', note: 'Thousands of hits a month across an estate. Useful only as a starting point for a sequence.', group: 'Sequence', intent: 'anomalous' },
          { name: 'Condition 2', value: 'network.direction == "outbound" and destination.ip not in (seen_30d)', note: 'Also noisy alone --- every new service a company adopts trips it. Tied to the first condition and the same process, it stops being noisy.', group: 'Sequence', intent: 'anomalous' },
          { name: 'Condition 3', value: 'event.code == 4698 and user.name == <same>', note: 'A scheduled task created by the same user. On its own this is routine administration; here it is the attacker arranging to survive a reboot.', group: 'Sequence', intent: 'anomalous' },
          { name: 'Window', value: '300 seconds, ordered', note: 'Order matters. The same three events in a different order are a sysadmin doing their job.', group: 'Sequence', intent: 'signal' },
          { name: 'Join key', value: 'host.name + user.name', note: 'What makes the three events one story rather than three. Getting the join key wrong produces an alert that correlates unrelated activity on a busy host.', group: 'Sequence', intent: 'signal' },
          { name: 'ATT&CK', value: 'T1566.001 → T1059.001 → T1053.005', note: 'Phishing attachment, then PowerShell, then a scheduled task. Mapping the sequence rather than each event is what makes the alert legible to whoever picks it up.', group: 'Context', intent: 'defender' },
        ],
      },
      telemetry: [
        { source: 'siem', code: 'rule-match', severity: 'warning', message: 'Rule "Office spawns shell then beacons then persists" matched: 3 events, WKS-4471, j.reyes', suspicious: true },
      ],
    },
    {
      id: 'alert',
      title: 'Alert',
      desc: 'One thing, to one person, with the evidence',
      detail:
        'The alert carries what the analyst needs to decide in the first minute: what fired, on which host, as which user, which three events are behind it, and what to do first. Severity comes from the rule and from the enrichment together --- the same sequence on a domain controller would be critical rather than high. Everything the analyst would otherwise have to go and look up is attached.',
      perspective: 'defender',
      duration: 3400,
      highlight: ['soc'],
      transit: [{ from: 'rules', to: 'soc', label: 'ALERT', payload: ['high', 'WKS-4471 / j.reyes'], intent: 'defender' }],
      facts: [
        ['Severity', 'high'],
        ['Events attached', '3'],
        ['Time from event to alert', '96 seconds'],
        ['First action', 'isolate the host, keep it powered'],
      ],
      artifact: {
        kind: 'log',
        label: 'Alert',
        sub: 'what reaches the analyst',
        fields: [
          { name: 'rule.name', value: 'Office spawns shell then beacons then persists', note: 'Named for what it means, not for the technique id. The analyst reads this first and should not need to look anything up to understand it.', group: 'What', intent: 'defender' },
          { name: 'severity', value: 'high', note: 'From the rule and the asset together. Severity that ignores which host it happened on is how an estate learns to ignore its alerts.', group: 'What', intent: 'defender' },
          { name: 'host.name', value: 'WKS-4471', note: 'Where to go. With the asset owner attached, so nobody spends ten minutes finding out whose laptop it is.', group: 'Where', intent: 'defender' },
          { name: 'user.name', value: 'j.reyes (Finance)', note: 'Who to ring. The department comes from enrichment and it changes what you ask them.', group: 'Where', intent: 'defender' },
          { name: 'evidence', value: '3 event ids, with the original lines', note: 'Attached, not referenced. An alert that requires the analyst to go and run three searches to see what fired will be triaged badly under load.', group: 'Why', intent: 'defender' },
          { name: 'next_step', value: 'Isolate WKS-4471; do not power off', note: 'Written by whoever built the rule, when they still remembered why. Memory is in the running processes; pulling the power destroys it.', group: 'Do', intent: 'defender' },
        ],
      },
      telemetry: [
        { source: 'siem', code: 'alert', severity: 'alert', message: 'HIGH: Office spawns shell then beacons then persists — WKS-4471 / j.reyes (Finance)', suspicious: true, fields: [{ name: 'alert_id', value: 'AL-2026-11-08-0417', note: 'The handle everything else hangs off: the case, the timeline, the eventual write-up.' }, { name: 'dwell_seconds', value: '96', note: 'From the first event to the alert. Worth measuring per rule, because it is the number that decides whether detection mattered.' }] },
      ],
    },
  ],

  outro: {
    title: 'One alert, four stages',
    desc: 'The rule was the easy part',
    text:
      'One line of XML on a workstation became an alert with three events behind it in ninety-six seconds. The detection logic was five lines; everything else was collection, parsing and normalisation --- and the what-if showed where this really breaks. A pipeline that drops or shortens a field keeps reporting perfect health while the rules that depend on it quietly match nothing. Test detections against known-bad samples on a schedule, and alert on rules whose hit rate falls off a cliff.',
    facts: [
      ['Input', '1 raw event, 2,114 bytes'],
      ['Output', '1 alert, 3 events attached'],
      ['Detection logic', '5 lines'],
      ['Everything else', 'collection, parsing, normalisation, enrichment'],
      ['Most likely failure', 'a quiet parser, not a wrong rule'],
    ],
  },

  challenge: {
    kind: 'toggle',
    prompt:
      'Your "Office spawns encoded shell" rule has matched nothing for thirty days. It matched fourteen times in the thirty days before that. Event volume is normal and there are no parse errors. What do you check first?',
    options: [
      {
        label: 'Whether the command-line field is still fully populated',
        correct: true,
        why: 'This first. A field that is present but truncated or renamed produces exactly this picture: normal volume, no parse errors, and a rule that silently matches nothing. Compare a recent event against one from before the change and look at the field the rule actually reads.',
      },
      {
        label: 'Whether attackers have stopped using encoded PowerShell',
        why: 'Possible in the long run, but not in a step change to zero across thirty days. Treat a cliff in a rule hit rate as a pipeline fault until you have ruled it out — the alternative explanation is the one you want to be wrong about.',
      },
      {
        label: 'Whether the rule is still enabled',
        why: 'Worth thirty seconds, and it does happen. But a disabled rule usually shows as disabled in the rule list, whereas the described symptoms — healthy ingest, no errors, zero matches — point at the data the rule reads rather than the rule itself.',
      },
      {
        label: 'Whether the endpoint agent is still reporting',
        why: 'Ruled out by the premise: event volume is normal. If hosts had stopped reporting you would see the drop in ingest, not just in one rule.',
      },
    ],
  },
}
