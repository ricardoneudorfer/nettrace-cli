# NetTrace CLI

Professional DNS propagation, email validation, security audits & blacklist monitoring CLI.

## Installation

```bash
npm install -g @nettrace/cli
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
| Status | [uptime.softwarebyricardo.xyz](https://uptime.softwarebyricardo.xyz) |

## Publisher

**Software By Ricardo**  
[softwarebyricardo.xyz](https://softwarebyricardo.xyz)  
[hello@softwarebyricardo.xyz](mailto:hello@softwarebyricardo.xyz)

© Software By Ricardo. MIT License.