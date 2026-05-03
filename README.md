# NetTrace CLI

Professional DNS propagation, email validation, security audits & blacklist monitoring CLI.

## Installation

```bash
npm install -g @quantix-foundation/nettrace-cli
```

## Quick Start

```bash
nettrace --help
```

## Commands

### DNS Propagation Check
```bash
nettrace dns example.com          # A record
nettrace dns google.com MX        # MX records
nettrace dns example.com TXT      # TXT records
```

**Supported:** `A`, `AAAA`, `MX`, `NS`, `TXT`, `CNAME`, `SOA`, `PTR`, `SRV`, `CAA`, `DS`, `DNSKEY`

### Email Validation
```bash
nettrace email example.com                # Default DKIM selector
nettrace email example.com --dkim google  # Custom DKIM selector
```

### Security Audit
```bash
nettrace security example.com           # Full audit
nettrace security subdomain.com --dkim s1  # With DKIM selector
```

### Blacklist Check
```bash
nettrace spam 8.8.8.8 --mode ip          # IP blacklist
nettrace spam example.com --mode domain  # Domain blacklist
nettrace spam mail.example.com --mode auto  # Auto detect
```

## Output

Clean colored JSON output:

```bash
nettrace dns google.com MX | jq .
```

## Features

- 30+ global DNS resolvers
- SPF/DMARC/DKIM/MX validation
- SSL certificates, DNSSEC, CAA
- 100+ DNSBL/RBL blacklists
- JSON parsing ready
- Colored terminal output

## Resources

| | Link |
|---|---|
| Dashboard | [nettrace.cloud](https://nettrace.cloud) |
| Docs | [nettrace.cloud/docs](https://nettrace.cloud/docs) |
| Pricing | [nettrace.cloud/pricing](https://nettrace.cloud/pricing) |
| Status | [status.quantixfoundation.com](https://status.quantixfoundation.com) |

## Publisher

**Quantix Foundation**  
[quantixfoundation.com](https://quantixfoundation.com)  
[hello@quantixfoundation.com](mailto:hello@quantixfoundation.com)

© Quantix Foundation. MIT License.
