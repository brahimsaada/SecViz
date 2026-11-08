import type { Level } from '@/lib/schema'

/**
 * The twelve domains, and for each one the lessons it holds.
 *
 * A lesson is listed here whether or not it has been written yet: the
 * domain map then draws the whole path, with the unwritten nodes dimmed.
 * That is deliberate --- a learner can see where a topic sits before
 * someone finds time to author it.
 *
 * `canonical` marks the one domain a cross-referenced lesson lives in.
 * TLS lives in cryptography and is referenced from networking; Kerberos
 * lives in Active Directory and is referenced from authentication.
 */
export type DomainEntry = {
  slug: string
  title: string
  level: Level
  /** Entries this one should be taken after. Drawn as edges on the map. */
  after?: string[]
  /** Set when the lesson lives in another domain. */
  canonicalIn?: string
}

export type Domain = {
  slug: string
  /** Shown in the ordered domain list. */
  n: number
  title: string
  tagline: string
  description: string
  entries: DomainEntry[]
}

export const domains: Domain[] = [
  {
    slug: 'networking',
    n: 1,
    title: 'Networking protocols',
    tagline: 'What actually crosses the wire',
    description:
      'The layer every other domain sits on. Each lesson animates one protocol and decodes its packets field by field, so later lessons on attacks and detection can point at bytes you have already read.',
    entries: [
      { slug: 'arp-and-ethernet', title: 'Ethernet and ARP', level: 'foundations' },
      { slug: 'ip-and-routing', title: 'IP and routing', level: 'foundations', after: ['arp-and-ethernet'] },
      { slug: 'dns-resolution', title: 'DNS resolution', level: 'foundations', after: ['ip-and-routing'] },
      { slug: 'tcp-handshake', title: 'TCP, reliably', level: 'foundations', after: ['ip-and-routing'] },
      { slug: 'udp-and-icmp', title: 'UDP and ICMP', level: 'foundations', after: ['ip-and-routing'] },
      { slug: 'dhcp-lease', title: 'DHCP lease', level: 'foundations', after: ['arp-and-ethernet'] },
      { slug: 'nat-traversal', title: 'NAT', level: 'intermediate', after: ['ip-and-routing'] },
      { slug: 'http-request', title: 'HTTP/1.1', level: 'foundations', after: ['tcp-handshake'] },
      { slug: 'tls-handshake', title: 'The TLS handshake', level: 'intermediate', after: ['tcp-handshake'], canonicalIn: 'cryptography' },
      { slug: 'http2-streams', title: 'HTTP/2 streams', level: 'intermediate', after: ['http-request'] },
      { slug: 'quic-and-http3', title: 'QUIC and HTTP/3', level: 'advanced', after: ['tls-handshake', 'udp-and-icmp'] },
      { slug: 'websocket-upgrade', title: 'WebSocket', level: 'intermediate', after: ['http-request'] },
      { slug: 'smtp-delivery', title: 'SMTP delivery', level: 'intermediate', after: ['tcp-handshake'] },
      { slug: 'imap-mailbox', title: 'IMAP', level: 'intermediate', after: ['smtp-delivery'] },
      { slug: 'snmp-polling', title: 'SNMP', level: 'intermediate', after: ['udp-and-icmp'] },
      { slug: 'bgp-announce', title: 'BGP announcements', level: 'advanced', after: ['ip-and-routing'] },
      { slug: 'ospf-adjacency', title: 'OSPF', level: 'advanced', after: ['ip-and-routing'] },
      { slug: 'vlans-and-trunks', title: 'VLANs and trunks', level: 'intermediate', after: ['arp-and-ethernet'] },
    ],
  },
  {
    slug: 'cryptography',
    n: 2,
    title: 'Cryptography',
    tagline: 'From a hash to a handshake',
    description:
      'The primitives, then the protocol that assembles them. The TLS handshake lives here, decoded message by message, because everything else in the domain is a part of it.',
    entries: [
      { slug: 'hashing', title: 'Hashing', level: 'foundations' },
      { slug: 'symmetric-encryption', title: 'Symmetric encryption', level: 'foundations', after: ['hashing'] },
      { slug: 'block-and-stream', title: 'Block and stream modes', level: 'intermediate', after: ['symmetric-encryption'] },
      { slug: 'asymmetric-keys', title: 'Asymmetric keys', level: 'foundations', after: ['symmetric-encryption'] },
      { slug: 'diffie-hellman', title: 'Diffie-Hellman', level: 'intermediate', after: ['asymmetric-keys'] },
      { slug: 'signatures', title: 'Digital signatures', level: 'intermediate', after: ['asymmetric-keys', 'hashing'] },
      { slug: 'certificates', title: 'Certificates', level: 'intermediate', after: ['signatures'] },
      { slug: 'tls-handshake', title: 'The TLS handshake', level: 'intermediate', after: ['diffie-hellman', 'certificates'] },
      { slug: 'pki-chains', title: 'PKI and chains of trust', level: 'advanced', after: ['certificates'] },
      { slug: 'revocation', title: 'Revocation: CRL and OCSP', level: 'advanced', after: ['pki-chains'] },
    ],
  },
  {
    slug: 'authentication',
    n: 3,
    title: 'Authentication and identity',
    tagline: 'Proving who you are, and staying proved',
    description:
      'How a claim of identity is made, checked and carried. Password storage through to WebAuthn, then the federation protocols that hand identity between systems.',
    entries: [
      { slug: 'password-storage', title: 'Password storage', level: 'foundations' },
      { slug: 'sessions-and-cookies', title: 'Sessions and cookies', level: 'foundations', after: ['password-storage'] },
      { slug: 'mfa-totp', title: 'MFA and TOTP', level: 'foundations', after: ['password-storage'] },
      { slug: 'webauthn', title: 'WebAuthn and FIDO2', level: 'intermediate', after: ['mfa-totp'] },
      { slug: 'oauth2-code-flow', title: 'OAuth 2.0', level: 'intermediate', after: ['sessions-and-cookies'] },
      { slug: 'oidc', title: 'OpenID Connect', level: 'intermediate', after: ['oauth2-code-flow'] },
      { slug: 'saml-sso', title: 'SAML and SSO', level: 'intermediate', after: ['sessions-and-cookies'] },
      { slug: 'kerberos', title: 'Kerberos', level: 'advanced', after: ['mfa-totp'], canonicalIn: 'active-directory' },
    ],
  },
  {
    slug: 'web-security',
    n: 4,
    title: 'Web security',
    tagline: 'Where a request goes wrong',
    description:
      'The browser rules that hold the web together, and how whole classes of bug arise at the level of a single request. Shown as requests and responses, not as payload lists.',
    entries: [
      { slug: 'same-origin-policy', title: 'Same-origin policy', level: 'foundations' },
      { slug: 'cors', title: 'CORS', level: 'foundations', after: ['same-origin-policy'] },
      { slug: 'injection-shape', title: 'How injection arises', level: 'intermediate', after: ['same-origin-policy'] },
      { slug: 'broken-access-control', title: 'Broken access control', level: 'intermediate', after: ['same-origin-policy'] },
      { slug: 'security-headers', title: 'Security headers', level: 'foundations', after: ['cors'] },
      { slug: 'cookie-flags', title: 'Cookie flags', level: 'foundations', after: ['security-headers'] },
    ],
  },
  {
    slug: 'attack-lifecycle',
    n: 5,
    title: 'Attack lifecycle',
    tagline: 'Mapped to MITRE ATT&CK',
    description:
      'One pass through an intrusion, stage by stage. Every lesson shows the actor action, the traffic it makes, and the telemetry it leaves, and names the detection lesson that answers it.',
    entries: [
      { slug: 'recon', title: 'Reconnaissance', level: 'foundations' },
      { slug: 'initial-access-phishing', title: 'Initial access', level: 'intermediate', after: ['recon'] },
      { slug: 'execution', title: 'Execution', level: 'intermediate', after: ['initial-access-phishing'] },
      { slug: 'persistence', title: 'Persistence', level: 'intermediate', after: ['execution'] },
      { slug: 'privilege-escalation', title: 'Privilege escalation', level: 'advanced', after: ['execution'] },
      { slug: 'lateral-movement', title: 'Lateral movement', level: 'advanced', after: ['privilege-escalation'] },
      { slug: 'exfiltration', title: 'Exfiltration', level: 'advanced', after: ['lateral-movement'] },
      { slug: 'impact', title: 'Impact', level: 'advanced', after: ['exfiltration'] },
    ],
  },
  {
    slug: 'detection',
    n: 6,
    title: 'Defense and detection',
    tagline: 'From a raw log to an alert',
    description:
      'The defender view on its own terms. A log line becomes a field becomes a rule becomes an alert, and you can edit the rule and replay the same traffic against it.',
    entries: [
      { slug: 'siem-pipeline', title: 'How a SIEM works', level: 'foundations' },
      { slug: 'windows-event-decode', title: 'Windows Event logs', level: 'foundations', after: ['siem-pipeline'] },
      { slug: 'sysmon-decode', title: 'Sysmon', level: 'intermediate', after: ['windows-event-decode'] },
      { slug: 'firewall-and-proxy-logs', title: 'Firewall and proxy logs', level: 'foundations', after: ['siem-pipeline'] },
      { slug: 'dns-logs', title: 'DNS logs', level: 'intermediate', after: ['firewall-and-proxy-logs'] },
      { slug: 'detection-engineering', title: 'Detection engineering', level: 'intermediate', after: ['sysmon-decode'] },
      { slug: 'ids-signatures', title: 'IDS and IPS signatures', level: 'intermediate', after: ['firewall-and-proxy-logs'] },
      { slug: 'spf-dkim-dmarc', title: 'SPF, DKIM and DMARC', level: 'intermediate' },
      { slug: 'incident-response', title: 'The incident response timeline', level: 'advanced', after: ['detection-engineering'] },
    ],
  },
  {
    slug: 'infrastructure',
    n: 7,
    title: 'Infrastructure and modern environments',
    tagline: 'Boundaries, and what crosses them',
    description:
      'Where the perimeter went. Cloud IAM evaluation, zero trust, segmentation, and the VPN and Wi-Fi handshakes that still carry most of the trust.',
    entries: [
      { slug: 'cloud-iam', title: 'Cloud IAM', level: 'intermediate' },
      { slug: 'zero-trust', title: 'Zero trust', level: 'intermediate', after: ['cloud-iam'] },
      { slug: 'segmentation', title: 'Segmentation', level: 'foundations' },
      { slug: 'wireguard', title: 'WireGuard', level: 'intermediate' },
      { slug: 'ipsec', title: 'IPsec', level: 'advanced', after: ['wireguard'] },
      { slug: 'openvpn', title: 'OpenVPN', level: 'intermediate', after: ['wireguard'] },
      { slug: 'wpa2-wpa3', title: 'Wi-Fi: WPA2 and WPA3', level: 'intermediate' },
    ],
  },
  {
    slug: 'containers',
    n: 8,
    title: 'Containers and orchestration',
    tagline: 'A layer, a namespace, an admission decision',
    description:
      'What a container actually is, and what the control plane does with a request to run one. Image layers, isolation primitives, then Kubernetes RBAC, secrets and network policy.',
    entries: [
      { slug: 'image-layers', title: 'Image layers and build', level: 'foundations' },
      { slug: 'container-isolation', title: 'Isolation: namespaces and cgroups', level: 'intermediate', after: ['image-layers'] },
      { slug: 'image-scanning', title: 'Image scanning', level: 'foundations', after: ['image-layers'] },
      { slug: 'k8s-request-flow', title: 'The control-plane request', level: 'intermediate', after: ['container-isolation'] },
      { slug: 'pod-networking', title: 'Pod networking', level: 'intermediate', after: ['k8s-request-flow'] },
      { slug: 'k8s-rbac', title: 'Kubernetes RBAC', level: 'intermediate', after: ['k8s-request-flow'] },
      { slug: 'k8s-secrets', title: 'Secrets', level: 'intermediate', after: ['k8s-rbac'] },
      { slug: 'network-policies', title: 'Network policies', level: 'advanced', after: ['pod-networking'] },
    ],
  },
  {
    slug: 'supply-chain',
    n: 9,
    title: 'CI/CD and supply chain',
    tagline: 'Trusting what you did not build',
    description:
      'A commit through to a signed artifact, and every point where something else could be substituted on the way. Git objects, pipeline runs, dependency trust, SBOMs and signing.',
    entries: [
      { slug: 'git-commit-anatomy', title: 'Git commit anatomy', level: 'foundations' },
      { slug: 'pr-flow', title: 'The pull request', level: 'foundations', after: ['git-commit-anatomy'] },
      { slug: 'actions-pipeline', title: 'A GitHub Actions run', level: 'intermediate', after: ['pr-flow'] },
      { slug: 'ci-secrets', title: 'CI secrets exposure', level: 'intermediate', after: ['actions-pipeline'] },
      { slug: 'dependency-compromise', title: 'Dependency compromise', level: 'advanced', after: ['actions-pipeline'] },
      { slug: 'sbom', title: 'SBOM', level: 'intermediate', after: ['dependency-compromise'] },
      { slug: 'artifact-signing', title: 'Artifact signing', level: 'advanced', after: ['sbom'] },
      { slug: 'branch-protection', title: 'Branch protection', level: 'foundations', after: ['pr-flow'] },
    ],
  },
  {
    slug: 'iac-cloud',
    n: 10,
    title: 'Infrastructure as code and cloud',
    tagline: 'The plan, and what it really changes',
    description:
      'A Terraform plan read line by line, policy evaluation followed to its decision, and the two misconfigurations that account for most public cloud exposure.',
    entries: [
      { slug: 'terraform-plan', title: 'Terraform plan and apply', level: 'foundations' },
      { slug: 'drift', title: 'Drift', level: 'intermediate', after: ['terraform-plan'] },
      { slug: 'policy-evaluation', title: 'Policy evaluation', level: 'intermediate' },
      { slug: 'storage-misconfiguration', title: 'Storage misconfiguration', level: 'foundations', after: ['policy-evaluation'] },
      { slug: 'module-trust', title: 'Module trust', level: 'advanced', after: ['terraform-plan'] },
    ],
  },
  {
    slug: 'observability',
    n: 11,
    title: 'Observability and runtime',
    tagline: 'Watching a system while it runs',
    description:
      'A trace across services, syscalls observed from the kernel, and the admission check that runs before any of it starts.',
    entries: [
      { slug: 'distributed-tracing', title: 'Distributed tracing', level: 'intermediate' },
      { slug: 'syscall-monitoring', title: 'Runtime syscall monitoring', level: 'advanced', after: ['distributed-tracing'] },
      { slug: 'admission-control', title: 'Admission control', level: 'intermediate' },
    ],
  },
  {
    slug: 'active-directory',
    n: 12,
    title: 'Active Directory and identity infrastructure',
    tagline: 'The graph every intrusion walks',
    description:
      'The directory, the protocols that read and authenticate against it, and the attack paths that fall out of how it is configured. Kerberos lives here in full.',
    entries: [
      { slug: 'directory-structure', title: 'Directory structure', level: 'foundations' },
      { slug: 'dc-replication', title: 'DC replication', level: 'intermediate', after: ['directory-structure'] },
      { slug: 'ldap-queries', title: 'LDAP', level: 'foundations', after: ['directory-structure'] },
      { slug: 'kerberos', title: 'Kerberos', level: 'advanced', after: ['ldap-queries'] },
      { slug: 'ntlm', title: 'NTLM', level: 'intermediate', after: ['ldap-queries'] },
      { slug: 'gpo-precedence', title: 'GPO precedence', level: 'intermediate', after: ['directory-structure'] },
      { slug: 'ad-trusts', title: 'Trusts', level: 'advanced', after: ['dc-replication'] },
      { slug: 'tiering', title: 'Tiering', level: 'advanced', after: ['ad-trusts'] },
      { slug: 'attack-path-graph', title: 'The attack-path graph', level: 'advanced', after: ['kerberos', 'tiering'] },
      { slug: 'windows-event-decode', title: 'Windows Event logs', level: 'foundations', canonicalIn: 'detection' },
      { slug: 'ad-hardening', title: 'AD detection and hardening', level: 'advanced', after: ['attack-path-graph'] },
      { slug: 'hybrid-identity', title: 'Hybrid identity: Entra ID', level: 'advanced', after: ['ad-trusts'] },
    ],
  },
]

export const domainBySlug = new Map(domains.map((d) => [d.slug, d]))

export function domainTitle(slug: string): string {
  return domainBySlug.get(slug)?.title ?? slug
}
