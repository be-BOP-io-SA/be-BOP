const SWIPE_THRESHOLD = 50;

type SwipeParams = {
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
	enabled?: boolean;
};

export function swipe(node: HTMLElement, params: SwipeParams) {
	let touchStartX = 0;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (params.enabled === false) {
			return;
		}

		const touchEndX = e.changedTouches[0].clientX;
		const diff = touchEndX - touchStartX;

		if (Math.abs(diff) > SWIPE_THRESHOLD) {
			if (diff > 0) {
				params.onSwipeRight?.();
			} else {
				params.onSwipeLeft?.();
			}
		}
	}

	node.addEventListener('touchstart', handleTouchStart);
	node.addEventListener('touchend', handleTouchEnd);

	return {
		update(newParams: SwipeParams) {
			params = newParams;
		},
		destroy() {
			node.removeEventListener('touchstart', handleTouchStart);
			node.removeEventListener('touchend', handleTouchEnd);
		}
	};
}
