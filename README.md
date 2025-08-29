# Shop Manager 🏪

A modern tailor shop management system with PWA support, Google Sheets integration, and automated workflows.

## Features 🌟

- 📱 **PWA Support**: Works offline with auto-sync
- 📊 **Google Sheets Backend**: No database setup needed
- 🔄 **Smart Auto-Save**: Never lose your work
- 🛠 **Order Management**: 
  - Fabric Orders: Track fabric purchases
  - Tailor Orders: Manage measurements and assignments
  - Combined Orders: Handle full-service orders
- 📈 **Real-time Dashboard**: Track business metrics
- 👥 **Worker Management**: Payments, assignments & history

## Quick Start 🚀

### Local Setup

```bash
# Clone & setup
git clone https://github.com/mrsaurabhtanwar/Shop-Manager.git
cd Shop-Manager

# Create virtual environment
python -m venv myven
myven\Scripts\activate  # Windows
source myven/bin/activate  # Linux/Mac

# Install & configure
pip install -r requirements.txt
cp .env.example .env     # Then edit with your settings

# Run
python shop.py
```

### Docker Deployment 🐳

One-command deployment:
```bash
docker-compose up -d
```

This will:
- Start the application container
- Set up Nginx reverse proxy
- Configure SSL for HTTPS
- Enable health checks

## Configuration ⚙️

### Required Settings

1. **Google Sheets Integration**:
```properties
GOOGLE_SHEETS_ID=your-sheet-id
GOOGLE_SERVICE_ACCOUNT_FILE=service-account.json
```

2. **Google Apps Script Endpoints**:
```properties
FABRIC_ORDERS_URL=your-fabric-script-url
TAILOR_ORDERS_URL=your-tailor-script-url
FABRIC_TAILOR_URL=your-combined-script-url
EXPENSES_URL=your-expenses-script-url
```

### Development Mode 🔧

For quick testing without Google Sheets:
```properties
MOCK_SHEETS=True
```
This enables sample data and local-only functionality.

## Google Setup 🔑

1. **Create Service Account**:
   - Go to Google Cloud Console
   - Create new project or use existing
   - Enable Google Sheets API
   - Create service account & download key

2. **Configure Google Sheet**:
   - Create a new Google Sheet
   - Share with service account email
   - Copy Sheet ID from URL

3. **Set Up Apps Scripts**:
   - Create scripts for each form type
   - Deploy as web app (Execute as: Me)
   - Copy deployment URLs

## Common Issues �

1. **Sheet Access Error**:
   ```
   "Google Sheets access disabled"
   ```
   ✅ Check GOOGLE_SHEETS_ID in .env
   ✅ Verify service account permissions

2. **Form Submit Fails**:
   ```
   "Failed to submit order"
   ```
   ✅ Verify Apps Script URLs
   ✅ Check script permissions

3. **Offline Mode Issues**:
   ```
   "Failed to sync"
   ```
   ✅ Check internet connection
   ✅ Verify service worker registration

## Security Best Practices 🔒

- Store credentials securely
- Use HTTPS in production
- Regular updates
- Monitor access logs

## Help & Support 💬

- Issues: Create on GitHub
- Questions: Discussions tab
- Security: Private message

## License

MIT License - [Details](LICENSE)
