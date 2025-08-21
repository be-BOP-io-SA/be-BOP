# Makefile for bebop-wizard Debian package

PACKAGE_NAME = bebop-wizard
VERSION = $(shell dpkg-parsechangelog -S Version | cut -d'-' -f1)
ARCHITECTURE = all
DEB_FILE = $(PACKAGE_NAME)_$(VERSION)-1_$(ARCHITECTURE).deb

# Default target
all: build

# Check if required tools are available
check-deps:
	@echo "Checking for required build dependencies..."
	@command -v dpkg-buildpackage >/dev/null 2>&1 || { echo "Error: dpkg-buildpackage not found. Install devscripts package."; exit 1; }
	@command -v dh >/dev/null 2>&1 || { echo "Error: dh not found. Install debhelper package."; exit 1; }
	@echo "All build dependencies are available."

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	dh_clean
	rm -rf debian/bebop-wizard/
	rm -rf debian/.debhelper/
	rm -rf debian/files
	rm -rf debian/debhelper-build-stamp
	rm -f ../$(PACKAGE_NAME)_*
	@echo "Clean completed."

# Prepare the build environment
prepare: check-deps
	@echo "Preparing build environment..."
	@echo "Preparation completed."

# Build the package
build: prepare
	@echo "Building $(PACKAGE_NAME) package..."
	dpkg-buildpackage -us -uc -b
	@echo "Package built successfully: ../$(DEB_FILE)"

# Install the built package
install: build
	@echo "Installing $(PACKAGE_NAME) package..."
	sudo apt reinstall ../$(DEB_FILE)
	@echo "Package installed successfully."

# Show package information
info:
	@echo "Package: $(PACKAGE_NAME)"
	@echo "Version: $(VERSION)"
	@echo "Architecture: $(ARCHITECTURE)"
	@echo "DEB file: $(DEB_FILE)"

# Lint the package
lint: prepare
	@echo "Linting package..."
	lintian --info --display-info --display-experimental --pedantic

# Test build without actually building
test-build: prepare
	@echo "Testing build configuration..."
	dpkg-buildpackage -T clean
	dpkg-buildpackage -T build
	@echo "Build test completed."

# Quick build for development (skip some checks)
dev-build: prepare
	@echo "Building development package (fast mode)..."
	dpkg-buildpackage -us -uc -b --no-check-builddeps
	@echo "Development package built."

.PHONY: all build dev-build clean install lint test-build check-deps prepare info
