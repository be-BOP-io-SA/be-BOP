let processClosed = false;
process.on('SIGINT', () => {
	processClosed = true;
});
// adapter-node handles SIGTERM without exiting, so the shop would hang until the supervisor kills it.
process.on('SIGTERM', () => process.exit(0));
export { processClosed };
