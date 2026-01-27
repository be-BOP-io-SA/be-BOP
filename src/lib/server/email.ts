import { createTestAccount, createTransport, type Transporter } from 'nodemailer';
import { ORIGIN } from '$lib/server/env-config';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { htmlToText } from 'html-to-text';
import { defaultConfig, runtimeConfig, type EmailTemplateKey } from './runtime-config';
import { collections } from './database';
import { ClientSession, ObjectId } from 'mongodb';
import { mapKeys } from '$lib/utils/mapKeys';

export function isEmailConfigured() {
	return (
		(runtimeConfig.smtp.host &&
			runtimeConfig.smtp.port &&
			runtimeConfig.smtp.user &&
			runtimeConfig.smtp.password) ||
		runtimeConfig.smtp.fake
	);
}

let _transporter: Transporter<SMTPTransport.SentMessageInfo> | null;

export async function resetTransporter() {
	_transporter = null;
	await getTransporter();
}

async function getTransporter() {
	if (_transporter) {
		return _transporter;
	}

	if (runtimeConfig.smtp.fake) {
		const testAccount = await createTestAccount();

		_transporter = createTransport({
			host: 'smtp.ethereal.email',
			port: 587,
			secure: false,
			auth: {
				user: testAccount.user,
				pass: testAccount.pass
			}
		});
	} else {
		_transporter = createTransport({
			host: runtimeConfig.smtp.host,
			port: runtimeConfig.smtp.port,
			secure: runtimeConfig.smtp.port === 465,
			auth: {
				user: runtimeConfig.smtp.user,
				pass: runtimeConfig.smtp.password
			}
		});
	}

	return _transporter;
}

/**
 * Do not call this function directly, instead call queueEmail.
 */
export async function sendEmail(params: {
	to: string;
	subject: string;
	html: string;
	bcc?: string;
}) {
	const transporter = await getTransporter();

	const res = await transporter.sendMail({
		from: runtimeConfig.smtp.from || runtimeConfig.smtp.user,
		to: params.to,
		subject: params.subject,
		html: params.html,
		text: htmlToText(params.html),
		...(!!runtimeConfig.sellerIdentity?.contact.email && {
			replyTo: runtimeConfig.sellerIdentity?.contact.email
		}),
		...(params.bcc && {
			bcc: params.bcc
		})
	});

	console.log(`✅ Email sent [${params.subject}] → ${params.to}`, res);
}

export async function queueEmail(
	to: string,
	templateKey: EmailTemplateKey,
	vars: Record<string, string | undefined>,
	opts?: {
		session?: ClientSession;
		bcc?: string;
	}
): Promise<void> {
	console.log(`📧 Queueing email: ${templateKey} → ${to}`);

	const lowerVars = mapKeys(
		{
			...vars,
			websiteLink: ORIGIN,
			brandName: runtimeConfig.brandName,
			iban: runtimeConfig.sellerIdentity?.bank?.iban,
			bic: runtimeConfig.sellerIdentity?.bank?.bic
		},
		(key) => key.toLowerCase()
	);
	const template = runtimeConfig.emailTemplates[templateKey].default
		? defaultConfig.emailTemplates[templateKey]
		: runtimeConfig.emailTemplates[templateKey];

	await collections.emailNotifications.insertOne(
		{
			_id: new ObjectId(),
			createdAt: new Date(),
			updatedAt: new Date(),
			dest: to,
			...(opts &&
				opts.bcc && {
					bcc: opts.bcc
				}),
			subject: template.subject.replace(/{{([^}]+)}}/g, (match, p1) => {
				return lowerVars[p1.toLowerCase()] || match;
			}),
			htmlContent: template.html.replace(/{{([^}]+)}}/g, (match, p1) => {
				return lowerVars[p1.toLowerCase()] || match;
			})
		},
		{
			session: opts?.session
		}
	);
}
