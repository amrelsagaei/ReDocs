<h1>ReDocs</h1>
<strong>Transform your API documentation into interactive Caido replay sessions in seconds!</strong>

---

<details closed>
<summary><b>Table of Contents</b></summary>
<br>

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Feedback & Issues](#feedback--issues)
- [License](#license)
</details>

## Overview

ReDocs is a powerful Caido plugin that bridges the gap between API documentation and security testing by automatically converting Postman Collections and OpenAPI specifications into ready-to-use replay sessions. Built specifically for penetration testers and security researchers, ReDocs integrates seamlessly with Caido's workflow to enhance your security testing capabilities.

Transform your API docs into actionable security tests - because great security starts with great tooling!

## Features

<details>
<summary><b>Smart Import Engine</b></summary>
<br>

- **Drag & Drop Import:** One-click import for Postman Collections, OpenAPI specs, and Postman Environment files
- **Auto-Detection:** Intelligent file format recognition with confidence scoring
- **Format Support:** Postman Collection v2.1, OpenAPI 3.x specifications, and Postman Environment files (JSON only)
- **Error Handling:** Comprehensive validation with detailed error messages
</details>

<details>
<summary><b>Authentication Management</b></summary>
<br>

- **Auto-Detection:** Automatic detection of API authentication methods
- **Smart Replacement:** Intelligently replaces conflicting authentication headers
- **Bearer Token:** JWT tokens and API keys in Authorization header
- **Basic Auth:** Username/password combinations with base64 encoding
- **API Key:** Custom headers like X-API-Key, Authorization
- **Custom Headers:** Any custom authentication scheme support
- **Hostname Override:** Configure custom hostnames for different environments
</details>

<details>
<summary><b>Environment Variables</b></summary>
<br>

- **Environment Import:** Import Postman Environment files with all variables and secrets
- **Auto-Detection:** Automatically detect sensitive variables (tokens, keys, passwords) and mark as secrets
- **Variable Management:** Create new Caido environments with imported variables ready for use
- **Collision Handling:** Smart naming prevents overwrites (Dev, Dev-1, Dev-2, etc.)
- **Secret Detection:** Intelligent detection of sensitive data based on variable names and patterns
- **Bulk Import:** Import multiple environment files without conflicts
</details>

<details>
<summary><b>Session Organization</b></summary>
<br>

- **Intelligent Naming:** Sessions named as METHOD /endpoint for easy navigation
- **Collection Management:** Dedicated collections for each imported API with auto-incremental naming
- **Duplicate Handling:** Automatically creates Collection1, Collection2, etc. for repeat imports
- **Bulk Operations:** Process hundreds of endpoints simultaneously
- **Path Preservation:** Full path parameters and query strings maintained
</details>

<details>
<summary><b>Professional Integration</b></summary>
<br>

- **Caido Native:** Seamless integration with Caido's Replay functionality
- **Modern UI:** Beautiful interface matching Caido's theme with dark mode
- **Progress Tracking:** Real-time feedback with processing indicators
- **Zero Configuration:** Works out-of-the-box with sensible defaults
</details>

## Installation

### Via Caido's Plugin Store (Recommended)

1. Open Caido
2. Navigate to **Settings > Plugins** 
3. Click the **Plugin Store** tab
4. Search for "ReDocs"
5. Click **Install**

### Manual Installation

1. Download the latest `plugin_package.zip` from the [Releases](https://github.com/amrelsagaei/redocs/releases) page
2. Open Caido
3. Navigate to **Settings > Plugins**
4. Click **Install Package** and select the downloaded ZIP file

## Quick Start

### First Import

1. **Prepare Your File:**
   - Export your API collection from Postman as JSON
   - Save your OpenAPI specification as JSON format
   - Export Postman Environment files as JSON for variable import
   - Ensure file size is under 10MB for optimal performance

2. **Import to ReDocs:**
   - Open ReDocs from the Caido sidebar
   - Drag and drop your file onto the upload area
   - Or click "Choose File" to browse for it

3. **Configure Authentication:**
   - ReDocs automatically detects authentication methods
   - Provide your API credentials when prompted
   - Add custom hostname to override default endpoints (optional)
   - Skip this step if authentication isn't required
   - Smart header replacement prevents authentication conflicts

4. **Import Environment Variables (Optional):**
   - Import Postman Environment files to set up API variables
   - ReDocs automatically creates new Caido environments with collision-safe naming
   - Sensitive variables (tokens, keys) are automatically marked as secrets
   - Use imported variables in your replay sessions for dynamic testing

5. **Start Testing:**
   - Navigate to the **Replay** section in Caido
   - Find your imported sessions organized in dedicated collections
   - Each API endpoint becomes a separate replay session ready for security testing
   - Use your imported environment variables in replay sessions

## Documentation

Complete documentation is available within the plugin:
- Click the **"Docs"** button in the top-right corner
- Access comprehensive guides and usage examples
- View quick start tutorials and best practices
- Find troubleshooting tips and advanced features

## Feedback & Issues

If you encounter any issues or have suggestions for improvements, please:
- Report bugs and feature requests on our [GitHub repository](https://github.com/amrelsagaei/redocs/issues)
- Share your security testing workflows and use cases
- Contribute to the growing knowledge base

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Made with ❤️ by <a href="https://amrelsagaei.com">Amr Elsagaei</a> for the Caido and security community</p>
</div>