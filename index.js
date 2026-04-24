#!/usr/bin/env node

const { Command } = require('commander');
const axios = require('axios');
const FormData = require('form-data');
const chalk = require('chalk');
const readline = require('readline');

const program = new Command()
  .name('nettrace')
  .description('NetTrace CLI')
  .version('1.0.5')

const API_BASE = 'https://api.nettrace.cloud/v1.0';
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const W = 74;

function printSpinner(label = 'Fetching') {
  let i = 0;
  process.stdout.write('\n');
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${chalk.yellow(SPINNER_FRAMES[i++ % SPINNER_FRAMES.length])}  ${chalk.yellow(label + '...')}`);
  }, 80);
  return interval;
}

function stopSpinner(interval) {
  clearInterval(interval);
  process.stdout.write('\r' + ' '.repeat(W) + '\r');
}

function stripAnsi(str) {
  return str.replace(/\u001b\[[0-9;]*[mGKHF]/g, '');
}

function box(lines, title = '') {
  const titleStr = title ? '─ ' + chalk.bold.white(title) + ' ' : '';
  const titleLen = title ? stripAnsi(title).length + 4 : 0;
  const top     = chalk.gray('┌' + titleStr + '─'.repeat(Math.max(0, W - 2 - titleLen)) + '┐');
  const bottom  = chalk.gray('└' + '─'.repeat(W - 2) + '┘');
  const divider = chalk.gray('├' + '─'.repeat(W - 2) + '┤');
  console.log(top);
  for (const line of lines) {
    if (line === '---') { console.log(divider); continue; }
    const vis     = stripAnsi(line).length;
    const padding = Math.max(0, W - 4 - vis);
    console.log(chalk.gray('│') + ' ' + line + ' '.repeat(padding) + ' ' + chalk.gray('│'));
  }
  console.log(bottom);
}

function col(str, width, colorFn = s => s) {
  const plain = String(str).slice(0, width).padEnd(width);
  return colorFn(plain);
}

function printHeader(title) {
  console.log('\n' + chalk.bold.cyan('  🌐 ' + title));
}

function printError(err, command) {
  const lines = [
    chalk.red.bold('💥  ' + (err.response?.status ? `HTTP ${err.response.status}` : err.code || 'Error')),
    chalk.red(err.message || err.response?.statusText || 'Unknown error'),
  ];
  if (command === 'dns')  lines.push(chalk.gray('Hint: check domain name or record type'));
  if (command === 'spam') lines.push(chalk.gray('Hint: --mode auto|ip|domain is required'));
  console.log('');
  box(lines, 'ERROR');
  process.exit(1);
}

function buildBar(pct, len) {
  const fill  = Math.round((pct / 100) * len);
  const color = pct >= 80 ? chalk.green : pct >= 50 ? chalk.yellow : chalk.red;
  return color('█'.repeat(fill)) + chalk.gray('░'.repeat(len - fill));
}

function tick(val) { return val ? chalk.green('✔') : chalk.red('✘'); }
function yn(val)   { return val ? chalk.green('Yes') : chalk.red('No'); }

function wrapText(str, maxWidth, indent = '') {
  const words = str.split(' ');
  const result = [];
  let line = indent;
  for (const word of words) {
    if (line.length + word.length + 1 > maxWidth && line.trim()) {
      result.push(line.trimEnd());
      line = indent + word + ' ';
    } else {
      line += word + ' ';
    }
  }
  if (line.trim()) result.push(line.trimEnd());
  return result;
}

function paginate(items, renderItem, command) {
  const PAGE_SIZE = 10;
  let page = 0;
  const total = items.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function renderPage() {
    console.clear();
    const slice = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const lines = [];
    lines.push(chalk.bold(`Page ${page + 1} / ${totalPages}`) + chalk.gray(`  —  ${total} total`));
    lines.push('---');
    slice.forEach((result, i) => renderItem(result, page * PAGE_SIZE + i, lines));
    lines.push('---');
    const nav = [];
    if (page > 0)              nav.push(chalk.cyan('[P] Prev'));
    if (page < totalPages - 1) nav.push(chalk.cyan('[N] Next'));
    nav.push(chalk.gray('[Q] Quit'));
    lines.push(nav.join('   '));
    box(lines, command.toUpperCase() + ' RESULTS');
  }

  renderPage();
  if (totalPages <= 1) return;

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on('keypress', (str, key) => {
    if (!key) return;
    const k = key.name?.toLowerCase();
    if ((k === 'n' || k === 'right') && page < totalPages - 1) { page++; renderPage(); }
    if ((k === 'p' || k === 'left')  && page > 0)              { page--; renderPage(); }
    if (k === 'q' || k === 'escape' || (key.ctrl && k === 'c')) {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      console.log('');
      process.exit(0);
    }
  });
}

function printDnsResults(data) {
  const renderItem = (r, _i, lines) => {
    const icon     = r.resolved ? chalk.green('✔') : chalk.red('✘');
    const loc      = col(r.location || 'Unknown', 30, s => chalk.white(s));
    const prov     = col(r.provider || '',        22, s => chalk.gray(s));
    const resolver = col(r.ip       || '',        15, s => chalk.gray(s));
    lines.push(`${icon}  ${loc}  ${prov}  ${resolver}`);
    if (r.dns_results?.length) {
      r.dns_results.forEach(d => {
        const resolvedIp = d.ip || d.value || d.target || '';
        if (resolvedIp) lines.push(chalk.gray(`     → ${d.type}  `) + chalk.cyan(resolvedIp));
      });
    }
  };

  if (data.length <= 10) {
    const ok = data.filter(r => r.resolved).length;
    const lines = [
      chalk.green.bold(`${ok}`) + chalk.gray(` / ${data.length} resolvers OK`),
      '---',
      col('LOCATION', 30, s => chalk.gray.bold(s)) + '  ' + col('PROVIDER', 22, s => chalk.gray.bold(s)) + '  ' + chalk.gray.bold('RESOLVER IP'),
      '---',
    ];
    data.forEach(r => renderItem(r, null, lines));
    box(lines, 'DNS RESULTS');
  } else {
    paginate(data, renderItem, 'dns');
  }
}

function printEmailResults(data) {
  const L = 16;
  const row = (label, value) => col(label, L, s => chalk.gray(s)) + '  ' + value;

  const lines = [
    chalk.bold('Status'),
    '---',
    row('Deliverable',   `${yn(data.deliverable)}  ${tick(data.deliverable)}`),
    row('MX Valid',      `${yn(data.mxValid)}  ${tick(data.mxValid)}`),
    row('Disposable',    data.disposable ? chalk.red('Yes  ✘') : chalk.green('No   ✔')),
    '---',
    chalk.bold('Mail Servers'),
    '---',
    row('MX',            chalk.white((data.mx  || 'n/a'))),
    row('PTR',           chalk.white((data.ptr || 'n/a'))),
    '---',
    chalk.bold('Authentication'),
    '---',
    row('SPF',           chalk.white((data.spf   || 'n/a'))),
    row('DMARC',         chalk.white((data.dmarc || 'n/a'))),
    row('DKIM',          chalk.white((data.dkim  || 'n/a'))),
    '---',
    chalk.bold('Other'),
    '---',
    row('BIMI',          chalk.white((data.bimi               || 'n/a'))),
    row('Google',        chalk.gray ((data.google_verification || 'n/a'))),
  ];

  box(lines, 'EMAIL RESULTS');
}

function printSecurityResults(data) {
  const score = data.percentage || 0;
  const d     = data.details    || {};
  const L     = 12;
  const row   = (label, value) => col(label, L, s => chalk.gray(s)) + '  ' + value;

  const lines = [
    chalk.bold('Score: ') + chalk.bold.white(`${score}%`) + '  ' + chalk.gray(`(${data.level || ''})`),
    buildBar(score, W - 6),
    '---',
    chalk.bold('Records'),
    '---',
  ];

  if (d.SPF) {
    lines.push(row('SPF', chalk.green('✔  ' + (d.SPF.mode || ''))));
    lines.push(row('', chalk.gray(d.SPF.value || '')));
  } else {
    lines.push(row('SPF', chalk.red('✘  Not found')));
  }

  if (d.DMARC) {
    lines.push(row('DMARC', chalk.green(`✔  policy=${d.DMARC.policy}  subdomain=${d.DMARC.subdomain_policy}`)));
    lines.push(row('', chalk.gray(`rua: ${d.DMARC.rua || 'n/a'}`)));
  } else {
    lines.push(row('DMARC', chalk.red('✘  Not found')));
  }

  if (d.DKIM?.status === 'found') {
    lines.push(row('DKIM', chalk.green(`✔  selector: ${d.DKIM.selector_used}`)));
  } else {
    lines.push(row('DKIM', chalk.red('✘  Not found')));
  }

  if (d.BIMI) {
    lines.push(row('BIMI', chalk.green('✔  ' + (d.BIMI.value || ''))));
  } else {
    lines.push(row('BIMI', chalk.gray('—  Not configured')));
  }

  if (d.MX?.records?.length) {
    const targets = d.MX.records.map(r => r.target).join(', ');
    lines.push(row('MX', chalk.green('✔  ' + targets)));
  }

  if (d.DNSSEC) {
    lines.push(row('DNSSEC', chalk.green(`✔  ${d.DNSSEC.status}`)));
  } else {
    lines.push(row('DNSSEC', chalk.red('✘  Disabled')));
  }

  lines.push(row('HSTS',    d.HSTS    ? chalk.green('✔  Enabled')       : chalk.yellow('⚠  Not enabled')));
  lines.push(row('CAA',     d.CAA     ? chalk.green('✔  Found')         : chalk.yellow('⚠  Not configured')));
  lines.push(row('MTA-STS', d.MTA_STS ? chalk.green('✔  Configured')    : chalk.yellow('⚠  Not configured')));
  lines.push(row('TLS-RPT', d.TLS_RPT ? chalk.green('✔  ' + (d.TLS_RPT.value || 'Present')) : chalk.gray('—  Not found')));

  if (d.SSL) {
    lines.push('---');
    lines.push(chalk.bold('SSL Certificate'));
    lines.push('---');
    lines.push(row('Issuer',   chalk.white(d.SSL.issuer || 'n/a')));
    lines.push(row('Expires',  chalk.white(`in ${Math.floor(d.SSL.expiry_days)} days  (${d.SSL.validTo})`)));
    lines.push(row('Domains',  chalk.white((d.SSL.altnames || []).join(', '))));
    lines.push(row('Key',      chalk.white(d.SSL.extensions?.keyUsage || 'n/a')));
    lines.push(row('Sig',      chalk.white(d.SSL.signatureTypeLN || 'n/a')));
  }

  if (data.warnings?.length) {
    lines.push('---');
    lines.push(chalk.yellow.bold('Warnings'));
    lines.push('---');
    data.warnings.forEach(w => lines.push(chalk.yellow('⚠  ' + w)));
  }

  if (data.issues?.length) {
    lines.push('---');
    lines.push(chalk.red.bold('Issues'));
    lines.push('---');
    data.issues.forEach(iss => lines.push(chalk.red('🚨 ' + iss)));
  }

  if (data.improvements?.length) {
    lines.push('---');
    lines.push(chalk.cyan.bold('Improvements'));
    lines.push('---');
    data.improvements.forEach(imp => {
      const wrapped = wrapText(imp, W - 8, '    ');
      wrapped.forEach((line, i) => lines.push(chalk.gray((i === 0 ? '  • ' : '    ') + line.trim())));
    });
  }

  box(lines, 'SECURITY RESULTS');
}

function printSpamResults(data) {
  const listed = data.listed_count || 0;
  const total  = data.total_lists  || 0;
  const ratio  = total ? listed / total : 0;
  const scoreColor = ratio > 0.1 ? chalk.red : ratio > 0 ? chalk.yellow : chalk.green;

  const lines = [
    scoreColor.bold(`${listed} / ${total} blacklists`),
    chalk.gray(`Type: ${data.type || 'n/a'}`) + '   ' + chalk.gray(`Target: ${data.checked_value || data.domain || data.ip || ''}`),
    chalk.gray(`Domain: ${data.domain || 'n/a'}`) + '   ' + chalk.gray(`IP: ${data.ip || 'n/a'}`),
  ];

  if (data.results?.length) {
    const listedOnes = data.results.filter(r => r.listed);
    const cleanOnes  = data.results.filter(r => !r.listed);

    if (listedOnes.length) {
      lines.push('---');
      lines.push(chalk.red.bold(`Listed on ${listedOnes.length} blacklist(s):`));
      listedOnes.forEach(r => {
        lines.push(chalk.red(`  ✘  ${r.name}`) + chalk.gray(`  (${r.host})`));
        if (r.response) lines.push(chalk.gray(`       Response: ${r.response}`));
        if (r.reason) {
          const wrapped = wrapText(r.reason, W - 12, '       ');
          wrapped.forEach(l => lines.push(chalk.gray(l)));
        }
        if (r.list_url) lines.push(chalk.gray(`       ${r.list_url}`));
      });
    }

    if (cleanOnes.length) {
      lines.push('---');
      lines.push(chalk.green.bold(`Clean on ${cleanOnes.length} blacklist(s):`));
      cleanOnes.forEach(r => {
        lines.push(chalk.green(`  ✔  ${r.name}`) + chalk.gray(`  (${r.host})`));
      });
    }
  }

  box(lines, 'SPAM RESULTS');
}

function printPrettyResults(data, command) {
  if      (command === 'dns'      && Array.isArray(data)) printDnsResults(data);
  else if (command === 'email'    && data)                printEmailResults(data);
  else if (command === 'security' && data)                printSecurityResults(data);
  else if (command === 'spam'     && data)                printSpamResults(data);
  else console.log(JSON.stringify(data, null, 2));
}

async function apiPost(endpoint, params) {
  const form = new FormData();
  Object.entries(params).forEach(([k, v]) => form.append(k, v));
  const res = await axios.post(endpoint, form, { headers: form.getHeaders(), timeout: 30000 });
  return res.data;
}

program.command('dns <domain>')
  .argument('[type]', 'Record type: A, MX, TXT, etc. (default: A)')
  .action(async (domain, type = 'A') => {
    printHeader(`DNS  ${domain}  ${type}`);
    const spinner = printSpinner();
    try {
      const data = await apiPost(`${API_BASE}/dns-check`, { domain, recordType: type });
      stopSpinner(spinner);
      printPrettyResults(data, 'dns');
    } catch (err) { stopSpinner(spinner); printError(err, 'dns'); }
});

program.command('email <domain>')
  .option('--dkim <selector>')
  .action(async (domain, cmd) => {
    printHeader(`Email  ${domain}`);
    const spinner = printSpinner();
    try {
      const data = await apiPost(`${API_BASE}/email-check`, { domain, dkimSelector: cmd.dkim || 'default' });
      stopSpinner(spinner);
      printPrettyResults(data, 'email');
    } catch (err) { stopSpinner(spinner); printError(err, 'email'); }
});

program.command('security <domain>')
  .option('--dkim <selector>')
  .action(async (domain, cmd) => {
    printHeader(`Security  ${domain}`);
    const spinner = printSpinner();
    try {
      const params = { domain };
      if (cmd.dkim) params.dkim_selector = cmd.dkim;
      const data = await apiPost(`${API_BASE}/security-check`, params);
      stopSpinner(spinner);
      printPrettyResults(data, 'security');
    } catch (err) { stopSpinner(spinner); printError(err, 'security'); }
});

program.command('spam <target>')
  .requiredOption('--mode <mode>')
  .action(async (target, cmd) => {
    printHeader(`Spam  ${target}`);
    const spinner = printSpinner();
    try {
      const data = await apiPost(`${API_BASE}/spam-check`, { target, mode: cmd.mode });
      stopSpinner(spinner);
      printPrettyResults(data, 'spam');
    } catch (err) { stopSpinner(spinner); printError(err, 'spam'); }
});

program.parse();