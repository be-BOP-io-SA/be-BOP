#!/usr/bin/env node

/**
 * Retro-generate a Z-ticket for a POS session that was never opened.
 *
 * Interactive script: asks for all parameters via prompts, computes daily
 * incomes from orders in the time window, shows a preview, and lets you
 * confirm before writing to the database.
 *
 * Usage:
 *   node scripts/retro-z-ticket.mjs
 */

import mongodb from 'mongodb';
import { execSync } from 'node:child_process';

const { MongoClient, ObjectId } = mongodb;
import * as readline from 'node:readline';

// ─── FRACTION DIGITS (mirrors src/lib/types/Currency.ts) ───────────────────
const FRACTION_DIGITS = {
	BTC: 8, CHF: 2, EUR: 2, USD: 2, ZAR: 2, XOF: 2, XAF: 2,
	CDF: 2, SAT: 0, KES: 2, UGX: 2, GHS: 2, NGN: 2, TZS: 2, MAD: 2, CZK: 2
};

const VALID_CURRENCIES = Object.keys(FRACTION_DIGITS);

// ─── INTERACTIVE PROMPT HELPERS ────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultValue) {
	const suffix = defaultValue !== undefined ? ` [${defaultValue}]` : '';
	return new Promise((resolve) => {
		rl.question(`${question}${suffix}: `, (answer) => {
			resolve(answer.trim() || (defaultValue !== undefined ? String(defaultValue) : ''));
		});
	});
}

async function askRequired(question, validate) {
	while (true) {
		const answer = await ask(question);
		if (!answer) {
			console.log('  This field is required.');
			continue;
		}
		if (validate) {
			const error = validate(answer);
			if (error) {
				console.log(`  ${error}`);
				continue;
			}
		}
		return answer;
	}
}

async function askNumber(question, defaultValue) {
	while (true) {
		const answer = await ask(question, defaultValue);
		const num = parseFloat(answer);
		if (isNaN(num)) {
			console.log('  Please enter a valid number.');
			continue;
		}
		return num;
	}
}

async function askDate(question) {
	while (true) {
		const answer = await askRequired(question);
		const date = new Date(answer);
		if (isNaN(date.getTime())) {
			console.log('  Invalid date. Use format like "2026-02-28T08:00:00" or "2026-02-28 08:00".');
			continue;
		}
		return date;
	}
}

