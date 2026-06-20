## ADDED Requirements

### Requirement: Header Buttons
The application header SHALL expose a "Save" button that exports the current configuration to a YAML file, and a "Load" button that imports a configuration from a YAML file.

#### Scenario: Save and Load buttons are visible
- GIVEN the application is loaded
- WHEN the header is rendered
- THEN both "Save" and "Load" buttons are visible in the header

#### Scenario: Save triggers a download
- GIVEN the user clicks "Save"
- WHEN the browser handles the click
- THEN a file download is initiated
- AND the filename is the slugified current preset name with `.yaml` extension
- AND the file content is the YAML representation of the current configuration

#### Scenario: Load opens a file picker
- GIVEN the user clicks "Load"
- WHEN the browser handles the click
- THEN a native file picker dialog is opened
- AND the dialog accepts `.yaml` and `.yml` files

### Requirement: Inline Load Error
If YAML loading fails (parse error, unresolvable reference, or I/O error), an inline error message SHALL appear next to the Load button. The message SHALL be in English and SHALL NOT use `alert()`, `console.error()`, or any modal.

#### Scenario: Parse error is shown inline
- GIVEN a YAML file with invalid syntax
- WHEN the user picks it via the Load button
- THEN an inline error message appears next to the Load button
- AND the current configuration is unchanged

#### Scenario: Inline error clears on next attempt
- GIVEN a previously shown inline error
- WHEN the user picks a different file
- THEN the previous error is cleared
- AND processing of the new file begins
