# Script Configuration Setup

This project uses Google Apps Script URLs for various features. For security and maintainability, these URLs are stored in configuration files that are not committed to the repository.

## Setup Instructions

1. Create config files from examples:
   ```bash
   # Orders
   cp static/scripts/orders/fabric.config.example.js static/scripts/orders/fabric.config.js
   cp static/scripts/orders/tailor.config.example.js static/scripts/orders/tailor.config.js
   cp static/scripts/orders/fabric_tailor.config.example.js static/scripts/orders/fabric_tailor.config.js
   
   # Expenses
   cp static/scripts/expenses/expenses.config.example.js static/scripts/expenses/expenses.config.js
   ```

2. Update each config file with your Google Apps Script URLs:
   - `fabric.config.js`: Fabric orders management URL
   - `tailor.config.js`: Tailor orders management URL
   - `fabric_tailor.config.js`: Combined fabric-tailor orders URL
   - `expenses.config.js`: Expenses management URL

3. Make sure all config files are ignored in `.gitignore` to prevent accidentally committing URLs:
   ```gitignore
   # Script configs (contain sensitive URLs)
   **/config.js
   static/scripts/**/url.config.js
   static/scripts/orders/fabric.config.js
   static/scripts/orders/tailor.config.js
   static/scripts/orders/fabric_tailor.config.js
   static/scripts/expenses/expenses.config.js
   ```

## Config Files Reference

### Fabric Orders (`static/scripts/orders/fabric.config.js`)
```javascript
export const GOOGLE_SCRIPT_URL = 'your-fabric-orders-script-url';
```

### Tailor Orders (`static/scripts/orders/tailor.config.js`)
```javascript
export const GOOGLE_SCRIPT_URL = 'your-tailor-orders-script-url';
```

### Fabric-Tailor Combined (`static/scripts/orders/fabric_tailor.config.js`)
```javascript
export const GOOGLE_SCRIPT_URL = 'your-fabric-tailor-combined-script-url';
```

### Expenses (`static/scripts/expenses/expenses.config.js`)
```javascript
export const EXPENSES_SCRIPT_URL = 'your-expenses-script-url';
```

## Important Notes

1. Never commit the actual config files with URLs to the repository
2. Keep a backup of your URLs in a secure location
3. When deploying, ensure the config files are properly set up on the server
4. The example config files show the structure but contain placeholder URLs

## HTML Changes Required

Make sure your HTML files that use these scripts are set up for ES6 modules:

```html
<script type="module" src="your-script.js"></script>
```