async function askYesNo(question, defaultYes = true) {
	const hint = defaultYes ? 'Y/n' : 'y/N';
	const answer = await ask(`${question} (${hint})`);
	if (!answer) return defaultYes;
	return answer.toLowerCase().startsWith('y');
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
console.log('');
console.log('='.repeat(60));
console.log('  RETRO Z-TICKET GENERATOR');
console.log('='.repeat(60));
console.log('');

// ── Step 1: Database connection ─────────────────────────────────────────
console.log('── Database connection ──');

function getDefaultMongoUrl() {
	if (process.env.MONGODB_URL) return process.env.MONGODB_URL;
	// Try to resolve the mongo container IP from Docker
	try {
		const ip = execSync(
			"docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' be-bop-mongo-1",
			{ encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
		).trim();
		if (ip) {
			console.log(`  Auto-detected MongoDB container IP: ${ip}`);
			return `mongodb://${ip}:27017`;
		}
	} catch {}
	return 'mongodb://127.0.0.1:27017';
}

const mongoUrl = await ask('MongoDB URL', getDefaultMongoUrl());
const dbName   = await ask('Database name', process.env.MONGODB_DB || 'bebop');

console.log(`\nConnecting to ${mongoUrl} / ${dbName}...`);
const client = new MongoClient(mongoUrl, { directConnection: true });

try {
	await client.connect();
	console.log('Connected.\n');
} catch (err) {
	console.error(`Failed to connect: ${err.message}`);
	rl.close();
	process.exit(1);
}

try {
	const db = client.db(dbName);
	const ordersCol      = db.collection('orders');
	const posSessionsCol = db.collection('posSessions');
	const runtimeCfgCol  = db.collection('runtimeConfig');

	// Read brandName & accountingCurrency from runtimeConfig
	const brandNameDoc   = await runtimeCfgCol.findOne({ _id: 'brandName' });
	const acctCurrDoc    = await runtimeCfgCol.findOne({ _id: 'accountingCurrency' });
	const brandName      = brandNameDoc?.data ?? 'My be-BOP';
	const accountingCurrency = acctCurrDoc?.data ?? null;

	// ── Step 2: Define order range ──────────────────────────────────────
	console.log('── Order range ──');
	console.log('  Choose how to define the session range:\n');
	console.log('  1) By order numbers (first & last order of the day)');
	console.log('  2) By timestamps (opening & closing time)\n');

	let mode;
	while (true) {
		mode = await ask('Mode (1 or 2)');
		if (mode === '1' || mode === '2') break;
		console.log('  Please enter 1 or 2.');
	}

	let openedAt, closedAt, orderQuery;

	if (mode === '1') {
		// ── Mode 1: Order numbers ───────────────────────────────────────
		let firstOrderNumber, lastOrderNumber;
		let firstOrder, lastOrder;

		while (true) {
			firstOrderNumber = await askNumber('First order number of the day');
			firstOrder = await ordersCol.findOne({ number: firstOrderNumber });
			if (!firstOrder) {
				console.log(`  Order #${firstOrderNumber} not found in database.`);
				continue;
			}
			console.log(`  Found order #${firstOrderNumber} — created ${firstOrder.createdAt.toLocaleString()}`);
			break;
		}

		while (true) {
			lastOrderNumber = await askNumber('Last order number of the day');
			lastOrder = await ordersCol.findOne({ number: lastOrderNumber });
			if (!lastOrder) {
				console.log(`  Order #${lastOrderNumber} not found in database.`);
				continue;
			}
			if (lastOrder.createdAt <= firstOrder.createdAt) {
				console.log(`  Last order must be after first order (${firstOrder.createdAt.toLocaleString()}).`);
				continue;
			}
			console.log(`  Found order #${lastOrderNumber} — created ${lastOrder.createdAt.toLocaleString()}`);
			break;
		}

		// Use 1 minute before first order as opening, 1 minute after last order as closing
		openedAt = new Date(firstOrder.createdAt.getTime() - 60_000);
		closedAt = new Date(lastOrder.createdAt.getTime() + 60_000);
		orderQuery = { number: { $gte: firstOrderNumber, $lte: lastOrderNumber }, status: 'paid' };

		console.log(`\n  Session window: ${openedAt.toLocaleString()} → ${closedAt.toLocaleString()}`);
		console.log(`  (1 min before order #${firstOrderNumber} → 1 min after order #${lastOrderNumber})\n`);
	} else {
		// ── Mode 2: Timestamps ──────────────────────────────────────────
		openedAt = await askDate('Opening time (e.g. 2026-02-28T08:00:00)');
		while (true) {
			closedAt = await askDate('Closing time (e.g. 2026-02-28T20:00:00)');
			if (closedAt <= openedAt) {
				console.log('  Closing time must be after opening time.');
				continue;
			}
			break;
		}
		orderQuery = { createdAt: { $gte: openedAt, $lte: closedAt }, status: 'paid' };

		console.log(`\n  Session window: ${openedAt.toLocaleString()} → ${closedAt.toLocaleString()}\n`);
	}

	// ── Step 3: Session parameters ──────────────────────────────────────
	console.log('── Session parameters ──');

	const operator = await askRequired('Operator name (who was at the register)');

	const currency = await askRequired(
		`Currency (${VALID_CURRENCIES.join(', ')})`,
		(val) => {
			if (!VALID_CURRENCIES.includes(val.toUpperCase())) {
				return `Unknown currency. Valid: ${VALID_CURRENCIES.join(', ')}`;
			}
			return null;
		}
	).then((c) => c.toUpperCase());

	const cashOpening = await askNumber('Cash amount at opening');
	const cashClosing = await askNumber('Cash amount at closing');

	console.log('');
	console.log('── Outcomes ──');
	const bankDeposit = await askNumber('Bank deposit amount (0 if none)', 0);

	// ── Step 4: Query orders ────────────────────────────────────────────
	console.log('\nSearching for paid orders in range...');

	const orders = await ordersCol.find(orderQuery).toArray();

	const paidPayments = orders.flatMap((o) => o.payments ?? []).filter((p) => p.status === 'paid');

	console.log(`  Found ${orders.length} paid order(s), ${paidPayments.length} paid payment(s).\n`);

	// ── Calculate daily incomes (same logic as pos-sessions.ts) ─────────
	const incomes = new Map();
	paidPayments.forEach((payment) => {
		const accountingPrice =
			payment.currencySnapshot?.accounting?.price ?? payment.currencySnapshot?.main?.price;
		const originalPrice = payment.currencySnapshot?.main?.price;
		if (!accountingPrice || !originalPrice) return;

		const cashbackAmount = payment.cashbackAmount?.amount ?? 0;
		const realAccountingAmount = accountingPrice.amount + cashbackAmount;
		const realOriginalAmount   = originalPrice.amount + cashbackAmount;

		const key = payment.posSubtype
			? `${payment.method} / ${payment.posSubtype}`
			: payment.method;

		const existing = incomes.get(key);
		if (existing) {
			existing.amount += realAccountingAmount;
			if (
				existing.originalCurrency &&
				existing.originalCurrency === originalPrice.currency &&
				originalPrice.currency !== accountingPrice.currency
			) {
				existing.originalAmount = (existing.originalAmount ?? 0) + realOriginalAmount;
			}
		} else {
			incomes.set(key, {
				paymentMethod: payment.method,
				...(payment.posSubtype && { paymentSubtype: payment.posSubtype }),
				amount: realAccountingAmount,
				currency: accountingPrice.currency,
				...(originalPrice.currency !== accountingPrice.currency && {
					originalAmount: realOriginalAmount,
					originalCurrency: originalPrice.currency
				})
			});
		}
	});

	const dailyIncomes = Array.from(incomes.values());

	// ── Calculate cashback total (non-cash POS payments) ────────────────
	const cashbackTotal = paidPayments
		.filter((p) => p.cashbackAmount && p.posSubtype !== 'cash')
		.reduce((sum, p) => sum + (p.cashbackAmount?.amount ?? 0), 0);

	// ── Build outcomes ──────────────────────────────────────────────────
	const allOutcomes = [];
	if (bankDeposit > 0) {
		allOutcomes.push({ category: 'bank-deposit', amount: bankDeposit, currency });
	}
	if (cashbackTotal > 0) {
		allOutcomes.push({ category: 'Cashback to customer', amount: cashbackTotal, currency });
	}

	// ── Compute theoretical cash & delta ────────────────────────────────
	const cashIncome = dailyIncomes
		.filter((inc) => inc.paymentSubtype === 'cash')
		.reduce((sum, inc) => sum + inc.amount, 0);
	const totalOutcomes = allOutcomes.reduce((sum, o) => sum + o.amount, 0);

	const cashClosingTheoretical = { amount: cashOpening + cashIncome - totalOutcomes, currency };
	const cashDelta = { amount: cashClosing - cashClosingTheoretical.amount, currency };

	// ── Ask for justification if there's a delta ────────────────────────
	let cashDeltaJustification = '';
	if (Math.abs(cashDelta.amount) > 0.01) {
		console.log(`  Cash delta detected: ${cashDelta.amount >= 0 ? '+' : ''}${cashDelta.amount.toFixed(2)} ${currency}`);
		cashDeltaJustification = await ask('Cash delta justification (optional)') || '';
	}

	// ── Generate Z-ticket text (mirrors generateZTicketText) ────────────
	const ticketCurrency = accountingCurrency ?? dailyIncomes[0]?.currency ?? currency;
	const totalIncome  = dailyIncomes.reduce((sum, inc) => sum + inc.amount, 0);
	const totalOutcome = allOutcomes.reduce((sum, out) => sum + out.amount, 0);
	const cashOutcomes = totalOutcome;

	const fd = (amount, cur) => amount.toFixed(FRACTION_DIGITS[cur] ?? 2);

	const incomeLines = dailyIncomes.map((inc) => {
		const methodDisplay = inc.paymentSubtype
			? `${inc.paymentMethod} / ${inc.paymentSubtype}`
			: inc.paymentMethod;
		if (inc.originalAmount && inc.originalCurrency) {
			return `  - ${methodDisplay} : ${fd(inc.originalAmount, inc.originalCurrency)} ${inc.originalCurrency} (${fd(inc.amount, ticketCurrency)} ${ticketCurrency})`;
		}
		return `  - ${methodDisplay} : ${fd(inc.amount, ticketCurrency)} ${ticketCurrency}`;
	}).join('\n');

	const outcomeLines = allOutcomes
		.map((out) => `  - ${out.category} : ${fd(out.amount, ticketCurrency)} ${ticketCurrency}`)
		.join('\n');

	const zTicketText = `${brandName} Z ticket
Opening time : ${openedAt.toLocaleString()} by ${operator}
Closing time : ${closedAt.toLocaleString()} by ${operator}${
		Math.abs(cashDelta.amount) > 0.01 ? '\nDaily Z includes cash balance error' : ''
	}

Daily incomes :
${incomeLines || '  (none)'}
Daily incomes total :
  - ${fd(totalIncome, ticketCurrency)} ${ticketCurrency}

Daily outcomes :
${outcomeLines || '  (none)'}
Daily outcomes total :
  - ${fd(totalOutcome, ticketCurrency)} ${ticketCurrency}

Daily delta : ${totalIncome - totalOutcome >= 0 ? '+' : ''}${fd(totalIncome - totalOutcome, ticketCurrency)} ${ticketCurrency}

Cash balance :
  - Initial cash at opening : ${fd(cashOpening, currency)} ${currency}
  - Daily cash incomes : ${fd(cashIncome, ticketCurrency)} ${ticketCurrency}
  - Daily cash outcomes : ${fd(cashOutcomes, ticketCurrency)} ${ticketCurrency}
  - Remaining cash at daily closing : ${fd(cashClosing, currency)} ${currency}
  - Theorical remaining cash at daily closing : ${fd(cashClosingTheoretical.amount, currency)} ${currency}${
		Math.abs(cashDelta.amount) > 0.01
			? `\nCash delta : ${cashDelta.amount >= 0 ? '+' : ''}${fd(cashDelta.amount, currency)} ${currency}`
			: ''
	}${cashDeltaJustification ? `\n  - Motive : ${cashDeltaJustification}` : ''}`;

	// ── Step 4: Preview & confirm ───────────────────────────────────────
	console.log('\n' + '='.repeat(60));
	console.log('  Z-TICKET PREVIEW');
	console.log('='.repeat(60) + '\n');
	console.log(zTicketText);
	console.log('\n' + '='.repeat(60));

	const confirm = await askYesNo('\nWrite this session to the database?', false);

	if (!confirm) {
		console.log('\nAborted. Nothing was written to the database.');
	} else {
		// ── Build & insert session ──────────────────────────────────────
		const sessionUser = {
			userId: new ObjectId(),
			userLogin: operator,
			userAlias: operator
		};

		const session = {
			_id: new ObjectId(),
			status: 'closed',
			openedAt,
			openedBy: sessionUser,
			closedAt,
			closedBy: sessionUser,
			cashOpening: { amount: cashOpening, currency },
			cashClosing: { amount: cashClosing, currency },
			cashClosingTheoretical,
			cashDelta,
			...(cashDeltaJustification && { cashDeltaJustification }),
			dailyIncomes,
			dailyOutcomes: allOutcomes,
			xTickets: [],
			createdAt: new Date(),
			updatedAt: new Date()
		};

		await posSessionsCol.insertOne(session);
		console.log(`\nSession inserted with _id: ${session._id}`);
		console.log('The session is now visible in POS > History in the admin panel.');
	}
} catch (err) {
	console.error('Error:', err);
	process.exit(1);
} finally {
	rl.close();
	await client.close();
}
