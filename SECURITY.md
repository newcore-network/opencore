# Security Policy

## Supported Versions

OpenCore provides security updates for the current stable release line and newer versions.

| Version         | Supported          |
| --------------- | ------------------ |
| 1.1.x and newer | :white_check_mark: |
| < 1.1           | :x:                |

Users are encouraged to upgrade to the latest available version before reporting a vulnerability.

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues, pull requests, discussions, or public Discord channels.

To report a vulnerability privately:

1. Join the official OpenCore Discord server.
2. Contact an OpenCore maintainer through a private direct message.
3. Clearly state that you are reporting a potential security vulnerability.

Please include as much relevant information as possible:

* A description of the vulnerability
* The affected OpenCore version
* The affected component or module
* Steps to reproduce the issue
* A proof of concept, when available
* The potential security impact
* Any suggested mitigation or fix

Avoid including secrets, personal information, production credentials, or data belonging to third parties.

## Response Timeline

After receiving a vulnerability report, the OpenCore maintainers aim to:

* Acknowledge receipt within 72 hours
* Provide an initial assessment within 7 days
* Provide status updates every 7 to 14 days while the report remains under investigation

These timelines are targets and may vary depending on the complexity and severity of the vulnerability.

## Vulnerability Handling

After reviewing the report, the maintainers will determine whether the vulnerability is accepted or declined.

If the vulnerability is accepted, the maintainers may:

* Confirm the affected versions
* Develop and test a security patch
* Prepare a new release
* Publish a security advisory
* Coordinate the public disclosure date with the reporter

If the report is declined, the maintainers will provide an explanation whenever reasonably possible. A report may be declined when the issue cannot be reproduced, does not present a security risk, affects an unsupported version, or falls outside the scope of the project.

## Coordinated Disclosure

OpenCore supports coordinated vulnerability disclosure.

Reporters are asked not to publicly disclose vulnerability details until:

* A security patch has been released, or
* A disclosure date has been agreed upon with the maintainers

Please allow the maintainers reasonable time to investigate, develop, test, and distribute a fix before publishing technical details.

The OpenCore team may credit the reporter in the security advisory or release notes unless the reporter requests anonymity.

## Security Scope

Examples of security issues that may be considered in scope include:

* Authentication or authorization bypasses
* Remote code execution
* Injection vulnerabilities
* Unsafe processing of network events
* Privilege escalation
* Access-control failures
* Rate-limit bypasses with meaningful security impact
* Exposure of sensitive data
* Vulnerabilities in security-related framework primitives

Issues generally considered outside the scope of this policy include:

* Vulnerabilities that only affect unsupported versions
* Reports without a reproducible security impact
* Denial-of-service reports requiring unrealistic resources
* Social engineering
* Physical attacks
* Vulnerabilities exclusively affecting third-party applications or resources
* Issues already publicly disclosed without prior coordination

## Bug Bounty

OpenCore does not currently operate a paid bug bounty program.

Submitting a vulnerability report does not guarantee financial compensation or any other reward. However, responsible reporters may receive public acknowledgment when appropriate.
