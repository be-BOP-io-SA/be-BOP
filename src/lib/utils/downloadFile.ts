export function downloadFile(blob: Blob, filename = 'download.txt'): void {
	const link = document.createElement('a');

	link.href = window.URL.createObjectURL(blob);
	link.download = filename;

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
