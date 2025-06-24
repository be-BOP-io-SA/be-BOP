export interface ParsedNostrMessage {
	command: string;
	options: Record<string, string | string[]>;
	variadicArg: string;
	errors: string[];
}

export function parseNostrMessage(messageContent: string): ParsedNostrMessage {
	const trimmedContent = messageContent.trim();
	const errors: string[] = [];

	let command = '';
	const options: Record<string, string | string[]> = {};
	let variadicArg = '';

	const commandMatch = trimmedContent.match(/^!([a-zA-Z0-9_-]+)(.*)/s);
	if (commandMatch) {
		command = `!${commandMatch[1].toLowerCase()}`;
		let remaining = commandMatch[2].trim();

		const optionRegex = /^\s*([a-zA-Z]):([^:]+)/;
		let matchFound = true;

		while (remaining.length > 0 && matchFound) {
			matchFound = false;
			const currentOptionMatch = remaining.match(optionRegex);

			if (currentOptionMatch) {
				const fullMatch = currentOptionMatch[0];
				const optKey = currentOptionMatch[1].toLowerCase();
				const optValue = currentOptionMatch[2].trim();

				const nextCharIndex = fullMatch.length;
				if (remaining[nextCharIndex] === undefined || /\s/.test(remaining[nextCharIndex])) {
					if (options[optKey]) {
						if (Array.isArray(options[optKey])) {
							(options[optKey] as string[]).push(optValue);
						} else {
							options[optKey] = [options[optKey] as string, optValue];
						}
					} else {
						if (['t'].includes(optKey)) {
							options[optKey] = [optValue];
						} else {
							options[optKey] = optValue;
						}
					}
					remaining = remaining.substring(fullMatch.length).trim();
					matchFound = true;
				} else {
					break;
				}
			} else {
				break;
			}
		}
		variadicArg = remaining;
	} else {
		errors.push('Message does not start with a recognized command (e.g., "!command").');
	}

	return {
		command,
		options,
		variadicArg,
		errors
	};
}
